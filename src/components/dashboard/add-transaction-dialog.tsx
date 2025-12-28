
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Transaction Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('category', ''); // Reset category on type change
                      }}
                      defaultValue={field.value}
                      className="flex space-x-4"
                      disabled={isEditing}
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">Income</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">Expense</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Coffee, Salary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="₹100 or =50*2" 
                            value={amountFormula.displayValue}
                            onChange={(e) => amountFormula.handleChange(e.target.value)}
                            onBlur={amountFormula.handleBlur}
                            className={cn(
                              amountFormula.isCalculating && "pl-9 border-primary/50 bg-primary/5",
                              amountFormula.error && "border-destructive"
                            )}
                          />
                          {amountFormula.isCalculating && (
                            <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                          )}
                        </div>
                    </FormControl>
                    {amountFormula.error && (
                      <p className="text-xs text-destructive">{amountFormula.error}</p>
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
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="block w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
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
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => {
                        const CategoryIcon = categoryIcons[category];
                        return (
                            <SelectItem key={category} value={category}>
                                <div className='flex items-center gap-2'>
                                    {CategoryIcon && <CategoryIcon className="h-4 w-4" />}
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

            <DialogFooter>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Add Transaction'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
