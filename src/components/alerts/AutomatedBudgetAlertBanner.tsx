import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  X,
  ArrowRight,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';
import { CategoryBudgetAlert } from '../../types/finance';

interface AutomatedBudgetAlertBannerProps {
  onNavigateToTab?: (tab: string) => void;
  onOpenBudgetModal?: () => void;
}

export const AutomatedBudgetAlertBanner: React.FC<AutomatedBudgetAlertBannerProps> = ({
  onNavigateToTab,
  onOpenBudgetModal,
}) => {
  const { transactions, categories, budget } = useFinance();

  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});
  const [activeToast, setActiveToast] = useState<CategoryBudgetAlert | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play subtle warning chime for 80% or 100% alert
  const playAlertChime = (severity: 'warning' | 'danger') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = severity === 'danger' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(severity === 'danger' ? 440 : 587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(severity === 'danger' ? 330 : 880, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio playback restrictions fallback
    }
  };

  // Real-time calculation of all category spending in the current month (2026-10)
  const categoryAlerts: CategoryBudgetAlert[] = useMemo(() => {
    // Current month expenses
    const currentMonthExpenses = transactions.filter(
      (t) => t.date && t.date.startsWith('2026-10') && t.type === 'expense'
    );

    // Group spending by category
    const spendMap: Record<string, number> = {};
    currentMonthExpenses.forEach((t) => {
      const catId = t.categoryId || 'uncategorized';
      spendMap[catId] = (spendMap[catId] || 0) + t.amount;
    });

    const alerts: CategoryBudgetAlert[] = [];

    categories.forEach((cat) => {
      const allocated = budget.categoryBudgets[cat.id] || cat.monthlyBudget || 0;
      if (allocated > 0) {
        const spent = spendMap[cat.id] || 0;
        const percentage = Math.round((spent / allocated) * 1000) / 10; // 1 decimal place

        if (percentage >= 80) {
          const isDanger = percentage >= 100;
          const varianceAmount = isDanger ? spent - allocated : allocated - spent;

          alerts.push({
            categoryId: cat.id,
            categoryName: cat.name,
            icon: cat.icon || 'Tag',
            color: cat.color || '#ea580c',
            spent,
            allocated,
            percentage,
            severity: isDanger ? 'danger' : 'warning',
            varianceAmount,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    // Sort: 100%+ danger alerts first, then highest percentage
    return alerts.sort((a, b) => b.percentage - a.percentage);
  }, [transactions, categories, budget]);

  // Automated trigger: show toast when an alert crosses 80% or 100% and isn't dismissed
  useEffect(() => {
    const unhandledAlert = categoryAlerts.find((a) => !dismissedAlerts[a.categoryId]);
    if (unhandledAlert) {
      setActiveToast(unhandledAlert);
      playAlertChime(unhandledAlert.severity);
    } else {
      setActiveToast(null);
    }
  }, [categoryAlerts, dismissedAlerts]);

  const handleDismiss = (catId: string) => {
    setDismissedAlerts((prev) => ({ ...prev, [catId]: true }));
    setActiveToast(null);
  };

  if (!activeToast) return null;

  const isDanger = activeToast.severity === 'danger';

  return (
    <div className="fixed top-18 right-4 sm:right-6 z-50 max-w-md w-[92vw] sm:w-full animate-slideIn">
      <div
        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
          isDanger
            ? 'bg-rose-950/90 text-rose-50 border-rose-500/80 shadow-rose-950/50'
            : 'bg-amber-950/90 text-amber-50 border-amber-500/80 shadow-amber-950/50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {isDanger ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    isDanger ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {isDanger ? '🚨 100% BUDGET EXCEEDED' : '⚠️ 80% BUDGET WARNING'}
                </span>
                <span className="text-xs font-mono font-bold">
                  {activeToast.percentage}%
                </span>
              </div>

              <h4 className="text-sm font-bold leading-tight">
                {activeToast.categoryName} Limit Alert
              </h4>

              <p className="text-xs opacity-90 leading-snug">
                {isDanger ? (
                  <>
                    Spent <strong>{formatINR(activeToast.spent)}</strong> of{' '}
                    <strong>{formatINR(activeToast.allocated)}</strong> monthly cap. Over limit by{' '}
                    <span className="underline font-bold text-rose-300">
                      {formatINR(activeToast.varianceAmount)}
                    </span>
                    !
                  </>
                ) : (
                  <>
                    Spent <strong>{formatINR(activeToast.spent)}</strong> of{' '}
                    <strong>{formatINR(activeToast.allocated)}</strong> limit. Only{' '}
                    <span className="underline font-bold text-amber-300">
                      {formatINR(activeToast.varianceAmount)}
                    </span>{' '}
                    remaining for this month.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleDismiss(activeToast.categoryId)}
              className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDanger ? 'bg-rose-400' : 'bg-amber-400'
            }`}
            style={{ width: `${Math.min(100, activeToast.percentage)}%` }}
          />
        </div>

        {/* Action Links */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-[11px] opacity-75">
            Automated Alert System Active
          </span>
          <div className="flex items-center gap-2">
            {onOpenBudgetModal && (
              <button
                onClick={() => {
                  handleDismiss(activeToast.categoryId);
                  onOpenBudgetModal();
                }}
                className="font-bold underline hover:opacity-80 transition-opacity"
              >
                Adjust Limit
              </button>
            )}
            {onNavigateToTab && (
              <button
                onClick={() => {
                  handleDismiss(activeToast.categoryId);
                  onNavigateToTab('notifications');
                }}
                className="font-bold flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <span>View All Alerts</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
