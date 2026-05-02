import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 p-8 bg-background rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Facebook Page Auto-Publishing
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
