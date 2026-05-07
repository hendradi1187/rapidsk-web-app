// src/pages/v2/admin-consumer/AuditLog.tsx
// Audit log view — backed by /api/v1/audit-compliance/audit-logs (read-only).
// Backend writes audit entries automatically (append-only); UI is read-only.

import { useMemo, useState } from "react";
import { ClipboardCheck, Filter, Download, RefreshCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditLogsApi } from "@/api/services/audit-log";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "border-emerald-500/40 text-emerald-500",
  FAILED: "border-red-500/40 text-red-500",
  PENDING: "border-amber-500/40 text-amber-500",
  INFO: "border-blue-500/40 text-blue-500",
};

const AuditLog = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => auditLogsApi.list({ limit: 200 }),
  });
  const events = data?.data ?? [];

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const actionTypes = useMemo(() => Array.from(new Set(events.map((e) => e.action_type))).sort(), [events]);

  const filtered = useMemo(() => events.filter((e) => {
    if (actionFilter !== "all" && e.action_type !== actionFilter) return false;
    if (search) {
      const hay = `${e.action_type} ${e.actor_id} ${e.resource_id} ${e.status}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [events, actionFilter, search]);

  const counts = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: events.length,
      today: events.filter((e) => new Date(e.timestamp).toDateString() === today).length,
      failed: events.filter((e) => /fail|error/i.test(e.status)).length,
    };
  }, [events]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["id", "timestamp", "actor_id", "action_type", "resource_id", "status"];
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
    <V2PageShell title="Audit Log" subtitle="Read-only audit trail of all platform actions." status="Live API">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Events" value={isLoading ? "..." : counts.total} subtitle="All audit entries" icon={ClipboardCheck} trend="up" />
        <MetricCard title="Today" value={isLoading ? "..." : counts.today} subtitle="Last 24h activity" icon={Filter} trend="neutral" />
        <MetricCard title="Failed" value={isLoading ? "..." : counts.failed} subtitle="Failed outcomes" icon={ClipboardCheck} trend={counts.failed > 0 ? "down" : "up"} />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Audit Trail</CardTitle>
            <CardDescription>From <code className="rounded bg-muted px-1 text-xs">/api/v1/audit-compliance/audit-logs</code> — append-only, backend-managed.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor/resource..." className="w-60" />
            <Button size="sm" variant="outline" className="gap-2" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />Refresh
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable headers={["When", "Action", "Actor", "Resource", "Status"]} isLoading={isLoading}>
            {filtered.length > 0 ? filtered.map((e) => (
              <tr key={e.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.action_type}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.actor_id?.slice(0, 12) || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.resource_id?.slice(0, 12) || "—"}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[e.status] || ""}`}>{e.status}</Badge></td>
              </tr>
            )) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No audit events match the filter.</td></tr>)}
          </DataTable>
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default AuditLog;
