
'use client';

import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Download,
  Edit,
  MoreVertical,
  PlusCircle,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import type { Transaction } from '@/types';
import { Badge } from '@/components/ui/badge';
import { categoryIcons } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { AddTransactionDialog } from '@/components/dashboard/add-transaction-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth } from 'date-fns';
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
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generatePdfStatement } from '@/lib/export-pdf';
import { useUser } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';

function TransactionTableView({
  transactions,
  isLoading,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Description</TableHead>
            <TableHead className="hidden sm:table-cell font-semibold">Category</TableHead>
            <TableHead className="hidden md:table-cell font-semibold">Date</TableHead>
            <TableHead className="text-right font-semibold">Amount</TableHead>
            <TableHead className="w-[100px] font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-16 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))
            : transactions.map((transaction) => {
                const CategoryIcon = categoryIcons[transaction.category];
                return (
                  <TableRow 
                    key={transaction.id}
                    className="group hover:bg-muted/30 transition-all duration-200"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full transition-all duration-200 group-hover:scale-110",
                          transaction.type === 'income' 
                            ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20" 
                            : "bg-gradient-to-br from-rose-500/20 to-rose-600/20"
                        )}>
                          {transaction.type === 'income' ? (
                            <ArrowUpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">
                            {transaction.description}
                          </span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <span className="sm:hidden">{transaction.category} • </span>
                            <span className="md:hidden">
                              {new Date(transaction.date).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
                        "bg-background/50"
                      )}>
                        {CategoryIcon && (
                          <CategoryIcon className="h-4 w-4" />
                        )}
                        {transaction.category}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground py-4">
                      {new Date(transaction.date).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold text-base py-4',
                        transaction.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {transaction.amount.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      })}
                    </TableCell>
                    <TableCell className="py-4">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)} className="h-8 w-8">
                                <Edit className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(transaction)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          {!isLoading && transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                No transactions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function TransactionsPage() {
  const { firestore, sharedUserId } = useSharedUser();
  const { user } = useUser();
  const { toast } = useToast();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedCategory, setSelectedCategory] = useState('all');

  const transactionsQuery = useMemoFirebase(
    () =>
      sharedUserId && firestore
        ? query(
            collection(firestore, 'users', sharedUserId, 'transactions'),
            orderBy('date', 'desc')
          )
        : null,
    [firestore, sharedUserId]
  );
  const { data: transactions, isLoading } = useCollection<Transaction>(
    transactionsQuery
  );

  const { availableMonths, availableCategories } = useMemo(() => {
    if (!transactions) return { availableMonths: [], availableCategories: [] };
    const months = new Set<string>();
    const categories = new Set<string>();
    transactions.forEach((t) => {
      months.add(format(new Date(t.date), 'yyyy-MM'));
      categories.add(t.category);
    });
    
    const monthOptions = Array.from(months).map(monthStr => {
        const date = new Date(monthStr + '-02'); // Use day 2 to avoid timezone issues
        return {
            value: monthStr,
            label: format(date, 'MMMM - yyyy')
        }
    });

    const categoryOptions = Array.from(categories).sort();

    return { availableMonths: monthOptions, availableCategories: categoryOptions };
  }, [transactions]);
  
  useEffect(() => {
    // Set default month only on initial load when months become available
    if (availableMonths.length > 0 && selectedMonth === 'all' && !sessionStorage.getItem('transactions-month-selected')) {
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
      sessionStorage.setItem('transactions-month-selected', 'true');
    } else {
      sessionStorage.removeItem('transactions-month-selected');
    }
    setSelectedMonth(value);
  }


  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions
      .filter((t) => (filterType === 'all' ? true : t.type === filterType))
      .filter((t) =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((t) => {
        if (selectedMonth === 'all') return true;
        return format(new Date(t.date), 'yyyy-MM') === selectedMonth;
      })
      .filter((t) => (selectedCategory === 'all' ? true : t.category === selectedCategory));
  }, [transactions, filterType, searchQuery, selectedMonth, selectedCategory]);

  const handleExportExcel = () => {
    const monthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || 'All-Time';
    const periodText = selectedMonth === 'all' ? 'All Time' : monthLabel;
    
    const { totalIncome, totalExpenses, netSavings } = filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') {
          acc.totalIncome += t.amount;
        } else {
          acc.totalExpenses += t.amount;
        }
        acc.netSavings = acc.totalIncome - acc.totalExpenses;
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0, netSavings: 0 }
    );
  
    const currencyFormat = '"Rs" #,##0.00';
    const summaryData = [
      [{ v: 'Financial Summary', s: { font: { bold: true, sz: 14 } } }],
      [
        { v: 'Report Period', s: { font: { bold: true } } },
        { v: periodText },
      ],
      [],
      [
        { v: 'Total Income', s: { font: { bold: true } } },
        { v: totalIncome, t: 'n', z: currencyFormat },
      ],
      [
        { v: 'Total Expenses', s: { font: { bold: true } } },
        { v: totalExpenses, t: 'n', z: currencyFormat },
      ],
      [
        { v: 'Net Savings', s: { font: { bold: true } } },
        { v: netSavings, t: 'n', z: currencyFormat },
      ],
      [], 
      [],
      [{ v: 'All Transactions', s: { font: { bold: true, sz: 14 } } }],
      [], 
      [
        { v: 'Date', s: { font: { bold: true } } },
        { v: 'Description', s: { font: { bold: true } } },
        { v: 'Category', s: { font: { bold: true } } },
        { v: 'Type', s: { font: { bold: true } } },
        { v: 'Amount', s: { font: { bold: true } } },
      ],
    ];
  
    const transactionRows = filteredTransactions.map((t) => [
      new Date(t.date),
      t.description,
      t.category,
      t.type,
      t.amount,
    ]);
  
    const finalData = [...summaryData, ...transactionRows];
  
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
  
    worksheet['!cols'] = [
      { wch: 20 }, // Period
      { wch: 35 }, // Description
      { wch: 15 }, // Category
      { wch: 10 }, // Type
      { wch: 15 }, // Amount
    ];
  
    transactionRows.forEach((_, index) => {
      // Adjust for summary rows
      const rowIndex = 11 + index + 1; 
      
      // Amount column
      const amountCellRef = `E${rowIndex}`;
      if (worksheet[amountCellRef]) {
        worksheet[amountCellRef].t = 'n';
        worksheet[amountCellRef].z = currencyFormat;
      }
      
      // Date column
      const dateCellRef = `A${rowIndex}`;
        if (worksheet[dateCellRef]) {
            worksheet[dateCellRef].t = 'd';
            worksheet[dateCellRef].z = 'dd-mmm-yyyy';
        }
    });

    // Make Period row date column wider
    if (worksheet['A2']) {
      worksheet['!cols'][0] = { wch: 20 };
    }
  
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Report');
    XLSX.writeFile(workbook, `ZenithSpend_Report_${monthLabel.replace(' ','-')}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!transactions) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No transaction data available to generate a statement.',
      });
      return;
    }
    
    let periodStartDate: Date;
    let periodEndDate: Date;
    
    if (selectedMonth === 'all') {
      const sorted = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      periodStartDate = sorted.length > 0 ? new Date(sorted[0].date) : new Date();
      periodEndDate = sorted.length > 0 ? new Date(sorted[sorted.length-1].date) : new Date();
    } else {
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = parseInt(selectedMonth.split('-')[1]) - 1;
      periodStartDate = startOfMonth(new Date(year, month));
      periodEndDate = endOfMonth(new Date(year, month));
    }

    const fileName = selectedMonth === 'all' 
    ? 'all_time_statement.pdf'
    : `${selectedMonth.replace('-', '_')}_statement.pdf`;

    // Calculate opening balance
    const openingBalance = transactions.reduce((acc, t) => {
      const tDate = new Date(t.date);
      if (tDate < periodStartDate) {
        if (t.type === 'income') {
          return acc + t.amount;
        } else {
          return acc - t.amount;
        }
      }
      return acc;
    }, 0);

    const userName = "Yokesh R";

    generatePdfStatement({
      transactions: filteredTransactions,
      openingBalance,
      startDate: periodStartDate,
      endDate: periodEndDate,
      userName: userName,
      fileName: fileName,
      isAllTime: selectedMonth === 'all',
    });
  };

  const handleDelete = async () => {
    if (!deletingTransaction || !sharedUserId || !firestore) return;
    const docRef = doc(firestore, 'users', sharedUserId, 'transactions', deletingTransaction.id);
    deleteDocumentNonBlocking(docRef);
    toast({
        title: 'Transaction Deleted',
        description: `"${deletingTransaction.description}" has been removed.`,
    });
    setDeletingTransaction(null);
  }

  const isFiltered = filterType !== 'all' || selectedMonth !== 'all' || selectedCategory !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setFilterType('all');
    setSelectedMonth('all');
    setSelectedCategory('all');
    setSearchQuery('');
    sessionStorage.removeItem('transactions-month-selected');
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <AddTransactionDialog
        transaction={editingTransaction}
        open={editingTransaction !== null}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 md:h-8 md:w-8" />
            Transactions
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View and manage all your transactions.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button 
            onClick={() => setEditingTransaction({} as Transaction)} 
            className="flex-1 sm:flex-none shadow-md hover:shadow-lg transition-all duration-300"
            size="default"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="text-sm">Add</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Card className="border-none shadow-md">
        <CardContent className="p-3 sm:p-4">
            <div className="space-y-3">
              {/* Search and Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className='relative flex-1 group'>
                    <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-8 h-9 bg-muted/30 border-muted-foreground/20 focus-visible:bg-background focus-visible:border-primary/30 transition-all text-sm"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                    {searchQuery && (
                        <Button variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => setSearchQuery('')}>
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
                {(selectedCategory !== 'all' || filterType !== 'all' || selectedMonth !== format(new Date(), 'yyyy-MM') || searchQuery) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters} 
                    className="h-9 px-3 text-xs font-medium hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <X className="h-3 w-3 mr-1.5" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Compact Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Button 
                  variant={selectedMonth === format(new Date(), 'yyyy-MM') ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleMonthChange(format(new Date(), 'yyyy-MM'))}
                  className="h-8 px-3 text-xs"
                >
                  This Month
                </Button>
                <Button 
                  variant={selectedMonth === format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM') ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleMonthChange(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM'))}
                  className="h-8 px-3 text-xs"
                >
                  Last Month
                </Button>
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-[130px] sm:w-[150px] h-8 text-xs bg-background">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        {availableMonths.map(month => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <div className="hidden sm:block h-5 w-px bg-border mx-1" />
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs bg-background">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                    <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs bg-background">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
        </CardContent>
      </Card>
      
      <TransactionTableView 
          transactions={filteredTransactions} 
          isLoading={isLoading} 
          onEdit={setEditingTransaction}
          onDelete={setDeletingTransaction}
      />

      <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the transaction &quot;{deletingTransaction?.description}&quot;. This action cannot be undone.
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