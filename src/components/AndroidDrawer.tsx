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
  Moon,
  Sun,
  Plus,
  Zap,
  ArrowRightLeft,
  ChevronRight,
  IndianRupee,
  RefreshCw,
  FileDown,
  Tags,
  Lock,
  Phone,
  ArrowDownLeft,
  Minus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PurchaseService } from '../services/purchaseService';
import { formatINR } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface AndroidDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenTransactionModal: (type?: 'expense' | 'income') => void;
  onOpenQuickEntryModal: () => void;
  onOpenTransferModal: () => void;
  onOpenCategoryModal?: () => void;
  onOpenBackupModal: () => void;
  onOpenAboutModal: () => void;
  onOpenPurchasesModal: () => void;
  onOpenInstallModal?: () => void;
}

export const AndroidDrawer: React.FC<AndroidDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
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
    categories,
    budget,
    availableBalance,
    monthlySummary,
    budgetUtilization,
    syncState,
    pendingSyncCount,
    settings,
    updateSettings,
    lockApp,
    triggerCloudSync,
    exportFinancialData,
  } = useFinance();

  const { userProfile, role } = useAuth();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const entitlement = PurchaseService.getLocalEntitlement();

  const [searchQuery, setSearchQuery] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Touch swipe to close (swipe left)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;
    if (diffX < -50) {
      onClose();
    }
    setTouchStartX(null);
  };

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    onClose();
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback('Syncing with Firestore Cloud...');
      await triggerCloudSync();
      setSyncFeedback('Cloud Sync Complete!');
      setTimeout(() => setSyncFeedback(null), 2500);
    } catch {
      setSyncFeedback('Sync failed. Queued offline.');
      setTimeout(() => setSyncFeedback(null), 2500);
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      sublabel: 'Financial Health & KPIs',
      icon: LayoutDashboard,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'transactions',
      label: 'Transactions & Ledger',
      sublabel: 'Daily Inflows & Outflows',
      icon: ReceiptText,
      color: 'text-sky-600 dark:text-sky-400',
      badge: `${transactions.length} Txns`,
    },
    {
      id: 'accounts',
      label: 'Accounts & Wallets',
      sublabel: 'Banks, Cards & UPI Wallets',
      icon: Wallet,
      color: 'text-indigo-600 dark:text-indigo-400',
      badge: `${accounts.length} Wallets`,
    },
    {
      id: 'budgets',
      label: 'Budgets & Financial Limits',
      sublabel: 'Category Limits & Goals',
      icon: Target,
      color: 'text-purple-600 dark:text-purple-400',
      badge: `${Math.round(budgetUtilization.utilizationPercentage)}% Used`,
      badgeColor: budgetUtilization.isOverBudget ? 'bg-rose-500 text-white' : undefined,
    },
    {
      id: 'reports',
      label: 'Reports & 6-Mo Trends',
      sublabel: 'Recharts P&L & Cash Book',
      icon: BarChart3,
      color: 'text-teal-600 dark:text-teal-400',
    },
    {
      id: 'recurring_debts',
      label: 'Khata Book & Bills',
      sublabel: 'Lent, Borrowed & EMIs',
      icon: Repeat,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'notifications',
      label: 'Budget Alerts & Notices',
      sublabel: '50/75/90/100% Thresholds',
      icon: Bell,
      color: 'text-rose-600 dark:text-rose-400',
      badge: budgetUtilization.isOverBudget ? 'ALERT' : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
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
      sublabel: 'Audit Log & Permissions',
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      id: 'auth',
      label: 'Authentication & Session',
      sublabel: 'Phone OTP & Cloud Profile',
      icon: Shield,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  const filteredItems = navItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sublabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop overlay (all screen sizes) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Slide-in Drawer Container (all screen sizes) */}
      <aside
        aria-label="Navigation Slide Bar"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 bottom-0 left-0 z-50 w-[88vw] max-w-[360px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header with Brand & Close */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-emerald-600/10 via-transparent to-sky-600/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Budget Management
                </h2>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  All Functions & Ledgers Slide Bar
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Navigation Slide Bar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User & License Status Pill */}
          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate text-[11px]">
                  {userProfile?.displayName || 'Naseer Ul Haq'}
                </p>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  {userProfile?.phoneNumber || '+91-7006708349'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                {role}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                {entitlement.tier}
              </span>
            </div>
          </div>

          {/* Sync Status Feedback Toast if Active */}
          {syncFeedback && (
            <div className="mt-2 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        {/* Real-time Financial Snapshot Card */}
        <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Net Balance
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              October 2026
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatINR(availableBalance)}
            </span>
            <div className="flex items-center gap-2 text-[11px] tabular-nums font-semibold">
              <span className="text-emerald-600 flex items-center">
                <ArrowDownLeft className="w-3 h-3 mr-0.5" />
                +{formatINR(monthlySummary.totalIncome)}
              </span>
              <span className="text-rose-600 flex items-center">
                <Minus className="w-3 h-3 mr-0.5" />
                {formatINR(monthlySummary.totalExpenses)}
              </span>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Monthly Budget: {Math.round(budgetUtilization.utilizationPercentage)}% Used</span>
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

        {/* 8 Primary Financial Functions Grid */}
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
            Quick Actions & Tools
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {/* 1. Add Expense */}
            <button
              onClick={() => {
                onClose();
                onOpenTransactionModal('expense');
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-900/60 active:scale-95 transition-all"
              title="Record Expense"
            >
              <Minus className="w-4 h-4 text-rose-600 dark:text-rose-400 mb-1" />
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">Expense</span>
            </button>

            {/* 2. Add Income */}
            <button
              onClick={() => {
                onClose();
                onOpenTransactionModal('income');
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-200/80 dark:border-emerald-900/60 active:scale-95 transition-all"
              title="Record Income"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Income</span>
            </button>

            {/* 3. Quick 5s Log */}
            <button
              onClick={() => {
                onClose();
                onOpenQuickEntryModal();
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-900/60 active:scale-95 transition-all"
              title="5-Second Quick Entry"
            >
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20 mb-1" />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Quick 5s</span>
            </button>

            {/* 4. Transfer Funds */}
            <button
              onClick={() => {
                onClose();
                onOpenTransferModal();
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 border border-sky-200/80 dark:border-sky-900/60 active:scale-95 transition-all"
              title="Transfer Between Accounts"
            >
              <ArrowRightLeft className="w-4 h-4 text-sky-600 dark:text-sky-400 mb-1" />
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">Transfer</span>
            </button>

            {/* 5. Category Manager */}
            <button
              onClick={() => {
                onClose();
                if (onOpenCategoryModal) onOpenCategoryModal();
                else setActiveTab('budgets');
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-900/60 active:scale-95 transition-all"
              title="Manage Categories"
            >
              <Tags className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1" />
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">Category</span>
            </button>

            {/* 6. Manual Cloud Sync */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-teal-50/80 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/40 border border-teal-200/80 dark:border-teal-900/60 active:scale-95 transition-all"
              title="Sync with Cloud"
            >
              <RefreshCw className={`w-4 h-4 text-teal-600 dark:text-teal-400 mb-1 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">Sync</span>
            </button>

            {/* 7. Export CSV Report */}
            <button
              onClick={() => {
                exportFinancialData();
                setSyncFeedback('Financial data CSV downloaded!');
                setTimeout(() => setSyncFeedback(null), 2500);
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-900/60 active:scale-95 transition-all"
              title="Download CSV Statement"
            >
              <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-1" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">Export</span>
            </button>

            {/* 8. App Lock (if PIN enabled) or Store */}
            {settings.pinLockEnabled ? (
              <button
                onClick={() => {
                  onClose();
                  lockApp();
                }}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                title="Lock Ledger"
              >
                <Lock className="w-4 h-4 text-rose-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Lock PIN</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onOpenPurchasesModal();
                }}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300 dark:border-amber-700 active:scale-95 transition-all"
                title="Google Play Store"
              >
                <Crown className="w-4 h-4 text-amber-600 fill-amber-500/20 mb-1" />
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">Pro Store</span>
              </button>
            )}
          </div>
        </div>

        {/* Search inside slide bar */}
        <div className="px-3 pt-2.5 pb-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all modules & tools..."
            className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Scrollable Modules and Sub-features List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Application Modules
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {filteredItems.length} available
            </span>
          </div>

          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs border border-emerald-200 dark:border-emerald-800/60'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 ' + item.color
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">{item.label}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.sublabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </button>
            );
          })}

          {/* Quick Accounts & Wallets Peek */}
          <div className="pt-2 px-1">
            <div className="flex items-center justify-between mb-1.5 px-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Accounts
              </span>
              <button
                onClick={() => handleNavClick('accounts')}
                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View All
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

          {/* Google Play Store & In-App Purchases Pro Card */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenPurchasesModal();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300/80 dark:border-amber-700 text-left active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Crown className="w-4 h-4 fill-amber-200" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Play Store & Pro License
                    </p>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                      {entitlement.isActive ? 'ACTIVE' : 'UPGRADE'}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                    Unlimited budgets, multi-device cloud & trends
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
            </button>
          </div>
        </div>

        {/* Drawer Footer Utilities & Developer Info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Backup & Restore */}
            <button
              onClick={() => {
                onClose();
                onOpenBackupModal();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              <Database className="w-3.5 h-3.5 text-sky-600" />
              <span>Backup Data</span>
            </button>

            {/* Dark/Light toggle */}
            <button
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              {settings.darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{settings.darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          {/* Android PWA Install button */}
          {!isInstalled && (
            <button
              onClick={async () => {
                onClose();
                if (isInstallable) {
                  await install();
                } else if (onOpenInstallModal) {
                  onOpenInstallModal();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install as Android App</span>
            </button>
          )}

          {/* Developer Credit & Support Link (Naseer Ul Haq) */}
          <div className="pt-1 flex items-center gap-1.5">
            <button
              onClick={() => {
                onClose();
                onOpenAboutModal();
              }}
              className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
            >
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate">Developer Naseer Ul Haq</span>
              </div>
            </button>

            <a
              href="tel:+917006708349"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1 shrink-0"
              title="Call Developer (+91-7006708349)"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+91-7006708349</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
