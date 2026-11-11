import 'server-only'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import zlib from 'node:zlib'
import { HttpError } from './api'

/**
 * Fetches a URL a user gave us, without letting it reach private networks
 * (SSRF protection): http(s) only, standard ports only, every resolved address
 * must be public, checked at connect time (so DNS rebinding can't sneak in),
 * redirects re-checked hop by hop, and size and time are capped.
 */

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  'accept-encoding': 'gzip, deflate, br',
}

export function isPublicAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false
    if (a === 100 && b >= 64 && b <= 127) return false // carrier-grade NAT
    if (a === 169 && b === 254) return false // link-local, cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 192 && b === 0) return false
    if (a === 198 && (b === 18 || b === 19)) return false
    return true
  }
  if (net.isIPv6(address)) {
    const v = address.toLowerCase()
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPublicAddress(mapped[1])
    if (v === '::' || v === '::1') return false
    if (/^f[cd]/.test(v)) return false // unique local
    if (/^fe[89ab]/.test(v)) return false // link-local
    if (/^ff/.test(v)) return false // multicast
    if (v.startsWith('64:ff9b:') || v.startsWith('2001:db8')) return false
    return true
  }
  return false
}

const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0)
    const list = addresses as dns.LookupAddress[]
    const bad = list.find((entry) => !isPublicAddress(entry.address))
    if (!list.length || bad) {
      return callback(new Error('blocked-address'), '', 0)
    }
    if ((options as { all?: boolean }).all) return (callback as (e: null, a: dns.LookupAddress[]) => void)(null, list)
    callback(null, list[0].address, list[0].family)
  })
}

export function checkUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new HttpError(400, 'That doesn’t look like a link.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new HttpError(400, 'Links must start with http(s)://')
  }
  if (url.username || url.password) throw new HttpError(400, 'That link isn’t supported.')
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new HttpError(400, 'That link isn’t supported.')
  }
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
    throw new HttpError(400, 'That link isn’t supported.')
  }
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(url.hostname)) {
    throw new HttpError(400, 'That link isn’t supported.')
  }
  return url
}

type Fetched = { url: URL; status: number; contentType: string; body: Buffer }

function requestOnce(url: URL, accept: string, maxBytes: number, deadline: number): Promise<Fetched & { location?: string }> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(
      url,
      {
        method: 'GET',
        lookup: safeLookup,
        headers: { ...BROWSER_HEADERS, accept },
        timeout: Math.max(1000, deadline - Date.now()),
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          return resolve({ url, status, contentType: '', body: Buffer.alloc(0), location: res.headers.location })
        }
        const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase()
        let stream: NodeJS.ReadableStream = res
        if (encoding === 'gzip' || encoding === 'x-gzip') stream = res.pipe(zlib.createGunzip())
        else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate())
        else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress())

        const chunks: Buffer[] = []
        let size = 0
        stream.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > maxBytes) {
            req.destroy()
            reject(new HttpError(413, 'That page is too large.'))
            return
          }
          chunks.push(chunk)
        })
        stream.on('end', () =>
          resolve({
            url,
            status,
            contentType: String(res.headers['content-type'] ?? '').toLowerCase(),
            body: Buffer.concat(chunks),
          }),
        )
        stream.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}

export async function safeFetch(
  raw: string,
  { accept, maxBytes, timeoutMs = 10_000 }: { accept: string; maxBytes: number; timeoutMs?: number },
): Promise<Fetched> {
  const deadline = Date.now() + timeoutMs
  let url = checkUrl(raw)
  for (let hop = 0; hop < 5; hop++) {
    let result
    try {
      result = await requestOnce(url, accept, maxBytes, deadline)
    } catch (error) {
      if (error instanceof HttpError) throw error
      if (error instanceof Error && error.message === 'blocked-address') {
        throw new HttpError(400, 'That link isn’t supported.')
      }
      throw new HttpError(502, 'Couldn’t reach that page.')
    }
    if (!result.location) return result
    url = checkUrl(new URL(result.location, url).toString())
  }
  throw new HttpError(502, 'That link redirects too many times.')
}
