import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  /** Mini sparkline (nilai nyata, mis. dataset per domain). */
  spark?: number[];
  /** Tren ringkas. */
  trend?: { label: string; dir: "up" | "down" | "flat" };
}

const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1 h-8 mt-3" aria-hidden>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-accent/30"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          title={String(v)}
        />
      ))}
    </div>
  );
};

export const StatCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "bg-accent/10 text-accent",
  spark,
  trend,
}: StatCardProps) => {
  const TrendIcon = trend?.dir === "up" ? TrendingUp : trend?.dir === "down" ? TrendingDown : Minus;
  return (
    <div className="stat-card group animate-slide-up">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-110", iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight mt-2">{value}</p>

      {trend ? (
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded",
              trend.dir === "up" && "text-emerald-700 bg-emerald-50",
              trend.dir === "down" && "text-rose-700 bg-rose-50",
              trend.dir === "flat" && "text-slate-600 bg-slate-100",
            )}
          >
            <TrendIcon className="w-3 h-3" /> {trend.label}
          </span>
          {change && <span className="text-xs text-muted-foreground">{change}</span>}
        </div>
      ) : (
        change && (
          <p
            className={cn(
              "text-sm font-medium mt-1",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground",
            )}
          >
            {change}
          </p>
        )
      )}

      {spark && spark.length > 0 && <Sparkline data={spark} />}
    </div>
  );
};
