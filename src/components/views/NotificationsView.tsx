import React, { useMemo, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
  ArrowRight,
  Tag,
  Check,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { CategoryIcon } from '../CategoryIcon';
import { CategoryBudgetAlert } from '../../types/finance';

interface NotificationsViewProps {
  onNavigate?: (tab: string) => void;
  onOpenBudgetModal?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onNavigate,
  onOpenBudgetModal,
}) => {
  const { transactions, budget, categories, recurring, debts, overdueEmis, upcomingEmis, loanSummary } = useFinance();

  const [dismissedCategories, setDismissedCategories] = useState<Record<string, boolean>>({});

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Real-time calculation of current month (2026-10) category spending
  const currentMonthExpenses = useMemo(() => {
    return transactions.filter(
      (t) => t.date && t.date.startsWith('2026-10') && t.type === 'expense'
    );
  }, [transactions]);

  // Aggregate category spending
  const categorySpendMap = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthExpenses.forEach((t) => {
      const catId = t.categoryId || 'uncategorized';
      map[catId] = (map[catId] || 0) + t.amount;
    });
    return map;
  }, [currentMonthExpenses]);

  // Automated 80% and 100% category budget threshold warnings
  const { dangerAlerts, warningAlerts } = useMemo(() => {
    const danger: CategoryBudgetAlert[] = [];
    const warning: CategoryBudgetAlert[] = [];

    categories.forEach((cat) => {
      const allocated = budget.categoryBudgets[cat.id] || cat.monthlyBudget || 0;
      if (allocated > 0) {
        const spent = categorySpendMap[cat.id] || 0;
        const percentage = Math.round((spent / allocated) * 1000) / 10;

        if (percentage >= 100) {
          danger.push({
            categoryId: cat.id,
            categoryName: cat.name,
            icon: cat.icon || 'Tag',
            color: cat.color || '#ef4444',
            spent,
            allocated,
            percentage,
            severity: 'danger',
            varianceAmount: spent - allocated,
            timestamp: new Date().toISOString(),
            dismissed: Boolean(dismissedCategories[cat.id]),
          });
        } else if (percentage >= 80) {
          warning.push({
            categoryId: cat.id,
            categoryName: cat.name,
            icon: cat.icon || 'Tag',
            color: cat.color || '#f59e0b',
            spent,
            allocated,
            percentage,
            severity: 'warning',
            varianceAmount: allocated - spent,
            timestamp: new Date().toISOString(),
            dismissed: Boolean(dismissedCategories[cat.id]),
          });
        }
      }
    });

    danger.sort((a, b) => b.percentage - a.percentage);
    warning.sort((a, b) => b.percentage - a.percentage);

    return { dangerAlerts: danger, warningAlerts: warning };
  }, [categories, budget, categorySpendMap, dismissedCategories]);

  // Upcoming recurring bills (within next 7 days)
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const upcomingBills = recurring.filter(
    (r) => r.active && r.nextDueDate <= nextWeekStr
  );

  const totalActiveWarnings =
    dangerAlerts.filter((a) => !a.dismissed).length +
    warningAlerts.filter((a) => !a.dismissed).length;

  const toggleDismiss = (catId: string) => {
    setDismissedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Automated Budget Notifications & Warnings
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                dangerAlerts.length > 0
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : warningAlerts.length > 0
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{totalActiveWarnings} Active Warnings</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time automated alerting engine. Warns proactively when any category exceeds 80% or 100% of its set monthly limit.
          </p>
        </div>

        {onOpenBudgetModal && (
          <button
            onClick={onOpenBudgetModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Adjust Monthly Budgets</span>
          </button>
        )}
      </div>

      {/* EMI & LOAN LIABILITY NOTIFICATIONS */}
      {(overdueEmis.length > 0 || upcomingEmis.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                EMI Due &amp; Loan Liability Alerts
              </h2>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('emi_loans')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Manage EMIs &amp; Pay</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Overdue EMIs */}
            {overdueEmis.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border-2 bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 dark:border-rose-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.lenderName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
                      Overdue EMI
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold mt-1">
                    Scheduled Due Date was {formatDateIN(item.dueDate)} (Installment #{item.installmentNumber})
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                    Payable: <strong>{formatINR(item.emiAmount)}</strong> (Principal: {formatINR(item.principalComponent)}, Interest: {formatINR(item.interestComponent)})
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Debiting Bank: {item.linkedBankName || 'Linked Bank'}</span>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('emi_loans')}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Due or Upcoming EMIs */}
            {upcomingEmis.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border ${
                  item.status === 'due'
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                } shadow-sm flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.lenderName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'due'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.status === 'due' ? 'Due Today' : 'Upcoming EMI'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Due on {formatDateIN(item.dueDate)} • Inst #{item.installmentNumber}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">
                    EMI Amount: <strong>{formatINR(item.emiAmount)}</strong>
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Debiting Bank: {item.linkedBankName || 'Linked Bank'}</span>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('emi_loans')}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Process Transfer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. CRITICAL OVER-BUDGET ALERTS (>= 100%) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Critical Alerts: 100%+ Monthly Budget Exceeded
            </h2>
          </div>
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            {dangerAlerts.length} Categories Over Budget
          </span>
        </div>

        {dangerAlerts.length === 0 ? (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>Great job! No category has breached 100% of its allocated monthly budget limit.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dangerAlerts.map((alert) => (
              <div
                key={alert.categoryId}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  alert.dismissed
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-900 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon name={alert.icon} color={alert.color} size={18} />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {alert.categoryName}
                      </h3>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                        🚨 EXCEEDED BY {formatINR(alert.varianceAmount)}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                    {alert.percentage}%
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>Spent: <strong className="text-slate-900 dark:text-white">{formatINR(alert.spent)}</strong></span>
                    <span>Monthly Limit: <strong className="text-slate-900 dark:text-white">{formatINR(alert.allocated)}</strong></span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, alert.percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between text-xs">
                  <button
                    onClick={() => toggleDismiss(alert.categoryId)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    {alert.dismissed ? 'Mark Active' : 'Dismiss Warning'}
                  </button>

                  <div className="flex items-center gap-2">
                    {onOpenBudgetModal && (
                      <button
                        onClick={onOpenBudgetModal}
                        className="font-bold text-rose-700 dark:text-rose-400 hover:underline"
                      >
                        Increase Limit
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('transactions')}
                        className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 hover:underline"
                      >
                        <span>View Transactions</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. WARNING THRESHOLD ALERTS (>= 80% to 99.9%) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Warning Alerts: 80% Threshold Reached
            </h2>
          </div>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            {warningAlerts.length} Categories Approaching Limit
          </span>
        </div>

        {warningAlerts.length === 0 ? (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>No category is currently in the 80% threshold warning zone.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warningAlerts.map((alert) => (
              <div
                key={alert.categoryId}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  alert.dismissed
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-900 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon name={alert.icon} color={alert.color} size={18} />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {alert.categoryName}
                      </h3>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                        ⚠️ ONLY {formatINR(alert.varianceAmount)} REMAINING
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-slate-950">
                    {alert.percentage}%
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>Spent: <strong className="text-slate-900 dark:text-white">{formatINR(alert.spent)}</strong></span>
                    <span>Cap: <strong className="text-slate-900 dark:text-white">{formatINR(alert.allocated)}</strong></span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, alert.percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs">
                  <button
                    onClick={() => toggleDismiss(alert.categoryId)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    {alert.dismissed ? 'Mark Active' : 'Dismiss Warning'}
                  </button>

                  <div className="flex items-center gap-2">
                    {onOpenBudgetModal && (
                      <button
                        onClick={onOpenBudgetModal}
                        className="font-bold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        Adjust Budget
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('transactions')}
                        className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 hover:underline"
                      >
                        <span>View Ledger</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Upcoming Recurring Bills Reminders */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Scheduled Bills & Due Payments (Next 7 Days)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {upcomingBills.length} Bills Due
          </span>
        </div>

        {upcomingBills.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            <span>No recurring bills due in the next 7 days.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {upcomingBills.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {b.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Due: {formatDateIN(b.nextDueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {formatINR(b.amount)}
                  </p>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {b.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
