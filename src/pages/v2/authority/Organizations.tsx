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
import {
  useParticipants,
  useCreateParticipant,
  useUpdateParticipant,
  useDeleteParticipant,
} from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const emptyOrgForm = { name: "", code: "", description: "" };
const emptyDomainForm = { name: "", code: "", description: "" };
const emptyParticipantForm = {
  governance_organization_id: "",
  organization_type: "ENTERPRISE",
  address: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

const Organizations = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("participants.manage") || hasPermission("users.manage");

  const { data: orgsData, isLoading: loadingOrgs } = useOrganizations({ limit: 100 });
  const { data: participantsData, isLoading: loadingParts } = useParticipants({ limit: 100 });
  const orgs = orgsData?.data ?? [];
  const participants = participantsData?.data ?? [];

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const focusedOrgId = selectedOrgId || orgs[0]?.id || "";
  const { data: domainsData, isLoading: loadingDomains } = useDomains(focusedOrgId, { limit: 100 });
  const domains = domainsData?.data ?? [];

  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const deleteOrg = useDeleteOrganization();
  const createDomain = useCreateDomain();
  const deleteDomain = useDeleteDomain();
  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();

  const [orgDialog, setOrgDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [orgForm, setOrgForm] = useState(emptyOrgForm);
  const [orgDelete, setOrgDelete] = useState<any | null>(null);

  const [domainDialog, setDomainDialog] = useState(false);
  const [domainForm, setDomainForm] = useState(emptyDomainForm);
  const [domainDelete, setDomainDelete] = useState<any | null>(null);

  const [participantDialog, setParticipantDialog] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<any | null>(null);
  const [participantForm, setParticipantForm] = useState(emptyParticipantForm);
  const [participantDelete, setParticipantDelete] = useState<any | null>(null);

  const stats = useMemo(
    () => ({
      orgCount: orgs.length,
      domainCount: domains.length,
      participantCount: participants.length,
      providerCount: participants.filter((p) => p.organization_type === "ENTERPRISE").length,
      consumerCount: participants.filter((p) => p.organization_type !== "ENTERPRISE").length,
    }),
    [orgs, domains, participants]
  );

  const focusedOrg = orgs.find((o) => o.id === focusedOrgId);
  const orgByName = useMemo(() => {
    const map = new Map<string, any>();
    orgs.forEach((org: any) => map.set((org.name || "").toLowerCase(), org));
    return map;
  }, [orgs]);

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

  const openParticipant = (participant?: any) => {
    if (participant) {
      const linkedOrg = orgByName.get((participant.organization_name || "").toLowerCase());
      setEditingParticipant(participant);
      setParticipantForm({
        governance_organization_id: linkedOrg?.id || "",
        organization_type: participant.organization_type || "ENTERPRISE",
        address: participant.address || "",
        contact_name: participant.contact_person?.name || "",
        contact_email: participant.contact_person?.email || "",
        contact_phone: participant.contact_person?.phone || "",
      });
    } else {
      setEditingParticipant(null);
      setParticipantForm(emptyParticipantForm);
    }
    setParticipantDialog(true);
  };

  const submitOrg = async () => {
    if (!orgForm.name || !orgForm.code) {
      toast.error("Name and code are required");
      return;
    }
    try {
      if (editingOrg) {
        await updateOrg.mutateAsync({
          id: editingOrg.id,
          data: { name: orgForm.name, description: orgForm.description || null },
        });
        toast.success("Organization updated");
      } else {
        await createOrg.mutateAsync({
          name: orgForm.name,
          code: orgForm.code,
          description: orgForm.description,
        });
        toast.success("Organization created");
      }
      setOrgDialog(false);
    } catch (err: any) {
      toast.error("Save failed", { description: err?.response?.data?.detail || err?.message });
    }
  };

  const submitDomain = async () => {
    if (!focusedOrgId) {
      toast.error("Select organization first");
      return;
    }
    if (!domainForm.name || !domainForm.code) {
      toast.error("Name and code are required");
      return;
    }
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

  const submitParticipant = async () => {
    const linkedOrg = orgs.find((org: any) => org.id === participantForm.governance_organization_id);
    if (!linkedOrg) {
      toast.error("Select governance organization first");
      return;
    }
    if (!participantForm.address || participantForm.address.length < 10) {
      toast.error("Address must be at least 10 characters");
      return;
    }
    if (!participantForm.contact_name || !participantForm.contact_email || !participantForm.contact_phone) {
      toast.error("Contact person must be complete");
      return;
    }

    const payload = {
      organization_name: linkedOrg.name,
      organization_type: participantForm.organization_type as any,
      address: participantForm.address,
      contact_person: {
        name: participantForm.contact_name,
        email: participantForm.contact_email,
        phone: participantForm.contact_phone,
      },
    };

    try {
      if (editingParticipant) {
        await updateParticipant.mutateAsync({ id: editingParticipant.id, data: payload });
        toast.success("Participant updated");
      } else {
        await createParticipant.mutateAsync(payload);
        toast.success("Participant created");
      }
      setParticipantDialog(false);
      setEditingParticipant(null);
      setParticipantForm(emptyParticipantForm);
    } catch (err: any) {
      toast.error("Save participant failed", { description: err?.response?.data?.detail || err?.message });
    }
  };

  return (
    <V2PageShell
      title="Org Structure"
      subtitle="Manage Governance Organization, Domains, and Participants in one module."
      status="Live API"
    >
      <Card className="border-border/50 bg-blue-500/5">
        <CardContent className="p-4 text-xs space-y-1.5">
          <p className="text-sm font-semibold">Structure:</p>
          <p><strong>Governance Organization</strong> as umbrella from <code className="rounded bg-muted px-1">/governance/organizations/</code></p>
          <p><strong>Domain</strong> under organization from <code className="rounded bg-muted px-1">/governance/organizations/{`{org_id}`}/domains</code></p>
          <p><strong>Participant</strong> as actor from <code className="rounded bg-muted px-1">/onboarding/participants</code></p>
          <p className="text-muted-foreground pt-1">Participant is linked to governance organization by selected organization name.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Governance Orgs" value={loadingOrgs ? "..." : stats.orgCount} subtitle="Umbrella entities" icon={Building2} trend="neutral" />
        <MetricCard title="Domains (focused)" value={loadingDomains ? "..." : stats.domainCount} subtitle={focusedOrg ? `In ${focusedOrg.name}` : "-"} icon={Layers} trend="neutral" />
        <MetricCard title="All Participants" value={loadingParts ? "..." : stats.participantCount} subtitle="Operational actors" icon={Users2} trend="up" />
        <MetricCard title="Providers" value={loadingParts ? "..." : stats.providerCount} subtitle="ENTERPRISE type" icon={Network} trend="up" />
        <MetricCard title="Consumers" value={loadingParts ? "..." : stats.consumerCount} subtitle="GOV_* type" icon={Network} trend="up" />
      </div>

      <Tabs defaultValue="orgs">
        <TabsList>
          <TabsTrigger value="orgs">Governance Organizations</TabsTrigger>
          <TabsTrigger value="domains">Domains (per org)</TabsTrigger>
          <TabsTrigger value="participants">Participants (active)</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Governance Organizations</CardTitle>
                <CardDescription>Top level umbrella entities.</CardDescription>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-md truncate">{o.description || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</td>
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
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No organizations yet.</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Domains in {focusedOrg?.name || "-"}</CardTitle>
                <CardDescription>Domains are scoped per governance organization.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={focusedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Select organization" /></SelectTrigger>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManage} onClick={() => setDomainDelete(d)}>
                        <Trash2 className="h-3 w-3" />Delete
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{focusedOrgId ? "No domains in this organization yet." : "Select organization first."}</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Participants</CardTitle>
                <CardDescription>Participant can be created and managed here. Governance link is visible per row.</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled={!canManage} onClick={() => openParticipant()}>
                <Plus className="h-4 w-4" />New Participant
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Participant Name", "Governance Link", "Type", "Contact", "Email", "Created", "Actions"]} isLoading={loadingParts}>
                {participants.length > 0 ? participants.map((p: any) => {
                  const linkedOrg = orgByName.get((p.organization_name || "").toLowerCase());
                  return (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{p.organization_name}</td>
                      <td className="px-4 py-3 text-xs">
                        {linkedOrg ? (
                          <Badge variant="outline" className="text-[10px]">{linkedOrg.name} ({linkedOrg.code})</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[10px]">Not linked</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${p.organization_type === "ENTERPRISE" ? "border-violet-500/40 text-violet-500" : "border-blue-500/40 text-blue-500"}`}>
                          {p.organization_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{p.contact_person?.name || "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.contact_person?.email || "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1" disabled={!canManage} onClick={() => openParticipant(p)}>
                            <Pencil className="h-3 w-3" />Edit
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManage} onClick={() => setParticipantDelete(p)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No participants yet.</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={orgDialog} onOpenChange={setOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? `Edit Organization - ${editingOrg.name}` : "New Governance Organization"}</DialogTitle>
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

      <Dialog open={domainDialog} onOpenChange={setDomainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Domain in {focusedOrg?.name || "-"}</DialogTitle>
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

      <Dialog open={participantDialog} onOpenChange={setParticipantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParticipant ? `Edit Participant - ${editingParticipant.organization_name}` : "New Participant"}</DialogTitle>
            <DialogDescription>
              {editingParticipant ? "PATCH /onboarding/participants/{id}" : "POST /onboarding/participants"} with governance link.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Governance Organization *</Label>
              <Select value={participantForm.governance_organization_id} onValueChange={(value) => setParticipantForm({ ...participantForm, governance_organization_id: value })}>
                <SelectTrigger><SelectValue placeholder="Select governance organization" /></SelectTrigger>
                <SelectContent>
                  {orgs.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>{org.name} ({org.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Participant Type *</Label>
              <Select value={participantForm.organization_type} onValueChange={(value) => setParticipantForm({ ...participantForm, organization_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOV_LOCAL">GOV_LOCAL</SelectItem>
                  <SelectItem value="GOV_PROV">GOV_PROV</SelectItem>
                  <SelectItem value="GOV_CENTRAL">GOV_CENTRAL</SelectItem>
                  <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Address *</Label>
              <Input value={participantForm.address} onChange={(e) => setParticipantForm({ ...participantForm, address: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Contact Name *</Label>
              <Input value={participantForm.contact_name} onChange={(e) => setParticipantForm({ ...participantForm, contact_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Contact Email *</Label>
              <Input type="email" value={participantForm.contact_email} onChange={(e) => setParticipantForm({ ...participantForm, contact_email: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Contact Phone *</Label>
              <Input value={participantForm.contact_phone} onChange={(e) => setParticipantForm({ ...participantForm, contact_phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParticipantDialog(false)}>Cancel</Button>
            <Button onClick={submitParticipant} disabled={createParticipant.isPending || updateParticipant.isPending}>
              {editingParticipant ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orgDelete} onOpenChange={(o) => !o && setOrgDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{orgDelete?.name}</strong> will be deleted. Domains under it can be affected.
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

      <AlertDialog open={!!domainDelete} onOpenChange={(o) => !o && setDomainDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{domainDelete?.name}</strong> will be deleted from <strong>{focusedOrg?.name}</strong>.
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

      <AlertDialog open={!!participantDelete} onOpenChange={(o) => !o && setParticipantDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{participantDelete?.organization_name}</strong> will be deleted. Backend can reject if still in use (HTTP 409).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!participantDelete) return;
                try {
                  await deleteParticipant.mutateAsync(participantDelete.id);
                  toast.success("Participant deleted");
                  setParticipantDelete(null);
                } catch (err: any) {
                  toast.error("Delete participant failed", { description: err?.response?.data?.detail || err?.message });
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
