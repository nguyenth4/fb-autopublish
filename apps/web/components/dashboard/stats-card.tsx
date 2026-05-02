import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: number
  variant: 'neutral' | 'info' | 'success' | 'danger'
}

const variantStyles = {
  neutral: 'bg-muted/50 border-border',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  success: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  danger: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
}

const valueStyles = {
  neutral: 'text-foreground',
  info: 'text-blue-700 dark:text-blue-300',
  success: 'text-green-700 dark:text-green-300',
  danger: 'text-red-700 dark:text-red-300',
}

export function StatsCard({ label, value, variant }: StatsCardProps) {
  return (
    <div className={cn('rounded-xl border p-5', variantStyles[variant])}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-2 text-3xl font-medium tabular-nums', valueStyles[variant])}>
        {value.toLocaleString('vi-VN')}
      </p>
    </div>
  )
}
