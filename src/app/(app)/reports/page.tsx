
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { BarChart, IndianRupee, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react';
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
import type { Transaction } from '@/types';
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

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

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
    if (!transactions) return { income: 0, expenses: 0, totalInvestments: 0, categorySpending: [] };
    
    const dataToFilter = transactions.filter(t => {
        if (selectedMonth === 'all') return true;
        return format(new Date(t.date), 'yyyy-MM') === selectedMonth;
    });

    let income = 0;
    let expenses = 0;
    let totalInvestments = 0;
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
    };
  }, [transactions, selectedMonth]);

  const { income, expenses, totalInvestments, categorySpending } = filteredData;
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
