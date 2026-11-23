import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Target,
  IndianRupee,
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';
import { CategoryIcon } from '../CategoryIcon';

interface MonthlyBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string; // YYYY-MM
}

export const MonthlyBudgetModal: React.FC<MonthlyBudgetModalProps> = ({
  isOpen,
  onClose,
  initialMonth = '2026-10',
}) => {
  const { budget, updateBudget, categories, transactions, addBudgetRecord } = useFinance();

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [totalMonthlyBudget, setTotalMonthlyBudget] = useState(
    (budget.monthlyBudget || 45000).toString()
  );
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, string>>({});
  const [enableRollover, setEnableRollover] = useState(true);
  const [threshold50, setThreshold50] = useState(true);
  const [threshold75, setThreshold75] = useState(true);
  const [threshold90, setThreshold90] = useState(true);
  const [threshold100, setThreshold100] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense' || c.type === 'both'),
    [categories]
  );

  // Initialize or reset values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTotalMonthlyBudget((budget.monthlyBudget || 45000).toString());
      const initialCat: Record<string, string> = {};
      expenseCategories.forEach((cat) => {
        const val = budget.categoryBudgets[cat.id] || cat.monthlyBudget || 0;
        initialCat[cat.id] = val > 0 ? val.toString() : '';
      });
      setCategoryAllocations(initialCat);
      setSavedSuccess(false);
    }
  }, [isOpen, budget, expenseCategories]);

  // Total allocated sum
  const totalAllocated = useMemo(() => {
    return Object.values(categoryAllocations).reduce((sum, val) => {
      const num = parseFloat(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [categoryAllocations]);

  const targetBudgetNum = parseFloat(totalMonthlyBudget) || 0;
  const unallocatedAmount = targetBudgetNum - totalAllocated;

  // Quick Distribution Preset 1: Equal Split
  const handleEqualSplit = () => {
    if (targetBudgetNum <= 0 || expenseCategories.length === 0) return;
    const splitAmount = Math.floor(targetBudgetNum / expenseCategories.length);
    const updated: Record<string, string> = {};
    expenseCategories.forEach((cat) => {
      updated[cat.id] = splitAmount.toString();
    });
    setCategoryAllocations(updated);
  };

  // Quick Distribution Preset 2: 50/30/20 Rule
  const handleSmartSplit = () => {
    if (targetBudgetNum <= 0 || expenseCategories.length === 0) return;
    const needsPortion = targetBudgetNum * 0.5;
    const wantsPortion = targetBudgetNum * 0.3;

    const needsKeywords = ['rent', 'housing', 'grocery', 'food', 'utility', 'electricity', 'medical', 'health', 'bill'];
    const needsCats = expenseCategories.filter((c) =>
      needsKeywords.some((k) => c.name.toLowerCase().includes(k))
    );
    const wantsCats = expenseCategories.filter((c) => !needsCats.includes(c));

    const updated: Record<string, string> = {};
    const perNeed = needsCats.length > 0 ? Math.floor(needsPortion / needsCats.length) : 0;
    const perWant = wantsCats.length > 0 ? Math.floor(wantsPortion / (wantsCats.length || 1)) : 0;

    expenseCategories.forEach((cat) => {
      if (needsCats.includes(cat)) {
        updated[cat.id] = perNeed.toString();
      } else {
        updated[cat.id] = perWant.toString();
      }
    });
    setCategoryAllocations(updated);
  };

  // Quick Distribution Preset 3: Historical Actuals
  const handleHistoricalActuals = () => {
    const historicalSpent: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        historicalSpent[t.categoryId] = (historicalSpent[t.categoryId] || 0) + t.amount;
      });

    const updated: Record<string, string> = {};
    expenseCategories.forEach((cat) => {
      const spent = historicalSpent[cat.id] || 0;
      updated[cat.id] = spent > 0 ? Math.round(spent * 1.05).toString() : '2000'; // 5% buffer
    });
    setCategoryAllocations(updated);
  };

  const handleCategoryChange = (catId: string, val: string) => {
    setCategoryAllocations((prev) => ({
      ...prev,
      [catId]: val,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const monthlyNum = parseFloat(totalMonthlyBudget) || 0;
    const weeklyNum = Math.round(monthlyNum / 4);
    const dailyNum = Math.round(monthlyNum / 30);

    const validCategoryBudgets: Record<string, number> = {};
    Object.entries(categoryAllocations).forEach(([catId, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        validCategoryBudgets[catId] = num;
      }
    });

    const thresholds: number[] = [];
    if (threshold50) thresholds.push(50);
    if (threshold75) thresholds.push(75);
    if (threshold90) thresholds.push(90);
    if (threshold100) thresholds.push(100);

    // 1. Update centralized budget config
    updateBudget({
      monthlyBudget: monthlyNum,
      weeklyBudget: weeklyNum,
      dailyBudget: dailyNum,
      categoryBudgets: validCategoryBudgets,
    });

    // 2. Save structured record for specific month
    addBudgetRecord({
      name: `Monthly Budget ${selectedMonth}`,
      period: 'monthly',
      startDate: `${selectedMonth}-01`,
      allocatedAmount: monthlyNum,
      categoryBudgets: validCategoryBudgets,
      alertThresholds: thresholds,
      notes: enableRollover ? 'Surplus rollover enabled' : 'Strict monthly reset',
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600/10 via-transparent to-sky-600/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Monthly Budget Planner
              </h2>
              <p className="text-xs text-slate-500">
                Allocate monthly targets & category spending limits with decimal-safe math
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Monthly budget saved and applied to centralized calculation engine!</span>
            </div>
          )}

          {/* Month Selector & Total Monthly Budget Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Target Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                Total Monthly Budget (INR ₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={totalMonthlyBudget}
                  onChange={(e) => setTotalMonthlyBudget(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Budget Allocation Summary Bar */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Allocated: <span className="font-mono font-bold">{formatINR(totalAllocated)}</span> of {formatINR(targetBudgetNum)}
              </span>
              <span
                className={`font-bold font-mono text-xs ${
                  unallocatedAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {unallocatedAmount >= 0
                  ? `₹${Math.round(unallocatedAmount).toLocaleString('en-IN')} Unallocated`
                  : `Overallocated by ₹${Math.abs(Math.round(unallocatedAmount)).toLocaleString('en-IN')}`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  unallocatedAmount < 0
                    ? 'bg-rose-500'
                    : totalAllocated === targetBudgetNum
                    ? 'bg-emerald-500'
                    : 'bg-sky-500'
                }`}
                style={{
                  width: `${Math.min(100, targetBudgetNum > 0 ? (totalAllocated / targetBudgetNum) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>

          {/* Quick Allocation Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Auto-Distribution Presets
              </span>
              <span className="text-[11px] text-slate-400">1-click calculation</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSmartSplit}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors text-center"
              >
                50/30 Rule (Needs/Wants)
              </button>
              <button
                type="button"
                onClick={handleEqualSplit}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors text-center"
              >
                Equal Split ({expenseCategories.length} Cats)
              </button>
              <button
                type="button"
                onClick={handleHistoricalActuals}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors text-center"
              >
                Past Spending + 5%
              </button>
            </div>
          </div>

          {/* Category-Wise Allocation Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              Category Monthly Spending Limits
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {expenseCategories.map((cat) => {
                const currentVal = categoryAllocations[cat.id] || '';
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon name={cat.icon} color={cat.color} size={16} />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 w-36 shrink-0">
                      <span className="text-xs text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={currentVal}
                        onChange={(e) => handleCategoryChange(cat.id, e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs font-bold text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Automatic Over-Budget Notification Thresholds */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Automatic Threshold Warning Triggers
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={threshold50}
                  onChange={(e) => setThreshold50(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>50% Spent Alert</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={threshold75}
                  onChange={(e) => setThreshold75(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>75% Caution</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={threshold90}
                  onChange={(e) => setThreshold90(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>90% Critical</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={threshold100}
                  onChange={(e) => setThreshold100(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>100% Over-Budget</span>
              </label>
            </div>
          </div>

          {/* Budget Rollover Setting */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Carry Forward Unspent Balance
              </p>
              <p className="text-[11px] text-slate-500">
                Automatically roll forward surplus funds from previous period to increase savings
              </p>
            </div>
            <input
              type="checkbox"
              checked={enableRollover}
              onChange={(e) => setEnableRollover(e.target.checked)}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Monthly Budget</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
