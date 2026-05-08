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
import { useDataTransfers } from "@/api/hooks/useDataTransfers";
import { useContracts } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { complianceChecklistsApi } from "@/api/services/audit-compliance";
import { BackendPendingBadge } from "@/components/dev/BackendPendingBadge";
import { RuntimeCapabilityNotice } from "@/components/runtime/RuntimeSupport";
import { runtimeCapabilities } from "@/lib/runtime-capabilities";
import { toast } from "sonner";

const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Array.from(rows.reduce((set, row) => { Object.keys(row).forEach((key) => set.add(key)); return set; }, new Set<string>()));
  const escape = (value: any) => {
    if (value === null || value === undefined) return "";
    const stringified = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\n]/.test(stringified) ? `"${stringified.replace(/"/g, '""')}"` : stringified;
  };
  const lines = [headers.join(",")];
  rows.forEach((row) => lines.push(headers.map((header) => escape(row[header])).join(",")));
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
  const { data: domainsData } = useAllDomains({ limit: 1000 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: contractsData, isLoading: loadingContracts } = useContracts(domainId, { limit: 100 });
  const { data: agreementsData, isLoading: loadingAgreements } = useAgreements(domainId, { limit: 100 });
  const { data: transfersData, isLoading: loadingTransfers } = useDataTransfers(domainId, { limit: 100 });
  const { data: checklistsData, isLoading: loadingChecklists } = useQuery({
    queryKey: ["compliance-checklists", "report"],
    queryFn: () => complianceChecklistsApi.list({ limit: 100 }),
  });

  const contracts = contractsData?.data ?? [];
  const agreements = agreementsData?.data ?? [];
  const transfers = transfersData?.data ?? [];
  const checklists = checklistsData?.data ?? [];

  const contractByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    contracts.forEach((contract) => { map[contract.status] = (map[contract.status] || 0) + 1; });
    return map;
  }, [contracts]);

  const agreementByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    agreements.forEach((agreement) => { map[agreement.status] = (map[agreement.status] || 0) + 1; });
    return map;
  }, [agreements]);

  const transferStats = useMemo(() => {
    const total = transfers.length;
    const completed = transfers.filter((transfer: any) => transfer.status === "completed").length;
    const failed = transfers.filter((transfer: any) => transfer.status === "failed" || transfer.errorMessage).length;
    const inFlight = total - completed - failed;
    return { total, completed, failed, inFlight, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [transfers]);

  const complianceStats = useMemo(() => {
    const total = checklists.length;
    const compliant = checklists.filter((checklist) => checklist.status === "COMPLIANT").length;
    const nonCompliant = checklists.filter((checklist) => checklist.status === "NON-COMPLIANT").length;
    const inReview = checklists.filter((checklist) => checklist.status === "IN_REVIEW").length;
    return { total, compliant, nonCompliant, inReview, rate: total > 0 ? Math.round((compliant / total) * 100) : 0 };
  }, [checklists]);

  const handleExportTransferReport = () => {
    const rows = transfers.map((transfer: any) => ({
      transfer_id: transfer.id,
      name: transfer.name,
      status: transfer.status,
      from: transfer.from,
      to: transfer.to,
      agreement_id: transfer.agreement_id || "",
      updated_at: transfer.updated_at || transfer.lastSync || "",
      error: transfer.errorMessage || "",
    }));
    downloadCsv(`transfer-report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportContractReport = () => {
    const rows = contracts.map((contract: any) => ({
      contract_id: contract.id,
      name: contract.name,
      status: contract.status,
      consumer_id: contract.consumer_id,
      provider_id: contract.provider_id,
      datasets_count: contract.datasets?.length ?? 0,
      created_at: contract.created_at,
    }));
    downloadCsv(`contract-report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportComplianceReport = () => {
    const rows = checklists.map((checklist) => ({
      participant_id: checklist.participant_id,
      framework: checklist.framework,
      control_id: checklist.control_id,
      control_name: checklist.control_name,
      status: checklist.status,
      checked_at: checklist.checked_at,
      notes: checklist.notes || "",
    }));
    downloadCsv(`compliance-report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <V2PageShell title="Reports & Analytics" subtitle="Client-side reports using live list endpoints and safe fallback where dedicated report endpoints do not exist." status="Preview only">
      <BackendPendingBadge variant="block" message="Endpoint /reports/aggregate belum tersedia. Halaman ini sengaja agregasi client-side dari contracts, agreements, data-transfers, dan compliance-checklists." />
      <RuntimeCapabilityNotice capability={runtimeCapabilities.contractTransferReport} />

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Transfer report uses domain-scoped data transfers because contract-scoped backend report is missing.</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select domain" /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (<SelectItem key={domain.id} value={domain.id}>{domain.name} ({domain.code})</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Contracts" value={loadingContracts ? "..." : contracts.length} subtitle="In selected domain" icon={FileText} trend="up" />
        <MetricCard title="Active Agreements" value={loadingAgreements ? "..." : (agreementByStatus.ACTIVE || 0) + (agreementByStatus.APPROVED || 0)} subtitle="ACTIVE + APPROVED" icon={FileBarChart} trend="up" />
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
                <CardTitle className="text-base">Transfer Summary</CardTitle>
                <CardDescription>Domain-scoped fallback from <code>/data-transfers</code>.</CardDescription>
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
                <DataTable headers={["Transfer", "Status", "From", "To", "Agreement"]} isLoading={loadingTransfers}>
                  {transfers.length > 0 ? transfers.slice(0, 20).map((transfer: any) => (
                    <tr key={transfer.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{String(transfer.id).slice(0, 8)}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{transfer.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.from || "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.to || "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.agreement_id || "-"}</td>
                    </tr>
                  )) : (<tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No transfer rows.</td></tr>)}
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
                <CardDescription>Status distribution from live contract endpoint.</CardDescription>
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
                <DataTable headers={["Name", "Status", "Datasets", "Policies", "Created"]} isLoading={loadingContracts}>
                  {contracts.length > 0 ? contracts.map((contract: any) => (
                    <tr key={contract.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{contract.name}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{contract.status}</Badge></td>
                      <td className="px-4 py-3 text-sm">{contract.datasets?.length ?? 0}</td>
                      <td className="px-4 py-3 text-sm">{contract.contract_policies?.length ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(contract.created_at).toLocaleDateString()}</td>
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
                <DataTable headers={["Framework", "Control", "Participant", "Status", "Checked"]} isLoading={loadingChecklists}>
                  {checklists.length > 0 ? checklists.slice(0, 20).map((checklist) => (
                    <tr key={checklist.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{checklist.framework}</Badge></td>
                      <td className="px-4 py-3 text-sm">{checklist.control_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{checklist.participant_id.slice(0, 8)}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{checklist.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{checklist.checked_at ? new Date(checklist.checked_at).toLocaleDateString() : "-"}</td>
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
