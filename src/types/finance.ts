export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'bank_transfer'
  | 'debit_card'
  | 'credit_card'
  | 'other';

export type AccountType = 'cash' | 'bank' | 'wallet' | 'credit_card' | 'loan' | 'emi_payable';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'yearly';
export type EMIPaymentStatus = 'upcoming' | 'due' | 'paid' | 'overdue';

export interface EMIScheduleItem {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  remainingBalance: number;
  remainingPrincipal: number; // Identical to remainingBalance
  status: EMIPaymentStatus;
  paidDate?: string; // YYYY-MM-DD
  paidFromAccountId?: string;
  transactionId?: string;
  interestTransactionId?: string;
  notes?: string;
}

export interface LoanAccount {
  id: string;
  accountId?: string; // Corresponding linked Account ID
  lenderName: string; // Bank / Lender / Financial Institution name
  accountReference: string; // Loan or Outstanding account reference #
  loanReference: string; // Identical to accountReference
  loanName: string; // e.g., Home Loan, Car Loan, Equipment EMI
  loanType: 'home' | 'vehicle' | 'personal' | 'business' | 'education' | 'other';
  originalAmount: number; // Original principal sanctioned
  originalPrincipal: number; // Identical to originalAmount
  outstandingPrincipal: number; // Current remaining principal liability
  currentOutstandingPrincipal: number; // Identical to outstandingPrincipal
  emiAmount: number; // Regular EMI payable
  interestRate: number; // Annual interest % (e.g. 8.5)
  interestRateAnnual: number; // Identical to interestRate
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  emiDueDay: number; // Day of the month (1-31)
  paymentFrequency: PaymentFrequency;
  linkedBankAccountId: string; // Bank account from which EMI is auto-debited / paid
  autoDebitApproved: boolean; // True to auto-post internal accounting transaction on due date
  status: 'active' | 'closed' | 'defaulted';
  totalTenureMonths: number;
  tenureMonths: number; // Identical to totalTenureMonths
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  schedule: EMIScheduleItem[];
}

export type UserRole = 'admin' | 'manager' | 'data_entry';
export type AccountKind = 'developer' | 'standard_user';

export interface UserProfile {
  id: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  role: UserRole;
  accountKind?: AccountKind;
  department?: string;
  notes?: string;
  avatarColor?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface CategoryBudgetAlert {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  spent: number;
  allocated: number;
  percentage: number;
  severity: 'danger' | 'warning'; // danger = >=100%, warning = >=80%
  varianceAmount: number; // excess amount if >=100% or remaining amount if <100%
  timestamp: string;
  dismissed?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  accountNumber?: string;
  bankName?: string;
  balance: number;
  initialBalance: number;
  color: string;
  creditLimit?: number; // for credit card
  notes?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'both';
  icon: string;
  color: string;
  subcategories: string[];
  monthlyBudget?: number;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  amount: number;
  categoryId: string;
  subcategory: string;
  description: string;
  paymentMethod: PaymentMethod;
  accountId: string; // Source account
  toAccountId?: string; // Destination account for transfers
  vendor: string; // Person, merchant, business
  receiptUrl?: string; // base64 or object URL
  receiptName?: string;
  notes?: string;
  tag?: string; // e.g. Tax Deductible, Reconciled, Business, Personal, Reversal
  isReconciled?: boolean;
  createdBy?: string; // User ID / Name
  createdAt: string;
  updatedAt?: string;
}

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface BudgetRecord {
  id: string;
  name: string;
  period: BudgetPeriod;
  startDate?: string;
  endDate?: string;
  allocatedAmount: number;
  categoryBudgets: Record<string, number>; // categoryId -> allocated limit
  alertThresholds: number[]; // e.g. [50, 75, 90, 100]
  notes?: string;
  updatedAt?: string;
}

export interface BudgetConfig {
  dailyBudget: number;
  weeklyBudget: number;
  monthlyBudget: number;
  yearlyBudget: number;
  categoryBudgets: Record<string, number>; // categoryId -> monthly limit
  activeBudgets?: BudgetRecord[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: string;
  color: string;
  notes?: string;
  updatedAt?: string;
}

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  subcategory: string;
  accountId: string;
  toAccountId?: string;
  paymentMethod: PaymentMethod;
  vendor: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfPeriod: number; // e.g. 1st of month, or 5th
  nextDueDate: string; // YYYY-MM-DD
  active: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface DebtRecord {
  id: string;
  personName: string;
  type: 'lent' | 'borrowed'; // lent = receivable (Got / Diya), borrowed = payable (Gave / Liya)
  amount: number;
  settledAmount: number;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  description: string;
  contact?: string; // Phone number for Khatabook WhatsApp/SMS reminder
  status: 'pending' | 'partially_paid' | 'settled';
  accountId?: string;
  khatabookPartyType?: 'customer' | 'supplier'; // Khatabook party mapping
  khatabookRefId?: string; // External Khatabook entry ID or reference
  syncSource?: 'local' | 'khatabook_import' | 'manual';
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'REVERSAL' | 'LOGIN' | 'SETTLE' | 'TEST' | 'EMI_PAYMENT' | 'LOAN_CREATE' | 'LOAN_UPDATE';
  entityType: 'TRANSACTION' | 'BUDGET' | 'ACCOUNT' | 'CATEGORY' | 'DEBT' | 'USER' | 'SYSTEM' | 'LOAN' | 'EMI';
  entityId: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface AppSettings {
  currencySymbol: string;
  dateFormat: string;
  darkMode: boolean;
  pinLockEnabled: boolean;
  securityPin?: string;
  userName?: string;
  businessName?: string;
  userEmail?: string;
  userPhone?: string;
  cloudSyncEnabled: boolean;
  autoSyncIntervalMs?: number;
}

export interface FinancialDataBackup {
  version: string;
  exportDate: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  budget: BudgetConfig;
  budgets?: BudgetRecord[];
  savingsGoals: SavingsGoal[];
  recurring: RecurringTransaction[];
  debts: DebtRecord[];
  loans?: LoanAccount[];
  settings: AppSettings;
  auditLogs?: AuditLog[];
}

export interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  category: 'arithmetic' | 'balance' | 'budget' | 'rbac' | 'duplicate' | 'sync';
  status: 'passed' | 'failed' | 'pending';
  executionTimeMs: number;
  details?: string;
  error?: string;
}
