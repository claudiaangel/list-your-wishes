'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

type Page = 'wishlist' | 'friends' | 'savings' | 'avatar'
type Wish = {
  id: number
  name: string
  price: number
  store: string
  category: string
  hearts: number
  image: string
  cutout?: boolean
  bought?: boolean
  saved?: number
}

type FriendProfile = {
  id: string
  name: string
  handle: string
  note: string
  hair: string
  featured?: boolean
  isBirthday?: boolean
}

type AppSessionUser = {
  id: string
  name: string
  handle: string
  hair: 'waves' | 'bob' | 'bun' | 'curls'
}

const initialWishes: Wish[] = [
  {
    id: 1,
    name: 'Classic Mini II boots',
    price: 170,
    store: 'UGG',
    category: 'Shoes',
    hearts: 3,
    image: '/wishes/ugg-boots.png',
    cutout: true,
    saved: 60,
  },
  {
    id: 2,
    name: 'Second Skin tank',
    price: 48,
    store: 'ARKET',
    category: 'Clothes',
    hearts: 2,
    image: '/wishes/product-02.png',
    cutout: true,
    saved: 20,
  },
  {
    id: 3,
    name: 'Rouge Artist lipstick set',
    price: 145,
    store: 'Make Up For Ever',
    category: 'Beauty',
    hearts: 3,
    image: '/wishes/lipsticks.png',
    cutout: true,
    bought: true,
  },
]

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

function Avatar({
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

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="logo" onClick={onClick}>
      <span>List Your</span>
      <strong>Wishes</strong>
      <Star />
    </button>
  )
}

function App() {
  const [page, setPage] = useState<Page>('wishlist')
  const [wishes, setWishes] = useState(initialWishes)
  const [category, setCategory] = useState('All')
  const [showBought, setShowBought] = useState(true)
  const [selected, setSelected] = useState<Wish | null>(null)
  const [adding, setAdding] = useState(false)
  const [friend, setFriend] = useState<string | null>(null)
  const [reserved, setReserved] = useState<number[]>([])
  const [hair, setHair] = useState('waves')
  const [eyes, setEyes] = useState('sleepy')
  const [accessory, setAccessory] = useState('none')
  const [heroIntro, setHeroIntro] = useState(
    'A quiet corner for everything I love, need, and might just treat myself to.',
  )
  const [directory, setDirectory] = useState<FriendProfile[]>([])
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [friendSearchOpen, setFriendSearchOpen] = useState(false)
  const [friendQuery, setFriendQuery] = useState('')
  const [directoryStatus, setDirectoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [accountOpen, setAccountOpen] = useState(false)
  const [sessionUser, setSessionUser] = useState<AppSessionUser | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false

    fetch('/api/friend-profiles')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the friend directory')
        return response.json() as Promise<{ profiles: FriendProfile[] }>
      })
      .then(({ profiles }) => {
        if (cancelled) return
        setDirectory(profiles)
        const stored = window.localStorage.getItem('list-your-wishes-friends')
        let storedIds: string[] | null = null
        if (stored !== null) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string'))
              storedIds = parsed
          } catch {
            window.localStorage.removeItem('list-your-wishes-friends')
          }
        }
        setFriendIds(
          storedIds ?? profiles.filter((profile) => profile.featured).map((profile) => profile.id),
        )
        setDirectoryStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setDirectoryStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    fetch('/api/app-auth/session')
      .then((response) => response.json() as Promise<{ user: AppSessionUser | null }>)
      .then(({ user }) => {
        if (!cancelled) {
          setSessionUser(user)
          if (user) setHair(user.hair)
        }
      })
      .catch(() => {
        if (!cancelled) setSessionUser(null)
      })
      .finally(() => {
        if (!cancelled) setSessionStatus('ready')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(
    () =>
      wishes.filter(
        (w) => (category === 'All' || w.category === category) && (showBought || !w.bought),
      ),
    [wishes, category, showBought],
  )
  const friends = useMemo(
    () => directory.filter((profile) => friendIds.includes(profile.id)),
    [directory, friendIds],
  )
  const friendResults = useMemo(() => {
    const query = friendQuery.trim().toLowerCase()
    return directory.filter(
      (profile) => !query || `${profile.name} ${profile.handle}`.toLowerCase().includes(query),
    )
  }, [directory, friendQuery])
  const go = (next: Page) => {
    setPage(next)
    setFriend(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const toggleBought = (id: number) =>
    setWishes((items) => items.map((w) => (w.id === id ? { ...w, bought: !w.bought } : w)))
  const toggleFriend = (id: string) => {
    setFriendIds((current) => {
      const next = current.includes(id)
        ? current.filter((friendId) => friendId !== id)
        : [...current, id]
      window.localStorage.setItem('list-your-wishes-friends', JSON.stringify(next))
      return next
    })
  }

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
          <Avatar hair={hair} eyes={eyes} accessory={accessory} size="sm" />
          <span>
            {sessionStatus === 'loading' ? 'Account' : sessionUser?.name || 'Sign in'}
            <small>{sessionUser ? `@${sessionUser.handle}` : 'save your wishes'}</small>
          </span>
        </button>
      </header>

      <main>
        {page === 'wishlist' && (
          <>
            <section className="hero">
              <div className="hero-stars" aria-hidden="true">
                <BannerStar />
                <BannerStar />
                <BannerStar />
                <BannerStar />
                <BannerStar />
              </div>
              <h1>Claudia’s Wish List</h1>
              <div className="editable-note">
                <p
                  className="intro"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(event) => setHeroIntro(event.currentTarget.textContent || heroIntro)}
                  aria-label="Editable wish list description"
                >
                  {heroIntro}
                </p>
                <span>click to edit</span>
              </div>
            </section>
            <section className="controls">
              <div className="tabs" role="tablist">
                {['All', 'Clothes', 'Shoes', 'Jewelry', 'Bags', 'Beauty', 'Other'].map((c) => (
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
            <WishGrid items={visible} onSelect={setSelected} />
            {visible.length === 0 && (
              <div className="empty">
                <Star />
                <h2>Nothing here yet</h2>
                <p>That means there’s room for one more lovely thing.</p>
              </div>
            )}
            <button className="add-stamp" onClick={() => setAdding(true)}>
              <span>＋</span> Add a wish
            </button>
          </>
        )}

        {page === 'friends' && !friend && (
          <section className="page-section friends-page">
            <div className="friends-title-row">
              <h1>Friends’ Wish Lists</h1>
              <button
                className="add-friend-button"
                onClick={() => setFriendSearchOpen((open) => !open)}
              >
                {friendSearchOpen ? 'Close search' : '+ Add friend'}
              </button>
            </div>
            <p className="intro">Peek at what the people you love have been dreaming about.</p>
            {friendSearchOpen && (
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
                  {directoryStatus === 'loading' && (
                    <p className="directory-message">Opening the directory…</p>
                  )}
                  {directoryStatus === 'error' && (
                    <p className="directory-message">
                      The directory could not be loaded. Try again shortly.
                    </p>
                  )}
                  {directoryStatus === 'ready' && friendResults.length === 0 && (
                    <p className="directory-message">No users match that search.</p>
                  )}
                  {friendResults.map((profile) => {
                    const isFriend = friendIds.includes(profile.id)
                    return (
                      <article className="friend-result" key={profile.id}>
                        <div className="friend-avatar-wrap">
                          {profile.isBirthday && <BirthdayCrown />}
                          <Avatar hair={profile.hair} size="sm" />
                        </div>
                        <div>
                          <h3>{profile.name}</h3>
                          <p>
                            @{profile.handle} · {profile.note}
                            {profile.isBirthday && <strong> · birthday today</strong>}
                          </p>
                        </div>
                        <button
                          className={isFriend ? 'added' : ''}
                          onClick={() => toggleFriend(profile.id)}
                        >
                          {isFriend ? 'Added ✓' : 'Add'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}
            {directoryStatus === 'ready' && friends.length === 0 && !friendSearchOpen && (
              <div className="no-friends">
                <p>Your circle is empty for now.</p>
                <button onClick={() => setFriendSearchOpen(true)}>Find your first friend</button>
              </div>
            )}
            <div className="friend-grid">
              {friends.map((f) => (
                <button className="friend" key={f.id} onClick={() => setFriend(f.name)}>
                  {f.isBirthday && <BirthdayCrown />}
                  <Avatar hair={f.hair} size="lg" />
                  <span className="scribble-circle" />
                  <h3>{f.name}</h3>
                  <p>{f.isBirthday ? `${f.note} · birthday today` : f.note}</p>
                  <em>open their list →</em>
                </button>
              ))}
            </div>
          </section>
        )}

        {page === 'friends' && friend && (
          <section className="page-section friend-list">
            <button className="back-link" onClick={() => setFriend(null)}>
              ← all friends
            </button>
            <p className="eyebrow">ideas for someone lovely</p>
            <h1>{friend}’s Wish List</h1>
            <p className="intro">Psst — reservations are private. {friend} won’t see a thing.</p>
            <WishGrid
              items={wishes.slice(0, 6)}
              onSelect={() => {}}
              friendMode
              reserved={reserved}
              onReserve={(id) =>
                setReserved((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]))
              }
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
            <div className="savings-layout">
              <div className="jar-wrap">
                <svg className="jar" viewBox="0 0 330 430">
                  <defs>
                    <clipPath id="jarClip">
                      <path d="M65 98q-20 26-25 62v180q2 55 58 62h134q56-7 58-62V160q-5-36-25-62Z" />
                    </clipPath>
                  </defs>
                  <path
                    className="jar-wash"
                    clipPath="url(#jarClip)"
                    d="M20 265q68-19 142 2c62 18 110-10 154-1v160H20Z"
                  />
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
                  <strong>${wishes.reduce((total, wish) => total + (wish.saved || 0), 0)}</strong>
                  <span>saved altogether</span>
                </div>
              </div>
              <div className="saving-list">
                <p className="hand-label">currently saving for...</p>
                {wishes
                  .filter((w) => w.saved)
                  .map((w) => (
                    <div className="saving-row" key={w.id}>
                      <Image src={w.image} alt="" width={95} height={95} />
                      <div>
                        <span className="item-no">0{w.id}</span>
                        <h3>{w.name}</h3>
                        <p>
                          ${w.saved} of ${w.price} saved
                        </p>
                        <div className="progress">
                          <i style={{ width: `${Math.min(100, (w.saved! / w.price) * 100)}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setWishes((all) =>
                            all.map((x) =>
                              x.id === w.id
                                ? { ...x, saved: Math.min(x.price, (x.saved || 0) + 10) }
                                : x,
                            ),
                          )
                        }
                      >
                        + $10
                      </button>
                    </div>
                  ))}
                <button className="outline-button" onClick={() => go('wishlist')}>
                  Choose another wish
                </button>
              </div>
            </div>
          </section>
        )}

        {page === 'avatar' && (
          <section className="page-section avatar-page">
            <div>
              <p className="eyebrow">make it look like you</p>
              <h1>Draw your avatar</h1>
              <p className="intro">Pick a few details for your little ink portrait.</p>
            </div>
            <div className="avatar-studio">
              <div className="preview-paper">
                <Star />
                <Avatar hair={hair} eyes={eyes} accessory={accessory} size="lg" />
                <span>Claudia</span>
                <p>looking lovely!</p>
              </div>
              <div className="avatar-options">
                <OptionGroup
                  title="Hair"
                  values={['waves', 'bob', 'bun', 'curls']}
                  value={hair}
                  onChange={setHair}
                />
                <OptionGroup
                  title="Eyes"
                  values={['sleepy', 'bright']}
                  value={eyes}
                  onChange={setEyes}
                />
                <OptionGroup
                  title="Accessories"
                  values={['none', 'glasses', 'earrings', 'bow']}
                  value={accessory}
                  onChange={setAccessory}
                />
                <button className="ink-button" onClick={() => go('wishlist')}>
                  Save my portrait
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <p>List Your Wishes — made with love and blue ink.</p>
      </footer>

      {selected && (
        <ItemModal
          item={selected}
          onClose={() => setSelected(null)}
          onBought={() => {
            toggleBought(selected.id)
            setSelected({ ...selected, bought: !selected.bought })
          }}
          onSave={() => {
            setWishes((ws) =>
              ws.map((w) => (w.id === selected.id ? { ...w, saved: w.saved || 10 } : w)),
            )
            setSelected(null)
            go('savings')
          }}
        />
      )}
      {adding && (
        <AddModal
          onClose={() => setAdding(false)}
          onAdd={(wish) => {
            setWishes((w) => [
              ...w,
              { ...wish, id: w.length + 1, image: '/wishes/product-02.png', cutout: true },
            ])
            setAdding(false)
          }}
        />
      )}
      {accountOpen && (
        <AccountModal
          user={sessionUser}
          currentHair={hair}
          onClose={() => setAccountOpen(false)}
          onAuthenticated={(user) => {
            setSessionUser(user)
            setHair(user.hair)
          }}
          onLogout={() => setSessionUser(null)}
          onCustomize={() => {
            setAccountOpen(false)
            go('avatar')
          }}
        />
      )}
    </div>
  )
}

function WishGrid({
  items,
  onSelect,
  friendMode = false,
  reserved = [],
  onReserve,
}: {
  items: Wish[]
  onSelect: (w: Wish) => void
  friendMode?: boolean
  reserved?: number[]
  onReserve?: (id: number) => void
}) {
  return (
    <section className="wish-grid">
      {items.map((item, i) => (
        <article
          className={`wish-item offset-${i % 4} ${item.bought && !friendMode ? 'bought' : ''}`}
          key={item.id}
        >
          <span className="item-no">{String(i + 1).padStart(2, '0')}</span>
          <button
            className={`product-image ${item.cutout ? 'cutout' : ''}`}
            onClick={() => onSelect(item)}
            aria-label={`View ${item.name}`}
          >
            <span className="watercolor" />
            <Image src={item.image} alt={item.name} fill sizes="(max-width: 800px) 46vw, 300px" />
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
                ${item.price} <span>·</span> {item.store}
              </p>
            </div>
            <div className="hearts">
              {[0, 1, 2].map((n) => (
                <Heart key={n} filled={n < item.hearts} />
              ))}
            </div>
          </div>
          {friendMode && (
            <button
              className={`reserve ${reserved.includes(item.id) ? 'is-reserved' : ''}`}
              onClick={() => onReserve?.(item.id)}
            >
              {reserved.includes(item.id) ? '✓ reserved by you' : 'I’ll get this'}
            </button>
          )}
        </article>
      ))}
    </section>
  )
}

function ModalFrame({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode
  onClose: () => void
  label: string
}) {
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

function ItemModal({
  item,
  onClose,
  onBought,
  onSave,
}: {
  item: Wish
  onClose: () => void
  onBought: () => void
  onSave: () => void
}) {
  return (
    <ModalFrame onClose={onClose} label={item.name}>
      <div className="detail-modal">
        <div className={`detail-image ${item.cutout ? 'cutout' : ''}`}>
          <span className="watercolor" />
          <Image src={item.image} alt={item.name} fill sizes="(max-width: 800px) 90vw, 500px" />
          <span className="detail-number">0{item.id}</span>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{item.category} · three-heart wish</p>
          <h2>{item.name}</h2>
          <div className="detail-hearts">
            {[0, 1, 2].map((n) => (
              <Heart key={n} filled={n < item.hearts} />
            ))}
          </div>
          <p className="price">${item.price}</p>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Visit {item.store} ↗
          </a>
          <p className="detail-note">
            The sort of thing that makes even an ordinary Tuesday feel special.
          </p>
          <label className="bought-check">
            <input type="checkbox" checked={!!item.bought} onChange={onBought} />
            <span>{item.bought ? 'Yes, I got it!' : 'I bought it!'}</span>
          </label>
          <button className="ink-button" onClick={onSave}>
            Add to savings jar
          </button>
        </div>
      </div>
    </ModalFrame>
  )
}

function AddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (wish: Omit<Wish, 'id' | 'image'>) => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [category, setCategory] = useState('Other')
  const [hearts, setHearts] = useState(3)
  return (
    <ModalFrame onClose={onClose} label="Add a wish">
      <form
        className="add-modal"
        onSubmit={(e) => {
          e.preventDefault()
          onAdd({
            name: name || 'A lovely new wish',
            price: Number(price) || 75,
            store: store || 'Somewhere lovely',
            category,
            hearts,
          })
        }}
      >
        <div className="modal-heading">
          <Star />
          <p className="eyebrow">put it out into the universe</p>
          <h2>Add a Wish</h2>
          <p>Paste a link, or fill in the little details yourself.</p>
        </div>
        <label>
          <span>Link</span>
          <input placeholder="https://..." />
        </label>
        <div className="add-photo">
          <span>＋</span>
          <p>add a photo</p>
          <small>drag or browse</small>
        </div>
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What are you wishing for?"
            />
          </label>
          <label>
            <span>Price</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$ 0.00"
              inputMode="decimal"
            />
          </label>
          <label>
            <span>Store</span>
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="Where did you find it?"
            />
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {['Clothes', 'Shoes', 'Jewelry', 'Bags', 'Beauty', 'Other'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="heart-picker">
          <span>How much do you want it?</span>
          <div>
            {[1, 2, 3].map((n) => (
              <button type="button" key={n} onClick={() => setHearts(n)}>
                <Heart filled={n <= hearts} />
              </button>
            ))}
          </div>
        </div>
        <button className="ink-button" type="submit">
          Add to my wishes
        </button>
      </form>
    </ModalFrame>
  )
}

function AccountModal({
  user,
  currentHair,
  onClose,
  onAuthenticated,
  onLogout,
  onCustomize,
}: {
  user: AppSessionUser | null
  currentHair: string
  onClose: () => void
  onAuthenticated: (user: AppSessionUser) => void
  onLogout: () => void
  onCustomize: () => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthday, setBirthday] = useState('')
  const [signupHair, setSignupHair] = useState(currentHair)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      const response = await fetch(`/api/app-auth/${mode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'signup'
            ? { name, handle, email, password, birthday, hair: signupHair }
            : { email, password },
        ),
      })
      const result = (await response.json()) as { user?: AppSessionUser; error?: string }
      if (!response.ok || !result.user) throw new Error(result.error || 'Please try again.')
      onAuthenticated(result.user)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Please try again.')
    } finally {
      setStatus('idle')
    }
  }

  const logout = async () => {
    setStatus('submitting')
    setError('')
    try {
      const response = await fetch('/api/app-auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Could not sign out. Please try again.')
      onLogout()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Please try again.')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <ModalFrame onClose={onClose} label={user ? 'Your account' : 'Sign in or create an account'}>
      {user ? (
        <div className="account-signed-in">
          <Avatar hair={currentHair} size="lg" />
          <p className="eyebrow">your little corner</p>
          <h2>Welcome back, {user.name}</h2>
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
                  required
                />
                <small>Your birth year stays private.</small>
              </label>
              <fieldset className="account-hair">
                <legend>Portrait hair</legend>
                <div>
                  {['waves', 'bob', 'bun', 'curls'].map((option) => (
                    <button
                      type="button"
                      className={signupHair === option ? 'selected' : ''}
                      onClick={() => setSignupHair(option)}
                      key={option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
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

function OptionGroup({
  title,
  values,
  value,
  onChange,
}: {
  title: string
  values: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="option-group">
      <p>{title}</p>
      <div>
        {values.map((v) => (
          <button key={v} className={value === v ? 'selected' : ''} onClick={() => onChange(v)}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
