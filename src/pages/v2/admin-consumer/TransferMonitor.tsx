// src/pages/v2/admin-consumer/TransferMonitor.tsx
import { useMemo, useState } from "react";
import { Activity, Layers, Database, RefreshCcw, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useMonitorings } from "@/api/hooks/useMonitorings";
import { useDataTransfersByProcess, useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";

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
            <DataTable headers={["Process ID", "State", "Started", "Completed", "Error"]} isLoading={!domainId || loadingProcesses}>
              {transferProcesses.length > 0 ? transferProcesses.map((process) => (
                <tr key={process.id} className={`cursor-pointer transition-colors hover:bg-muted/20 ${process.id === selectedTransferProcessId ? "bg-muted/30" : ""}`} onClick={() => setSelectedProcessId(process.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{process.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{process.state}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.started_at ? new Date(process.started_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.completed_at ? new Date(process.completed_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.error_message || "—"}</td>
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
            <DataTable headers={["Chunk", "State", "Size", "Transferred", "Error"]} isLoading={!domainId || loadingTransfers}>
              {transfers.length > 0 ? transfers.map((transfer) => (
                <tr key={transfer.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">{transfer.chunk_sequence}/{transfer.total_chunks}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{transfer.state}</Badge></td>
                  <td className="px-4 py-3 text-sm">{transfer.chunk_size}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.transferred_at ? new Date(transfer.transferred_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.error_message || "—"}</td>
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
