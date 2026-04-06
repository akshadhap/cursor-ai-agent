import { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import  {SpinnerCustom}  from "@/components/spinner"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: string
    positive: boolean
  }
  loading?: boolean
}

export function StatsCard({ title, value, icon: Icon, description, trend, loading }: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3  via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-7 w-7 text-gray-500" />
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold">{loading ? <SpinnerCustom /> : value}</div>
        {description && (
          <p className={`text-xs text-muted-foreground mt-1 ${description.toLowerCase().includes('latency') ? 'text-right w-full block' : ''}`}>{description}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 font-medium text-right flex items-center justify-end gap-1 ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {typeof trend.value === 'string' && trend.value.toLowerCase() === 'live now' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
