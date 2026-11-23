import React, { useState } from 'react';
import { formatINR } from '../../utils/formatters';

interface DailySpendPoint {
  day: number;
  dateStr: string;
  amount: number;
}

interface ExpenseTrendAreaChartProps {
  data: DailySpendPoint[];
  monthLabel: string;
}

export const ExpenseTrendAreaChart: React.FC<ExpenseTrendAreaChartProps> = ({ data, monthLabel }) => {
  const [hoveredPoint, setHoveredPoint] = useState<DailySpendPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        No daily spending trend data
      </div>
    );
  }

  const width = 600;
  const height = 160;
  const paddingX = 24;
  const paddingY = 20;

  const maxAmount = Math.max(...data.map((d) => d.amount), 500);

  // Map points to SVG coordinates
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.amount / maxAmount) * (height - 2 * paddingY);
    return { ...d, x, y };
  });

  // Construct SVG path for area & line
  const linePath = points.reduce((acc, curr, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${height - paddingY} L ${points[0].x.toFixed(1)},${height - paddingY} Z`;

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-slate-500 dark:text-slate-400">
          Daily Spending Trend ({monthLabel})
        </span>
        {hoveredPoint ? (
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            Day {hoveredPoint.day}: {formatINR(hoveredPoint.amount, { hideDecimals: true })}
          </span>
        ) : (
          <span className="text-slate-400 text-[11px]">Hover over graph points</span>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[160px] overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive circles */}
          {points.map((p) => {
            const isHovered = hoveredPoint?.day === p.day;
            if (p.amount === 0 && !isHovered) return null;

            return (
              <circle
                key={p.day}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 3.5}
                className="cursor-pointer transition-all fill-white stroke-sky-600 dark:fill-slate-900"
                strokeWidth={isHovered ? 3 : 2}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* X-axis days indicators */}
      <div className="flex justify-between text-[11px] text-slate-400 mt-1 px-1">
        <span>Day 1</span>
        <span>Day 10</span>
        <span>Day 20</span>
        <span>Day 30</span>
      </div>
    </div>
  );
};
