import { useMemo, useState } from "react";
import { Activity, Layers, Database, RefreshCcw, Settings, Play, CheckCircle, XCircle, Handshake, Plug, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useMonitorings } from "@/api/hooks/useMonitorings";
import { useDataTransfers } from "@/api/hooks/useDataTransfers";
import { useDataTransfersByProcess, useTransferProcessesActive, useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useDatasets } from "@/api/hooks/useDatasets";
import { transferProcessMutationsApi, dataTransferMutationsApi } from "@/api/services/connector-runtime";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { RuntimeCapabilityNotice, RuntimeExecutionLogPanel } from "@/components/runtime/RuntimeSupport";
import { createRuntimeExecutionLog, runtimeCapabilities, type RuntimeExecutionLogEntry } from "@/lib/runtime-capabilities";
import { getApiErrorSummary } from "@/lib/provider-flow-diagnostics";
import { TransferPreviewDialog } from "@/components/transfer/TransferPreviewDialog";

const TransferMonitor = () => {
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 1000 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: monitoringsData, isLoading: loadingMonitorings, refetch: refetchMonitorings } = useMonitorings(domainId, { limit: 50 });
  const { data: historyProcessesData, isLoading: loadingHistory, refetch: refetchHistory } = useTransferProcessesHistory(domainId, { limit: 50 });
  const { data: activeProcessesData, isLoading: loadingActive, refetch: refetchActive } = useTransferProcessesActive(domainId, { limit: 50 });
  const historyProcesses = historyProcessesData?.data ?? [];
  const activeProcesses = activeProcessesData?.data ?? [];
  const transferProcesses = historyProcesses.length > 0 ? historyProcesses : activeProcesses;
  const usingHistoryFallback = historyProcesses.length === 0;

  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const selectedTransferProcessId = selectedProcessId || transferProcesses[0]?.id || "";
  const { data: processTransfersData, isLoading: loadingProcessTransfers, refetch: refetchProcessTransfers } = useDataTransfersByProcess(domainId, selectedTransferProcessId, { limit: 50 });
  const { data: domainTransfersData, isLoading: loadingDomainTransfers, refetch: refetchDomainTransfers } = useDataTransfers(domainId, { limit: 50 });

  const { hasPermission } = useAuth();
  const canManageTransfer = hasPermission("transfer.manage");
  const qc = useQueryClient();
  const { data: agreementsData } = useAgreements(domainId, { limit: 50 });
  const agreements = agreementsData?.data ?? [];
  const { data: participantsData } = useParticipants({ limit: 100 });
  const participants = participantsData?.data ?? [];
  const { data: datasetsData } = useDatasets(domainId, { limit: 100 });
  const datasetOptions = datasetsData?.data ?? [];

  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeExecutionLogEntry[]>([]);
  const pushLog = (entry: RuntimeExecutionLogEntry) => setRuntimeLogs((prev) => [entry, ...prev].slice(0, 10));

  // ── Transfer preview dialog state ─────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewEndpoint, setPreviewEndpoint] = useState("");
  const [previewDuration, setPreviewDuration] = useState(0);
  const openPreview = (title: string, endpoint: string, data: unknown, duration: number) => {
    setPreviewTitle(title);
    setPreviewEndpoint(endpoint);
    setPreviewData(data);
    setPreviewDuration(duration);
    setPreviewOpen(true);
  };

  const [initOpen, setInitOpen] = useState(false);
  const [initForm, setInitForm] = useState({
    agreement_id: "",
    data_asset_ids: "",
    transfer_protocol: "HTTPS",
    encryption_method: "TLS_1_3",
    initiator_id: "",
    receiver_id: "",
    chunk_size: "",
    total_size: "",
  });

  const processTransfers = processTransfersData?.data ?? [];
  const domainTransfers = domainTransfersData?.data ?? [];
  const transfers = selectedTransferProcessId ? processTransfers : domainTransfers;

  const handleRefresh = () => {
    refetchHistory();
    refetchActive();
    refetchMonitorings();
    refetchProcessTransfers();
    refetchDomainTransfers();
  };

  const initiateTransfer = useMutation({
    mutationFn: () => {
      (initiateTransfer as any)._t0 = performance.now();
      return transferProcessMutationsApi.initiate(domainId, {
        agreement_id: initForm.agreement_id,
        data_asset_ids: initForm.data_asset_ids.split(",").map((item) => item.trim()).filter(Boolean),
        transfer_protocol: initForm.transfer_protocol,
        encryption_method: initForm.encryption_method,
        initiator_id: initForm.initiator_id,
        receiver_id: initForm.receiver_id,
        ...(initForm.chunk_size ? { chunk_size: Number(initForm.chunk_size) } : {}),
        ...(initForm.total_size ? { total_size: Number(initForm.total_size) } : {}),
      });
    },
    onSuccess: (data) => {
      const dur = Math.round(performance.now() - ((initiateTransfer as any)._t0 || 0));
      qc.invalidateQueries({ queryKey: ["transfer-processes"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Initiate transfer process", "success", "Transfer process initiated successfully."));
      toast.success("Transfer process initiated");
      setInitOpen(false);
      openPreview("Initiate Transfer Result", `POST /${domainId}/transfer-processes`, data, dur);
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Initiate failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Initiate transfer process", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const negotiate = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.negotiate(domainId, id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["transfer-processes"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Negotiate transfer process", "success", "Transfer process negotiated."));
      toast.success("Transfer process negotiated");
      openPreview("Negotiate Result", `PUT /${domainId}/transfer-processes/${id}/negotiate`, data, 0);
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Negotiate failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Negotiate transfer process", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const execute = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.execute(domainId, id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["transfer-processes"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Execute transfer process", "success", "Transfer process executed."));
      toast.success("Transfer process executed");
      openPreview("Execute Result", `PUT /${domainId}/transfer-processes/${id}/execute`, data, 0);
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Execute failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Execute transfer process", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const completeProcess = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.complete(domainId, id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["transfer-processes"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Complete transfer process", "success", "Transfer process completed."));
      toast.success("Transfer process completed");
      openPreview("Complete Result", `PUT /${domainId}/transfer-processes/${id}/complete`, data, 0);
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Complete failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Complete transfer process", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const failProcess = useMutation({
    mutationFn: (id: string) => transferProcessMutationsApi.fail(domainId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfer-processes"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Fail transfer process", "success", "Transfer process marked failed."));
      toast.success("Transfer process marked failed");
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Fail action failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.transferProcessMutations, "Fail transfer process", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const startChunk = useMutation({
    mutationFn: (id: string) => dataTransferMutationsApi.start(domainId, id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["data-transfer-runtime"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.dataTransferMutations, "Start data transfer", "success", "Data transfer started."));
      toast.success("Chunk transfer started");
      openPreview("Start Chunk Result", `PUT /${domainId}/data-transfers/${id}/start`, data, 0);
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Start failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.dataTransferMutations, "Start data transfer", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const completeChunk = useMutation({
    mutationFn: (id: string) => dataTransferMutationsApi.complete(domainId, id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ["data-transfer-runtime"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.dataTransferMutations, "Complete data transfer", "success", "Data transfer completed."));
      toast.success("Chunk transfer completed");
      openPreview("Complete Chunk Result", `PUT /${domainId}/data-transfers/${id}/complete`, data, 0);
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Complete failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.dataTransferMutations, "Complete data transfer", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const failChunk = useMutation({
    mutationFn: (id: string) => dataTransferMutationsApi.fail(domainId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-transfer-runtime"] });
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.dataTransferMutations, "Fail data transfer", "success", "Data transfer marked failed."));
      toast.success("Chunk transfer marked failed");
    },
    onError: (error: any) => {
      const summary = getApiErrorSummary(error, "Fail failed");
      pushLog(createRuntimeExecutionLog(runtimeCapabilities.dataTransferMutations, "Fail data transfer", "error", summary.detail));
      toast.error(summary.title, { description: summary.detail });
    },
  });

  const monitorings = monitoringsData?.data ?? [];
  const processStates = useMemo(() => {
    return transferProcesses.reduce<Record<string, number>>((accumulator, process) => {
      accumulator[process.state] = (accumulator[process.state] || 0) + 1;
      return accumulator;
    }, {});
  }, [transferProcesses]);

  return (
    <V2PageShell title="Transfer Monitor" subtitle="Runtime monitor with safe fallback from broken history endpoint to active processes and domain transfers." status="Live API">
      <RuntimeCapabilityNotice capability={runtimeCapabilities.transferHistory} />
      <RuntimeCapabilityNotice capability={runtimeCapabilities.transferProcessMutations} />
      <RuntimeCapabilityNotice capability={runtimeCapabilities.dataTransferMutations} />
      {usingHistoryFallback && (
        <Alert>
          <AlertTitle>History endpoint sedang fallback</AlertTitle>
          <AlertDescription>
            <code>/transfer-processes/history</code> rusak di backend, jadi halaman ini baca process dari <code>/transfer-processes/active</code>. Kalau process kosong, transfer table tetap fallback ke <code>/data-transfers</code> domain scope.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">History broken uses fallback. Mutations remain live.</p>
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
        <Button size="sm" className="gap-2" disabled={!canManageTransfer || agreements.length === 0} onClick={() => setInitOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Initiate Transfer
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard title="Transfer Processes" value={loadingHistory && loadingActive ? "..." : transferProcesses.length} subtitle={usingHistoryFallback ? "Fallback from active endpoint" : "History endpoint"} icon={Activity} trend="up" />
        <MetricCard title="Transfer Records" value={selectedTransferProcessId ? (loadingProcessTransfers ? "..." : transfers.length) : (loadingDomainTransfers ? "..." : transfers.length)} subtitle={selectedTransferProcessId ? "By transfer process" : "Fallback domain transfers"} icon={Database} trend="up" />
        <MetricCard title="Active States" value={Object.keys(processStates).length || "-"} subtitle="Distinct runtime states" icon={Activity} trend="neutral" />
        <MetricCard title="Monitoring Configs" value={loadingMonitorings ? "..." : monitorings.length} subtitle="Supplemental monitoring configs" icon={Layers} trend="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Transfer Processes</CardTitle>
            <CardDescription>{usingHistoryFallback ? "Fallback from /transfer-processes/active" : "Primary history source"}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Process ID", "State", "Started", "Completed", "Actions"]} isLoading={!domainId || (loadingHistory && loadingActive)}>
              {transferProcesses.length > 0 ? transferProcesses.map((process) => (
                <tr key={process.id} className={`cursor-pointer transition-colors hover:bg-muted/20 ${process.id === selectedTransferProcessId ? "bg-muted/30" : ""}`} onClick={() => setSelectedProcessId(process.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{process.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{process.state}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.started_at ? new Date(process.started_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.completed_at ? new Date(process.completed_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
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
                    {process.error_message ? <p className="mt-1 text-[10px] text-red-500">err: {process.error_message}</p> : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No transfer processes available" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Transfer Records</CardTitle>
            <CardDescription>{selectedTransferProcessId ? "Chunk-level records for selected process" : "Fallback to domain-scoped /data-transfers"}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={selectedTransferProcessId ? ["Chunk", "State", "Size", "Transferred", "Actions"] : ["Transfer", "Status", "From", "Agreement", "Actions"]} isLoading={!domainId || (selectedTransferProcessId ? loadingProcessTransfers : loadingDomainTransfers)}>
              {transfers.length > 0 ? transfers.map((transfer: any) => (
                <tr key={transfer.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">{selectedTransferProcessId ? `${transfer.chunk_sequence}/${transfer.total_chunks}` : (transfer.name || `Transfer ${transfer.id}`)}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{selectedTransferProcessId ? transfer.state : transfer.status}</Badge></td>
                  <td className="px-4 py-3 text-sm">{selectedTransferProcessId ? transfer.chunk_size : (transfer.from || "-")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{selectedTransferProcessId ? (transfer.transferred_at ? new Date(transfer.transferred_at).toLocaleString() : "-") : (transfer.agreement_id || "-")}</td>
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
                    {transfer.error_message || transfer.errorMessage ? <p className="mt-1 text-[10px] text-red-500">err: {transfer.error_message || transfer.errorMessage}</p> : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{selectedTransferProcessId ? "No data transfer rows for selected process" : "No domain transfer fallback rows"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Monitoring Supplements</CardTitle>
          <CardDescription>Monitoring remains supplemental for audit logging, compliance, retention, and realtime alerts.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Participant", "Log Enabled", "Retention", "Compliance", "Realtime"]} isLoading={!domainId || loadingMonitorings}>
            {monitorings.length > 0 ? monitorings.map((monitoring) => (
              <tr key={monitoring.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{monitoring.participant_id.slice(0, 8)}...</td>
                <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{monitoring.log.enabled ? "Enabled" : "Disabled"}</Badge></td>
                <td className="px-4 py-3 text-sm">{monitoring.log.retention} days</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{monitoring.compliance.join(", ") || "-"}</td>
                <td className="px-4 py-3 text-sm">{monitoring.notification.realtime ? "Realtime" : "Off"}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No monitoring records found" : "Select a domain"}</td></tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <RuntimeExecutionLogPanel title="Runtime Action Log" entries={runtimeLogs} />

      <Dialog open={initOpen} onOpenChange={setInitOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Initiate Transfer Process</DialogTitle>
            <DialogDescription>POST <code className="rounded bg-muted px-1 text-xs">/{`{domain_id}`}/transfer-processes</code> - transfer initiation endpoint is live.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Agreement *</Label>
              <Select value={initForm.agreement_id} onValueChange={(value) => setInitForm({ ...initForm, agreement_id: value })}>
                <SelectTrigger><SelectValue placeholder="Pick active agreement" /></SelectTrigger>
                <SelectContent>
                  {agreements.map((agreement: any) => (<SelectItem key={agreement.id} value={agreement.id}>{agreement.id.slice(0, 8)} - {agreement.status}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Data Assets *</Label>
              {datasetOptions.length === 0 ? (
                <p className="text-xs text-amber-500">No datasets in this domain - register one first.</p>
              ) : (
                <div className="max-h-32 overflow-auto rounded-md border border-border/60 p-2">
                  <div className="flex flex-wrap gap-2">
                    {datasetOptions.map((dataset: any) => {
                      const ids = initForm.data_asset_ids.split(",").map((item) => item.trim()).filter(Boolean);
                      const checked = ids.includes(dataset.id);
                      return (
                        <label key={dataset.id} className="flex items-center gap-2 rounded border border-border/40 px-2 py-1 text-xs">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = new Set(ids);
                              if (event.target.checked) next.add(dataset.id);
                              else next.delete(dataset.id);
                              setInitForm({ ...initForm, data_asset_ids: Array.from(next).join(",") });
                            }}
                          />
                          {dataset.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Transfer Protocol *</Label>
                <Select value={initForm.transfer_protocol} onValueChange={(value) => setInitForm({ ...initForm, transfer_protocol: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HTTPS">HTTPS</SelectItem>
                    <SelectItem value="HTTP">HTTP</SelectItem>
                    <SelectItem value="FTP">FTP</SelectItem>
                    <SelectItem value="SFTP">SFTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Encryption *</Label>
                <Select value={initForm.encryption_method} onValueChange={(value) => setInitForm({ ...initForm, encryption_method: value })}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Initiator *</Label>
                <Select value={initForm.initiator_id} onValueChange={(value) => setInitForm({ ...initForm, initiator_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select consumer participant" /></SelectTrigger>
                  <SelectContent>
                    {participants.filter((participant: any) => participant.organization_type !== "ENTERPRISE").map((participant: any) => (
                      <SelectItem key={participant.id} value={participant.id}>{participant.organization_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Receiver *</Label>
                <Select value={initForm.receiver_id} onValueChange={(value) => setInitForm({ ...initForm, receiver_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select provider participant" /></SelectTrigger>
                  <SelectContent>
                    {participants.filter((participant: any) => participant.organization_type === "ENTERPRISE").map((participant: any) => (
                      <SelectItem key={participant.id} value={participant.id}>{participant.organization_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitOpen(false)}>Cancel</Button>
            <Button onClick={() => initiateTransfer.mutate()} disabled={initiateTransfer.isPending}>
              {initiateTransfer.isPending ? "Initiating..." : "Initiate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransferPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewTitle}
        description="Response dari backend setelah aksi transfer."
        endpoint={previewEndpoint}
        duration={previewDuration}
        data={previewData}
      />
    </V2PageShell>
  );
};

export default TransferMonitor;
