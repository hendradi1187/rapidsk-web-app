import { useMemo, useState } from "react";
import { Layers, Network, Plus, Trash2, AlertTriangle } from "lucide-react";
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
import { useOrganizations } from "@/api/hooks/useOrganizations";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const getErrorDescription = (error: any) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item: any) => `${item.loc?.join(".") || item.field || "field"}: ${item.msg || item.message || "Invalid value"}`)
      .join(" | ");
  }
  return error?.message || "Unexpected error";
};

const DomainMapping = () => {
  const { hasPermission } = useAuth();
  const { data: participantsData, isLoading: loadingParticipants } = useParticipants({ limit: 100 });
  const { data: organizationsData } = useOrganizations({ limit: 100 });
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 1000 });
  const participants = (participantsData?.data ?? []).filter((participant) => participant.organization_type === "ENTERPRISE");
  const organizations = organizationsData?.data ?? [];
  const domains = domainsData?.data ?? [];

  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [mappingToDelete, setMappingToDelete] = useState<{ id: string; domain_id: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pageError, setPageError] = useState<{ title: string; detail: string } | null>(null);

  const participantId = selectedParticipantId;
  const selectedParticipant = participants.find((participant) => participant.id === participantId);
  const selectedParticipantOrganization = organizations.find(
    (organization) => organization.name.toLowerCase() === (selectedParticipant?.organization_name || "").toLowerCase()
  ) || null;
  const { data: mappingsData, isLoading: loadingMappings } = useParticipantDomains(participantId, { limit: 100 });
  const mappings = mappingsData?.data ?? [];

  const createMapping = useCreateParticipantDomain();
  const deleteMapping = useDeleteParticipantDomain();

  const mappedDomainIds = useMemo(() => new Set(mappings.map((mapping) => mapping.domain_id)), [mappings]);
  const scopedDomains = useMemo(() => {
    if (!selectedParticipantOrganization) return [];
    return domains.filter((domain) => domain.organization_id === selectedParticipantOrganization.id);
  }, [domains, selectedParticipantOrganization]);
  const availableDomains = useMemo(
    () => scopedDomains.filter((domain) => !mappedDomainIds.has(domain.id)),
    [scopedDomains, mappedDomainIds]
  );

  const handleCreateMapping = async () => {
    if (!participantId || !selectedDomainId) {
      const detail = "Participant dan domain wajib dipilih sebelum submit mapping.";
      setPageError({ title: "Validation Error", detail });
      toast.error("Select both participant and domain", { description: detail });
      return;
    }

    if (mappedDomainIds.has(selectedDomainId)) {
      const detail = "Domain ini sudah ter-mapping ke participant yang dipilih.";
      setPageError({ title: "Duplicate Mapping", detail });
      toast.error("Duplicate mapping", { description: detail });
      return;
    }

    try {
      setPageError(null);
      await createMapping.mutateAsync({
        participantId,
        data: { domain_id: selectedDomainId },
      });
      toast.success("Domain mapping created");
      setDialogOpen(false);
      setSelectedDomainId("");
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = getErrorDescription(error);
      setPageError({
        title: `Create mapping failed (HTTP ${status})`,
        detail,
      });
      toast.error("Failed to create mapping", {
        description: detail,
        duration: 8000,
      });
    }
  };

  const handleDeleteMapping = async () => {
    if (!participantId || !mappingToDelete) return;

    try {
      setPageError(null);
      await deleteMapping.mutateAsync({
        participantId,
        domainId: mappingToDelete.id,
      });
      toast.success("Domain mapping removed");
      setMappingToDelete(null);
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = getErrorDescription(error);
      setPageError({
        title: `Delete mapping failed (HTTP ${status})`,
        detail,
      });
      toast.error("Failed to remove mapping", {
        description: detail,
        duration: 8000,
      });
    }
  };

  return (
    <V2PageShell title="Domain Mapping" subtitle="Assign provider participants to governance domains. Super admin and consumer admin can use the same live mapping flow." status="Live API">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Network className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Participant Scope</p>
          <p className="text-xs text-muted-foreground">Pilih participant provider dulu secara manual. Domain yang bisa di-assign akan difilter dari organization governance participant itu.</p>
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

      {pageError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-medium">{pageError.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{pageError.detail}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Provider Participants" value={loadingParticipants ? "..." : participants.length} subtitle="ENTERPRISE (KKKS) only" icon={Network} trend="neutral" />
        <MetricCard title="Scoped Domains" value={loadingDomains ? "..." : scopedDomains.length} subtitle="Domains in participant organization" icon={Layers} trend="neutral" />
        <MetricCard
          title="Active Mappings"
          value={loadingMappings ? "..." : mappings.length}
          subtitle={selectedParticipant ? `For ${selectedParticipant.organization_name}` : "Select participant"}
          icon={Network}
          trend="up"
        />
      </div>
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 text-xs">
          <p className="font-medium">Mapping Context</p>
          <p className="mt-1 text-muted-foreground">
            Participant: <span className="font-mono">{selectedParticipant?.organization_name || "-"}</span> ({participantId || "no participant"}) ·
            mapping count: <span className="font-mono"> {loadingMappings ? "..." : mappings.length}</span>.
            Domain disaring dari organization participant: <span className="font-mono">{selectedParticipantOrganization?.name || "organization not found"}</span>.
          </p>
          {!participantId && (
            <p className="mt-2 text-amber-700">Belum ada participant terpilih. Tidak ada mapping yang dimuat sampai Anda memilih participant.</p>
          )}
          {participantId && !selectedParticipantOrganization && (
            <p className="mt-2 text-red-600">Organization participant belum ketemu di governance list. Domain assignment sengaja diblok supaya tidak salah assign.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Participant To Domain Mapping</CardTitle>
            <CardDescription>Live from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/participants/{"{id}"}/domains</code>. Tidak ada fallback participant otomatis, dan assign domain wajib scoped by organization.</CardDescription>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!hasPermission("mapping.manage") || !participantId || !selectedParticipantOrganization || availableDomains.length === 0}
            title={
              !hasPermission("mapping.manage") ? "Missing permission mapping.manage"
              : !participantId ? "Pick a participant from the dropdown above first"
              : !selectedParticipantOrganization ? "Participant organization belum ketemu di governance"
              : availableDomains.length === 0 ? "All domains are already mapped to this participant"
              : "Assign a domain to this participant"
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Domain
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Domain", "Participant", "Created", "Updated", "Status", "Actions"]} isLoading={loadingParticipants || loadingMappings}>
            {mappings.length > 0 ? (
              mappings.map((mapping) => {
                const domain = domains.find((entry) => entry.id === mapping.domain_id);
                return (
                  <tr key={mapping.id || mapping.domain_id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{domain?.name || mapping.domain_id}</p>
                        <p className="font-mono text-xs text-muted-foreground">{domain?.code || mapping.domain_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{selectedParticipant?.organization_name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{mapping.created_at ? new Date(mapping.created_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{mapping.updated_at ? new Date(mapping.updated_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="border-emerald-500/30 text-xs text-emerald-500">
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
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {participantId ? "No domains mapped yet. Assign scoped domain for this participant organization." : "Select a participant first."}
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
            <DialogDescription>Choose one unmapped domain for the selected participant. Kalau backend menolak, detail 403 atau validation error akan muncul langsung di halaman ini.</DialogDescription>
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
