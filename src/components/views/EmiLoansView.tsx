import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Printer,
  Calendar,
  Wallet,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileText,
  CreditCard,
  Edit2,
  Trash2,
  Zap,
  Filter,
  Check,
  ChevronRight,
  RefreshCw,
  Search,
  PieChart,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { LoanAccount, EMIScheduleItem, Account } from '../../types/finance';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { LoanAccountModal } from '../modals/LoanAccountModal';
import { PayEmiModal } from '../modals/PayEmiModal';
import { LoanStatementPdfModal } from '../modals/LoanStatementPdfModal';

interface EmiLoansViewProps {
  onOpenStatementPdf?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const EmiLoansView: React.FC<EmiLoansViewProps> = ({
  onOpenStatementPdf,
  onNavigateToTab,
}) => {
  const {
    loans,
    accounts,
    loanSummary,
    totalLoanLiability,
    totalMonthlyEmiPayable,
    totalEmiPaid,
    totalPrincipalRepaid,
    totalInterestPaid,
    upcomingEmis,
    overdueEmis,
    addLoanAccount,
    updateLoanAccount,
    deleteLoanAccount,
    payEmiInstallment,
    processDueEmis,
  } = useFinance();

  // Navigation tab within EMI view: 'accounts' | 'schedule' | 'banks'
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'schedule' | 'banks'>('accounts');
  const [selectedLoanIdFilter, setSelectedLoanIdFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scheduleViewPeriod, setScheduleViewPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanAccount | null>(null);

  const [payingInstallment, setPayingInstallment] = useState<{
    loan: LoanAccount;
    installment: EMIScheduleItem;
  } | null>(null);

  const [isPdfStatementOpen, setIsPdfStatementOpen] = useState(false);
  const [pdfSelectedLoanId, setPdfSelectedLoanId] = useState<string | undefined>(undefined);

  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refStr = (loan.loanReference || loan.accountReference || '').toLowerCase();
        const typeStr = (loan.loanType || '').toLowerCase();
        const matches =
          loan.lenderName.toLowerCase().includes(q) ||
          loan.loanName.toLowerCase().includes(q) ||
          refStr.includes(q) ||
          typeStr.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [loans, searchQuery]);

  // Consolidated EMI schedule items
  const allScheduleItems = useMemo(() => {
    const list: (EMIScheduleItem & { loan: LoanAccount; bank?: Account })[] = [];
    loans.forEach((loan) => {
      if (selectedLoanIdFilter !== 'all' && loan.id !== selectedLoanIdFilter) return;
      const bank = accountsMap.get(loan.linkedBankAccountId);
      (loan.schedule || []).forEach((item) => {
        list.push({
          ...item,
          loan,
          bank,
        });
      });
    });

    // Sort by due date
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [loans, selectedLoanIdFilter, accountsMap]);

  // Filtered schedule items by status and search
  const filteredScheduleItems = useMemo(() => {
    return allScheduleItems.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.loan.lenderName.toLowerCase().includes(q) ||
          item.loan.loanName.toLowerCase().includes(q) ||
          item.dueDate.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allScheduleItems, statusFilter, searchQuery]);

  // Grouped schedule by period
  const groupedSchedule = useMemo(() => {
    if (scheduleViewPeriod === 'yearly') {
      const map = new Map<string, typeof filteredScheduleItems>();
      filteredScheduleItems.forEach((item) => {
        const yr = item.dueDate.substring(0, 4);
        if (!map.has(yr)) map.set(yr, []);
        map.get(yr)!.push(item);
      });
      return Array.from(map.entries()).map(([label, items]) => ({ label: `Year ${label}`, items }));
    } else if (scheduleViewPeriod === 'monthly') {
      const map = new Map<string, typeof filteredScheduleItems>();
      filteredScheduleItems.forEach((item) => {
        const mo = item.dueDate.substring(0, 7);
        if (!map.has(mo)) map.set(mo, []);
        map.get(mo)!.push(item);
      });
      return Array.from(map.entries()).map(([label, items]) => ({
        label: new Date(`${label}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        items,
      }));
    } else {
      // Daily
      const map = new Map<string, typeof filteredScheduleItems>();
      filteredScheduleItems.forEach((item) => {
        const day = item.dueDate;
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(item);
      });
      return Array.from(map.entries()).map(([label, items]) => ({
        label: formatDateIN(label),
        items,
      }));
    }
  }, [filteredScheduleItems, scheduleViewPeriod]);

  // Process Auto-Debits
  const handleTriggerAutoDebit = () => {
    const res = processDueEmis();
    if (res.processedCount > 0) {
      setBannerFeedback(`Successfully processed ${res.processedCount} automated EMI transfer(s).`);
    } else {
      setBannerFeedback('No pending EMIs were due for automated processing today.');
    }
    setTimeout(() => setBannerFeedback(null), 5000);
  };

  // Status badge helper
  const renderStatusBadge = (status: EMIScheduleItem['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="w-3 h-3 mr-1" /> Due Today
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Upcoming
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <span className="p-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <span>Outstanding Balance & EMI Management</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track loan liabilities, amortization schedules, automated bank-to-EMI transfers & double-entry ledgers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPdfSelectedLoanId(undefined);
              setIsPdfStatementOpen(true);
            }}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
          >
            <Printer className="w-4 h-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            Print Statements (PDF)
          </button>

          <button
            onClick={handleTriggerAutoDebit}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Execute due automated internal EMI transactions"
          >
            <Zap className="w-4 h-4 mr-1.5 text-amber-500" />
            Process Due EMIs
          </button>

          <button
            onClick={() => {
              setEditingLoan(null);
              setIsLoanModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Outstanding Account
          </button>
        </div>
      </div>

      {/* Banner Feedback */}
      {bannerFeedback && (
        <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{bannerFeedback}</span>
          </div>
          <button
            onClick={() => setBannerFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            &times;
          </button>
        </div>
      )}

      {/* Overdue / Due Alert Warning Banner */}
      {(overdueEmis.length > 0 || upcomingEmis.some((i) => i.status === 'due')) && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                Attention Required: {overdueEmis.length} Overdue &amp; Due EMI Installments
              </h4>
              <p className="text-rose-700 dark:text-rose-400 mt-0.5">
                Total payable amount:{' '}
                <strong>
                  {formatINR(
                    [...overdueEmis, ...upcomingEmis.filter((i) => i.status === 'due')].reduce(
                      (s, i) => s + i.emiAmount,
                      0
                    )
                  )}
                </strong>
                . Settle pending EMIs to avoid default interest.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              onClick={() => {
                setActiveSubTab('schedule');
                setStatusFilter('overdue');
              }}
              className="px-3.5 py-1.5 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
            >
              View Overdue Schedules
            </button>
          </div>
        </div>
      )}

      {/* TOP KPI METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Outstanding Loan Liability */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Outstanding Liability
            </span>
            <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatINR(totalLoanLiability)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Sanctioned: {formatINR(loanSummary.totalOriginalPrincipal || loanSummary.totalOriginalAmount || 0)}</span>
            <span className="font-semibold text-emerald-600">
              {(loanSummary.totalOriginalPrincipal || loanSummary.totalOriginalAmount || 0) > 0
                ? `${((((loanSummary.totalOriginalPrincipal || loanSummary.totalOriginalAmount || 0) - totalLoanLiability) / (loanSummary.totalOriginalPrincipal || loanSummary.totalOriginalAmount || 1)) * 100).toFixed(0)}% Repaid`
                : ''}
            </span>
          </div>
        </div>

        {/* Total Monthly EMI Payable */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly EMI Payable
            </span>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatINR(totalMonthlyEmiPayable)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Across <strong>{loanSummary.activeLoansCount}</strong> active loan accounts
          </div>
        </div>

        {/* Total Principal Repaid */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Principal Repaid
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatINR(totalPrincipalRepaid)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Direct reduction in debt principal
          </div>
        </div>

        {/* Total Interest Paid */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Interest Expensed
            </span>
            <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {formatINR(totalInterestPaid)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Cumulative interest paid to lenders
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubTab === 'accounts'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Outstanding Accounts ({loans.length})
          </button>
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubTab === 'schedule'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            EMI Schedules ({allScheduleItems.length})
          </button>
          <button
            onClick={() => setActiveSubTab('banks')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubTab === 'banks'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Bank-Wise Allocation
          </button>
        </div>

        {/* Search & Loan Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search loan or lender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          {activeSubTab === 'schedule' && (
            <>
              <select
                value={selectedLoanIdFilter}
                onChange={(e) => setSelectedLoanIdFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Loans</option>
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lenderName} ({l.loanReference || l.accountReference})
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="due">Due Today</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>

              <div className="flex items-center space-x-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-bold">
                <button
                  onClick={() => setScheduleViewPeriod('daily')}
                  className={`px-2 py-1 rounded ${
                    scheduleViewPeriod === 'daily'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setScheduleViewPeriod('monthly')}
                  className={`px-2 py-1 rounded ${
                    scheduleViewPeriod === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setScheduleViewPeriod('yearly')}
                  className={`px-2 py-1 rounded ${
                    scheduleViewPeriod === 'yearly'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* VIEW CONTENT BASED ON ACTIVE SUB-TAB */}

      {/* 1. OUTSTANDING ACCOUNTS TAB */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Outstanding Balance Accounts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Track your home loans, car loans, personal debts, or credit liabilities with automatic amortization schedules and bank transfer integration.
              </p>
              <button
                onClick={() => {
                  setEditingLoan(null);
                  setIsLoanModalOpen(true);
                }}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Loan Account</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLoans.map((loan) => {
                const bank = accountsMap.get(loan.linkedBankAccountId);
                const paidCount = (loan.schedule || []).filter((i) => i.status === 'paid').length;
                const totalCount = (loan.schedule || []).length;
                const origVal = loan.originalPrincipal ?? loan.originalAmount ?? 0;
                const outVal = loan.currentOutstandingPrincipal ?? loan.outstandingPrincipal ?? 0;
                const progressPct =
                  origVal > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          ((origVal - outVal) / origVal) * 100
                        )
                      )
                    : 0;

                const nextPending = (loan.schedule || []).find((i) => i.status !== 'paid');

                return (
                  <div
                    key={loan.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Lender & Status Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {loan.lenderName}
                            </h3>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {loan.loanType}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {loan.loanName}
                          </p>
                          <span className="font-mono text-[11px] text-slate-500">
                            Ref: {loan.loanReference}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setPdfSelectedLoanId(loan.id);
                              setIsPdfStatementOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Print Loan Statement (PDF)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingLoan(loan);
                              setIsLoanModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Loan Parameters"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Are you sure you want to delete the ${loan.lenderName} (${loan.loanName}) account?`
                                )
                              ) {
                                deleteLoanAccount(loan.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Delete Loan Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Outstanding & EMI Amount */}
                      <div className="grid grid-cols-2 gap-3 mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">
                            Current Outstanding
                          </span>
                          <span className="text-lg font-black text-rose-700 dark:text-rose-400">
                            {formatINR(loan.currentOutstandingPrincipal ?? loan.outstandingPrincipal ?? 0)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Sanctioned: {formatINR(loan.originalPrincipal ?? loan.originalAmount ?? 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block">
                            Scheduled Monthly EMI
                          </span>
                          <span className="text-lg font-black text-slate-900 dark:text-white">
                            {formatINR(loan.emiAmount)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {loan.interestRateAnnual ?? loan.interestRate ?? 0}% p.a. • Day {loan.emiDueDay}
                          </span>
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                          <span>
                            Installments: <strong>{paidCount}</strong> of <strong>{totalCount}</strong> paid
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {progressPct.toFixed(1)}% Repaid
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Linked Bank & Auto-Debit Setting */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <Wallet className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {bank?.name || 'Direct Transfer'}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1">
                              (Bal: {formatINR(bank?.balance || 0)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {loan.autoDebitApproved ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <Zap className="w-3 h-3 mr-1" /> Auto-Debit Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Manual Approval
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action: Next Due & Pay Button */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      {nextPending ? (
                        <div>
                          <span className="text-[10px] text-slate-500 block">Next Installment Due:</span>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {formatDateIN(nextPending.dueDate)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-emerald-600 flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Loan Fully Settled
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedLoanIdFilter(loan.id);
                            setActiveSubTab('schedule');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          View Schedule
                        </button>
                        {nextPending && (
                          <button
                            onClick={() => {
                              setPayingInstallment({
                                loan,
                                installment: nextPending,
                              });
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition inline-flex items-center space-x-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay EMI</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. EMI SCHEDULES & PAYMENT LEDGER TAB */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-4">
          {filteredScheduleItems.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No EMI Schedule Entries Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try selecting a different filter or check if any loan accounts are registered.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedSchedule.map((group) => (
                <div
                  key={group.label}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {group.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      Total EMI:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {formatINR(group.items.reduce((s, i) => s + i.emiAmount, 0))}
                      </strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/20 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">Loan Account</th>
                          <th className="py-2.5 px-4">Due Date</th>
                          <th className="py-2.5 px-4 text-right">EMI Amount</th>
                          <th className="py-2.5 px-4 text-right">Principal</th>
                          <th className="py-2.5 px-4 text-right">Interest</th>
                          <th className="py-2.5 px-4 text-right">Remaining Balance</th>
                          <th className="py-2.5 px-4">Debiting Bank</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {group.items.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition ${
                              item.status === 'overdue'
                                ? 'bg-rose-50/30 dark:bg-rose-950/10'
                                : item.status === 'due'
                                ? 'bg-amber-50/30 dark:bg-amber-950/10'
                                : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                              {item.installmentNumber}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {item.loan.lenderName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {item.loan.loanReference}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                              {formatDateIN(item.dueDate)}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                              {formatINR(item.emiAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatINR(item.principalComponent)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                              {formatINR(item.interestComponent)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                              {formatINR(item.remainingPrincipal ?? item.remainingBalance ?? 0)}
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                              {item.bank?.name || 'Direct Transfer'}
                            </td>
                            <td className="py-3 px-4 text-center">{renderStatusBadge(item.status)}</td>
                            <td className="py-3 px-4 text-right">
                              {item.status !== 'paid' ? (
                                <button
                                  onClick={() => {
                                    setPayingInstallment({
                                      loan: item.loan,
                                      installment: item,
                                    });
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                                >
                                  Pay EMI
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium font-mono">
                                  {item.paidDate ? formatDateIN(item.paidDate) : 'Paid'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. BANK-WISE EMI ALLOCATION TAB */}
      {activeSubTab === 'banks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loanSummary.bankWiseAllocations.map((alloc) => (
              <div
                key={alloc.bankAccountId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {alloc.bankAccountName}
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {alloc.loansCount} linked loan(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Current Available Balance:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(alloc.currentAvailableBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Total Monthly Debits:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      - {formatINR(alloc.monthlyDebitAmount)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-semibold">
                    <span>Balance Post-Debits:</span>
                    <span
                      className={`font-mono ${
                        alloc.isSufficientForMonth
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatINR(alloc.currentAvailableBalance - alloc.monthlyDebitAmount)}
                    </span>
                  </div>
                </div>

                {/* Sufficiency Status Badge */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Sufficiency Status:</span>
                  {alloc.isSufficientForMonth ? (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Sufficient Balance
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Insufficient Funds
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {isLoanModalOpen && (
        <LoanAccountModal
          isOpen={isLoanModalOpen}
          onClose={() => {
            setIsLoanModalOpen(false);
            setEditingLoan(null);
          }}
          onSave={(loanData) => {
            if (editingLoan) {
              updateLoanAccount(editingLoan.id, loanData);
            } else {
              addLoanAccount(loanData);
            }
          }}
          editingLoan={editingLoan}
          accounts={accounts}
        />
      )}

      {payingInstallment && (
        <PayEmiModal
          isOpen={!!payingInstallment}
          onClose={() => setPayingInstallment(null)}
          loan={payingInstallment.loan}
          installment={payingInstallment.installment}
          accounts={accounts}
          onConfirmPayment={(params) => {
            return payEmiInstallment(params);
          }}
        />
      )}

      {isPdfStatementOpen && (
        <LoanStatementPdfModal
          isOpen={isPdfStatementOpen}
          onClose={() => setIsPdfStatementOpen(false)}
          loans={loans}
          selectedLoanId={pdfSelectedLoanId}
          accounts={accounts}
        />
      )}
    </div>
  );
};
