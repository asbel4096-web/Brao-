"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Bar chart أفقي لـTop items (مدن، أصناف، ماركات).
 *
 * أفقي وليس عمودي - أنسب لـRTL وللأسماء الطويلة (مثل أسماء مدن).
 * نستخدم layout="vertical" + dataKey="name" على Y axis.
 */

export interface BarItem {
  name: string;
  count: number;
}

interface Props {
  title: string;
  description?: string;
  data: BarItem[];
  color?: "brand" | "action" | "emerald" | "rose" | "amber";
  loading?: boolean;
}

const BAR_COLORS: Record<NonNullable<Props["color"]>, string[]> = {
  brand: ["#1c389c", "#2842b3", "#3b54c4", "#5167d2", "#697bde", "#8290e6", "#9ca5ec", "#b6bbf0"],
  action: ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5", "#fff7ed", "#fffdf7"],
  emerald: ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#ecfdf5", "#f0fdf5"],
  rose: ["#be123c", "#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#fecdd3", "#ffe4e6", "#fff1f2"],
  amber: ["#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7", "#fffbeb", "#fffef7"],
};

export function TopBarChart({
  title,
  description,
  data,
  color = "brand",
  loading = false,
}: Props) {
  const palette = BAR_COLORS[color];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      <div className="h-[220px] w-full">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        ) : data.length === 0 ? (
          <div className="grid h-full place-items-center text-xs text-slate-400">
            لا توجد بيانات
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                stroke="currentColor"
                className="text-slate-700 dark:text-slate-300"
                width={80}
              />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgb(226, 232, 240)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 10px",
                }}
                formatter={(value: any) => [
                  `${Number(value).toLocaleString("ar-LY")}`,
                  "العدد",
                ]}
              />
              <Bar
                dataKey="count"
                radius={[0, 6, 6, 0]}
                animationDuration={400}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={palette[i % palette.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
