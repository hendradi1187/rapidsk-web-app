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
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePolicies } from "@/api/hooks/usePolicies";

const CLASSIFICATION_STYLES: Record<string, string> = {
  public: "bg-emerald-50 text-emerald-700 border-emerald-200",
  internal: "bg-blue-50 text-blue-700 border-blue-200",
  restricted: "bg-amber-50 text-amber-700 border-amber-200",
  confidential: "bg-rose-50 text-rose-700 border-rose-200",
};

const classificationClass = (value: string) =>
  CLASSIFICATION_STYLES[value?.toLowerCase()] ??
  "bg-slate-50 text-slate-700 border-slate-200";

const Policies = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassification, setFilterClassification] = useState<string>("all");

  const { data: policies, isLoading, isError, error, refetch } = usePolicies();

  const filtered = useMemo(() => {
    if (!policies) return [];
    const q = searchQuery.toLowerCase();
    return policies.filter((p) => {
      const matchesSearch =
        p.policy_name?.toLowerCase().includes(q) ||
        p.classification?.toLowerCase().includes(q);
      const matchesClassification =
        filterClassification === "all" || p.classification === filterClassification;
      return matchesSearch && matchesClassification;
    });
  }, [policies, searchQuery, filterClassification]);

  const distinctClassifications = useMemo(() => {
    return Array.from(new Set(policies?.map((p) => p.classification).filter(Boolean) ?? []));
  }, [policies]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Governance Policies" subtitle="Read-only policy registry" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Loading policies...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Governance Policies" subtitle="Read-only policy registry" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Failed to load policies</p>
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
      <Header title="Governance Policies" subtitle="Read-only policy registry" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Shield className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{policies?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Policies</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Shield className="w-6 h-6 text-accent" />
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
                <Shield className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distinctClassifications.length}</p>
                <p className="text-sm text-muted-foreground">Classifications</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterClassification} onValueChange={setFilterClassification}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="All classifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classifications</SelectItem>
                {distinctClassifications.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Policy</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No policies found</p>
                    <p className="text-sm">
                      {searchQuery || filterClassification !== "all"
                        ? "Try adjusting your search or filter"
                        : "No policies registered yet"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.policy_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Shield className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-medium">{p.policy_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.classification && (
                        <Badge
                          variant="outline"
                          className={cn(classificationClass(p.classification))}
                        >
                          {p.classification}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{p.policy_id}</span>
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

export default Policies;
