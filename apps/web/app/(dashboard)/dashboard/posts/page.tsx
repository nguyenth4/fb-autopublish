import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@packages/database/prisma'
import { RecentPostsTable } from '@/components/dashboard/recent-posts-table'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PostsPage() {
  const session = await requireAuth()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  const posts = await prisma.post.findMany({
    where: isSuperAdmin ? {} : { page: { userAccesses: { some: { userId: session.user.id } } } },
    orderBy: { createdAt: 'desc' },
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

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản lý bài viết</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Xem lịch sử và trạng thái tất cả các bài viết của bạn
          </p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tạo bài viết mới
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 p-6">
        {posts.length > 0 ? (
          <RecentPostsTable posts={posts} />
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Chưa có bài viết nào</h3>
            <p className="mt-2 text-sm text-slate-500">Bắt đầu bằng cách tạo bài viết mới ngay bây giờ.</p>
          </div>
        )}
      </div>
    </div>
  )
}
