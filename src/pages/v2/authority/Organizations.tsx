// src/pages/v2/authority/Organizations.tsx
// Unified org-structure view. Backend pisahin 3 entitas:
//   1. Governance Organization  → /governance/organizations/  (umbrella legal entity, sedikit)
//   2. Domain                   → /governance/organizations/{org}/domains  (per umbrella)
//   3. Participant              → /onboarding/participants  (operational actors, banyak)
// Page ini nampilin ketiganya di satu layar biar gak bingung.

import { useMemo, useState } from "react";
import { Building2, Plus, Pencil, Trash2, Layers, Users2, Network } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useDomains,
  useCreateDomain,
  useDeleteDomain,
} from "@/api/hooks/useOrganizations";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const emptyOrgForm = { name: "", code: "", description: "" };
const emptyDomainForm = { name: "", code: "", description: "" };

const Organizations = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("participants.manage") || hasPermission("users.manage");

  // Live data — 3 sources
  const { data: orgsData, isLoading: loadingOrgs } = useOrganizations({ limit: 100 });
  const { data: participantsData, isLoading: loadingParts } = useParticipants({ limit: 100 });
  const orgs = orgsData?.data ?? [];
  const participants = participantsData?.data ?? [];

  // Selected org for domain detail
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const focusedOrgId = selectedOrgId || orgs[0]?.id || "";
  const { data: domainsData, isLoading: loadingDomains } = useDomains(focusedOrgId, { limit: 100 });
  const domains = domainsData?.data ?? [];

  // Mutations
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const deleteOrg = useDeleteOrganization();
  const createDomain = useCreateDomain();
  const deleteDomain = useDeleteDomain();

  // Org dialog
  const [orgDialog, setOrgDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [orgForm, setOrgForm] = useState(emptyOrgForm);
  const [orgDelete, setOrgDelete] = useState<any | null>(null);

  // Domain dialog
  const [domainDialog, setDomainDialog] = useState(false);
  const [domainForm, setDomainForm] = useState(emptyDomainForm);
  const [domainDelete, setDomainDelete] = useState<any | null>(null);

  const openOrg = (o?: any) => {
    if (o) {
      setEditingOrg(o);
      setOrgForm({ name: o.name || "", code: o.code || "", description: o.description || "" });
    } else {
      setEditingOrg(null);
      setOrgForm(emptyOrgForm);
    }
    setOrgDialog(true);
  };

  const submitOrg = async () => {
    if (!orgForm.name || !orgForm.code) { toast.error("Name & code wajib"); return; }
    try {
      if (editingOrg) {
        await updateOrg.mutateAsync({ id: editingOrg.id, data: { name: orgForm.name, description: orgForm.description || null } });
        toast.success("Organization updated");
      } else {
        await createOrg.mutateAsync({ name: orgForm.name, code: orgForm.code, description: orgForm.description });
        toast.success("Organization created");
      }
      setOrgDialog(false);
    } catch (err: any) {
      toast.error("Save failed", { description: err?.response?.data?.detail || err?.message });
    }
  };

  const submitDomain = async () => {
    if (!focusedOrgId) { toast.error("Pilih organization dulu"); return; }
    if (!domainForm.name || !domainForm.code) { toast.error("Name & code wajib"); return; }
    try {
      await createDomain.mutateAsync({
        organizationId: focusedOrgId,
        data: { name: domainForm.name, code: domainForm.code, description: domainForm.description },
      });
      toast.success("Domain created");
      setDomainDialog(false);
      setDomainForm(emptyDomainForm);
    } catch (err: any) {
      toast.error("Create domain failed", { description: err?.response?.data?.detail || err?.message });
    }
  };

  const stats = useMemo(() => {
    return {
      orgCount: orgs.length,
      domainCount: domains.length,
      participantCount: participants.length,
      providerCount: participants.filter((p) => p.organization_type === "ENTERPRISE").length,
      consumerCount: participants.filter((p) => p.organization_type !== "ENTERPRISE").length,
    };
  }, [orgs, domains, participants]);

  const focusedOrg = orgs.find((o) => o.id === focusedOrgId);

  return (
    <V2PageShell
      title="Org Structure"
      subtitle="3 layer: Governance Organization (umbrella) → Domain (governance scope) → Participant (operational actor). Backend pisahin endpoint-nya — page ini gabungkan view-nya."
      status="Live API"
    >
      <Card className="border-border/50 bg-blue-500/5">
        <CardContent className="p-4 text-xs space-y-1.5">
          <p className="text-sm font-semibold">Konsep yang sering ke-conflate:</p>
          <p>📦 <strong>Governance Organization</strong> — entitas governance umbrella (1-2 record, e.g. "GX-Space Indonesia"). Endpoint: <code className="rounded bg-muted px-1">/governance/organizations/</code></p>
          <p>🌐 <strong>Domain</strong> — scope governance di bawah org (e.g. "Production", "Wells"). Endpoint: <code className="rounded bg-muted px-1">/governance/organizations/{`{org_id}`}/domains</code></p>
          <p>👥 <strong>Participant</strong> — operational actor yg ikut transfer data (banyak: SKK Migas, KKKS A, KKKS B). Endpoint: <code className="rounded bg-muted px-1">/onboarding/participants</code></p>
          <p className="text-muted-foreground pt-1">⚠️ Participant TIDAK FK ke Organization. Mereka standalone, di-link via Domain mapping.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Governance Orgs" value={loadingOrgs ? "..." : stats.orgCount} subtitle="Umbrella entities" icon={Building2} trend="neutral" />
        <MetricCard title="Domains (focused)" value={loadingDomains ? "..." : stats.domainCount} subtitle={focusedOrg ? `In ${focusedOrg.name}` : "—"} icon={Layers} trend="neutral" />
        <MetricCard title="All Participants" value={loadingParts ? "..." : stats.participantCount} subtitle="Operational actors" icon={Users2} trend="up" />
        <MetricCard title="Providers (KKKS)" value={loadingParts ? "..." : stats.providerCount} subtitle="ENTERPRISE type" icon={Network} trend="up" />
        <MetricCard title="Consumers (Gov)" value={loadingParts ? "..." : stats.consumerCount} subtitle="GOV_* type" icon={Network} trend="up" />
      </div>

      <Tabs defaultValue="orgs">
        <TabsList>
          <TabsTrigger value="orgs">Governance Organizations</TabsTrigger>
          <TabsTrigger value="domains">Domains (per org)</TabsTrigger>
          <TabsTrigger value="participants">Participants (all)</TabsTrigger>
        </TabsList>

        {/* ── Governance Organizations ──────────────────────────────────── */}
        <TabsContent value="orgs">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Governance Organizations</CardTitle>
                <CardDescription>Top-level umbrella entity. Biasanya cuma 1-2 record.</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled={!canManage} onClick={() => openOrg()}>
                <Plus className="h-4 w-4" />New Organization
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Code", "Description", "Created", "Actions"]} isLoading={loadingOrgs}>
                {orgs.length > 0 ? orgs.map((o: any) => (
                  <tr key={o.id} className={`hover:bg-muted/20 cursor-pointer ${o.id === focusedOrgId ? "bg-muted/30" : ""}`} onClick={() => setSelectedOrgId(o.id)}>
                    <td className="px-4 py-3 text-sm font-medium">{o.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{o.code}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-md truncate">{o.description || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManage} onClick={() => openOrg(o)}>
                          <Pencil className="h-3 w-3" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManage} onClick={() => setOrgDelete(o)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No organizations. Click "New Organization" to create the first umbrella entity.</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Domains per org ───────────────────────────────────────────── */}
        <TabsContent value="domains">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Domains in {focusedOrg?.name || "—"}</CardTitle>
                <CardDescription>Domain di-scope per organization. Pilih org dulu di tab Organizations atau dropdown bawah.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={focusedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Pilih organization" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o: any) => (<SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="gap-2" disabled={!canManage || !focusedOrgId} onClick={() => setDomainDialog(true)}>
                  <Plus className="h-4 w-4" />New Domain
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Code", "Status", "Created", "Actions"]} isLoading={loadingDomains}>
                {domains.length > 0 ? domains.map((d: any) => (
                  <tr key={d.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{d.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{d.code}</Badge></td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{d.status || "ACTIVE"}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManage} onClick={() => setDomainDelete(d)}>
                        <Trash2 className="h-3 w-3" />Delete
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{focusedOrgId ? "No domains in this organization yet." : "Pilih organization dulu."}</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── All Participants ──────────────────────────────────────────── */}
        <TabsContent value="participants">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">All Participants (operational actors)</CardTitle>
              <CardDescription>SKK Migas, KKKS, dll. Manage di <code className="rounded bg-muted px-1 text-xs">/v2/admin-consumer/admin-provider</code> untuk register baru.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Organization Name", "Type", "Contact", "Email", "Created"]} isLoading={loadingParts}>
                {participants.length > 0 ? participants.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{p.organization_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${p.organization_type === "ENTERPRISE" ? "border-violet-500/40 text-violet-500" : "border-blue-500/40 text-blue-500"}`}>
                        {p.organization_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{p.contact_person?.name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.contact_person?.email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No participants yet.</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Org dialog */}
      <Dialog open={orgDialog} onOpenChange={setOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? `Edit Organization — ${editingOrg.name}` : "New Governance Organization"}</DialogTitle>
            <DialogDescription>{editingOrg ? "PATCH /governance/organizations/{id}" : "POST /governance/organizations/"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Code * <span className="text-muted-foreground">(immutable after create)</span></Label>
              <Input value={orgForm.code} onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value.toUpperCase() })} disabled={!!editingOrg} placeholder="GXSPACE_ID" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={orgForm.description} onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialog(false)}>Cancel</Button>
            <Button onClick={submitOrg} disabled={createOrg.isPending || updateOrg.isPending}>{editingOrg ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Domain dialog */}
      <Dialog open={domainDialog} onOpenChange={setDomainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Domain in {focusedOrg?.name || "—"}</DialogTitle>
            <DialogDescription>POST /governance/organizations/{`{org_id}`}/domains</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Domain Name *</Label>
              <Input value={domainForm.name} onChange={(e) => setDomainForm({ ...domainForm, name: e.target.value })} placeholder="Production Wells" />
            </div>
            <div className="grid gap-2">
              <Label>Code *</Label>
              <Input value={domainForm.code} onChange={(e) => setDomainForm({ ...domainForm, code: e.target.value.toUpperCase() })} placeholder="PROD_WELLS" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={domainForm.description} onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDomainDialog(false)}>Cancel</Button>
            <Button onClick={submitDomain} disabled={createDomain.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Org delete confirm */}
      <AlertDialog open={!!orgDelete} onOpenChange={(o) => !o && setOrgDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{orgDelete?.name}</strong> akan dihapus. Domain di bawah organization ini juga akan ikut hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!orgDelete) return;
                try {
                  await deleteOrg.mutateAsync(orgDelete.id);
                  toast.success("Organization deleted");
                  setOrgDelete(null);
                } catch (err: any) {
                  toast.error("Delete failed", { description: err?.response?.data?.detail || err?.message });
                }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Domain delete confirm */}
      <AlertDialog open={!!domainDelete} onOpenChange={(o) => !o && setDomainDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{domainDelete?.name}</strong> akan dihapus dari org <strong>{focusedOrg?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!domainDelete || !focusedOrgId) return;
                try {
                  await deleteDomain.mutateAsync({ organizationId: focusedOrgId, id: domainDelete.id });
                  toast.success("Domain deleted");
                  setDomainDelete(null);
                } catch (err: any) {
                  toast.error("Delete failed", { description: err?.response?.data?.detail || err?.message });
                }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default Organizations;
