"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Cell,
} from "recharts";

// Reference palette slot 1 (validated) for single-series magnitude; text stays in ink tokens.
const SERIES = "#2a78d6";
const GRID = "oklch(0.92 0.01 255)";
const INK_2 = "#52514e";

const axis = { stroke: GRID, tick: { fill: INK_2, fontSize: 11 }, tickLine: false, axisLine: false } as const;

function Tip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { name: string; value: number; payload: Record<string, unknown> }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-0.5 font-medium">{label}</div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.name} className="text-muted-foreground">
            {p.name}: <span className="font-semibold text-foreground">{typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}{unit}</span>
          </div>
        ))}
    </div>
  );
}

/** Daily volume with a dashed forecast continuation (same series, different line style). */
export function TrendChart({ data }: { data: { day: string; actual: number | null; forecast: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="fillA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES} stopOpacity={0.18} />
            <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" {...axis} interval={13} />
        <YAxis {...axis} width={40} />
        <Tooltip content={<Tip />} cursor={{ stroke: INK_2, strokeDasharray: "3 3" }} />
        <Area type="monotone" dataKey="actual" name="Applications" stroke={SERIES} strokeWidth={2} fill="url(#fillA)" dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="forecast" name="Forecast" stroke={SERIES} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars, sorted, single hue; optional highlight of rows over a threshold. */
export function HBar({
  data, unit = "", highlightAbove, height,
}: { data: { label: string; value: number }[]; unit?: string; highlightAbove?: number; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(160, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" {...axis} hide />
        <YAxis type="category" dataKey="label" {...axis} width={130} />
        <Tooltip content={<Tip unit={unit} />} cursor={{ fill: "oklch(0.95 0.01 255)" }} />
        <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]} label={{ position: "right", fill: INK_2, fontSize: 11, formatter: (v: unknown) => `${v}${unit}` }}>
          {data.map((d) => (
            <Cell key={d.label} fill={highlightAbove != null && d.value > highlightAbove ? "#e34948" : SERIES} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data }: { data: number[] }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Area type="monotone" dataKey="v" stroke={SERIES} strokeWidth={1.5} fill={SERIES} fillOpacity={0.1} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
