'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';

export const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(160 84% 39%)',
  },
  expenses: {
    label: 'Expenses',
    color: 'hsl(0 84% 60%)',
  },
} satisfies ChartConfig;

type IncomeExpensesChartProps = {
  data: { month: string; income: number; expenses: number }[];
  isLoading?: boolean;
};

export function IncomeExpensesChart({ data, isLoading }: IncomeExpensesChartProps) {
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

  return (
    <>
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg font-semibold">Income vs. Expenses</CardTitle>
        <CardDescription className="text-sm">
          Financial flow over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex items-center justify-center">
        {isLoading || !isClient ? (
            <Skeleton className="h-[320px] w-full rounded-lg" />
        ) : (
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 0,
              right: 16,
              top: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fontSize: 12 }}
              width={60}
              tickFormatter={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
            />
            <ChartTooltip
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={<ChartTooltipContent indicator="line" labelKey="month" />}
            />
            <defs>
              <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-expenses)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-expenses)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="income"
              type="monotone"
              fill="url(#fillIncome)"
              fillOpacity={1}
              stroke="var(--color-income)"
              strokeWidth={2.5}
            />
            <Area
              dataKey="expenses"
              type="monotone"
              fill="url(#fillExpenses)"
              fillOpacity={1}
              stroke="var(--color-expenses)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </>
  );
}
