"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Area chart للنمو اليومي. مغلَّف بقالب Card يُطابق تصميم الأدمن.
 *
 * - يدعم RTL تلقائياً (recharts يقلب الـX axis لو دير اللوحة rtl)
 * - tooltip بـtheme متّسق
 * - lazy: مكوّن العميل (لا SSR لـrecharts)
 */

export interface ChartPoint {
  date: string;
  count: number;
}

interface Props {
  title: string;
  description?: string;
  data: ChartPoint[];
  color?: "brand" | "action" | "emerald" | "rose";
  /** عدد البيانات الإجمالي (للعرض في الزاوية). */
  total?: number;
  loading?: boolean;
}

const COLOR_MAP: Record<NonNullable<Props["color"]>, { stroke: string; fill: string }> = {
  brand: { stroke: "#1c389c", fill: "rgba(28, 56, 156, 0.15)" },
  action: { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.15)" },
  emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.15)" },
  rose: { stroke: "#e11d48", fill: "rgba(225, 29, 72, 0.15)" },
};

export function GrowthChart({
  title,
  description,
  data,
  color = "brand",
  total,
  loading = false,
}: Props) {
  const colors = COLOR_MAP[color];
  const gradientId = `gradient-${color}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {typeof total === "number" && (
          <div className="text-end">
            <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
              {total.toLocaleString("ar-LY")}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              30 يوم
            </p>
          </div>
        )}
      </div>

      <div className="h-[180px] w-full">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        ) : data.length === 0 ? (
          <div className="grid h-full place-items-center text-xs text-slate-400">
            لا توجد بيانات في الفترة
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 6, right: 6, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colors.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgb(226, 232, 240)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 10px",
                }}
                labelStyle={{ color: "rgb(100, 116, 139)" }}
                formatter={(value: any) => [
                  `${Number(value).toLocaleString("ar-LY")}`,
                  "العدد",
                ]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={colors.stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
