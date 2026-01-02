
'use client';

import * as React from 'react';
import ReactECharts from 'echarts-for-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { PieChart } from 'lucide-react';

type CategoryDonutChartProps = {
  data: { name: string; value: number }[];
  isLoading?: boolean;
};

// Hardcoded color palette for guaranteed reliability.
const CHART_COLORS = [
  '#5070dd',
  '#b6d634',
  '#505372',
  '#ff994d',
  '#0ca8df',
  '#ffd10a',
  '#fb628b',
  '#785db0',
  '#3fbe95',
];

export function CategoryDonutChart({ data, isLoading }: CategoryDonutChartProps) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Limit to top 14 categories to avoid overlap
  const topCategories = React.useMemo(() => {
    if (data.length <= 14) return data;
    
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const top13 = sorted.slice(0, 13);
    const others = sorted.slice(13);
    
    if (others.length > 0) {
      const othersTotal = others.reduce((sum, cat) => sum + cat.value, 0);
      return [...top13, { name: 'Others', value: othersTotal }];
    }
    
    return top13;
  }, [data]);

  const chartOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ₹{c} ({d}%)',
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      top: 0,
      left: 'center',
      textStyle: {
        color: 'hsl(var(--foreground))',
        fontSize: 11,
      },
      pageIconSize: 10,
      pageTextStyle: {
        color: 'hsl(var(--foreground))',
      },
      formatter: function (name: string) {
        return name.length > 12 ? name.substring(0, 12) + '...' : name;
      },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 8,
    },
    color: CHART_COLORS,
    series: [
      {
        name: 'Spending',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '55%'],
        avoidLabelOverlap: true,
        padAngle: 3,
        itemStyle: {
          borderRadius: 8,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            formatter: '{b}\n{d}%',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        labelLine: {
          show: false,
        },
        data: topCategories,
      },
    ],
  };

  return (
    <>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl font-bold">Spending Breakdown</CardTitle>
        <CardDescription>
          Spending distribution for the current month.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center p-0 pb-4">
        {isLoading || !isClient ? (
            <Skeleton className="h-[280px] w-full" />
        ) : data.length > 0 ? (
          <ReactECharts
            option={chartOption}
            style={{ height: '280px', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full text-center text-muted-foreground gap-2">
            <PieChart className="h-12 w-12" />
            <p className='font-medium'>No spending data yet.</p>
            <p className='text-sm'>Add an expense to see your spending breakdown.</p>
          </div>
        )}
      </CardContent>
    </>
  );
}
