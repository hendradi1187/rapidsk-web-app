import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackendPendingBadgeProps {
  message?: string;
  className?: string;
  variant?: "inline" | "block";
}

/**
 * Visual indicator for UI features whose backend endpoint is not yet available.
 * The UI may still render forms/dialogs for design preview, but mutation
 * actions should be disabled or stubbed.
 */
export const BackendPendingBadge = ({
  message = "Backend belum tersedia",
  className,
  variant = "inline",
}: BackendPendingBadgeProps) => {
  if (variant === "block") {
    return (
      <div className={cn("flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3", className)}>
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
        <div className="text-xs">
          <p className="font-semibold text-amber-600 dark:text-amber-500">🚧 Backend Pending</p>
          <p className="mt-0.5 text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-500", className)}>
      <AlertTriangle className="h-3 w-3" />
      🚧 {message}
    </span>
  );
};
