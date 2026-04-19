"use client";

/**
 * DailyChart — stacked bar chart of daily activity grouped by action.
 *
 * Pivots the flat `DailyPoint[]` (one row per day+action) into one row per
 * day with a column per action, then renders a stacked recharts <BarChart>
 * inside a shadcn Card. Action keys are derived from data so new action
 * types appear automatically.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyPoint } from "@/types/analytics";

interface DailyChartProps {
  data: DailyPoint[];
}

// Simple fixed palette — cycled across the discovered action keys. Keeps the
// chart legible without dragging in a design-system dependency. The
// `ActivityAction` union currently has 7 members (upload, delete, move, copy,
// folder-create, share-create, share-revoke), so keep at least 7 distinct
// colors to avoid the 7th bar colliding with the 1st.
const PALETTE = [
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f472b6", // pink-400
  "#a78bfa", // violet-400
  "#fb7185", // rose-400
  "#22d3ee", // cyan-400
];

interface PivotedRow {
  day: string;
  [action: string]: string | number;
}

function pivot(data: DailyPoint[]): {
  rows: PivotedRow[];
  actions: string[];
} {
  const byDay = new Map<string, PivotedRow>();
  const actionSet = new Set<string>();

  for (const point of data) {
    actionSet.add(point.action);
    const existing = byDay.get(point.day);
    if (existing) {
      byDay.set(point.day, { ...existing, [point.action]: point.count });
    } else {
      byDay.set(point.day, { day: point.day, [point.action]: point.count });
    }
  }

  const actions = Array.from(actionSet).sort();
  // Fill zeros so every row has every action key — keeps tooltip rows consistent.
  const rows = Array.from(byDay.values())
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((row) => {
      const next: PivotedRow = { ...row };
      for (const action of actions) {
        if (typeof next[action] !== "number") next[action] = 0;
      }
      return next;
    });

  return { rows, actions };
}

export function DailyChart({ data }: DailyChartProps) {
  const { rows, actions } = useMemo(() => pivot(data), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily activity</CardTitle>
        <CardDescription>Events per day, grouped by action</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activity in the last 30 days
          </p>
        ) : (
          <div
            role="img"
            aria-label="Daily activity chart — stacked bars showing events per day by action"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rows}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="day"
                  fontSize={12}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00Z");
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={12}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--card-foreground))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {actions.map((action, i) => (
                  <Bar
                    key={action}
                    dataKey={action}
                    stackId="activity"
                    fill={PALETTE[i % PALETTE.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
