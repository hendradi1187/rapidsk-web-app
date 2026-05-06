import { useMemo, useState } from "react";
import { Network, Activity, Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants } from "@/api/hooks/useParticipants";
import {
  useConnectionPools,
  useCreateConnectionPool,
  useDeleteConnectionPool,
  useUpdateConnectionPool,
} from "@/api/hooks/useConnectionPools";
import {
  useCreateMonitoring,
  useDeleteMonitoring,
  useMonitorings,
  useUpdateMonitoring,
} from "@/api/hooks/useMonitorings";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const emptyPoolForm = {
  participant_id: "",
  name: "",
  type: "CONSUMER",
  token: "",
  url_consumer: "",
  url_provider: "",
};

const emptyMonitoringForm = {
  participant_id: "",
  retention: "30",
  email: "",
  realtime: true,
  logEnabled: true,
  compliance: "SKK MIGAS",
};

const SystemSetup = () => {
  const { hasPermission } = useAuth();
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 50 });
  const { data: participantsData } = useParticipants({ limit: 100 });
  const domains = domainsData?.data ?? [];
  const participants = participantsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: poolsData, isLoading: loadingPools } = useConnectionPools({ limit: 50 });
  const { data: monitoringsData, isLoading: loadingMonitorings } = useMonitorings(domainId, { limit: 50 });

  const createPool = useCreateConnectionPool();
  const updatePool = useUpdateConnectionPool();
  const deletePool = useDeleteConnectionPool();
  const createMonitoring = useCreateMonitoring();
  const updateMonitoring = useUpdateMonitoring();
  const deleteMonitoring = useDeleteMonitoring();

  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false);
  const [poolDeleteTarget, setPoolDeleteTarget] = useState<any | null>(null);
  const [monitoringDeleteTarget, setMonitoringDeleteTarget] = useState<any | null>(null);
  const [editingPool, setEditingPool] = useState<any | null>(null);
  const [editingMonitoring, setEditingMonitoring] = useState<any | null>(null);
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [monitoringForm, setMonitoringForm] = useState(emptyMonitoringForm);

  const pools = poolsData?.data ?? [];
  const monitorings = monitoringsData?.data ?? [];
  const scopedParticipants = useMemo(
    () => participants.filter((participant) => participant.organization_type !== "ENTERPRISE"),
    [participants]
  );

  const resetPoolForm = () => {
    setEditingPool(null);
    setPoolForm(emptyPoolForm);
  };

  const resetMonitoringForm = () => {
    setEditingMonitoring(null);
    setMonitoringForm(emptyMonitoringForm);
  };

  const handleSavePool = () => {
    if (!poolForm.participant_id || !poolForm.name || !poolForm.token || !poolForm.url_consumer || !poolForm.url_provider) {
      toast.error("Participant, name, token, consumer URL, and provider URL are required");
      return;
    }

    const payload = {
      participant_id: poolForm.participant_id,
      name: poolForm.name,
      type: poolForm.type as "CONSUMER" | "PROVIDER",
      token: poolForm.token,
      metadata: {
        url_consumer: poolForm.url_consumer,
        url_provider: poolForm.url_provider,
      },
    };

    if (editingPool) {
      updatePool.mutate(
        {
          id: editingPool.id,
          data: {
            name: payload.name,
            type: payload.type,
            token: payload.token,
            metadata: payload.metadata,
          },
        },
        {
          onSuccess: () => {
            setPoolDialogOpen(false);
            resetPoolForm();
          },
        }
      );
      return;
    }

    createPool.mutate(payload, {
      onSuccess: () => {
        setPoolDialogOpen(false);
        resetPoolForm();
      },
    });
  };

  const handleSaveMonitoring = () => {
    if (!domainId || !monitoringForm.participant_id || !monitoringForm.email) {
      toast.error("Domain, participant, and notification email are required");
      return;
    }

    const payload = {
      participant_id: monitoringForm.participant_id,
      log: {
        enabled: monitoringForm.logEnabled,
        retention: Number(monitoringForm.retention || 0),
      },
      compliance: monitoringForm.compliance.split(",").map((entry) => entry.trim()).filter(Boolean),
      notification: {
        email: monitoringForm.email,
        realtime: monitoringForm.realtime,
      },
    };

    if (editingMonitoring) {
      updateMonitoring.mutate(
        {
          domainId,
          id: editingMonitoring.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setMonitoringDialogOpen(false);
            resetMonitoringForm();
          },
        }
      );
      return;
    }

    createMonitoring.mutate(
      { domainId, data: payload },
      {
        onSuccess: () => {
          setMonitoringDialogOpen(false);
          resetMonitoringForm();
        },
      }
    );
  };

  const openEditPool = (pool: any) => {
    setEditingPool(pool);
    setPoolForm({
      participant_id: pool.participant_id,
      name: pool.name || "",
      type: pool.type || "CONSUMER",
      token: pool.token || "",
      url_consumer: pool.metadata?.url_consumer || "",
      url_provider: pool.metadata?.url_provider || "",
    });
    setPoolDialogOpen(true);
  };

  const openEditMonitoring = (monitoring: any) => {
    setEditingMonitoring(monitoring);
    setMonitoringForm({
      participant_id: monitoring.participant_id,
      retention: String(monitoring.log?.retention || 30),
      email: monitoring.notification?.email || "",
      realtime: Boolean(monitoring.notification?.realtime),
      logEnabled: Boolean(monitoring.log?.enabled),
      compliance: Array.isArray(monitoring.compliance) ? monitoring.compliance.join(", ") : "",
    });
    setMonitoringDialogOpen(true);
  };

  return (
    <V2PageShell title="System Setup" subtitle="Connection pools and monitoring are now actionable, not just visible." status="Live API">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Monitoring remains domain-scoped. Connection pools stay global under onboarding.</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder={loadingDomains ? "Loading..." : "Select domain"} /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain.id} value={domain.id}>
                {domain.name} ({domain.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Connection Pools" value={loadingPools ? "..." : pools.length} subtitle="Participant connectivity" icon={Network} trend="neutral" />
        <MetricCard title="Monitoring Configs" value={loadingMonitorings ? "..." : monitorings.length} subtitle="Audit & compliance monitoring" icon={Activity} trend="neutral" />
      </div>

      <Tabs defaultValue="pools">
        <TabsList>
          <TabsTrigger value="pools">Connection Pools</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="pools">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Connection Pools</CardTitle>
                <CardDescription>Create, update, or remove participant connection configurations.</CardDescription>
              </div>
              <Button onClick={() => setPoolDialogOpen(true)} disabled={!hasPermission("monitoring.manage")} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Pool
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Type", "Participant ID", "Token", "Created", "Actions"]} isLoading={loadingPools}>
                {pools.length > 0 ? pools.map((pool: any) => (
                  <tr key={pool.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{pool.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${pool.type === "CONSUMER" ? "border-blue-500/30 text-blue-500" : "border-violet-500/30 text-violet-500"}`}>{pool.type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{pool.participant_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{pool.token?.slice(0, 12)}...</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(pool.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2" disabled={!hasPermission("monitoring.manage")} onClick={() => openEditPool(pool)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive" disabled={!hasPermission("monitoring.manage")} onClick={() => setPoolDeleteTarget(pool)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No connection pools configured</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Monitoring Configuration</CardTitle>
                <CardDescription>Create, update, and remove audit logging, compliance, and notification settings.</CardDescription>
              </div>
              <Button onClick={() => setMonitoringDialogOpen(true)} disabled={!hasPermission("monitoring.manage") || !domainId} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Monitoring
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Participant", "Log Enabled", "Retention", "Compliance", "Realtime Alerts", "Email", "Actions"]} isLoading={!domainId || loadingMonitorings}>
                {monitorings.length > 0 ? monitorings.map((monitoring: any) => (
                  <tr key={monitoring.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{monitoring.participant_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${monitoring.log?.enabled ? "border-emerald-500/30 text-emerald-500" : "border-red-500/30 text-red-500"}`}>{monitoring.log?.enabled ? "Yes" : "No"}</Badge></td>
                    <td className="px-4 py-3 text-sm">{monitoring.log?.retention || 0} days</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(monitoring.compliance || []).map((entry: string) => (<Badge key={entry} variant="outline" className="text-[10px]">{entry}</Badge>))}</div></td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${monitoring.notification?.realtime ? "border-blue-500/30 text-blue-500" : ""}`}>{monitoring.notification?.realtime ? "Active" : "Off"}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{monitoring.notification?.email || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2" disabled={!hasPermission("monitoring.manage")} onClick={() => openEditMonitoring(monitoring)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive" disabled={!hasPermission("monitoring.manage")} onClick={() => setMonitoringDeleteTarget(monitoring)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No monitoring records" : "Select a domain"}</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={poolDialogOpen} onOpenChange={(nextOpen) => { setPoolDialogOpen(nextOpen); if (!nextOpen) resetPoolForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPool ? "Edit Connection Pool" : "Create Connection Pool"}</DialogTitle>
            <DialogDescription>Use existing participants and explicit endpoint URLs so setup stays deterministic.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Participant</Label>
                <Select value={poolForm.participant_id} onValueChange={(value) => setPoolForm((prev) => ({ ...prev, participant_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select participant" /></SelectTrigger>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.organization_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Pool Type</Label>
                <Select value={poolForm.type} onValueChange={(value) => setPoolForm((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSUMER">CONSUMER</SelectItem>
                    <SelectItem value="PROVIDER">PROVIDER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={poolForm.name} onChange={(event) => setPoolForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Consumer pool A" />
              </div>
              <div className="grid gap-2">
                <Label>Token</Label>
                <Input value={poolForm.token} onChange={(event) => setPoolForm((prev) => ({ ...prev, token: event.target.value }))} placeholder="connector token" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Consumer URL</Label>
                <Input value={poolForm.url_consumer} onChange={(event) => setPoolForm((prev) => ({ ...prev, url_consumer: event.target.value }))} placeholder="https://consumer.example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Provider URL</Label>
                <Input value={poolForm.url_provider} onChange={(event) => setPoolForm((prev) => ({ ...prev, url_provider: event.target.value }))} placeholder="https://provider.example.com" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPoolDialogOpen(false); resetPoolForm(); }}>Cancel</Button>
            <Button onClick={handleSavePool} disabled={createPool.isPending || updatePool.isPending}>
              {createPool.isPending || updatePool.isPending ? "Saving..." : editingPool ? "Save Changes" : "Create Pool"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={monitoringDialogOpen} onOpenChange={(nextOpen) => { setMonitoringDialogOpen(nextOpen); if (!nextOpen) resetMonitoringForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMonitoring ? "Edit Monitoring" : "Create Monitoring"}</DialogTitle>
            <DialogDescription>Choose an existing participant and configure logging, retention, compliance, and notifications.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Participant</Label>
                <Select value={monitoringForm.participant_id} onValueChange={(value) => setMonitoringForm((prev) => ({ ...prev, participant_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select participant" /></SelectTrigger>
                  <SelectContent>
                    {scopedParticipants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.organization_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Retention (days)</Label>
                <Input value={monitoringForm.retention} onChange={(event) => setMonitoringForm((prev) => ({ ...prev, retention: event.target.value }))} placeholder="30" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Notification Email</Label>
                <Input value={monitoringForm.email} onChange={(event) => setMonitoringForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="ops@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Compliance</Label>
                <Input value={monitoringForm.compliance} onChange={(event) => setMonitoringForm((prev) => ({ ...prev, compliance: event.target.value }))} placeholder="SKK MIGAS, ISO 27001" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <Checkbox checked={monitoringForm.logEnabled} onCheckedChange={(checked) => setMonitoringForm((prev) => ({ ...prev, logEnabled: Boolean(checked) }))} />
                <span className="text-sm font-medium">Enable logging</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <Checkbox checked={monitoringForm.realtime} onCheckedChange={(checked) => setMonitoringForm((prev) => ({ ...prev, realtime: Boolean(checked) }))} />
                <span className="text-sm font-medium">Enable realtime alerts</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMonitoringDialogOpen(false); resetMonitoringForm(); }}>Cancel</Button>
            <Button onClick={handleSaveMonitoring} disabled={createMonitoring.isPending || updateMonitoring.isPending}>
              {createMonitoring.isPending || updateMonitoring.isPending ? "Saving..." : editingMonitoring ? "Save Changes" : "Create Monitoring"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!poolDeleteTarget} onOpenChange={(nextOpen) => !nextOpen && setPoolDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection Pool?</AlertDialogTitle>
            <AlertDialogDescription>This removes <strong>{poolDeleteTarget?.name || "the selected pool"}</strong> from onboarding configuration.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePool.mutate(poolDeleteTarget.id, { onSuccess: () => setPoolDeleteTarget(null) })} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!monitoringDeleteTarget} onOpenChange={(nextOpen) => !nextOpen && setMonitoringDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Monitoring?</AlertDialogTitle>
            <AlertDialogDescription>This removes the monitoring configuration for <strong>{monitoringDeleteTarget?.participant_id?.slice(0, 8) || "the selected participant"}</strong> in the current domain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMonitoring.mutate({ domainId, id: monitoringDeleteTarget.id }, { onSuccess: () => setMonitoringDeleteTarget(null) })} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default SystemSetup;
