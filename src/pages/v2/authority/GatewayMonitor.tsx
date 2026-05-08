import { useMemo, useState } from "react";
import { Activity, RefreshCcw, Layers, Plug, Send } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useDataTransfers } from "@/api/hooks/useDataTransfers";
import { useTransferProcessesActive, useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { useConnectionPools } from "@/api/hooks/useParticipants";
import { BackendPendingBadge } from "@/components/dev/BackendPendingBadge";
import { toast } from "sonner";
import { RuntimeCapabilityNotice } from "@/components/runtime/RuntimeSupport";
import { runtimeCapabilities } from "@/lib/runtime-capabilities";

interface GatewayEvent {
  id: string;
  type: "GATEWAY_LOGIN" | "TOKEN_EXCHANGE" | "DATASET_REQUEST" | "DATASET_RESPONSE" | "AUDIT_PUSH" | "COMPLIANCE_CHECK";
  endpoint: string;
  pool_name: string;
  status: "OK" | "FAILED";
  occurred_at: string;
  payload_summary: string;
}

const STORAGE_KEY = "v2-gateway-stub-events";

const loadEvents = (): GatewayEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GatewayEvent[]) : [];
  } catch {
    return [];
  }
};

const TYPE_COLORS: Record<GatewayEvent["type"], string> = {
  GATEWAY_LOGIN: "border-blue-500/40 text-blue-500",
  TOKEN_EXCHANGE: "border-purple-500/40 text-purple-500",
  DATASET_REQUEST: "border-amber-500/40 text-amber-500",
  DATASET_RESPONSE: "border-emerald-500/40 text-emerald-500",
  AUDIT_PUSH: "border-slate-400/40 text-slate-400",
  COMPLIANCE_CHECK: "border-violet-500/40 text-violet-500",
};

const GatewayMonitor = () => {
  const { data: domainsData } = useAllDomains({ limit: 1000 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: poolsData } = useConnectionPools({ limit: 100 });
  const pools = poolsData?.data ?? [];
  const { data: historyProcessesData, isLoading: loadingHistory, refetch: refetchHistory } = useTransferProcessesHistory(domainId, { limit: 50 });
  const { data: activeProcessesData, isLoading: loadingActive, refetch: refetchActive } = useTransferProcessesActive(domainId, { limit: 50 });
  const { data: domainTransfersData } = useDataTransfers(domainId, { limit: 50 });
  const historyProcesses = historyProcessesData?.data ?? [];
  const activeProcesses = activeProcessesData?.data ?? [];
  const processes = historyProcesses.length > 0 ? historyProcesses : activeProcesses;
  const transfers = domainTransfersData?.data ?? [];

  const [events, setEvents] = useState<GatewayEvent[]>(loadEvents);
  const [pingDialog, setPingDialog] = useState(false);
  const [pingForm, setPingForm] = useState({ pool_id: "", type: "GATEWAY_LOGIN" as GatewayEvent["type"], endpoint: "" });

  const persist = (next: GatewayEvent[]) => {
    setEvents(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const counts = useMemo(() => {
    const live = processes.length;
    const stubOk = events.filter((event) => event.status === "OK").length;
    const stubFail = events.filter((event) => event.status === "FAILED").length;
    return { live, stubOk, stubFail, pools: pools.length };
  }, [processes, events, pools]);

  const handleEmitPing = () => {
    const pool = pools.find((item) => item.id === pingForm.pool_id);
    if (!pool) {
      toast.error("Pick a connection pool first");
      return;
    }
    const event: GatewayEvent = {
      id: `gw-${Date.now()}`,
      type: pingForm.type,
      endpoint: pingForm.endpoint || pool.metadata?.url_provider || "-",
      pool_name: pool.name,
      status: Math.random() > 0.2 ? "OK" : "FAILED",
      occurred_at: new Date().toISOString(),
      payload_summary: `${pingForm.type} via pool ${pool.name}`,
    };
    persist([event, ...events]);
    toast.success(`Stub ${pingForm.type} emitted (${event.status})`);
    setPingDialog(false);
  };

  return (
    <V2PageShell title="Gateway Monitor" subtitle="Gateway runtime with safe fallback away from broken transfer history endpoint." status="Preview only">
      <BackendPendingBadge variant="block" message="Endpoint /gateway/events untuk stream login/token/audit/compliance per transfer belum tersedia. Halaman ini memakai active transfer process + domain transfer fallback dan stub gateway event untuk preview." />
      <RuntimeCapabilityNotice capability={runtimeCapabilities.transferHistory} />
      {historyProcesses.length === 0 && activeProcesses.length > 0 && (
        <Alert>
          <AlertTitle>Gateway runtime sedang degraded mode</AlertTitle>
          <AlertDescription>
            Process list dibaca dari <code>/transfer-processes/active</code> karena history backend rusak. Data transfer evidence tetap tersedia dari <code>/data-transfers</code>.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Process history may fallback to active runtime state.</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select domain" /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (<SelectItem key={domain.id} value={domain.id}>{domain.name} ({domain.code})</SelectItem>))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => { refetchHistory(); refetchActive(); }}>
          <RefreshCcw className="h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Connection Pools" value={counts.pools} subtitle="Configured connectors" icon={Plug} trend="neutral" />
        <MetricCard title="Runtime Processes" value={counts.live} subtitle={historyProcesses.length > 0 ? "History source" : "Fallback active source"} icon={Activity} trend="up" />
        <MetricCard title="Stub Events OK" value={counts.stubOk} subtitle="Successful demos" icon={Activity} trend="up" />
        <MetricCard title="Stub Events Failed" value={counts.stubFail} subtitle="Demo failures" icon={Activity} trend={counts.stubFail > 0 ? "down" : "neutral"} />
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Gateway Events</TabsTrigger>
          <TabsTrigger value="pools">Connection Pools</TabsTrigger>
          <TabsTrigger value="processes">Runtime Processes</TabsTrigger>
          <TabsTrigger value="transfers">Data Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Stub Event Stream</CardTitle>
                <CardDescription>Manual preview for gateway event UI because backend stream is missing.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-2" onClick={() => setPingDialog(true)} disabled={pools.length === 0}>
                  <Send className="h-4 w-4" />Emit Event
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => persist([])}>Clear</Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable headers={["When", "Type", "Pool", "Endpoint", "Status", "Payload"]}>
                {events.length > 0 ? events.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(event.occurred_at).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[event.type]}`}>{event.type}</Badge></td>
                    <td className="px-4 py-3 text-xs">{event.pool_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{event.endpoint}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${event.status === "OK" ? "border-emerald-500/40 text-emerald-500" : "border-red-500/40 text-red-500"}`}>{event.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{event.payload_summary}</td>
                  </tr>
                )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No gateway events yet.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pools">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Connection Pools</CardTitle>
              <CardDescription>Read-only here - manage in System Setup.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Type", "Consumer URL", "Provider URL", "Token"]}>
                {pools.length > 0 ? pools.map((pool: any) => (
                  <tr key={pool.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{pool.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{pool.type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{pool.metadata?.url_consumer || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{pool.metadata?.url_provider || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{pool.token?.slice(0, 12) || "-"}...</td>
                  </tr>
                )) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No pools configured.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processes">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Runtime Processes</CardTitle>
              <CardDescription>{historyProcesses.length > 0 ? <>History source from <code className="rounded bg-muted px-1">/transfer-processes/history</code></> : <>Fallback from <code className="rounded bg-muted px-1">/transfer-processes/active</code></>}</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Process ID", "State", "Started", "Completed", "Error"]} isLoading={loadingHistory && loadingActive}>
                {processes.length > 0 ? processes.map((process) => (
                  <tr key={process.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{process.id.slice(0, 8)}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{process.state}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{process.started_at ? new Date(process.started_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{process.completed_at ? new Date(process.completed_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{process.error_message || "-"}</td>
                  </tr>
                )) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No runtime processes for this domain.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Domain Data Transfers</CardTitle>
              <CardDescription>Fallback transfer evidence from <code className="rounded bg-muted px-1">/data-transfers</code>.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Transfer", "Status", "From", "To", "Updated"]}>
                {transfers.length > 0 ? transfers.map((transfer: any) => (
                  <tr key={transfer.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs font-medium">{transfer.name || `Transfer ${transfer.id}`}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{transfer.status || "-"}</Badge></td>
                    <td className="px-4 py-3 text-xs">{transfer.from || "-"}</td>
                    <td className="px-4 py-3 text-xs">{transfer.to || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.updated_at || transfer.lastSync || transfer.created_at || "-"}</td>
                  </tr>
                )) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No domain transfer rows.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div hidden={!pingDialog}>
        {pingDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPingDialog(false)}>
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <h3 className="text-base font-semibold">Emit Gateway Event</h3>
              <p className="mt-1 text-xs text-muted-foreground">Preview only - no live gateway events endpoint exists.</p>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <Label>Connection Pool</Label>
                  <Select value={pingForm.pool_id} onValueChange={(value) => setPingForm({ ...pingForm, pool_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Select pool" /></SelectTrigger>
                    <SelectContent>
                      {pools.map((pool: any) => (<SelectItem key={pool.id} value={pool.id}>{pool.name} ({pool.type})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Event Type</Label>
                  <Select value={pingForm.type} onValueChange={(value) => setPingForm({ ...pingForm, type: value as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_COLORS) as GatewayEvent["type"][]).map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Endpoint Override (optional)</Label>
                  <Input value={pingForm.endpoint} onChange={(event) => setPingForm({ ...pingForm, endpoint: event.target.value })} placeholder="If empty, uses pool url_provider" />
                </div>
                <BackendPendingBadge variant="block" message="Ini stub preview saja. Backend live untuk gateway event stream belum tersedia." />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPingDialog(false)}>Cancel</Button>
                <Button onClick={handleEmitPing} disabled={!pingForm.pool_id}>Emit</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </V2PageShell>
  );
};

export default GatewayMonitor;
