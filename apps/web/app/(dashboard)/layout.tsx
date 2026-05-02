import { requireAuth } from '@/lib/auth-helpers'
import Link from 'next/link'
import { signOut } from '@/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <p className="font-semibold text-sm truncate">FB Auto-Publish</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {session.user.email}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/posts"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
          >
            Bài viết
          </Link>
          <Link
            href="/dashboard/posts/new"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
          >
            + Tạo bài viết
          </Link>
          {isSuperAdmin && (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="p-3 border-t">
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
