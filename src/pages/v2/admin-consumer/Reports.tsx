// src/pages/v2/admin-consumer/Reports.tsx
// Phase 5 — Reports aggregation across transfers, agreements, contracts,
// compliance. Backend: /reports/* aggregator not yet available — UI builds
// reports client-side from existing list endpoints.

import { useMemo, useState } from "react";
import { Activity, FileBarChart, Download, Layers, ShieldCheck, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useContracts } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { complianceChecklistsApi } from "@/api/services/audit-compliance";
import { BackendPendingBadge } from "@/components/dev/BackendPendingBadge";
import { toast } from "sonner";

const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>()));
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => escape(r[h])).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success("Report downloaded");
};

const Reports = () => {
  const { data: domainsData } = useAllDomains({ limit: 50 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: contractsData, isLoading: loadingC } = useContracts(domainId, { limit: 100 });
  const { data: agreementsData, isLoading: loadingA } = useAgreements(domainId, { limit: 100 });
  const { data: processesData, isLoading: loadingP } = useTransferProcessesHistory(domainId, { limit: 100 });
  const { data: checklistsData, isLoading: loadingCL } = useQuery({
    queryKey: ["compliance-checklists", "report"],
    queryFn: () => complianceChecklistsApi.list({ limit: 100 }),
  });

  const contracts = contractsData?.data ?? [];
  const agreements = agreementsData?.data ?? [];
  const processes = processesData?.data ?? [];
  const checklists = checklistsData?.data ?? [];

  // ── Aggregations ────────────────────────────────────────────────────────
  const contractByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    contracts.forEach((c) => { map[c.status] = (map[c.status] || 0) + 1; });
    return map;
  }, [contracts]);

  const agreementByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    agreements.forEach((a) => { map[a.status] = (map[a.status] || 0) + 1; });
    return map;
  }, [agreements]);

  const transferStats = useMemo(() => {
    const total = processes.length;
    const completed = processes.filter((p) => p.completed_at).length;
    const failed = processes.filter((p) => p.error_message).length;
    const inFlight = total - completed - failed;
    return { total, completed, failed, inFlight, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [processes]);

  const complianceStats = useMemo(() => {
    const total = checklists.length;
    const compliant = checklists.filter((c) => c.status === "COMPLIANT").length;
    const nonCompliant = checklists.filter((c) => c.status === "NON-COMPLIANT").length;
    const inReview = checklists.filter((c) => c.status === "IN_REVIEW").length;
    return { total, compliant, nonCompliant, inReview, rate: total > 0 ? Math.round((compliant / total) * 100) : 0 };
  }, [checklists]);

  const handleExportTransferReport = () => {
    const rows = processes.map((p) => ({
      process_id: p.id,
      state: p.state,
      started_at: p.started_at,
      completed_at: p.completed_at,
      error: p.error_message || "",
    }));
    downloadCsv(`transfer-report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportContractReport = () => {
    const rows = contracts.map((c: any) => ({
      contract_id: c.id,
      name: c.name,
      status: c.status,
      consumer_id: c.consumer_id,
      provider_id: c.provider_id,
      datasets_count: c.datasets?.length ?? 0,
      created_at: c.created_at,
    }));
    downloadCsv(`contract-report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportComplianceReport = () => {
    const rows = checklists.map((c) => ({
      participant_id: c.participant_id,
      framework: c.framework,
      control_id: c.control_id,
      control_name: c.control_name,
      status: c.status,
      checked_at: c.checked_at,
      notes: c.notes || "",
    }));
    downloadCsv(`compliance-report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <V2PageShell title="Reports & Analytics" subtitle="Aggregated transfer, contract, agreement, and compliance reports across the dataspace." status="Preview only">
      <BackendPendingBadge variant="block" message="Endpoint /reports/aggregate untuk pre-computed report belum tersedia. Halaman ini agregasi client-side dari list endpoint yang sudah ada (contracts, agreements, transfer-processes, compliance-checklists). Cocok untuk demo + ekspor CSV." />

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Reports scoped per domain (compliance is global).</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select domain" /></SelectTrigger>
          <SelectContent>
            {domains.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Contracts" value={loadingC ? "..." : contracts.length} subtitle="In selected domain" icon={FileText} trend="up" />
        <MetricCard title="Active Agreements" value={loadingA ? "..." : (agreementByStatus.ACTIVE || 0) + (agreementByStatus.APPROVED || 0)} subtitle="ACTIVE + APPROVED" icon={FileBarChart} trend="up" />
        <MetricCard title="Transfer Success Rate" value={`${transferStats.successRate}%`} subtitle={`${transferStats.completed}/${transferStats.total} completed`} icon={Activity} trend={transferStats.successRate >= 80 ? "up" : "down"} />
        <MetricCard title="Compliance Rate" value={`${complianceStats.rate}%`} subtitle={`${complianceStats.compliant}/${complianceStats.total} compliant`} icon={ShieldCheck} trend={complianceStats.rate >= 70 ? "up" : "down"} />
      </div>

      <Tabs defaultValue="transfer">
        <TabsList>
          <TabsTrigger value="transfer">Transfer Report</TabsTrigger>
          <TabsTrigger value="contract">Contract Report</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Transfer Process Summary</CardTitle>
                <CardDescription>Per-state breakdown for the selected domain.</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={handleExportTransferReport}>
                <Download className="h-4 w-4" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-emerald-500">{transferStats.completed}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-red-500">{transferStats.failed}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Flight</p><p className="text-2xl font-bold text-amber-500">{transferStats.inFlight}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{transferStats.total}</p></CardContent></Card>
              </div>
              <div className="mt-4">
                <DataTable headers={["Process", "State", "Started", "Completed", "Error"]} isLoading={loadingP}>
                  {processes.length > 0 ? processes.slice(0, 20).map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{p.state}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.started_at ? new Date(p.started_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.completed_at ? new Date(p.completed_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.error_message || "—"}</td>
                    </tr>
                  )) : (<tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No transfer processes.</td></tr>)}
                </DataTable>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Contract Summary</CardTitle>
                <CardDescription>Status distribution + agreement state per contract.</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={handleExportContractReport}>
                <Download className="h-4 w-4" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                {Object.entries(contractByStatus).map(([status, count]) => (
                  <Card key={status}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{status}</p><p className="text-2xl font-bold">{count}</p></CardContent></Card>
                ))}
              </div>
              <div className="mt-4">
                <DataTable headers={["Name", "Status", "Datasets", "Policies", "Created"]} isLoading={loadingC}>
                  {contracts.length > 0 ? contracts.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.status}</Badge></td>
                      <td className="px-4 py-3 text-sm">{c.datasets?.length ?? 0}</td>
                      <td className="px-4 py-3 text-sm">{c.contract_policies?.length ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  )) : (<tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No contracts.</td></tr>)}
                </DataTable>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Compliance Summary</CardTitle>
                <CardDescription>Status distribution across all participants and frameworks.</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={handleExportComplianceReport}>
                <Download className="h-4 w-4" />Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Compliant</p><p className="text-2xl font-bold text-emerald-500">{complianceStats.compliant}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Non-Compliant</p><p className="text-2xl font-bold text-red-500">{complianceStats.nonCompliant}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Review</p><p className="text-2xl font-bold text-amber-500">{complianceStats.inReview}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{complianceStats.total}</p></CardContent></Card>
              </div>
              <div className="mt-4">
                <DataTable headers={["Framework", "Control", "Participant", "Status", "Checked"]} isLoading={loadingCL}>
                  {checklists.length > 0 ? checklists.slice(0, 20).map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.framework}</Badge></td>
                      <td className="px-4 py-3 text-sm">{c.control_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.participant_id.slice(0, 8)}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.checked_at ? new Date(c.checked_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  )) : (<tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No compliance entries.</td></tr>)}
                </DataTable>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </V2PageShell>
  );
};

export default Reports;
