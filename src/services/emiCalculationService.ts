/**
 * Centralized EMI & Outstanding Loan Management Engine
 * Provides mathematical amortization scheduling, reducing-balance principal/interest decomposition,
 * double-entry bank-to-EMI account transfer posting, bank balance checks, and audit trail logs.
 */

import {
  LoanAccount,
  EMIScheduleItem,
  Account,
  Transaction,
  PaymentFrequency,
} from '../types/finance';
import { DecimalSafe } from './calculationEngine';
import { generateTransactionId } from '../utils/formatters';

export interface BankWiseEmiAllocation {
  accountId: string;
  bankAccountId: string;
  bankName: string;
  bankAccountName: string;
  accountNumber?: string;
  currentBalance: number;
  currentAvailableBalance: number;
  monthlyEmiCommitment: number;
  monthlyDebitAmount: number;
  linkedLoansCount: number;
  loansCount: number;
  isBalanceSufficient: boolean;
  isSufficientForMonth: boolean;
  shortfallAmount: number;
}

export interface LoanPortfolioSummary {
  totalOriginalAmount: number;
  totalOriginalPrincipal: number;
  totalOutstandingLiability: number;
  totalOutstandingBalance: number;
  totalMonthlyEmiPayable: number;
  monthlyEmiPayable: number;
  totalEmiPaid: number;
  totalPrincipalRepaid: number;
  totalInterestPaid: number;
  activeLoansCount: number;
  closedLoansCount: number;
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  upcomingInstallments: (EMIScheduleItem & { loanName: string; lenderName: string; linkedBankName?: string })[];
  upcomingItems: (EMIScheduleItem & { loanName: string; lenderName: string; linkedBankName?: string })[];
  overdueInstallments: (EMIScheduleItem & { loanName: string; lenderName: string; linkedBankName?: string })[];
  overdueItems: (EMIScheduleItem & { loanName: string; lenderName: string; linkedBankName?: string })[];
  bankAllocations: BankWiseEmiAllocation[];
  bankWiseAllocations: BankWiseEmiAllocation[];
}

/**
 * Calculate Standard Fixed Monthly Installment (EMI) using Reducing Balance Formula:
 * EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
 */
export function calculateStandardEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualInterestRate <= 0) {
    return DecimalSafe.format(principal / tenureMonths);
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return DecimalSafe.format(emi);
}

/**
 * Generate Complete Amortization Schedule for an Outstanding Loan
 */
export function generateLoanSchedule(
  params: {
    loanId: string;
    originalAmount: number;
    interestRate: number;
    emiAmount: number;
    startDate: string; // YYYY-MM-DD
    totalTenureMonths: number;
    emiDueDay: number;
    paymentFrequency?: PaymentFrequency;
  },
  existingSchedule?: EMIScheduleItem[]
): EMIScheduleItem[] {
  const {
    loanId,
    originalAmount,
    interestRate,
    startDate,
    totalTenureMonths,
    emiDueDay,
  } = params;

  let emiAmount = params.emiAmount;
  if (!emiAmount || emiAmount <= 0) {
    emiAmount = calculateStandardEMI(originalAmount, interestRate, totalTenureMonths);
  }

  const schedule: EMIScheduleItem[] = [];
  const monthlyRate = interestRate > 0 ? interestRate / 12 / 100 : 0;
  let remainingPrincipal = originalAmount;

  const start = new Date(startDate);
  const todayStr = new Date().toISOString().split('T')[0];

  // Map of existing items by installment number for preserving paid history
  const existingMap = new Map<number, EMIScheduleItem>();
  if (existingSchedule && existingSchedule.length > 0) {
    existingSchedule.forEach((item) => existingMap.set(item.installmentNumber, item));
  }

  for (let i = 1; i <= totalTenureMonths; i++) {
    // Determine due date for this installment
    const dueDateObj = new Date(start.getFullYear(), start.getMonth() + i - 1, emiDueDay);
    // If date rolled over month boundary (e.g. Feb 31 -> Mar 3), cap to last day of month
    if (dueDateObj.getDate() !== emiDueDay) {
      dueDateObj.setDate(0);
    }
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    const existing = existingMap.get(i);
    if (existing && existing.status === 'paid') {
      schedule.push(existing);
      remainingPrincipal = Math.max(0, DecimalSafe.subtract(remainingPrincipal, existing.principalComponent));
      continue;
    }

    // Compute monthly interest component on remaining principal
    const interestComponent = DecimalSafe.format(remainingPrincipal * monthlyRate);
    
    // Principal component = EMI - Interest (or all remaining principal if last installment)
    let principalComponent = DecimalSafe.subtract(emiAmount, interestComponent);
    if (principalComponent > remainingPrincipal || i === totalTenureMonths) {
      principalComponent = remainingPrincipal;
    }
    if (principalComponent < 0) principalComponent = 0;

    const actualEmiAmount = DecimalSafe.add(principalComponent, interestComponent);
    remainingPrincipal = Math.max(0, DecimalSafe.subtract(remainingPrincipal, principalComponent));

    // Determine status
    let status: EMIScheduleItem['status'] = 'upcoming';
    if (dueDateStr < todayStr) {
      status = 'overdue';
    } else if (dueDateStr === todayStr) {
      status = 'due';
    }

    schedule.push({
      id: existing ? existing.id : `EMI-${loanId.substring(0, 8)}-${String(i).padStart(3, '0')}`,
      loanId,
      installmentNumber: i,
      dueDate: dueDateStr,
      emiAmount: actualEmiAmount,
      principalComponent,
      interestComponent,
      remainingBalance: remainingPrincipal,
      remainingPrincipal: remainingPrincipal,
      status,
      notes: existing?.notes,
    });
  }

  return schedule;
}

/**
 * Calculate comprehensive summary across all Outstanding Loans
 */
export function calculateLoanPortfolioSummary(
  loans: LoanAccount[],
  accounts: Account[]
): LoanPortfolioSummary {
  const activeLoans = loans.filter((l) => l.status === 'active');
  const closedLoans = loans.filter((l) => l.status === 'closed');

  let totalOriginal = 0;
  let totalOutstanding = 0;
  let totalMonthlyEmi = 0;
  let totalEmiPaid = 0;
  let totalPrincipalRepaid = 0;
  let totalInterestPaid = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let upcomingCount = 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const next30DaysStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const upcomingInstallments: LoanPortfolioSummary['upcomingInstallments'] = [];
  const overdueInstallments: LoanPortfolioSummary['overdueInstallments'] = [];

  const accountMap = new Map<string, Account>();
  accounts.forEach((acc) => accountMap.set(acc.id, acc));

  // Bank allocation accumulator
  const bankAllocationMap = new Map<string, { totalEmi: number; count: number }>();

  loans.forEach((loan) => {
    const orig = loan.originalPrincipal ?? loan.originalAmount ?? 0;
    const out = loan.currentOutstandingPrincipal ?? loan.outstandingPrincipal ?? 0;
    totalOriginal = DecimalSafe.add(totalOriginal, orig);
    totalOutstanding = DecimalSafe.add(totalOutstanding, out);
    if (loan.status === 'active') {
      totalMonthlyEmi = DecimalSafe.add(totalMonthlyEmi, loan.emiAmount);

      // Track bank commitments
      if (loan.linkedBankAccountId) {
        const current = bankAllocationMap.get(loan.linkedBankAccountId) || { totalEmi: 0, count: 0 };
        bankAllocationMap.set(loan.linkedBankAccountId, {
          totalEmi: DecimalSafe.add(current.totalEmi, loan.emiAmount),
          count: current.count + 1,
        });
      }
    }

    (loan.schedule || []).forEach((item) => {
      if (item.status === 'paid') {
        totalEmiPaid = DecimalSafe.add(totalEmiPaid, item.emiAmount);
        totalPrincipalRepaid = DecimalSafe.add(totalPrincipalRepaid, item.principalComponent);
        totalInterestPaid = DecimalSafe.add(totalInterestPaid, item.interestComponent);
      } else {
        const linkedBank = accountMap.get(loan.linkedBankAccountId);
        const itemWithMeta = {
          ...item,
          loanName: loan.loanName,
          lenderName: loan.lenderName,
          linkedBankName: linkedBank ? linkedBank.name : 'Unlinked',
        };

        if (item.dueDate < todayStr) {
          overdueCount++;
          overdueInstallments.push(itemWithMeta);
        } else if (item.dueDate === todayStr) {
          dueTodayCount++;
          upcomingInstallments.push(itemWithMeta);
        } else if (item.dueDate <= next30DaysStr) {
          upcomingCount++;
          upcomingInstallments.push(itemWithMeta);
        }
      }
    });
  });

  // Sort installments chronologically
  upcomingInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  overdueInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Prepare bank-wise allocations
  const bankAllocations: BankWiseEmiAllocation[] = [];
  bankAllocationMap.forEach((allocation, accountId) => {
    const acc = accountMap.get(accountId);
    if (acc) {
      const isSufficient = acc.balance >= allocation.totalEmi;
      bankAllocations.push({
        accountId,
        bankAccountId: accountId,
        bankName: acc.bankName || acc.name,
        bankAccountName: acc.bankName || acc.name,
        accountNumber: acc.accountNumber,
        currentBalance: acc.balance,
        currentAvailableBalance: acc.balance,
        monthlyEmiCommitment: allocation.totalEmi,
        monthlyDebitAmount: allocation.totalEmi,
        linkedLoansCount: allocation.count,
        loansCount: allocation.count,
        isBalanceSufficient: isSufficient,
        isSufficientForMonth: isSufficient,
        shortfallAmount: isSufficient ? 0 : DecimalSafe.subtract(allocation.totalEmi, acc.balance),
      });
    }
  });

  return {
    totalOriginalAmount: totalOriginal,
    totalOriginalPrincipal: totalOriginal,
    totalOutstandingLiability: totalOutstanding,
    totalOutstandingBalance: totalOutstanding,
    totalMonthlyEmiPayable: totalMonthlyEmi,
    monthlyEmiPayable: totalMonthlyEmi,
    totalEmiPaid,
    totalPrincipalRepaid,
    totalInterestPaid,
    activeLoansCount: activeLoans.length,
    closedLoansCount: closedLoans.length,
    overdueCount,
    dueTodayCount,
    upcomingCount,
    upcomingInstallments,
    upcomingItems: upcomingInstallments,
    overdueInstallments,
    overdueItems: overdueInstallments,
    bankAllocations,
    bankWiseAllocations: bankAllocations,
  };
}

/**
 * Execute Double-Entry EMI Accounting Posting:
 *
 * Example:
 * EMI Amount: ₹15,000 | Principal: ₹12,000 | Interest: ₹3,000
 *
 * Double-Entry Accounting Entries:
 * 1. Bank Account (Credit): -₹15,000 (Funds transfer from bank)
 * 2. Loan Principal Account (Debit): -₹12,000 liability reduction
 * 3. Interest Expense (Debit): +₹3,000 P&L expense
 */
export function prepareEmiPaymentEntries(params: {
  loan: LoanAccount;
  installmentId: string;
  sourceAccountId: string;
  paidDate?: string;
  notes?: string;
  createdBy?: string;
}): {
  updatedLoan: LoanAccount;
  transactionsToCreate: Omit<Transaction, 'id' | 'createdAt'>[];
  paidInstallment: EMIScheduleItem;
} {
  const { loan, installmentId, sourceAccountId, notes, createdBy } = params;
  const paidDate = params.paidDate || new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().substring(0, 5);

  const installmentIndex = loan.schedule.findIndex((item) => item.id === installmentId);
  if (installmentIndex === -1) {
    throw new Error(`Installment ${installmentId} not found in loan ${loan.id}`);
  }

  const item = loan.schedule[installmentIndex];
  if (item.status === 'paid') {
    throw new Error(`Installment #${item.installmentNumber} has already been recorded as paid.`);
  }

  // 1. Transaction A: Principal Payment / Liability Reduction (Transfer from Bank to Loan Account)
  // Debit Loan Principal: reduces outstanding loan balance
  // Credit Bank: reduces bank balance by principal portion
  const principalTxn: Omit<Transaction, 'id' | 'createdAt'> = {
    type: 'transfer',
    date: paidDate,
    time: nowTime,
    amount: item.principalComponent,
    accountId: sourceAccountId, // From Bank Account
    toAccountId: loan.accountId || `acc-loan-${loan.id}`, // To Loan Account
    categoryId: 'cat-loan',
    subcategory: `${loan.loanName} Principal`,
    description: `EMI Principal Repayment - ${loan.lenderName} (${loan.loanName}) Installment #${item.installmentNumber} [Ref: ${loan.accountReference}]`,
    paymentMethod: 'bank_transfer',
    vendor: loan.lenderName,
    notes: notes || `Installment #${item.installmentNumber} principal component`,
    tag: 'Loan Principal',
    isReconciled: true,
    createdBy: createdBy || 'EMI System',
  };

  // 2. Transaction B: Interest Expense (Recorded as Expense from Bank)
  // Debit Interest Expense (P&L expense)
  // Credit Bank: reduces bank balance by interest portion
  const interestTxn: Omit<Transaction, 'id' | 'createdAt'> = {
    type: 'expense',
    date: paidDate,
    time: nowTime,
    amount: item.interestComponent,
    accountId: sourceAccountId, // From Bank Account
    categoryId: 'cat-loan',
    subcategory: `${loan.loanName} Interest`,
    description: `EMI Interest Expense - ${loan.lenderName} (${loan.loanName}) Installment #${item.installmentNumber}`,
    paymentMethod: 'bank_transfer',
    vendor: loan.lenderName,
    notes: notes || `Installment #${item.installmentNumber} interest component`,
    tag: 'Tax Deductible Interest',
    isReconciled: true,
    createdBy: createdBy || 'EMI System',
  };

  // Total debited from Bank = Principal (12,000) + Interest (3,000) = ₹15,000 (EMI Amount)
  const transactionsToCreate = [principalTxn, interestTxn];

  // Update schedule item
  const updatedSchedule = [...loan.schedule];
  const updatedItem: EMIScheduleItem = {
    ...item,
    status: 'paid',
    paidDate,
    paidFromAccountId: sourceAccountId,
    notes: notes || item.notes,
  };
  updatedSchedule[installmentIndex] = updatedItem;

  // Reduce loan outstanding principal balance
  const newOutstanding = Math.max(0, DecimalSafe.subtract(loan.outstandingPrincipal, item.principalComponent));

  const updatedLoan: LoanAccount = {
    ...loan,
    outstandingPrincipal: newOutstanding,
    status: newOutstanding <= 0 ? 'closed' : 'active',
    updatedAt: new Date().toISOString(),
    schedule: updatedSchedule,
  };

  return {
    updatedLoan,
    transactionsToCreate,
    paidInstallment: updatedItem,
  };
}
