
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

  const chartOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ₹{c} ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      top: 'top',
      left: 'center',
      textStyle: {
        color: 'hsl(var(--foreground))',
      },
      // Ensure legend items can wrap if needed
      formatter: function (name: string) {
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
      }
    },
    color: CHART_COLORS,
    series: [
      {
        name: 'Spending',
        type: 'pie',
        radius: ['50%', '80%'],
        center: ['50%', '60%'], // Adjust center to make space for the top legend
        avoidLabelOverlap: false,
        padAngle: 5,
        itemStyle: {
          borderRadius: 10,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            formatter: '{b}',
          },
        },
        labelLine: {
          show: false,
        },
        data: data,
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
