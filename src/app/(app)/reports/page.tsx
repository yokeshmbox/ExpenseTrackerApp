
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, subMonths, parseISO } from 'date-fns';
import { BarChart, IndianRupee, TrendingDown, TrendingUp, PiggyBank, FileText, ShoppingCart, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCollection, useMemoFirebase } from '@/firebase';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Transaction, RecurringPayment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  LabelList,
  Cell,
  Text,
  Line,
  LineChart,
  Area,
  AreaChart,
} from 'recharts';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#5070dd',
  '#b6d634',
  '#505372',
  '#ff994d',
  '#0ca8df',
];

const CustomizedAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const maxChars = 10; // Max characters per line
  const value = payload.value;

  if (value.length > maxChars) {
    const words = value.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
        if ((line + word).length > maxChars) {
            lines.push(line.trim());
            line = '';
        }
        line += word + ' ';
    }
    lines.push(line.trim());

    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line, index) => (
           <text key={index} x={0} y={0} dy={index * 12 + 10} textAnchor="middle" fill="#666" fontSize="12px">
            {line}
          </text>
        ))}
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize="12px">
        {value}
      </text>
    </g>
  );
};


export default function ReportsPage() {
  const { firestore, sharedUserId } = useSharedUser();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const transactionsQuery = useMemoFirebase(
    () => (sharedUserId && firestore ? query(collection(firestore, 'users', sharedUserId, 'transactions'), orderBy('date', 'desc')) : null),
    [firestore, sharedUserId]
  );

  const billsQuery = useMemoFirebase(
    () => (sharedUserId && firestore ? query(collection(firestore, 'users', sharedUserId, 'recurringPayments')) : null),
    [firestore, sharedUserId]
  );

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);
  const { data: bills } = useCollection<RecurringPayment>(billsQuery);

  const availableMonths = useMemo(() => {
    if (!transactions) return [];
    const months = new Set<string>();
    transactions.forEach((t) => {
      months.add(format(new Date(t.date), 'yyyy-MM'));
    });
    return Array.from(months).map(monthStr => {
        const date = new Date(monthStr + '-02'); // Use day 2 to avoid timezone issues
        return {
            value: monthStr,
            label: format(date, 'MMMM - yyyy')
        }
    });
  }, [transactions]);
  
  useEffect(() => {
    // Set default month only on initial load when months become available
    if (availableMonths.length > 0 && selectedMonth === 'all' && !sessionStorage.getItem('reports-month-selected')) {
      const currentMonthValue = format(new Date(), 'yyyy-MM');
      if (availableMonths.some(m => m.value === currentMonthValue)) {
        setSelectedMonth(currentMonthValue);
      } else if (availableMonths[0]) {
        // If current month not available, default to the most recent one.
        setSelectedMonth(availableMonths[0].value);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMonths]);

  const handleMonthChange = (value: string) => {
    if (value !== 'all') {
      sessionStorage.setItem('reports-month-selected', 'true');
    } else {
      sessionStorage.removeItem('reports-month-selected');
    }
    setSelectedMonth(value);
  }


  const filteredData = useMemo(() => {
    if (!transactions) return { income: 0, expenses: 0, totalInvestments: 0, categorySpending: [], monthlyMandates: 0, dailyExpenses: 0 };
    
    const dataToFilter = transactions.filter(t => {
        if (selectedMonth === 'all') return true;
        return format(new Date(t.date), 'yyyy-MM') === selectedMonth;
    });

    // Get bill transaction IDs for filtering
    const billTransactionIds = new Set(
      bills?.filter(bill => bill.transactionId).map(bill => bill.transactionId) || []
    );

    let income = 0;
    let expenses = 0;
    let totalInvestments = 0;
    let monthlyMandates = 0;
    let dailyExpenses = 0;
    const categoryMap: { [key: string]: number } = {};

    dataToFilter.forEach((t) => {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          // Add to category map for the chart/table
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
          
          // Separate investments from other expenses
          if (t.category === 'Investment') {
            totalInvestments += t.amount;
          } else {
            expenses += t.amount;
          }

          // Categorize as Monthly Mandates or Daily Expenses
          if (billTransactionIds.has(t.id)) {
            monthlyMandates += t.amount;
          } else {
            dailyExpenses += t.amount;
          }
        }
    });

    const categorySpending = Object.entries(categoryMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return {
      income,
      expenses,
      totalInvestments,
      categorySpending,
      monthlyMandates,
      dailyExpenses,
    };
  }, [transactions, selectedMonth, bills]);

  const { income, expenses, totalInvestments, categorySpending, monthlyMandates, dailyExpenses } = filteredData;

  // Calculate spending trends (last 6 months)
  const spendingTrends = useMemo(() => {
    if (!transactions || selectedMonth === 'all') return { monthlyTrends: [], comparison: null, categoryChanges: [] };

    // Get last 6 months including current selected month
    const currentDate = parseISO(selectedMonth + '-01');
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(currentDate, 5 - i);
      return format(monthDate, 'yyyy-MM');
    });

    // Calculate totals for each month
    const monthlyData = last6Months.map(monthStr => {
      const monthTransactions = transactions.filter(t => 
        format(new Date(t.date), 'yyyy-MM') === monthStr
      );

      let income = 0;
      let expenses = 0;
      const categoryMap: { [key: string]: number } = {};

      monthTransactions.forEach(t => {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expenses += t.amount;
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        }
      });

      return {
        month: monthStr,
        monthLabel: format(parseISO(monthStr + '-01'), 'MMM yyyy'),
        income,
        expenses,
        categories: categoryMap,
      };
    });

    // Compare current month with previous month
    const currentMonthData = monthlyData[monthlyData.length - 1];
    const previousMonthData = monthlyData[monthlyData.length - 2];

    const comparison = previousMonthData ? {
      currentExpenses: currentMonthData.expenses,
      previousExpenses: previousMonthData.expenses,
      change: currentMonthData.expenses - previousMonthData.expenses,
      percentChange: previousMonthData.expenses > 0 
        ? ((currentMonthData.expenses - previousMonthData.expenses) / previousMonthData.expenses) * 100 
        : 0,
    } : null;

    // Category-level changes
    const categoryChanges = comparison ? Object.keys({
      ...currentMonthData.categories,
      ...previousMonthData.categories,
    }).map(category => {
      const current = currentMonthData.categories[category] || 0;
      const previous = previousMonthData.categories[category] || 0;
      const change = current - previous;
      const percentChange = previous > 0 ? (change / previous) * 100 : 0;

      return {
        category,
        current,
        previous,
        change,
        percentChange,
      };
    }).filter(c => c.current > 0 || c.previous > 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5) : [];

    return {
      monthlyTrends: monthlyData,
      comparison,
      categoryChanges,
    };
  }, [transactions, selectedMonth]);
  const chartData = categorySpending.slice(0, 10); // Top 10 categories

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <BarChart className="h-7 w-7" />
            Reports
          </h1>
          <p className="text-muted-foreground">
            Analyze your financial data over specific periods.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Select a month" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title="Total Income"
          value={income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          icon={TrendingUp}
          details={`For the selected period`}
          gradient="from-emerald-500/5 to-green-500/5"
          iconBgColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Expenses"
          value={expenses.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          icon={TrendingDown}
          details={`For the selected period`}
          gradient="from-rose-500/5 to-red-500/5"
          iconBgColor="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          isLoading={isLoading}
        />
        <KpiCard
          title="Total Investments"
          value={totalInvestments.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          icon={PiggyBank}
          details={`Total investments this period`}
          gradient="from-blue-500/5 to-cyan-500/5"
          iconBgColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          isLoading={isLoading}
        />
      </div>

      {/* Expense Breakdown Section */}
      <Card className="border-none shadow-md bg-gradient-to-br from-background via-background to-muted/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IndianRupee className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Monthly Mandates */}
            <div className="group relative overflow-hidden rounded-xl border border-violet-200/50 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/50 via-violet-50/30 to-background dark:from-violet-950/20 dark:via-violet-950/10 dark:to-background p-4 transition-all hover:shadow-lg hover:border-violet-300/60 dark:hover:border-violet-700/60">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl -z-10" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Monthly Mandates</p>
                  </div>
                  <div className="mt-3">
                    {isLoading ? (
                      <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
                    ) : (
                      <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                        {monthlyMandates.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Recurring bill payments and Investments
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Expenses */}
            <div className="group relative overflow-hidden rounded-xl border border-amber-200/50 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/50 via-amber-50/30 to-background dark:from-amber-950/20 dark:via-amber-950/10 dark:to-background p-4 transition-all hover:shadow-lg hover:border-amber-300/60 dark:hover:border-amber-700/60">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -z-10" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Daily Expenses</p>
                  </div>
                  <div className="mt-3">
                    {isLoading ? (
                      <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
                    ) : (
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                        {dailyExpenses.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Daily spendings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spending Trends Section */}
      {selectedMonth !== 'all' && spendingTrends.comparison && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Spending Trends & Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Month Comparison Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Current Month */}
              <div className="rounded-lg border bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20 dark:to-background p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  This Month
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {spendingTrends.comparison.currentExpenses.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                  })}
                </p>
              </div>

              {/* Previous Month */}
              <div className="rounded-lg border bg-gradient-to-br from-slate-50/50 to-background dark:from-slate-950/20 dark:to-background p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Last Month
                </p>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-400">
                  {spendingTrends.comparison.previousExpenses.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                  })}
                </p>
              </div>

              {/* Change */}
              <div className={`rounded-lg border p-4 ${
                spendingTrends.comparison.change > 0
                  ? 'bg-gradient-to-br from-rose-50/50 to-background dark:from-rose-950/20 dark:to-background border-rose-200/50 dark:border-rose-800/50'
                  : spendingTrends.comparison.change < 0
                  ? 'bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background border-emerald-200/50 dark:border-emerald-800/50'
                  : 'bg-gradient-to-br from-slate-50/50 to-background dark:from-slate-950/20 dark:to-background'
              }`}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Change
                </p>
                <div className="flex items-center gap-2">
                  {spendingTrends.comparison.change > 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  ) : spendingTrends.comparison.change < 0 ? (
                    <ArrowDownRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Minus className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  )}
                  <div>
                    <p className={`text-xl font-bold ${
                      spendingTrends.comparison.change > 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : spendingTrends.comparison.change < 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-400'
                    }`}>
                      {Math.abs(spendingTrends.comparison.percentChange).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {spendingTrends.comparison.change > 0 ? 'increase' : spendingTrends.comparison.change < 0 ? 'decrease' : 'no change'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6-Month Trend Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Last 6 Months Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={spendingTrends.monthlyTrends}>
                  <defs>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="monthLabel" 
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: '0.75rem' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${Number(value) / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: '0.75rem' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md">
                            <p className="text-xs text-muted-foreground mb-1">
                              {payload[0].payload.monthLabel}
                            </p>
                            <p className="text-sm font-bold">
                              Expenses: {Number(payload[0].value).toLocaleString('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                minimumFractionDigits: 0,
                              })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#colorExpenses)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category Changes */}
            {spendingTrends.categoryChanges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Top Category Changes</h3>
                <div className="space-y-2">
                  {spendingTrends.categoryChanges.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{cat.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.previous.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}
                          {' → '}
                          {cat.current.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cat.change > 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <div className="text-right">
                          <p className={`text-sm font-bold ${
                            cat.change > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {cat.change > 0 ? '+' : ''}{Math.abs(cat.percentChange).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cat.change > 0 ? '+' : ''}{cat.change.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({length: 5}).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded-md" /></TableCell>
                          <TableCell className="text-right"><div className="h-5 w-16 bg-muted animate-pulse rounded-md ml-auto" /></TableCell>
                      </TableRow>
                  ))}
                  {!isLoading && categorySpending.map(cat => (
                    <TableRow key={cat.name}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right">
                        {cat.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && categorySpending.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">No expenses in this period.</TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Expenses Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <RechartsBarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  type="category" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={<CustomizedAxisTick />}
                  interval={0}
                />
                <YAxis 
                  type="number" 
                  tickFormatter={(value) => `₹${Number(value) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  style={{ fontSize: '0.75rem' }}
                />
                 <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {payload[0].payload.name}
                              </span>
                              <span className="font-bold text-foreground">
                                {payload[0].value?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} >
                   {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                   <LabelList 
                    dataKey="total" 
                    position="top" 
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  />
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
