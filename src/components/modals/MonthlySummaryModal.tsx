import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileDown,
  PieChart,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Search,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { DecimalSafe } from '../../services/calculationEngine';
import { CategoryIcon } from '../CategoryIcon';
import { Transaction } from '../../types/finance';

interface MonthlySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string; // YYYY-MM
  onOpenStatementPdf?: () => void;
}

export const MonthlySummaryModal: React.FC<MonthlySummaryModalProps> = ({
  isOpen,
  onClose,
  defaultMonth = '2026-10',
  onOpenStatementPdf,
}) => {
  const { transactions, accounts, categories, budget } = useFinance();

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [searchTxn, setSearchTxn] = useState('');

  // Extract all unique months present in transactions + current and past 6 months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    // Add current sequence
    ['2026-11', '2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05'].forEach((m) =>
      set.add(m)
    );
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const yr = prev.getFullYear();
    const mo = String(prev.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${yr}-${mo}`);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    const yr = next.getFullYear();
    const mo = String(next.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${yr}-${mo}`);
  };

  // Human friendly month label
  const monthDisplayLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Transactions belonging to selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Previous month transactions for MoM comparison
  const previousMonthStr = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const yr = prev.getFullYear();
    const mo = String(prev.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  }, [selectedMonth]);

  const prevMonthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(previousMonthStr));
  }, [transactions, previousMonthStr]);

  // Financial calculations for current selected month
  const summary = useMemo(() => {
    const incomeTxns = monthTransactions.filter((t) => t.type === 'income');
    const expenseTxns = monthTransactions.filter((t) => t.type === 'expense');
    const transferTxns = monthTransactions.filter((t) => t.type === 'transfer');

    const totalIncome = DecimalSafe.sum(incomeTxns.map((t) => t.amount));
    const totalExpenses = DecimalSafe.sum(expenseTxns.map((t) => t.amount));
    const netSavings = DecimalSafe.subtract(totalIncome, totalExpenses);
    const totalTransfers = DecimalSafe.sum(transferTxns.map((t) => t.amount));

    const savingsRate =
      totalIncome > 0
        ? Math.round((Math.max(0, netSavings) / totalIncome) * 100 * 10) / 10
        : 0;

    // Days in selected month
    const [y, m] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dailyAverageSpend = Math.round(totalExpenses / daysInMonth);

    // Budget Variance
    const allocatedBudget = budget.monthlyBudget || 45000;
    const budgetVariance = DecimalSafe.subtract(allocatedBudget, totalExpenses);
    const budgetUtilization =
      allocatedBudget > 0
        ? Math.round((totalExpenses / allocatedBudget) * 100)
        : 0;
    const isOverBudget = totalExpenses > allocatedBudget;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      dailyAverageSpend,
      allocatedBudget,
      budgetVariance,
      budgetUtilization,
      isOverBudget,
      incomeCount: incomeTxns.length,
      expenseCount: expenseTxns.length,
      transferCount: transferTxns.length,
      totalCount: monthTransactions.length,
      daysInMonth,
    };
  }, [monthTransactions, budget, selectedMonth]);

  // MoM Deltas
  const momComparison = useMemo(() => {
    const prevIncome = DecimalSafe.sum(
      prevMonthTransactions.filter((t) => t.type === 'income').map((t) => t.amount)
    );
    const prevExpense = DecimalSafe.sum(
      prevMonthTransactions.filter((t) => t.type === 'expense').map((t) => t.amount)
    );
    const prevSavings = DecimalSafe.subtract(prevIncome, prevExpense);

    const expenseDelta = DecimalSafe.subtract(summary.totalExpenses, prevExpense);
    const incomeDelta = DecimalSafe.subtract(summary.totalIncome, prevIncome);
    const savingsDelta = DecimalSafe.subtract(summary.netSavings, prevSavings);

    const expensePctChange =
      prevExpense > 0
        ? Math.round(((summary.totalExpenses - prevExpense) / prevExpense) * 100)
        : 0;
    const incomePctChange =
      prevIncome > 0
        ? Math.round(((summary.totalIncome - prevIncome) / prevIncome) * 100)
        : 0;

    return {
      prevIncome,
      prevExpense,
      prevSavings,
      expenseDelta,
      incomeDelta,
      savingsDelta,
      expensePctChange,
      incomePctChange,
    };
  }, [prevMonthTransactions, summary]);

  // Category breakdown for expenses in this month
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const catId = t.categoryId || 'uncategorized';
        if (!map[catId]) map[catId] = { amount: 0, count: 0 };
        map[catId].amount = DecimalSafe.add(map[catId].amount, t.amount);
        map[catId].count += 1;
      });

    const categoriesMap = new Map(categories.map((c) => [c.id, c]));

    const list = Object.entries(map).map(([catId, data]) => {
      const categoryObj = categoriesMap.get(catId);
      const percentage =
        summary.totalExpenses > 0
          ? Math.round((data.amount / summary.totalExpenses) * 100)
          : 0;
      return {
        catId,
        name: categoryObj?.name || 'Uncategorized',
        icon: categoryObj?.icon || 'Tag',
        color: categoryObj?.color || '#64748b',
        amount: data.amount,
        count: data.count,
        percentage,
      };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, categories, summary.totalExpenses]);

  // Account breakdown for this month
  const accountBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    monthTransactions.forEach((t) => {
      if (!map[t.accountId]) map[t.accountId] = { income: 0, expense: 0 };
      if (t.type === 'income') {
        map[t.accountId].income = DecimalSafe.add(map[t.accountId].income, t.amount);
      } else if (t.type === 'expense') {
        map[t.accountId].expense = DecimalSafe.add(map[t.accountId].expense, t.amount);
      }
    });

    const accountsMap = new Map(accounts.map((a) => [a.id, a]));

    return Object.entries(map).map(([accId, data]) => {
      const acc = accountsMap.get(accId);
      return {
        accId,
        name: acc?.name || 'Account',
        type: acc?.type || 'bank',
        income: data.income,
        expense: data.expense,
      };
    });
  }, [monthTransactions, accounts]);

  // Filtered transactions inside modal
  const filteredTxns = useMemo(() => {
    return monthTransactions
      .filter((t) => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchTxn.trim()) {
          const q = searchTxn.toLowerCase();
          const matchDesc = t.description.toLowerCase().includes(q);
          const matchNotes = t.notes?.toLowerCase().includes(q);
          const matchAmt = t.amount.toString().includes(q);
          return matchDesc || matchNotes || matchAmt;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTransactions, filterType, searchTxn]);

  // Export CSV statement for the month
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount (INR)', 'Notes'];
    const categoriesMap = new Map(categories.map((c) => [c.id, c.name]));
    const accountsMap = new Map(accounts.map((a) => [a.id, a.name]));

    const rows = monthTransactions.map((t) => [
      t.date,
      t.type.toUpperCase(),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${categoriesMap.get(t.categoryId || '') || 'Uncategorized'}"`,
      `"${accountsMap.get(t.accountId) || 'Account'}"`,
      t.amount,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Summary_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600/10 via-transparent to-sky-600/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Monthly Financial Summary
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {monthDisplayLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed statement, cash flows, category variance & MoM analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Download Monthly CSV"
              aria-label="Download CSV"
            >
              <FileDown className="w-4 h-4" />
            </button>
            {onOpenStatementPdf && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStatementPdf();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Print Official Statement as Read-Only PDF"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Statement (PDF)</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Print Monthly Report"
              aria-label="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {availableMonths.map((m) => {
                const [y, mo] = m.split('-').map(Number);
                const d = new Date(y, mo - 1, 1);
                const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                    {label} ({m})
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{summary.totalCount} transactions logged</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* 1. Key Monthly Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Income */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60">
              <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
                <span>Monthly Income</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatINR(summary.totalIncome)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>{summary.incomeCount} credits</span>
                {momComparison.incomePctChange !== 0 && (
                  <span
                    className={
                      momComparison.incomePctChange > 0 ? 'text-emerald-600 font-bold' : 'text-slate-500'
                    }
                  >
                    {momComparison.incomePctChange > 0 ? '↑' : '↓'}{' '}
                    {Math.abs(momComparison.incomePctChange)}% MoM
                  </span>
                )}
              </div>
            </div>

            {/* Total Expenses */}
            <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60">
              <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 font-semibold mb-1">
                <span>Monthly Expenses</span>
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                {formatINR(summary.totalExpenses)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>{summary.expenseCount} debits</span>
                {momComparison.expensePctChange !== 0 && (
                  <span
                    className={
                      momComparison.expensePctChange > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'
                    }
                  >
                    {momComparison.expensePctChange > 0 ? '↑' : '↓'}{' '}
                    {Math.abs(momComparison.expensePctChange)}% MoM
                  </span>
                )}
              </div>
            </div>

            {/* Net Savings */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60">
              <div className="flex items-center justify-between text-xs text-sky-800 dark:text-sky-300 font-semibold mb-1">
                <span>Net Savings</span>
                <PiggyBank className="w-4 h-4 text-sky-600" />
              </div>
              <p
                className={`text-xl font-bold tabular-nums ${
                  summary.netSavings >= 0
                    ? 'text-sky-700 dark:text-sky-300'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatINR(summary.netSavings)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>Savings Rate</span>
                <span className="font-bold text-sky-600">{summary.savingsRate}%</span>
              </div>
            </div>

            {/* Daily Average */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
              <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-semibold mb-1">
                <span>Daily Burn Rate</span>
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {formatINR(summary.dailyAverageSpend)}
                <span className="text-xs font-normal text-slate-500">/day</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>{summary.daysInMonth} days cycle</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {summary.isOverBudget ? '⚠️ High Spend' : '✅ Controlled'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Monthly Budget Progress & Utilization Bar */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Monthly Budget Utilization: {summary.budgetUtilization}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Spent: {formatINR(summary.totalExpenses)}</span>
                <span className="text-slate-400">/</span>
                <span>Cap: {formatINR(summary.allocatedBudget)}</span>
              </div>
            </div>

            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  summary.isOverBudget
                    ? 'bg-rose-500'
                    : summary.budgetUtilization >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, summary.budgetUtilization))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] mt-2 font-medium">
              <span className="text-slate-500">
                {summary.isOverBudget
                  ? `Over budget by ${formatINR(Math.abs(summary.budgetVariance))}`
                  : `${formatINR(summary.budgetVariance)} remaining in monthly allowance`}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  summary.isOverBudget
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {summary.isOverBudget ? 'BUDGET EXCEEDED' : 'WITHIN BUDGET'}
              </span>
            </div>
          </div>

          {/* 3. Category Breakdown & Accounts Usage side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Expenses Breakdown */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  Monthly Spending by Category
                </h3>
                <span className="text-xs text-slate-400">
                  {categoryBreakdown.length} categories
                </span>
              </div>

              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No expenses recorded in {monthDisplayLabel}.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {categoryBreakdown.map((item) => (
                    <div key={item.catId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryIcon name={item.icon} color={item.color} size={16} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400">({item.count})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatINR(item.amount)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 w-8 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Inflow & Outflow for Month */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-sky-600" />
                  Account Inflows & Outflows
                </h3>
                <span className="text-xs text-slate-400">
                  {accountBreakdown.length} active wallets
                </span>
              </div>

              {accountBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No account activity recorded in {monthDisplayLabel}.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {accountBreakdown.map((acc) => (
                    <div
                      key={acc.accId}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] uppercase font-semibold text-slate-400">
                          {acc.type.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right text-xs tabular-nums">
                        <p className="font-semibold text-emerald-600">
                          +{formatINR(acc.income)}
                        </p>
                        <p className="font-semibold text-rose-600">
                          -{formatINR(acc.expense)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Month's Transactions Ledger List */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-purple-600" />
                Transactions for {monthDisplayLabel}
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search month's entries..."
                    value={searchTxn}
                    onChange={(e) => setSearchTxn(e.target.value)}
                    className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2 py-0.5 rounded ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-slate-700 font-bold shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={`px-2 py-0.5 rounded ${
                      filterType === 'expense'
                        ? 'bg-white dark:bg-slate-700 font-bold text-rose-600 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Exp
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={`px-2 py-0.5 rounded ${
                      filterType === 'income'
                        ? 'bg-white dark:bg-slate-700 font-bold text-emerald-600 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Inc
                  </button>
                </div>
              </div>
            </div>

            {filteredTxns.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No matching transactions found for this period.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {filteredTxns.map((txn) => (
                  <div
                    key={txn.id}
                    className="py-2 px-1 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          txn.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : txn.type === 'expense'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
                        }`}
                      >
                        {txn.type === 'income' ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : txn.type === 'expense' ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <PiggyBank className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {txn.description}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {txn.date} {txn.time ? `• ${txn.time}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`font-bold tabular-nums ${
                          txn.type === 'income'
                            ? 'text-emerald-600'
                            : txn.type === 'expense'
                            ? 'text-rose-600'
                            : 'text-sky-600'
                        }`}
                      >
                        {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
                        {formatINR(txn.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Statement for <span className="font-bold text-slate-700 dark:text-slate-300">{monthDisplayLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
