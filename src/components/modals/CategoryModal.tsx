import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Category } from '../../types/finance';
import { CategoryIcon } from '../CategoryIcon';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory?: Category | null;
}

const AVAILABLE_ICONS = [
  'Utensils',
  'Car',
  'Home',
  'ShoppingBag',
  'HeartPulse',
  'GraduationCap',
  'Shirt',
  'Wifi',
  'Building2',
  'Briefcase',
  'CreditCard',
  'Film',
  'MoreHorizontal',
  'Plane',
  'Coffee',
  'Fuel',
  'Gift',
  'Dumbbell',
  'Tv',
  'Smartphone',
  'BookOpen',
  'Wrench',
  'Zap',
];

const AVAILABLE_COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#ea580c', // Orange
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#2563eb', // Blue
  '#db2777', // Pink
  '#0d9488', // Teal
  '#475569', // Slate
  '#dc2626', // Red
  '#8b5cf6', // Violet
  '#16a34a', // Green
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  editingCategory,
}) => {
  const { addCategory, updateCategory } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'both'>('expense');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#059669');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newSubcatInput, setNewSubcatInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setIcon(editingCategory.icon || 'Tag');
      setColor(editingCategory.color || '#059669');
      setMonthlyBudget(editingCategory.monthlyBudget ? editingCategory.monthlyBudget.toString() : '');
      setSubcategories(editingCategory.subcategories || []);
    } else {
      setName('');
      setType('expense');
      setIcon('Utensils');
      setColor('#ea580c');
      setMonthlyBudget('');
      setSubcategories([]);
    }
    setError('');
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  const handleAddSubcategory = () => {
    const trimmed = newSubcatInput.trim();
    if (trimmed && !subcategories.includes(trimmed)) {
      setSubcategories([...subcategories, trimmed]);
      setNewSubcatInput('');
    }
  };

  const handleRemoveSubcategory = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    const budgetVal = monthlyBudget ? parseFloat(monthlyBudget) : undefined;

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: name.trim(),
        type,
        icon,
        color,
        subcategories: subcategories.length > 0 ? subcategories : ['General'],
        monthlyBudget: budgetVal && !isNaN(budgetVal) ? budgetVal : undefined,
      });
    } else {
      addCategory({
        name: name.trim(),
        type,
        icon,
        color,
        subcategories: subcategories.length > 0 ? subcategories : ['General'],
        monthlyBudget: budgetVal && !isNaN(budgetVal) ? budgetVal : undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {editingCategory ? 'Edit Category' : 'Create Custom Category'}
            </h3>
            <p className="text-[11px] text-slate-500">Configure category details & subcategories</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fitness & Gym, Pets, Subscriptions"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'expense' | 'income' | 'both')}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="both">Both (Income & Expense)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Monthly Budget (Optional ₹)
              </label>
              <input
                type="number"
                step="100"
                placeholder="e.g. 5000"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Color palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category Color
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Icon Choice
            </label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              {AVAILABLE_ICONS.map((iconName) => (
                <button
                  type="button"
                  key={iconName}
                  onClick={() => setIcon(iconName)}
                  className={`p-1.5 rounded-md text-xs transition-colors ${
                    icon === iconName
                      ? 'bg-slate-900 text-white dark:bg-emerald-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <CategoryIcon name={iconName} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Subcategories list */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subcategories
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add subcategory (e.g. Swiggy, Fuel, Dine out)"
                value={newSubcatInput}
                onChange={(e) => setNewSubcatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubcategory();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddSubcategory}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {subcategories.map((sub, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubcategory(i)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {subcategories.length === 0 && (
                <span className="text-xs text-slate-400 italic">No subcategories defined (will use 'General')</span>
              )}
            </div>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 rounded-lg shadow-sm"
            >
              {editingCategory ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
