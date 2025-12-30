
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { categoryIcons } from '@/lib/placeholder-data';
import type { CategoryName, Transaction } from '@/types';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useFormulaInput } from '@/hooks/use-formula-input';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../ui/toggle-group"

const formSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: 'You need to select a transaction type.',
  }),
  amount: z.coerce.number().positive('Amount must be positive.'),
  description: z.string().min(2, {
    message: 'Description must be at least 2 characters.',
  }),
  category: z.string({
    required_error: 'Please select a category.',
  }),
  date: z.string().min(1, 'A date is required.'),
});

type AddTransactionDialogProps = {
  transaction: Partial<Transaction> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddTransactionDialog({ transaction, open, onOpenChange }: AddTransactionDialogProps) {
  const { firestore, sharedUserId } = useSharedUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const amountFormula = useFormulaInput({
    onCalculate: (value) => {
      form.setValue('amount', value);
    },
    initialValue: transaction?.amount || '',
  });

  const transactionType = form.watch('type');
  const isEditing = !!transaction?.id;

  useEffect(() => {
    if (open) { // Reset form only when dialog opens
      if (transaction) {
        form.reset({
          type: transaction.type || 'expense',
          description: transaction.description || '',
          amount: transaction.amount || undefined,
          category: transaction.category || '',
          date: transaction.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        });
        amountFormula.reset(transaction.amount || '');
      } else {
          form.reset({
              type: 'expense',
              description: '',
              amount: undefined,
              category: undefined,
              date: format(new Date(), 'yyyy-MM-dd'),
          });
          amountFormula.reset('');
      }
    }
  }, [transaction, open, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!sharedUserId || !firestore) return;

    const transactionData = {
        userId: sharedUserId,
        amount: values.amount,
        description: values.description,
        category: values.category as CategoryName,
        type: values.type,
        date: new Date(values.date).toISOString(),
    }

    if (isEditing) {
        const docRef = doc(firestore, 'users', sharedUserId, 'transactions', transaction.id!);
        updateDocumentNonBlocking(docRef, transactionData);
        toast({ title: 'Success', description: 'Transaction updated successfully.' });
    } else {
        addDocumentNonBlocking(
            collection(firestore, 'users', sharedUserId, 'transactions'),
            transactionData
        );
        toast({ title: 'Success', description: 'Transaction added successfully.' });
    }

    onOpenChange(false);
  }

  const incomeCategories: CategoryName[] = ['Salary', 'Refunds', 'Other Income'];
  const categories = useMemo(() => {
    const allCategories = Object.keys(categoryIcons) as CategoryName[];
    if (transactionType === 'income') {
      return allCategories.filter(c => incomeCategories.includes(c));
    }
    // For expenses, return all categories except the income ones
    return allCategories.filter(c => !incomeCategories.includes(c));
  }, [transactionType]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Transaction': 'Add Transaction'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details of your transaction.' : 'Add a new income or expense to your account.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-semibold">Transaction Type</FormLabel>
                    <FormControl>
                    <ToggleGroup 
                      type='single'
                      onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('category', '');
                      }}
                      value={field.value}
                      className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg"
                      disabled={isEditing}
                    >
                      <ToggleGroupItem 
                      value="income" 
                      className="data-[state=on]:bg-green-500 data-[state=on]:text-white rounded-md py-2"
                      >
                      <span className="font-medium">Income</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                      value="expense"
                      className="data-[state=on]:bg-red-500 data-[state=on]:text-white rounded-md py-2"
                      >
                      <span className="font-medium">Expense</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Amount</FormLabel>
                      <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                        <Input 
                        placeholder="100 or =50*2" 
                        value={amountFormula.displayValue}
                        onChange={(e) => amountFormula.handleChange(e.target.value)}
                        onBlur={amountFormula.handleBlur}
                        className={cn(
                          "h-10 pl-7",
                          amountFormula.isCalculating && "pr-9 border-primary/50 bg-primary/5",
                          amountFormula.error && "border-destructive"
                        )}
                        />
                        {amountFormula.isCalculating && (
                        <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-pulse" />
                        )}
                      </div>
                      </FormControl>
                      {amountFormula.error && (
                      <p className="text-xs text-destructive mt-1">{amountFormula.error}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Date</FormLabel>
                      <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="h-10 block w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Category</FormLabel>
                    <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    >
                    <FormControl>
                      <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => {
                      const CategoryIcon = categoryIcons[category];
                      return (
                        <SelectItem key={category} value={category} className="cursor-pointer">
                          <div className='flex items-center gap-2'>
                            {CategoryIcon && <CategoryIcon className="h-4 w-4 text-muted-foreground" />}
                            <span>{category}</span>
                          </div>
                        </SelectItem>
                      );
                      })}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                    <Input 
                      placeholder="e.g. Coffee, Salary" 
                      {...field}
                      className="h-10"
                    />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full sm:w-auto min-w-[120px]">
                  {isEditing ? 'Save Changes' : 'Add Transaction'}
                  </Button>
                </DialogFooter>
                </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
