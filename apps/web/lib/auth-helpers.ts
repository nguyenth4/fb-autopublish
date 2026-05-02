import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

export async function requireRole(role: Role) {
  const session = await requireAuth()
  if (session.user.role !== role) redirect('/dashboard?error=forbidden')
  return session
}

/** Use in Server Actions — returns null instead of redirecting */
export async function getAuthSession() {
  return auth()
}
