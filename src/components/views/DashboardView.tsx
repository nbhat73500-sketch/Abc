import React, { useMemo, useState, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  PiggyBank,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Zap,
  Clock,
  Eye,
  Plus,
  Minus,
  ReceiptText,
  Target,
  BarChart3,
  Repeat,
  Bell,
  Crown,
  Calculator,
  Users,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  Sliders,
  Sparkles,
  ShieldCheck,
  Activity,
  Layers,
  X,
  CheckCircle2,
  Filter,
  Printer,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { calculatePeriodSummary, DecimalSafe } from '../../services/calculationEngine';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { IncomeExpenseBarChart } from '../charts/IncomeExpenseBarChart';
import { ExpenseTrendAreaChart } from '../charts/ExpenseTrendAreaChart';
import { CategoryIcon } from '../CategoryIcon';
import { MonthlyBudgetModal } from '../modals/MonthlyBudgetModal';
import { Transaction } from '../../types/finance';

export type DashboardPeriod = 'this_month' | 'last_month' | 'last_6_months' | 'ytd' | 'all';

interface DashboardViewProps {
  onOpenNewTransaction: (type?: 'expense' | 'income') => void;
  onOpenQuickEntry: () => void;
  onOpenTransfer: () => void;
  onViewTransaction: (txn: Transaction) => void;
  onNavigateToTab: (tab: any) => void;
  onOpenMonthlySummary?: () => void;
  onOpenStatementPdf?: () => void;
  onOpenPurchasesModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewTransaction,
  onOpenQuickEntry,
  onOpenTransfer,
  onViewTransaction,
  onNavigateToTab,
  onOpenMonthlySummary,
  onOpenStatementPdf,
  onOpenPurchasesModal,
}) => {
  const {
    transactions,
    accounts,
    categories,
    budget,
    debts,
    loans,
    loanSummary,
    totalLoanLiability,
    totalMonthlyEmiPayable,
    totalEmiPaid,
    totalPrincipalRepaid,
    totalInterestPaid,
    upcomingEmis,
    overdueEmis,
    syncState,
    pendingSyncCount,
    availableBalance,
    triggerCloudSync,
  } = useFinance();

  // Dynamic Time Period Selector
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('this_month');
  const [isMonthlyBudgetModalOpen, setIsMonthlyBudgetModalOpen] = useState(false);

  // In-Dashboard Instant Transaction Search & Filter
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState<string>('all');

  // Shortcuts track horizontal slide
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollProgress((scrollLeft / maxScroll) * 100);
      }
    }
  };

  const slideLeft = () => {
    carouselRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
  };

  const slideRight = () => {
    carouselRef.current?.scrollBy({ left: 240, behavior: 'smooth' });
  };

  // 1. DYNAMIC PERIOD CALCULATION ENGINE
  const periodBounds = useMemo(() => {
    const today = new Date('2026-10-27');
    let startDate: string | undefined;
    let endDate: string | undefined;
    let periodLabel = 'This Month (October 2026)';

    if (selectedPeriod === 'this_month') {
      startDate = '2026-10-01';
      endDate = '2026-10-31';
      periodLabel = 'October 2026';
    } else if (selectedPeriod === 'last_month') {
      startDate = '2026-09-01';
      endDate = '2026-09-30';
      periodLabel = 'September 2026';
    } else if (selectedPeriod === 'last_6_months') {
      startDate = '2026-05-01';
      endDate = '2026-10-31';
      periodLabel = 'Past 6 Months (May - Oct 2026)';
    } else if (selectedPeriod === 'ytd') {
      startDate = '2026-01-01';
      endDate = '2026-10-31';
      periodLabel = 'Year 2026 (YTD)';
    } else {
      startDate = undefined;
      endDate = undefined;
      periodLabel = 'All Time Records';
    }

    return { startDate, endDate, periodLabel };
  }, [selectedPeriod]);

  // Centralized period summary computed dynamically
  const periodSummary = useMemo(() => {
    return calculatePeriodSummary(transactions, accounts, periodBounds.startDate, periodBounds.endDate);
  }, [transactions, accounts, periodBounds]);

  // Period filtered transactions
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (periodBounds.startDate && t.date < periodBounds.startDate) return false;
      if (periodBounds.endDate && t.date > periodBounds.endDate) return false;
      return true;
    });
  }, [transactions, periodBounds]);

  // Dynamic Period Values
  const periodIncome = periodSummary.totalIncome;
  const periodExpense = periodSummary.totalExpenses;
  const periodSavings = periodSummary.netSavings;
  const periodSavingsRate = periodSummary.savingsRate;

  // Monthly Budget Target & Remaining
  const targetMonthlyBudget = budget.monthlyBudget || 45000;
  const monthlyRemaining = targetMonthlyBudget - periodExpense;
  const monthlyUsedPct = targetMonthlyBudget > 0 ? (periodExpense / targetMonthlyBudget) * 100 : 0;
  const isOverBudget = monthlyRemaining < 0;

  // Yearly Budget calculations
  const yearlyAllocated = budget.yearlyBudget || targetMonthlyBudget * 12;
  const yearlyExpenses = transactions
    .filter((t) => t.date.startsWith('2026') && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const yearlyUsedPct = yearlyAllocated > 0 ? (yearlyExpenses / yearlyAllocated) * 100 : 0;

  // Today's expenses (2026-10-27)
  const todayStr = '2026-10-27';
  const todayExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.date === todayStr && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Outstanding Debts (Khata lent vs borrowed)
  const outstandingReceivable = useMemo(() => {
    return debts
      .filter((d) => d.type === 'lent' && d.status !== 'settled')
      .reduce((sum, d) => sum + (d.amount - (d.settledAmount || 0)), 0);
  }, [debts]);

  const outstandingPayable = useMemo(() => {
    return debts
      .filter((d) => d.type === 'borrowed' && d.status !== 'settled')
      .reduce((sum, d) => sum + (d.amount - (d.settledAmount || 0)), 0);
  }, [debts]);

  // 2. FINANCIAL HEALTH SCORE (MODERN EXECUTIVE OVERVIEW)
  const financialHealth = useMemo(() => {
    let score = 50; // base score

    // 1. Savings rate component (+/- up to 30)
    if (periodSavingsRate >= 30) score += 30;
    else if (periodSavingsRate >= 15) score += 20;
    else if (periodSavingsRate > 0) score += 10;
    else score -= 15;

    // 2. Budget adherence component (+/- up to 25)
    if (monthlyUsedPct <= 80) score += 25;
    else if (monthlyUsedPct <= 95) score += 15;
    else if (monthlyUsedPct <= 100) score += 5;
    else score -= 20;

    // 3. Liquidity ratio (Available Balance vs Monthly Expense)
    if (periodExpense > 0) {
      const monthsOfReserve = availableBalance / periodExpense;
      if (monthsOfReserve >= 3) score += 15;
      else if (monthsOfReserve >= 1) score += 10;
    }

    const finalScore = Math.max(10, Math.min(100, score));
    let statusText = 'Excellent Financial Standing';
    let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800';

    if (finalScore < 50) {
      statusText = 'Needs Attention (High Spend)';
      statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800';
    } else if (finalScore < 75) {
      statusText = 'Moderate Health (Balanced)';
      statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800';
    }

    return { score: finalScore, statusText, statusColor };
  }, [periodSavingsRate, monthlyUsedPct, availableBalance, periodExpense]);

  // 3. DYNAMIC CHARTS DATA GENERATION
  const categoryChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
      });

    const categoriesMap = new Map(categories.map((c) => [c.id, c]));

    const slices = Object.entries(categoryTotals)
      .map(([catId, amount]) => {
        const cat = categoriesMap.get(catId);
        const percentage = periodExpense > 0 ? (amount / periodExpense) * 100 : 0;
        return {
          id: catId,
          name: cat?.name || catId,
          amount,
          color: cat?.color || '#64748b',
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return slices.slice(0, 7);
  }, [periodTransactions, categories, periodExpense]);

  const monthlyComparisonData = useMemo(() => {
    const monthKeys = ['2026-07', '2026-08', '2026-09', '2026-10'];
    const monthNames: Record<string, string> = {
      '2026-07': 'Jul 26',
      '2026-08': 'Aug 26',
      '2026-09': 'Sep 26',
      '2026-10': 'Oct 26',
    };

    return monthKeys.map((mKey) => {
      const monthTxns = transactions.filter((t) => t.date.startsWith(mKey));
      const income = monthTxns
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTxns
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const savings = income - expense;

      return {
        monthName: monthNames[mKey] || mKey,
        month: monthNames[mKey] || mKey,
        income,
        expense,
        savings,
        netSavings: savings,
        budget: targetMonthlyBudget,
      };
    });
  }, [transactions, targetMonthlyBudget]);

  const dailySpendPoints = useMemo(() => {
    const dailyMap = new Map<number, number>();
    for (let i = 1; i <= 31; i++) {
      dailyMap.set(i, 0);
    }

    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const day = parseInt(t.date.split('-')[2], 10);
        if (day >= 1 && day <= 31) {
          dailyMap.set(day, (dailyMap.get(day) || 0) + t.amount);
        }
      });

    return Array.from(dailyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, amount]) => ({
        day,
        dateStr: `Day ${day}`,
        amount,
      }));
  }, [periodTransactions]);

  // 4. BUDGET WARNINGS & CATEGORY THRESHOLDS
  const budgetAlerts = useMemo(() => {
    const alerts: { categoryName: string; spent: number; budget: number; pct: number }[] = [];
    categories.forEach((cat) => {
      const catBudget = budget.categoryBudgets[cat.id] || cat.monthlyBudget;
      if (catBudget && catBudget > 0) {
        const spent = periodTransactions
          .filter((t) => t.type === 'expense' && t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);
        const pct = (spent / catBudget) * 100;
        if (pct >= 80) {
          alerts.push({
            categoryName: cat.name,
            spent,
            budget: catBudget,
            pct,
          });
        }
      }
    });
    return alerts.sort((a, b) => b.pct - a.pct);
  }, [categories, budget, periodTransactions]);

  const categoriesMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // 5. IN-DASHBOARD INSTANT TRANSACTION SEARCH & FILTER
  const searchedTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (dashboardTypeFilter !== 'all' && t.type !== dashboardTypeFilter) return false;

      // Category filter
      if (dashboardCategoryFilter !== 'all' && t.categoryId !== dashboardCategoryFilter) return false;

      // Text Search
      if (dashboardSearchQuery.trim()) {
        const q = dashboardSearchQuery.toLowerCase();
        const catName = categoriesMap.get(t.categoryId)?.name.toLowerCase() || '';
        const accName = accountsMap.get(t.accountId)?.name.toLowerCase() || '';
        const matches =
          t.description.toLowerCase().includes(q) ||
          t.vendor?.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q) ||
          catName.includes(q) ||
          accName.includes(q) ||
          t.amount.toString().includes(q);

        if (!matches) return false;
      }

      return true;
    }).slice(0, 10);
  }, [transactions, dashboardSearchQuery, dashboardTypeFilter, dashboardCategoryFilter, categoriesMap, accountsMap]);

  // Android Horizontal Sliding Shortcuts
  const dashboardShortcuts = useMemo(
    () => [
      {
        label: 'Add Expense',
        subtext: 'Record Spend',
        icon: Minus,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        borderColor: 'border-rose-200 dark:border-rose-900/60',
        action: () => onOpenNewTransaction('expense'),
      },
      {
        label: 'Add Income',
        subtext: 'Salary/Inflow',
        icon: ArrowDownLeft,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderColor: 'border-emerald-200 dark:border-emerald-900/60',
        action: () => onOpenNewTransaction('income'),
      },
      {
        label: 'Quick 5s',
        subtext: 'Fast Note',
        icon: Zap,
        color: 'text-amber-500 fill-amber-500/20',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        borderColor: 'border-amber-200 dark:border-amber-900/60',
        action: onOpenQuickEntry,
      },
      {
        label: 'Transfer',
        subtext: 'Move Funds',
        icon: ArrowRightLeft,
        color: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        borderColor: 'border-sky-200 dark:border-sky-900/60',
        action: onOpenTransfer,
      },
      {
        label: 'Set Budget',
        subtext: 'Monthly Limit',
        icon: Target,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        borderColor: 'border-purple-200 dark:border-purple-900/60',
        action: () => setIsMonthlyBudgetModalOpen(true),
      },
      {
        label: 'Ledger',
        subtext: `${transactions.length} Txns`,
        icon: ReceiptText,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        borderColor: 'border-indigo-200 dark:border-indigo-900/60',
        action: () => onNavigateToTab('transactions'),
      },
      {
        label: 'Accounts',
        subtext: `${accounts.length} Wallets`,
        icon: Wallet,
        color: 'text-cyan-600 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-950/40',
        borderColor: 'border-cyan-200 dark:border-cyan-900/60',
        action: () => onNavigateToTab('accounts'),
      },
      {
        label: 'EMIs & Loans',
        subtext: `${loans.length} Accounts`,
        icon: Building2,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        borderColor: 'border-rose-200 dark:border-rose-900/60',
        action: () => onNavigateToTab('emi_loans'),
      },
      {
        label: '6-Mo Trends',
        subtext: 'Recharts P&L',
        icon: BarChart3,
        color: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        borderColor: 'border-teal-200 dark:border-teal-900/60',
        action: () => onNavigateToTab('reports'),
      },
      {
        label: 'Khata Book',
        subtext: 'Lent/Debts',
        icon: Repeat,
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-950/40',
        borderColor: 'border-orange-200 dark:border-orange-900/60',
        action: () => onNavigateToTab('recurring_debts'),
      },
      {
        label: 'Alerts',
        subtext: `${budgetAlerts.length} Active`,
        icon: Bell,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-red-50 dark:bg-red-950/40',
        borderColor: 'border-red-200 dark:border-red-900/60',
        action: () => onNavigateToTab('notifications'),
      },
      {
        label: 'Pro Store',
        subtext: 'Play Store',
        icon: Crown,
        color: 'text-amber-600 fill-amber-500/20',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        borderColor: 'border-amber-300 dark:border-amber-700',
        action: () => (onOpenPurchasesModal ? onOpenPurchasesModal() : onNavigateToTab('budgets')),
      },
      {
        label: 'QA Tests',
        subtext: 'Math Engine',
        icon: Calculator,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50 dark:bg-violet-950/40',
        borderColor: 'border-violet-200 dark:border-violet-900/60',
        action: () => onNavigateToTab('testing'),
      },
      {
        label: 'Staff Roles',
        subtext: 'RBAC Audit',
        icon: Users,
        color: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-100 dark:bg-slate-800',
        borderColor: 'border-slate-200 dark:border-slate-700',
        action: () => onNavigateToTab('users'),
      },
    ],
    [transactions.length, accounts.length, loans.length, budgetAlerts.length, onOpenNewTransaction, onOpenQuickEntry, onOpenTransfer, onNavigateToTab, onOpenPurchasesModal]
  );

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-fadeIn">
      {/* 1. TOP DYNAMIC PERIOD SELECTOR & EXECUTIVE COMMAND BANNER */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dynamic Financial Dashboard
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${financialHealth.statusColor}`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{financialHealth.score}/100 · {financialHealth.statusText}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Decimal-Safe Accounting Engine · Default Currency: INR (₹) · Verified Ledger Balances
          </p>
        </div>

        {/* Dynamic Period Filter Pills & Monthly Summary button */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'last_6_months', label: '6 Months' },
              { id: 'ytd', label: 'Year 2026' },
              { id: 'all', label: 'All Records' },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setSelectedPeriod(pill.id as DashboardPeriod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedPeriod === pill.id
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {onOpenStatementPdf && (
            <button
              onClick={onOpenStatementPdf}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-xs whitespace-nowrap transition-colors active:scale-95 cursor-pointer"
              title="Print Official Statement as Read-Only PDF Format"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Print Statement (PDF)</span>
            </button>
          )}

          {onOpenMonthlySummary && (
            <button
              onClick={onOpenMonthlySummary}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs whitespace-nowrap transition-colors active:scale-95 cursor-pointer"
              title="Open Full Monthly Summary & Ledger Breakdown"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Monthly Summary</span>
            </button>
          )}

          <button
            onClick={async () => {
              try {
                await triggerCloudSync();
              } catch {}
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1.5 shadow-xs whitespace-nowrap transition-colors active:scale-95 cursor-pointer"
            title="Synchronise with Cloud Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncState === 'syncing' ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* 2. MODERN APP EXECUTIVE OVERVIEW & COMMAND STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Net Cash Velocity & Savings Trajectory */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Cash Flow Velocity & Surplus
            </span>
            <span className="text-[11px] font-mono">{periodBounds.periodLabel}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold tracking-tight tabular-nums ${periodSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {periodSavings >= 0 ? '+' : ''}{formatINR(periodSavings)}
            </span>
            <span className="text-xs font-bold text-slate-500 font-mono">
              Savings: {periodSavingsRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Net Surplus: Total Inflow ({formatINR(periodIncome, { compact: true })}) minus Total Outflow ({formatINR(periodExpense, { compact: true })})
          </p>
        </div>

        {/* Card 2: Dedicated Monthly Budget & Target Manager Widget */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-white to-transparent dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-600" />
                Monthly Budget Manager
              </span>
              <button
                onClick={() => setIsMonthlyBudgetModalOpen(true)}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
              >
                <span>Edit Target</span>
                <Sliders className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatINR(targetMonthlyBudget)}
              </span>
              <span className={`text-xs font-bold font-mono ${isOverBudget ? 'text-rose-600' : 'text-purple-600 dark:text-purple-400'}`}>
                {monthlyUsedPct.toFixed(0)}% Utilized
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverBudget ? 'bg-rose-500' : monthlyUsedPct > 80 ? 'bg-amber-500' : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(100, monthlyUsedPct)}%` }}
              />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              {isOverBudget ? 'Exceeded by:' : 'Remaining:'}{' '}
              <strong className={isOverBudget ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}>
                {formatINR(Math.abs(monthlyRemaining))}
              </strong>
            </span>
            <button
              onClick={() => setIsMonthlyBudgetModalOpen(true)}
              className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 px-2 py-0.5 rounded-md"
            >
              + Set Budget
            </button>
          </div>
        </div>

        {/* Card 3: Khata Book & Net Debt Exposure */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border border-amber-200/80 dark:border-amber-800/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-amber-600" />
                Khata Book Exposure
              </span>
              <button
                onClick={() => onNavigateToTab('recurring_debts')}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Open Khata →
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-medium block">To Receive (Lent)</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatINR(outstandingReceivable)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-medium block">To Pay (Borrowed)</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {formatINR(outstandingPayable)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Net Exposure: {formatINR(outstandingReceivable - outstandingPayable)}</span>
            <span className="text-emerald-600 font-semibold">100% Reconciled</span>
          </div>
        </div>
      </div>

      {/* 3. ANDROID HORIZONTAL SLIDING DASHBOARD ICONS CAROUSEL WITH INTERACTIVE SLIDE BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Dashboard Shortcuts
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Left & Right Slide Arrow Controls */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={slideLeft}
                aria-label="Slide Left"
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors active:scale-95"
                title="Slide Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={slideRight}
                aria-label="Slide Right"
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors active:scale-95"
                title="Slide Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sliding horizontal icon track (Android touch-pan-x, smooth momentum, snap points) */}
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1 px-0.5 snap-x touch-pan-x -mx-1"
        >
          {dashboardShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-1 shrink-0 group active:scale-95 transition-transform snap-start focus:outline-hidden min-w-[66px] sm:min-w-[74px]"
              >
                <div
                  className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center shadow-xs border transition-all ${item.bg} ${item.borderColor} group-hover:scale-105`}
                >
                  <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${item.color}`} />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center whitespace-nowrap leading-tight mt-0.5">
                  {item.label}
                </span>
                <span className="text-[9px] text-slate-400 text-center -mt-0.5 whitespace-nowrap">
                  {item.subtext}
                </span>
              </button>
            );
          })}
        </div>

        {/* Visible Interactive Horizontal Slide Bar / Progress Indicator */}
        <div className="pt-0.5 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Slide Bar
          </span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = clickX / rect.width;
              if (carouselRef.current) {
                const maxScroll = carouselRef.current.scrollWidth - carouselRef.current.clientWidth;
                carouselRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
              }
            }}
            className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer relative overflow-hidden"
            title="Click or drag slide bar"
          >
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-150"
              style={{
                width: '30%',
                transform: `translateX(${scrollProgress * 2.33}%)`,
              }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {Math.round(scrollProgress)}%
          </span>
        </div>
      </div>

      {/* 4. DYNAMIC FINANCIAL KPI METRIC TILES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Available Net Balance */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatINR(availableBalance)}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Total Liquid Cash & Bank Reserves</p>
          </div>
        </div>

        {/* KPI 2: Total Period Income */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Period Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatINR(periodIncome)}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">{periodBounds.periodLabel}</p>
          </div>
        </div>

        {/* KPI 3: Total Period Expenses */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Period Outflow</span>
            <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatINR(periodExpense)}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Total Verified Spends</p>
          </div>
        </div>

        {/* KPI 4: Net Savings */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Net Savings</span>
            <PiggyBank className="w-4 h-4 text-sky-600 shrink-0" />
          </div>
          <div className="mt-2">
            <span
              className={`text-xl font-bold tracking-tight tabular-nums ${
                periodSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {formatINR(periodSavings)}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Savings Rate: {periodSavingsRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* KPI 5: Daily Spending Rate */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Daily Burn Rate</span>
            <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {formatINR(periodExpense / 30, { hideDecimals: true })} / day
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Target: {formatINR(budget.dailyBudget, { hideDecimals: true })}
            </p>
          </div>
        </div>
      </div>

      {/* 4B. OUTSTANDING BALANCE & EMI PAYABLE MANAGEMENT SYSTEM */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Outstanding Balance &amp; EMI Payable Portfolio
                </h2>
                {overdueEmis.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                    {overdueEmis.length} Overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Loan liabilities, amortization schedules &amp; automated double-entry bank transfers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('emi_loans')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition"
            >
              Open EMI Manager →
            </button>
          </div>
        </div>

        {/* 4 Portfolio Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40">
            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
              Total Outstanding Balance
            </span>
            <span className="text-lg font-black text-rose-700 dark:text-rose-400">
              {formatINR(totalLoanLiability)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Sanctioned: {formatINR(loanSummary.totalOriginalPrincipal)}
            </span>
          </div>

          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 block">
              Monthly EMI Payable
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {formatINR(totalMonthlyEmiPayable)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {loanSummary.activeLoansCount} active loan accounts
            </span>
          </div>

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
              Principal Repaid
            </span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              {formatINR(totalPrincipalRepaid)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Total EMI Paid: {formatINR(totalEmiPaid)}
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
              Interest Expensed
            </span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-400">
              {formatINR(totalInterestPaid)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Cumulative interest cost
            </span>
          </div>
        </div>

        {/* Bank-Wise EMI Summary & Upcoming Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          {/* Bank Allocation Summary */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Bank-Wise EMI Allocation</span>
              <span className="text-[11px] text-slate-500 font-normal">Monthly Debits</span>
            </span>
            <div className="space-y-1.5">
              {loanSummary.bankWiseAllocations.map((alloc) => (
                <div
                  key={alloc.bankAccountId}
                  className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-white block truncate">
                      {alloc.bankAccountName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Balance: {formatINR(alloc.currentAvailableBalance)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-600 dark:text-rose-400 block">
                      - {formatINR(alloc.monthlyDebitAmount)}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        alloc.isSufficientForMonth
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {alloc.isSufficientForMonth ? 'Sufficient' : 'Low Balance'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming & Overdue EMI Schedule Items */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Upcoming &amp; Due Installments
              </span>
              <button
                onClick={() => onNavigateToTab('emi_loans')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                View Full Amortization →
              </button>
            </div>
            <div className="space-y-1.5">
              {[...overdueEmis, ...upcomingEmis].slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {item.lenderName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Due: {formatDateIN(item.dueDate)} • Inst #{item.installmentNumber}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <span className="font-black text-slate-900 dark:text-white block">
                        {formatINR(item.emiAmount)}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase ${
                          item.status === 'overdue'
                            ? 'text-rose-600'
                            : item.status === 'due'
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigateToTab('emi_loans')}
                      className="px-2 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
                    >
                      Pay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. IN-DASHBOARD LIVE TRANSACTION SEARCH & FILTER SECTION */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Instant Transaction Search & Quick Ledger
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {searchedTransactions.length} found
            </span>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(['all', 'expense', 'income', 'transfer'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDashboardTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  dashboardTypeFilter === type
                    ? 'bg-slate-900 text-white dark:bg-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={dashboardSearchQuery}
            onChange={(e) => setDashboardSearchQuery(e.target.value)}
            placeholder="Search by description, vendor, category, UPI/Cash, amount (₹)..."
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          {dashboardSearchQuery && (
            <button
              onClick={() => setDashboardSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Search Results Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Category & Details</th>
                <th className="py-2.5 px-3">Account & Mode</th>
                <th className="py-2.5 px-3 text-right">Amount (INR ₹)</th>
                <th className="py-2.5 px-3 text-center w-14">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {searchedTransactions.length > 0 ? (
                searchedTransactions.map((txn) => {
                  const cat = categoriesMap.get(txn.categoryId);
                  const acc = accountsMap.get(txn.accountId);
                  const isExpense = txn.type === 'expense';
                  const isIncome = txn.type === 'income';

                  return (
                    <tr
                      key={txn.id}
                      onClick={() => onViewTransaction(txn)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {formatDateIN(txn.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <CategoryIcon name={cat?.icon || 'Tag'} color={cat?.color} size={15} />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate">
                              {txn.description}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {cat?.name || 'Category'} {txn.vendor ? `· ${txn.vendor}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{acc?.name || 'Account'}</span>
                        <span className="block text-[10px] uppercase font-mono">{txn.paymentMethod}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-bold tabular-nums text-sm ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isExpense
                              ? 'text-slate-900 dark:text-white'
                              : 'text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatINR(txn.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewTransaction(txn);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <p className="text-xs">No transactions match your search filter.</p>
                    <button
                      onClick={() => {
                        setDashboardSearchQuery('');
                        setDashboardTypeFilter('all');
                      }}
                      className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline"
                    >
                      Clear search filter
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. CHARTS & RECHARTS VISUALIZATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Chart 1: Expenses by Category Donut */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Expenses by Category
              </h2>
              <p className="text-xs text-slate-500">{periodBounds.periodLabel} Distribution</p>
            </div>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              Full Analytics →
            </button>
          </div>
          <CategoryDonutChart data={categoryChartData} totalAmount={periodExpense} />
        </div>

        {/* Chart 2: Monthly Inflow vs Outflow Comparison Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Monthly Inflow vs Outflow
              </h2>
              <p className="text-xs text-slate-500">Income vs Expenses Performance</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Recent Months</span>
          </div>
          <IncomeExpenseBarChart data={monthlyComparisonData} />
        </div>
      </div>

      {/* Full-width Daily Spending Trend Area */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Daily Expense Momentum
            </h2>
            <p className="text-xs text-slate-500">Distribution over {periodBounds.periodLabel}</p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            Average: {formatINR(periodExpense / 30, { hideDecimals: true })} / day
          </span>
        </div>
        <ExpenseTrendAreaChart data={dailySpendPoints} monthLabel={periodBounds.periodLabel} />
      </div>

      {/* 7. DEDICATED MONTHLY BUDGET MODAL TRIGGER */}
      <MonthlyBudgetModal
        isOpen={isMonthlyBudgetModalOpen}
        onClose={() => setIsMonthlyBudgetModalOpen(false)}
        initialMonth={periodBounds.startDate ? periodBounds.startDate.substring(0, 7) : '2026-10'}
      />
    </div>
  );
};
