
export type Transaction = {
  id: string;
  userId: string;
  amount: number;
  date: string;
  description: string;
  category: CategoryName;
  type: 'income' | 'expense';
};

export type Budget = {
  id: string;
  userId: string;
  category: CategoryName;
  limit: number;
};

export type RecurringPayment = {
  id:string;
  userId: string;
  name: string;
  amount: number;
  dueDate: number; // Day of the month
  category: CategoryName;
  lastPaidDate: string | null;
  transactionId?: string | null;
  skippedMonths?: string[]; // Array of month strings like ["2026-01", "2025-12"]
}

export type CategoryName =
  | 'Salary'
  | 'Refunds'
  | 'Other Income'
  | 'Housing'
  | 'Food'
  | 'Transport'
  | 'Entertainment'
  | 'Health'
  | 'Shopping'
  | 'Grocery'
  | 'Utilities'
  | 'Loan'
  | 'Personal'
  | 'Investment'
  | 'Insurance'
  | 'Broadband'
  | 'Credit Card'
  | 'Other';

export type Category = {
  name: CategoryName;
  icon: React.ElementType;
};

    
