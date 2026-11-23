import React, { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({ isOpen, onClose }) => {
  const { categories, accounts, addTransaction } = useFinance();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(() => {
    const foodCat = categories.find((c) => c.id === 'cat-food');
    return foodCat?.id || categories[0]?.id || '';
  });
  const [accountId, setAccountId] = useState(() => accounts[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('upi');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const hours = String(new Date().getHours()).padStart(2, '0');
    const mins = String(new Date().getMinutes()).padStart(2, '0');

    const cat = categories.find((c) => c.id === categoryId);

    addTransaction({
      type: 'expense',
      amount: num,
      date: today,
      time: `${hours}:${mins}`,
      categoryId: categoryId || 'cat-food',
      subcategory: cat?.subcategories[0] || 'General',
      description: description.trim() || cat?.name || 'Quick Expense',
      paymentMethod,
      accountId: accountId || accounts[0]?.id,
      vendor: 'Quick Log',
      isReconciled: true,
    });

    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Expense Entry</h3>
              <p className="text-[11px] text-slate-500">Record on the go in 5 seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-base font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-lg font-bold tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {formatINR(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {categories
                .filter((c) => c.type === 'expense' || c.type === 'both')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              What was this for?
            </label>
            <input
              type="text"
              placeholder="e.g. Chai & snacks, Auto rickshaw, Milk packet"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Account & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'upi')}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="upi">UPI (GPay / PhonePe)</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-lg shadow-sm"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
