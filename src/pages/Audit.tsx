import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
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
  Globe,
  Copy,
  CheckCircle2,
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

interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  provider: string;
  purpose: string;
  status: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  details?: string;
}

const initialAuditLogs: AuditLog[] = [
  {
    id: 1,
    timestamp: "2025-12-30 14:32:15",
    action: "DATA_ACCESS",
    actor: "SKK Migas - Monitoring Team",
    target: "Well Production Q4 2025",
    provider: "PHE ONWJ",
    purpose: "Monthly Report Generation",
    status: "success",
    ipAddress: "10.10.45.128",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    sessionId: "sess_abc123def456",
    details: "Accessed 45 records from Well Production dataset for monthly compliance report generation.",
  },
  {
    id: 2,
    timestamp: "2025-12-30 14:28:42",
    action: "CONTRACT_SIGNED",
    actor: "Chevron Indonesia",
    target: "Daily Production Stream Agreement",
    provider: "Chevron Indonesia",
    purpose: "Contract Execution",
    status: "success",
    ipAddress: "10.10.32.55",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0",
    sessionId: "sess_xyz789abc012",
    details: "Digital signature applied to contract ID CTR-2025-0042. Contract duration: 12 months.",
  },
  {
    id: 3,
    timestamp: "2025-12-30 14:15:03",
    action: "DATASET_REGISTERED",
    actor: "PHE ONWJ - Data Admin",
    target: "Seismic Survey Block A",
    provider: "PHE ONWJ",
    purpose: "Dataset Registration",
    status: "success",
    ipAddress: "10.10.22.89",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.2",
    sessionId: "sess_phe456xyz789",
    details: "New dataset registered with WCS endpoint. Format: GeoTIFF, Size: 2.4GB, Coverage: Block A offshore area.",
  },
  {
    id: 4,
    timestamp: "2025-12-30 13:58:21",
    action: "DATA_TRANSFER",
    actor: "System",
    target: "Lifting Data Batch Transfer",
    provider: "Pertamina Hulu Energi",
    purpose: "Scheduled Sync",
    status: "success",
    ipAddress: "10.10.10.1",
    userAgent: "RapiDSK-Connector/1.0",
    sessionId: "sys_batch_20251230",
    details: "Automated batch transfer completed. Records transferred: 1,248. Duration: 45 seconds.",
  },
  {
    id: 5,
    timestamp: "2025-12-30 13:45:00",
    action: "ACCESS_DENIED",
    actor: "Unknown User",
    target: "Reservoir Pressure Data",
    provider: "Medco E&P",
    purpose: "Unauthorized Access Attempt",
    status: "failed",
    ipAddress: "192.168.1.105",
    userAgent: "curl/7.81.0",
    sessionId: "N/A",
    details: "Access attempt blocked. Reason: Invalid credentials. IP flagged for monitoring.",
  },
  {
    id: 6,
    timestamp: "2025-12-30 12:30:15",
    action: "POLICY_UPDATED",
    actor: "SKK Migas - Admin",
    target: "Real-time Access Policy",
    provider: "System",
    purpose: "Policy Modification",
    status: "success",
    ipAddress: "10.10.45.12",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    sessionId: "sess_admin_skk01",
    details: "Policy latency requirement updated from 2 hours to 1 hour. Effective immediately.",
  },
  {
    id: 7,
    timestamp: "2025-12-29 16:45:30",
    action: "DATA_ACCESS",
    actor: "Kementerian ESDM - Analyst",
    target: "Monthly Production Summary",
    provider: "Multiple",
    purpose: "National Report Compilation",
    status: "success",
    ipAddress: "10.10.50.22",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0",
    sessionId: "sess_esdm_rpt01",
    details: "Aggregated data from 5 providers for national oil & gas production report.",
  },
  {
    id: 8,
    timestamp: "2025-12-29 10:15:00",
    action: "USER_LOGIN",
    actor: "PHE ONWJ - Data Admin",
    target: "Admin Portal",
    provider: "System",
    purpose: "Authentication",
    status: "success",
    ipAddress: "10.10.22.89",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.2",
    sessionId: "sess_phe456xyz789",
    details: "Successful login via Keycloak SSO. 2FA verification completed.",
  },
];

const actionTypes = [
  "DATA_ACCESS",
  "CONTRACT_SIGNED",
  "DATASET_REGISTERED",
  "DATA_TRANSFER",
  "ACCESS_DENIED",
  "POLICY_UPDATED",
  "USER_LOGIN",
];

const getActionIcon = (action: string) => {
  switch (action) {
    case "DATA_ACCESS":
      return <Eye className="w-4 h-4" />;
    case "DATASET_REGISTERED":
      return <Database className="w-4 h-4" />;
    case "CONTRACT_SIGNED":
      return <FileText className="w-4 h-4" />;
    case "DATA_TRANSFER":
      return <ArrowRightLeft className="w-4 h-4" />;
    case "ACCESS_DENIED":
      return <Shield className="w-4 h-4" />;
    case "POLICY_UPDATED":
      return <FileText className="w-4 h-4" />;
    case "USER_LOGIN":
      return <User className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const Audit = () => {
  // State management
  const [auditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("2025-12-30");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch =
        log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = log.timestamp.startsWith(selectedDate);
      const matchesAction = filterAction === "all" || log.action === filterAction;
      const matchesStatus = filterStatus === "all" || log.status === filterStatus;
      return matchesSearch && matchesDate && matchesAction && matchesStatus;
    });
  }, [auditLogs, searchQuery, selectedDate, filterAction, filterStatus]);

  // Calculate stats dynamically
  const stats = useMemo(() => {
    const todayLogs = auditLogs.filter((log) => log.timestamp.startsWith(selectedDate));
    return {
      totalEvents: todayLogs.length,
      dataAccesses: todayLogs.filter((log) => log.action === "DATA_ACCESS").length,
      transfers: todayLogs.filter((log) => log.action === "DATA_TRANSFER").length,
      deniedAttempts: todayLogs.filter((log) => log.status === "failed").length,
    };
  }, [auditLogs, selectedDate]);

  // Check if any filter is active
  const hasActiveFilters = filterAction !== "all" || filterStatus !== "all";

  // Clear filters
  const clearFilters = () => {
    setFilterAction("all");
    setFilterStatus("all");
  };

  // Handle view log
  const handleViewLog = (log: AuditLog) => {
    setSelectedLog(log);
    setIsViewDialogOpen(true);
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Handle export
  const handleExport = (format: "csv" | "json") => {
    const dataToExport = filteredLogs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      actor: log.actor,
      target: log.target,
      provider: log.provider,
      purpose: log.purpose,
      status: log.status,
      ipAddress: log.ipAddress,
    }));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "csv") {
      const headers = Object.keys(dataToExport[0]).join(",");
      const rows = dataToExport.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      );
      content = [headers, ...rows].join("\n");
      filename = `audit_logs_${selectedDate}.csv`;
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(dataToExport, null, 2);
      filename = `audit_logs_${selectedDate}.json`;
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
                  <p className="text-sm text-muted-foreground">Today's Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Database className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.dataAccesses}</p>
                  <p className="text-sm text-muted-foreground">Data Accesses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <ArrowRightLeft className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.transfers}</p>
                  <p className="text-sm text-muted-foreground">Transfers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <Shield className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.deniedAttempts}</p>
                  <p className="text-sm text-muted-foreground">Denied Attempts</p>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={hasActiveFilters ? "border-accent" : ""}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {[filterAction !== "all", filterStatus !== "all"].filter(Boolean).length}
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
                        {actionTypes.map((action) => (
                          <SelectItem key={action} value={action}>
                            {action.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
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
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No audit logs found</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{log.timestamp}</span>
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
                      <span className="font-medium">{log.actor}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{log.target}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.purpose}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          log.status === "success"
                            ? "badge-active"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleViewLog(log)}>
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
        <div className="text-sm text-muted-foreground">
          Showing {filteredLogs.length} of {auditLogs.length} logs
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
                      <Badge
                        className={
                          selectedLog.status === "success"
                            ? "badge-active"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }
                      >
                        {selectedLog.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {selectedLog.timestamp}
                    </p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Actor</p>
                    <p className="font-medium">{selectedLog.actor}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Target</p>
                    <p className="font-medium">{selectedLog.target}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Provider</p>
                    <p className="font-medium">{selectedLog.provider}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Purpose</p>
                    <p className="font-medium">{selectedLog.purpose}</p>
                  </div>
                </div>

                {/* Technical details */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">IP Address</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono">{selectedLog.ipAddress}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyToClipboard(selectedLog.ipAddress, "IP Address")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {selectedLog.sessionId && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Session ID</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{selectedLog.sessionId}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyToClipboard(selectedLog.sessionId || "", "Session ID")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedLog.userAgent && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase mb-1">User Agent</p>
                      <code className="text-xs font-mono break-all">{selectedLog.userAgent}</code>
                    </div>
                  )}
                </div>

                {/* Additional details */}
                {selectedLog.details && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground uppercase mb-2">Details</p>
                    <p className="text-sm bg-muted/50 p-3 rounded">{selectedLog.details}</p>
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
