import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  Copy,
  Trash2,
  Edit,
  Eye,
  FileText,
  Calendar,
  ArrowRightLeft,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  IndianRupee,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType, PaymentMethod } from '../../types/finance';
import { formatINR, formatDateIN, exportTransactionsToCSV } from '../../utils/formatters';
import { CategoryIcon } from '../CategoryIcon';
import { CsvImportModal } from '../modals/CsvImportModal';

interface TransactionsViewProps {
  onOpenNewTransaction: (type?: TransactionType) => void;
  onEditTransaction: (txn: Transaction) => void;
  onViewReceipt: (txn: Transaction) => void;
  onOpenStatementPdf?: (params?: { title?: string; accountId?: string; customTxns?: Transaction[]; dateRangeLabel?: string }) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenNewTransaction,
  onEditTransaction,
  onViewReceipt,
  onOpenStatementPdf,
}) => {
  const {
    transactions,
    accounts,
    categories,
    deleteTransaction,
    duplicateTransaction,
  } = useFinance();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  const categoriesMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Dynamic calendar helpers for quick date presets
  const dateAnchors = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    const prevDate = new Date(year, now.getMonth() - 1, 1);
    const lastMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const lastMonthLabel = prevDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    // Indian Financial Year (Apr 1 - Mar 31)
    const fyStartYear = month >= 4 ? year : year - 1;
    const fyEndYear = fyStartYear + 1;
    return {
      todayStr,
      currentMonthStr,
      lastMonthStr,
      currentMonthLabel,
      lastMonthLabel,
      fyStart: `${fyStartYear}-04-01`,
      fyEnd: `${fyEndYear}-03-31`,
      fyLabel: `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`,
    };
  }, []);

  // Filter transactions locally on the current ledger state
  const filteredTransactions = useMemo(() => {
    const parsedMin = minAmount.trim() !== '' ? Number(minAmount) : null;
    const parsedMax = maxAmount.trim() !== '' ? Number(maxAmount) : null;
    const hasMin = parsedMin !== null && !Number.isNaN(parsedMin);
    const hasMax = parsedMax !== null && !Number.isNaN(parsedMax);
    const trimmedQuery = searchTerm.trim().toLowerCase();

    return transactions.filter((txn) => {
      // Keyword search (ID, vendor, description, notes, subcategory, tag, category, account, payment method, amount)
      if (trimmedQuery) {
        const categoryName = categoriesMap.get(txn.categoryId)?.name.toLowerCase() || '';
        const accountName = accountsMap.get(txn.accountId)?.name.toLowerCase() || '';
        const toAccountName = txn.toAccountId ? accountsMap.get(txn.toAccountId)?.name.toLowerCase() || '' : '';
        const paymentLabel = txn.paymentMethod.replace('_', ' ').toLowerCase();
        const matchesQuery =
          txn.id.toLowerCase().includes(trimmedQuery) ||
          txn.description?.toLowerCase().includes(trimmedQuery) ||
          txn.vendor?.toLowerCase().includes(trimmedQuery) ||
          txn.notes?.toLowerCase().includes(trimmedQuery) ||
          txn.subcategory?.toLowerCase().includes(trimmedQuery) ||
          txn.tag?.toLowerCase().includes(trimmedQuery) ||
          categoryName.includes(trimmedQuery) ||
          accountName.includes(trimmedQuery) ||
          toAccountName.includes(trimmedQuery) ||
          paymentLabel.includes(trimmedQuery) ||
          String(txn.amount).includes(trimmedQuery);

        if (!matchesQuery) return false;
      }

      // Amount range filter
      if (hasMin && txn.amount < (parsedMin as number)) {
        return false;
      }
      if (hasMax && txn.amount > (parsedMax as number)) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && txn.type !== selectedType) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && txn.categoryId !== selectedCategory) {
        return false;
      }

      // Account filter
      if (selectedAccount !== 'all') {
        if (txn.accountId !== selectedAccount && txn.toAccountId !== selectedAccount) {
          return false;
        }
      }

      // Payment method
      if (selectedPaymentMethod !== 'all' && txn.paymentMethod !== selectedPaymentMethod) {
        return false;
      }

      // Specific Date Range or Preset Filter
      const txnDate = txn.date;
      if (customStartDate || customEndDate) {
        if (customStartDate && txnDate < customStartDate) return false;
        if (customEndDate && txnDate > customEndDate) return false;
      } else if (datePreset !== 'all') {
        if (datePreset === 'today') {
          if (txnDate !== dateAnchors.todayStr) return false;
        } else if (datePreset === 'this_month') {
          if (!txnDate.startsWith(dateAnchors.currentMonthStr)) return false;
        } else if (datePreset === 'last_month') {
          if (!txnDate.startsWith(dateAnchors.lastMonthStr)) return false;
        } else if (datePreset === 'fy') {
          if (txnDate < dateAnchors.fyStart || txnDate > dateAnchors.fyEnd) return false;
        }
      }

      return true;
    });
  }, [
    transactions,
    searchTerm,
    minAmount,
    maxAmount,
    selectedType,
    selectedCategory,
    selectedAccount,
    selectedPaymentMethod,
    datePreset,
    customStartDate,
    customEndDate,
    categoriesMap,
    accountsMap,
    dateAnchors,
  ]);

  // Aggregate stats for current filtered selection
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfer = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
      else if (t.type === 'transfer') transfer += t.amount;
    });

    return {
      count: filteredTransactions.length,
      income,
      expense,
      transfer,
      net: income - expense,
    };
  }, [filteredTransactions]);

  // Group transactions by date for Daily Cash Book view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();

    // Sort chronologically descending
    const sorted = [...filteredTransactions].sort((a, b) => {
      return `${b.date} ${b.time || '00:00'}`.localeCompare(`${a.date} ${a.time || '00:00'}`);
    });

    sorted.forEach((txn) => {
      const existing = map.get(txn.date) || [];
      existing.push(txn);
      map.set(txn.date, existing);
    });

    return Array.from(map.entries()).map(([date, txns]) => {
      const dayIncome = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const dayExpense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        date,
        transactions: txns,
        dayIncome,
        dayExpense,
        dayNet: dayIncome - dayExpense,
      };
    });
  }, [filteredTransactions]);

  // CSV Export
  const handleExportCSV = () => {
    const catSimpleMap: Record<string, string> = {};
    categories.forEach((c) => {
      catSimpleMap[c.id] = c.name;
    });
    exportTransactionsToCSV(filteredTransactions, accounts, catSimpleMap);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setMinAmount('');
    setMaxAmount('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedPaymentMethod('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    minAmount.trim() ||
    maxAmount.trim() ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedAccount !== 'all' ||
    selectedPaymentMethod !== 'all' ||
    datePreset !== 'all' ||
    customStartDate ||
    customEndDate
  );

  const handlePresetClick = (presetId: string) => {
    setDatePreset(presetId);
    if (presetId !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Title & Primary Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Daily Transactions Ledger & Cash Book
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record, monitor, search and audit all daily monetary movements
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap no-print">
          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
            title="Bulk import historical transactions from bank statements or CSV spreadsheets"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            Import CSV
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
            title="Download CSV Spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => {
              if (onOpenStatementPdf) {
                const rangeLabel =
                  customStartDate || customEndDate
                    ? `${customStartDate || 'Start'} to ${customEndDate || 'Present'}`
                    : datePreset !== 'all'
                    ? `Preset: ${datePreset}`
                    : 'Filtered Ledger View';
                onOpenStatementPdf({
                  title: 'TRANSACTIONS LEDGER STATEMENT',
                  customTxns: filteredTransactions,
                  dateRangeLabel: rangeLabel,
                  accountId: selectedAccount !== 'all' ? selectedAccount : undefined,
                });
              } else {
                handlePrint();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors shadow-2xs"
            title="Open Read-Only PDF Statement for Printing and Downloading"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF Statement</span>
          </button>

          <button
            onClick={() => onOpenNewTransaction('expense')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 no-print">
        {/* Row 1: Keyword Search + Quick Date Presets + More Filters */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Keyword Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Search transactions by keyword"
              placeholder="Search by keyword (vendor, description, category, account, ID, tag, notes)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear keyword search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets & Advanced Filters Toggle */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: dateAnchors.currentMonthLabel },
              { id: 'last_month', label: dateAnchors.lastMonthLabel },
              { id: 'fy', label: dateAnchors.fyLabel },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  datePreset === preset.id && !customStartDate && !customEndDate
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                showAdvancedFilters ||
                selectedType !== 'all' ||
                selectedCategory !== 'all' ||
                selectedAccount !== 'all' ||
                selectedPaymentMethod !== 'all'
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="More Filters"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* Row 2: Direct Amount Range & Specific Date Range Search Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Amount Range Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Amount:</span>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              aria-label="Minimum amount"
              placeholder="Min ₹"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full min-w-0 px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
            />
            <span className="text-slate-400 text-xs shrink-0">to</span>
            <input
              type="number"
              min="0"
              step="any"
              aria-label="Maximum amount"
              placeholder="Max ₹"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full min-w-0 px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums"
            />
            {(minAmount || maxAmount) && (
              <button
                type="button"
                onClick={() => {
                  setMinAmount('');
                  setMaxAmount('');
                }}
                aria-label="Clear amount range"
                title="Clear amount range"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Specific Date Range Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Date:</span>
            </div>
            <input
              type="date"
              aria-label="Start date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setDatePreset(e.target.value || customEndDate ? 'custom' : 'all');
              }}
              className="w-full min-w-0 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-slate-400 text-xs shrink-0">to</span>
            <input
              type="date"
              aria-label="End date"
              value={customEndDate}
              min={customStartDate || undefined}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setDatePreset(customStartDate || e.target.value ? 'custom' : 'all');
              }}
              className="w-full min-w-0 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setDatePreset('all');
                }}
                aria-label="Clear date range"
                title="Clear date range"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Transaction Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="expense">Expense Only</option>
                <option value="income">Income Only</option>
                <option value="transfer">Transfer Only</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account / Wallet
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Payment Method
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All Payment Methods</option>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="cash">Cash in Hand</option>
                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Filter Result Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-100/70 dark:bg-slate-800/60 p-3 px-4 rounded-xl text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900 dark:text-white">
            Showing {stats.count} of {transactions.length} Records
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Reset all filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs tabular-nums">
          <div>
            <span className="text-slate-500">Inflows: </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              +{formatINR(stats.income)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Outflows: </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              -{formatINR(stats.expense)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Net Flow: </span>
            <span
              className={`font-bold ${
                stats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(stats.net)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Grouped By Date (Daily Cash Book Layout) */}
      {groupedByDate.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No transactions found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, clearing active filters, or record a new transaction.
          </p>
          <button
            onClick={() => onOpenNewTransaction('expense')}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg shadow-sm"
          >
            Record First Transaction
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div
              key={group.date}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
            >
              {/* Daily Header Strip with Day Inflow, Outflow, and Net */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatDateIN(group.date)}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    ({new Date(group.date).toLocaleDateString('en-IN', { weekday: 'long' })})
                  </span>
                </div>

                <div className="flex items-center gap-3 tabular-nums text-[11px]">
                  {group.dayIncome > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      +{formatINR(group.dayIncome, { hideDecimals: true })}
                    </span>
                  )}
                  {group.dayExpense > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      -{formatINR(group.dayExpense, { hideDecimals: true })}
                    </span>
                  )}
                  <span className="text-slate-500 font-semibold pl-1 border-l border-slate-200 dark:border-slate-700">
                    Net: {formatINR(group.dayNet, { hideDecimals: true })}
                  </span>
                </div>
              </div>

              {/* Day's Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 text-[11px]">
                      <th className="py-2 px-4 font-medium w-28">Time & ID</th>
                      <th className="py-2 px-4 font-medium">Category & Purpose</th>
                      <th className="py-2 px-4 font-medium">Vendor / Payee</th>
                      <th className="py-2 px-4 font-medium">Account & Mode</th>
                      <th className="py-2 px-4 font-medium text-center w-16">Receipt</th>
                      <th className="py-2 px-4 font-medium text-right w-32">Amount (₹)</th>
                      <th className="py-2 px-4 font-medium text-center w-28 no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {group.transactions.map((txn) => {
                      const cat = categoriesMap.get(txn.categoryId);
                      const acc = accountsMap.get(txn.accountId);
                      const toAcc = txn.toAccountId ? accountsMap.get(txn.toAccountId) : null;
                      const isIncome = txn.type === 'income';
                      const isExpense = txn.type === 'expense';
                      const isTransfer = txn.type === 'transfer';

                      return (
                        <tr
                          key={txn.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Time & ID */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums block">
                              {txn.time || '—'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {txn.id}
                            </span>
                          </td>

                          {/* Category & Description */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${cat?.color || '#64748b'}15`,
                                  color: cat?.color || '#64748b',
                                }}
                              >
                                <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                                  {txn.description}
                                </span>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <span>{cat?.name || 'General'}</span>
                                  {txn.subcategory && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{txn.subcategory}</span>
                                    </>
                                  )}
                                  {txn.tag && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                                        {txn.tag}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Vendor */}
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                            {txn.vendor || '—'}
                          </td>

                          {/* Account & Payment Method */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {isTransfer ? (
                              <div className="flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                                <span>{acc?.name || 'Source'}</span>
                                <ArrowRightLeft className="w-3 h-3 text-sky-500" />
                                <span>{toAcc?.name || 'Dest'}</span>
                              </div>
                            ) : (
                              <span className="font-medium text-slate-800 dark:text-slate-200 block">
                                {acc?.name || 'Account'}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                              {txn.paymentMethod.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Receipt */}
                          <td className="py-2.5 px-4 text-center">
                            {txn.receiptUrl ? (
                              <button
                                type="button"
                                onClick={() => onViewReceipt(txn)}
                                className="inline-flex items-center justify-center p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                                title="View attached receipt / invoice"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700">—</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
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

                          {/* Actions */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap no-print">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditTransaction(txn)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateTransaction(txn.id)}
                                className="p-1 text-slate-400 hover:text-sky-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {deleteConfirmId === txn.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteTransaction(txn.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded"
                                  >
                                    Del
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-[10px] text-slate-400 underline"
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(txn.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
      />
    </div>
  );
};
