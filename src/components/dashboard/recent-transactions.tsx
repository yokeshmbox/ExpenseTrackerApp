import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/types';
import { categoryIcons } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

type RecentTransactionsProps = {
  transactions: Transaction[];
  isLoading?: boolean;
};

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  return (
    <>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Transactions
        </CardTitle>
        <CardDescription>
          A log of your recent income and expenses.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="hidden sm:table-cell font-semibold">Category</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Date</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : transactions.length > 0 ? (
                transactions.map((transaction) => {
                const CategoryIcon = categoryIcons[transaction.category];
                return (
                    <TableRow 
                      key={transaction.id}
                      className="group hover:bg-muted/30 transition-all duration-200"
                    >
                    <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full transition-all duration-200 group-hover:scale-110",
                          transaction.type === 'income' 
                            ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20" 
                            : "bg-gradient-to-br from-rose-500/20 to-rose-600/20"
                        )}>
                          {transaction.type === 'income' ? (
                            <ArrowUpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {transaction.description}
                          </span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {new Date(transaction.date).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </span>
                        </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-4">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
                          "bg-background/50"
                        )}>
                        {CategoryIcon && <CategoryIcon className="h-4 w-4" />}
                        {transaction.category}
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground py-4">
                        {new Date(transaction.date).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                    </TableCell>
                    <TableCell
                        className={cn(
                        'text-right font-bold text-base py-4',
                        transaction.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                    >
                        {transaction.type === 'income' ? '+' : '-'}
                        {transaction.amount.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        })}
                    </TableCell>
                    </TableRow>
                );
                })
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Activity className="h-8 w-8" />
                            <p className="font-medium">No transactions yet</p>
                            <p className="text-sm">Start by adding a new transaction.</p>
                        </div>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </>
  );
}
