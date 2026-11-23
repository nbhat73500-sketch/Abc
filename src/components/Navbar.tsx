import React from 'react';
import {
  Moon,
  Sun,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
  LogOut,
  Calendar,
  Printer,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Download,
  Building2,
  Link2,
  Cloud,
  WifiOff,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type ActiveTab =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'emi_loans'
  | 'budgets'
  | 'reports'
  | 'recurring_debts'
  | 'notifications'
  | 'testing'
  | 'users'
  | 'auth';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  onOpenMobileSidebar?: () => void;
  onOpenMonthlySummary?: () => void;
  onOpenStatementPdf?: () => void;
  onOpenTransactionModal?: (type?: 'expense' | 'income') => void;
  onOpenQuickEntryModal?: () => void;
  onOpenTransferModal?: () => void;
  onOpenCategoryModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenAboutModal?: () => void;
  onOpenPurchasesModal?: () => void;
  onOpenInstallModal?: () => void;
  onOpenCloudSyncModal?: () => void;
}

const tabMetadata: Record<
  ActiveTab,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  dashboard: { label: 'Dashboard Overview', icon: LayoutDashboard },
  transactions: { label: 'Transactions & Ledger', icon: ReceiptText },
  accounts: { label: 'Accounts & Wallets', icon: Wallet },
  emi_loans: { label: 'Outstanding & EMIs', icon: Building2 },
  budgets: { label: 'Budgets & Goals', icon: Target },
  reports: { label: 'Reports & 6-Mo Trends', icon: BarChart3 },
  recurring_debts: { label: 'Khata Book & Bills', icon: Repeat },
  notifications: { label: 'Budget Alerts', icon: Bell },
  testing: { label: 'Automated QA Testing', icon: Calculator },
  users: { label: 'Users & Roles (RBAC)', icon: Users },
  auth: { label: 'Authentication & Profile', icon: Shield },
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
  onOpenMonthlySummary,
  onOpenStatementPdf,
  onOpenInstallModal,
  onOpenCloudSyncModal,
}) => {
  const {
    settings,
    updateSettings,
    syncState,
    pendingSyncCount,
    syncLinkConfig,
    activeSyncTarget,
    lockApp,
    transactions,
    categories,
    budget,
    triggerCloudSync,
  } = useFinance();
  const { userProfile, role, logout, isDevAccount, allUsers, switchActiveUser } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const userDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isSyncingLocal, setIsSyncingLocal] = React.useState(false);

  const { isInstallable, isInstalled, install } = usePWAInstall();

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

  const handleSync = async () => {
    setIsSyncingLocal(true);
    try {
      await triggerCloudSync();
    } finally {
      setIsSyncingLocal(false);
    }
  };

  const effectiveSyncState = isSyncingLocal ? 'syncing' : syncState;
  const syncStatusConfig = {
    synced: {
      badge: 'Synced',
      dot: 'bg-emerald-500',
      pill: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
      badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    },
    syncing: {
      badge: 'Syncing...',
      dot: 'bg-sky-500 animate-ping',
      pill: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
      badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    },
    local: {
      badge: 'Local',
      dot: 'bg-amber-500',
      pill: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50',
      badgeBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    },
    offline: {
      badge: 'Offline',
      dot: 'bg-rose-500',
      pill: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100',
      badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    },
    error: {
      badge: 'Retry',
      dot: 'bg-rose-500',
      pill: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100',
      badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    },
  }[effectiveSyncState];

  // Close user dropdown on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showUserDropdown]);

  // Real-time calculation of active budget alerts (>= 80% and >= 100%)
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

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
      if (settings.pinLockEnabled) {
        lockApp();
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const activeMeta = tabMetadata[activeTab] || tabMetadata.dashboard;
  const ActiveIcon = activeMeta.icon;

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-16">
          {/* Left: Mobile Drawer Trigger / Desktop Sidebar Toggle & Active Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={onOpenMobileSidebar}
              aria-label="Open Left Navigation Sidebar"
              title="Open Left Sidebar with all functions"
              className="md:hidden p-2 -ml-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Desktop Sidebar Collapse / Expand Toggle */}
            {onToggleSidebarCollapse && (
              <button
                onClick={onToggleSidebarCollapse}
                className="hidden md:flex p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title={isSidebarCollapsed ? 'Expand Left Sidebar' : 'Collapse Left Sidebar'}
                aria-label="Toggle Sidebar Collapse"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Active Workspace Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline text-slate-400">Finance ERP</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white truncate">
                <ActiveIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">{activeMeta.label}</span>
              </div>
            </div>
          </div>

          {/* Right: Install, Notification Bell, Statement PDF, Monthly Summary, Synchronise, Data Clear, User Switcher, Theme & Logout */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* 0. Install App Button (Prominent when not installed) */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shadow-2xs"
                title="Install Application on this device (Offline PWA)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden xl:inline">Install</span>
              </button>
            )}

            {/* 1. Prominent One-Click Cloud Sync Now Button + Live Status + Mobile/Desktop Link */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handleSync}
                disabled={effectiveSyncState === 'syncing'}
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-70 ${syncStatusConfig.pill} border-0`}
                title={`Click to Sync Now with ${activeSyncTarget.label}${pendingSyncCount > 0 ? ` (${pendingSyncCount} queued)` : ''}`}
              >
                {effectiveSyncState === 'offline' ? (
                  <WifiOff className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <RefreshCw
                    className={`w-3.5 h-3.5 shrink-0 ${
                      effectiveSyncState === 'syncing' ? 'animate-spin' : ''
                    }`}
                  />
                )}
                <span className="whitespace-nowrap">Sync Now</span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-tight ${syncStatusConfig.badgeBg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${syncStatusConfig.dot}`} />
                  <span>{syncStatusConfig.badge}</span>
                </span>
              </button>

              {onOpenCloudSyncModal && (
                <button
                  type="button"
                  onClick={onOpenCloudSyncModal}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-l border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title={
                    syncLinkConfig.mode === 'room'
                      ? `Linked to Sync Room #${syncLinkConfig.roomCode} — Click to manage Mobile ↔ Desktop Sync`
                      : syncLinkConfig.mode === 'google'
                      ? `Linked to Google Account (${syncLinkConfig.googleEmail || 'Cloud'}) — Click to manage`
                      : 'Link Mobile ↔ Desktop via 6-Digit Room ID or Google Sign-In'
                  }
                >
                  {syncLinkConfig.mode === 'room' && syncLinkConfig.roomCode ? (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="hidden md:inline font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        #{syncLinkConfig.roomCode}
                      </span>
                    </>
                  ) : syncLinkConfig.mode === 'google' ? (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="hidden md:inline text-[11px] font-bold text-sky-700 dark:text-sky-300">
                        Google
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span className="hidden lg:inline text-[11px]">Link</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 3. Automated Budget Warning Bell */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`relative p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                budgetAlertCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800/80 animate-pulse'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={
                budgetAlertCount > 0
                  ? `Automated Budget Warning: ${budgetAlertCount} category threshold(s) breached (80%/100%)`
                  : 'Budget Alerts & Notices'
              }
              aria-label="Budget Notifications"
            >
              <Bell className="w-4 h-4" />
              {budgetAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {budgetAlertCount}
                </span>
              )}
            </button>

            {/* 4. Print Read-Only PDF Statement Button */}
            {onOpenStatementPdf && (
              <button
                onClick={onOpenStatementPdf}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Print Official Statement as Read-Only PDF Format"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                <span className="hidden xl:inline">Statement</span>
                <span className="hidden md:inline xl:hidden">PDF</span>
              </button>
            )}

            {/* 5. Top Monthly Summary Button */}
            {onOpenMonthlySummary && (
              <button
                onClick={onOpenMonthlySummary}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="View Full Monthly Financial Summary & Statement"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden xl:inline">Monthly Summary</span>
                <span className="hidden lg:inline xl:hidden">Summary</span>
              </button>
            )}

            {/* 6. Individual User Switcher Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="flex items-center gap-1.5 p-1.5 sm:px-2 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                title={`Active Individual: ${userProfile?.displayName || 'User'} (${userProfile?.role || role}) - Click to Switch User`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                  style={{ backgroundColor: userProfile?.avatarColor || '#059669' }}
                >
                  {(userProfile?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[85px]">
                    {userProfile?.displayName || 'User'}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                    {role}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fadeIn text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Individual User Profile
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Each individual gets customized roles and ledger access
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {allUsers.map((u) => {
                      const isActive = u.id === userProfile?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchActiveUser(u.id);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors ${
                            isActive ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: u.avatarColor || '#059669' }}
                            >
                              {(u.displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                                {u.displayName || 'Unnamed User'}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {u.department || u.email || u.phoneNumber}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                              u.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                : u.role === 'manager'
                                ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 px-2 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setActiveTab('users');
                      }}
                      className="w-full text-center py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Manage Users & Edit Roles (RBAC) →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dark/Light Mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark/Light Mode"
            >
              {settings.darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Top Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800/80 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
              title={`Logged in as ${userProfile?.displayName || 'User'} (${userProfile?.role || role}) - Click to Logout`}
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Top Logout */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Sign Out
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to log out of {userProfile?.displayName || 'this account'}?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                Current Role: {role.toUpperCase()} {isDevAccount ? '(Developer Account)' : ''}
              </span>
              Your financial records are saved and secure. You can log back in anytime with your phone or email.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
