import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '4s' }}></div>

      <div className="relative z-10 w-full max-w-5xl mx-4 overflow-hidden rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 shadow-2xl flex shadow-slate-950/50 animate-fade-in">
        
        {/* Left Side: Branding/Visuals */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 p-12 flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-lg mb-8">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
              Tự động hoá <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">mạng xã hội</span> của bạn.
            </h1>
            <p className="mt-4 text-indigo-100/80 text-lg max-w-sm">
              Hệ thống Facebook Page Auto-Publishing giúp bạn tiết kiệm hàng trăm giờ quản lý nội dung mỗi tháng.
            </p>
          </div>
          
          <div className="relative z-10">
            <div className="flex -space-x-4">
              <img className="w-10 h-10 rounded-full border-2 border-indigo-500" src="https://i.pravatar.cc/100?img=1" alt="User" />
              <img className="w-10 h-10 rounded-full border-2 border-indigo-500" src="https://i.pravatar.cc/100?img=2" alt="User" />
              <img className="w-10 h-10 rounded-full border-2 border-indigo-500" src="https://i.pravatar.cc/100?img=3" alt="User" />
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 bg-slate-900 flex items-center justify-center text-xs font-medium text-white">+99</div>
            </div>
            <p className="mt-3 text-sm text-indigo-100/60 font-medium">Được tin dùng bởi hàng trăm doanh nghiệp</p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 xl:p-16 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-white tracking-tight">Chào mừng trở lại</h2>
              <p className="text-slate-400 text-sm">
                Đăng nhập vào tài khoản của bạn để tiếp tục
              </p>
            </div>
            
            <Suspense fallback={
              <div className="h-40 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">Đang tải biểu mẫu...</p>
              </div>
            }>
              <LoginForm />
            </Suspense>

            <p className="text-center text-xs text-slate-500">
              Bằng việc đăng nhập, bạn đồng ý với <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Điều khoản sử dụng</a> và <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Chính sách bảo mật</a> của chúng tôi.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
