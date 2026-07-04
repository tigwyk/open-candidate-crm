import { Vote } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm",
        className
      )}
    >
      <Vote className="size-1/2" />
    </div>
  );
}
