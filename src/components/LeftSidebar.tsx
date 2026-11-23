import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  ReceiptText,
  Wallet,
  Target,
  BarChart3,
  Repeat,
  Bell,
  Calculator,
  Users,
  Shield,
  Crown,
  Database,
  Info,
  Smartphone,
  Download,
  Moon,
  Sun,
  Plus,
  Zap,
  ArrowRightLeft,
  ChevronRight,
  ChevronLeft,
  IndianRupee,
  RefreshCw,
  FileDown,
  Tags,
  Lock,
  Phone,
  ArrowDownLeft,
  Minus,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
  Printer,
  Building2,
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PurchaseService } from '../services/purchaseService';
import { formatINR } from '../utils/formatters';

interface LeftSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMonthlySummary?: () => void;
  onOpenStatementPdf?: () => void;
  onOpenTransactionModal: (type?: 'expense' | 'income') => void;
  onOpenQuickEntryModal: () => void;
  onOpenTransferModal: () => void;
  onOpenCategoryModal?: () => void;
  onOpenBackupModal: () => void;
  onOpenAboutModal: () => void;
  onOpenPurchasesModal: () => void;
  onOpenInstallModal?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
  activeTab,
  setActiveTab,
  onOpenMonthlySummary,
  onOpenStatementPdf,
  onOpenTransactionModal,
  onOpenQuickEntryModal,
  onOpenTransferModal,
  onOpenCategoryModal,
  onOpenBackupModal,
  onOpenAboutModal,
  onOpenPurchasesModal,
  onOpenInstallModal,
}) => {
  const {
    transactions,
    accounts,
    loans,
    overdueEmis,
    categories,
    budget,
    availableBalance,
    monthlySummary,
    budgetUtilization,
    settings,
    updateSettings,
    lockApp,
    triggerCloudSync,
    exportFinancialData,
  } = useFinance();

  const { userProfile, role, isDevAccount, switchToDevAccount, switchToUserAccount } = useAuth();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const entitlement = PurchaseService.getLocalEntitlement();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok && onOpenInstallModal) {
        onOpenInstallModal();
      }
    } else if (onOpenInstallModal) {
      onOpenInstallModal();
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Automated Category Budget Warnings (>= 80% and >= 100%)
  const budgetAlertCount = React.useMemo(() => {
    let count = 0;
    const currentMonthExpenses = transactions.filter(
      (t) => t.date && t.date.startsWith('2026-10') && t.type === 'expense'
    );
    categories.forEach((cat) => {
      const catBudget = budget.categoryBudgets[cat.id] || cat.monthlyBudget;
      if (catBudget && catBudget > 0) {
        const spent = currentMonthExpenses
          .filter((t) => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);
        const pct = (spent / catBudget) * 100;
        if (pct >= 80) count++;
      }
    });
    return count;
  }, [transactions, categories, budget]);

  // Keyboard shortcut: Escape to close mobile sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMobileOpen && e.key === 'Escape') {
        onMobileClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onMobileClose]);

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      onMobileClose();
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback('Syncing with Cloud...');
      await triggerCloudSync();
      setSyncFeedback('Sync Complete!');
      setTimeout(() => setSyncFeedback(null), 2500);
    } catch {
      setSyncFeedback('Sync queued offline');
      setTimeout(() => setSyncFeedback(null), 2500);
    } finally {
      setIsSyncing(false);
    }
  };

  // Grouped ERP Navigation structure
  const navigationGroups: {
    groupName: string;
    items: {
      id: ActiveTab;
      label: string;
      sublabel: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      badge?: string | number;
      badgeColor?: string;
    }[];
  }[] = [
    {
      groupName: 'Overview & Analytics',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Overview',
          sublabel: 'Financial Health & KPIs',
          icon: LayoutDashboard,
          color: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'reports',
          label: 'Reports & 6-Mo Trends',
          sublabel: 'Recharts P&L & Cash Book',
          icon: BarChart3,
          color: 'text-teal-600 dark:text-teal-400',
        },
      ],
    },
    {
      groupName: 'Ledgers & Operations',
      items: [
        {
          id: 'transactions',
          label: 'Transactions & Ledger',
          sublabel: 'Daily Inflows & Outflows',
          icon: ReceiptText,
          color: 'text-sky-600 dark:text-sky-400',
          badge: `${transactions.length}`,
        },
        {
          id: 'accounts',
          label: 'Accounts & Wallets',
          sublabel: 'Banks, Cards & UPI Wallets',
          icon: Wallet,
          color: 'text-indigo-600 dark:text-indigo-400',
          badge: `${accounts.length}`,
        },
        {
          id: 'emi_loans',
          label: 'Outstanding & EMIs',
          sublabel: 'Loan Accounts & Schedules',
          icon: Building2,
          color: 'text-rose-600 dark:text-rose-400',
          badge: overdueEmis.length > 0 ? `${overdueEmis.length} OVERDUE` : `${loans.length}`,
          badgeColor: overdueEmis.length > 0 ? 'bg-rose-500 text-white animate-pulse' : undefined,
        },
        {
          id: 'recurring_debts',
          label: 'Khata Book & Bills',
          sublabel: 'Lent, Borrowed & EMIs',
          icon: Repeat,
          color: 'text-amber-600 dark:text-amber-400',
        },
      ],
    },
    {
      groupName: 'Planning & Budgets',
      items: [
        {
          id: 'budgets',
          label: 'Budgets & Goals',
          sublabel: 'Category Limits & Targets',
          icon: Target,
          color: 'text-purple-600 dark:text-purple-400',
          badge: `${Math.round(budgetUtilization.utilizationPercentage)}%`,
          badgeColor: budgetUtilization.isOverBudget ? 'bg-rose-500 text-white' : undefined,
        },
        {
          id: 'notifications',
          label: 'Budget Alerts & Notices',
          sublabel: 'Threshold Notifications',
          icon: Bell,
          color: 'text-rose-600 dark:text-rose-400',
          badge: budgetAlertCount > 0 ? `${budgetAlertCount} ALERT${budgetAlertCount > 1 ? 'S' : ''}` : undefined,
          badgeColor: 'bg-rose-500 text-white animate-pulse',
        },
      ],
    },
    {
      groupName: 'System & Security',
      items: [
        {
          id: 'testing',
          label: 'Automated QA Testing',
          sublabel: 'Decimal-Safe Math Engine',
          icon: Calculator,
          color: 'text-cyan-600 dark:text-cyan-400',
        },
        {
          id: 'users',
          label: 'Users & Roles (RBAC)',
          sublabel: 'Audit Trail & Permissions',
          icon: Users,
          color: 'text-violet-600 dark:text-violet-400',
          badge: role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Data Entry',
          badgeColor: role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600',
        },
        {
          id: 'auth',
          label: 'Phone OTP & Security',
          sublabel: 'SMS Session & Cloud User',
          icon: Shield,
          color: 'text-emerald-600 dark:text-emerald-400',
        },
      ],
    },
  ];

  // Filtered navigation list based on search
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sublabel.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  // Common sidebar content
  const sidebarBody = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-600/10 via-transparent to-sky-600/5 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-hidden group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight tracking-tight truncate">
                  Budget Management
                </h1>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">
                  Inventory & Finance ERP
                </p>
              </div>
            )}
          </button>

          {/* Desktop collapse toggle or Mobile close */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon Rail'}
              aria-label="Toggle Sidebar width"
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Profile Card (only when expanded) */}
        {!isCollapsed && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isDevAccount
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {isDevAccount ? '⚡' : userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate text-[11px]">
                  {isDevAccount ? 'Naseer Ul Haq (Dev)' : (userProfile?.displayName || 'Personal User')}
                </p>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  {isDevAccount ? '+91-7006708349' : (userProfile?.phoneNumber || '+91-9845012345')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  isDevAccount
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {isDevAccount ? 'DEV' : 'USER'}
              </span>
              <button
                onClick={() => {
                  if (isDevAccount) {
                    switchToUserAccount();
                  } else {
                    switchToDevAccount();
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={isDevAccount ? 'Switch to Personal User Account' : 'Switch to Developer Account'}
              >
                ⇄
              </button>
            </div>
          </div>
        )}

        {/* Feedback toast if syncing */}
        {syncFeedback && !isCollapsed && (
          <div className="mt-2 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      {/* Real-time Balances Snapshot (Only when expanded) */}
      {!isCollapsed && (
        <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Available Balance</span>
            {onOpenMonthlySummary ? (
              <button
                onClick={onOpenMonthlySummary}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                title="Open Monthly Financial Summary"
              >
                <span>Oct 2026 Summary</span>
                <span>→</span>
              </button>
            ) : (
              <span className="text-slate-500 font-medium">October 2026</span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatINR(availableBalance)}
            </span>
            <div className="flex items-center gap-2 text-[11px] tabular-nums font-semibold">
              <span className="text-emerald-600 flex items-center">
                +{formatINR(monthlySummary.totalIncome)}
              </span>
              <span className="text-rose-600 flex items-center">
                -{formatINR(monthlySummary.totalExpenses)}
              </span>
            </div>
          </div>

          {/* Budget Utilization bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Budget: {Math.round(budgetUtilization.utilizationPercentage)}% Used</span>
              <span className={budgetUtilization.isOverBudget ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-400 font-mono'}>
                {budgetUtilization.isOverBudget
                  ? `Over by ${formatINR(Math.abs(budgetUtilization.remaining))}`
                  : `${formatINR(budgetUtilization.remaining)} left`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  budgetUtilization.isOverBudget
                    ? 'bg-rose-500'
                    : budgetUtilization.utilizationPercentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, budgetUtilization.utilizationPercentage))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* One-Tap ERP Actions Grid */}
      {!isCollapsed ? (
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
            Quick Actions & Tools
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <button
              onClick={() => onOpenTransactionModal('expense')}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-900/60 active:scale-95 transition-all"
              title="Record Expense"
            >
              <Minus className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 mb-1" />
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 leading-none">Expense</span>
            </button>

            <button
              onClick={() => onOpenTransactionModal('income')}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-200/80 dark:border-emerald-900/60 active:scale-95 transition-all"
              title="Record Income"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 leading-none">Income</span>
            </button>

            <button
              onClick={onOpenQuickEntryModal}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-900/60 active:scale-95 transition-all"
              title="Quick 5s Entry"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 mb-1" />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 leading-none">Quick 5s</span>
            </button>

            {onOpenMonthlySummary && (
              <button
                onClick={onOpenMonthlySummary}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-teal-50/80 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/40 border border-teal-200/80 dark:border-teal-900/60 active:scale-95 transition-all"
                title="View Full Monthly Summary"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mb-1" />
                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 leading-none">Summary</span>
              </button>
            )}

            <button
              onClick={onOpenTransferModal}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 border border-sky-200/80 dark:border-sky-900/60 active:scale-95 transition-all"
              title="Transfer Funds"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 mb-1" />
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 leading-none">Transfer</span>
            </button>

            <button
              onClick={() => {
                if (onOpenCategoryModal) onOpenCategoryModal();
                else handleNavClick('budgets');
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-900/60 active:scale-95 transition-all"
              title="Manage Categories"
            >
              <Tags className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 mb-1" />
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 leading-none">Category</span>
            </button>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-teal-50/80 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/40 border border-teal-200/80 dark:border-teal-900/60 active:scale-95 transition-all"
              title="Sync with Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mb-1 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 leading-none">Sync</span>
            </button>

            <button
              onClick={() => onOpenBackupModal()}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 border border-sky-200/80 dark:border-sky-900/60 active:scale-95 transition-all"
              title="Backup & Restore Financial Ledger Records"
            >
              <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 mb-1" />
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 leading-none">Backup</span>
            </button>

            <button
              onClick={() => {
                exportFinancialData();
                setSyncFeedback('CSV Report Exported!');
                setTimeout(() => setSyncFeedback(null), 2500);
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-900/60 active:scale-95 transition-all"
              title="Export CSV Statement"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 mb-1" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-none">CSV</span>
            </button>

            {onOpenStatementPdf && (
              <button
                onClick={onOpenStatementPdf}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 transition-all"
                title="Print Official Statement as Read-Only PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 mb-1" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-none">PDF Stmt</span>
              </button>
            )}

            {settings.pinLockEnabled ? (
              <button
                onClick={lockApp}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                title="Lock App"
              >
                <Lock className="w-3.5 h-3.5 text-rose-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-none">Lock PIN</span>
              </button>
            ) : (
              <button
                onClick={onOpenPurchasesModal}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300 dark:border-amber-700 active:scale-95 transition-all"
                title="Google Play Pro Store"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20 mb-1" />
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-none">Pro Store</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Collapsed mini action icons */
        <div className="py-2 flex flex-col items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => onOpenTransactionModal('expense')}
            className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
            title="Record Expense"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenTransactionModal('income')}
            className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
            title="Record Income"
          >
            <ArrowDownLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenQuickEntryModal}
            className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors"
            title="Quick 5s Entry"
          >
            <Zap className="w-4 h-4 fill-amber-500/20" />
          </button>
          {onOpenStatementPdf && (
            <button
              onClick={onOpenStatementPdf}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Print Official Statement as Read-Only PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center hover:bg-teal-100 transition-colors"
            title="Sync with Cloud"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onOpenBackupModal()}
            className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors"
            title="Backup & Restore Data"
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Input (Only when expanded) */}
      {!isCollapsed && (
        <div className="px-3 pt-2.5 pb-1 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all functions & ledgers..."
            className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Main ERP Navigation Modules (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-3 scrollbar-thin">
        {filteredGroups.map((group) => (
          <div key={group.groupName}>
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.groupName}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all active:scale-[0.98] ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs border border-emerald-200 dark:border-emerald-800/80'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                    title={isCollapsed ? `${item.label} (${item.sublabel})` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 ' + item.color
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {!isCollapsed && (
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">{item.label}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.sublabel}</p>
                        </div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.badgeColor ||
                              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick Accounts & Wallets Peek (When expanded) */}
        {!isCollapsed && (
          <div className="pt-2 px-1">
            <div className="flex items-center justify-between mb-1.5 px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Accounts Peek
              </span>
              <button
                onClick={() => handleNavClick('accounts')}
                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Manage
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {accounts.slice(0, 4).map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleNavClick('accounts')}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {acc.name}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 tabular-nums">
                    {formatINR(acc.balance)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pro Store Upgrade Card */}
        {!isCollapsed && (
          <div className="pt-1">
            <button
              onClick={onOpenPurchasesModal}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300/80 dark:border-amber-700 text-left active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Crown className="w-4 h-4 fill-amber-200" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Play Store & Pro
                    </p>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                      {entitlement.isActive ? 'ACTIVE' : 'PRO'}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                    Unlimited budgets & cloud
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
            </button>
          </div>
        )}

        {/* Install Offline PWA Button in Sidebar */}
        {!isInstalled && (
          <div className="pt-1.5">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/50 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-700/80 text-left active:scale-[0.98] transition-all cursor-pointer"
              title="Install Budget Management App (100% Offline PWA)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                        Install Offline App
                      </p>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-600 text-white">
                        PWA
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
                      Fast home screen access
                    </p>
                  </div>
                )}
              </div>
              {!isCollapsed && <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP PERMANENT ERP DOCKED LEFT SIDEBAR */}
      <aside
        aria-label="Desktop ERP Sidebar"
        className={`hidden md:flex flex-col h-[100dvh] sticky top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 transition-all duration-300 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-64 lg:w-72'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* 2. MOBILE SLIDE-IN OVERLAY DRAWER */}
      <div
        onClick={onMobileClose}
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      <aside
        aria-label="Mobile Navigation Sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-[88vw] max-w-[340px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarBody}
      </aside>
    </>
  );
};
