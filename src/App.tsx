import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { LeftSidebar } from './components/LeftSidebar';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { AccountsView } from './components/views/AccountsView';
import { BudgetView } from './components/views/BudgetView';
import { ReportsView } from './components/views/ReportsView';
import { EmiLoansView } from './components/views/EmiLoansView';
import { RecurringAndDebtsView } from './components/views/RecurringAndDebtsView';
import { TestingView } from './components/views/TestingView';
import { UsersView } from './components/views/UsersView';
import { NotificationsView } from './components/views/NotificationsView';
import { AuthView } from './components/views/AuthView';
import { TransactionModal } from './components/modals/TransactionModal';
import { QuickEntryModal } from './components/modals/QuickEntryModal';
import { TransferModal } from './components/modals/TransferModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { BackupModal } from './components/modals/BackupModal';
import { SettleDebtModal } from './components/modals/SettleDebtModal';
import { AboutModal } from './components/modals/AboutModal';
import { InAppPurchasesModal } from './components/modals/InAppPurchasesModal';
import { MonthlySummaryModal } from './components/modals/MonthlySummaryModal';
import { StatementPdfModal } from './components/modals/StatementPdfModal';
import { AutomatedBudgetAlertBanner } from './components/alerts/AutomatedBudgetAlertBanner';
import { PinLockScreen } from './components/PinLockScreen';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PWAInstallModal } from './components/modals/PWAInstallModal';
import { CloudSyncModal } from './components/modals/CloudSyncModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Transaction, TransactionType, DebtRecord } from './types/finance';

function MainApp() {
  const { isUnlocked, settings } = useFinance();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modal triggers
  const [isMonthlySummaryOpen, setIsMonthlySummaryOpen] = useState(false);
  const [isStatementPdfOpen, setIsStatementPdfOpen] = useState(false);
  const [statementPdfParams, setStatementPdfParams] = useState<{
    title?: string;
    dateRangeLabel?: string;
    selectedAccountId?: string;
    customTransactions?: Transaction[];
  } | null>(null);

  const handleOpenStatementPdf = (params?: {
    title?: string;
    dateRangeLabel?: string;
    selectedAccountId?: string;
    customTransactions?: Transaction[];
  }) => {
    setStatementPdfParams(params || null);
    setIsStatementPdfOpen(true);
  };

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>('expense');

  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isPurchasesModalOpen, setIsPurchasesModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);

  const [receiptViewingTransaction, setReceiptViewingTransaction] = useState<Transaction | null>(null);
  const [settlingDebt, setSettlingDebt] = useState<DebtRecord | null>(null);

  // Keyboard shortcuts (N for new transaction, Q for quick log, T for transfer, M or [ for Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'm' || e.key === 'M' || e.key === '[') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
        setIsMobileSidebarOpen((prev) => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setDefaultTransactionType('expense');
        setEditingTransaction(null);
        setIsTransactionModalOpen(true);
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setIsQuickEntryOpen(true);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsTransferModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile edge swipe-to-open gesture (swiping from left screen edge)
  useEffect(() => {
    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX < 35 && e.changedTouches.length === 1) {
        const diffX = e.changedTouches[0].clientX - touchStartX;
        if (diffX > 45) {
          setIsMobileSidebarOpen(true);
        }
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // If PIN lock enabled and app is locked
  if (settings.pinLockEnabled && !isUnlocked) {
    return <PinLockScreen />;
  }

  const handleOpenNewTransaction = (type: TransactionType = 'expense') => {
    setDefaultTransactionType(type);
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (txn: Transaction) => {
    setEditingTransaction(txn);
    setDefaultTransactionType(txn.type);
    setIsTransactionModalOpen(true);
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors flex flex-row relative overflow-hidden">
      {/* 1. LEFT SIDEBAR: ALL FUNCTIONS ON THE LEFT SIDE LIKE AN INVENTORY MANAGEMENT SYSTEM */}
      <LeftSidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMonthlySummary={() => setIsMonthlySummaryOpen(true)}
        onOpenStatementPdf={handleOpenStatementPdf}
        onOpenTransactionModal={handleOpenNewTransaction}
        onOpenQuickEntryModal={() => setIsQuickEntryOpen(true)}
        onOpenTransferModal={() => setIsTransferModalOpen(true)}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
        onOpenPurchasesModal={() => setIsPurchasesModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* 2. MAIN APPLICATION WORKSPACE CANVAS (RIGHT SIDE) */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto overscroll-contain">
        {/* Full-width PWA Install Banner */}
        <PWAInstallBanner />

        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenMonthlySummary={() => setIsMonthlySummaryOpen(true)}
          onOpenStatementPdf={handleOpenStatementPdf}
          onOpenTransactionModal={handleOpenNewTransaction}
          onOpenQuickEntryModal={() => setIsQuickEntryOpen(true)}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
          onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
          onOpenPurchasesModal={() => setIsPurchasesModalOpen(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
        />

        {/* Main Viewport Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-16 space-y-4">
          {/* Automated Real-Time Category Budget Warnings (80% and 100% threshold breach alerts) */}
          <AutomatedBudgetAlertBanner
            onNavigateToTab={(tab) => setActiveTab(tab as ActiveTab)}
            onOpenBudgetModal={() => setActiveTab('budgets')}
          />

          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenNewTransaction={handleOpenNewTransaction}
              onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
              onOpenTransfer={() => setIsTransferModalOpen(true)}
              onViewTransaction={handleEditTransaction}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenMonthlySummary={() => setIsMonthlySummaryOpen(true)}
              onOpenStatementPdf={handleOpenStatementPdf}
              onOpenPurchasesModal={() => setIsPurchasesModalOpen(true)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              onOpenNewTransaction={handleOpenNewTransaction}
              onEditTransaction={handleEditTransaction}
              onViewReceipt={(txn) => setReceiptViewingTransaction(txn)}
              onOpenStatementPdf={handleOpenStatementPdf}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              onOpenTransfer={() => setIsTransferModalOpen(true)}
              onFilterByAccount={(accId) => {
                setActiveTab('transactions');
              }}
              onOpenStatementPdf={handleOpenStatementPdf}
            />
          )}

          {activeTab === 'emi_loans' && (
            <EmiLoansView
              onOpenStatementPdf={handleOpenStatementPdf}
              onNavigateToTab={(tab) => setActiveTab(tab as ActiveTab)}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetView
              onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView onOpenStatementPdf={handleOpenStatementPdf} />
          )}

          {activeTab === 'recurring_debts' && (
            <RecurringAndDebtsView
              onOpenSettleDebt={(debt) => setSettlingDebt(debt)}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView onNavigate={(tab) => setActiveTab(tab as ActiveTab)} />
          )}

          {activeTab === 'testing' && <TestingView />}

          {activeTab === 'users' && <UsersView />}

          {activeTab === 'auth' && (
            <AuthView onSuccess={() => setActiveTab('dashboard')} />
          )}
        </main>
      </div>

      {/* Offline Status Connectivity Badge */}
      <OfflineIndicator />

      {/* Modals */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
        }}
        editingTransaction={editingTransaction}
        defaultType={defaultTransactionType}
        onSaveAndPrint={(txn) => {
          handleOpenStatementPdf({
            title: 'TRANSACTION RECEIPT & AUDIT VOUCHER',
            customTransactions: [txn],
            dateRangeLabel: `Txn Voucher #${txn.id.substring(0, 10)} (${txn.date})`,
          });
        }}
      />

      <QuickEntryModal
        isOpen={isQuickEntryOpen}
        onClose={() => setIsQuickEntryOpen(false)}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <ReceiptModal
        transaction={receiptViewingTransaction}
        onClose={() => setReceiptViewingTransaction(null)}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <InAppPurchasesModal
        isOpen={isPurchasesModalOpen}
        onClose={() => setIsPurchasesModalOpen(false)}
      />

      <SettleDebtModal
        debt={settlingDebt}
        onClose={() => setSettlingDebt(null)}
      />

      <MonthlySummaryModal
        isOpen={isMonthlySummaryOpen}
        onClose={() => setIsMonthlySummaryOpen(false)}
        onOpenStatementPdf={handleOpenStatementPdf}
      />

      <StatementPdfModal
        isOpen={isStatementPdfOpen}
        onClose={() => setIsStatementPdfOpen(false)}
        {...(statementPdfParams || {})}
      />

      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainApp />
      </FinanceProvider>
    </AuthProvider>
  );
}
