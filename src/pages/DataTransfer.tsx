import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertCircle,
} from "lucide-react";
import { useDataTransfers, useAllDomains } from "@/api/hooks";
import { DataTransfer as DataTransferType } from "@/api/types";

const DataTransfer = () => {
  // Domain selection
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");

  // Fetch domains
  const {
    data: domainsData,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useAllDomains();

  // Fetch data transfers
  const {
    data: transfersData,
    isLoading: isLoadingTransfers,
    error: transfersError,
    refetch: refetchTransfers,
  } = useDataTransfers(selectedDomainId, { limit: 100 });

  const transfers = transfersData?.data || [];
  const totalTransfers = transfersData?.total || 0;

  // Calculate statistics from real data
  const stats = {
    transfersToday: transfers.filter((t) => t.status === "active" || t.status === "in_progress").length,
    dataThisMonth: transfers.reduce((acc, t) => acc + (t.bytesTransferred || 0), 0),
    activeStreams: transfers.filter((t) => t.type === "streaming" && t.status === "active").length,
    encryptionRate: transfers.length > 0
      ? ((transfers.filter((t) => t.encrypted).length / transfers.length) * 100).toFixed(1)
      : "0",
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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

  // No domain selected state
  if (!selectedDomainId) {
    return (
      <div className="min-h-screen">
        <Header
          title="Data Transfer"
          subtitle="Monitor and manage data exchange between participants"
        />
        <div className="p-6">
          <Card className="max-w-2xl mx-auto mt-12">
            <CardHeader>
              <h3 className="font-semibold">Select Domain</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Please select a domain to view and manage data transfers.
              </p>
              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a domain..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDomains ? (
                    <SelectItem value="loading" disabled>
                      Loading domains...
                    </SelectItem>
                  ) : domainsError ? (
                    <SelectItem value="error" disabled>
                      Error loading domains
                    </SelectItem>
                  ) : domainsData?.data && domainsData.data.length > 0 ? (
                    domainsData.data.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.name} ({domain.code})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No domains available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <div className="text-center mt-8">
            <Database className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Select a domain to view data transfers</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedDomain = domainsData?.data?.find((d) => d.id === selectedDomainId);

  return (
    <div className="min-h-screen">
      <Header
        title="Data Transfer"
        subtitle="Monitor and manage data exchange between participants"
      />
      <div className="p-6 space-y-6">
        {/* Domain Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select domain..." />
              </SelectTrigger>
              <SelectContent>
                {domainsData?.data?.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name} ({domain.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDomain && (
              <Badge className={selectedDomain.status === "ACTIVE" ? "badge-active" : "badge-inactive"}>
                {selectedDomain.status}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Total: {totalTransfers} transfer{totalTransfers !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <ArrowUpRight className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.transfersToday}</p>
                  <p className="text-sm text-muted-foreground">Active Transfers</p>
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
                  <p className="text-2xl font-bold">{formatBytes(stats.dataThisMonth)}</p>
                  <p className="text-sm text-muted-foreground">Data Transferred</p>
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
                  <p className="text-2xl font-bold">{stats.activeStreams}</p>
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
                  <p className="text-2xl font-bold">{stats.encryptionRate}%</p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTransfers()}
              disabled={isLoadingTransfers}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingTransfers ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Loading State */}
          {isLoadingTransfers && (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {transfersError && (
            <Card className="border-destructive/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Failed to load data transfers</p>
                    <p className="text-sm text-muted-foreground">
                      {transfersError instanceof Error ? transfersError.message : "An error occurred"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => refetchTransfers()}
                    className="ml-auto"
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoadingTransfers && !transfersError && transfers.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Data Transfers</h3>
                <p className="text-muted-foreground mb-4">
                  No data transfers found for this domain.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Transfers List */}
          {!isLoadingTransfers && !transfersError && transfers.length > 0 && (
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
                          {transfer.errorMessage && (
                            <p className="text-sm text-destructive mt-1">
                              {transfer.errorMessage}
                            </p>
                          )}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTransfer;
