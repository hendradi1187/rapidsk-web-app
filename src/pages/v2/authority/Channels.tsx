// src/pages/v2/authority/Channels.tsx
// Communication Channels — POST /channels, PUT activate/close, GET status, GET by transfer-process

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, Plus, Power, Square, RefreshCcw, Layers, Search } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAllDomains } from "@/api/hooks/useDomains";
import { useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { channelsApi } from "@/api/services/connector-runtime";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "border-emerald-500/40 text-emerald-500",
  CLOSED: "border-slate-500/40 text-slate-500",
  PENDING: "border-amber-500/40 text-amber-500",
  FAILED: "border-red-500/40 text-red-500",
};

const Channels = () => {
  const qc = useQueryClient();
  const { data: domainsData } = useAllDomains({ limit: 50 });
  const domains = domainsData?.data ?? [];
  const [domainId, setDomainId] = useState("");
  const effectiveDomainId = domainId || domains[0]?.id || "";

  const { data: processesData } = useTransferProcessesHistory(effectiveDomainId, { limit: 50 });
  const processes = processesData?.data ?? [];

  const [filterProcessId, setFilterProcessId] = useState("");
  const filterProcessIdEffective = filterProcessId || processes[0]?.id || "";

  // Channels by transfer process (lifecycle is per-process)
  const channelsQuery = useQuery({
    queryKey: ["channels", effectiveDomainId, filterProcessIdEffective],
    queryFn: () => channelsApi.listByTransferProcess(effectiveDomainId, filterProcessIdEffective, { limit: 100 }),
    enabled: !!effectiveDomainId && !!filterProcessIdEffective,
  });
  const channels = channelsQuery.data?.data ?? [];

  // Lookup channel by ID for inspect dialog
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
      toast.success("Channel created");
    },
    onError: (e: any) => toast.error("Create failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });
  const activateChannel = useMutation({
    mutationFn: ({ domain, id }: { domain: string; id: string }) => channelsApi.activate(domain, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Channel activated");
    },
    onError: (e: any) => toast.error("Activate failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });
  const closeChannel = useMutation({
    mutationFn: ({ domain, id }: { domain: string; id: string }) => channelsApi.close(domain, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Channel closed");
    },
    onError: (e: any) => toast.error("Close failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });

  // Create dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transfer_process_id: "",
    payload_json: "{}",
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
    let extra: Record<string, any> = {};
    try {
      extra = JSON.parse(form.payload_json || "{}");
    } catch {
      toast.error("Payload must be valid JSON");
      return;
    }
    createChannel.mutate({
      domain: effectiveDomainId,
      payload: { transfer_process_id: form.transfer_process_id, ...extra },
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ transfer_process_id: "", payload_json: "{}" });
      },
    });
  };

  return (
    <V2PageShell title="Communication Channels" subtitle="Establish, activate, and close connector communication channels per transfer process." status="Live API">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain & Transfer Process Scope</p>
          <p className="text-xs text-muted-foreground">Channels are scoped per domain and per transfer process.</p>
        </div>
        <Select value={effectiveDomainId} onValueChange={setDomainId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select domain" /></SelectTrigger>
          <SelectContent>
            {domains.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterProcessIdEffective} onValueChange={setFilterProcessId} disabled={processes.length === 0}>
          <SelectTrigger className="w-72"><SelectValue placeholder={processes.length ? "Select transfer process" : "No transfer processes yet"} /></SelectTrigger>
          <SelectContent>
            {processes.map((p) => (<SelectItem key={p.id} value={p.id}>{p.id.slice(0, 8)} — {p.state}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => channelsQuery.refetch()}>
          <RefreshCcw className="h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Channels (in scope)" value={channelsQuery.isLoading ? "..." : channels.length} subtitle="For selected transfer process" icon={Plug} trend="up" />
        <MetricCard title="Active" value={channels.filter((c) => c.status === "ACTIVE").length} subtitle="Currently open" icon={Power} trend="up" />
        <MetricCard title="Closed" value={channels.filter((c) => c.status === "CLOSED").length} subtitle="Lifecycle ended" icon={Square} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Channels</CardTitle>
            <CardDescription>Each channel mediates the connector handshake for one transfer process.</CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)} disabled={!effectiveDomainId}>
            <Plus className="h-4 w-4" />New Channel
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Channel ID", "Process ID", "Status", "Created", "Actions"]} isLoading={channelsQuery.isLoading}>
            {channels.length > 0 ? channels.map((c) => (
              <tr key={c.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{c.id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-mono text-xs">{(c.transfer_process_id || "—").slice(0, 8)}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.created_at ? new Date(c.created_at).toLocaleString() : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-500" disabled={c.status === "ACTIVE" || activateChannel.isPending} onClick={() => activateChannel.mutate({ domain: effectiveDomainId, id: c.id })}>
                      <Power className="mr-1 h-3 w-3" />Activate
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/40 text-red-500" disabled={c.status === "CLOSED" || closeChannel.isPending} onClick={() => closeChannel.mutate({ domain: effectiveDomainId, id: c.id })}>
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
          <CardDescription>Lookup any channel ID directly via <code className="rounded bg-muted px-1 text-xs">GET /channels/{`{id}`}</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="channel UUID" />
            <Button className="gap-2" onClick={() => lookupQuery.refetch()} disabled={!lookupId || !effectiveDomainId}>
              <Search className="h-4 w-4" />Inspect
            </Button>
          </div>
          {lookupQuery.data && (
            <pre className="max-h-80 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground">{JSON.stringify(lookupQuery.data, null, 2)}</pre>
          )}
          {lookupQuery.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
              {(lookupQuery.error as any)?.response?.data?.detail || "Lookup failed"}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Establish Channel</DialogTitle>
            <DialogDescription>Pick a transfer process and (optionally) provide extra payload as JSON.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Transfer Process *</Label>
              <Select value={form.transfer_process_id} onValueChange={(v) => setForm({ ...form, transfer_process_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick transfer process" /></SelectTrigger>
                <SelectContent>
                  {processes.map((p) => (<SelectItem key={p.id} value={p.id}>{p.id.slice(0, 8)} — {p.state}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Extra Payload (JSON)</Label>
              <Textarea value={form.payload_json} onChange={(e) => setForm({ ...form, payload_json: e.target.value })} rows={5} placeholder='{}' />
              <p className="text-xs text-muted-foreground">Backend may require fields like consumer_pool_id, provider_pool_id — cek backend docs.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={createChannel.isPending}>
              {createChannel.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </V2PageShell>
  );
};

export default Channels;
