import { Transaction, Account, DebtRecord } from '../types/finance';

/**
 * Format number into Indian Rupee format (e.g. ₹1,25,000.00 or ₹450.00)
 */
export function formatINR(amount: number, options?: { compact?: boolean; hideDecimals?: boolean }): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  if (options?.compact) {
    if (absAmount >= 10000000) {
      return `${isNegative ? '-' : ''}₹${(absAmount / 10000000).toFixed(2)} Cr`;
    }
    if (absAmount >= 100000) {
      return `${isNegative ? '-' : ''}₹${(absAmount / 100000).toFixed(2)} L`;
    }
    if (absAmount >= 1000) {
      return `${isNegative ? '-' : ''}₹${(absAmount / 1000).toFixed(1)}k`;
    }
  }

  const fractionDigits = options?.hideDecimals ? 0 : 2;

  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(absAmount);

    return isNegative ? `-${formatted}` : formatted;
  } catch {
    // Fallback manual Indian numbering
    const parts = absAmount.toFixed(fractionDigits).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] ? `.${parts[1]}` : '';

    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== '') {
      integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }

    const res = `₹${integerPart}${decimalPart}`;
    return isNegative ? `-${res}` : res;
  }
}

/**
 * Format ISO date string (YYYY-MM-DD) into Indian standard DD-MM-YYYY
 */
export function formatDateIN(dateStr: string): string {
  if (!dateStr) return '';
  try {
    // If already DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format Date and optional Time into DD-MM-YYYY, HH:mm
 */
export function formatDateTimeIN(dateStr: string, timeStr?: string): string {
  const formattedDate = formatDateIN(dateStr);
  if (timeStr) {
    return `${formattedDate} ${timeStr}`;
  }
  return formattedDate;
}

/**
 * Generate a unique, professional transaction ID
 * format: TXN-YYYYMMDD-XXXX
 */
export function generateTransactionId(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = String((isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth()) + 1).padStart(2, '0');
  const day = String(isNaN(d.getDate()) ? new Date().getDate() : d.getDate()).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TXN-${year}${month}${day}-${randomSuffix}`;
}

/**
 * Check for duplicate transactions:
 * Same amount, same date, and matching vendor or description or category.
 */
export function detectDuplicateTransaction(
  candidate: {
    amount: number;
    date: string;
    vendor?: string;
    description?: string;
    categoryId?: string;
  },
  existingTransactions: Transaction[],
  excludeId?: string
): Transaction | null {
  if (!candidate.amount || !candidate.date) return null;

  const found = existingTransactions.find((txn) => {
    if (excludeId && txn.id === excludeId) return false;
    if (txn.date !== candidate.date) return false;
    if (Math.abs(txn.amount - candidate.amount) > 0.01) return false;

    // Check if vendor matches closely or category matches
    const vendorMatch =
      candidate.vendor &&
      txn.vendor &&
      candidate.vendor.trim().toLowerCase() === txn.vendor.trim().toLowerCase();

    const descMatch =
      candidate.description &&
      txn.description &&
      candidate.description.trim().toLowerCase() === txn.description.trim().toLowerCase();

    const catMatch = candidate.categoryId && txn.categoryId === candidate.categoryId;

    return Boolean(vendorMatch || descMatch || catMatch);
  });

  return found || null;
}

/**
 * Calculates current real balances for all accounts based on initial balance + transactions
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): Account[] {
  const balances: Record<string, number> = {};
  accounts.forEach((acc) => {
    balances[acc.id] = acc.initialBalance;
  });

  // Sort chronologically
  const sorted = [...transactions].sort((a, b) => {
    return `${a.date} ${a.time || '00:00'}`.localeCompare(`${b.date} ${b.time || '00:00'}`);
  });

  sorted.forEach((txn) => {
    if (txn.type === 'income') {
      if (balances[txn.accountId] !== undefined) {
        balances[txn.accountId] += txn.amount;
      }
    } else if (txn.type === 'expense') {
      if (balances[txn.accountId] !== undefined) {
        balances[txn.accountId] -= txn.amount;
      }
    } else if (txn.type === 'transfer' && txn.toAccountId) {
      if (balances[txn.accountId] !== undefined) {
        balances[txn.accountId] -= txn.amount;
      }
      if (balances[txn.toAccountId] !== undefined) {
        balances[txn.toAccountId] += txn.amount;
      }
    }
  });

  return accounts.map((acc) => ({
    ...acc,
    balance: balances[acc.id] !== undefined ? balances[acc.id] : acc.initialBalance,
  }));
}

/**
 * Export transactions to CSV file
 */
export function exportTransactionsToCSV(transactions: Transaction[], accounts: Account[], categoriesMap: Record<string, string>) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = [
    'Transaction ID',
    'Date (DD-MM-YYYY)',
    'Time',
    'Type',
    'Category',
    'Subcategory',
    'Description',
    'Amount (INR)',
    'Payment Method',
    'Account / Wallet',
    'Destination Account',
    'Vendor / Person',
    'Tag',
    'Notes',
  ];

  const rows = transactions.map((t) => [
    `"${t.id}"`,
    `"${formatDateIN(t.date)}"`,
    `"${t.time || ''}"`,
    `"${t.type.toUpperCase()}"`,
    `"${categoriesMap[t.categoryId] || t.categoryId}"`,
    `"${t.subcategory || ''}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    `"${t.paymentMethod}"`,
    `"${accountMap.get(t.accountId) || t.accountId}"`,
    `"${t.toAccountId ? accountMap.get(t.toAccountId) || t.toAccountId : ''}"`,
    `"${(t.vendor || '').replace(/"/g, '""')}"`,
    `"${t.tag || ''}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `BudgetManagement_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
