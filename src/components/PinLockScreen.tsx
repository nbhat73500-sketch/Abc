import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const PinLockScreen: React.FC = () => {
  const { unlockApp } = useFinance();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;

    const ok = unlockApp(pin);
    if (!ok) {
      setError(true);
      setPin('');
    } else {
      setError(false);
    }
  };

  const handleKeyClick = (val: string) => {
    if (pin.length < 6) {
      const next = pin + val;
      setPin(next);
      setError(false);
      if (next.length >= 4) {
        // test unlock
        if (unlockApp(next)) {
          // unlocked
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 text-white">
      <div className="w-full max-w-xs text-center space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Budget Management</h2>
          <p className="text-xs text-slate-400 mt-1">Enter your security PIN to unlock financial records</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-emerald-500 border-emerald-400 scale-110'
                  : 'bg-slate-800 border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-400">
            Incorrect PIN. Please try again.
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyClick(digit)}
              className="h-12 w-12 mx-auto rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-lg font-semibold text-slate-100 flex items-center justify-center border border-slate-800 transition-colors"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 w-12 mx-auto rounded-full text-xs font-medium text-slate-400 hover:text-white flex items-center justify-center"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => handleKeyClick('0')}
            className="h-12 w-12 mx-auto rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-lg font-semibold text-slate-100 flex items-center justify-center border border-slate-800 transition-colors"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="h-12 w-12 mx-auto rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>AES Client Encrypted & Offline Persistent</span>
        </div>
      </div>
    </div>
  );
};
