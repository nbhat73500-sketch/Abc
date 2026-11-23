import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Building2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { CategoryIcon } from '../CategoryIcon';
import { Transaction } from '../../types/finance';
import { LoanStatementPdfModal } from '../modals/LoanStatementPdfModal';

type ReportType =
  | 'six_month_trend'
  | 'cash_book'
  | 'monthly_pnl'
  | 'category_analysis'
  | 'payment_modes'
  | 'budget_variance'
  | 'yearly_summary'
  | 'loan_emi_report';

interface ReportsViewProps {
  onOpenStatementPdf?: (params?: { title?: string; accountId?: string; customTxns?: Transaction[]; dateRangeLabel?: string }) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onOpenStatementPdf }) => {
  const {
    transactions,
    accounts,
    categories,
    budget,
    loans,
    loanSummary,
    totalLoanLiability,
    totalMonthlyEmiPayable,
    totalPrincipalRepaid,
    totalInterestPaid,
    totalEmiPaid,
  } = useFinance();

  const [isLoanPdfModalOpen, setIsLoanPdfModalOpen] = useState(false);
  const [selectedLoanPdfId, setSelectedLoanPdfId] = useState<string | undefined>(undefined);

  const [activeReport, setActiveReport] = useState<ReportType>('cash_book');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedCashBookDate, setSelectedCashBookDate] = useState('2026-10-27');
  const [chartMode, setChartMode] = useState<'bar' | 'area' | 'savings'>('bar');

  const categoriesMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Rolling 6-month historical Income vs Expense dataset
  const sixMonthTrendData = useMemo(() => {
    // 6 calendar months: Jun 2026 to Nov 2026
    const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

    return months.map((ym) => {
      const [year, m] = ym.split('-');
      const d = new Date(parseInt(year), parseInt(m) - 1, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const fullLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const txns = transactions.filter((t) => t.date.startsWith(ym));
      const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const net = income - expense;
      const savingsRate = income > 0 ? Math.max(-100, Math.min(100, (net / income) * 100)) : 0;
      const budgetCap = budget.monthlyBudget || 85000;

      return {
        key: ym,
        label,
        fullLabel,
        income,
        expense,
        net,
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        budgetCap,
        count: txns.length,
      };
    });
  }, [transactions, budget]);

  // 6-Month Aggregate Financial Health Metrics
  const sixMonthTotals = useMemo(() => {
    const totalIncome = sixMonthTrendData.reduce((s, m) => s + m.income, 0);
    const totalExpense = sixMonthTrendData.reduce((s, m) => s + m.expense, 0);
    const netSavings = totalIncome - totalExpense;
    const overallSavingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    let healthStatus = 'Healthy Financial Trajectory';
    let healthColor = 'text-emerald-700 dark:text-emerald-400';
    let healthBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';

    if (overallSavingsRate >= 35) {
      healthStatus = 'Optimal Health (>35% Savings)';
    } else if (overallSavingsRate >= 15) {
      healthStatus = 'Healthy (Consistent Surplus)';
    } else if (overallSavingsRate > 0) {
      healthStatus = 'Moderate (Tight Margins)';
      healthColor = 'text-amber-700 dark:text-amber-400';
      healthBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    } else {
      healthStatus = 'Deficit Alert (Expenses Exceed Inflows)';
      healthColor = 'text-rose-700 dark:text-rose-400';
      healthBg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
    }

    return {
      totalIncome,
      totalExpense,
      netSavings,
      overallSavingsRate,
      healthStatus,
      healthColor,
      healthBg,
    };
  }, [sixMonthTrendData]);


  // Transactions filtered by selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // 1. Daily Cash Book Calculations for selectedCashBookDate
  const cashBookData = useMemo(() => {
    // Opening balance: sum of all transactions before this date + initial accounts balance
    const initialAccSum = accounts.reduce((sum, a) => sum + a.initialBalance, 0);

    const priorTxns = transactions.filter((t) => t.date < selectedCashBookDate);
    const priorInflows = priorTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const priorOutflows = priorTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const openingBalance = initialAccSum + priorInflows - priorOutflows;

    const dayTxns = transactions.filter((t) => t.date === selectedCashBookDate);
    const dayInflows = dayTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const dayOutflows = dayTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const closingBalance = openingBalance + dayInflows - dayOutflows;

    return {
      date: selectedCashBookDate,
      openingBalance,
      dayInflows,
      dayOutflows,
      closingBalance,
      transactions: dayTxns,
    };
  }, [transactions, accounts, selectedCashBookDate]);

  // 2. Monthly Income & Expenditure Statement (P&L Format)
  const monthlyPnL = useMemo(() => {
    const incomes = monthTransactions.filter((t) => t.type === 'income');
    const expenses = monthTransactions.filter((t) => t.type === 'expense');

    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const netSurplus = totalIncome - totalExpense;

    // Group expenses by category
    const expenseGroups: Record<string, { categoryName: string; amount: number; items: typeof expenses }> = {};
    expenses.forEach((t) => {
      const catName = categoriesMap.get(t.categoryId)?.name || 'Other';
      if (!expenseGroups[t.categoryId]) {
        expenseGroups[t.categoryId] = { categoryName: catName, amount: 0, items: [] };
      }
      expenseGroups[t.categoryId].amount += t.amount;
      expenseGroups[t.categoryId].items.push(t);
    });

    // Group income by subcategory/source
    const incomeGroups: Record<string, number> = {};
    incomes.forEach((t) => {
      const label = t.subcategory || t.description || 'Income';
      incomeGroups[label] = (incomeGroups[label] || 0) + t.amount;
    });

    return {
      monthStr: selectedMonth,
      totalIncome,
      totalExpense,
      netSurplus,
      expenseGroups: Object.values(expenseGroups).sort((a, b) => b.amount - a.amount),
      incomeGroups: Object.entries(incomeGroups).sort((a, b) => b[1] - a[1]),
    };
  }, [monthTransactions, categoriesMap, selectedMonth]);

  // 3. Category Expense Analysis
  const categoryAnalysis = useMemo(() => {
    const expenses = monthTransactions.filter((t) => t.type === 'expense');
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);

    const map: Record<
      string,
      {
        id: string;
        name: string;
        color: string;
        icon: string;
        amount: number;
        count: number;
      }
    > = {};

    categories
      .filter((c) => c.type === 'expense' || c.type === 'both')
      .forEach((c) => {
        map[c.id] = {
          id: c.id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          amount: 0,
          count: 0,
        };
      });

    expenses.forEach((t) => {
      if (map[t.categoryId]) {
        map[t.categoryId].amount += t.amount;
        map[t.categoryId].count += 1;
      }
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: totalExp > 0 ? (item.amount / totalExp) * 100 : 0,
        averageSize: item.count > 0 ? item.amount / item.count : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, categories]);

  // 4. Payment Modes / Accounts flow
  const paymentModesSummary = useMemo(() => {
    const modes: Record<string, { label: string; income: number; expense: number; count: number }> = {
      upi: { label: 'UPI (GPay / PhonePe / Paytm)', income: 0, expense: 0, count: 0 },
      bank_transfer: { label: 'Bank Transfer (NEFT / IMPS)', income: 0, expense: 0, count: 0 },
      credit_card: { label: 'Credit Card', income: 0, expense: 0, count: 0 },
      cash: { label: 'Physical Cash', income: 0, expense: 0, count: 0 },
      debit_card: { label: 'Debit Card', income: 0, expense: 0, count: 0 },
      other: { label: 'Other Modes', income: 0, expense: 0, count: 0 },
    };

    monthTransactions.forEach((t) => {
      const mode = modes[t.paymentMethod] || modes.other;
      mode.count += 1;
      if (t.type === 'income') mode.income += t.amount;
      if (t.type === 'expense') mode.expense += t.amount;
    });

    return Object.values(modes);
  }, [monthTransactions]);

  // 5. Budget vs Actual Variance
  const budgetVariance = useMemo(() => {
    const expenses = monthTransactions.filter((t) => t.type === 'expense');

    return categories
      .filter((c) => c.type === 'expense' || c.type === 'both')
      .map((cat) => {
        const allocated = budget.categoryBudgets[cat.id] || cat.monthlyBudget || 0;
        const actual = expenses
          .filter((t) => t.categoryId === cat.id)
          .reduce((s, t) => s + t.amount, 0);
        const variance = allocated - actual; // Positive = Under budget (favorable)
        const variancePct = allocated > 0 ? (actual / allocated) * 100 : 0;

        return {
          cat,
          allocated,
          actual,
          variance,
          variancePct,
          isOver: variance < 0,
        };
      })
      .sort((a, b) => b.actual - a.actual);
  }, [categories, budget, monthTransactions]);

  // 6. Yearly Summary
  const yearlySummary = useMemo(() => {
    // 12 months of 2026
    const months = [
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ];

    return months.map((ym) => {
      const txns = transactions.filter((t) => t.date.startsWith(ym));
      const inc = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const [year, m] = ym.split('-');
      const d = new Date(parseInt(year), parseInt(m) - 1, 1);
      return {
        key: ym,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        income: inc,
        expense: exp,
        net: inc - exp,
        count: txns.length,
      };
    });
  }, [transactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReportCSV = () => {
    let rows: string[][] = [];
    let filename = `BudgetManagement_Report_${activeReport}_${selectedMonth}.csv`;

    if (activeReport === 'cash_book') {
      rows.push(['Daily Cash Book Report for', formatDateIN(cashBookData.date)]);
      rows.push(['Opening Balance', cashBookData.openingBalance.toFixed(2)]);
      rows.push(['Total Day Inflows', cashBookData.dayInflows.toFixed(2)]);
      rows.push(['Total Day Outflows', cashBookData.dayOutflows.toFixed(2)]);
      rows.push(['Closing Balance', cashBookData.closingBalance.toFixed(2)]);
      rows.push([]);
      rows.push(['Time', 'Type', 'Description', 'Category', 'Vendor', 'Amount']);
      cashBookData.transactions.forEach((t) => {
        rows.push([
          t.time || '',
          t.type.toUpperCase(),
          `"${t.description.replace(/"/g, '""')}"`,
          `"${categoriesMap.get(t.categoryId)?.name || ''}"`,
          `"${t.vendor || ''}"`,
          t.amount.toFixed(2),
        ]);
      });
    } else if (activeReport === 'budget_variance') {
      rows.push(['Category', 'Budget Allocated', 'Actual Spent', 'Variance (Remaining)', 'Status']);
      budgetVariance.forEach((b) => {
        rows.push([
          `"${b.cat.name}"`,
          b.allocated.toFixed(2),
          b.actual.toFixed(2),
          b.variance.toFixed(2),
          b.isOver ? 'OVER BUDGET' : 'WITHIN BUDGET',
        ]);
      });
    } else {
      rows.push(['Category', 'Amount (INR)', '% of Total', 'Transactions Count', 'Avg Transaction']);
      categoryAnalysis.forEach((c) => {
        rows.push([
          `"${c.name}"`,
          c.amount.toFixed(2),
          c.percentage.toFixed(1) + '%',
          c.count.toString(),
          c.averageSize.toFixed(2),
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Statements & Analytical Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade accounting ledgers, cash books, profit/loss, and budget variance
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleDownloadReportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => {
              if (onOpenStatementPdf) {
                onOpenStatementPdf({
                  title: `${activeReport.replace(/_/g, ' ').toUpperCase()} STATEMENT`,
                  dateRangeLabel: selectedMonth,
                });
              } else {
                handlePrint();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            title="Open Read-Only PDF Statement Viewer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF Statement</span>
          </button>
        </div>
      </div>

      {/* 6-MONTH INCOME VS EXPENSE TREND & FINANCIAL HEALTH (RECHARTS) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                6-Month Income vs. Expense Trend
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sixMonthTotals.healthBg} ${sixMonthTotals.healthColor}`}>
                {sixMonthTotals.healthStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualizing rolling cash flow health, income vs outflow spread, and monthly net savings margin (Jun 2026 – Nov 2026)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  chartMode === 'bar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Comparison Bars
              </button>
              <button
                type="button"
                onClick={() => setChartMode('area')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  chartMode === 'area'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Cash Flow Area
              </button>
              <button
                type="button"
                onClick={() => setChartMode('savings')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  chartMode === 'savings'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Net Surplus Margin
              </button>
            </div>
          </div>
        </div>

        {/* 6-Month Metric Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">6-Month Total Inflows</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatINR(sixMonthTotals.totalIncome)}
            </div>
            <span className="text-[10px] text-slate-400">Salary, consulting & credits</span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">6-Month Total Outflows</span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatINR(sixMonthTotals.totalExpense)}
            </div>
            <span className="text-[10px] text-slate-400">Rent, bills, food & shopping</span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Net Accumulated Surplus</span>
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
            <div className={`text-base font-bold tabular-nums ${sixMonthTotals.netSavings >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
              {sixMonthTotals.netSavings >= 0 ? '+' : ''}{formatINR(sixMonthTotals.netSavings)}
            </div>
            <span className="text-[10px] text-slate-400">Total liquid wealth growth</span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Average Savings Rate</span>
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {sixMonthTotals.overallSavingsRate.toFixed(1)}%
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Healthy target: &gt;25%</span>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-72 sm:h-80 w-full pt-2 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
            {chartMode === 'bar' ? (
              <BarChart data={sixMonthTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">{data.fullLabel}</p>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-emerald-400 flex items-center gap-1 font-medium">● Inflows:</span>
                            <span className="font-bold tabular-nums">+{formatINR(data.income)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-rose-400 flex items-center gap-1 font-medium">● Outflows:</span>
                            <span className="font-bold tabular-nums">-{formatINR(data.expense)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-5 pt-1 border-t border-slate-700">
                            <span className="text-slate-300 font-medium">Net Savings:</span>
                            <span className={`font-bold tabular-nums ${data.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {data.net >= 0 ? '+' : ''}{formatINR(data.net)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-slate-400 font-medium">Savings Rate:</span>
                            <span className="font-bold text-amber-300 tabular-nums">{data.savingsRate}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                />
                <Bar dataKey="income" name="Monthly Income" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={38} />
                <Bar dataKey="expense" name="Monthly Expense" fill="#e11d48" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            ) : chartMode === 'area' ? (
              <AreaChart data={sixMonthTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">{data.fullLabel}</p>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-emerald-400 font-medium">● Total Income:</span>
                            <span className="font-bold tabular-nums">+{formatINR(data.income)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-rose-400 font-medium">● Total Expenses:</span>
                            <span className="font-bold tabular-nums">-{formatINR(data.expense)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-5 pt-1 border-t border-slate-700">
                            <span className="text-slate-300 font-medium">Net Savings:</span>
                            <span className={`font-bold tabular-nums ${data.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {data.net >= 0 ? '+' : ''}{formatINR(data.net)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 10, fontSize: 11 }} />
                <Area type="monotone" dataKey="income" name="Income Trajectory" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeAreaGrad)" />
                <Area type="monotone" dataKey="expense" name="Expense Trajectory" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseAreaGrad)" />
              </AreaChart>
            ) : (
              <ComposedChart data={sixMonthTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fontSize: 10, fill: '#f59e0b' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">{data.fullLabel}</p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-emerald-400 font-medium">Net Savings:</span>
                            <span className="font-bold tabular-nums">+{formatINR(data.net)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-amber-400 font-medium">Savings Margin:</span>
                            <span className="font-bold tabular-nums">{data.savingsRate}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 10, fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="net" name="Net Monthly Surplus (₹)" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Line yAxisId="right" type="monotone" dataKey="savingsRate" name="Savings Rate (%)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Quick Month Filter Pills */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            Jump to Month in Detailed Statements Below:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {sixMonthTrendData.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMonth(m.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedMonth === m.key
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.label} ({m.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto no-print">
        {[
          { id: 'cash_book', label: '1. Daily Cash Book' },
          { id: 'monthly_pnl', label: '2. Income & Expenditure' },
          { id: 'category_analysis', label: '3. Category Analysis' },
          { id: 'budget_variance', label: '4. Budget vs Actual' },
          { id: 'payment_modes', label: '5. Payment Instruments' },
          { id: 'yearly_summary', label: '6. Yearly Summary' },
          { id: 'loan_emi_report', label: '7. Loan & EMI Ledger' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as ReportType)}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeReport === tab.id
                ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT 1: DAILY CASH BOOK */}
      {activeReport === 'cash_book' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Daily Cash Book Statement
              </h2>
              <p className="text-xs text-slate-500">
                Opening Balance + Receipts (Inflows) - Payments (Outflows) = Closing Balance
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Date:</span>
              <input
                type="date"
                value={selectedCashBookDate}
                onChange={(e) => setSelectedCashBookDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Cash Book Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500">Opening Balance</span>
              <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatINR(cashBookData.openingBalance)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500">Total Day Receipts (+)</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                +{formatINR(cashBookData.dayInflows)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500">Total Day Payments (-)</span>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                -{formatINR(cashBookData.dayOutflows)}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Closing Balance
              </span>
              <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
                {formatINR(cashBookData.closingBalance)}
              </div>
            </div>
          </div>

          {/* Day's Itemized Entries */}
          <div>
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Itemized Records for {formatDateIN(cashBookData.date)}
            </h3>

            {cashBookData.transactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                No cash book transactions recorded on {formatDateIN(cashBookData.date)}.
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 font-medium">Time & Ref</th>
                    <th className="py-2 font-medium">Description</th>
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 font-medium">Account / Mode</th>
                    <th className="py-2 font-medium text-right">Receipt (Inflow)</th>
                    <th className="py-2 font-medium text-right">Payment (Outflow)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashBookData.transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 tabular-nums">
                        <span className="font-medium text-slate-900 dark:text-white">{txn.time}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{txn.id}</span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {txn.description}
                        <span className="text-[10px] text-slate-400 block">{txn.vendor}</span>
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">
                        {categoriesMap.get(txn.categoryId)?.name || 'General'}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {accountsMap.get(txn.accountId)?.name} · {txn.paymentMethod.toUpperCase()}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {txn.type === 'income' ? formatINR(txn.amount) : '—'}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                        {txn.type === 'expense' ? formatINR(txn.amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* REPORT 2: MONTHLY INCOME & EXPENDITURE STATEMENT */}
      {activeReport === 'monthly_pnl' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
          <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Statement of Income & Expenditure
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accounting Period: October 2026 · All Figures in Indian Rupees (₹)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Income Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Income & Inflows
                </h3>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatINR(monthlyPnL.totalIncome)}
                </span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyPnL.incomeGroups.map(([source, amt]) => (
                  <div key={source} className="flex justify-between pt-2">
                    <span className="text-slate-700 dark:text-slate-300">{source}</span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(amt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Expenditure Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Expenditure & Outflows
                </h3>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                  {formatINR(monthlyPnL.totalExpense)}
                </span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyPnL.expenseGroups.map((g) => (
                  <div key={g.categoryName} className="flex justify-between pt-2">
                    <span className="text-slate-700 dark:text-slate-300">{g.categoryName}</span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(g.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Net Line */}
          <div className="pt-4 border-t-2 border-slate-900 dark:border-slate-700 flex items-center justify-between text-sm font-bold">
            <span className="text-slate-900 dark:text-white uppercase tracking-wider">
              {monthlyPnL.netSurplus >= 0 ? 'Net Operating Surplus (Savings):' : 'Net Deficit:'}
            </span>
            <span
              className={`text-lg tabular-nums ${
                monthlyPnL.netSurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {formatINR(monthlyPnL.netSurplus)}
            </span>
          </div>
        </div>
      )}

      {/* REPORT 3: CATEGORY ANALYSIS */}
      {activeReport === 'category_analysis' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Category-Wise Expense Analysis (October 2026)
              </h2>
              <p className="text-xs text-slate-500">Volume, average ticket size, and % share of budget</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Expense Category</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Transactions</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Avg Ticket Size</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Spent (₹)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryAnalysis.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">{item.count}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatINR(item.averageSize, { hideDecimals: true })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(item.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {item.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 4: BUDGET VS ACTUAL */}
      {activeReport === 'budget_variance' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Budget vs Actual Spending Variance
              </h2>
              <p className="text-xs text-slate-500">
                Favorable vs unfavorable variance across monthly cost centers
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Allocated Budget</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actual Spent</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Variance (Remaining)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {budgetVariance.map((row) => (
                  <tr key={row.cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.cat.color }} />
                      <span>{row.cat.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                      {row.allocated > 0 ? formatINR(row.allocated, { hideDecimals: true }) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(row.actual)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                      <span className={row.isOver ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}>
                        {row.isOver ? '-' : '+'}{formatINR(Math.abs(row.variance))}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          row.isOver
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {row.isOver ? 'OVER BUDGET' : 'ON TRACK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 5: PAYMENT INSTRUMENTS BREAKDOWN */}
      {activeReport === 'payment_modes' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Payment Instrument Summaries
              </h2>
              <p className="text-xs text-slate-500">Distribution of transactions by UPI, Cash, Cards, and Bank Transfer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentModesSummary.map((m) => (
              <div
                key={m.label}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{m.label}</h3>
                  <span className="text-[11px] text-slate-400">{m.count} Transactions Logged</span>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Inflows:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{formatINR(m.income)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Outflows:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                        -{formatINR(m.expense)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between text-xs font-bold">
                  <span>Net Flow:</span>
                  <span className="tabular-nums">{formatINR(m.income - m.expense)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT 6: YEARLY SUMMARY */}
      {activeReport === 'yearly_summary' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Yearly Financial Performance (2026)
              </h2>
              <p className="text-xs text-slate-500">Month-by-month financial ledger sheet</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Month</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Transactions</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Income</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Expenses</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Net Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {yearlySummary.map((m) => (
                  <tr key={m.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {m.label}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">{m.count}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {m.income > 0 ? `+${formatINR(m.income)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                      {m.expense > 0 ? `-${formatINR(m.expense)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                      <span className={m.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                        {m.income > 0 || m.expense > 0 ? formatINR(m.net) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 7: LOAN LIABILITY & EMI AMORTIZATION LEDGER */}
      {activeReport === 'loan_emi_report' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Outstanding Balance &amp; EMI Amortization Ledger
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed audit schedule of loan liabilities, principal repayments, interest expenses, and bank transfers
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => {
                  setSelectedLoanPdfId(undefined);
                  setIsLoanPdfModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official EMI Statement (PDF)</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                Total Outstanding
              </span>
              <span className="text-lg font-black text-rose-700 dark:text-rose-400">
                {formatINR(totalLoanLiability)}
              </span>
              <span className="text-[10px] text-slate-500 block">Sanctioned: {formatINR(loanSummary.totalOriginalPrincipal || loanSummary.totalOriginalAmount || 0)}</span>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 block">
                Monthly EMI Total
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {formatINR(totalMonthlyEmiPayable)}
              </span>
              <span className="text-[10px] text-slate-500 block">{loanSummary.activeLoansCount} active accounts</span>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                Principal Repaid
              </span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                {formatINR(totalPrincipalRepaid)}
              </span>
              <span className="text-[10px] text-slate-500 block">Direct debt reduction</span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                Interest Expense Paid
              </span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                {formatINR(totalInterestPaid)}
              </span>
              <span className="text-[10px] text-slate-500 block">Expensed to ledger</span>
            </div>
          </div>

          {/* Loan Accounts Detail Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Lender &amp; Loan</th>
                  <th className="py-2.5 px-3 font-semibold">Reference</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Sanctioned</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Current Principal</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Monthly EMI</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Interest Rate</th>
                  <th className="py-2.5 px-3 font-semibold">Linked Bank Account</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loans.map((loan) => {
                  const bank = accounts.find((a) => a.id === loan.linkedBankAccountId);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {loan.lenderName}
                        </span>
                        <span className="text-[11px] text-slate-500">{loan.loanName}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {loan.loanReference || loan.accountReference}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                        {formatINR(loan.originalPrincipal ?? loan.originalAmount ?? 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-rose-700 dark:text-rose-400">
                        {formatINR(loan.currentOutstandingPrincipal ?? loan.outstandingPrincipal ?? 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatINR(loan.emiAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {loan.interestRateAnnual ?? loan.interestRate ?? 0}% p.a.
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        <span className="block font-medium">{bank?.name || 'Direct Transfer'}</span>
                        <span className="text-[10px] text-slate-500">
                          Live: {formatINR(bank?.balance || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedLoanPdfId(loan.id);
                            setIsLoanPdfModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          Print PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loan Statement PDF Modal */}
      {isLoanPdfModalOpen && (
        <LoanStatementPdfModal
          isOpen={isLoanPdfModalOpen}
          onClose={() => setIsLoanPdfModalOpen(false)}
          loans={loans}
          selectedLoanId={selectedLoanPdfId}
          accounts={accounts}
        />
      )}
    </div>
  );
};
