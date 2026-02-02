import { Building2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const participants = [
  {
    id: 1,
    name: "PHE ONWJ",
    type: "Provider",
    role: "KKKS",
    datasets: 24,
    status: "active",
    avatar: "PO",
  },
  {
    id: 2,
    name: "Pertamina Hulu Energi",
    type: "Provider",
    role: "KKKS",
    datasets: 18,
    status: "active",
    avatar: "PE",
  },
  {
    id: 3,
    name: "SKK Migas",
    type: "Consumer",
    role: "Regulator",
    datasets: 0,
    status: "active",
    avatar: "SK",
  },
  {
    id: 4,
    name: "Medco E&P",
    type: "Provider",
    role: "KKKS",
    datasets: 12,
    status: "pending",
    avatar: "ME",
  },
];

export const ParticipantsList = () => {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Participants</h3>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {participants.map((participant, index) => (
          <div
            key={participant.id}
            className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {participant.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{participant.name}</p>
              <p className="text-sm text-muted-foreground">
                {participant.role} • {participant.type}
              </p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">{participant.datasets}</p>
              <p className="text-xs text-muted-foreground">datasets</p>
            </div>
            <Badge
              variant={participant.status === "active" ? "default" : "secondary"}
              className={
                participant.status === "active"
                  ? "badge-active"
                  : "badge-pending"
              }
            >
              {participant.status}
            </Badge>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
