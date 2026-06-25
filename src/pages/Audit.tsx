import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Pager } from "@/components/common/Pager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Filter,
  Download,
  Eye,
  Database,
  FileText,
  ArrowRightLeft,
  User,
  Calendar,
  Clock,
  X,
  Shield,
  Copy,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuditLogs } from "@/api/hooks/useAuditLogs";
import type { AuditLog } from "@/api/types/audit";

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Pick a sensible icon for an action string. Mengikuti pattern umum
 * (DATA_*, USER_*, DATASET_*, dll). Default ke FileText untuk yang tidak
 * dikenali. Tidak ada hardcoded enum — adapt ke whatever backend kasih.
 */
const getActionIcon = (action: string) => {
  const a = (action || "").toUpperCase();
  if (a.includes("DATA_ACCESS") || a.includes("ACCESS")) return <Eye className="w-4 h-4" />;
  if (a.includes("DATASET")) return <Database className="w-4 h-4" />;
  if (a.includes("CONTRACT")) return <FileText className="w-4 h-4" />;
  if (a.includes("TRANSFER") || a.includes("DATA_TRANSFER")) return <ArrowRightLeft className="w-4 h-4" />;
  if (a.includes("DENIED") || a.includes("FAILED") || a.includes("BLOCK")) return <Shield className="w-4 h-4" />;
  if (a.includes("LOGIN") || a.includes("LOGOUT") || a.includes("AUTH")) return <User className="w-4 h-4" />;
  if (a.includes("POLICY")) return <FileText className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

/**
 * Format timestamp untuk display di table (date + time, locale-aware).
 */
const formatTimestamp = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "")
      .slice(0, 19);
  } catch {
    return iso;
  }
};

/**
 * Extract YYYY-MM-DD prefix dari ISO timestamp untuk client-side filter by date.
 */
const datePrefix = (iso: string): string => {
  if (!iso) return "";
  const idx = iso.indexOf("T");
  if (idx === 10) return iso.slice(0, 10);
  // Coba parse jadi Date kalau format lain
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return iso.slice(0, 10);
  }
};

const Audit = () => {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(""); // YYYY-MM-DD; empty = all
  const [filterAction, setFilterAction] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // API
  const {
    data: auditLogs,
    isLoading,
    isError,
    error,
    refetch,
  } = useAuditLogs();

  const logs = auditLogs ?? [];

  // Distinct action types for filter dropdown
  const distinctActions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort();
  }, [logs]);

  // Filter
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        log.action?.toLowerCase().includes(q) ||
        log.performed_by?.toLowerCase().includes(q) ||
        log.audit_id?.toLowerCase().includes(q);
      const matchesDate = !selectedDate || datePrefix(log.timestamp) === selectedDate;
      const matchesAction = filterAction === "all" || log.action === filterAction;
      return matchesSearch && matchesDate && matchesAction;
    });
  }, [logs, searchQuery, selectedDate, filterAction]);
  const pagedLogs = useMemo(
    () => filteredLogs.slice((page - 1) * pageSize, page * pageSize),
    [filteredLogs, page, pageSize],
  );
  useEffect(() => setPage(1), [searchQuery, selectedDate, filterAction, pageSize]);

  // Stats — generalized (spec tidak punya status/category breakdown)
  const stats = useMemo(() => {
    const todayPrefix = selectedDate || new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => datePrefix(l.timestamp) === todayPrefix);
    const distinctPerformers = new Set(logs.map((l) => l.performed_by).filter(Boolean));
    return {
      totalEvents: logs.length,
      todayEvents: todayLogs.length,
      actionTypes: distinctActions.length,
      performers: distinctPerformers.size,
    };
  }, [logs, selectedDate, distinctActions]);

  const hasActiveFilters = filterAction !== "all" || !!selectedDate;
  const clearFilters = () => {
    setFilterAction("all");
    setSelectedDate("");
  };

  const handleViewLog = (log: AuditLog) => {
    setSelectedLog(log);
    setIsViewDialogOpen(true);
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Export filtered logs as CSV / JSON
  const handleExport = (format: "csv" | "json") => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export");
      return;
    }

    const dataToExport = filteredLogs.map((log) => ({
      audit_id: log.audit_id,
      timestamp: log.timestamp,
      action: log.action,
      performed_by: log.performed_by,
    }));

    let content: string;
    let filename: string;
    let mimeType: string;
    const dateStr = selectedDate || new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const headers = Object.keys(dataToExport[0]).join(",");
      const rows = dataToExport.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      content = [headers, ...rows].join("\n");
      filename = `audit_logs_${dateStr}.csv`;
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(dataToExport, null, 2);
      filename = `audit_logs_${dateStr}.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredLogs.length} logs as ${format.toUpperCase()}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header
          title="Audit Trail"
          subtitle="Complete audit log for compliance and monitoring"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Loading audit logs...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen">
        <Header
          title="Audit Trail"
          subtitle="Complete audit log for compliance and monitoring"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Failed to load audit logs</p>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as any)?.message || "An error occurred"}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Audit Trail"
        subtitle="Complete audit log for compliance and monitoring"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <Eye className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Calendar className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayEvents}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate ? "Selected Date" : "Today's Events"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.actionTypes}</p>
                  <p className="text-sm text-muted-foreground">Action Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.performers}</p>
                  <p className="text-sm text-muted-foreground">Distinct Performers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-10"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={hasActiveFilters ? "border-accent" : ""}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {[filterAction !== "all", !!selectedDate].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Action Type</Label>
                    <Select value={filterAction} onValueChange={setFilterAction}>
                      <SelectTrigger>
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        {distinctActions.map((action) => (
                          <SelectItem key={action} value={action}>
                            {action.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Audit Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Audit ID</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No audit logs found</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </TableCell>
                </TableRow>
              ) : (
                pagedLogs.map((log) => (
                  <TableRow
                    key={log.audit_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleViewLog(log)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{formatTimestamp(log.timestamp)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-muted">
                          {getActionIcon(log.action)}
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{log.performed_by}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{log.audit_id}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewLog(log);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
          <Pager
            page={page}
            total={filteredLogs.length}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        </div>

        {/* View Log Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Log Details
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4 py-4">
                {/* Header info */}
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="p-3 rounded-xl bg-background">
                    {getActionIcon(selectedLog.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {selectedLog.action}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTimestamp(selectedLog.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Core details */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Performed By</p>
                    <p className="font-medium">{selectedLog.performed_by}</p>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Audit ID</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono break-all">{selectedLog.audit_id}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => handleCopyToClipboard(selectedLog.audit_id, "Audit ID")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Optional extended fields (kalau backend kasih) */}
                {(selectedLog.target ||
                  selectedLog.purpose ||
                  selectedLog.status ||
                  selectedLog.ip_address ||
                  selectedLog.session_id ||
                  selectedLog.details) && (
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-xs text-muted-foreground uppercase">Additional Context</p>
                    {selectedLog.target && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="text-sm">{selectedLog.target}</p>
                      </div>
                    )}
                    {selectedLog.purpose && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Purpose</p>
                        <p className="text-sm">{selectedLog.purpose}</p>
                      </div>
                    )}
                    {selectedLog.status && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant="outline">{selectedLog.status}</Badge>
                      </div>
                    )}
                    {selectedLog.ip_address && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">IP Address</span>
                        <code className="text-sm font-mono">{selectedLog.ip_address}</code>
                      </div>
                    )}
                    {selectedLog.session_id && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">Session ID</span>
                        <code className="text-sm font-mono">{selectedLog.session_id}</code>
                      </div>
                    )}
                    {selectedLog.details && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Details</p>
                        <p className="text-sm bg-muted/50 p-3 rounded">{selectedLog.details}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Audit;
