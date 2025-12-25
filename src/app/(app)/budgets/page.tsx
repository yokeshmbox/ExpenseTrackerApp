
'use client';

import { useState, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Edit, PlusCircle, Target, Trash2 } from 'lucide-react';
import { BudgetFormDialog } from '@/components/budgets/budget-form-dialog';
import { useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import { collection, doc, query } from 'firebase/firestore';
import type { Budget, Transaction } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { categoryIcons } from '@/lib/placeholder-data';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function BudgetCard({
  budget,
  spent,
  isLoading,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  spent: number;
  isLoading?: boolean;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}) {
  const CategoryIcon = categoryIcons[budget.category];
  const progress = (spent / budget.limit) * 100;
  const remaining = budget.limit - spent;
  
  const getGradient = () => {
    if (progress >= 100) return 'from-rose-500/5 to-red-500/5';
    if (progress >= 80) return 'from-amber-500/5 to-orange-500/5';
    return 'from-emerald-500/5 to-green-500/5';
  };
  
  const getIconColor = () => {
    if (progress >= 100) return 'bg-rose-500/10 text-rose-700 dark:text-rose-400';
    if (progress >= 80) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg",
      `bg-gradient-to-br ${getGradient()}`
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/3 rounded-full blur-3xl -mr-16 -mt-16" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl backdrop-blur-sm", getIconColor())}>
              {CategoryIcon && <CategoryIcon className="h-5 w-5" strokeWidth={2.5} />}
            </div>
            <CardTitle className="text-xl font-bold">{budget.category}</CardTitle>
          </div>
           <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(budget)} className="h-8 w-8 hover:bg-white/20">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(budget)} className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
        <CardDescription className="mt-1">
          Monthly budget for {budget.category}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 relative">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-3xl font-bold tracking-tight",
            progress >= 100 ? "text-rose-800 dark:text-rose-300" : 
            progress >= 80 ? "text-amber-800 dark:text-amber-300" : 
            "text-emerald-800 dark:text-emerald-300"
          )}>
            {spent.toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 0,
            })}
          </span>
          <span className="text-sm text-foreground/60">
            spent of{' '}
            {budget.limit.toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 0,
            })}
          </span>
        </div>
        <Progress value={progress} className="h-2.5" />
        <p
          className={cn(
            "text-sm font-medium",
            remaining < 0 ? 'text-rose-800 dark:text-rose-300' : 
            progress >= 80 ? 'text-amber-800 dark:text-amber-300' : 
            'text-emerald-800 dark:text-emerald-300'
          )}
        >
          {remaining >= 0
            ? `${remaining.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })} left`
            : `${Math.abs(remaining).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })} over`}
        </p>
      </CardContent>
    </Card>
  );
}

export default function BudgetsPage() {
  const [editingBudget, setEditingBudget] = useState<Partial<Budget> | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const { firestore, sharedUserId } = useSharedUser();
  const { toast } = useToast();

  const budgetsQuery = useMemoFirebase(
    () => (sharedUserId && firestore ? query(collection(firestore, 'users', sharedUserId, 'budgets')) : null),
    [firestore, sharedUserId]
  );
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  const transactionsQuery = useMemoFirebase(
    () => (sharedUserId && firestore ? query(collection(firestore, 'users', sharedUserId, 'transactions')) : null),
    [firestore, sharedUserId]
  );
  const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const monthlySpendingByCategory = useMemo(() => {
    if (!transactions) return {};
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.reduce((acc, t) => {
      const transactionDate = new Date(t.date);
      if (
        t.type === 'expense' &&
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      ) {
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += t.amount;
      }
      return acc;
    }, {} as { [key: string]: number });
  }, [transactions]);
  
  const handleDelete = async () => {
    if (!deletingBudget || !sharedUserId || !firestore) return;
    const docRef = doc(firestore, 'users', sharedUserId, 'budgets', deletingBudget.id);
    deleteDocumentNonBlocking(docRef);
    toast({
        title: 'Budget Deleted',
        description: `The budget for "${deletingBudget.category}" has been removed.`,
    });
    setDeletingBudget(null);
  }

  const isLoading = budgetsLoading || transactionsLoading;

  return (
    <div className="grid gap-6 md:gap-8 pb-8">
      <BudgetFormDialog 
        budget={editingBudget}
        open={editingBudget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBudget(null);
          }
        }}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
            <Target className="h-8 w-8" />
            Budgets
          </h1>
          <p className="text-muted-foreground mt-1">
            Set and manage your monthly spending limits.
          </p>
        </div>
        <Button 
          onClick={() => setEditingBudget({})} 
          className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300"
          size="lg"
        >
          <PlusCircle className="mr-2" />
          Add Budget
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <BudgetCard key={i} budget={{id: '', userId: '', category: 'Food', limit: 0}} spent={0} onEdit={() => {}} onDelete={() => {}} isLoading />
        ))}
        {!isLoading && budgets && budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            spent={monthlySpendingByCategory[budget.category] || 0}
            onEdit={setEditingBudget}
            onDelete={setDeletingBudget}
          />
        ))}
      </div>

      {!isLoading && (!budgets || budgets.length === 0) && (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>No Budgets Yet</CardTitle>
                <CardDescription>Get started by creating your first budget.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => setEditingBudget({})}>
                    <PlusCircle className="mr-2" />
                    Create Budget
                </Button>
            </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deletingBudget} onOpenChange={(open) => !open && setDeletingBudget(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the budget for &quot;{deletingBudget?.category}&quot;. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({variant: 'destructive'}))}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
