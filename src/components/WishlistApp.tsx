'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isBirthdayToday,
  normalizeAvatar,
  type AvatarChoice,
  type AvatarManifest,
  type FriendWish,
  type MyWish,
  type Photo,
  type PublicProfile,
  type SessionUser,
} from '@/lib/types'
import {
  BANNER_SHAPES,
  CATEGORIES,
  DEFAULT_BANNER_COLOR,
  type BannerShape,
  type Category,
} from '@/lib/validation'

type Page = 'wishlist' | 'friends' | 'savings' | 'avatar'
type Status = 'idle' | 'loading' | 'ready' | 'error'
type GridItem = Pick<MyWish, 'id' | 'name' | 'price' | 'store' | 'hearts' | 'photo'> & {
  bought?: boolean
  taken?: boolean
  reservedByMe?: boolean
}

const DEFAULT_INTRO = 'A quiet corner for everything I love, need, and might just treat myself to.'
const DEFAULT_NOTE = 'The sort of thing that makes even an ordinary Tuesday feel special.'
const HEART_WORDS = ['', 'one', 'two', 'three']

// ---------------------------------------------------------------- helpers

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init
  const response = await fetch(path, {
    ...rest,
    headers: json === undefined ? rest.headers : { 'Content-Type': 'application/json' },
    body: json === undefined ? rest.body : JSON.stringify(json),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Something went wrong. Please try again.')
  }
  return data as T
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

const formatMoney = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2)

const pad = (n: number) => String(n).padStart(2, '0')

/** Shrinks a photo in the browser so uploads stay small (and under hosting limits). */
async function shrinkPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Couldn’t read that photo. Try a JPEG or PNG.'))
      el.src = url
    })
    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp'
    for (const max of [1600, 1200, 900]) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const toBlob = (type: string) =>
        new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))
      let blob = keepAlpha ? await toBlob('image/webp') : await toBlob('image/jpeg')
      if (keepAlpha && blob?.type !== 'image/webp') blob = await toBlob('image/png')
      if (blob && blob.size < 3.9 * 1024 * 1024) return blob
    }
    throw new Error('That photo is too large. Try a smaller one.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ---------------------------------------------------------------- drawings

function Star({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 50 50" aria-hidden="true">
      <path
        d="M25 3c.7 13 3.1 19 20 21-16.5 2.5-19 8.2-20 23C23.7 33.2 20.6 27 5 24 20 22 23.2 16 25 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m10 8 3 3m-3 0 3-3M39 37l3 3m-3 0 3-3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function BannerStar() {
  return (
    <svg viewBox="0 0 50 50" aria-hidden="true">
      <path
        d="M25 2c2 7 4 12 6 17 6-2 11-3 17-3-5 5-8 9-12 13 4 6 6 11 8 18-7-4-12-7-17-10-5 5-9 8-15 12 1-7 2-12 3-18-5-2-10-4-15-7 7-2 12-4 18-6 2-6 4-11 7-16Z"
        fill="currentColor"
      />
    </svg>
  )
}

const BANNER_COLORS: { value: string; label: string }[] = [
  { value: '#1e2bb8', label: 'cobalt' },
  { value: '#1b1b1f', label: 'ink' },
  { value: '#b8232f', label: 'cherry' },
  { value: '#c0643f', label: 'terracotta' },
  { value: '#5b2a6e', label: 'plum' },
  { value: '#2f5d46', label: 'forest' },
  { value: '#f2c4ce', label: 'blush' },
  { value: '#f3dd8a', label: 'butter' },
  { value: '#9fb59a', label: 'sage' },
  { value: '#c9b6e4', label: 'lilac' },
  { value: '#a9c8e8', label: 'sky' },
]

/** Light banners get blue ink text and shapes; dark ones keep paper-white. */
function isLightColor(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4
}

/** textColor '' = automatic: paper-white on dark banners, blue ink on light ones. */
function bannerStyle(color: string, textColor = '') {
  const light = isLightColor(color)
  const style = { background: color } as React.CSSProperties & Record<string, string>
  if (textColor) style['--banner-ink'] = textColor
  return {
    className: [
      color.toLowerCase() === DEFAULT_BANNER_COLOR ? '' : 'is-custom',
      light ? 'is-light' : '',
      textColor ? 'has-ink' : '',
    ].join(' '),
    style,
    light,
  }
}

const TEXT_COLORS: { value: string; label: string }[] = [
  { value: '#fdfbf7', label: 'paper' },
  { value: '#1e2bb8', label: 'cobalt' },
  { value: '#1b1b1f', label: 'ink' },
  { value: '#b8232f', label: 'cherry' },
  { value: '#e98aa0', label: 'pink' },
  { value: '#f3dd8a', label: 'butter' },
  { value: '#2f5d46', label: 'forest' },
  { value: '#5b2a6e', label: 'plum' },
]

function SwatchRow({
  colors,
  value,
  onChange,
  auto,
}: {
  colors: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  /** Show an "auto" choice, meaning value '' */
  auto?: boolean
}) {
  const v = value.toLowerCase()
  const isPreset = v === '' ? Boolean(auto) : colors.some((c) => c.value === v)
  return (
    <div className="banner-swatches">
      {auto && (
        <button
          type="button"
          className={`banner-swatch is-auto ${v === '' ? 'selected' : ''}`}
          onClick={() => onChange('')}
          aria-label="automatic"
          aria-pressed={v === ''}
          title="automatic"
        >
          auto
        </button>
      )}
      {colors.map((c) => (
        <button
          type="button"
          key={c.value}
          className={`banner-swatch ${v === c.value ? 'selected' : ''}`}
          style={{ background: c.value }}
          onClick={() => onChange(c.value)}
          aria-label={c.label}
          aria-pressed={v === c.value}
          title={c.label}
        />
      ))}
      <label className={`banner-swatch is-custom-color ${isPreset ? '' : 'selected'}`} title="any colour">
        <input
          type="color"
          value={v || '#fdfbf7'}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Pick any colour"
        />
      </label>
    </div>
  )
}

/** The five little things scattered on the banner: the original stars, or one of the drawn shapes. */
function BannerDecor({ shape, light }: { shape: BannerShape; light: boolean }) {
  if (shape === 'stars') {
    return (
      <div className="hero-stars" aria-hidden="true">
        <BannerStar />
        <BannerStar />
        <BannerStar />
        <BannerStar />
        <BannerStar />
      </div>
    )
  }
  const src = `/banner-shapes/${shape}.webp`
  return (
    <div className="hero-stars hero-shapes" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) =>
        light ? (
          <span key={i} className="hero-shape is-ink" style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }} />
        ) : (
          <img key={i} className="hero-shape" src={src} alt="" />
        ),
      )}
    </div>
  )
}

function PenIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M21.6 5.2c1.4-1.3 3.4-1.2 4.7.2 1.3 1.4 1.1 3.4-.3 4.6L11.2 24.1l-6.1 2.2 2.1-6.2L21.6 5.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M19.2 7.6l4.9 4.9M7.3 20.2l4.3 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.6 28.4c3.4-.9 6.6-.7 9.7.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function Heart({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden="true">
      <path
        d="M12 20C9 16.5 2.2 12.2 2.2 7.1c0-5 6.3-6.5 9.8-1.9 3.6-4.6 9.8-3 9.8 1.9C21.8 12 15.1 16.4 12 20Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BirthdayCrown() {
  return (
    <span className="birthday-crown" title="Birthday today" aria-label="Birthday today">
      <svg viewBox="0 0 54 36" aria-hidden="true">
        <path d="m6 28-2-20 13 10L27 3l10 15L50 8l-2 20Z" />
        <path d="M7 32c12-2 28-2 40 0" />
        <circle cx="4" cy="7" r="2" />
        <circle cx="27" cy="3" r="2" />
        <circle cx="50" cy="7" r="2" />
      </svg>
    </span>
  )
}

/** The original hand-drawn SVG portrait (used until drawings are added to public/avatars). */
function InkAvatar({
  hair = 'waves',
  accessory = 'none',
  eyes = 'sleepy',
  size = 'md',
}: {
  hair?: string
  accessory?: string
  eyes?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={`ink-avatar avatar-${size}`} aria-label="Hand drawn avatar">
      <svg viewBox="0 0 120 120">
        <path
          className="wash"
          d="M22 63c0-35 16-55 43-55 28 0 43 24 39 54-3 25-15 47-42 47-28 0-40-21-40-46Z"
        />
        {hair === 'waves' && (
          <path d="M21 68C8 40 27 7 60 8c39 1 48 34 40 65M24 52c8-7 10-22 10-22s8 13 20 16c13 3 32-8 39-17 0 0 1 26 8 36M25 52c-8 23-5 46 8 58m66-56c7 20 3 42-9 55" />
        )}
        {hair === 'bob' && (
          <path d="M21 61C15 26 34 7 62 8c30 1 45 24 38 58l-2 35-17 8M21 57l2 45 20 8M26 45c20 2 38-8 50-20 2 9 9 17 21 23" />
        )}
        {hair === 'bun' && (
          <>
            <path d="M26 66C14 32 33 10 63 10c29 0 44 25 34 57M27 43c20 3 39-7 51-21 1 10 7 19 19 26" />
            <path d="M46 11C44-2 77-6 82 12" />
          </>
        )}
        {hair === 'curls' && (
          <path d="M25 73C8 58 15 41 25 38 13 24 31 11 43 16 46 2 68 5 72 14 89 4 103 20 96 34c15 8 12 30 1 37M25 43c18 0 41-3 58-20 1 13 7 21 16 26" />
        )}
        <path d="M35 49c-2 35 8 53 28 53s31-22 30-55" />
        {eyes === 'sleepy' ? (
          <path d="M43 63q6 5 12 0m14 0q6 5 12 0" />
        ) : (
          <>
            <circle cx="49" cy="64" r="2" />
            <circle cx="75" cy="64" r="2" />
          </>
        )}
        <path d="M58 82q6 4 12 0" />
        {accessory === 'glasses' && (
          <>
            <circle cx="49" cy="64" r="11" />
            <circle cx="76" cy="64" r="11" />
            <path d="M60 64h5" />
          </>
        )}
        {accessory === 'earrings' && (
          <>
            <circle cx="31" cy="78" r="4" />
            <circle cx="97" cy="78" r="4" />
          </>
        )}
        {accessory === 'bow' && (
          <path d="M82 24c10-12 18-4 12 6 11 0 11 11 0 12-5 0-8-8-8-8s-7 6-11 3c-8-6 0-12 7-13Z" />
        )}
      </svg>
    </div>
  )
}

/** Renders an avatar from your drawn parts, or the built-in ink portrait. */
function Avatar({
  choice,
  manifest,
  size = 'md',
}: {
  choice: AvatarChoice
  manifest: AvatarManifest
  size?: 'sm' | 'md' | 'lg'
}) {
  const parts = normalizeAvatar(choice, manifest)
  if (manifest.kind === 'builtin') {
    return <InkAvatar hair={parts.hair} eyes={parts.eyes} accessory={parts.accessory} size={size} />
  }
  return (
    <div className={`ink-avatar avatar-${size}`} aria-label="Hand drawn avatar">
      <div className="avatar-layers">
        {manifest.layers.map((layer) => {
          const option = layer.options.find((o) => o.key === parts[layer.key])
          return option?.src ? <img key={layer.key} src={option.src} alt="" /> : null
        })}
      </div>
    </div>
  )
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="logo" onClick={onClick}>
      <span>List Your</span>
      <strong>Wishes</strong>
      <Star />
    </button>
  )
}

// ---------------------------------------------------------------- app

export default function App({
  initialUser,
  manifest,
}: {
  initialUser: SessionUser | null
  manifest: AvatarManifest
}) {
  const [page, setPage] = useState<Page>('wishlist')
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(initialUser)
  const [accountOpen, setAccountOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const [wishes, setWishes] = useState<MyWish[]>([])
  const [wishesStatus, setWishesStatus] = useState<Status>('idle')
  const [category, setCategory] = useState<'All' | Category>('All')
  const [showBought, setShowBought] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formWish, setFormWish] = useState<MyWish | 'new' | null>(null)
  const [bannerOpen, setBannerOpen] = useState(false)
  const heroLook = bannerStyle(
    sessionUser?.bannerColor ?? DEFAULT_BANNER_COLOR,
    sessionUser?.bannerTextColor ?? '',
  )

  const [friends, setFriends] = useState<PublicProfile[]>([])
  const [friendsStatus, setFriendsStatus] = useState<Status>('idle')
  const [friendSearchOpen, setFriendSearchOpen] = useState(false)
  const [friendQuery, setFriendQuery] = useState('')
  const [people, setPeople] = useState<PublicProfile[]>([])
  const [peopleStatus, setPeopleStatus] = useState<Status>('idle')
  const [friendView, setFriendView] = useState<{
    profile: PublicProfile
    wishes: FriendWish[]
    status: Status
  } | null>(null)
  const [friendSelected, setFriendSelected] = useState<string | null>(null)

  const [avatarDraft, setAvatarDraft] = useState<AvatarChoice>(() =>
    normalizeAvatar(initialUser?.avatar, manifest),
  )
  const [avatarSaving, setAvatarSaving] = useState(false)

  const userId = sessionUser?.id ?? null

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setSessionUser(null)
      setNotice('Your session ended. Please sign in again.')
    } else {
      setNotice(message(error))
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  // Load your wishes and friends whenever someone signs in; clear them on sign out.
  useEffect(() => {
    if (!userId) {
      setWishes([])
      setFriends([])
      setWishesStatus('idle')
      setFriendsStatus('idle')
      setFriendView(null)
      return
    }
    let cancelled = false
    setWishesStatus('loading')
    setFriendsStatus('loading')
    api<{ wishes: MyWish[] }>('/api/app/wishes')
      .then(({ wishes }) => {
        if (cancelled) return
        setWishes(wishes)
        setWishesStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setWishesStatus('error')
        handleError(error)
      })
    api<{ friends: PublicProfile[] }>('/api/app/friends')
      .then(({ friends }) => {
        if (cancelled) return
        setFriends(friends)
        setFriendsStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setFriendsStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [userId, handleError])

  // Directory search, lightly debounced.
  useEffect(() => {
    if (!userId || !friendSearchOpen) return
    let cancelled = false
    setPeopleStatus('loading')
    const timer = window.setTimeout(() => {
      api<{ people: PublicProfile[] }>(`/api/app/people?q=${encodeURIComponent(friendQuery)}`)
        .then(({ people }) => {
          if (cancelled) return
          setPeople(people)
          setPeopleStatus('ready')
        })
        .catch(() => {
          if (!cancelled) setPeopleStatus('error')
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [userId, friendSearchOpen, friendQuery])

  const visible = useMemo(
    () =>
      wishes.filter(
        (w) => (category === 'All' || w.category === category) && (showBought || !w.bought),
      ),
    [wishes, category, showBought],
  )
  const selected = wishes.find((w) => w.id === selectedId) ?? null
  const jarWishes = wishes.filter((w) => w.savingsGoal !== null && !w.bought)
  const savedTotal = jarWishes.reduce((sum, w) => sum + w.saved, 0)
  const goalTotal = jarWishes.reduce((sum, w) => sum + (w.savingsGoal ?? 0), 0)
  const jarRatio = goalTotal > 0 ? Math.min(1, savedTotal / goalTotal) : 0

  const go = (next: Page) => {
    setPage(next)
    setFriendView(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const replaceWish = (wish: MyWish) =>
    setWishes((all) => all.map((w) => (w.id === wish.id ? wish : w)))

  const updateWish = async (
    id: string,
    data: Partial<Pick<MyWish, 'bought' | 'savingsGoal' | 'saved'>>,
  ) => {
    try {
      const { wish } = await api<{ wish: MyWish }>(`/api/app/wishes/${id}`, {
        method: 'PATCH',
        json: data,
      })
      replaceWish(wish)
      return wish
    } catch (error) {
      handleError(error)
      return null
    }
  }

  const deleteWish = async (id: string) => {
    try {
      await api(`/api/app/wishes/${id}`, { method: 'DELETE' })
      setWishes((all) => all.filter((w) => w.id !== id))
      setSelectedId(null)
    } catch (error) {
      handleError(error)
    }
  }

  const deposit = async (id: string, amount: number) => {
    try {
      const { wish } = await api<{ wish: MyWish }>(`/api/app/wishes/${id}/deposit`, {
        method: 'POST',
        json: { amount },
      })
      replaceWish(wish)
      return true
    } catch (error) {
      handleError(error)
      return false
    }
  }

  const saveIntro = async (intro: string) => {
    if (!sessionUser || intro === sessionUser.intro) return
    try {
      const { user } = await api<{ user: SessionUser }>('/api/app/me', {
        method: 'PATCH',
        json: { intro },
      })
      setSessionUser(user)
    } catch (error) {
      handleError(error)
    }
  }

  const toggleFriend = async (profile: PublicProfile) => {
    const isFriend = friends.some((f) => f.userId === profile.userId)
    try {
      if (isFriend) {
        await api(`/api/app/friends/${profile.userId}`, { method: 'DELETE' })
        setFriends((all) => all.filter((f) => f.userId !== profile.userId))
      } else {
        await api('/api/app/friends', { method: 'POST', json: { userId: profile.userId } })
        setFriends((all) =>
          [...all, { ...profile, isFriend: true }].sort((a, b) => a.name.localeCompare(b.name)),
        )
      }
      setPeople((all) =>
        all.map((p) => (p.userId === profile.userId ? { ...p, isFriend: !isFriend } : p)),
      )
    } catch (error) {
      handleError(error)
    }
  }

  const openFriend = async (profile: PublicProfile) => {
    setFriendView({ profile, wishes: [], status: 'loading' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const result = await api<{ profile: PublicProfile; wishes: FriendWish[] }>(
        `/api/app/friends/${profile.userId}/wishes`,
      )
      setFriendView({ ...result, status: 'ready' })
    } catch (error) {
      setFriendView((view) => (view ? { ...view, status: 'error' } : view))
      handleError(error)
    }
  }

  const toggleReserve = async (wish: FriendWish) => {
    if (wish.taken && !wish.reservedByMe) return
    try {
      if (wish.reservedByMe) {
        await api(`/api/app/reservations/${wish.id}`, { method: 'DELETE' })
      } else {
        await api('/api/app/reservations', { method: 'POST', json: { wishId: wish.id } })
      }
      const reserved = !wish.reservedByMe
      setFriendView((view) =>
        view
          ? {
              ...view,
              wishes: view.wishes.map((w) =>
                w.id === wish.id ? { ...w, reservedByMe: reserved, taken: reserved } : w,
              ),
            }
          : view,
      )
    } catch (error) {
      // Someone else got there first: show it as taken.
      if (error instanceof ApiError && error.status === 409) {
        setFriendView((view) =>
          view
            ? {
                ...view,
                wishes: view.wishes.map((w) => (w.id === wish.id ? { ...w, taken: true } : w)),
              }
            : view,
        )
      }
      handleError(error)
    }
  }

  const saveAvatar = async () => {
    setAvatarSaving(true)
    try {
      const { user } = await api<{ user: SessionUser }>('/api/app/me', {
        method: 'PATCH',
        json: { avatar: avatarDraft },
      })
      setSessionUser(user)
      go('wishlist')
    } catch (error) {
      handleError(error)
    } finally {
      setAvatarSaving(false)
    }
  }

  const myAvatar = sessionUser?.avatar ?? {}
  const signInPrompt = (text: string) => (
    <div className="empty">
      <Star />
      <h2>Sign in to begin</h2>
      <p>{text}</p>
      <button className="ink-button" onClick={() => setAccountOpen(true)}>
        Sign in
      </button>
    </div>
  )

  return (
    <div className="app-shell">
      <div className="paper-grain" />
      <header>
        <Logo onClick={() => go('wishlist')} />
        <nav aria-label="Main navigation">
          <button className={page === 'wishlist' ? 'active' : ''} onClick={() => go('wishlist')}>
            My Wish List
          </button>
          <button className={page === 'friends' ? 'active' : ''} onClick={() => go('friends')}>
            Friends’ Wish Lists
          </button>
          <button className={page === 'savings' ? 'active' : ''} onClick={() => go('savings')}>
            Savings Jar
          </button>
        </nav>
        <button className="avatar-button" onClick={() => setAccountOpen(true)} aria-label="Account">
          <Avatar choice={myAvatar} manifest={manifest} size="sm" />
          <span>
            {sessionUser?.name || 'Sign in'}
            <small>{sessionUser ? `@${sessionUser.handle}` : 'save your wishes'}</small>
          </span>
        </button>
      </header>

      <main>
        {page === 'wishlist' && (
          <>
            <section
              className={`hero ${sessionUser ? heroLook.className : ''}`}
              style={sessionUser ? heroLook.style : undefined}
            >
              <BannerDecor
                shape={sessionUser?.bannerShape ?? 'stars'}
                light={Boolean(sessionUser) && heroLook.light}
              />
              {sessionUser && (
                <button
                  className="banner-pen"
                  onClick={() => setBannerOpen(true)}
                  aria-label="Change the banner"
                  title="Change the banner"
                >
                  <PenIcon />
                </button>
              )}
              <h1>{sessionUser ? `${firstName(sessionUser.name)}’s Wish List` : 'Your Wish List'}</h1>
              {sessionUser ? (
                <div className="editable-note">
                  <p
                    key={`${sessionUser.id}-${sessionUser.intro}`}
                    className="intro"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(event) =>
                      saveIntro((event.currentTarget.textContent || '').trim().slice(0, 280))
                    }
                    aria-label="Editable wish list description"
                  >
                    {sessionUser.intro || DEFAULT_INTRO}
                  </p>
                  <span>click to edit</span>
                </div>
              ) : (
                <p className="intro">{DEFAULT_INTRO}</p>
              )}
            </section>
            {!sessionUser ? (
              signInPrompt('Start your wish list.')
            ) : (
              <>
                <section className="controls">
                  <div className="tabs" role="tablist">
                    {(['All', ...CATEGORIES] as const).map((c) => (
                      <button
                        key={c}
                        className={category === c ? 'selected' : ''}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={showBought}
                      onChange={(e) => setShowBought(e.target.checked)}
                    />
                    <span />
                    <em>show bought</em>
                  </label>
                </section>
                <WishGrid items={visible} onSelect={(w) => setSelectedId(w.id)} />
                {wishesStatus === 'loading' && (
                  <p className="directory-message">Opening your list…</p>
                )}
                {wishesStatus === 'error' && (
                  <p className="directory-message">Your list couldn’t be loaded. Try refreshing.</p>
                )}
                {wishesStatus === 'ready' && visible.length === 0 && (
                  <div className="empty">
                    <Star />
                    <h2>Nothing here yet</h2>
                    <p>That means there’s room for one more lovely thing.</p>
                  </div>
                )}
              </>
            )}
            <button
              className="add-stamp"
              onClick={() => (sessionUser ? setFormWish('new') : setAccountOpen(true))}
            >
              <span>＋</span> Add a wish
            </button>
          </>
        )}

        {page === 'friends' && !friendView && (
          <section className="page-section friends-page">
            <div className="friends-title-row">
              <h1>Friends’ Wish Lists</h1>
              {sessionUser && (
                <button
                  className="add-friend-button"
                  onClick={() => setFriendSearchOpen((open) => !open)}
                >
                  {friendSearchOpen ? 'Close search' : '+ Add friend'}
                </button>
              )}
            </div>
            <p className="intro">Peek at what the people you love have been dreaming about.</p>
            {!sessionUser && (
              <div className="signin-only">
                <button className="ink-button" onClick={() => setAccountOpen(true)}>
                  Sign in
                </button>
              </div>
            )}
            {sessionUser && friendSearchOpen && (
              <section className="friend-search" aria-label="Find more users">
                <label htmlFor="friend-search">Find someone</label>
                <div className="friend-search-input">
                  <span aria-hidden="true">⌕</span>
                  <input
                    id="friend-search"
                    value={friendQuery}
                    onChange={(event) => setFriendQuery(event.target.value)}
                    placeholder="Search by name or @username"
                    autoFocus
                  />
                </div>
                <div className="friend-results">
                  {peopleStatus === 'loading' && people.length === 0 && (
                    <p className="directory-message">Opening the directory…</p>
                  )}
                  {peopleStatus === 'error' && (
                    <p className="directory-message">
                      The directory could not be loaded. Try again shortly.
                    </p>
                  )}
                  {peopleStatus === 'ready' && people.length === 0 && (
                    <p className="directory-message">No users match that search.</p>
                  )}
                  {people.map((profile) => {
                    const isFriend = friends.some((f) => f.userId === profile.userId)
                    const birthday = isBirthdayToday(profile.birthdayMonth, profile.birthdayDay)
                    return (
                      <article className="friend-result" key={profile.userId}>
                        <div className="friend-avatar-wrap">
                          {birthday && <BirthdayCrown />}
                          <Avatar choice={profile.avatar} manifest={manifest} size="sm" />
                        </div>
                        <div>
                          <h3>{profile.name}</h3>
                          <p>
                            @{profile.handle} · {profile.note}
                            {birthday && <strong> · birthday today</strong>}
                          </p>
                        </div>
                        <button
                          className={isFriend ? 'added' : ''}
                          onClick={() => toggleFriend(profile)}
                          aria-label={isFriend ? `Remove ${profile.name}` : `Add ${profile.name}`}
                        >
                          {isFriend ? 'Added ✓' : 'Add'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}
            {sessionUser && friendsStatus === 'ready' && friends.length === 0 && !friendSearchOpen && (
              <div className="no-friends">
                <p>Your circle is empty for now.</p>
                <button onClick={() => setFriendSearchOpen(true)}>Find your first friend</button>
              </div>
            )}
            {sessionUser && friendsStatus === 'error' && (
              <p className="directory-message">Your friends couldn’t be loaded. Try refreshing.</p>
            )}
            <div className="friend-grid">
              {friends.map((f) => {
                const birthday = isBirthdayToday(f.birthdayMonth, f.birthdayDay)
                return (
                  <button className="friend" key={f.userId} onClick={() => openFriend(f)}>
                    {birthday && <BirthdayCrown />}
                    <Avatar choice={f.avatar} manifest={manifest} size="lg" />
                    <span className="scribble-circle" />
                    <h3>{f.name}</h3>
                    <p>{birthday ? `${f.note} · birthday today` : f.note}</p>
                    <em>open their list →</em>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {page === 'friends' && friendView && (
          <section className="page-section friend-list">
            <button className="back-link" onClick={() => setFriendView(null)}>
              ← all friends
            </button>
            <p className="eyebrow">ideas for someone lovely</p>
            <h1>{firstName(friendView.profile.name)}’s Wish List</h1>
            <p className="intro">
              Psst — reservations are private. {firstName(friendView.profile.name)} won’t see a
              thing.
            </p>
            {friendView.status === 'loading' && (
              <p className="directory-message">Opening their list…</p>
            )}
            {friendView.status === 'error' && (
              <p className="directory-message">This list couldn’t be loaded.</p>
            )}
            {friendView.status === 'ready' && friendView.wishes.length === 0 && (
              <div className="empty">
                <Star />
                <h2>Nothing here yet</h2>
                <p>{firstName(friendView.profile.name)} hasn’t added any wishes yet.</p>
              </div>
            )}
            <WishGrid
              items={friendView.wishes}
              onSelect={(w) => setFriendSelected(w.id)}
              friendMode
              onReserve={(item) => {
                const wish = friendView.wishes.find((w) => w.id === item.id)
                if (wish) toggleReserve(wish)
              }}
            />
          </section>
        )}

        {page === 'savings' && (
          <section className="page-section savings-page">
            <div className="savings-heading">
              <div>
                <p className="eyebrow">a little at a time</p>
                <h1>Savings Jar</h1>
                <p className="intro">Tiny drops become lovely things. Keep going.</p>
              </div>
              <Star />
            </div>
            {!sessionUser ? (
              <div className="signin-only">
                <button className="ink-button" onClick={() => setAccountOpen(true)}>
                  Sign in
                </button>
              </div>
            ) : (
              <div className="savings-layout">
                <div className="jar-wrap">
                  <svg
                    className="jar"
                    viewBox="0 0 330 430"
                    role="img"
                    aria-label={`Savings jar ${Math.round(jarRatio * 100)}% full`}
                  >
                    <defs>
                      <clipPath id="jarClip">
                        <path d="M65 98q-20 26-25 62v180q2 55 58 62h134q56-7 58-62V160q-5-36-25-62Z" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#jarClip)">
                      {/* The wash sits at y=265 in the drawing; slide it to match progress. */}
                      <path
                        className="jar-wash"
                        style={{ transform: `translateY(${405 - 290 * jarRatio - 265}px)` }}
                        d="M20 265q68-19 142 2c62 18 110-10 154-1v160H20Z"
                      />
                    </g>
                    <path
                      className="jar-line"
                      d="M83 28h164M78 39h174v52H78zM65 98q-20 26-25 62v180q2 55 58 62h134q56-7 58-62V160q-5-36-25-62M82 112c45 8 124 8 168 0"
                    />
                    <path className="jar-shine" d="M73 155v132" />
                    <text x="165" y="205" textAnchor="middle">
                      for lovely things
                    </text>
                    <Star className="jar-star" />
                  </svg>
                  <div className="jar-total">
                    <strong>${formatMoney(savedTotal)}</strong>
                    <span>saved altogether</span>
                  </div>
                </div>
                <div className="saving-list">
                  <p className="hand-label">currently saving for...</p>
                  {wishesStatus === 'ready' && jarWishes.length === 0 && (
                    <p className="directory-message">
                      Nothing in the jar yet. Open a wish and choose “Add to savings jar”.
                    </p>
                  )}
                  {jarWishes.map((w) => (
                    <SavingRow
                      key={w.id}
                      wish={w}
                      number={wishes.indexOf(w) + 1}
                      onDeposit={(amount) => deposit(w.id, amount)}
                      onUpdate={(data) => updateWish(w.id, data)}
                    />
                  ))}
                  <button className="outline-button" onClick={() => go('wishlist')}>
                    Choose another wish
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {page === 'avatar' && sessionUser && (
          <section className="page-section avatar-page">
            <div>
              <p className="eyebrow">make it look like you</p>
              <h1>Draw your avatar</h1>
              <p className="intro">Pick a few details for your little ink portrait.</p>
            </div>
            <div className="avatar-studio">
              <div className="preview-paper">
                <Star />
                <Avatar choice={avatarDraft} manifest={manifest} size="lg" />
                <span>{firstName(sessionUser.name)}</span>
                <p>looking lovely!</p>
              </div>
              <div className="avatar-options">
                {manifest.layers.map((layer) => (
                  <OptionGroup
                    key={layer.key}
                    title={layer.label}
                    options={[
                      ...(layer.optional ? [{ value: 'none', label: 'none' }] : []),
                      ...layer.options.map((o) => ({ value: o.key, label: o.label })),
                    ]}
                    value={normalizeAvatar(avatarDraft, manifest)[layer.key]}
                    onChange={(value) => setAvatarDraft((d) => ({ ...d, [layer.key]: value }))}
                  />
                ))}
                <button className="ink-button" onClick={saveAvatar} disabled={avatarSaving}>
                  {avatarSaving ? 'Saving…' : 'Save my portrait'}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <p>List Your Wishes — made with love and blue ink.</p>
      </footer>

      {notice && (
        <p className="form-error app-notice" role="alert">
          {notice}
        </p>
      )}

      {selected && (
        <ItemModal
          item={selected}
          number={wishes.indexOf(selected) + 1}
          onClose={() => setSelectedId(null)}
          onBought={() => updateWish(selected.id, { bought: !selected.bought })}
          onSave={async () => {
            if (selected.savingsGoal === null) {
              const updated = await updateWish(selected.id, { savingsGoal: selected.price })
              if (!updated) return
            }
            setSelectedId(null)
            go('savings')
          }}
          onEdit={() => {
            setFormWish(selected)
            setSelectedId(null)
          }}
          onDelete={() => deleteWish(selected.id)}
        />
      )}
      {friendView && friendSelected && (
        <FriendItemModal
          item={friendView.wishes.find((w) => w.id === friendSelected) ?? null}
          number={friendView.wishes.findIndex((w) => w.id === friendSelected) + 1}
          onClose={() => setFriendSelected(null)}
          onReserve={(w) => toggleReserve(w)}
        />
      )}
      {bannerOpen && sessionUser && (
        <BannerModal
          user={sessionUser}
          onClose={() => setBannerOpen(false)}
          onSaved={(user) => {
            setSessionUser(user)
            setBannerOpen(false)
          }}
          onAuthError={() => {
            setBannerOpen(false)
            handleError(new ApiError(401, 'Please sign in first.'))
          }}
        />
      )}
      {formWish && (
        <WishFormModal
          initial={formWish === 'new' ? null : formWish}
          onClose={() => setFormWish(null)}
          onSaved={(wish, created) => {
            if (created) setWishes((all) => [...all, wish])
            else replaceWish(wish)
            setFormWish(null)
          }}
          onAuthError={() => {
            setFormWish(null)
            setSessionUser(null)
            setAccountOpen(true)
          }}
        />
      )}
      {accountOpen && (
        <AccountModal
          user={sessionUser}
          manifest={manifest}
          onClose={() => setAccountOpen(false)}
          onAuthenticated={(user) => {
            setSessionUser(user)
            setAvatarDraft(normalizeAvatar(user.avatar, manifest))
          }}
          onLogout={() => {
            setSessionUser(null)
            setAccountOpen(false)
            go('wishlist')
          }}
          onCustomize={() => {
            setAccountOpen(false)
            setAvatarDraft(normalizeAvatar(sessionUser?.avatar, manifest))
            go('avatar')
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- grid

function WishImage({
  photo,
  alt,
  sizes,
  large = false,
}: {
  photo: Photo | null
  alt: string
  sizes: string
  large?: boolean
}) {
  if (!photo) {
    return (
      <span className="no-photo">
        <Star />
      </span>
    )
  }
  return <Image src={large ? photo.url : photo.cardUrl} alt={alt} fill sizes={sizes} unoptimized />
}

function WishGrid<T extends GridItem>({
  items,
  onSelect,
  friendMode = false,
  onReserve,
}: {
  items: T[]
  onSelect: (w: T) => void
  friendMode?: boolean
  onReserve?: (w: T) => void
}) {
  return (
    <section className="wish-grid">
      {items.map((item, i) => (
        <article
          className={`wish-item offset-${i % 4} ${item.bought && !friendMode ? 'bought' : ''}`}
          key={item.id}
        >
          <span className="item-no">{pad(i + 1)}</span>
          <button
            className={`product-image ${item.photo?.cutout ? 'cutout' : ''}`}
            onClick={() => onSelect(item)}
            aria-label={`View ${item.name}`}
          >
            <span className="watercolor" />
            <WishImage photo={item.photo} alt={item.name} sizes="(max-width: 800px) 46vw, 300px" />
            {item.bought && !friendMode && (
              <span className="got-it">
                <i />
                got it!
              </span>
            )}
          </button>
          <div className="item-info">
            <div>
              <h3>{item.name}</h3>
              <p>
                ${formatMoney(item.price)}
                {item.store && (
                  <>
                    {' '}
                    <span>·</span> {item.store}
                  </>
                )}
              </p>
            </div>
            <div className="hearts">
              {[0, 1, 2].map((n) => (
                <Heart key={n} filled={n < item.hearts} />
              ))}
            </div>
          </div>
          {friendMode && (
            <ReserveButton item={item} onReserve={() => onReserve?.(item)} />
          )}
        </article>
      ))}
    </section>
  )
}

function ReserveButton({ item, onReserve }: { item: GridItem; onReserve: () => void }) {
  const takenByOther = Boolean(item.taken && !item.reservedByMe)
  return (
    <button
      className={`reserve ${item.reservedByMe ? 'is-reserved' : ''} ${takenByOther ? 'is-taken' : ''}`}
      onClick={onReserve}
      disabled={takenByOther}
    >
      {item.reservedByMe ? '✓ reserved by you' : takenByOther ? 'someone’s got this' : 'I’ll get this'}
    </button>
  )
}

// ---------------------------------------------------------------- modals

function ModalFrame({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode
  onClose: () => void
  label: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-paper">
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

function DetailTop({ item }: { item: GridItem & Pick<MyWish, 'category' | 'url' | 'notes'> }) {
  return (
    <>
      <p className="eyebrow">
        {item.category} · {HEART_WORDS[item.hearts]}-heart wish
      </p>
      <h2>{item.name}</h2>
      <div className="detail-hearts">
        {[0, 1, 2].map((n) => (
          <Heart key={n} filled={n < item.hearts} />
        ))}
      </div>
      <p className="price">${formatMoney(item.price)}</p>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
          Visit {item.store || 'the store'} ↗
        </a>
      )}
      <p className="detail-note">{item.notes || DEFAULT_NOTE}</p>
    </>
  )
}

function DetailImage({ item, number }: { item: GridItem; number: number }) {
  return (
    <div className={`detail-image ${item.photo?.cutout ? 'cutout' : ''}`}>
      <span className="watercolor" />
      <WishImage photo={item.photo} alt={item.name} sizes="(max-width: 800px) 90vw, 500px" large />
      <span className="detail-number">{pad(number)}</span>
    </div>
  )
}

function ItemModal({
  item,
  number,
  onClose,
  onBought,
  onSave,
  onEdit,
  onDelete,
}: {
  item: MyWish
  number: number
  onClose: () => void
  onBought: () => void
  onSave: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <ModalFrame onClose={onClose} label={item.name}>
      <div className="detail-modal">
        <DetailImage item={item} number={number} />
        <div className="detail-copy">
          <DetailTop item={item} />
          <label className="bought-check">
            <input type="checkbox" checked={item.bought} onChange={onBought} />
            <span>{item.bought ? 'Yes, I got it!' : 'I bought it!'}</span>
          </label>
          {!item.bought && (
            <button className="ink-button" onClick={onSave}>
              {item.savingsGoal === null ? 'Add to savings jar' : 'Open the savings jar'}
            </button>
          )}
          <div className="detail-actions">
            <button className="text-button" onClick={onEdit}>
              Edit this wish
            </button>
            <button
              className="text-button danger"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
            >
              {confirmDelete ? 'Really delete? Tap again' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  )
}

function FriendItemModal({
  item,
  number,
  onClose,
  onReserve,
}: {
  item: FriendWish | null
  number: number
  onClose: () => void
  onReserve: (w: FriendWish) => void
}) {
  if (!item) return null
  return (
    <ModalFrame onClose={onClose} label={item.name}>
      <div className="detail-modal">
        <DetailImage item={item} number={number} />
        <div className="detail-copy">
          <DetailTop item={item} />
          <ReserveButton item={item} onReserve={() => onReserve(item)} />
        </div>
      </div>
    </ModalFrame>
  )
}

function WishFormModal({
  initial,
  onClose,
  onSaved,
  onAuthError,
}: {
  initial: MyWish | null
  onClose: () => void
  onSaved: (wish: MyWish, created: boolean) => void
  onAuthError: () => void
}) {
  const [url, setUrl] = useState(initial?.url ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [store, setStore] = useState(initial?.store ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Other')
  const [hearts, setHearts] = useState(initial?.hearts ?? 3)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [photo, setPhoto] = useState<Photo | null>(initial?.photo ?? null)
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'uploading'>('idle')
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle')
  const [error, setError] = useState('')

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) onAuthError()
    else setError(message(e))
  }

  // Paste a product link → fill in the empty fields and bring in a cut-out photo.
  const [lookup, setLookup] = useState<{ state: 'idle' | 'reading' | 'done' | 'failed'; note: string }>({
    state: 'idle',
    note: '',
  })
  const lookedUp = useRef(initial?.url ?? '')
  const readLink = async (value: string) => {
    const link = value.trim()
    if (!/^https?:\/\/\S+\.\S+/i.test(link) || link === lookedUp.current) return
    lookedUp.current = link
    setError('')
    setLookup({ state: 'reading', note: 'reading the page…' })
    try {
      const { preview } = await api<{
        preview: { name: string; store: string; price: number | null; category: Category | null; imageUrl: string | null }
      }>('/api/app/link-preview', { method: 'POST', json: { url: link } })
      if (lookedUp.current !== link) return
      if (preview.name) setName((current) => current || preview.name)
      if (preview.store) setStore((current) => current || preview.store)
      if (preview.price !== null) setPrice((current) => current || String(preview.price))
      if (preview.category) setCategory((current) => (current === 'Other' ? preview.category! : current))
      setLookup({ state: 'done', note: 'filled in from the link' })
      if (preview.imageUrl && !photo) {
        setPhotoStatus('uploading')
        try {
          const result = await api<{ photo: Photo }>('/api/app/photos/from-url', {
            method: 'POST',
            json: { url: preview.imageUrl, alt: preview.name || 'Wish photo' },
          })
          if (lookedUp.current === link) setPhoto((current) => current ?? result.photo)
        } catch {
          setLookup({ state: 'done', note: 'filled in from the link (add the photo yourself)' })
        } finally {
          setPhotoStatus('idle')
        }
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return onAuthError()
      if (lookedUp.current === link) setLookup({ state: 'failed', note: message(e) })
    }
  }

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setPhotoStatus('uploading')
    try {
      const blob = await shrinkPhoto(file)
      const form = new FormData()
      form.append('file', blob, file.name)
      form.append('alt', name || 'Wish photo')
      const result = await api<{ photo: Photo }>('/api/app/photos', { method: 'POST', body: form })
      setPhoto(result.photo)
    } catch (e) {
      fail(e)
    } finally {
      setPhotoStatus('idle')
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (photoStatus === 'uploading') return
    setStatus('submitting')
    setError('')
    const data = {
      name,
      price,
      store,
      url,
      category,
      hearts,
      notes,
      photo: photo?.id ?? null,
    }
    try {
      const { wish } = initial
        ? await api<{ wish: MyWish }>(`/api/app/wishes/${initial.id}`, { method: 'PATCH', json: data })
        : await api<{ wish: MyWish }>('/api/app/wishes', { method: 'POST', json: data })
      onSaved(wish, !initial)
    } catch (e) {
      fail(e)
    } finally {
      setStatus('idle')
    }
  }

  return (
    <ModalFrame onClose={onClose} label={initial ? 'Edit wish' : 'Add a wish'}>
      <form className="add-modal" onSubmit={submit}>
        <div className="modal-heading">
          <Star />
          <p className="eyebrow">{initial ? 'a little touch-up' : 'put it out into the universe'}</p>
          <h2>{initial ? 'Edit Wish' : 'Add a Wish'}</h2>
          <p>Paste a link, or fill in the little details yourself.</p>
        </div>
        <label>
          <span>Link</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text')
              if (pasted) setTimeout(() => readLink(pasted), 0)
            }}
            onBlur={(e) => readLink(e.target.value)}
            placeholder="https://..."
            inputMode="url"
          />
          {lookup.state !== 'idle' && (
            <small className={`link-lookup is-${lookup.state}`} aria-live="polite">
              {lookup.note}
            </small>
          )}
        </label>
        <label className={`add-photo ${photoStatus === 'uploading' ? 'busy' : ''}`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            onChange={(e) => {
              choosePhoto(e.target.files?.[0])
              e.target.value = ''
            }}
            disabled={photoStatus === 'uploading'}
            aria-label="Add a photo"
          />
          {photo ? (
            <>
              <img src={photo.cardUrl} alt="" />
              <small>{photoStatus === 'uploading' ? 'cutting it out…' : 'tap to change'}</small>
            </>
          ) : (
            <>
              <span>＋</span>
              <p>{photoStatus === 'uploading' ? 'cutting it out…' : 'add a photo'}</p>
              <small>drag or browse</small>
            </>
          )}
        </label>
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What are you wishing for?"
              maxLength={120}
              required
            />
          </label>
          <label>
            <span>Price</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$ 0.00"
              inputMode="decimal"
              required
            />
          </label>
          <label>
            <span>Store</span>
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="Where did you find it?"
              maxLength={80}
            />
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="wide-field">
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Size, colour, anything a gift-giver should know"
            maxLength={1000}
          />
        </label>
        <div className="heart-picker">
          <span>How much do you want it?</span>
          <div>
            {[1, 2, 3].map((n) => (
              <button type="button" key={n} onClick={() => setHearts(n)} aria-label={`${n} hearts`}>
                <Heart filled={n <= hearts} />
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="form-error wide-field" role="alert">
            {error}
          </p>
        )}
        <button
          className="ink-button"
          type="submit"
          disabled={status === 'submitting' || photoStatus === 'uploading'}
        >
          {status === 'submitting' ? 'Just a moment…' : initial ? 'Save changes' : 'Add to my wishes'}
        </button>
      </form>
    </ModalFrame>
  )
}

function SavingRow({
  wish,
  number,
  onDeposit,
  onUpdate,
}: {
  wish: MyWish
  number: number
  onDeposit: (amount: number) => Promise<boolean>
  onUpdate: (data: Partial<Pick<MyWish, 'savingsGoal' | 'saved'>>) => Promise<MyWish | null>
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [goal, setGoal] = useState(String(wish.savingsGoal ?? wish.price))
  const [busy, setBusy] = useState(false)
  const target = wish.savingsGoal ?? wish.price

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true)
    await task()
    setBusy(false)
  }

  return (
    <div className="saving-row">
      {wish.photo ? (
        <Image src={wish.photo.cardUrl} alt="" width={95} height={95} unoptimized />
      ) : (
        <span />
      )}
      <div>
        <span className="item-no">{pad(number)}</span>
        <h3>{wish.name}</h3>
        <p>
          ${formatMoney(wish.saved)} of ${formatMoney(target)} saved
        </p>
        <div className="progress">
          <i style={{ width: `${target > 0 ? Math.min(100, (wish.saved / target) * 100) : 0}%` }} />
        </div>
        {!open && (
          <button className="saving-edit-link" onClick={() => setOpen(true)}>
            add a different amount · change goal
          </button>
        )}
      </div>
      <button onClick={() => run(() => onDeposit(10))} disabled={busy || wish.saved >= target}>
        + $10
      </button>
      {open && (
        <div className="saving-form">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(amount.replace(/[$,\s]/g, ''))
              if (!(n > 0)) return
              run(async () => {
                if (await onDeposit(n)) setAmount('')
              })
            }}
          >
            <label>
              add $
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                aria-label="Amount to add"
              />
              <button disabled={busy}>put it in</button>
            </label>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              run(() => onUpdate({ savingsGoal: Number(goal.replace(/[$,\s]/g, '')) }))
            }}
          >
            <label>
              goal $
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                inputMode="decimal"
                aria-label="Savings goal"
              />
              <button disabled={busy}>save goal</button>
            </label>
          </form>
          <button className="text-button" onClick={() => run(() => onUpdate({ savingsGoal: null, saved: 0 }))}>
            take it out of the jar
          </button>
          <button className="text-button" onClick={() => setOpen(false)}>
            done
          </button>
        </div>
      )}
    </div>
  )
}

function AccountModal({
  user,
  manifest,
  onClose,
  onAuthenticated,
  onLogout,
  onCustomize,
}: {
  user: SessionUser | null
  manifest: AvatarManifest
  onClose: () => void
  onAuthenticated: (user: SessionUser) => void
  onLogout: () => void
  onCustomize: () => void
}) {
  const hairLayer = manifest.layers.find((l) => l.key === 'hair')
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthday, setBirthday] = useState('')
  const [signupHair, setSignupHair] = useState(hairLayer?.options[0]?.key ?? '')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const result = await api<{ user: SessionUser }>(
        `/api/app/auth/${mode === 'signup' ? 'signup' : 'login'}`,
        {
          method: 'POST',
          json:
            mode === 'signup'
              ? { name, handle, email, password, birthday, hair: signupHair }
              : { email, password },
        },
      )
      onAuthenticated(result.user)
    } catch (submissionError) {
      setError(message(submissionError))
    } finally {
      setStatus('idle')
    }
  }

  const logout = async () => {
    setStatus('submitting')
    setError('')
    try {
      await api('/api/app/auth/logout', { method: 'POST' })
      onLogout()
    } catch (submissionError) {
      setError(message(submissionError))
    } finally {
      setStatus('idle')
    }
  }

  return (
    <ModalFrame onClose={onClose} label={user ? 'Your account' : 'Sign in or create an account'}>
      {user ? (
        <div className="account-signed-in">
          <Avatar choice={user.avatar} manifest={manifest} size="lg" />
          <p className="eyebrow">your little corner</p>
          <h2>Welcome back, {firstName(user.name)}</h2>
          <p className="account-handle">@{user.handle}</p>
          <p>Your wishes and birthday details are tucked safely into your account.</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="account-actions">
            <button className="ink-button" onClick={onCustomize}>
              Customize my portrait
            </button>
            <button className="text-button" onClick={logout} disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      ) : (
        <form className="account-form" onSubmit={submit}>
          <div className="modal-heading">
            <Star />
            <p className="eyebrow">{mode === 'signup' ? 'make it yours' : 'lovely to see you'}</p>
            <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
            <p>
              {mode === 'signup'
                ? 'Save your little corner and let friends know when it’s your day.'
                : 'Sign in to return to your wishes.'}
            </p>
          </div>

          {mode === 'signup' && (
            <>
              <label>
                <span>Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
              <label>
                <span>Username</span>
                <div className="prefixed-input">
                  <i>@</i>
                  <input
                    value={handle}
                    onChange={(event) => setHandle(event.target.value)}
                    autoComplete="username"
                    pattern="[A-Za-z0-9._]{3,30}"
                    title="3–30 letters, numbers, dots or underscores"
                    required
                  />
                </div>
              </label>
            </>
          )}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </label>

          {mode === 'signup' && (
            <>
              <label>
                <span>Birthday</span>
                <input
                  type="date"
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  required
                />
                <small>Your birth year stays private.</small>
              </label>
              {hairLayer && (
                <fieldset className="account-hair">
                  <legend>Portrait hair</legend>
                  <div>
                    {hairLayer.options.map((option) => (
                      <button
                        type="button"
                        className={signupHair === option.key ? 'selected' : ''}
                        onClick={() => setSignupHair(option.key)}
                        key={option.key}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="ink-button account-submit" disabled={status === 'submitting'}>
            {status === 'submitting'
              ? 'Just a moment…'
              : mode === 'signup'
                ? 'Create my account'
                : 'Sign in'}
          </button>
          <button
            className="account-switch"
            type="button"
            onClick={() => {
              setMode((current) => (current === 'signup' ? 'login' : 'signup'))
              setError('')
            }}
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
        </form>
      )}
    </ModalFrame>
  )
}

function BannerModal({
  user,
  onClose,
  onSaved,
  onAuthError,
}: {
  user: SessionUser
  onClose: () => void
  onSaved: (user: SessionUser) => void
  onAuthError: () => void
}) {
  const [color, setColor] = useState(user.bannerColor)
  const [textColor, setTextColor] = useState(user.bannerTextColor)
  const [shape, setShape] = useState<BannerShape>(user.bannerShape)
  const [intro, setIntro] = useState(user.intro || DEFAULT_INTRO)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const look = bannerStyle(color, textColor)

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const text = intro.trim()
      const { user: updated } = await api<{ user: SessionUser }>('/api/app/me', {
        method: 'PATCH',
        json: { bannerColor: color, bannerTextColor: textColor, bannerShape: shape, intro: text === DEFAULT_INTRO ? '' : text },
      })
      onSaved(updated)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onAuthError()
      else setError(message(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame onClose={onClose} label="Change the banner">
      <form className="add-modal banner-modal" onSubmit={save}>
        <div className="modal-heading">
          <Star />
          <p className="eyebrow">make it yours</p>
          <h2>Your Banner</h2>
        </div>

        <div className={`banner-preview ${look.className}`} style={look.style} aria-hidden="true">
          <BannerDecor shape={shape} light={look.light} />
          <strong>{firstName(user.name)}’s Wish List</strong>
          <span>{intro.trim() || DEFAULT_INTRO}</span>
        </div>

        <fieldset className="banner-field">
          <legend>Banner colour</legend>
          <SwatchRow colors={BANNER_COLORS} value={color} onChange={setColor} />
        </fieldset>

        <fieldset className="banner-field">
          <legend>Text colour</legend>
          <SwatchRow colors={TEXT_COLORS} value={textColor} onChange={setTextColor} auto />
        </fieldset>

        <fieldset className="banner-field">
          <legend>Little shapes</legend>
          <div
            className={`banner-shape-picker ${textColor ? 'has-ink' : ''}`}
            style={textColor ? ({ '--banner-ink': textColor } as React.CSSProperties) : undefined}
          >
            {BANNER_SHAPES.map((s) => (
              <button
                type="button"
                key={s}
                className={shape === s ? 'selected' : ''}
                onClick={() => setShape(s)}
                aria-pressed={shape === s}
                style={{ background: color }}
              >
                {s === 'stars' ? (
                  <span className={`shape-thumb ${look.light ? 'is-ink' : ''}`}>
                    <BannerStar />
                  </span>
                ) : look.light ? (
                  <span
                    className="shape-thumb is-ink is-mask"
                    style={{
                      maskImage: `url(/banner-shapes/${s}.webp)`,
                      WebkitMaskImage: `url(/banner-shapes/${s}.webp)`,
                    }}
                  />
                ) : (
                  <img className="shape-thumb" src={`/banner-shapes/${s}.webp`} alt="" />
                )}
                <small>{s}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="wide-field">
          <span>Words under your name</span>
          <textarea value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={280} rows={2} />
        </label>

        {error && <p className="form-error">{error}</p>}
        <button className="ink-button" disabled={saving}>
          {saving ? 'Saving…' : 'Save my banner'}
        </button>
      </form>
    </ModalFrame>
  )
}

function OptionGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="option-group">
      <p>{title}</p>
      <div>
        {options.map((o) => (
          <button
            key={o.value}
            className={value === o.value ? 'selected' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
