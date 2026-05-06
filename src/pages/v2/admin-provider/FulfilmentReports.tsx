// src/pages/v2/admin-provider/FulfilmentReports.tsx
import { useState } from "react";
import { Activity, Layers, Database, Download } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useMonitorings } from "@/api/hooks/useMonitorings";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useDataTransfersByProcess, useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const toCsv = (rows: Record<string, any>[]): string => {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  const escape = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(",")));
  return lines.join("\n");
};

const downloadFile = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const FulfilmentReports = () => {
  const { hasPermission } = useAuth();
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 50 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: monitoringsData, isLoading: loadingMonitorings } = useMonitorings(domainId, { limit: 50 });
  const { data: datasetsData, isLoading: loadingDatasets } = useDatasets(domainId, { limit: 50 });
  const { data: transferProcessesData, isLoading: loadingProcesses } = useTransferProcessesHistory(domainId, { limit: 50 });
  const transferProcesses = transferProcessesData?.data ?? [];
  const latestProcessId = transferProcesses[0]?.id ?? "";
  const { data: transfersData, isLoading: loadingTransfers } = useDataTransfersByProcess(domainId, latestProcessId, { limit: 50 });

  const monitorings = monitoringsData?.data ?? [];
  const datasets = datasetsData?.data ?? [];
  const transfers = transfersData?.data ?? [];

  const canExport = hasPermission("reports.generate") || hasPermission("fulfilment.manage");

  const handleExport = (format: "csv" | "json") => {
    if (!domainId) {
      toast.error("Select a domain first");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const domainCode = domains.find((d) => d.id === domainId)?.code || domainId.slice(0, 8);
    const baseName = `fulfilment-report_${domainCode}_${stamp}`;

    if (format === "json") {
      const payload = {
        generated_at: new Date().toISOString(),
        domain_id: domainId,
        transfer_processes: transferProcesses,
        latest_transfers: transfers,
        datasets,
        monitorings,
      };
      downloadFile(`${baseName}.json`, JSON.stringify(payload, null, 2), "application/json");
      toast.success("JSON report downloaded");
      return;
    }

    const sections = [
      `# Transfer Processes`,
      toCsv(transferProcesses as any[]),
      ``,
      `# Latest Transfer Chunks`,
      toCsv(transfers as any[]),
      ``,
      `# Datasets`,
      toCsv(datasets as any[]),
      ``,
      `# Monitoring`,
      toCsv(monitorings as any[]),
    ];
    downloadFile(`${baseName}.csv`, sections.join("\n"), "text/csv");
    toast.success("CSV report downloaded");
  };

  return (
    <V2PageShell title="Fulfilment Reports" subtitle="Provider reporting now prioritizes transfer processes and data transfers, with monitoring as supplemental evidence." status="Live API">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Reports remain domain-scoped for provider fulfilment</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder={loadingDomains ? "Loading..." : "Select domain"} /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (<SelectItem key={domain.id} value={domain.id}>{domain.name} ({domain.code})</SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-2" disabled={!canExport || !domainId} onClick={() => handleExport("csv")}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button size="sm" className="gap-2" disabled={!canExport || !domainId} onClick={() => handleExport("json")}>
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard title="Datasets Provided" value={loadingDatasets ? "..." : datasets.length} subtitle="Registered provider datasets" icon={Database} trend="up" />
        <MetricCard title="Transfer Processes" value={loadingProcesses ? "..." : transferProcesses.length} subtitle="Primary fulfilment history" icon={Activity} trend="up" />
        <MetricCard title="Transfer Records" value={loadingTransfers ? "..." : transfers.length} subtitle="Chunk-level transfer evidence" icon={Activity} trend="up" />
        <MetricCard title="Monitoring Configs" value={loadingMonitorings ? "..." : monitorings.length} subtitle="Supplemental audit/compliance config" icon={Layers} trend="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5 text-primary" />Transfer Processes</CardTitle>
            <CardDescription>Primary source for provider fulfilment state and transfer lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Process", "State", "Started", "Completed"]} isLoading={!domainId || loadingProcesses}>
              {transferProcesses.length > 0 ? transferProcesses.map((process) => (
                <tr key={process.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{process.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{process.state}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.started_at ? new Date(process.started_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{process.completed_at ? new Date(process.completed_at).toLocaleString() : "—"}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">{domainId ? "No transfer processes" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-5 w-5 text-primary" />Latest Transfer Chunks</CardTitle>
            <CardDescription>Chunk-level records for the newest transfer process in this domain</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Chunk", "State", "Bytes", "Transferred"]} isLoading={!domainId || loadingTransfers}>
              {transfers.length > 0 ? transfers.map((transfer) => (
                <tr key={transfer.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">{transfer.chunk_sequence}/{transfer.total_chunks}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{transfer.state}</Badge></td>
                  <td className="px-4 py-3 text-sm">{transfer.chunk_size}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.transferred_at ? new Date(transfer.transferred_at).toLocaleString() : "—"}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">{latestProcessId ? "No transfer chunks for the latest process" : "No transfer process selected"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-5 w-5 text-primary" />Datasets Provided</CardTitle>
            <CardDescription>Registered provider datasets remain useful fulfilment context</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Name", "Protocol", "Status"]} isLoading={!domainId || loadingDatasets}>
              {datasets.length > 0 ? datasets.map((dataset) => (
                <tr key={dataset.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{dataset.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{dataset.endpoint?.protocol || "—"}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{dataset.status}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">{domainId ? "No datasets" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5 text-primary" />Monitoring Supplements</CardTitle>
            <CardDescription>Monitoring remains available for logging, retention, and realtime notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Participant", "Log", "Realtime"]} isLoading={!domainId || loadingMonitorings}>
              {monitorings.length > 0 ? monitorings.map((monitoring) => (
                <tr key={monitoring.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{monitoring.participant_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{monitoring.log.enabled ? `${monitoring.log.retention}d` : "Off"}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{monitoring.notification.realtime ? "Yes" : "No"}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">{domainId ? "No monitoring records" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>
    </V2PageShell>
  );
};

export default FulfilmentReports;
