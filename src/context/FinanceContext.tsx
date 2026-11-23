import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import {
  Transaction,
  Account,
  Category,
  BudgetConfig,
  BudgetRecord,
  SavingsGoal,
  RecurringTransaction,
  DebtRecord,
  AppSettings,
  FinancialDataBackup,
  AuditLog,
  LoanAccount,
  EMIScheduleItem,
} from '../types/finance';
import {
  INITIAL_FINANCIAL_DATA,
  INITIAL_CATEGORIES,
  INITIAL_BUDGET,
  INITIAL_SETTINGS,
} from '../utils/defaults';
import { generateTransactionId } from '../utils/formatters';
import {
  reconcileAccountBalances,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetSavings,
  calculateAvailableBalance,
  calculatePeriodSummary,
  calculateBudgetUtilizationSummary,
  DecimalSafe,
  PeriodFinancialSummary,
  BudgetUtilizationSummary,
} from '../services/calculationEngine';
import {
  calculateLoanPortfolioSummary,
  generateLoanSchedule,
  prepareEmiPaymentEntries,
  LoanPortfolioSummary,
} from '../services/emiCalculationService';
import {
  SyncService,
  SyncLinkConfig,
  SyncTarget,
  SyncResultStats,
} from '../services/syncService';
import { useAuth } from './AuthContext';

export type SyncState = 'local' | 'synced' | 'syncing' | 'offline' | 'error';

interface FinanceContextType {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  budget: BudgetConfig;
  budgets: BudgetRecord[];
  savingsGoals: SavingsGoal[];
  recurring: RecurringTransaction[];
  debts: DebtRecord[];
  loans: LoanAccount[];
  loanSummary: LoanPortfolioSummary;
  totalLoanLiability: number;
  totalMonthlyEmiPayable: number;
  totalEmiPaid: number;
  totalPrincipalRepaid: number;
  totalInterestPaid: number;
  upcomingEmis: (EMIScheduleItem & { loanName: string; lenderName: string; linkedBankName?: string })[];
  overdueEmis: (EMIScheduleItem & { loanName: string; lenderName: string; linkedBankName?: string })[];
  settings: AppSettings;
  auditLogs: AuditLog[];
  isUnlocked: boolean;
  syncState: SyncState;
  pendingSyncCount: number;
  syncLinkConfig: SyncLinkConfig;
  activeSyncTarget: SyncTarget;
  lastSyncStats: SyncResultStats | null;
  lastSyncError: string | null;

  // Real-time Centralized Financial Computations
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  netSavings: number;
  monthlySummary: PeriodFinancialSummary;
  yearlySummary: PeriodFinancialSummary;
  budgetUtilization: BudgetUtilizationSummary;

  // Actions
  addTransaction: (txn: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  addTransactionsBatch: (txns: Omit<Transaction, 'id' | 'createdAt'>[]) => Transaction[];
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (id: string) => Transaction;

  addAccount: (account: Omit<Account, 'id' | 'balance'>) => Account;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  transferFunds: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    time: string,
    description: string,
    notes?: string
  ) => Transaction;

  addCategory: (category: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  updateBudgetConfig: (config: Partial<BudgetConfig>) => void;
  updateBudget: (config: Partial<BudgetConfig>) => void;
  addBudgetRecord: (record: Omit<BudgetRecord, 'id'>) => BudgetRecord;
  updateBudgetRecord: (id: string, updates: Partial<BudgetRecord>) => void;
  deleteBudgetRecord: (id: string) => void;

  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => SavingsGoal;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;

  addRecurring: (rec: Omit<RecurringTransaction, 'id'>) => RecurringTransaction;
  updateRecurring: (id: string, updates: Partial<RecurringTransaction>) => void;
  deleteRecurring: (id: string) => void;
  executeRecurring: (id: string) => Transaction | null;

  addDebt: (debt: Omit<DebtRecord, 'id'>) => DebtRecord;
  updateDebt: (id: string, updates: Partial<DebtRecord>) => void;
  settleDebt: (id: string, amount: number, accountId?: string) => void;
  deleteDebt: (id: string) => void;
  importDebtsBatch: (newDebts: Array<Omit<DebtRecord, 'id'>>) => number;

  // Loan & EMI Payable Management
  addLoanAccount: (loan: Omit<LoanAccount, 'id' | 'createdAt' | 'updatedAt' | 'schedule'>) => LoanAccount;
  updateLoanAccount: (id: string, updates: Partial<LoanAccount>) => void;
  deleteLoanAccount: (id: string) => void;
  payEmiInstallment: (params: {
    loanId: string;
    installmentId: string;
    sourceAccountId?: string;
    paidDate?: string;
    notes?: string;
  }) => { success: boolean; message: string };
  processDueEmis: () => { processedCount: number; messages: string[] };

  updateSettings: (settings: Partial<AppSettings>) => void;
  unlockApp: (pin: string) => boolean;
  lockApp: () => void;

  triggerCloudSync: () => Promise<SyncResultStats | null>;
  createSyncRoom: (passcode?: string) => Promise<{ roomCode: string; hasPasscode: boolean }>;
  joinSyncRoom: (roomCode: string, passcode?: string) => Promise<SyncResultStats | null>;
  disconnectSyncRoom: () => void;
  linkGoogleAccountSync: () => Promise<SyncResultStats | null>;
  importFinancialData: (data: FinancialDataBackup) => boolean;
  exportFinancialData: () => void;
}

const STORAGE_KEY = 'dhanvault_financial_data_v1';
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile, currentUser, role, signInWithGoogle } = useAuth();
  const currentUserId = userProfile?.id || 'dev_admin_naseer';

  // Load existing persisted data from LocalStorage (non-destructive, never injects sample data)
  const [data, setData] = useState<FinancialDataBackup>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('dhanvault_financial_backup_safe');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.transactions) {
          return {
            ...parsed,
            categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : INITIAL_CATEGORIES,
            budget: parsed.budget || INITIAL_BUDGET,
            budgets: parsed.budgets || parsed.budget?.activeBudgets || [],
            loans: Array.isArray(parsed.loans) ? parsed.loans : [],
            settings: parsed.settings || INITIAL_SETTINGS,
            auditLogs: parsed.auditLogs || [],
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse financial data from localStorage, attempting safe recovery:', e);
      try {
        const fallback = localStorage.getItem('dhanvault_financial_backup_safe');
        if (fallback) {
          const parsedFallback = JSON.parse(fallback);
          if (parsedFallback.transactions) {
            return {
              ...parsedFallback,
              loans: Array.isArray(parsedFallback.loans) ? parsedFallback.loans : [],
              auditLogs: parsedFallback.auditLogs || [],
            };
          }
        }
      } catch {}
    }
    return {
      ...INITIAL_FINANCIAL_DATA,
      budgets: [],
      loans: [],
      auditLogs: [],
    };
  });

  const dataRef = useRef<FinancialDataBackup>(data);
  dataRef.current = data;

  const [syncLinkConfig, setSyncLinkConfig] = useState<SyncLinkConfig>(() =>
    SyncService.getSyncLinkConfig()
  );
  const [syncState, setSyncState] = useState<SyncState>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'local'
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    SyncService.getQueue().length
  );
  const [lastSyncStats, setLastSyncStats] = useState<SyncResultStats | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !data.settings.pinLockEnabled);
  const isSyncInFlightRef = useRef<boolean>(false);
  const suppressNextAutoPushRef = useRef<boolean>(false);

  const activeSyncTarget = useMemo(
    () => SyncService.resolveSyncTarget(syncLinkConfig, currentUserId),
    [syncLinkConfig, currentUserId]
  );

  // Sync to localStorage immediately on any change & preserve safe backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (data.transactions && data.transactions.length > 0) {
        localStorage.setItem('dhanvault_financial_backup_safe', JSON.stringify(data));
      }
      const qLen = SyncService.getQueue().length;
      setPendingSyncCount(qLen);
      if (qLen > 0 && !suppressNextAutoPushRef.current) {
        if (!navigator.onLine) {
          setSyncState('offline');
        } else if (syncLinkConfig.mode === 'local') {
          setSyncState('local');
        }
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [data, syncLinkConfig.mode]);

  // Core bidirectional sync runner (non-destructive timestamp merge)
  const runBidirectionalSync = useCallback(
    async (overrideTarget?: SyncTarget): Promise<SyncResultStats | null> => {
      if (!navigator.onLine) {
        setSyncState('offline');
        setLastSyncError('You are offline. Changes are saved locally and will sync when reconnected.');
        return null;
      }
      if (isSyncInFlightRef.current) return null;

      const target = overrideTarget || activeSyncTarget;
      isSyncInFlightRef.current = true;
      setSyncState('syncing');
      setLastSyncError(null);

      try {
        const { mergedData, stats } = await SyncService.fullBidirectionalSync(
          target,
          dataRef.current
        );

        suppressNextAutoPushRef.current = true;
        setData(mergedData);
        setTimeout(() => {
          suppressNextAutoPushRef.current = false;
        }, 500);

        setLastSyncStats(stats);
        setPendingSyncCount(SyncService.getQueue().length);
        setSyncState('synced');

        setSyncLinkConfig((prev) => {
          const next = { ...prev, lastSyncedAt: stats.syncedAt };
          SyncService.saveSyncLinkConfig(next);
          return next;
        });

        return stats;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Cloud sync failed';
        console.warn('[FinanceContext] Cloud sync warning:', msg);
        setLastSyncError(msg);
        setSyncState(navigator.onLine ? 'error' : 'offline');
        return null;
      } finally {
        isSyncInFlightRef.current = false;
      }
    },
    [activeSyncTarget]
  );

  // Auto-link Google account when user signs in with a real Firebase Google account
  useEffect(() => {
    const isGoogleProvider = currentUser?.providerData?.some(
      (p) => p.providerId === 'google.com'
    );
    if (isGoogleProvider && currentUser?.uid && syncLinkConfig.mode === 'local') {
      const nextConfig: SyncLinkConfig = {
        mode: 'google',
        googleUid: currentUser.uid,
        googleEmail: currentUser.email || undefined,
        googleDisplayName: currentUser.displayName || undefined,
      };
      setSyncLinkConfig(nextConfig);
      SyncService.saveSyncLinkConfig(nextConfig);
    }
  }, [currentUser, syncLinkConfig.mode]);

  // Real-time subscription & initial pull when linked to a 6-digit Sync Room or Google Account
  useEffect(() => {
    if (syncLinkConfig.mode === 'local') return;
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }

    // Initial bidirectional pull & merge on mount/link change
    void runBidirectionalSync(activeSyncTarget);

    // Real-time listener for updates from Mobile <-> Desktop peers
    const unsubscribe = SyncService.subscribeToSyncHeartbeat(
      activeSyncTarget,
      () => {
        void runBidirectionalSync(activeSyncTarget);
      },
      () => {
        // Non-fatal listener warning; manual Sync Now remains available
      }
    );

    return () => {
      unsubscribe();
    };
  }, [syncLinkConfig.mode, syncLinkConfig.roomCode, syncLinkConfig.googleUid, activeSyncTarget, runBidirectionalSync]);

  // Debounced background push when linked (Room or Google) and user makes changes online
  useEffect(() => {
    if (syncLinkConfig.mode === 'local' || !navigator.onLine || suppressNextAutoPushRef.current) {
      return;
    }
    const qLen = SyncService.getQueue().length;
    if (qLen === 0) return;

    const timer = setTimeout(async () => {
      if (!navigator.onLine || isSyncInFlightRef.current) return;
      setSyncState('syncing');
      try {
        await SyncService.processQueue(activeSyncTarget);
        setPendingSyncCount(SyncService.getQueue().length);
        setSyncState('synced');
      } catch {
        setSyncState('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [data, syncLinkConfig.mode, activeSyncTarget]);

  // Online / Offline network listeners (auto-merge offline changes on reconnect)
  useEffect(() => {
    const handleOnline = async () => {
      if (syncLinkConfig.mode !== 'local' || SyncService.getQueue().length > 0) {
        await runBidirectionalSync();
      } else {
        setSyncState('local');
      }
    };

    const handleOffline = () => {
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncState('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncLinkConfig.mode, runBidirectionalSync]);

  // Handle Dark mode class
  useEffect(() => {
    if (data.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.settings.darkMode]);

  // Reconcile Account Balances using centralized calculation engine
  const accountsWithLiveBalances = useMemo(() => {
    return reconcileAccountBalances(data.accounts, data.transactions);
  }, [data.accounts, data.transactions]);

  // Real-time Global Totals
  const totalIncome = useMemo(() => calculateTotalIncome(data.transactions), [data.transactions]);
  const totalExpenses = useMemo(() => calculateTotalExpenses(data.transactions), [data.transactions]);
  const netSavings = useMemo(() => calculateNetSavings(totalIncome, totalExpenses), [totalIncome, totalExpenses]);
  const availableBalance = useMemo(() => calculateAvailableBalance(accountsWithLiveBalances), [accountsWithLiveBalances]);

  // Current Month Summary
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = `${currentMonth}-01`;
    const endOfMonth = `${currentMonth}-31`;
    return calculatePeriodSummary(data.transactions, accountsWithLiveBalances, startOfMonth, endOfMonth);
  }, [data.transactions, accountsWithLiveBalances]);

  // Current Year Summary
  const yearlySummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;
    return calculatePeriodSummary(data.transactions, accountsWithLiveBalances, startOfYear, endOfYear);
  }, [data.transactions, accountsWithLiveBalances]);

  // Active Monthly Budget Utilization Summary
  const budgetUtilization = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyExpenses = data.transactions.filter(
      (t) => t.type === 'expense' && t.date.startsWith(currentMonth)
    );
    return calculateBudgetUtilizationSummary(
      data.budget.monthlyBudget,
      monthlyExpenses,
      data.budget.categoryBudgets
    );
  }, [data.transactions, data.budget]);

  // Centralized Loan & EMI Portfolio Computations
  const loanSummary = useMemo(() => {
    return calculateLoanPortfolioSummary(data.loans || [], accountsWithLiveBalances);
  }, [data.loans, accountsWithLiveBalances]);

  const totalLoanLiability = loanSummary.totalOutstandingLiability;
  const totalMonthlyEmiPayable = loanSummary.totalMonthlyEmiPayable;
  const totalEmiPaid = loanSummary.totalEmiPaid;
  const totalPrincipalRepaid = loanSummary.totalPrincipalRepaid;
  const totalInterestPaid = loanSummary.totalInterestPaid;
  const upcomingEmis = loanSummary.upcomingInstallments;
  const overdueEmis = loanSummary.overdueInstallments;

  // Auto-process due EMIs on due date when user configured autoDebitApproved
  useEffect(() => {
    const timer = setTimeout(() => {
      processDueEmis();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Trigger manual one-click bidirectional cloud sync
  const triggerCloudSync = async (): Promise<SyncResultStats | null> => {
    return await runBidirectionalSync();
  };

  // Create a new 6-digit Sync Room and immediately push & link this device
  const createSyncRoom = async (
    passcode?: string
  ): Promise<{ roomCode: string; hasPasscode: boolean }> => {
    const created = await SyncService.createSyncRoom(passcode);
    const nextConfig: SyncLinkConfig = {
      mode: 'room',
      roomCode: created.roomCode,
      hasPasscode: created.hasPasscode,
    };
    setSyncLinkConfig(nextConfig);
    SyncService.saveSyncLinkConfig(nextConfig);

    const newTarget = SyncService.resolveSyncTarget(nextConfig, currentUserId);
    await runBidirectionalSync(newTarget);
    return created;
  };

  // Join an existing 6-digit Sync Room and merge records immediately by timestamp
  const joinSyncRoom = async (
    roomCode: string,
    passcode?: string
  ): Promise<SyncResultStats | null> => {
    const verified = await SyncService.verifyAndJoinSyncRoom(roomCode, passcode);
    const nextConfig: SyncLinkConfig = {
      mode: 'room',
      roomCode: verified.roomCode,
      hasPasscode: verified.hasPasscode,
    };
    setSyncLinkConfig(nextConfig);
    SyncService.saveSyncLinkConfig(nextConfig);

    const newTarget = SyncService.resolveSyncTarget(nextConfig, currentUserId);
    return await runBidirectionalSync(newTarget);
  };

  // Unlink Sync Room / Google Cloud link without touching local financial data
  const disconnectSyncRoom = () => {
    const nextConfig: SyncLinkConfig = { mode: 'local' };
    setSyncLinkConfig(nextConfig);
    SyncService.saveSyncLinkConfig(nextConfig);
    setSyncState(navigator.onLine ? 'local' : 'offline');
    setLastSyncError(null);
  };

  // Sign in with Google and immediately link & bidirectional-sync financial data
  const linkGoogleAccountSync = async (): Promise<SyncResultStats | null> => {
    const profile = await signInWithGoogle();
    const nextConfig: SyncLinkConfig = {
      mode: 'google',
      googleUid: profile.id,
      googleEmail: profile.email,
      googleDisplayName: profile.displayName,
    };
    setSyncLinkConfig(nextConfig);
    SyncService.saveSyncLinkConfig(nextConfig);

    const newTarget = SyncService.resolveSyncTarget(nextConfig, profile.id);
    return await runBidirectionalSync(newTarget);
  };

  // ------------------- Transaction Actions -------------------

  const addTransaction = (txn: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
    const id = generateTransactionId(txn.date);
    const newTxn: Transaction = {
      ...txn,
      id,
      amount: DecimalSafe.format(txn.amount),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userProfile?.displayName || 'User',
    };

    setData((prev) => ({
      ...prev,
      transactions: [newTxn, ...prev.transactions],
    }));

    SyncService.enqueueMutation('transactions', id, 'set', newTxn);
    SyncService.recordAuditLog(
      currentUserId,
      'CREATE',
      'TRANSACTION',
      id,
      userProfile?.displayName || 'User',
      `Created ${newTxn.type} of ₹${newTxn.amount.toFixed(2)} (${newTxn.description})`
    );

    return newTxn;
  };

  const addTransactionsBatch = (txns: Omit<Transaction, 'id' | 'createdAt'>[]): Transaction[] => {
    const createdList: Transaction[] = [];
    const timestamp = new Date().toISOString();

    const createdTxns = txns.map((txn, index) => {
      const id = generateTransactionId(txn.date) + `-${index}`;
      const newTxn: Transaction = {
        ...txn,
        id,
        amount: DecimalSafe.format(txn.amount),
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userProfile?.displayName || 'User',
      };
      createdList.push(newTxn);
      SyncService.enqueueMutation('transactions', id, 'set', newTxn);
      return newTxn;
    });

    setData((prev) => ({
      ...prev,
      transactions: [...createdTxns, ...prev.transactions],
    }));

    SyncService.recordAuditLog(
      currentUserId,
      'CREATE',
      'TRANSACTION',
      `BATCH-${Date.now()}`,
      userProfile?.displayName || 'User',
      `Batch imported ${createdTxns.length} transactions via CSV`
    );

    return createdTxns;
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setData((prev) => {
      const updated = prev.transactions.map((t) => {
        if (t.id === id) {
          const finalAmt = updates.amount !== undefined ? DecimalSafe.format(updates.amount) : t.amount;
          const merged: Transaction = {
            ...t,
            ...updates,
            amount: finalAmt,
            updatedAt: new Date().toISOString(),
          };
          SyncService.enqueueMutation('transactions', id, 'set', merged);
          return merged;
        }
        return t;
      });
      return { ...prev, transactions: updated };
    });

    SyncService.recordAuditLog(
      currentUserId,
      'UPDATE',
      'TRANSACTION',
      id,
      userProfile?.displayName || 'User',
      `Updated transaction record details`
    );
  };

  const deleteTransaction = (id: string) => {
    if (role === 'data_entry') {
      alert('Access Denied: Data Entry Operators cannot delete financial transactions. Contact an Administrator.');
      return;
    }

    const txnToDelete = data.transactions.find((t) => t.id === id);
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));

    SyncService.enqueueMutation('transactions', id, 'delete');
    if (txnToDelete) {
      SyncService.recordAuditLog(
        currentUserId,
        'DELETE',
        'TRANSACTION',
        id,
        userProfile?.displayName || 'User',
        `Deleted ${txnToDelete.type} record of ₹${txnToDelete.amount.toFixed(2)}`
      );
    }
  };

  const duplicateTransaction = (id: string): Transaction => {
    const existing = data.transactions.find((t) => t.id === id);
    if (!existing) throw new Error('Transaction not found');
    const today = new Date().toISOString().split('T')[0];
    return addTransaction({
      ...existing,
      date: today,
      description: `${existing.description} (Copy)`,
    });
  };

  // ------------------- Account Actions -------------------

  const addAccount = (account: Omit<Account, 'id' | 'balance'>): Account => {
    const id = `acc-${Date.now().toString(36)}`;
    const newAcc: Account = {
      ...account,
      id,
      initialBalance: DecimalSafe.format(account.initialBalance),
      balance: DecimalSafe.format(account.initialBalance),
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAcc],
    }));

    SyncService.enqueueMutation('accounts', id, 'set', newAcc);
    SyncService.recordAuditLog(
      currentUserId,
      'CREATE',
      'ACCOUNT',
      id,
      userProfile?.displayName || 'User',
      `Added account ${newAcc.name} with opening balance ₹${newAcc.initialBalance.toFixed(2)}`
    );

    return newAcc;
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => {
        if (a.id === id) {
          const merged: Account = {
            ...a,
            ...updates,
            initialBalance:
              updates.initialBalance !== undefined
                ? DecimalSafe.format(updates.initialBalance)
                : a.initialBalance,
            updatedAt: new Date().toISOString(),
          };
          SyncService.enqueueMutation('accounts', id, 'set', merged);
          return merged;
        }
        return a;
      }),
    }));
  };

  const deleteAccount = (id: string) => {
    if (role === 'data_entry') {
      alert('Access Denied: Only Managers and Admins can delete financial accounts.');
      return;
    }
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== id),
    }));
    SyncService.enqueueMutation('accounts', id, 'delete');
  };

  const transferFunds = (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    time: string,
    description: string,
    notes?: string
  ): Transaction => {
    const fromAcc = accountsWithLiveBalances.find((a) => a.id === fromAccountId);
    const toAcc = accountsWithLiveBalances.find((a) => a.id === toAccountId);

    const safeAmt = DecimalSafe.format(amount);
    const txn = addTransaction({
      type: 'transfer',
      date,
      time,
      amount: safeAmt,
      categoryId: 'cat-transfer',
      subcategory: 'Inter-Account Transfer',
      description: description || `Transfer: ${fromAcc?.name} -> ${toAcc?.name}`,
      paymentMethod: 'bank_transfer',
      accountId: fromAccountId,
      toAccountId,
      vendor: `${fromAcc?.name || 'Account'} to ${toAcc?.name || 'Account'}`,
      notes,
      tag: 'Internal Transfer',
    });

    SyncService.recordAuditLog(
      currentUserId,
      'TRANSFER',
      'TRANSACTION',
      txn.id,
      userProfile?.displayName || 'User',
      `Transferred ₹${safeAmt.toFixed(2)} from ${fromAcc?.name} to ${toAcc?.name}`
    );

    return txn;
  };

  // ------------------- Category Actions -------------------

  const addCategory = (category: Omit<Category, 'id'>): Category => {
    const id = `cat-${Date.now().toString(36)}`;
    const newCat: Category = {
      ...category,
      id,
      monthlyBudget: category.monthlyBudget ? DecimalSafe.format(category.monthlyBudget) : undefined,
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));

    SyncService.enqueueMutation('categories', id, 'set', newCat);
    return newCat;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        if (c.id === id) {
          const merged: Category = {
            ...c,
            ...updates,
            monthlyBudget:
              updates.monthlyBudget !== undefined
                ? DecimalSafe.format(updates.monthlyBudget)
                : c.monthlyBudget,
            updatedAt: new Date().toISOString(),
          };
          SyncService.enqueueMutation('categories', id, 'set', merged);
          return merged;
        }
        return c;
      }),
    }));
  };

  const deleteCategory = (id: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
    SyncService.enqueueMutation('categories', id, 'delete');
  };

  // ------------------- Budget Management Actions -------------------

  const updateBudgetConfig = (config: Partial<BudgetConfig>) => {
    if (role === 'data_entry') {
      alert('Access Denied: Data Entry Operators cannot alter budget allocation.');
      return;
    }

    setData((prev) => {
      const updated: BudgetConfig = {
        ...prev.budget,
        ...config,
        dailyBudget: config.dailyBudget !== undefined ? DecimalSafe.format(config.dailyBudget) : prev.budget.dailyBudget,
        weeklyBudget: config.weeklyBudget !== undefined ? DecimalSafe.format(config.weeklyBudget) : prev.budget.weeklyBudget,
        monthlyBudget: config.monthlyBudget !== undefined ? DecimalSafe.format(config.monthlyBudget) : prev.budget.monthlyBudget,
        yearlyBudget: config.yearlyBudget !== undefined ? DecimalSafe.format(config.yearlyBudget) : prev.budget.yearlyBudget,
      };
      SyncService.enqueueMutation('meta', 'budget_config', 'set', updated);
      return { ...prev, budget: updated };
    });

    SyncService.recordAuditLog(
      currentUserId,
      'UPDATE',
      'BUDGET',
      'master-budget',
      userProfile?.displayName || 'User',
      'Updated master budget thresholds and limits'
    );
  };

  const addBudgetRecord = (record: Omit<BudgetRecord, 'id'>): BudgetRecord => {
    const id = `bgt-${Date.now().toString(36)}`;
    const newRecord: BudgetRecord = {
      ...record,
      id,
      allocatedAmount: DecimalSafe.format(record.allocatedAmount),
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => {
      const activeBudgets = [...(prev.budgets || []), newRecord];
      return {
        ...prev,
        budgets: activeBudgets,
        budget: { ...prev.budget, activeBudgets },
      };
    });

    SyncService.enqueueMutation('budgets', id, 'set', newRecord);
    return newRecord;
  };

  const updateBudgetRecord = (id: string, updates: Partial<BudgetRecord>) => {
    setData((prev) => {
      const updatedList = (prev.budgets || []).map((b) => {
        if (b.id === id) {
          const merged: BudgetRecord = {
            ...b,
            ...updates,
            allocatedAmount:
              updates.allocatedAmount !== undefined
                ? DecimalSafe.format(updates.allocatedAmount)
                : b.allocatedAmount,
            updatedAt: new Date().toISOString(),
          };
          SyncService.enqueueMutation('budgets', id, 'set', merged);
          return merged;
        }
        return b;
      });
      return {
        ...prev,
        budgets: updatedList,
        budget: { ...prev.budget, activeBudgets: updatedList },
      };
    });
  };

  const deleteBudgetRecord = (id: string) => {
    setData((prev) => {
      const updatedList = (prev.budgets || []).filter((b) => b.id !== id);
      return {
        ...prev,
        budgets: updatedList,
        budget: { ...prev.budget, activeBudgets: updatedList },
      };
    });
    SyncService.enqueueMutation('budgets', id, 'delete');
  };

  // ------------------- Savings Goal Actions -------------------

  const addSavingsGoal = (goal: Omit<SavingsGoal, 'id'>): SavingsGoal => {
    const id = `goal-${Date.now().toString(36)}`;
    const newGoal: SavingsGoal = {
      ...goal,
      id,
      targetAmount: DecimalSafe.format(goal.targetAmount),
      currentAmount: DecimalSafe.format(goal.currentAmount),
      updatedAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, savingsGoals: [...prev.savingsGoals, newGoal] }));
    SyncService.enqueueMutation('savings', id, 'set', newGoal);
    return newGoal;
  };

  const updateSavingsGoal = (id: string, updates: Partial<SavingsGoal>) => {
    setData((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((g) => {
        if (g.id === id) {
          const merged = { ...g, ...updates, updatedAt: new Date().toISOString() };
          SyncService.enqueueMutation('savings', id, 'set', merged);
          return merged;
        }
        return g;
      }),
    }));
  };

  const deleteSavingsGoal = (id: string) => {
    setData((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter((g) => g.id !== id),
    }));
    SyncService.enqueueMutation('savings', id, 'delete');
  };

  // ------------------- Recurring Actions -------------------

  const addRecurring = (rec: Omit<RecurringTransaction, 'id'>): RecurringTransaction => {
    const id = `rec-${Date.now().toString(36)}`;
    const newRec: RecurringTransaction = {
      ...rec,
      id,
      amount: DecimalSafe.format(rec.amount),
      updatedAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, recurring: [...prev.recurring, newRec] }));
    SyncService.enqueueMutation('recurring', id, 'set', newRec);
    return newRec;
  };

  const updateRecurring = (id: string, updates: Partial<RecurringTransaction>) => {
    setData((prev) => ({
      ...prev,
      recurring: prev.recurring.map((r) => {
        if (r.id === id) {
          const merged = { ...r, ...updates, updatedAt: new Date().toISOString() };
          SyncService.enqueueMutation('recurring', id, 'set', merged);
          return merged;
        }
        return r;
      }),
    }));
  };

  const deleteRecurring = (id: string) => {
    setData((prev) => ({
      ...prev,
      recurring: prev.recurring.filter((r) => r.id !== id),
    }));
    SyncService.enqueueMutation('recurring', id, 'delete');
  };

  const executeRecurring = (id: string): Transaction | null => {
    const rec = data.recurring.find((r) => r.id === id);
    if (!rec) return null;

    const today = new Date().toISOString().split('T')[0];
    const txn = addTransaction({
      type: rec.type,
      date: today,
      time: '09:00',
      amount: rec.amount,
      categoryId: rec.categoryId,
      subcategory: rec.subcategory,
      description: rec.title,
      paymentMethod: rec.paymentMethod,
      accountId: rec.accountId,
      toAccountId: rec.toAccountId,
      vendor: rec.vendor,
      notes: `Auto-generated recurring execution (${rec.frequency})`,
      tag: 'Recurring Bill',
    });

    // Advance nextDueDate
    const nextDate = new Date(rec.nextDueDate);
    if (rec.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    else if (rec.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (rec.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (rec.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

    updateRecurring(id, { nextDueDate: nextDate.toISOString().split('T')[0] });
    return txn;
  };

  // ------------------- Debt Actions -------------------

  const addDebt = (debt: Omit<DebtRecord, 'id'>): DebtRecord => {
    const id = `debt-${Date.now().toString(36)}`;
    const newDebt: DebtRecord = {
      ...debt,
      id,
      amount: DecimalSafe.format(debt.amount),
      settledAmount: DecimalSafe.format(debt.settledAmount || 0),
      updatedAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, debts: [...prev.debts, newDebt] }));
    SyncService.enqueueMutation('debts', id, 'set', newDebt);
    return newDebt;
  };

  const updateDebt = (id: string, updates: Partial<DebtRecord>) => {
    setData((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => {
        if (d.id === id) {
          const merged = { ...d, ...updates, updatedAt: new Date().toISOString() };
          SyncService.enqueueMutation('debts', id, 'set', merged);
          return merged;
        }
        return d;
      }),
    }));
  };

  const settleDebt = (id: string, settleAmount: number, accountId?: string) => {
    const debt = data.debts.find((d) => d.id === id);
    if (!debt) return;

    const safeSettle = DecimalSafe.format(settleAmount);
    const newSettledAmount = DecimalSafe.add(debt.settledAmount, safeSettle);
    const newStatus: DebtRecord['status'] =
      newSettledAmount >= debt.amount ? 'settled' : 'partially_paid';

    updateDebt(id, {
      settledAmount: newSettledAmount,
      status: newStatus,
    });

    // Record cash-flow transaction
    const today = new Date().toISOString().split('T')[0];
    const accId = accountId || data.accounts[0]?.id || 'acc-cash';

    if (debt.type === 'lent') {
      // Received money back from borrower -> Income
      addTransaction({
        type: 'income',
        date: today,
        time: '12:00',
        amount: safeSettle,
        categoryId: 'cat-misc',
        subcategory: 'Debt Recovery',
        description: `Debt settlement received from ${debt.personName}`,
        paymentMethod: 'cash',
        accountId: accId,
        vendor: debt.personName,
        tag: 'Debt Recovery',
      });
    } else {
      // Paid back money to lender -> Expense
      addTransaction({
        type: 'expense',
        date: today,
        time: '12:00',
        amount: safeSettle,
        categoryId: 'cat-misc',
        subcategory: 'Debt Repayment',
        description: `Debt repayment settled to ${debt.personName}`,
        paymentMethod: 'cash',
        accountId: accId,
        vendor: debt.personName,
        tag: 'Debt Repayment',
      });
    }

    SyncService.recordAuditLog(
      currentUserId,
      'SETTLE',
      'DEBT',
      id,
      userProfile?.displayName || 'User',
      `Settled ₹${safeSettle.toFixed(2)} for ${debt.personName} (${debt.type})`
    );
  };

  const deleteDebt = (id: string) => {
    setData((prev) => ({
      ...prev,
      debts: prev.debts.filter((d) => d.id !== id),
    }));
    SyncService.enqueueMutation('debts', id, 'delete');
  };

  const importDebtsBatch = (newDebts: Array<Omit<DebtRecord, 'id'>>): number => {
    if (newDebts.length === 0) return 0;
    const timestamp = new Date().toISOString();
    const createdList: DebtRecord[] = [];

    newDebts.forEach((debt, index) => {
      const id = `debt-kb-${Date.now().toString(36)}-${index}`;
      const newDebt: DebtRecord = {
        ...debt,
        id,
        amount: DecimalSafe.format(debt.amount),
        settledAmount: DecimalSafe.format(debt.settledAmount || 0),
        updatedAt: timestamp,
      };
      createdList.push(newDebt);
      SyncService.enqueueMutation('debts', id, 'set', newDebt);
    });

    setData((prev) => ({
      ...prev,
      debts: [...createdList, ...prev.debts],
    }));

    SyncService.recordAuditLog(
      currentUserId,
      'CREATE',
      'DEBT',
      `BATCH-KB-${Date.now()}`,
      userProfile?.displayName || 'User',
      `Imported ${createdList.length} Khatabook ledger entries into Khata Book`
    );

    return createdList.length;
  };

  // Loan & EMI Management Actions
  const addLoanAccount = (
    loanData: Omit<LoanAccount, 'id' | 'createdAt' | 'updatedAt' | 'schedule'>
  ): LoanAccount => {
    const loanId = `LOAN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const linkedAccId = `acc-loan-${loanId}`;

    const orig = loanData.originalPrincipal ?? loanData.originalAmount ?? 0;
    const out = loanData.currentOutstandingPrincipal ?? loanData.outstandingPrincipal ?? orig;
    const ref = loanData.loanReference || loanData.accountReference || `LOAN-${Date.now()}`;
    const rate = loanData.interestRateAnnual ?? loanData.interestRate ?? 0;
    const tenure = loanData.tenureMonths ?? loanData.totalTenureMonths ?? 60;
    const lType = loanData.loanType || 'home';

    const schedule = generateLoanSchedule({
      loanId,
      originalAmount: orig,
      interestRate: rate,
      emiAmount: loanData.emiAmount,
      startDate: loanData.startDate,
      totalTenureMonths: tenure,
      emiDueDay: loanData.emiDueDay,
      paymentFrequency: loanData.paymentFrequency,
    });

    const newLoan: LoanAccount = {
      ...loanData,
      id: loanId,
      accountId: linkedAccId,
      accountReference: ref,
      loanReference: ref,
      loanType: lType,
      originalAmount: orig,
      originalPrincipal: orig,
      outstandingPrincipal: out,
      currentOutstandingPrincipal: out,
      interestRate: rate,
      interestRateAnnual: rate,
      totalTenureMonths: tenure,
      tenureMonths: tenure,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule,
    };

    // Also create the corresponding Outstanding Balance / EMI Payable Account
    const newAccount: Account = {
      id: linkedAccId,
      name: `Outstanding Balance / EMI Payable - ${loanData.lenderName} (${loanData.loanName})`,
      type: 'loan',
      bankName: loanData.lenderName,
      accountNumber: loanData.accountReference,
      balance: -loanData.outstandingPrincipal,
      initialBalance: -loanData.originalAmount,
      color: loanData.color || '#dc2626',
      notes: `Loan ref: ${loanData.accountReference} | EMI: ₹${loanData.emiAmount}/mo | Rate: ${loanData.interestRate}%`,
    };

    setData((prev) => ({
      ...prev,
      loans: [...(prev.loans || []), newLoan],
      accounts: [...prev.accounts, newAccount],
    }));

    SyncService.enqueueMutation('loans', loanId, 'set', newLoan);
    SyncService.enqueueMutation('accounts', linkedAccId, 'set', newAccount);

    SyncService.recordAuditLog(
      currentUserId,
      'LOAN_CREATE',
      'LOAN',
      loanId,
      userProfile?.displayName || 'User',
      `Created Outstanding Balance Account for ${loanData.lenderName} (${loanData.loanName}) with principal ₹${loanData.originalAmount} & EMI ₹${loanData.emiAmount}`
    );

    return newLoan;
  };

  const updateLoanAccount = (id: string, updates: Partial<LoanAccount>) => {
    setData((prev) => {
      const updatedLoans = (prev.loans || []).map((l) => {
        if (l.id === id) {
          let updatedSchedule = l.schedule;
          // If critical parameters changed, recalculate unpaid installments
          if (
            (updates.originalAmount !== undefined && updates.originalAmount !== l.originalAmount) ||
            (updates.interestRate !== undefined && updates.interestRate !== l.interestRate) ||
            (updates.emiAmount !== undefined && updates.emiAmount !== l.emiAmount) ||
            (updates.totalTenureMonths !== undefined && updates.totalTenureMonths !== l.totalTenureMonths) ||
            (updates.emiDueDay !== undefined && updates.emiDueDay !== l.emiDueDay)
          ) {
            updatedSchedule = generateLoanSchedule(
              {
                loanId: id,
                originalAmount: updates.originalAmount ?? l.originalAmount,
                interestRate: updates.interestRate ?? l.interestRate,
                emiAmount: updates.emiAmount ?? l.emiAmount,
                startDate: updates.startDate ?? l.startDate,
                totalTenureMonths: updates.totalTenureMonths ?? l.totalTenureMonths,
                emiDueDay: updates.emiDueDay ?? l.emiDueDay,
                paymentFrequency: updates.paymentFrequency ?? l.paymentFrequency,
              },
              l.schedule
            );
          }

          const merged: LoanAccount = {
            ...l,
            ...updates,
            schedule: updates.schedule || updatedSchedule,
            updatedAt: new Date().toISOString(),
          };
          SyncService.enqueueMutation('loans', id, 'set', merged);
          return merged;
        }
        return l;
      });

      return {
        ...prev,
        loans: updatedLoans,
      };
    });

    SyncService.recordAuditLog(
      currentUserId,
      'LOAN_UPDATE',
      'LOAN',
      id,
      userProfile?.displayName || 'User',
      `Updated loan account details for loan ${id}`
    );
  };

  const deleteLoanAccount = (id: string) => {
    const loan = (data.loans || []).find((l) => l.id === id);
    setData((prev) => ({
      ...prev,
      loans: (prev.loans || []).filter((l) => l.id !== id),
      accounts: loan?.accountId ? prev.accounts.filter((a) => a.id !== loan.accountId) : prev.accounts,
    }));
    SyncService.enqueueMutation('loans', id, 'delete');
    if (loan?.accountId) {
      SyncService.enqueueMutation('accounts', loan.accountId, 'delete');
    }
  };

  const payEmiInstallment = (params: {
    loanId: string;
    installmentId: string;
    sourceAccountId?: string;
    paidDate?: string;
    notes?: string;
  }): { success: boolean; message: string } => {
    const loan = (data.loans || []).find((l) => l.id === params.loanId);
    if (!loan) {
      return { success: false, message: 'Loan account not found.' };
    }

    const item = loan.schedule.find((s) => s.id === params.installmentId);
    if (!item) {
      return { success: false, message: 'EMI installment not found in schedule.' };
    }

    if (item.status === 'paid') {
      return { success: false, message: `Installment #${item.installmentNumber} is already recorded as Paid.` };
    }

    const sourceAccId =
      params.sourceAccountId || loan.linkedBankAccountId || data.accounts.find((a) => a.type === 'bank')?.id;
    if (!sourceAccId) {
      return { success: false, message: 'Please select a valid bank account to debit the EMI from.' };
    }

    const bankAcc = accountsWithLiveBalances.find((a) => a.id === sourceAccId);
    if (bankAcc && bankAcc.balance < item.emiAmount) {
      return {
        success: false,
        message: `Insufficient balance in ${bankAcc.name}. Required: ₹${item.emiAmount.toLocaleString('en-IN')}, Available: ₹${bankAcc.balance.toLocaleString('en-IN')}. Please select another account or add funds.`,
      };
    }

    try {
      const { updatedLoan, transactionsToCreate, paidInstallment } = prepareEmiPaymentEntries({
        loan,
        installmentId: params.installmentId,
        sourceAccountId: sourceAccId,
        paidDate: params.paidDate,
        notes: params.notes,
        createdBy: userProfile?.displayName || 'User',
      });

      // Atomically generate concrete transaction entities with synchronized IDs and timestamps
      const timestamp = new Date().toISOString();
      const principalTxnId = `TXN-PRIN-${loan.id.substring(0, 8)}-${paidInstallment.installmentNumber}-${Date.now()}`;
      const interestTxnId = `TXN-INT-${loan.id.substring(0, 8)}-${paidInstallment.installmentNumber}-${Date.now()}`;

      const createdPrincipalTxn: Transaction = {
        ...transactionsToCreate[0],
        id: principalTxnId,
        amount: DecimalSafe.format(transactionsToCreate[0].amount),
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userProfile?.displayName || 'User',
      };

      const createdInterestTxn: Transaction = {
        ...transactionsToCreate[1],
        id: interestTxnId,
        amount: DecimalSafe.format(transactionsToCreate[1].amount),
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userProfile?.displayName || 'User',
      };

      const emiTxns = [createdPrincipalTxn, createdInterestTxn];

      // Link transaction IDs into the paid installment record
      paidInstallment.transactionId = createdPrincipalTxn.id;
      paidInstallment.interestTransactionId = createdInterestTxn.id;

      // Construct immutable audit log entry
      const auditLog: AuditLog = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        action: 'EMI_PAYMENT',
        entityType: 'LOAN',
        entityId: loan.id,
        performedBy: userProfile?.displayName || 'User',
        details: `Atomic Double-Entry EMI #${item.installmentNumber} posted: Debit Loan Principal ₹${item.principalComponent.toFixed(2)}, Debit Interest Expense ₹${item.interestComponent.toFixed(2)}, Credit Bank ${bankAcc?.name || sourceAccId} ₹${item.emiAmount.toFixed(2)}. Remaining loan liability: ₹${updatedLoan.outstandingPrincipal.toFixed(2)}`,
        timestamp,
      };

      // Atomic single-batch commit to Cloud Firestore (or synchronized queue if offline)
      SyncService.commitAtomicEmiPayment({
        userId: currentUserId,
        target: activeSyncTarget,
        loan: updatedLoan,
        transactions: emiTxns,
        auditLog,
      });

      // Atomic local state update: all transactions, loan schedule reduction, and audit log apply in one render pass
      setData((prev) => ({
        ...prev,
        transactions: [createdPrincipalTxn, createdInterestTxn, ...prev.transactions],
        loans: (prev.loans || []).map((l) => (l.id === updatedLoan.id ? updatedLoan : l)),
        auditLogs: [auditLog, ...(prev.auditLogs || [])],
      }));

      return {
        success: true,
        message: `EMI installment #${item.installmentNumber} of ₹${item.emiAmount.toLocaleString('en-IN')} paid successfully. Principal reduced by ₹${item.principalComponent.toLocaleString('en-IN')}.`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to process EMI payment.' };
    }
  };

  // Re-usable atomic worker to process all EMIs due on or before today
  const processDueEmis = (): { processedCount: number; messages: string[] } => {
    const todayStr = new Date().toISOString().split('T')[0];
    let count = 0;
    const messages: string[] = [];

    // Filter active loans with user-authorized automated accounting transfer
    const eligibleLoans = (data.loans || []).filter(
      (loan) => loan.status === 'active' && loan.autoDebitApproved
    );

    if (eligibleLoans.length === 0) {
      return { processedCount: 0, messages };
    }

    // Identify all due installments across all authorized loan accounts
    const pendingDuePayments: Array<{
      loan: LoanAccount;
      dueItem: EMIScheduleItem;
      sourceAccId: string;
      bankAcc: Account;
    }> = [];

    // Calculate virtual balances to handle multiple EMIs debited from the same bank account
    const runningBankBalances = new Map<string, number>();
    accountsWithLiveBalances.forEach((acc) => runningBankBalances.set(acc.id, acc.balance));

    for (const loan of eligibleLoans) {
      const dueItem = loan.schedule.find(
        (item) => item.status !== 'paid' && item.dueDate <= todayStr
      );

      if (dueItem) {
        const sourceAccId =
          loan.linkedBankAccountId || data.accounts.find((a) => a.type === 'bank')?.id;
        if (!sourceAccId) {
          messages.push(`Skipped ${loan.lenderName}: No linked bank account configured.`);
          continue;
        }

        const currentBankBal = runningBankBalances.get(sourceAccId) ?? 0;
        const bankAcc = accountsWithLiveBalances.find((a) => a.id === sourceAccId);

        if (!bankAcc || currentBankBal < dueItem.emiAmount) {
          messages.push(
            `Insufficient Balance Warning: ${bankAcc?.name || 'Bank account'} has ₹${currentBankBal.toLocaleString('en-IN')} available, required ₹${dueItem.emiAmount.toLocaleString('en-IN')} for ${loan.lenderName} (${loan.loanName}) EMI #${dueItem.installmentNumber}.`
          );
          continue;
        }

        // Deduct from running balance for this batch to avoid overdraft
        runningBankBalances.set(sourceAccId, DecimalSafe.subtract(currentBankBal, dueItem.emiAmount));

        pendingDuePayments.push({
          loan,
          dueItem,
          sourceAccId,
          bankAcc,
        });
      }
    }

    if (pendingDuePayments.length === 0) {
      return { processedCount: 0, messages };
    }

    // Atomic Execution: Process all verified payments and commit synchronously
    const newTxnsToAppend: Transaction[] = [];
    const updatedLoansMap = new Map<string, LoanAccount>();
    const newAuditLogs: AuditLog[] = [];
    const timestamp = new Date().toISOString();

    for (const item of pendingDuePayments) {
      try {
        const { updatedLoan, transactionsToCreate, paidInstallment } = prepareEmiPaymentEntries({
          loan: item.loan,
          installmentId: item.dueItem.id,
          sourceAccountId: item.sourceAccId,
          paidDate: todayStr,
          notes: `Automated Bank-to-EMI Transfer executed on due date ${item.dueItem.dueDate}`,
          createdBy: 'Automated EMI Worker',
        });

        const principalTxnId = `TXN-PRIN-${item.loan.id.substring(0, 8)}-${paidInstallment.installmentNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const interestTxnId = `TXN-INT-${item.loan.id.substring(0, 8)}-${paidInstallment.installmentNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

        const principalTxn: Transaction = {
          ...transactionsToCreate[0],
          id: principalTxnId,
          amount: DecimalSafe.format(transactionsToCreate[0].amount),
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: 'Automated EMI Worker',
        };

        const interestTxn: Transaction = {
          ...transactionsToCreate[1],
          id: interestTxnId,
          amount: DecimalSafe.format(transactionsToCreate[1].amount),
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: 'Automated EMI Worker',
        };

        paidInstallment.transactionId = principalTxn.id;
        paidInstallment.interestTransactionId = interestTxn.id;

        const auditLog: AuditLog = {
          id: `LOG-AUTO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          action: 'EMI_PAYMENT',
          entityType: 'LOAN',
          entityId: item.loan.id,
          performedBy: 'Automated Worker',
          details: `Auto-debited EMI #${item.dueItem.installmentNumber} of ₹${item.dueItem.emiAmount.toFixed(2)} from ${item.bankAcc.name}. (Principal: ₹${item.dueItem.principalComponent.toFixed(2)}, Interest: ₹${item.dueItem.interestComponent.toFixed(2)}). Remaining liability: ₹${updatedLoan.outstandingPrincipal.toFixed(2)}`,
          timestamp,
        };

        // Push into atomic batch collectors
        newTxnsToAppend.push(principalTxn, interestTxn);
        updatedLoansMap.set(updatedLoan.id, updatedLoan);
        newAuditLogs.push(auditLog);

        // Commit to Firestore / Sync queue
        SyncService.commitAtomicEmiPayment({
          userId: currentUserId,
          target: activeSyncTarget,
          loan: updatedLoan,
          transactions: [principalTxn, interestTxn],
          auditLog,
        });

        count++;
        messages.push(
          `Auto-debited ₹${item.dueItem.emiAmount.toLocaleString('en-IN')} for ${item.loan.lenderName} (${item.loan.loanName}) from ${item.bankAcc.name}`
        );
      } catch (err: any) {
        messages.push(`Failed auto-debit for ${item.loan.lenderName}: ${err.message}`);
      }
    }

    // Atomic React state update across all accounts, transactions, and loans in one cycle
    if (count > 0) {
      setData((prev) => ({
        ...prev,
        transactions: [...newTxnsToAppend, ...prev.transactions],
        loans: (prev.loans || []).map((l) => updatedLoansMap.get(l.id) || l),
        auditLogs: [...newAuditLogs, ...(prev.auditLogs || [])],
      }));
    }

    return { processedCount: count, messages };
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setData((prev) => {
      const newSettings = { ...prev.settings, ...updates };
      if (typeof newSettings.darkMode === 'boolean') {
        if (newSettings.darkMode) {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
        }
      }
      return {
        ...prev,
        settings: newSettings,
      };
    });
  };

  const unlockApp = (pin: string): boolean => {
    if (!data.settings.pinLockEnabled) {
      setIsUnlocked(true);
      return true;
    }
    if (data.settings.securityPin === pin) {
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (data.settings.pinLockEnabled) {
      setIsUnlocked(false);
    }
  };

  const importFinancialData = (backup: FinancialDataBackup): boolean => {
    try {
      if (!backup.transactions || !backup.accounts) return false;
      setData(backup);
      return true;
    } catch {
      return false;
    }
  };

  const exportFinancialData = () => {
    const backup: FinancialDataBackup = {
      ...data,
      exportDate: new Date().toISOString(),
      accounts: accountsWithLiveBalances,
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BudgetManagement_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions: data.transactions,
        accounts: accountsWithLiveBalances,
        categories: data.categories,
        budget: data.budget,
        budgets: data.budgets || data.budget.activeBudgets || [],
        savingsGoals: data.savingsGoals,
        recurring: data.recurring,
        debts: data.debts,
        loans: data.loans || [],
        loanSummary,
        totalLoanLiability,
        totalMonthlyEmiPayable,
        totalEmiPaid,
        totalPrincipalRepaid,
        totalInterestPaid,
        upcomingEmis,
        overdueEmis,
        settings: data.settings,
        auditLogs: data.auditLogs || [],
        isUnlocked,
        syncState,
        pendingSyncCount,
        syncLinkConfig,
        activeSyncTarget,
        lastSyncStats,
        lastSyncError,
        totalIncome,
        totalExpenses,
        availableBalance,
        netSavings,
        monthlySummary,
        yearlySummary,
        budgetUtilization,
        addTransaction,
        addTransactionsBatch,
        updateTransaction,
        deleteTransaction,
        duplicateTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        transferFunds,
        addCategory,
        updateCategory,
        deleteCategory,
        updateBudgetConfig,
        updateBudget: updateBudgetConfig,
        addBudgetRecord,
        updateBudgetRecord,
        deleteBudgetRecord,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        executeRecurring,
        addDebt,
        updateDebt,
        settleDebt,
        deleteDebt,
        importDebtsBatch,
        addLoanAccount,
        updateLoanAccount,
        deleteLoanAccount,
        payEmiInstallment,
        processDueEmis,
        updateSettings,
        unlockApp,
        lockApp,
        triggerCloudSync,
        createSyncRoom,
        joinSyncRoom,
        disconnectSyncRoom,
        linkGoogleAccountSync,
        importFinancialData,
        exportFinancialData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
