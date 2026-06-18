"use client";

import { cn } from "@/lib/utils";

interface Props {
  raised: number; // cents
  goal: number;   // cents
  className?: string;
  showLabel?: boolean;
}

export function FundraisingBar({ raised, goal, className, showLabel = true }: Props) {
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span className="font-mono">{pct.toFixed(1)}%</span>
          <span>
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(raised / 100)}
            </span>{" "}
            of {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(goal / 100)}
          </span>
        </div>
      )}
    </div>
  );
}
