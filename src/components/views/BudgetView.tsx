import React, { useState, useMemo } from 'react';
import {
  Target,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
  Calendar,
  X,
  TrendingUp,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatDateIN } from '../../utils/formatters';
import { CategoryIcon } from '../CategoryIcon';
import { SavingsGoal } from '../../types/finance';

interface BudgetViewProps {
  onOpenCategoryManager: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({ onOpenCategoryManager }) => {
  const {
    budget,
    updateBudget,
    categories,
    transactions,
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
  } = useFinance();

  // Editing budget limits modal
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState(budget.monthlyBudget.toString());
  const [weeklyBudgetInput, setWeeklyBudgetInput] = useState(budget.weeklyBudget.toString());
  const [dailyBudgetInput, setDailyBudgetInput] = useState(budget.dailyBudget.toString());
  const [categoryBudgetsInput, setCategoryBudgetsInput] = useState<Record<string, string>>({});

  // Savings goal modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalCategory, setGoalCategory] = useState('Safety Net');
  const [goalColor, setGoalColor] = useState('#059669');

  // October 2026 expense calculations
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith('2026-10') && t.type === 'expense');
  }, [transactions]);

  const totalMonthlySpent = useMemo(() => {
    return currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  // Category spending vs budget
  const categorySpendingAnalysis = useMemo(() => {
    const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');

    return expenseCategories.map((cat) => {
      const spent = currentMonthTransactions
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);

      const allocatedBudget = budget.categoryBudgets[cat.id] || cat.monthlyBudget || 0;
      const remaining = allocatedBudget > 0 ? allocatedBudget - spent : 0;
      const percentage = allocatedBudget > 0 ? (spent / allocatedBudget) * 100 : 0;

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentage >= 100) status = 'danger';
      else if (percentage >= 75) status = 'warning';

      return {
        category: cat,
        spent,
        budget: allocatedBudget,
        remaining,
        percentage,
        status,
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [categories, currentMonthTransactions, budget]);

  const handleOpenEditBudget = () => {
    setMonthlyBudgetInput(budget.monthlyBudget.toString());
    setWeeklyBudgetInput(budget.weeklyBudget.toString());
    setDailyBudgetInput(budget.dailyBudget.toString());

    const catInputs: Record<string, string> = {};
    categories.forEach((c) => {
      catInputs[c.id] = (budget.categoryBudgets[c.id] || c.monthlyBudget || 0).toString();
    });
    setCategoryBudgetsInput(catInputs);
    setIsEditingBudget(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(monthlyBudgetInput) || 0;
    const w = parseFloat(weeklyBudgetInput) || 0;
    const d = parseFloat(dailyBudgetInput) || 0;

    const newCatBudgets: Record<string, number> = {};
    Object.entries(categoryBudgetsInput).forEach(([catId, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) newCatBudgets[catId] = num;
    });

    updateBudget({
      monthlyBudget: m,
      weeklyBudget: w,
      dailyBudget: d,
      categoryBudgets: newCatBudgets,
    });

    setIsEditingBudget(false);
  };

  // Savings goal handlers
  const handleOpenAddGoal = () => {
    setGoalName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('2027-03-31');
    setGoalCategory('General');
    setGoalColor('#059669');
    setEditingGoalId(null);
    setIsGoalModalOpen(true);
  };

  const handleOpenEditGoal = (goal: SavingsGoal) => {
    setGoalName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setTargetDate(goal.targetDate);
    setGoalCategory(goal.category);
    setGoalColor(goal.color);
    setEditingGoalId(goal.id);
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;
    if (isNaN(target) || target <= 0) return;

    if (editingGoalId) {
      updateSavingsGoal(editingGoalId, {
        name: goalName.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
        category: goalCategory,
        color: goalColor,
      });
    } else {
      addSavingsGoal({
        name: goalName.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
        category: goalCategory,
        color: goalColor,
      });
    }

    setIsGoalModalOpen(false);
  };

  const monthlyRemaining = budget.monthlyBudget - totalMonthlySpent;
  const overallUsedPct = budget.monthlyBudget > 0 ? (totalMonthlySpent / budget.monthlyBudget) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Budget Management & Savings Targets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor spend caps, control category overruns, and track savings goals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCategoryManager}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
          >
            Manage Categories
          </button>
          <button
            onClick={handleOpenEditBudget}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Set Budget Limits
          </button>
        </div>
      </div>

      {/* Main Budget Progress Cards: Monthly, Weekly, Daily */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly Budget Card */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Monthly Budget (October 2026)</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {overallUsedPct.toFixed(1)}% Used
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatINR(totalMonthlySpent)}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              of {formatINR(budget.monthlyBudget, { hideDecimals: true })}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallUsedPct > 100
                  ? 'bg-rose-600'
                  : overallUsedPct > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallUsedPct)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Remaining Budget:</span>
            <span
              className={`font-bold tabular-nums ${
                monthlyRemaining >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(monthlyRemaining)}
            </span>
          </div>
        </div>

        {/* Weekly Budget */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Weekly Budget Limit</span>
            <Calendar className="w-4 h-4 text-sky-600" />
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatINR(budget.weeklyBudget, { hideDecimals: true })}
            </span>
            <span className="text-xs text-slate-400">Target per 7 days</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: '68%' }} />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Weekly Cap:</span>
            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {formatINR(budget.weeklyBudget)}
            </span>
          </div>
        </div>

        {/* Daily Spending Cap */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Daily Expense Target</span>
            <Target className="w-4 h-4 text-amber-600" />
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatINR(budget.dailyBudget, { hideDecimals: true })}
            </span>
            <span className="text-xs text-slate-400">Recommended / day</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: '45%' }} />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Month Daily Average:</span>
            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {formatINR(totalMonthlySpent / 27, { hideDecimals: true })} / day
            </span>
          </div>
        </div>
      </div>

      {/* Category-Wise Budgets Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Category-Wise Spending vs Budget
            </h2>
            <p className="text-xs text-slate-500">
              Allocated limits, actual October spend, and warning states
            </p>
          </div>
          <button
            onClick={handleOpenEditBudget}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Adjust Allocations →
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorySpendingAnalysis.map((item) => {
            const hasBudget = item.budget > 0;

            return (
              <div
                key={item.category.id}
                className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${item.category.color}15`,
                          color: item.category.color,
                        }}
                      >
                        <CategoryIcon name={item.category.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.category.name}
                      </span>
                    </div>

                    {hasBudget && (
                      <span
                        className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                          item.status === 'danger'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : item.status === 'warning'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.status === 'danger' && 'Exceeded: '}
                        {item.percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatINR(item.spent)}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {hasBudget ? `Budget: ${formatINR(item.budget, { hideDecimals: true })}` : 'No budget set'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {hasBudget ? (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === 'danger'
                            ? 'bg-rose-600'
                            : item.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  ) : (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2" />
                  )}
                </div>

                <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                  <span>
                    {hasBudget
                      ? item.remaining >= 0
                        ? `Remaining: ${formatINR(item.remaining, { hideDecimals: true })}`
                        : `Over budget by: ${formatINR(Math.abs(item.remaining), { hideDecimals: true })}`
                      : 'Unrestricted'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Targets & Goals */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Savings Targets & Milestones
              </h2>
              <p className="text-xs text-slate-500">Track progress toward specific financial ambitions</p>
            </div>
          </div>

          <button
            onClick={handleOpenAddGoal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Goal
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {savingsGoals.map((goal) => {
            const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const remainingToSave = Math.max(0, goal.targetAmount - goal.currentAmount);

            return (
              <div
                key={goal.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {goal.category}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {goal.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditGoal(goal)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${goal.name}?`)) deleteSavingsGoal(goal.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatINR(goal.currentAmount, { hideDecimals: true })}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        of {formatINR(goal.targetAmount, { hideDecimals: true })}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-[11px] text-slate-500 mt-2 italic">
                      "{goal.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                  <span>Target Date: {formatDateIN(goal.targetDate)}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {pct.toFixed(0)}% Complete
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Set Budget Limits Modal */}
      {isEditingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Set Financial Budgets
                </h3>
                <p className="text-[11px] text-slate-500">
                  Define overall monthly caps and category allocations
                </p>
              </div>
              <button
                onClick={() => setIsEditingBudget(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Overall caps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Budget (₹) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={monthlyBudgetInput}
                    onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weekly Target (₹)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={weeklyBudgetInput}
                    onChange={(e) => setWeeklyBudgetInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Cap (₹)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={dailyBudgetInput}
                    onChange={(e) => setDailyBudgetInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Category-wise inputs */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Category Monthly Allocations (₹)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
                  {categories
                    .filter((c) => c.type === 'expense' || c.type === 'both')
                    .map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate text-xs text-slate-700 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <input
                          type="number"
                          step="500"
                          placeholder="0"
                          value={categoryBudgetsInput[cat.id] || ''}
                          onChange={(e) =>
                            setCategoryBudgetsInput({
                              ...categoryBudgetsInput,
                              [cat.id]: e.target.value,
                            })
                          }
                          className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-right"
                        />
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Save Budget Allocations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Savings Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingGoalId ? 'Edit Savings Target' : 'Create New Savings Goal'}
              </h3>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Gold, Goa Trip, New Laptop"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    placeholder="e.g. 50000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Saved (₹)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Classification
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Safety Net">Safety Net / Emergency</option>
                    <option value="Investments">Gold & Investments</option>
                    <option value="Travel">Vacation & Travel</option>
                    <option value="Gadgets">Electronics & Gadgets</option>
                    <option value="Vehicle">Vehicle Purchase</option>
                    <option value="Home">Home Renovation</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  {editingGoalId ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
