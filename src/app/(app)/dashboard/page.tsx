
'use client';

import {
  Activity,
  IndianRupee,
  CreditCard,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { IncomeExpensesChart } from '@/components/dashboard/income-expenses-chart';
import { CategoryDonutChart } from '@/components/dashboard/category-donut-chart';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Transaction } from '@/types';
import { useMemo, useState } from 'react';
import { AddTransactionDialog } from '@/components/dashboard/add-transaction-dialog';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';

export default function DashboardPage() {
  const { firestore, sharedUserId } = useSharedUser();
  const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);

  const transactionsQuery = useMemoFirebase(() => 
    sharedUserId && firestore ? query(collection(firestore, 'users', sharedUserId, 'transactions'), orderBy('date', 'desc')) : null
  , [firestore, sharedUserId]);

  const recentTransactionsQuery = useMemoFirebase(() =>
    sharedUserId && firestore ? query(collection(firestore, 'users', sharedUserId, 'transactions'), orderBy('date', 'desc'), limit(5)) : null
  , [firestore, sharedUserId]);

  const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);
  const { data: recentTransactions, isLoading: recentTransactionsLoading } = useCollection<Transaction>(recentTransactionsQuery);

  const { totalBalance, monthlySpending, totalIncome } = useMemo(() => {
    if (!transactions) {
      return { totalBalance: 0, monthlySpending: 0, totalIncome: 0 };
    }
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.reduce(
      (acc, transaction) => {
        const transactionDate = new Date(transaction.date);
        if (transaction.type === 'income') {
          acc.totalBalance += transaction.amount;
        } else {
          acc.totalBalance -= transaction.amount;
        }

        if (
          transaction.type === 'expense' &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        ) {
          acc.monthlySpending += transaction.amount;
        }
        
        if (
          transaction.type === 'income' &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        ) {
            acc.totalIncome += transaction.amount;
        }


        return acc;
      },
      { totalBalance: 0, monthlySpending: 0, totalIncome: 0 }
    );
  }, [transactions]);
  
  const categorySpending = useMemo(() => {
    if (!transactions) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const spending = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'expense' && transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
      })
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = { name: t.category, value: 0 };
        }
        acc[t.category].value += t.amount;
        return acc;
      }, {} as { [key: string]: { name: string; value: number } });

    return Object.values(spending);

  }, [transactions]);


  const incomeExpensesChartData = useMemo(() => {
    if (!transactions) return [];
  
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), income: 0, expenses: 0 };
    }).reverse();
  
    transactions.forEach(t => {
      const date = new Date(t.date);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      
      const monthData = last6Months.find(m => m.month === month && m.year === year);
      
      if (monthData) {
        if (t.type === 'income') {
          monthData.income += t.amount;
        } else {
          monthData.expenses += t.amount;
        }
      }
    });
  
    return last6Months.map(m => ({ month: m.month, income: m.income, expenses: m.expenses }));
  }, [transactions]);

  const isLoading = transactionsLoading || recentTransactionsLoading;

  return (
    <div className="grid gap-6 md:gap-8 pb-8">
      <AddTransactionDialog transaction={null} open={isAddTransactionOpen} onOpenChange={setAddTransactionOpen} />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Welcome back, Yokesh R!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your financial overview.
          </p>
        </div>
        <Button 
          onClick={() => setAddTransactionOpen(true)} 
          className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300"
          size="lg"
        >
          <PlusCircle className="mr-2" />
          Add Transaction
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Total Balance"
          value={(totalBalance ?? 0).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
          })}
          icon={IndianRupee}
          details="Your current account balance"
          isLoading={isLoading}
          gradient="from-violet-500/5 via-purple-500/5 to-indigo-500/5"
          iconBgColor="bg-violet-500/10 text-violet-700 dark:text-violet-400"
          className="text-violet-800 dark:text-violet-300"
        />
        <KpiCard
          title="Monthly Spending"
          value={(monthlySpending ?? 0).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
          })}
          icon={CreditCard}
          details="Total expenses this month"
          isLoading={isLoading}
          gradient="from-rose-500/5 via-pink-500/5 to-red-500/5"
          iconBgColor="bg-rose-500/10 text-rose-700 dark:text-rose-400"
          className="text-rose-800 dark:text-rose-300"
        />
        <KpiCard
          title="Monthly Income"
          value={(totalIncome ?? 0).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
          })}
          icon={TrendingUp}
          details="Total income this month"
          isLoading={isLoading}
          gradient="from-emerald-500/5 via-green-500/5 to-teal-500/5"
          iconBgColor="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          className="text-emerald-800 dark:text-emerald-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 flex">
            <div className="rounded-xl border bg-card shadow-sm p-6 transition-all duration-300 hover:shadow-md w-full flex flex-col">
              <IncomeExpensesChart data={incomeExpensesChartData} isLoading={isLoading} />
            </div>
        </div>
        <div className="lg:col-span-2 flex">
            <div className="rounded-xl border bg-card shadow-sm p-6 transition-all duration-300 hover:shadow-md w-full flex flex-col">
              <CategoryDonutChart data={categorySpending} isLoading={isLoading} />
            </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-6 transition-all duration-300 hover:shadow-md">
        <RecentTransactions transactions={recentTransactions || []} isLoading={recentTransactionsLoading} />
      </div>
    </div>
  );
}
