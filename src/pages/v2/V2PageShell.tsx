// src/pages/v2/V2PageShell.tsx
// Shared shell for all V2 pages — provides consistent header, status badge, and layout

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

type Status = "Live API" | "Preview only" | "No backend contract";

const STATUS_STYLES: Record<Status, string> = {
  "Live API": "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  "Preview only": "border-amber-500/40 bg-amber-500/10 text-amber-400",
  "No backend contract": "border-slate-400/40 bg-slate-500/10 text-slate-400",
};

export interface V2PageProps {
  title: string;
  subtitle: string;
  status: Status;
  icon?: LucideIcon;
  children: ReactNode;
}

export const StatusBadge = ({ status }: { status: Status }) => (
  <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
    {status === "Live API" && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
    {status}
  </Badge>
);

export const V2PageShell = ({ title, subtitle, status, children }: V2PageProps) => (
  <div className="min-h-screen">
    <Header title={title} subtitle={subtitle} />
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
      </div>
      {children}
    </div>
  </div>
);

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) => (
  <div className={cn(
    "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5",
    className
  )}>
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {trend && (
      <div className="absolute bottom-0 left-0 h-0.5 w-full">
        <div className={cn(
          "h-full transition-all duration-500",
          trend === "up" && "w-3/4 bg-gradient-to-r from-emerald-500 to-emerald-500/0",
          trend === "down" && "w-1/2 bg-gradient-to-r from-red-500 to-red-500/0",
          trend === "neutral" && "w-2/3 bg-gradient-to-r from-blue-500 to-blue-500/0",
        )} />
      </div>
    )}
  </div>
);

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
    <div className="mb-4 rounded-full bg-muted/50 p-4">
      <Icon className="h-8 w-8 text-muted-foreground/60" />
    </div>
    <h3 className="mb-1 text-lg font-semibold">{title}</h3>
    <p className="mb-4 max-w-sm text-sm text-muted-foreground">{description}</p>
    {action}
  </div>
);

export const DataTable = ({
  headers,
  children,
  isLoading,
  emptyMessage = "No data available",
  emptyIcon,
}: {
  headers: string[];
  children: ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}) => (
  <div className="overflow-hidden rounded-xl border border-border/50">
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/50 bg-muted/30">
          {headers.map((h) => (
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {isLoading ? (
          <tr>
            <td colSpan={headers.length} className="px-4 py-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Loading data...</span>
              </div>
            </td>
          </tr>
        ) : children}
      </tbody>
    </table>
  </div>
);
