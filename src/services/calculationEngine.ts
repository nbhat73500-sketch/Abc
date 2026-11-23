/**
 * Centralized Accounting and Budget Calculation Engine
 * 
 * Guarantees decimal-safe arithmetic (via Paisa / integer precision),
 * consistent formula application, opening/closing/available balance reconciliation,
 * category rollups, and threshold alert calculations.
 */

import { Transaction, Account, BudgetConfig, BudgetRecord } from '../types/finance';

export interface BudgetUtilizationSummary {
  allocated: number;
  actualSpent: number;
  remaining: number;
  utilizationPercentage: number;
  isOverBudget: boolean;
  thresholdReached: 0 | 50 | 75 | 90 | 100 | 110;
  categoryBreakdown: Record<string, {
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPercentage: number;
    isOverBudget: boolean;
  }>;
}

export interface PeriodFinancialSummary {
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  closingBalance: number;
  availableBalance: number;
  netSavings: number;
  savingsRate: number; // percentage (Net Savings / Total Income * 100)
  totalTransfers: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
}

/**
 * Decimal-Safe Integer Paisa Arithmetic
 */
export const DecimalSafe = {
  toPaisa(rupees: number): number {
    if (isNaN(rupees) || !isFinite(rupees)) return 0;
    return Math.round(rupees * 100);
  },

  fromPaisa(paisa: number): number {
    return Math.round(paisa) / 100;
  },

  add(a: number, b: number): number {
    return this.fromPaisa(this.toPaisa(a) + this.toPaisa(b));
  },

  subtract(a: number, b: number): number {
    return this.fromPaisa(this.toPaisa(a) - this.toPaisa(b));
  },

  sum(numbers: number[]): number {
    const totalPaisa = numbers.reduce((acc, curr) => acc + this.toPaisa(curr), 0);
    return this.fromPaisa(totalPaisa);
  },

  percentage(actual: number, total: number): number {
    if (!total || total <= 0) return 0;
    const ratio = (this.toPaisa(actual) / this.toPaisa(total)) * 100;
    return Math.round(ratio * 100) / 100; // 2 decimal places
  },

  format(amount: number): number {
    return this.fromPaisa(this.toPaisa(amount));
  }
};

/**
 * Calculate Total Income: Sum of all valid income transactions
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  const incomeTxns = transactions.filter((t) => t.type === 'income');
  return DecimalSafe.sum(incomeTxns.map((t) => t.amount));
}

/**
 * Calculate Total Expenses: Sum of all valid expense transactions
 */
export function calculateTotalExpenses(transactions: Transaction[]): number {
  const expenseTxns = transactions.filter((t) => t.type === 'expense');
  return DecimalSafe.sum(expenseTxns.map((t) => t.amount));
}

/**
 * Calculate Net Savings: Total Income - Total Expenses
 */
export function calculateNetSavings(totalIncome: number, totalExpenses: number): number {
  return DecimalSafe.subtract(totalIncome, totalExpenses);
}

/**
 * Calculate Remaining Budget: Allocated Budget - Actual Expenses
 */
export function calculateRemainingBudget(allocated: number, actualSpent: number): number {
  return DecimalSafe.subtract(allocated, actualSpent);
}

/**
 * Calculate Budget Utilization Percentage: (Actual Expenses / Allocated Budget) * 100
 */
export function calculateBudgetUtilization(allocated: number, actualSpent: number): number {
  if (allocated <= 0) return 0;
  return DecimalSafe.percentage(actualSpent, allocated);
}

/**
 * Reconcile Account Balances from Initial Balances + Chronological Transactions
 * Transfers move money between accounts without altering net wealth.
 */
export function reconcileAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): Account[] {
  const balanceMap: Record<string, number> = {};

  accounts.forEach((acc) => {
    balanceMap[acc.id] = DecimalSafe.toPaisa(acc.initialBalance);
  });

  // Sort strictly by date, then time, then ID for determinism
  const sorted = [...transactions].sort((a, b) => {
    const timeA = `${a.date} ${a.time || '00:00'}`;
    const timeB = `${b.date} ${b.time || '00:00'}`;
    return timeA.localeCompare(timeB) || a.id.localeCompare(b.id);
  });

  sorted.forEach((txn) => {
    const amountPaisa = DecimalSafe.toPaisa(txn.amount);

    if (txn.type === 'income') {
      if (balanceMap[txn.accountId] !== undefined) {
        balanceMap[txn.accountId] += amountPaisa;
      }
    } else if (txn.type === 'expense') {
      if (balanceMap[txn.accountId] !== undefined) {
        balanceMap[txn.accountId] -= amountPaisa;
      }
    } else if (txn.type === 'transfer' && txn.toAccountId) {
      if (balanceMap[txn.accountId] !== undefined) {
        balanceMap[txn.accountId] -= amountPaisa;
      }
      if (balanceMap[txn.toAccountId] !== undefined) {
        balanceMap[txn.toAccountId] += amountPaisa;
      }
    }
  });

  return accounts.map((acc) => ({
    ...acc,
    balance: DecimalSafe.fromPaisa(balanceMap[acc.id] ?? DecimalSafe.toPaisa(acc.initialBalance)),
  }));
}

/**
 * Calculate Total Available Balance across all liquid accounts (cash, bank, wallet)
 */
export function calculateAvailableBalance(accounts: Account[]): number {
  const liquidAccounts = accounts.filter(
    (a) => a.type !== 'credit_card' && a.type !== 'loan' && a.type !== 'emi_payable'
  );
  return DecimalSafe.sum(liquidAccounts.map((a) => a.balance));
}

/**
 * Calculate Financial Summary for any specified Period
 * Opening Balance = Total balances before the period start date
 * Closing Balance = Opening Balance + Period Income - Period Expenses
 * Available Balance = Opening Balance + Total Income - Total Expenses
 */
export function calculatePeriodSummary(
  transactions: Transaction[],
  accounts: Account[],
  startDateStr?: string,
  endDateStr?: string
): PeriodFinancialSummary {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  // Determine transactions strictly before the start date
  const priorTxns = startDateStr
    ? sorted.filter((t) => t.date < startDateStr)
    : [];

  const priorIncome = calculateTotalIncome(priorTxns);
  const priorExpenses = calculateTotalExpenses(priorTxns);
  const initialSum = DecimalSafe.sum(accounts.map((a) => a.initialBalance));
  const openingBalance = DecimalSafe.subtract(
    DecimalSafe.add(initialSum, priorIncome),
    priorExpenses
  );

  // Transactions inside the period
  const periodTxns = sorted.filter((t) => {
    if (startDateStr && t.date < startDateStr) return false;
    if (endDateStr && t.date > endDateStr) return false;
    return true;
  });

  const totalIncome = calculateTotalIncome(periodTxns);
  const totalExpenses = calculateTotalExpenses(periodTxns);
  const netSavings = calculateNetSavings(totalIncome, totalExpenses);
  const closingBalance = DecimalSafe.add(openingBalance, netSavings);
  const availableBalance = closingBalance;

  const transfers = periodTxns.filter((t) => t.type === 'transfer');
  const totalTransfers = DecimalSafe.sum(transfers.map((t) => t.amount));

  const savingsRate = totalIncome > 0
    ? DecimalSafe.percentage(Math.max(0, netSavings), totalIncome)
    : 0;

  return {
    openingBalance,
    totalIncome,
    totalExpenses,
    closingBalance,
    availableBalance,
    netSavings,
    savingsRate,
    totalTransfers,
    transactionCount: periodTxns.length,
    incomeCount: periodTxns.filter((t) => t.type === 'income').length,
    expenseCount: periodTxns.filter((t) => t.type === 'expense').length,
    transferCount: transfers.length,
  };
}

/**
 * Calculate Comprehensive Budget Utilization with Category Allocations & Thresholds
 */
export function calculateBudgetUtilizationSummary(
  allocatedBudget: number,
  expenses: Transaction[],
  categoryAllocations: Record<string, number> = {}
): BudgetUtilizationSummary {
  const actualSpent = calculateTotalExpenses(expenses);
  const remaining = calculateRemainingBudget(allocatedBudget, actualSpent);
  const utilizationPercentage = calculateBudgetUtilization(allocatedBudget, actualSpent);
  const isOverBudget = actualSpent > allocatedBudget;

  let thresholdReached: 0 | 50 | 75 | 90 | 100 | 110 = 0;
  if (utilizationPercentage >= 100) thresholdReached = 100;
  else if (utilizationPercentage >= 90) thresholdReached = 90;
  else if (utilizationPercentage >= 75) thresholdReached = 75;
  else if (utilizationPercentage >= 50) thresholdReached = 50;

  // Category breakdown
  const categorySpendingMap: Record<string, number> = {};
  expenses
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const catId = t.categoryId || 'uncategorized';
      categorySpendingMap[catId] = DecimalSafe.add(categorySpendingMap[catId] || 0, t.amount);
    });

  const categoryBreakdown: BudgetUtilizationSummary['categoryBreakdown'] = {};
  
  // Include both categories with allocations and categories with spending
  const allCategoryIds = Array.from(new Set([
    ...Object.keys(categoryAllocations),
    ...Object.keys(categorySpendingMap)
  ]));

  allCategoryIds.forEach((catId) => {
    const catAllocated = categoryAllocations[catId] || 0;
    const catSpent = categorySpendingMap[catId] || 0;
    const catRemaining = DecimalSafe.subtract(catAllocated, catSpent);
    const catUtilization = calculateBudgetUtilization(catAllocated, catSpent);

    categoryBreakdown[catId] = {
      allocated: catAllocated,
      spent: catSpent,
      remaining: catRemaining,
      utilizationPercentage: catUtilization,
      isOverBudget: catAllocated > 0 && catSpent > catAllocated,
    };
  });

  return {
    allocated: allocatedBudget,
    actualSpent,
    remaining,
    utilizationPercentage,
    isOverBudget,
    thresholdReached,
    categoryBreakdown,
  };
}
