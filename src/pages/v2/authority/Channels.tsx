import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, Plus, Power, Square, RefreshCcw, Layers, Search } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useTransferProcessesActive, useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { channelsApi } from "@/api/services/connector-runtime";
import { toast } from "sonner";
import { RuntimeCapabilityNotice, RuntimeExecutionLogPanel } from "@/components/runtime/RuntimeSupport";
import { createRuntimeExecutionLog, runtimeCapabilities, type RuntimeExecutionLogEntry } from "@/lib/runtime-capabilities";
import { getApiErrorSummary } from "@/lib/provider-flow-diagnostics";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "border-emerald-500/40 text-emerald-500",
  CLOSED: "border-slate-500/40 text-slate-500",
  PENDING: "border-amber-500/40 text-amber-500",
  FAILED: "border-red-500/40 text-red-500",
};

const Channels = () => {
  const qc = useQueryClient();
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeExecutionLogEntry[]>([]);
  const pushLog = (entry: RuntimeExecutionLogEntry) => setRuntimeLogs((prev) => [entry, ...prev].slice(0, 10));

  const { data: domainsData } = useAllDomains({ limit: 1000 });
  const domains = domainsData?.data ?? [];
  const [domainId, setDomainId] = useState("");
  const effectiveDomainId = domainId || domains[0]?.id || "";

  const { data: historyProcessesData, refetch: refetchHistory } = useTransferProcessesHistory(effectiveDomainId, { limit: 50 });
  const { data: activeProcessesData, refetch: refetchActive } = useTransferProcessesActive(effectiveDomainId, { limit: 50 });
  const historyProcesses = historyProcessesData?.data ?? [];
  const activeProcesses = activeProcessesData?.data ?? [];
  const processes = historyProcesses.length > 0 ? historyProcesses : activeProcesses;

  const [filterProcessId, setFilterProcessId] = useState("");
  const filterProcessIdEffective = filterProcessId || processes[0]?.id || "";

  const channelsQuery = useQuery({
    queryKey: ["channels", effectiveDomainId, filterProcessIdEffective],
    queryFn: () => channelsApi.listByTransferProcess(effectiveDomainId, filterProcessIdEffective, { limit: 100 }),
    enabled: !!effectiveDomainId && !!filterProcessIdEffective,
  });
  const channels = channelsQuery.data?.data ?? [];

  const [lookupId, setLookupId] = useState("");
  const lookupQuery = useQuery({
    queryKey: ["channel-detail", effectiveDomainId, lookupId],
    queryFn: () => channelsApi.getById(effectiveDomainId, lookupId),
    enabled: false,
  });

  const createChannel = useMutation({
    mutationFn: ({ domain, payload }: { domain: string; payload: Record<string, any> }) => channelsApi.create(domain, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.channels, "Create communication channel", "success", "Channel created."));
      toast.success("Channel created");
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Create failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.channels, "Create communication channel", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });
  const activateChannel = useMutation({
    mutationFn: ({ domain, id }: { domain: string; id: string }) => channelsApi.activate(domain, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.channels, "Activate communication channel", "success", "Channel activated."));
      toast.success("Channel activated");
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Activate failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.channels, "Activate communication channel", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });
  const closeChannel = useMutation({
    mutationFn: ({ domain, id }: { domain: string; id: string }) => channelsApi.close(domain, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.channels, "Close communication channel", "success", "Channel closed."));
      toast.success("Channel closed");
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Close failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.channels, "Close communication channel", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transfer_process_id: "",
    protocol: "HTTPS",
    endpoint_url: "",
    encryption_method: "TLS_1_3",
    authentication_method: "BEARER_TOKEN",
  });

  const submitCreate = () => {
    if (!effectiveDomainId) {
      toast.error("Pick domain first");
      return;
    }
    if (!form.transfer_process_id) {
      toast.error("Pick a transfer process");
      return;
    }
    if (!form.endpoint_url) {
      toast.error("Endpoint URL required");
      return;
    }

    createChannel.mutate(
      {
        domain: effectiveDomainId,
        payload: {
          transfer_process_id: form.transfer_process_id,
          protocol: form.protocol,
          endpoint_url: form.endpoint_url,
          encryption_method: form.encryption_method,
          authentication_method: form.authentication_method,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({ transfer_process_id: "", protocol: "HTTPS", endpoint_url: "", encryption_method: "TLS_1_3", authentication_method: "BEARER_TOKEN" });
        },
      }
    );
  };

  return (
    <V2PageShell title="Communication Channels" subtitle="Channel lifecycle with fallback process picker when history backend is broken." status="Live API">
      <RuntimeCapabilityNotice capability={runtimeCapabilities.channels} />
      <RuntimeCapabilityNotice capability={runtimeCapabilities.transferHistory} />
      {historyProcesses.length === 0 && activeProcesses.length > 0 && (
        <Alert>
          <AlertTitle>Transfer process picker sedang fallback</AlertTitle>
          <AlertDescription>
            Daftar process dibaca dari <code>/transfer-processes/active</code> karena history backend rusak.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain & Transfer Process Scope</p>
          <p className="text-xs text-muted-foreground">Channels are live, process picker may fallback from history to active state.</p>
        </div>
        <Select value={effectiveDomainId} onValueChange={setDomainId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select domain" /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (<SelectItem key={domain.id} value={domain.id}>{domain.name} ({domain.code})</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterProcessIdEffective} onValueChange={setFilterProcessId} disabled={processes.length === 0}>
          <SelectTrigger className="w-72"><SelectValue placeholder={processes.length ? "Select transfer process" : "No transfer processes yet"} /></SelectTrigger>
          <SelectContent>
            {processes.map((process) => (<SelectItem key={process.id} value={process.id}>{process.id.slice(0, 8)} - {process.state}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => { refetchHistory(); refetchActive(); channelsQuery.refetch(); }}>
          <RefreshCcw className="h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Channels (in scope)" value={channelsQuery.isLoading ? "..." : channels.length} subtitle="For selected transfer process" icon={Plug} trend="up" />
        <MetricCard title="Active" value={channels.filter((channel) => channel.status === "ACTIVE").length} subtitle="Currently open" icon={Power} trend="up" />
        <MetricCard title="Closed" value={channels.filter((channel) => channel.status === "CLOSED").length} subtitle="Lifecycle ended" icon={Square} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Channels</CardTitle>
            <CardDescription>Channel lifecycle is live from backend.</CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)} disabled={!effectiveDomainId}>
            <Plus className="h-4 w-4" />New Channel
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Channel ID", "Process ID", "Status", "Created", "Actions"]} isLoading={channelsQuery.isLoading}>
            {channels.length > 0 ? channels.map((channel) => (
              <tr key={channel.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{channel.id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-mono text-xs">{(channel.transfer_process_id || "-").slice(0, 8)}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[channel.status] || ""}`}>{channel.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{channel.created_at ? new Date(channel.created_at).toLocaleString() : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-500" disabled={channel.status === "ACTIVE" || activateChannel.isPending} onClick={() => activateChannel.mutate({ domain: effectiveDomainId, id: channel.id })}>
                      <Power className="mr-1 h-3 w-3" />Activate
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/40 text-red-500" disabled={channel.status === "CLOSED" || closeChannel.isPending} onClick={() => closeChannel.mutate({ domain: effectiveDomainId, id: channel.id })}>
                      <Square className="mr-1 h-3 w-3" />Close
                    </Button>
                  </div>
                </td>
              </tr>
            )) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{!effectiveDomainId ? "Select a domain" : !filterProcessIdEffective ? "Select a transfer process" : "No channels for this transfer process"}</td></tr>)}
          </DataTable>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Inspect Channel by ID</CardTitle>
          <CardDescription>Direct lookup via <code className="rounded bg-muted px-1 text-xs">GET /channels/{`{id}`}</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={lookupId} onChange={(event) => setLookupId(event.target.value)} placeholder="channel UUID" />
            <Button className="gap-2" onClick={() => lookupQuery.refetch()} disabled={!lookupId || !effectiveDomainId}>
              <Search className="h-4 w-4" />Inspect
            </Button>
          </div>
          {lookupQuery.data ? (
            <pre className="max-h-80 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground">{JSON.stringify(lookupQuery.data, null, 2)}</pre>
          ) : null}
          {lookupQuery.error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
              {getApiErrorSummary(lookupQuery.error, "Lookup failed").detail}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Establish Communication Channel</DialogTitle>
            <DialogDescription>Primary channel endpoints are live. Process picker may be fallback-backed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Transfer Process *</Label>
              <Select value={form.transfer_process_id} onValueChange={(value) => setForm({ ...form, transfer_process_id: value })}>
                <SelectTrigger><SelectValue placeholder="Pick transfer process" /></SelectTrigger>
                <SelectContent>
                  {processes.map((process) => (<SelectItem key={process.id} value={process.id}>{process.id.slice(0, 8)} - {process.state}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Endpoint URL *</Label>
              <Input value={form.endpoint_url} onChange={(event) => setForm({ ...form, endpoint_url: event.target.value })} placeholder="https://provider.example.com/dsp/channel" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Protocol *</Label>
                <Select value={form.protocol} onValueChange={(value) => setForm({ ...form, protocol: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HTTPS">HTTPS</SelectItem>
                    <SelectItem value="HTTP">HTTP</SelectItem>
                    <SelectItem value="GRPC">gRPC</SelectItem>
                    <SelectItem value="MQTT">MQTT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Encryption *</Label>
                <Select value={form.encryption_method} onValueChange={(value) => setForm({ ...form, encryption_method: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TLS_1_3">TLS 1.3</SelectItem>
                    <SelectItem value="TLS_1_2">TLS 1.2</SelectItem>
                    <SelectItem value="AES_256">AES-256</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Authentication *</Label>
              <Select value={form.authentication_method} onValueChange={(value) => setForm({ ...form, authentication_method: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
                  <SelectItem value="API_KEY">API Key</SelectItem>
                  <SelectItem value="MTLS">Mutual TLS</SelectItem>
                  <SelectItem value="OAUTH2">OAuth 2.0</SelectItem>
                  <SelectItem value="NONE">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={createChannel.isPending}>{createChannel.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RuntimeExecutionLogPanel title="Channel Action Log" entries={runtimeLogs} />
    </V2PageShell>
  );
};

export default Channels;
