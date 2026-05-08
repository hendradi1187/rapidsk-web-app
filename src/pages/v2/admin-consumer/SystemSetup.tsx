import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Network, Activity, Layers, Plus, Pencil, Trash2, Settings, UserPlus, ArrowRight, CheckCircle2 } from "lucide-react";
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
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 1000 });
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
  // Monitoring per seq diagram: any participant, not filtered.
  const scopedParticipants = useMemo(() => participants, [participants]);
  const participantNameById = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p) => map.set(p.id, p.organization_name));
    return map;
  }, [participants]);

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
    // Backend MonitoringNotification.email expects RFC email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(monitoringForm.email)) {
      toast.error("Invalid email format");
      return;
    }
    const retention = Number(monitoringForm.retention);
    if (!Number.isInteger(retention) || retention <= 0) {
      toast.error("Retention must be a positive integer (days)");
      return;
    }
    const compliance = monitoringForm.compliance.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (compliance.length === 0) {
      toast.error("Pick at least one compliance framework");
      return;
    }
    const ALLOWED = new Set(["ISO 27001", "SKK MIGAS", "COBIT", "ITIL 4"]);
    const invalid = compliance.filter((v) => !ALLOWED.has(v));
    if (invalid.length > 0) {
      toast.error(`Invalid compliance value(s): ${invalid.join(", ")}`);
      return;
    }

    const payload = {
      participant_id: monitoringForm.participant_id,
      log: {
        enabled: monitoringForm.logEnabled,
        retention,
      },
      compliance,
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
    <V2PageShell title="System Setup" subtitle="Group C — System config, participant provisioning, dan domain mapping per sequence diagram." status="Live API">
      {/* Group C 3-step guide (per sequence diagram) */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Settings className="h-3.5 w-3.5" /> Step 1 · System Config
            </div>
            <p className="text-sm font-medium">Endpoint, encryption, retention, compliance, notification</p>
            <p className="text-xs text-muted-foreground">Configured per-domain via the <strong>System Configuration</strong> tab below (saved as <code className="text-[10px]">monitoring</code> records).</p>
            <Badge variant="outline" className="text-[10px]">{monitorings.length} configured</Badge>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="flex items-center gap-2"><UserPlus className="h-3.5 w-3.5" /> Step 2 · Input Participant Provider</span>
              <Link to="/v2/admin-consumer/admin-provider" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></Link>
            </div>
            <p className="text-sm font-medium">Daftarkan KKKS sebagai PROVIDER → trigger email aktivasi</p>
            <p className="text-xs text-muted-foreground">Status awal: <code className="text-[10px]">PENDING_ACTIVATION</code>. Dikelola di menu Admin Provider.</p>
            <Badge variant="outline" className="text-[10px]">{participants.filter((p) => p.organization_type === "ENTERPRISE").length} provider participants</Badge>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> Step 3 · Mapping Participant ↔ Domain</span>
              <Link to="/v2/admin-consumer/domain-mapping" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></Link>
            </div>
            <p className="text-sm font-medium">Bind participant ke domain</p>
            <p className="text-xs text-muted-foreground">Backend hanya butuh <code className="text-[10px]">domain_id</code> per participant. <code className="text-[10px]">access_level</code> di seq diagram belum ada di endpoint.</p>
            <Badge variant="outline" className="text-[10px]">Dikelola di menu Domain Mapping</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Active Domain {domainId && <CheckCircle2 className="inline h-3.5 w-3.5 text-emerald-500 ml-1" />}</p>
          <p className="text-xs text-muted-foreground">System Configuration di-scope per domain. Connection pools tetap global under onboarding.</p>
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

      <Tabs defaultValue="monitoring">
        <TabsList>
          <TabsTrigger value="monitoring">System Configuration (Monitoring)</TabsTrigger>
          <TabsTrigger value="pools">Connection Pools</TabsTrigger>
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
                <CardTitle className="text-base">System Configuration (per domain)</CardTitle>
                <CardDescription>Per sequence diagram Step 1 — endpoint, encryption, retention policy. Backend menyimpan sebagai <code className="text-xs">monitoring</code> record (POST <code className="text-xs">/api/v1/onboarding/{`{domain_id}`}/monitorings</code>).</CardDescription>
              </div>
              <Button onClick={() => setMonitoringDialogOpen(true)} disabled={!hasPermission("monitoring.manage") || !domainId || participants.length === 0} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Configuration
              </Button>
            </CardHeader>
            <CardContent>
              {!domainId && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400 mb-3">Pilih domain di header dulu.</p>
              )}
              {domainId && participants.length === 0 && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400 mb-3">Belum ada participant — daftarkan dulu di <Link to="/v2/admin-consumer/admin-provider" className="underline">Admin Provider</Link>.</p>
              )}
              <DataTable headers={["Participant", "Log Enabled", "Retention", "Compliance", "Realtime Alerts", "Email", "Actions"]} isLoading={!domainId || loadingMonitorings}>
                {monitorings.length > 0 ? monitorings.map((monitoring: any) => (
                  <tr key={monitoring.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm">{participantNameById.get(monitoring.participant_id) || <span className="font-mono text-xs">{monitoring.participant_id?.slice(0, 8)}...</span>}</td>
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
                )) : (<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">{!domainId ? "Pilih domain dulu" : "Belum ada konfigurasi sistem untuk domain ini — klik Add Configuration."}</td></tr>)}
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
            <DialogTitle>{editingMonitoring ? "Edit System Configuration" : "Create System Configuration"}</DialogTitle>
            <DialogDescription>Per seq diagram Step 1: pilih participant lalu set retention policy (log), compliance framework, dan notification.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Participant *</Label>
                <Select value={monitoringForm.participant_id} onValueChange={(value) => setMonitoringForm((prev) => ({ ...prev, participant_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select participant" /></SelectTrigger>
                  <SelectContent>
                    {scopedParticipants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.organization_name} <span className="text-xs text-muted-foreground">({participant.organization_type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Retention Policy (days) *</Label>
                <Input type="number" min="1" value={monitoringForm.retention} onChange={(event) => setMonitoringForm((prev) => ({ ...prev, retention: event.target.value }))} placeholder="30" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Notification Email *</Label>
                <Input type="email" value={monitoringForm.email} onChange={(event) => setMonitoringForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="ops@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Compliance Framework * (enum backend)</Label>
                <div className="flex flex-wrap gap-2 rounded-md border border-border/60 p-2">
                  {(["ISO 27001", "SKK MIGAS", "COBIT", "ITIL 4"] as const).map((opt) => {
                    const current = monitoringForm.compliance.split(",").map((s) => s.trim()).filter(Boolean);
                    const checked = current.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 rounded border border-border/40 px-2 py-1 text-xs">
                        <Checkbox checked={checked} onCheckedChange={(next) => {
                          const set = new Set(current);
                          if (next) set.add(opt); else set.delete(opt);
                          setMonitoringForm((prev) => ({ ...prev, compliance: Array.from(set).join(", ") }));
                        }} />
                        {opt}
                      </label>
                    );
                  })}
                </div>
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
