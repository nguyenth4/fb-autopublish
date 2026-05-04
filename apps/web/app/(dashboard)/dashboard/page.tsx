import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@packages/database/prisma'
import { PostStatus } from '@prisma/client'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RecentPostsTable } from '@/components/dashboard/recent-posts-table'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

async function DashboardStatsData({ userId, isSuperAdmin }: { userId: string, isSuperAdmin: boolean }) {
  const pageFilter = isSuperAdmin
    ? {}
    : { page: { userAccesses: { some: { userId } } } }

  // Tối ưu DB: Gom 4 lệnh đếm riêng lẻ thành 1 lệnh GroupBy duy nhất
  const counts = await prisma.post.groupBy({
    by: ['status'],
    where: pageFilter,
    _count: {
      status: true,
    },
  })

  const stats = {
    pending: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  }

  counts.forEach((c) => {
    if (c.status === PostStatus.DRAFT) stats.pending = c._count.status
    if (c.status === PostStatus.SCHEDULED) stats.scheduled = c._count.status
    if (c.status === PostStatus.PUBLISHED) stats.published = c._count.status
    if (c.status === PostStatus.FAILED) stats.failed = c._count.status
  })

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatsCard label="Chờ đăng" value={stats.pending} variant="neutral" />
      <StatsCard label="Đã lên lịch" value={stats.scheduled} variant="info" />
      <StatsCard label="Đã đăng" value={stats.published} variant="success" />
      <StatsCard label="Thất bại" value={stats.failed} variant="danger" />
    </div>
  )
}

async function RecentPostsData({ userId, isSuperAdmin }: { userId: string, isSuperAdmin: boolean }) {
  const posts = await prisma.post.findMany({
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

  return <RecentPostsTable posts={posts} />
}

export default async function DashboardPage() {
  const session = await requireAuth()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-medium">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xin chào, {session.user.name ?? session.user.email}
        </p>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      }>
        <DashboardStatsData userId={session.user.id} isSuperAdmin={isSuperAdmin} />
      </Suspense>

      <Suspense fallback={
        <div className="w-full h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse mt-8 flex items-center justify-center">
          <span className="text-slate-400">Đang tải danh sách bài viết...</span>
        </div>
      }>
        <RecentPostsData userId={session.user.id} isSuperAdmin={isSuperAdmin} />
      </Suspense>
    </div>
  )
}
