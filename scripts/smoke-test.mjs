// End-to-end API and security checks against a running dev server with seed data.
//   pnpm seed && pnpm dev   (in another terminal)
//   pnpm test:api
import fs from 'node:fs'
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const PW = fs.readFileSync(new URL('../src/seed/index.ts', import.meta.url), 'utf8').match(/SEED_PASSWORD = '([^']+)'/)[1]
let pass = 0, fail = 0
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra) }
}

async function req(token, method, path, body, headers = {}) {
  const h = { Origin: BASE, ...headers }
  if (token) h.Cookie = `lyw-session=${token}`
  let payload = body
  if (body && !(body instanceof FormData)) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  const r = await fetch(BASE + path, { method, headers: h, body: payload })
  let json = null
  try { json = await r.json() } catch {}
  return { status: r.status, json, setCookie: r.headers.get('set-cookie') }
}
async function rest(token, method, path, body) {
  const h = { Authorization: `JWT ${token}` }
  if (body) h['Content-Type'] = 'application/json'
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
async function login(name) {
  const r = await req(null, 'POST', '/api/app/auth/login', { email: `${name}@example.test`, password: PW })
  const token = r.setCookie?.match(/lyw-session=([^;]+)/)?.[1]
  return { token, user: r.json?.user }
}

const c = await login('claudia'), m = await login('maya'), j = await login('jules'), s = await login('sam')
console.log('Auth')
ok(c.token && m.token && j.token && s.token, 'all seeded users can sign in')
ok((await req(null, 'POST', '/api/app/auth/login', { email: 'claudia@example.test', password: 'wrong-password' })).status === 401, 'wrong password rejected')
ok((await req(c.token, 'GET', '/api/app/auth/session')).json.user?.handle === 'claudia', 'session returns user')
ok((await req(null, 'GET', '/api/app/wishes')).status === 401, 'wishes require sign-in')

console.log('Signup validation')
const stamp = Date.now().toString(36)
const good = { name: 'Test Person', handle: `t_${stamp}`, email: `t_${stamp}@example.test`, password: 'longenough1', birthday: '2000-02-29', hair: 'bun' }
ok((await req(null, 'POST', '/api/app/auth/signup', { ...good, birthday: '2030-01-01' })).status === 400, 'future birthday rejected')
ok((await req(null, 'POST', '/api/app/auth/signup', { ...good, birthday: '2001-02-29' })).status === 400, 'impossible date rejected')
ok((await req(null, 'POST', '/api/app/auth/signup', { ...good, handle: 'no spaces!' })).status === 400, 'bad username rejected')
ok((await req(null, 'POST', '/api/app/auth/signup', { ...good, password: 'short' })).status === 400, 'short password rejected')
ok((await req(null, 'POST', '/api/app/auth/signup', { ...good, handle: 'claudia' })).status === 409, 'taken username rejected')
const su = await req(null, 'POST', '/api/app/auth/signup', good)
ok(su.status === 201 && su.json.user.avatar.hair === 'bun', 'valid signup creates account', JSON.stringify(su.json))
const t = { token: su.setCookie?.match(/lyw-session=([^;]+)/)?.[1], user: su.json?.user }

console.log('Payload REST lockdown')
ok((await fetch(BASE + '/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `x_${stamp}@e.test`, password: 'longenough1', name: 'X', handle: `x_${stamp}`, birthday: '2000-01-01' }) })).status >= 400, 'anonymous REST user create blocked')
ok((await fetch(BASE + '/api/admins/first-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `a_${stamp}@e.test`, password: 'longenough1234' }) })).status >= 400, 'admin first-register blocked')
const usersList = await rest(j.token, 'GET', '/api/users?limit=100')
ok(usersList.json.docs.length === 1 && usersList.json.docs[0].id === j.user.id, 'users can only read their own account')
const profile = (await rest(j.token, 'GET', '/api/profiles?limit=100')).json.docs[0]
ok(profile && !('birthday' in profile) && !('email' in profile) && profile.birthdayMonth, 'profiles expose month/day only, no email or year')
ok((await rest(j.token, 'GET', '/api/admins')).status === 403, 'app user cannot read admins')
ok((await fetch(BASE + '/api/graphql', { method: 'POST' })).status >= 400, 'graphql disabled')

console.log('My wishes')
const cw = (await req(c.token, 'GET', '/api/app/wishes')).json.wishes
const boots = cw.find((w) => w.name === 'Classic Mini II boots')
const lips = cw.find((w) => w.bought)
ok(cw.length === 4 && boots.saved === 60 && boots.savingsGoal === 170, 'owner sees own wishes with savings')
ok(cw.every((w) => !('taken' in w) && !('reservedByMe' in w)), 'owner list has no reservation info')
const claudiaRes = await rest(c.token, 'GET', `/api/reservations?where[wish][equals]=${boots.id}`)
ok(claudiaRes.json.docs.length === 0, 'owner cannot see reservations on own wish via REST', JSON.stringify(claudiaRes.json))
const ownRes = await req(c.token, 'POST', '/api/app/reservations', { wishId: boots.id })
ok(ownRes.status === 400 && /own/.test(ownRes.json.error), 'owner cannot reserve (or probe) own wish', JSON.stringify(ownRes))

console.log('Friend view & reservations')
const mayaId = m.user.id, claudiaId = c.user.id
const mv = (await req(m.token, 'GET', `/api/app/friends/${claudiaId}/wishes`)).json
const mBoots = mv.wishes.find((w) => w.id === boots.id)
ok(mBoots.taken && mBoots.reservedByMe, 'reserver sees "reserved by you"')
ok(!mv.wishes.some((w) => w.id === lips.id), 'bought items hidden from friends')
ok(mv.wishes.every((w) => !('saved' in w) && !('savingsGoal' in w) && !('bought' in w)), 'friends never get savings/bought fields')
const jv = (await req(j.token, 'GET', `/api/app/friends/${claudiaId}/wishes`)).json
const jBoots = jv.wishes.find((w) => w.id === boots.id)
ok(jBoots.taken && !jBoots.reservedByMe, 'other friend sees it taken, not by whom')
ok(!JSON.stringify(jv).includes(mayaId), 'reserver identity never sent')
ok((await req(j.token, 'POST', '/api/app/reservations', { wishId: boots.id })).status === 409, 'double reservation blocked')
const jRest = await rest(j.token, 'GET', `/api/wishes?where[owner][equals]=${claudiaId}`)
ok(jRest.json.docs.length > 0 && jRest.json.docs.every((w) => !('saved' in w) && !('bought' in w) && !('savingsGoal' in w)), 'REST hides private fields from friends')
ok((await rest(j.token, 'GET', `/api/reservations`)).json.docs.length === 0, 'friend cannot list others’ reservations via REST')
ok((await req(c.token, 'GET', `/api/app/friends/${claudiaId}/wishes`)).status === 400, 'owner cannot open own list as friend')

console.log('Non-friend access')
ok((await req(s.token, 'GET', `/api/app/friends/${claudiaId}/wishes`)).status === 403, 'non-friend cannot view list')
ok((await rest(s.token, 'GET', `/api/wishes?where[owner][equals]=${claudiaId}`)).json.docs.length === 0, 'non-friend REST sees nothing')
ok((await req(s.token, 'POST', '/api/app/reservations', { wishId: cw[1].id })).status === 403, 'non-friend cannot reserve')

console.log('Editing other people’s data')
ok([403, 404].includes((await req(j.token, 'PATCH', `/api/app/wishes/${boots.id}`, { name: 'hacked' })).status), 'friend cannot edit my wish')
ok([403, 404].includes((await req(j.token, 'DELETE', `/api/app/wishes/${boots.id}`)).status), 'friend cannot delete my wish')
ok([403, 404].includes((await req(j.token, 'POST', `/api/app/wishes/${boots.id}/deposit`, { amount: 5 })).status), 'friend cannot deposit into my jar')
ok((await rest(j.token, 'PATCH', `/api/wishes/${boots.id}`, { name: 'hacked' })).status >= 400, 'REST edit of my wish blocked')
ok((await rest(j.token, 'PATCH', `/api/users/${claudiaId}`, { name: 'hacked' })).status >= 400, 'REST edit of my profile blocked')
const steal = await req(t.token, 'POST', '/api/app/wishes', { name: 'x', price: 1, photo: boots.photo.id })
ok(steal.status === 400, 'cannot attach someone else’s photo')
ok((await req(c.token, 'GET', '/api/app/wishes')).json.wishes.find((w) => w.id === boots.id).name === 'Classic Mini II boots', 'my wish unchanged')
ok((await req(c.token, 'POST', '/api/app/wishes', { name: 'x', price: 1 }, { Origin: 'https://evil.example' })).status === 403, 'cross-site write blocked')

console.log('Full wish lifecycle (new user)')
const png = fs.readFileSync(new URL('../public/wishes/product-02.png', import.meta.url))
const form = new FormData(); form.append('file', new Blob([png], { type: 'image/png' }), 'tank.png'); form.append('alt', 'tank')
const up = await req(t.token, 'POST', '/api/app/photos', form)
ok(up.status === 201 && up.json.photo.cutout === true, 'photo upload (transparent PNG kept as cutout)', JSON.stringify(up.json))
const fake = new FormData(); fake.append('file', new Blob(['not an image'], { type: 'image/png' }), 'x.png')
ok((await req(t.token, 'POST', '/api/app/photos', fake)).status === 415, 'non-image upload rejected')
const created = await req(t.token, 'POST', '/api/app/wishes', { name: 'Test tank', price: '48.50', store: 'ARKET', url: 'arket.com', category: 'Clothes', hearts: 2, notes: 'size S', photo: up.json.photo.id })
ok(created.status === 201 && created.json.wish.url === 'https://arket.com' && created.json.wish.price === 48.5, 'create wish', JSON.stringify(created.json))
const id = created.json.wish.id
ok((await req(t.token, 'POST', '/api/app/wishes', { name: 'x', price: 1, hearts: 4 })).status === 400, 'hearts must be 1–3')
ok((await req(t.token, 'POST', '/api/app/wishes', { name: 'x', price: 1, category: 'Cars' })).status === 400, 'unknown category rejected')
ok((await req(t.token, 'POST', '/api/app/wishes', { name: 'x', price: 1, url: 'javascript:alert(1)' })).status === 400, 'javascript: links rejected')
ok((await req(t.token, 'PATCH', `/api/app/wishes/${id}`, { name: 'Edited tank', hearts: 3 })).json.wish.name === 'Edited tank', 'edit wish')
ok((await req(t.token, 'PATCH', `/api/app/wishes/${id}`, { savingsGoal: 40 })).json.wish.savingsGoal === 40, 'set savings goal')
ok((await req(t.token, 'POST', `/api/app/wishes/${id}/deposit`, { amount: 25 })).json.wish.saved === 25, 'add money')
ok((await req(t.token, 'POST', `/api/app/wishes/${id}/deposit`, { amount: 100 })).json.wish.saved === 40, 'savings capped at goal')
ok((await req(t.token, 'PATCH', `/api/app/wishes/${id}`, { bought: true })).json.wish.bought === true, 'mark bought')
ok((await req(t.token, 'PATCH', `/api/app/wishes/${id}`, { owner: claudiaId, name: 'still mine' })).json.wish.name === 'still mine', 'unknown fields (owner) ignored')
ok((await req(c.token, 'GET', '/api/app/wishes')).json.wishes.length === 4, 'ownership not transferable')

console.log('Friends')
ok((await req(t.token, 'GET', '/api/app/people?q=@maya')).json.people.some((p) => p.handle === 'maya.chen'), 'search by @username')
ok((await req(t.token, 'GET', '/api/app/people?q=priya')).json.people.length === 1, 'search by name')
ok(!(await req(t.token, 'GET', '/api/app/people')).json.people.some((p) => p.userId === t.user.id), 'search excludes yourself')
ok((await req(t.token, 'POST', '/api/app/friends', { userId: claudiaId })).status === 201, 'add friend')
ok((await req(t.token, 'POST', '/api/app/friends', { userId: claudiaId })).status === 200, 'adding twice is harmless')
ok((await req(t.token, 'POST', '/api/app/friends', { userId: t.user.id })).status === 400, 'cannot add yourself')
ok((await req(t.token, 'GET', '/api/app/friends')).json.friends.length === 1, 'friend list stored in database')
ok((await req(t.token, 'POST', '/api/app/reservations', { wishId: cw[1].id })).status === 201, 'reserve friend’s wish')
ok((await req(t.token, 'DELETE', `/api/app/reservations/${cw[1].id}`)).status === 200, 'cancel own reservation')
ok((await req(t.token, 'DELETE', `/api/app/reservations/${boots.id}`)).status === 404, 'cannot cancel someone else’s reservation')
ok((await req(t.token, 'DELETE', `/api/app/friends/${claudiaId}`)).status === 200, 'remove friend')
ok((await req(t.token, 'GET', `/api/app/friends/${claudiaId}/wishes`)).status === 403, 'removed friend’s list no longer visible')

console.log('Profile & avatar')
ok((await req(t.token, 'PATCH', '/api/app/me', { avatar: { hair: 'curls', eyes: 'bright', accessory: 'bow' } })).json.user.avatar.accessory === 'bow', 'save avatar')
ok((await req(t.token, 'PATCH', '/api/app/me', { avatar: { hair: '../../etc' } })).status === 400, 'invalid avatar part rejected')
ok((await req(t.token, 'PATCH', '/api/app/me', { intro: 'hello there' })).json.user.intro === 'hello there', 'save intro')

console.log('Cleanup & logout')
ok((await req(t.token, 'DELETE', `/api/app/wishes/${id}`)).status === 200, 'delete wish')
const out = await req(t.token, 'POST', '/api/app/auth/logout')
ok(out.status === 200 && /lyw-session=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(out.setCookie ?? ''), 'logout clears cookie', out.setCookie)
await req(t.token, 'POST', '/api/app/friends', { userId: claudiaId })
await req(t.token, 'POST', '/api/app/reservations', { wishId: cw[1].id })
const del = await rest(t.token, 'DELETE', `/api/users/${t.user.id}`)
ok(del.status === 200, 'account deletion works', JSON.stringify(del.json))
const after = (await req(m.token, 'GET', `/api/app/friends/${claudiaId}/wishes`)).json.wishes.find((w) => w.id === cw[1].id)
ok(after && !after.taken, 'deleting an account releases its reservations')
ok(!(await req(c.token, 'GET', '/api/app/people?q=' + good.handle)).json.people.length, 'deleted account gone from search')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
