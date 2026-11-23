import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  Menu,
  Plus,
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface AndroidBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickEntry: () => void;
  onOpenDrawer?: () => void;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickEntry,
  onOpenDrawer,
}) => {
  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg no-print">
      <div className="flex items-center justify-around h-15 px-2 relative">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'transactions'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <ReceiptText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Ledger</span>
        </button>

        {/* Center Android Floating Action Button */}
        <div className="flex flex-col items-center justify-center -mt-5">
          <button
            onClick={onOpenQuickEntry}
            aria-label="Quick Add Expense"
            className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Quick Add</span>
        </div>

        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'budgets'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Target className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Budgets</span>
        </button>

        <button
          onClick={() => onOpenDrawer && onOpenDrawer()}
          aria-label="Open Navigation Slide Bar"
          className="flex flex-col items-center justify-center flex-1 py-1 transition-colors text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
        >
          <div className="relative">
            <Menu className="w-5 h-5 mb-0.5 text-emerald-600 dark:text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">Slide Bar</span>
        </button>
      </div>
    </nav>
  );
};
