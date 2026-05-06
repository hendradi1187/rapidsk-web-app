// src/pages/v2/admin-consumer/AuditLog.tsx
// Phase 2 — Audit log derived from transfer process history (real data) +
// stubbed event-stream for actions like login, contract.create, agreement.approve.

import { useMemo, useState } from "react";
import { ClipboardCheck, Filter, Download, Layers, RefreshCcw } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useTransferProcessesHistory } from "@/api/hooks/useTransferRuntime";
import { BackendPendingBadge } from "@/components/dev/BackendPendingBadge";
import { toast } from "sonner";

type AuditCategory = "AUTH" | "CATALOG" | "CONTRACT" | "AGREEMENT" | "TRANSFER" | "ADMIN";

interface AuditEvent {
  id: string;
  category: AuditCategory;
  action: string;
  actor: string;
  resource_id: string | null;
  outcome: "SUCCESS" | "FAILED";
  occurred_at: string;
  metadata: Record<string, any>;
  source: "live" | "stub";
}

const CATEGORY_COLORS: Record<AuditCategory, string> = {
  AUTH: "border-blue-500/40 text-blue-500",
  CATALOG: "border-violet-500/40 text-violet-500",
  CONTRACT: "border-amber-500/40 text-amber-500",
  AGREEMENT: "border-purple-500/40 text-purple-500",
  TRANSFER: "border-emerald-500/40 text-emerald-500",
  ADMIN: "border-slate-400/40 text-slate-400",
};

const STORAGE_KEY = "v2-audit-stub-events";

const loadStubEvents = (): AuditEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuditEvent[]) : [];
  } catch {
    return [];
  }
};

const AuditLog = () => {
  const { data: domainsData } = useAllDomains({ limit: 50 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: processesData, isLoading, refetch } = useTransferProcessesHistory(domainId, { limit: 100 });
  const processes = processesData?.data ?? [];
  const [stubEvents, setStubEvents] = useState<AuditEvent[]>(loadStubEvents);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const liveEvents: AuditEvent[] = useMemo(() => processes.map((p) => ({
    id: p.id,
    category: "TRANSFER" as AuditCategory,
    action: `transfer_process.${(p.state || "unknown").toLowerCase()}`,
    actor: p.id.slice(0, 8),
    resource_id: p.id,
    outcome: p.error_message ? "FAILED" : "SUCCESS",
    occurred_at: p.completed_at || p.started_at || new Date().toISOString(),
    metadata: { state: p.state, error: p.error_message },
    source: "live" as const,
  })), [processes]);

  const allEvents = useMemo(() => {
    return [...liveEvents, ...stubEvents].sort((a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
  }, [liveEvents, stubEvents]);

  const filtered = useMemo(() => allEvents.filter((e) => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (search) {
      const hay = `${e.action} ${e.actor} ${e.resource_id || ""} ${JSON.stringify(e.metadata)}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [allEvents, filterCategory, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: allEvents.length, failed: 0, today: 0 };
    const today = new Date().toDateString();
    allEvents.forEach((e) => {
      if (e.outcome === "FAILED") c.failed += 1;
      if (new Date(e.occurred_at).toDateString() === today) c.today += 1;
    });
    return c;
  }, [allEvents]);

  const persistStub = (next: AuditEvent[]) => {
    setStubEvents(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleEmitStub = (category: AuditCategory, action: string) => {
    const event: AuditEvent = {
      id: `stub-${Date.now()}`,
      category,
      action,
      actor: "demo-user",
      resource_id: null,
      outcome: "SUCCESS",
      occurred_at: new Date().toISOString(),
      metadata: { source: "manual-stub" },
      source: "stub",
    };
    persistStub([event, ...stubEvents]);
    toast.success(`Stub event emitted: ${action}`);
  };

  const handleClearStubs = () => {
    persistStub([]);
    toast.success("Stub events cleared");
  };

  const handleExport = () => {
    const headers = ["id", "category", "action", "actor", "resource_id", "outcome", "occurred_at", "source"];
    const lines = [headers.join(",")];
    filtered.forEach((e) => {
      lines.push(headers.map((h) => {
        const v = (e as any)[h] ?? "";
        return /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
      }).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  };

  return (
    <V2PageShell title="Audit Log" subtitle="Track auth, catalog, contract, agreement, and transfer events across the dataspace." status="Preview only">
      <BackendPendingBadge variant="block" message="Endpoint /audit/events generic belum tersedia. Untuk transfer events, halaman ini menarik dari /transfer-processes/history (live). Event auth/catalog/contract/admin di-emit ke localStorage sebagai stub sampai backend audit-event-bus ready." />

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Live transfer events scoped per domain. Stub events are global.</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select domain" /></SelectTrigger>
          <SelectContent>
            {domains.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Events" value={counts.total} subtitle="Live + stub combined" icon={ClipboardCheck} trend="up" />
        <MetricCard title="Today" value={counts.today} subtitle="Last 24h activity" icon={Filter} trend="neutral" />
        <MetricCard title="Failed" value={counts.failed} subtitle="Outcome=FAILED" icon={ClipboardCheck} trend={counts.failed > 0 ? "down" : "up"} />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Emit Stub Event</CardTitle>
          <CardDescription>Until backend is ready, manually emit demo events to populate the log.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {([
            ["AUTH", "auth.login"],
            ["AUTH", "auth.logout"],
            ["CATALOG", "schema.create"],
            ["CONTRACT", "contract.create"],
            ["AGREEMENT", "agreement.approve"],
            ["AGREEMENT", "agreement.reject"],
            ["ADMIN", "participant.activate"],
          ] as const).map(([cat, act]) => (
            <Button key={act} size="sm" variant="outline" onClick={() => handleEmitStub(cat, act)}>
              + {act}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="border-destructive/40 text-destructive ml-auto" onClick={handleClearStubs}>
            Clear stub events
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Audit Trail</CardTitle>
            <CardDescription>Filter by category or search by action / actor / resource.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(Object.keys(CATEGORY_COLORS) as AuditCategory[]).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-60" />
            <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable headers={["When", "Category", "Action", "Actor", "Resource", "Outcome", "Source"]} isLoading={isLoading}>
            {filtered.length > 0 ? filtered.map((e) => (
              <tr key={e.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[e.category]}`}>{e.category}</Badge></td>
                <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                <td className="px-4 py-3 text-xs">{e.actor}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.resource_id ? e.resource_id.slice(0, 8) + "..." : "—"}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${e.outcome === "SUCCESS" ? "border-emerald-500/40 text-emerald-500" : "border-red-500/40 text-red-500"}`}>{e.outcome}</Badge></td>
                <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{e.source}</Badge></td>
              </tr>
            )) : (<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No audit events match the filter.</td></tr>)}
          </DataTable>
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default AuditLog;
