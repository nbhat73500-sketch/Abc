import React, { useState } from 'react';
import { formatINR } from '../../utils/formatters';

interface MonthlyComparison {
  monthName: string;
  income: number;
  expense: number;
  netSavings: number;
}

interface IncomeExpenseBarChartProps {
  data: MonthlyComparison[];
}

export const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        No comparative financial data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1000);
  const chartHeight = 160;

  return (
    <div className="w-full">
      {/* Legend & quick indicators */}
      <div className="flex items-center justify-between text-xs mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Total Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500" />
            <span className="text-slate-600 dark:text-slate-400">Total Expenses</span>
          </div>
        </div>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="text-right text-xs">
            <span className="text-slate-500">Savings: </span>
            <span
              className={`font-semibold tabular-nums ${
                data[hoveredIndex].netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(data[hoveredIndex].netSavings, { hideDecimals: true })}
            </span>
          </div>
        )}
      </div>

      {/* Bar Chart Container */}
      <div className="flex items-end justify-between gap-3 h-[160px] pt-4 border-b border-slate-200 dark:border-slate-800">
        {data.map((item, index) => {
          const incomeHeight = Math.max(4, (item.income / maxVal) * (chartHeight - 30));
          const expenseHeight = Math.max(4, (item.expense / maxVal) * (chartHeight - 30));
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={item.monthName}
              className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-12 bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                  <div>In: {formatINR(item.income, { hideDecimals: true })}</div>
                  <div>Out: {formatINR(item.expense, { hideDecimals: true })}</div>
                </div>
              )}

              {/* Bars side by side */}
              <div className="flex items-end gap-1 w-full justify-center">
                {/* Income Bar */}
                <div
                  style={{ height: `${incomeHeight}px` }}
                  className={`w-3.5 sm:w-5 bg-emerald-500 rounded-t-sm transition-all duration-200 ${
                    isHovered ? 'bg-emerald-600 brightness-110' : 'hover:brightness-105'
                  }`}
                  title={`Income: ${formatINR(item.income)}`}
                />
                {/* Expense Bar */}
                <div
                  style={{ height: `${expenseHeight}px` }}
                  className={`w-3.5 sm:w-5 bg-rose-500 rounded-t-sm transition-all duration-200 ${
                    isHovered ? 'bg-rose-600 brightness-110' : 'hover:brightness-105'
                  }`}
                  title={`Expense: ${formatINR(item.expense)}`}
                />
              </div>

              {/* Month label */}
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 truncate max-w-full">
                {item.monthName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
