
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
import type { CategoryName, Budget } from '@/types';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

const formSchema = z.object({
  limit: z.coerce.number().positive('Limit must be a positive number.'),
  category: z.string({
    required_error: 'Please select a category.',
  }),
});

type BudgetFormDialogProps = {
  budget: Partial<Budget> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BudgetFormDialog({ budget, open, onOpenChange }: BudgetFormDialogProps) {
  const { firestore, sharedUserId } = useSharedUser();
  const { toast } = useToast();
  const isEditing = !!budget?.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (budget) {
        form.reset({
            limit: budget.limit || undefined,
            category: budget.category || '',
        });
    }
  }, [budget, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!sharedUserId || !firestore) return;

    const budgetData: Omit<Budget, 'id'> = {
      userId: sharedUserId,
      limit: values.limit,
      category: values.category as CategoryName,
    };
    
    if (isEditing) {
        const docRef = doc(firestore, 'users', sharedUserId, 'budgets', budget.id!);
        updateDocumentNonBlocking(docRef, budgetData);
        toast({ title: 'Success', description: 'Budget updated successfully.' });

    } else {
        addDocumentNonBlocking(
            collection(firestore, 'users', sharedUserId, 'budgets'),
            budgetData
        );
        toast({ title: 'Success', description: 'Budget added successfully.' });
    }

    onOpenChange(false);
  }

  const expenseCategories = Object.keys(categoryIcons).filter(
    (c) => c !== 'Salary' && c !== 'Refunds' && c !== 'Other Income'
  ) as CategoryName[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your monthly spending limit.' : 'Set a monthly spending limit for a category.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Limit</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="₹5000.00" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{isEditing ? 'Save Changes': 'Add Budget'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
