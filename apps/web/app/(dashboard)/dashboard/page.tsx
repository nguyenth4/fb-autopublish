import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@packages/database/prisma'
import { PostStatus } from '@prisma/client'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RecentPostsTable } from '@/components/dashboard/recent-posts-table'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

async function getDashboardStats(userId: string, isSuperAdmin: boolean) {
  const pageFilter = isSuperAdmin
    ? {}
    : { page: { userAccesses: { some: { userId } } } }

  const [pending, scheduled, published, failed] = await Promise.all([
    prisma.post.count({ where: { status: PostStatus.DRAFT, ...pageFilter } }),
    prisma.post.count({ where: { status: PostStatus.SCHEDULED, ...pageFilter } }),
    prisma.post.count({ where: { status: PostStatus.PUBLISHED, ...pageFilter } }),
    prisma.post.count({ where: { status: PostStatus.FAILED, ...pageFilter } }),
  ])

  return { pending, scheduled, published, failed }
}

async function getRecentPosts(userId: string, isSuperAdmin: boolean) {
  return prisma.post.findMany({
    where: isSuperAdmin ? {} : { page: { userAccesses: { some: { userId } } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      message: true,
      status: true,
      scheduledAt: true,
      publishedAt: true,
      createdAt: true,
      page: { select: { name: true, pictureUrl: true } },
      jobLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { errorCode: true, errorMessage: true },
      },
    },
  })
}

export default async function DashboardPage() {
  const session = await requireAuth()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  const [stats, recentPosts] = await Promise.all([
    getDashboardStats(session.user.id, isSuperAdmin),
    getRecentPosts(session.user.id, isSuperAdmin),
  ])

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-medium">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xin chào, {session.user.name ?? session.user.email}
        </p>
      </div>

      <Suspense fallback={<div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatsCard label="Chờ đăng" value={stats.pending} variant="neutral" />
          <StatsCard label="Đã lên lịch" value={stats.scheduled} variant="info" />
          <StatsCard label="Đã đăng" value={stats.published} variant="success" />
          <StatsCard label="Thất bại" value={stats.failed} variant="danger" />
        </div>
      </Suspense>

      <RecentPostsTable posts={recentPosts} />
    </div>
  )
}
