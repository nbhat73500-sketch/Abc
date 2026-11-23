import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { DebtRecord } from '../../types/finance';
import { formatINR } from '../../utils/formatters';

interface SettleDebtModalProps {
  debt: DebtRecord | null;
  onClose: () => void;
}

export const SettleDebtModal: React.FC<SettleDebtModalProps> = ({ debt, onClose }) => {
  const { accounts, settleDebt } = useFinance();

  const [settleAmount, setSettleAmount] = useState(() => {
    if (!debt) return '';
    const remaining = debt.amount - (debt.settledAmount || 0);
    return remaining.toString();
  });
  const [recordInAccount, setRecordInAccount] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  if (!debt) return null;

  const remaining = Math.max(0, debt.amount - (debt.settledAmount || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(settleAmount);
    if (isNaN(num) || num <= 0) return;

    settleDebt(debt.id, num, recordInAccount ? selectedAccountId : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Settle Payment
            </h3>
            <p className="text-[11px] text-slate-500">
              {debt.type === 'lent' ? `Receivable from ${debt.personName}` : `Payable to ${debt.personName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Original Total:</span>
            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {formatINR(debt.amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Already Settled:</span>
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">
              {formatINR(debt.settledAmount || 0)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-semibold">
            <span className="text-slate-900 dark:text-white">Remaining Due:</span>
            <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatINR(remaining)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Settlement Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                required
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm font-semibold tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={recordInAccount}
                onChange={(e) => setRecordInAccount(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300"
              />
              Record transaction in account balance
            </label>

            {recordInAccount && (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {debt.type === 'lent' ? 'Deposit to Account:' : 'Deduct from Account:'}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatINR(acc.balance, { hideDecimals: true })})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
            >
              Confirm Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
