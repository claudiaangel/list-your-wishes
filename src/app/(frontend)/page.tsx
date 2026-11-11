import WishlistApp from '@/components/WishlistApp'
import { getAvatarManifest } from '@/lib/avatars'
import { getCurrentUser, toSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getCurrentUser()
  return (
    <WishlistApp
      initialUser={session ? toSessionUser(session.user) : null}
      manifest={getAvatarManifest()}
    />
  )
}
