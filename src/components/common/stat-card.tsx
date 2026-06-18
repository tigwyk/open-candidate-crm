"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: number; positive?: boolean };
  accent?: "primary" | "emerald" | "amber" | "rose" | "violet" | "cyan";
  className?: string;
  children?: React.ReactNode;
}

const ACCENTS: Record<string, { bg: string; fg: string }> = {
  primary: { bg: "bg-primary/10", fg: "text-primary" },
  emerald: { bg: "bg-emerald-500/10", fg: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/10", fg: "text-amber-600 dark:text-amber-400" },
  rose: { bg: "bg-rose-500/10", fg: "text-rose-600 dark:text-rose-400" },
  violet: { bg: "bg-violet-500/10", fg: "text-violet-600 dark:text-violet-400" },
  cyan: { bg: "bg-cyan-500/10", fg: "text-cyan-600 dark:text-cyan-400" },
};

export function StatCard({ icon: Icon, label, value, sub, trend, accent = "primary", className, children }: Props) {
  const a = ACCENTS[accent];
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("size-9 rounded-lg grid place-items-center", a.bg)}>
          <Icon className={cn("size-4.5", a.fg)} />
        </div>
        {trend && (
          <span className={cn(
            "text-[11px] font-medium px-1.5 py-0.5 rounded",
            trend.positive ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50" : "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/50"
          )}>
            {trend.positive ? "+" : "−"}{Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-[12px] text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/80 mt-1">{sub}</div>}
      {children}
    </div>
  );
}
