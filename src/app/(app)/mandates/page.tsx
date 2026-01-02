
'use client';

import { useState, useMemo, useEffect, useCallback, CSSProperties } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  FileText,
  CheckCircle2,
  Edit,
  Trash2,
  PlusCircle,
  Clock,
  Wallet,
  Undo2,
  GripVertical,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import {
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  collection,
  query,
  doc,
  runTransaction,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import type { RecurringPayment } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoryIcons } from '@/lib/placeholder-data';
import { Badge } from '@/components/ui/badge';
import type { CategoryName } from '@/types';
import { useFormulaInput } from '@/hooks/use-formula-input';
import { Calculator } from 'lucide-react';

const billFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  category: z.string().min(1, 'Please select a category.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
});


function BillFormDialog({
  bill,
  open,
  onOpenChange,
}: {
  bill: Partial<RecurringPayment> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { firestore, sharedUserId } = useSharedUser();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof billFormSchema>>({
    resolver: zodResolver(billFormSchema),
  });

  const amountFormula = useFormulaInput({
    onCalculate: (value) => {
      form.setValue('amount', value);
    },
    initialValue: bill?.amount || '',
  });

  useEffect(() => {
    if (bill) {
      form.reset({
        name: bill.name || '',
        category: bill.category || '',
        amount: bill.amount || 0,
      });
      amountFormula.reset(bill.amount || '');
    } else {
      form.reset({ name: '', category: '', amount: 0 });
      amountFormula.reset('');
    }
  }, [bill, form]);

  const isEditing = !!bill?.id;

  const onSubmit = (values: z.infer<typeof billFormSchema>) => {
    if (!sharedUserId || !firestore) return;
    const billData: Partial<RecurringPayment> = {
      userId: sharedUserId,
      name: values.name,
      category: values.category as CategoryName,
      amount: values.amount,
    };

    if (isEditing) {
      const docRef = doc(firestore, 'users', sharedUserId, 'recurringPayments', bill!.id!);
      updateDocumentNonBlocking(docRef, billData);
      toast({ title: 'Success', description: 'Bill updated successfully.' });
    } else {
      addDocumentNonBlocking(collection(firestore, 'users', sharedUserId, 'recurringPayments'), {
        ...billData,
        dueDate: 1,
        lastPaidDate: null,
      });
      toast({ title: 'Success', description: 'Bill added successfully.' });
    }
    onOpenChange(false);
  };
  
  const expenseCategories = Object.keys(categoryIcons).filter(c => c !== 'Salary' && c !== 'Refunds' && c !== 'Other Income') as CategoryName[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Bill' : 'Add a New Bill'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this recurring bill.' : 'Add a new recurring bill to track.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Netflix, Rent" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="Enter amount or formula (e.g., =20+30)" 
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
                    <p className="text-sm text-destructive">{amountFormula.error}</p>
                  )}
                  {!amountFormula.error && amountFormula.isCalculating && (
                    <p className="text-xs text-muted-foreground">Press Enter or click outside to calculate</p>
                  )}
                  <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Add Bill'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const paymentFormSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be a positive number.'),
});

function PayBillDialog({
  bill,
  open,
  onOpenChange,
  onConfirm,
}: {
  bill: RecurringPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (bill: RecurringPayment, amount: number) => void;
}) {
  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
  });

  const paymentFormula = useFormulaInput({
    onCalculate: (value) => {
      form.setValue('amount', value);
    },
    initialValue: bill?.amount || '',
  });

  useEffect(() => {
    if (bill) {
      form.reset({ amount: bill.amount });
      paymentFormula.reset(bill.amount);
    }
  }, [bill, form]);

  if (!bill) return null;

  const handleSubmit = (values: z.infer<typeof paymentFormSchema>) => {
    onConfirm(bill, values.amount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make Payment: {bill.name}</DialogTitle>
          <DialogDescription>
            Confirm the amount for this month's payment. The expected amount is pre-filled.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="Enter amount or formula (e.g., =100-10)" 
                        value={paymentFormula.displayValue}
                        onChange={(e) => paymentFormula.handleChange(e.target.value)}
                        onBlur={paymentFormula.handleBlur}
                        className={cn(
                          paymentFormula.isCalculating && "pl-9 border-primary/50 bg-primary/5",
                          paymentFormula.error && "border-destructive"
                        )}
                      />
                      {paymentFormula.isCalculating && (
                        <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      )}
                    </div>
                  </FormControl>
                  {paymentFormula.error && (
                    <p className="text-sm text-destructive">{paymentFormula.error}</p>
                  )}
                  {!paymentFormula.error && paymentFormula.isCalculating && (
                    <p className="text-xs text-muted-foreground">Press Enter or click outside to calculate</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Confirm Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const DraggableTableRow = ({ bill, ...props }: { bill: RecurringPayment, [key: string]: any }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: bill.id });

    const style: CSSProperties = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative',
    };
    
    return <TableRow ref={setNodeRef} style={style} {...props} >
        <TableCell className="w-12 pl-3 pr-1">
            <div {...attributes} {...listeners} className="cursor-grab p-1">
                <GripVertical className="h-5 w-5 text-muted-foreground"/>
            </div>
        </TableCell>
        {props.children}
    </TableRow>
}

export default function BillsPage() {
  const { firestore, sharedUserId } = useSharedUser();
  const { toast } = useToast();
  
  const [payingBill, setPayingBill] = useState<RecurringPayment | null>(null);
  const [editingBill, setEditingBill] = useState<Partial<RecurringPayment> | null>(null);
  const [deletingBill, setDeletingBill] = useState<RecurringPayment | null>(null);
  const [resettingBill, setResettingBill] = useState<RecurringPayment | null>(null);
  const [orderedBills, setOrderedBills] = useState<RecurringPayment[]>([]);

  const billsQuery = useMemoFirebase(
    () => (sharedUserId && firestore ? query(collection(firestore, 'users', sharedUserId, 'recurringPayments')) : null),
    [firestore, sharedUserId]

    
  );

  const { data: bills, isLoading } = useCollection<RecurringPayment>(billsQuery);

  const isBillPaidThisMonth = useCallback((bill: RecurringPayment) => {
    if (!bill.lastPaidDate) return false;
    const now = new Date();
    const paidDate = new Date(bill.lastPaidDate);
    return (
      paidDate.getMonth() === now.getMonth() &&
      paidDate.getFullYear() === now.getFullYear()
    );
  }, []);

  const isBillSkippedThisMonth = useCallback((bill: RecurringPayment) => {
    if (!bill.skippedMonths || bill.skippedMonths.length === 0) return false;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return bill.skippedMonths.includes(currentMonth);
  }, []);

  useEffect(() => {
    if (bills) {
        let sorted: RecurringPayment[];
        const savedOrder = localStorage.getItem('billsOrder');

        if (savedOrder) {
            const billOrder = JSON.parse(savedOrder);
            const billMap = new Map(bills.map(b => [b.id, b]));
            const ordered = billOrder.map((id: string) => billMap.get(id)).filter(Boolean) as RecurringPayment[];
            const remaining = bills.filter(b => !billOrder.includes(b.id));
            sorted = [...ordered, ...remaining];
        } else {
            sorted = [...bills].sort((a,b) => a.name.localeCompare(b.name));
        }
        
        sorted.sort((a, b) => {
          const aIsPaid = isBillPaidThisMonth(a);
          const bIsPaid = isBillPaidThisMonth(b);
          if (aIsPaid !== bIsPaid) {
            return aIsPaid ? 1 : -1;
          }
          return 0; // Keep original (name or custom) sort for same-status items
        });

        setOrderedBills(sorted);
    }
  }, [bills, isBillPaidThisMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    const paidBills = orderedBills.filter(isBillPaidThisMonth);
    const skippedBills = orderedBills.filter(isBillSkippedThisMonth);
    const unpaidBills = orderedBills.filter(b => !isBillPaidThisMonth(b) && !isBillSkippedThisMonth(b));
    
    const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0);
    const projectedRemaining = unpaidBills.reduce((sum, bill) => sum + bill.amount, 0);
    
    return { 
      totalPaid, 
      projectedRemaining, 
      paidCount: paidBills.length,
      skippedCount: skippedBills.length,
      unpaidCount: unpaidBills.length
    };
  }, [orderedBills, isBillPaidThisMonth, isBillSkippedThisMonth]);


  const confirmPayment = async (billToPay: RecurringPayment, amount: number) => {
    if (!sharedUserId || !firestore) return;

    const billRef = doc(firestore, 'users', sharedUserId, 'recurringPayments', billToPay.id);
    const transactionRef = doc(collection(firestore, 'users', sharedUserId, 'transactions'));

    try {
      await runTransaction(firestore, async (transaction) => {
        const today = new Date().toISOString();
        
        transaction.update(billRef, { 
          lastPaidDate: today, 
          amount: amount,
          transactionId: transactionRef.id 
        });

        const newTransaction = {
          userId: sharedUserId,
          amount: amount,
          description: `Payment for ${billToPay.name}`,
          category: billToPay.category,
          date: today,
          type: 'expense' as 'expense',
        };
        transaction.set(transactionRef, newTransaction);
      });

      toast({
        title: 'Payment Confirmed',
        description: `${billToPay.name} marked as paid for ${amount.toLocaleString(
          'en-IN',
          { style: 'currency', currency: 'INR' }
        )}.`,
      });
    } catch (e) {
      console.error('Payment transaction failed: ', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not mark bill as paid.',
      });
    } finally {
      setPayingBill(null);
    }
  };

  const handleResetPayment = async () => {
    if (!resettingBill || !sharedUserId || !firestore) return;

    const billToReset = resettingBill;
    setResettingBill(null);

    const billRef = doc(firestore, 'users', sharedUserId, 'recurringPayments', billToReset.id);

    try {
        const batch = writeBatch(firestore);

        batch.update(billRef, {
            lastPaidDate: null,
            transactionId: null
        });

        if (billToReset.transactionId) {
            const transactionRef = doc(firestore, 'users', sharedUserId, 'transactions', billToReset.transactionId);
            batch.delete(transactionRef);
        }

        await batch.commit();

        toast({
            title: 'Payment Reset',
            description: `${billToReset.name} has been marked as pending.`,
        });

    } catch(e) {
        console.error('Reset payment failed:', e);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not reset the bill payment.',
        });
    }
  }

  const handleSkipMonth = async (bill: RecurringPayment) => {
    if (!sharedUserId || !firestore) return;

    const billRef = doc(firestore, 'users', sharedUserId, 'recurringPayments', bill.id);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    try {
      const skippedMonths = bill.skippedMonths || [];
      if (!skippedMonths.includes(currentMonth)) {
        updateDocumentNonBlocking(billRef, {
          skippedMonths: [...skippedMonths, currentMonth]
        });
        
        toast({
          title: 'Bill Skipped',
          description: `${bill.name} marked as skipped for this month.`,
        });
      }
    } catch (e) {
      console.error('Skip month failed:', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not skip bill for this month.',
      });
    }
  };

  const handleUnskipMonth = async (bill: RecurringPayment) => {
    if (!sharedUserId || !firestore) return;

    const billRef = doc(firestore, 'users', sharedUserId, 'recurringPayments', bill.id);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    try {
      const skippedMonths = bill.skippedMonths || [];
      const updatedSkippedMonths = skippedMonths.filter(month => month !== currentMonth);
      
      updateDocumentNonBlocking(billRef, {
        skippedMonths: updatedSkippedMonths
      });
      
      toast({
        title: 'Skip Removed',
        description: `${bill.name} is now pending for this month.`,
      });
    } catch (e) {
      console.error('Unskip month failed:', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not remove skip for this month.',
      });
    }
  };


  const handleDelete = () => {
    if (!deletingBill || !sharedUserId || !firestore) return;
    const docRef = doc(firestore, 'users', sharedUserId, 'recurringPayments', deletingBill.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Bill Deleted',
      description: `The bill "${deletingBill.name}" has been removed.`,
    });
    setDeletingBill(null);
  }
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    
    if (active.id !== over?.id) {
      setOrderedBills((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over!.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('billsOrder', JSON.stringify(newOrder.map(b => b.id)));
        return newOrder;
      });
    }
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Monthly Mandates
          </h1>
          <p className="text-muted-foreground text-sm">
            Track and manage your recurring monthly payments.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Progress Card - Compact on Desktop */}
              <Card className="bg-gradient-to-r from-emerald-500/5 to-green-500/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-muted-foreground">Monthly Progress</span>
                  <span className="text-sm font-bold text-foreground">
                  {orderedBills.filter(isBillPaidThisMonth).length} / {orderedBills.length} Paid
                  </span>
                </div>
                <div className="text-right ml-auto">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round((orderedBills.filter(isBillPaidThisMonth).length / Math.max(orderedBills.length, 1)) * 100)}%
                  </div>
                </div>
                </div>
              </CardContent>
              </Card>
              
              <Button onClick={() => setEditingBill({})} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Bill
              </Button>
            </div>
      </div>

      {/* Total Paid & Projected Remaining */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Total Paid This Month */}
        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-background dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-background">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                      Paid This Month
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {totals.paidCount} bill{totals.paidCount !== 1 ? 's' : ''} settled
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  {isLoading ? (
                    <div className="h-9 w-36 bg-muted animate-pulse rounded-md" />
                  ) : (
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                      {totals.totalPaid.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projected Remaining */}
        <Card className="border-none shadow-md bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-background dark:from-amber-950/30 dark:via-amber-950/15 dark:to-background">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                      Projected Remaining
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {totals.unpaidCount} pending
                      {totals.skippedCount > 0 && ` • ${totals.skippedCount} skipped`}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  {isLoading ? (
                    <div className="h-9 w-36 bg-muted animate-pulse rounded-md" />
                  ) : (
                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                      {totals.projectedRemaining.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b-2">
                <TableHead className='w-12'></TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className='w-[130px] font-semibold'>Status</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Category</TableHead>
                <TableHead className="hidden sm:table-cell text-right font-semibold">Amount</TableHead>
                <TableHead className="w-[240px] text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={orderedBills.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <TableBody>
                    {isLoading && Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="w-12"><Skeleton className="h-5 w-5" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && orderedBills.map((bill) => {
                    const isPaid = isBillPaidThisMonth(bill);
                    const CategoryIcon = categoryIcons[bill.category] || FileText;
                    return (
                        <DraggableTableRow 
                          key={bill.id} 
                          bill={bill} 
                          className={cn(
                            "group hover:bg-muted/30 transition-all duration-200",
                            isPaid && 'opacity-60'
                          )}
                        >
                            <TableCell className="py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={cn(
                                    "p-1.5 rounded-lg transition-all duration-200",
                                    isPaid 
                                      ? "bg-emerald-500/10" 
                                      : "bg-amber-500/10"
                                  )}>
                                    {isPaid ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                                    ) : (
                                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className='font-semibold text-sm text-foreground'>{bill.name}</div>
                                    <div className='text-xs text-muted-foreground mt-0.5'>
                                      <span className="md:hidden">{bill.category} • </span>
                                      <span className="font-semibold sm:hidden">
                                        {bill.amount.toLocaleString('en-IN', {
                                          style: 'currency',
                                          currency: 'INR',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                            </TableCell>
                            <TableCell className="py-3">
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                                  isPaid 
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                    : isBillSkippedThisMonth(bill)
                                    ? "bg-muted text-muted-foreground border border-border"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                )}>
                                  <span>
                                    {isPaid ? 'Paid' : isBillSkippedThisMonth(bill) ? 'Skipped' : 'Pending'}
                                  </span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-3">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-background/50">
                                    <CategoryIcon className="h-3.5 w-3.5" />
                                    {bill.category}
                                </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right font-bold py-3">
                                {bill.amount.toLocaleString('en-IN', {
                                  style: 'currency',
                                  currency: 'INR',
                                })}
                            </TableCell>
                            <TableCell className="text-right py-3">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                    {isPaid ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setResettingBill(bill)}
                                            className="h-8 text-xs"
                                        >
                                            <Undo2 className="mr-1 h-3.5 w-3.5" />
                                            <span className="hidden xs:inline">Reset</span>
                                        </Button>
                                    ) : isBillSkippedThisMonth(bill) ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUnskipMonth(bill)}
                                            className="h-8 text-xs"
                                        >
                                            <Undo2 className="mr-1 h-3.5 w-3.5" />
                                            <span className="hidden xs:inline">Undo Skip</span>
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => setPayingBill(bill)}
                                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                <Wallet className="mr-1 h-3.5 w-3.5" />
                                                <span className="hidden xs:inline">Pay Now</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSkipMonth(bill)}
                                                className="h-8 text-xs"
                                            >
                                                <span className="hidden xs:inline">Skip Month</span>
                                                <span className="xs:hidden">Skip</span>
                                            </Button>
                                        </>
                                    )}
                                
                                    <Button variant="ghost" size="icon" onClick={() => setEditingBill(bill)} className="h-8 w-8 hover:bg-muted">
                                        <Edit className="h-3.5 w-3.5" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setDeletingBill(bill)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </div>
                            </TableCell>
                        </DraggableTableRow>
                    );
                    })}
                </TableBody>
            </SortableContext>
          </Table>
        </DndContext>
        {!isLoading && (!bills || bills.length === 0) && (
            <div className="text-center py-12 px-6">
                <h3 className='text-xl font-bold mb-2'>No Bills Found</h3>
                <p className='text-muted-foreground mb-4'>Get started by adding your first recurring bill.</p>
                <Button onClick={() => setEditingBill({})}>
                    <PlusCircle className="mr-2" />
                    Add Your First Bill
                </Button>
            </div>
        )}
      </div>

      <PayBillDialog
        bill={payingBill}
        open={!!payingBill}
        onConfirm={confirmPayment}
        onOpenChange={(open) => !open && setPayingBill(null)}
      />

      <BillFormDialog 
        bill={editingBill}
        open={editingBill !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBill(null);
          }
        }}
      />
      
      <AlertDialog open={!!resettingBill} onOpenChange={(open) => !open && setResettingBill(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Reset Payment?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will mark the bill &quot;{resettingBill?.name}&quot; as unpaid and delete the associated transaction. Are you sure?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetPayment}>Reset</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingBill} onOpenChange={(open) => !open && setDeletingBill(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the bill &quot;{deletingBill?.name}&quot;. This action cannot be undone.
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