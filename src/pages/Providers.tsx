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
import { Input } from "@/components/ui/input";
import {
  Search,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProviders } from "@/api/hooks/useProviders";

const STATUS_STYLES: Record<string, string> = {
  active: "badge-active",
  inactive: "bg-zinc-100 text-zinc-600 border-zinc-200",
  suspended: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-blue-50 text-blue-700 border-blue-200",
};

const statusClass = (value: string) =>
  STATUS_STYLES[value?.toLowerCase()] ??
  "bg-slate-50 text-slate-700 border-slate-200";

const Providers = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: providers, isLoading, isError, error, refetch } = useProviders();

  const filtered = useMemo(() => {
    if (!providers) return [];
    const q = searchQuery.toLowerCase();
    return providers.filter(
      (p) =>
        p.provider_name?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q),
    );
  }, [providers, searchQuery]);

  const distinctStatuses = useMemo(
    () => new Set(providers?.map((p) => p.status).filter(Boolean) ?? []),
    [providers],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Providers" subtitle="Registered data providers" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Loading providers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Providers" subtitle="Registered data providers" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Failed to load providers</p>
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
      <Header title="Providers" subtitle="Registered data providers" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Users className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{providers?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Providers</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filtered.length}</p>
                <p className="text-sm text-muted-foreground">Showing Results</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distinctStatuses.size}</p>
                <p className="text-sm text-muted-foreground">Status Types</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No providers found</p>
                    <p className="text-sm">
                      {searchQuery ? "Try adjusting your search" : "No providers registered yet"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.provider_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Users className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-medium">{p.provider_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.status && (
                        <Badge variant="outline" className={cn(statusClass(p.status))}>
                          {p.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.provider_id}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Providers;
