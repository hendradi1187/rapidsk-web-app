import { Building2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParticipants } from "@/api/hooks/useParticipants";

const getAvatar = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const orgTypeLabel: Record<string, string> = {
  GOV_LOCAL: "Gov Local",
  GOV_PROV: "Gov Province",
  GOV_CENTRAL: "Gov Central",
  ENTERPRISE: "Enterprise",
};

export const ParticipantsList = () => {
  const { data: participantsData, isLoading } = useParticipants({ limit: 5 });
  const participants = participantsData?.data ?? [];

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Participants</h3>
          <Badge variant="outline">{participantsData?.total ?? 0} total</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </div>
      ) : participants.length === 0 ? (
        <div className="p-8 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No participants yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {getAvatar(participant.organization_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {participant.organization_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {orgTypeLabel[participant.organization_type] ??
                    participant.organization_type}
                </p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {participant.contact_person?.name}
                </p>
              </div>
              <Badge variant="default" className="badge-active">
                active
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
