import { useMemo, useState } from "react";
import { Layers, Network, Plus, Trash2 } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateParticipantDomain,
  useDeleteParticipantDomain,
  useParticipantDomains,
  useParticipants,
} from "@/api/hooks/useParticipants";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const DomainMapping = () => {
  const { hasPermission } = useAuth();
  const { data: participantsData, isLoading: loadingParticipants } = useParticipants({ limit: 100 });
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 1000 });
  const participants = (participantsData?.data ?? []).filter((p) => p.organization_type === "ENTERPRISE");
  const domains = domainsData?.data ?? [];

  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [mappingToDelete, setMappingToDelete] = useState<{ id: string; domain_id: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const participantId = selectedParticipantId || participants[0]?.id || "";
  const selectedParticipant = participants.find((participant) => participant.id === participantId);
  const { data: mappingsData, isLoading: loadingMappings } = useParticipantDomains(participantId, { limit: 100 });
  const mappings = mappingsData?.data ?? [];

  const createMapping = useCreateParticipantDomain();
  const deleteMapping = useDeleteParticipantDomain();

  const mappedDomainIds = useMemo(() => new Set(mappings.map((mapping) => mapping.domain_id)), [mappings]);
  const availableDomains = useMemo(
    () => domains.filter((domain) => !mappedDomainIds.has(domain.id)),
    [domains, mappedDomainIds]
  );

  const handleCreateMapping = async () => {
    if (!participantId || !selectedDomainId) {
      toast.error("Select both participant and domain");
      return;
    }

    try {
      await createMapping.mutateAsync({
        participantId,
        data: { domain_id: selectedDomainId },
      });
      toast.success("Domain mapping created");
      setDialogOpen(false);
      setSelectedDomainId("");
    } catch (error: any) {
      toast.error("Failed to create mapping", {
        description: error?.response?.data?.error || "Unexpected error",
      });
    }
  };

  const handleDeleteMapping = async () => {
    if (!participantId || !mappingToDelete) return;

    try {
      await deleteMapping.mutateAsync({
        participantId,
        domainId: mappingToDelete.id,
      });
      toast.success("Domain mapping removed");
      setMappingToDelete(null);
    } catch (error: any) {
      toast.error("Failed to remove mapping", {
        description: error?.response?.data?.error || "Unexpected error",
      });
    }
  };

  return (
    <V2PageShell title="Domain Mapping" subtitle="Assign providers to governance domains so transfer agreements can run in the right scope." status="Live API">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Network className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Participant Scope</p>
          <p className="text-xs text-muted-foreground">Choose a participant, assign domains, and manage live mapping records.</p>
        </div>
        <Select value={participantId} onValueChange={setSelectedParticipantId}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder={loadingParticipants ? "Loading..." : "Select participant"} />
          </SelectTrigger>
          <SelectContent>
            {participants.map((participant) => (
              <SelectItem key={participant.id} value={participant.id}>
                {participant.organization_name} ({participant.organization_type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Provider Participants" value={loadingParticipants ? "..." : participants.length} subtitle="ENTERPRISE (KKKS) only" icon={Network} trend="neutral" />
        <MetricCard title="Domains" value={loadingDomains ? "..." : domains.length} subtitle="Governance domains" icon={Layers} trend="neutral" />
        <MetricCard
          title="Active Mappings"
          value={loadingMappings ? "..." : mappings.length}
          subtitle={selectedParticipant ? `For ${selectedParticipant.organization_name}` : "Select participant"}
          icon={Network}
          trend="up"
        />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Participant To Domain Mapping</CardTitle>
            <CardDescription>Live from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/participants/{"{id}"}/domains</code></CardDescription>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!hasPermission("mapping.manage") || !participantId || availableDomains.length === 0}
            title={
              !hasPermission("mapping.manage") ? "Missing permission mapping.manage"
              : !participantId ? "Pick a participant from the dropdown above first"
              : availableDomains.length === 0 ? "All domains are already mapped to this participant. Create a new domain in Master Data, or pick a different participant."
              : "Assign a domain to this participant"
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Domain
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Domain", "Participant", "Assigned", "Status", "Actions"]} isLoading={loadingParticipants || loadingMappings}>
            {mappings.length > 0 ? (
              mappings.map((mapping) => {
                const domain = domains.find((entry) => entry.id === mapping.domain_id);
                return (
                  <tr key={mapping.id || mapping.domain_id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{domain?.name || mapping.domain_id}</p>
                        <p className="text-xs text-muted-foreground font-mono">{domain?.code || mapping.domain_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{selectedParticipant?.organization_name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(mapping.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-xs">
                        {mapping.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!hasPermission("mapping.manage")}
                        onClick={() => setMappingToDelete({ id: mapping.id || mapping.domain_id, domain_id: mapping.domain_id })}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {participantId ? "No domains mapped yet. Assign the first one to enable provider onboarding." : "Select a participant first."}
                </td>
              </tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Domain</DialogTitle>
            <DialogDescription>Choose one unmapped domain for the selected participant. This opens the path for provider onboarding and transfer activity in that scope.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
              <p className="text-sm font-medium">{selectedParticipant?.organization_name || "No participant selected"}</p>
              <p className="text-xs text-muted-foreground">{selectedParticipant?.organization_type || "-"}</p>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Available Domain</p>
              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select domain to assign" />
                </SelectTrigger>
                <SelectContent>
                  {availableDomains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name} ({domain.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMapping} disabled={createMapping.isPending || !selectedDomainId}>
              {createMapping.isPending ? "Assigning..." : "Assign Domain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!mappingToDelete} onOpenChange={(open) => !open && setMappingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain Mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the participant access scope for <strong>{mappingToDelete?.domain_id || "the selected domain"}</strong>. Provider-side assigned domain and transfer access will disappear after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMapping} className="bg-destructive">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default DomainMapping;
