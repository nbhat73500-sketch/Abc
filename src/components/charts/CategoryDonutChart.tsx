import React, { useState } from 'react';
import { formatINR } from '../../utils/formatters';

interface DonutSlice {
  id: string;
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface CategoryDonutChartProps {
  data: DonutSlice[];
  totalAmount: number;
  height?: number;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  data,
  totalAmount,
  height = 260,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);

  if (!data || data.length === 0 || totalAmount <= 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[260px] text-slate-400 dark:text-slate-500">
        <p className="text-sm">No expense records found for this period</p>
      </div>
    );
  }

  // SVG dimensions
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {data.map((slice) => {
            const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativeAngle / 100) * circumference);
            cumulativeAngle += slice.percentage;

            const isHovered = hoveredSlice?.id === slice.id;

            return (
              <circle
                key={slice.id}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredSlice(slice)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {hoveredSlice ? hoveredSlice.name : 'Total Expense'}
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {formatINR(hoveredSlice ? hoveredSlice.amount : totalAmount, { hideDecimals: true })}
          </span>
          {hoveredSlice && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {hoveredSlice.percentage.toFixed(1)}% of total
            </span>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full flex-1 max-h-[220px] overflow-y-auto pr-1 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
        {data.slice(0, 6).map((item) => (
          <div
            key={item.id}
            onMouseEnter={() => setHoveredSlice(item)}
            onMouseLeave={() => setHoveredSlice(null)}
            className={`flex items-center justify-between pt-1.5 pb-0.5 px-2 rounded-md transition-colors cursor-pointer text-xs ${
              hoveredSlice?.id === item.id
                ? 'bg-slate-100 dark:bg-slate-800 font-semibold'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-slate-700 dark:text-slate-200">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 tabular-nums">
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {formatINR(item.amount, { hideDecimals: true })}
              </span>
              <span className="text-slate-400 text-[11px] w-9 text-right">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
