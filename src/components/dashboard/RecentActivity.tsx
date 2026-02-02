import { Database, FileText, ArrowRightLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "dataset",
    title: "Dataset Registered",
    description: "Well Production Q4 2025 added by PHE ONWJ",
    time: "2 minutes ago",
    icon: Database,
    iconBg: "bg-info/10 text-info",
  },
  {
    id: 2,
    type: "contract",
    title: "Contract Approved",
    description: "SKK Migas approved lifting data access",
    time: "15 minutes ago",
    icon: FileText,
    iconBg: "bg-success/10 text-success",
  },
  {
    id: 3,
    type: "transfer",
    title: "Data Transfer Complete",
    description: "Monthly report sent to SKK Migas",
    time: "1 hour ago",
    icon: ArrowRightLeft,
    iconBg: "bg-accent/10 text-accent",
  },
  {
    id: 4,
    type: "compliance",
    title: "Compliance Check Passed",
    description: "ISO 27001 audit completed successfully",
    time: "3 hours ago",
    icon: Shield,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
];

export const RecentActivity = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <button className="text-sm text-accent hover:underline">View all</button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={cn("p-2 rounded-lg flex-shrink-0", activity.iconBg)}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{activity.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {activity.description}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
