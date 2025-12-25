import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

type KpiCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  details?: string;
  className?: string;
  isLoading?: boolean;
  gradient?: string;
  iconBgColor?: string;
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  details,
  className,
  isLoading,
  gradient = 'from-blue-500/10 to-cyan-500/10',
  iconBgColor = 'bg-blue-500/10 text-blue-600',
}: KpiCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg",
      `bg-gradient-to-br ${gradient}`
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/3 rounded-full blur-3xl -mr-16 -mt-16" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-semibold text-foreground/80">{title}</CardTitle>
        <div className={cn(
          "p-2.5 rounded-xl backdrop-blur-sm transition-transform duration-300 hover:scale-110",
          iconBgColor
        )}>
          <Icon className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        {isLoading ? (
            <>
                <Skeleton className="h-9 w-32 mt-1 bg-white/20" />
                <Skeleton className="h-4 w-40 mt-2 bg-white/20" />
            </>
        ) : (
            <>
                <div className={cn('text-3xl font-bold tracking-tight', className)}>{value}</div>
                {details && <p className="text-xs text-foreground/60 mt-1.5">{details}</p>}
            </>
        )}
      </CardContent>
    </Card>
  );
}
