
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
    
  return (
    <div className={cn(`flex items-center gap-2 text-base font-semibold tracking-tight`, className)}>
      <div className="rounded-lg bg-primary p-1.5">
        <Wallet className="h-4.5 w-4.5 text-primary-foreground" />
      </div>
      <span className={cn("hidden font-headline text-foreground md:inline-block whitespace-nowrap")}>Personal Expense</span>
    </div>
  );
}
