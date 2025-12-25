import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { Transaction } from '@/types';

// Extend jsPDF interface
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Formats numbers into Indian Currency format (e.g., Rs 1,50,000.00)
 */
const formatCurrency = (amount: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const isNegative = amount < 0;
    return `${isNegative ? '- ' : ''}Rs ${formatter.format(Math.abs(amount))}`;
};
  

interface StatementData {
  transactions: Transaction[];
  openingBalance: number;
  startDate: Date;
  endDate: Date;
  userName: string;
  fileName: string;
  isAllTime?: boolean;
}

export function generatePdfStatement({
  transactions,
  openingBalance,
  startDate,
  endDate,
  userName,
  fileName,
  isAllTime = false,
}: StatementData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const brandIndigo = [79, 70, 229]; // The Indigo color from the first version

  // --- 1. BRANDED HEADER ---
  doc.setFillColor(brandIndigo[0], brandIndigo[1], brandIndigo[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Personal Expense Tracker', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Personal Finance Tracker', margin, 27);

  doc.setFontSize(14);
  doc.text(isAllTime ? 'MONTHLY SUMMARY REPORT' : 'ACCOUNT STATEMENT', pageWidth - margin, 22, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth - margin, 28, { align: 'right' });

  // --- 2. ACCOUNT HOLDER INFO ---
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT HOLDER', margin, 58);
  doc.text('STATEMENT PERIOD', margin + 85, 58);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(userName.toUpperCase(), margin, 65);
  doc.text(
    `${format(startDate, 'dd MMM, yyyy')} — ${format(endDate, 'dd MMM, yyyy')}`,
    margin + 85,
    65
  );

  // --- NOTE FOR ALL TIME REPORTS ---
  if (isAllTime) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('Note: This report shows monthly summaries. Each month is treated independently.', margin, 78);
    doc.setFont('helvetica', 'normal');
  }

  // --- 3. SUMMARY SECTION (Right Aligned) ---
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const closingBalance = openingBalance + totalIncome - totalExpenses;

  if (isAllTime) {
    // For all-time, show overall summary
    doc.autoTable({
      startY: 78,
      body: [
        ['Total Income (+)', totalIncome],
        ['Total Expenses (-)', totalExpenses],
        ['Net Savings', totalIncome - totalExpenses],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'normal' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.column.index === 1 && typeof data.cell.raw === 'number') {
          data.cell.text = [formatCurrency(data.cell.raw)];
          if (data.row.index === 2) {
            data.cell.styles.textColor = data.cell.raw >= 0 ? [21, 128, 61] : [185, 28, 28];
          }
        }
      },
      margin: { left: pageWidth - margin - 85 },
    });
  } else {
    // For single month, show traditional statement
    doc.autoTable({
      startY: 75,
      body: [
        ['Opening Balance', openingBalance],
        ['Total Credits (+)', totalIncome],
        ['Total Debits (-)', totalExpenses],
        ['Closing Balance', closingBalance],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'normal' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.column.index === 1 && typeof data.cell.raw === 'number') {
          data.cell.text = [formatCurrency(data.cell.raw)];
          if (data.row.index === 3) data.cell.styles.textColor = brandIndigo;
        }
      },
      margin: { left: pageWidth - margin - 85 },
    });
  }

  // --- 4. TRANSACTION HISTORY TABLE ---
  const tableStartY = (doc as any).autoTable.previous.finalY + 15;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(isAllTime ? 'MONTHLY BREAKDOWN' : 'TRANSACTION HISTORY', margin, tableStartY);

  // Sorting to ensure chronological order
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (isAllTime) {
    // Group transactions by month
    const monthlyData: { [key: string]: Transaction[] } = {};
    sortedTransactions.forEach((t) => {
      const monthKey = format(new Date(t.date), 'MMM yyyy');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(t);
    });

    const tableData: any[] = [];
    Object.keys(monthlyData).forEach((monthKey) => {
      const monthTransactions = monthlyData[monthKey];
      const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const netSavings = monthIncome - monthExpenses;
      
      tableData.push([
        monthKey,
        monthIncome,
        monthExpenses,
        netSavings,
      ]);
    });

    doc.autoTable({
      startY: tableStartY + 5,
      head: [['MONTH', 'INCOME', 'EXPENSES', 'NET SAVINGS']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: brandIndigo,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: { 
        fontSize: 9, 
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        // Format currency columns
        if (typeof data.cell.raw === 'number' && data.section === 'body') {
          data.cell.text = [formatCurrency(data.cell.raw)];
          
          // Color coding for net savings
          if (data.column.index === 1 && data.cell.raw > 0) data.cell.styles.textColor = [21, 128, 61]; // Green for Income
          if (data.column.index === 2 && data.cell.raw > 0) data.cell.styles.textColor = [185, 28, 28]; // Red for Expenses
          if (data.column.index === 3) {
            data.cell.styles.textColor = data.cell.raw >= 0 ? [21, 128, 61] : [185, 28, 28];
          }
        }
      },
    });
  } else {
    // Single month - show detailed transaction list
    let currentBalance = openingBalance;
    const tableData = sortedTransactions.map((t) => {
      t.type === 'income' ? (currentBalance += t.amount) : (currentBalance -= t.amount);
      return [
        format(new Date(t.date), 'dd-MM-yyyy'),
        t.description,
        t.type === 'expense' ? t.amount : '-',
        t.type === 'income' ? t.amount : '-',
        currentBalance,
      ];
    });

    doc.autoTable({
      startY: tableStartY + 5,
      head: [['DATE', 'DESCRIPTION', 'DEBIT', 'CREDIT', 'BALANCE']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: brandIndigo,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: { 
        fontSize: 9, 
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        // Format currency columns
        if (typeof data.cell.raw === 'number') {
          if ([2,3,4].includes(data.column.index)) {
              data.cell.text = [formatCurrency(data.cell.raw)];
          }
          // Color coding for visual clarity
          if (data.column.index === 2 && data.cell.raw > 0) data.cell.styles.textColor = [185, 28, 28]; // Red for Debit
          if (data.column.index === 3 && data.cell.raw > 0) data.cell.styles.textColor = [21, 128, 61]; // Green for Credit
        }
        
        // Center align placeholder dashes
        if (data.cell.raw === '-') {
          data.cell.styles.halign = 'center';
        }
      },
    });
  }

  // --- 5. FOOTER ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerY = doc.internal.pageSize.height - 10;
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text('This is a computer-generated statement.', margin, footerY);
    doc.text('Log Expense', pageWidth - margin, footerY, { align: 'right' });
  }

  doc.save(fileName);
}
