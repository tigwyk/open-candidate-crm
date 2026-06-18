"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

interface Props {
  first?: string;
  last?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  colorSeed?: string;
}

// Deterministic palette based on name hash — consistent avatar colors
const PALETTE = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
];

export function PersonAvatar({ first, last, size = "md", className, colorSeed }: Props) {
  const sizeCls = size === "sm" ? "size-7 text-[11px]" : size === "lg" ? "size-12 text-base" : "size-9 text-xs";
  const seed = colorSeed ?? `${first ?? ""}${last ?? ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const palette = PALETTE[hash % PALETTE.length];
  return (
    <Avatar className={cn(sizeCls, "font-medium border", palette, className)}>
      <AvatarFallback className={cn("bg-transparent", palette)}>
        {initials(first, last)}
      </AvatarFallback>
    </Avatar>
  );
}
