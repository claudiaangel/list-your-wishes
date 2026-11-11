import type { Access, FieldAccess, PayloadRequest } from 'payload'

/** Payload Admin accounts (the `admins` collection). Never app users. */
export const isAdmin = (req: PayloadRequest) => req.user?.collection === 'admins'

/** Signed-in public app account (the `users` collection). */
export const isAppUser = (req: PayloadRequest) => req.user?.collection === 'users'

export const appUserId = (req: PayloadRequest): string | null =>
  isAppUser(req) ? String(req.user!.id) : null

/** Relationship values can be an ID or a populated document. */
export const relId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object' && 'id' in (value as object)) return String((value as { id: unknown }).id)
  return String(value)
}

export const adminOnly: Access = ({ req }) => isAdmin(req)

export const signedIn: Access = ({ req }) => isAdmin(req) || isAppUser(req)

/** Admins see everything; app users only documents where `field` is themselves. */
export const ownedBy =
  (field: string): Access =>
  ({ req }) => {
    if (isAdmin(req)) return true
    const id = appUserId(req)
    return id ? { [field]: { equals: id } } : false
  }

/** Field-level: only the document's owner (or an admin) may read this field. */
export const ownerOnlyField =
  (ownerField: string): FieldAccess =>
  ({ req, doc }) => {
    if (isAdmin(req)) return true
    const id = appUserId(req)
    return Boolean(id && doc && relId(doc[ownerField]) === id)
  }

/** Field-level: value is set by the server; nobody but admins may write it. */
export const serverOwnedField: FieldAccess = ({ req }) => isAdmin(req)
