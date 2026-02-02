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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";

const auditLogs = [
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
  },
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
      return <User className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const Audit = () => {
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
                  <p className="text-2xl font-bold">1,248</p>
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
                  <p className="text-2xl font-bold">856</p>
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
                  <p className="text-2xl font-bold">342</p>
                  <p className="text-sm text-muted-foreground">Transfers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <User className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
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
              <Input placeholder="Search logs..." className="pl-10 w-64" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="date" className="pl-10" defaultValue="2025-12-30" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
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
              {auditLogs.map((log) => (
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
                          : "bg-destructive/10 text-destructive"
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Audit;
