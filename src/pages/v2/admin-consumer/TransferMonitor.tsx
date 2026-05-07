// src/pages/v2/admin-consumer/TransferMonitor.tsx
import { useMemo, useState } from "react";
import { Activity, Layers, Database, RefreshCcw, Settings, Play, CheckCircle, XCircle, Handshake, Plug } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useMonitorings } from "@/api/hooks/useMonitorings";
import { useDataTransfersByProcess, useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { transferProcessMutationsApi, dataTransferMutationsApi } from "@/api/services/connector-runtime";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const TransferMonitor = () => {
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 50 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: monitoringsData, isLoading: loadingMonitorings, refetch: refetchMonitorings } = useMonitorings(domainId, { limit: 50 });
  const { data: transferProcessesData, isLoading: loadingProcesses, refetch: refetchProcesses } = useTransferProcessesHistory(domainId, { limit: 50 });
  const transferProcesses = transferProcessesData?.data ?? [];
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const selectedTransferProcessId = selectedProcessId || transferProcesses[0]?.id || "";
  const { data: transfersData, isLoading: loadingTransfers, refetch: refetchTransfers } = useDataTransfersByProcess(domainId, selectedTransferProcessId, { limit: 50 });

  const handleRefresh = () => {
    refetchProcesses();
    refetchMonitorings();
    refetchTransfers();
  };

  const { hasPermission } = useAuth();
  const canManageTransfer = hasPermission("transfer.manage");
  const qc = useQueryClient();

  // Transfer Process action mutations
  const negotiate = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.negotiate(domainId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transfer-processes"] }); toast.success("Transfer process negotiated"); },
    onError: (e: any) => toast.error("Negotiate failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });
  const execute = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.execute(domainId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transfer-processes"] }); toast.success("Transfer process executed"); },
    onError: (e: any) => toast.error("Execute failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });
  const completeProcess = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.complete(domainId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transfer-processes"] }); toast.success("Transfer process completed"); },
    onError: (e: any) => toast.error("Complete failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });
  const failProcess = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.fail(domainId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transfer-processes"] }); toast.success("Transfer process marked failed"); },
    onError: (e: any) => toast.error("Fail action failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });

  // Data Transfer chunk action mutations
  const startChunk = useMutation({
    mutationFn: (id: string) => dataTransferMutationsApi.start(domainId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data-transfer-runtime"] }); toast.success("Chunk transfer started"); },
    onError: (e: any) => toast.error("Start failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });
  const completeChunk = useMutation({
    mutationFn: (id: string) => dataTransferMutationsApi.complete(domainId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data-transfer-runtime"] }); toast.success("Chunk transfer completed"); },
    onError: (e: any) => toast.error("Complete failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });
  const failChunk = useMutation({
    mutationFn: (id: string) => dataTransferMutationsApi.fail(domainId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data-transfer-runtime"] }); toast.success("Chunk transfer marked failed"); },
    onError: (e: any) => toast.error("Fail failed", { description: e?.response?.data?.detail || "Unexpected error" }),
  });

  const monitorings = monitoringsData?.data ?? [];
  const transfers = transfersData?.data ?? [];
  const processStates = useMemo(() => {
    return transferProcesses.reduce<Record<string, number>>((accumulator, process) => {
      accumulator[process.state] = (accumulator[process.state] || 0) + 1;
      return accumulator;
    }, {});
  }, [transferProcesses]);

  return (
    <V2PageShell title="Transfer Monitor" subtitle="Transfer processes and transfer chunks are the primary runtime source. Monitoring remains supplemental." status="Live API">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Monitor connector runtime per domain using transfer process history</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder={loadingDomains ? "Loading..." : "Select domain"} /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (<SelectItem key={domain.id} value={domain.id}>{domain.name} ({domain.code})</SelectItem>))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" variant="outline" className="gap-2" asChild>
          <Link to="/v2/admin-consumer/system-setup">
            <Settings className="h-4 w-4" />
            Manage Monitoring
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="gap-2" asChild>
          <Link to="/v2/authority/channels">
            <Plug className="h-4 w-4" />
            Channels
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard title="Transfer Processes" value={loadingProcesses ? "..." : transferProcesses.length} subtitle="Primary runtime history" icon={Activity} trend="up" />
        <MetricCard title="Transfer Records" value={loadingTransfers ? "..." : transfers.length} subtitle="Chunk-level data transfers" icon={Database} trend="up" />
        <MetricCard title="Active States" value={Object.keys(processStates).length || "—"} subtitle="Distinct runtime states" icon={Activity} trend="neutral" />
        <MetricCard title="Monitoring Configs" value={loadingMonitorings ? "..." : monitorings.length} subtitle="Supplemental audit/compliance configs" icon={Layers} trend="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Transfer Process History</CardTitle>
            <CardDescription>Primary source for runtime state, started/completed timestamps, and error tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Process ID", "State", "Started", "Completed", "Actions"]} isLoading={!domainId || loadingProcesses}>
              {transferProcesses.length > 0 ? transferProcesses.map((process) => (
                <tr key={process.id} className={`cursor-pointer transition-colors hover:bg-muted/20 ${process.id === selectedTransferProcessId ? "bg-muted/30" : ""}`} onClick={() => setSelectedProcessId(process.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{process.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{process.state}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.started_at ? new Date(process.started_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.completed_at ? new Date(process.completed_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-amber-500/40 text-amber-500" disabled={!canManageTransfer || negotiate.isPending} title="PUT /transfer-processes/{id}/negotiate" onClick={() => negotiate.mutate(process.id)}>
                        <Handshake className="h-3 w-3" />Negotiate
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-blue-500/40 text-blue-500" disabled={!canManageTransfer || execute.isPending} title="PUT /transfer-processes/{id}/execute" onClick={() => execute.mutate(process.id)}>
                        <Play className="h-3 w-3" />Execute
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-emerald-500/40 text-emerald-500" disabled={!canManageTransfer || completeProcess.isPending} title="PUT /transfer-processes/{id}/complete" onClick={() => completeProcess.mutate(process.id)}>
                        <CheckCircle className="h-3 w-3" />Complete
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-red-500/40 text-red-500" disabled={!canManageTransfer || failProcess.isPending} title="PUT /transfer-processes/{id}/fail" onClick={() => failProcess.mutate(process.id)}>
                        <XCircle className="h-3 w-3" />Fail
                      </Button>
                    </div>
                    {process.error_message && (<p className="mt-1 text-[10px] text-red-500">err: {process.error_message}</p>)}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No transfer processes found" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Transfer Records</CardTitle>
            <CardDescription>Chunk-level records for the latest transfer process in scope</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Chunk", "State", "Size", "Transferred", "Actions"]} isLoading={!domainId || loadingTransfers}>
              {transfers.length > 0 ? transfers.map((transfer) => (
                <tr key={transfer.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">{transfer.chunk_sequence}/{transfer.total_chunks}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{transfer.state}</Badge></td>
                  <td className="px-4 py-3 text-sm">{transfer.chunk_size}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.transferred_at ? new Date(transfer.transferred_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-blue-500/40 text-blue-500" disabled={!canManageTransfer || startChunk.isPending} title="PUT /data-transfers/{id}/start" onClick={() => startChunk.mutate(transfer.id)}>
                        <Play className="h-3 w-3" />Start
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-emerald-500/40 text-emerald-500" disabled={!canManageTransfer || completeChunk.isPending} title="PUT /data-transfers/{id}/complete" onClick={() => completeChunk.mutate(transfer.id)}>
                        <CheckCircle className="h-3 w-3" />Done
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-red-500/40 text-red-500" disabled={!canManageTransfer || failChunk.isPending} title="PUT /data-transfers/{id}/fail" onClick={() => failChunk.mutate(transfer.id)}>
                        <XCircle className="h-3 w-3" />Fail
                      </Button>
                    </div>
                    {transfer.error_message && (<p className="mt-1 text-[10px] text-red-500">err: {transfer.error_message}</p>)}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{selectedTransferProcessId ? "No data transfer chunks found for the latest process" : "No transfer process selected"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Monitoring Supplements</CardTitle>
          <CardDescription>Monitoring stays available for audit logging, compliance frameworks, retention, and realtime alerts.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Participant", "Log Enabled", "Retention", "Compliance", "Realtime"]} isLoading={!domainId || loadingMonitorings}>
            {monitorings.length > 0 ? monitorings.map((monitoring) => (
              <tr key={monitoring.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{monitoring.participant_id.slice(0, 8)}...</td>
                <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{monitoring.log.enabled ? "Enabled" : "Disabled"}</Badge></td>
                <td className="px-4 py-3 text-sm">{monitoring.log.retention} days</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{monitoring.compliance.join(", ") || "—"}</td>
                <td className="px-4 py-3 text-sm">{monitoring.notification.realtime ? "Realtime" : "Off"}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No monitoring records found" : "Select a domain"}</td></tr>
            )}
          </DataTable>
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default TransferMonitor;
