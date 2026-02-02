import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Database,
  Shield,
  RefreshCw,
} from "lucide-react";

const transfers = [
  {
    id: 1,
    name: "Daily Production Report",
    from: "Chevron Indonesia",
    to: "SKK Migas",
    type: "streaming",
    status: "active",
    progress: 100,
    lastSync: "2 min ago",
    records: "24.5K",
    encrypted: true,
  },
  {
    id: 2,
    name: "Lifting Data Q4",
    from: "PHE ONWJ",
    to: "SKK Migas",
    type: "batch",
    status: "in_progress",
    progress: 67,
    lastSync: "In progress",
    records: "156K",
    encrypted: true,
  },
  {
    id: 3,
    name: "Reservoir Analysis",
    from: "Pertamina Hulu Energi",
    to: "SKK Migas",
    type: "batch",
    status: "completed",
    progress: 100,
    lastSync: "1 hour ago",
    records: "89K",
    encrypted: true,
  },
  {
    id: 4,
    name: "Well Test Results",
    from: "Medco E&P",
    to: "SKK Migas",
    type: "batch",
    status: "failed",
    progress: 45,
    lastSync: "Failed at 3:45 PM",
    records: "12K",
    encrypted: true,
  },
];

const DataTransfer = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Zap className="w-4 h-4 text-success" />;
      case "in_progress":
        return <RefreshCw className="w-4 h-4 text-amber animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "badge-active";
      case "in_progress":
        return "badge-pending";
      case "completed":
        return "badge-active";
      case "failed":
        return "bg-destructive/10 text-destructive";
      default:
        return "badge-inactive";
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Data Transfer"
        subtitle="Monitor and manage data exchange between participants"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <ArrowUpRight className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">2.4K</p>
                  <p className="text-sm text-muted-foreground">Transfers Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <Database className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">1.2 TB</p>
                  <p className="text-sm text-muted-foreground">Data This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Zap className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">Active Streams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-100">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">99.9%</p>
                  <p className="text-sm text-muted-foreground">TLS Encrypted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Security Notice */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">Secure Transfer Channel</p>
              <p className="text-sm text-muted-foreground">
                All data transfers are encrypted using TLS 1.3 and validated against active contracts
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Transfers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Transfers</h2>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {transfers.map((transfer, index) => (
              <Card
                key={transfer.id}
                className="hover:shadow-md transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 rounded-xl bg-accent/10">
                        <ArrowRightLeft className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{transfer.name}</h3>
                          {transfer.encrypted && (
                            <Shield className="w-4 h-4 text-success" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <ArrowUpRight className="w-4 h-4" />
                          <span>{transfer.from}</span>
                          <span>→</span>
                          <ArrowDownLeft className="w-4 h-4" />
                          <span>{transfer.to}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">{transfer.records}</p>
                        <p className="text-xs text-muted-foreground">records</p>
                      </div>
                      <div className="w-32">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            {transfer.progress}%
                          </span>
                        </div>
                        <Progress value={transfer.progress} className="h-2" />
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transfer.status)}
                        <Badge className={getStatusBadge(transfer.status)}>
                          {transfer.type === "streaming" ? "Streaming" : transfer.status}
                        </Badge>
                      </div>
                      <div className="text-right min-w-24">
                        <p className="text-sm text-muted-foreground">
                          {transfer.lastSync}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTransfer;
