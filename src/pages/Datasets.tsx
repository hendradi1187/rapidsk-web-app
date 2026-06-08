import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { DomainClusterTabs } from "@/components/common/DomainClusterTabs";
import { Pager } from "@/components/common/Pager";
import { datasetDomain, DOMAINS } from "@/lib/fulfillment";
import { useAuth } from "@/context/AuthContext";
import { PublishDatasetDialog } from "@/components/datasets/PublishDatasetDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Database,
  Eye,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useDatasets,
  useCreateDataset,
} from "@/api/hooks/useDatasets";
import { useDatasetLevels, LEVEL_BADGE, LEVEL_LABEL } from "@/api/hooks/useDatasetLevels";
import { useProviders } from "@/api/hooks/useProviders";
import type { Dataset } from "@/api/types/data-catalog";

// ─── Helpers untuk badge style ────────────────────────────────────────
// Classification & status sementara free string per spec — UI memberi style
// default + fallback netral untuk value yang tidak dikenali.

const CLASSIFICATION_STYLES: Record<string, string> = {
  public: "bg-emerald-50 text-emerald-700 border-emerald-200",
  internal: "bg-blue-50 text-blue-700 border-blue-200",
  restricted: "bg-amber-50 text-amber-700 border-amber-200",
  confidential: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_STYLES: Record<string, string> = {
  active: "badge-active",
  published: "badge-active",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  archived: "bg-zinc-100 text-zinc-600 border-zinc-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const classificationClass = (value: string) =>
  CLASSIFICATION_STYLES[value?.toLowerCase()] ?? "bg-slate-50 text-slate-700 border-slate-200";

const statusClass = (value: string) =>
  STATUS_STYLES[value?.toLowerCase()] ?? "bg-slate-50 text-slate-700 border-slate-200";

const Datasets = () => {
  // State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassification, setFilterClassification] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all"); // cluster domain
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const { hasRole, role, participantId } = useAuth();
  const canPublish = hasRole(["PROVIDER", "SUPER_ADMIN", "ADMIN"]);
  const [publishOpen, setPublishOpen] = useState(false);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    dataset_name: "",
    schema_name: "",
    provider_id: "",
  });

  // API hooks
  const {
    data: datasets,
    isLoading,
    isError,
    error,
    refetch,
  } = useDatasets();

  const createMutation = useCreateDataset();

  // Klasifikasi L0–L4 (dari dataset.level — field description GX-Space)
  const { levelOf } = useDatasetLevels();

  // Resolve nama provider dari participant (provider_id → organization_name)
  const { data: providersData } = useProviders();
  const providerNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of (providersData ?? []) as Array<{ provider_id: string; provider_name: string }>) m[p.provider_id] = p.provider_name;
    return m;
  }, [providersData]);
  const providerName = (d: Dataset): string => (d.provider_id && providerNameById[d.provider_id]) || d.provider_name || "—";

  // Isolasi data: KKKS (PROVIDER) hanya lihat dataset miliknya. BE sudah memfilter,
  // ini lapis pertahanan kedua di FE.
  const scopedDatasets = useMemo(() => {
    if (!datasets) return [];
    if (role === "PROVIDER" && participantId)
      return datasets.filter((d) => d.provider_id === participantId);
    return datasets;
  }, [datasets, role, participantId]);

  // Filter dasar (search + level + status), TANPA cluster domain.
  const baseFiltered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return scopedDatasets.filter((d) => {
      const matchesSearch =
        d.dataset_name?.toLowerCase().includes(q) ||
        d.schema_name?.toLowerCase().includes(q) ||
        providerName(d).toLowerCase().includes(q);
      const matchesLevel = filterClassification === "all" || levelOf(d) === filterClassification;
      const matchesStatus = filterStatus === "all" || d.status === filterStatus;
      return matchesSearch && matchesLevel && matchesStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedDatasets, searchQuery, filterClassification, filterStatus, providerNameById]);

  // Hitungan per cluster domain (untuk chip)
  const domainCounts = useMemo(() => {
    const c: Record<string, number> = { all: baseFiltered.length };
    for (const d of DOMAINS) c[d.key] = 0;
    for (const ds of baseFiltered) {
      const k = datasetDomain(ds);
      if (k) c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [baseFiltered]);

  // Terapkan cluster domain
  const filteredDatasets = useMemo(
    () => (filterDomain === "all" ? baseFiltered : baseFiltered.filter((d) => datasetDomain(d) === filterDomain)),
    [baseFiltered, filterDomain],
  );

  // Pagination
  const pagedDatasets = useMemo(
    () => filteredDatasets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredDatasets, page],
  );
  // Reset ke halaman 1 saat filter/pencarian berubah
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterClassification, filterStatus, filterDomain]);

  const hasActiveFilters = filterClassification !== "all" || filterStatus !== "all";
  const clearFilters = () => {
    setFilterClassification("all");
    setFilterStatus("all");
  };

  // Distinct level (L0–L4) untuk filter dropdown
  const distinctClassifications = useMemo(() => {
    return Array.from(new Set(scopedDatasets.map((d) => levelOf(d)).filter(Boolean) as string[])).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedDatasets]);

  const distinctStatuses = useMemo(() => {
    return Array.from(new Set(scopedDatasets.map((d) => d.status).filter(Boolean)));
  }, [scopedDatasets]);

  const resetForm = () =>
    setFormData({ dataset_name: "", schema_name: "", provider_id: "" });

  const handleAddDataset = async () => {
    if (!formData.dataset_name.trim()) {
      toast.error("Dataset name is required");
      return;
    }
    if (!formData.schema_name.trim()) {
      toast.error("Schema name is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        dataset_name: formData.dataset_name.trim(),
        schema_name: formData.schema_name.trim(),
        provider_id: formData.provider_id.trim() || undefined,
      });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Dataset registered successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to register dataset");
    }
  };

  const openViewDialog = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsViewDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header
          title="Dataset Catalog"
          subtitle="Browse and manage registered datasets"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Loading datasets...</p>
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
          title="Dataset Catalog"
          subtitle="Browse and manage registered datasets"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Failed to load datasets</p>
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

  const totalCount = datasets?.length ?? 0;

  return (
    <div className="min-h-screen">
      <Header
        title="Dataset Catalog"
        subtitle="Browse and manage registered datasets"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Database className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Datasets</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Database className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredDatasets.length}</p>
                <p className="text-sm text-muted-foreground">Showing Results</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Database className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distinctClassifications.length}</p>
                <p className="text-sm text-muted-foreground">Level Klasifikasi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search datasets, schemas, providers..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Filters</h4>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Klasifikasi (L0–L4)</Label>
                    <Select value={filterClassification} onValueChange={setFilterClassification}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua level</SelectItem>
                        {distinctClassifications.map((c) => (
                          <SelectItem key={c} value={c}>
                            {LEVEL_LABEL[c] ?? c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {distinctStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid" ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "list" ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
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
            {canPublish && (
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setPublishOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Publish Dataset
              </Button>
            )}
          </div>
        </div>

        {/* Cluster Domain */}
        <DomainClusterTabs value={filterDomain} onChange={setFilterDomain} counts={domainCounts} />

        {/* Empty state */}
        {filteredDatasets.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-lg font-medium">No datasets found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || hasActiveFilters
                ? "Try adjusting your search or filters"
                : "Register your first dataset to get started"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          // Grid view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedDatasets.map((dataset) => (
              <Card
                key={dataset.dataset_id}
                className="hover:border-accent/50 transition-colors cursor-pointer"
                onClick={() => openViewDialog(dataset)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-accent/10 flex-shrink-0">
                        <Database className="w-5 h-5 text-accent" />
                      </div>
                      <CardTitle className="text-base font-semibold truncate">
                        {dataset.dataset_name}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDialog(dataset)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Schema</p>
                    <p className="text-sm font-medium truncate">{dataset.schema_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="text-sm font-medium truncate">{providerName(dataset)}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {levelOf(dataset) && (
                      <Badge variant="outline" className={cn(LEVEL_BADGE[levelOf(dataset)!])} title={LEVEL_LABEL[levelOf(dataset)!]}>
                        {levelOf(dataset)}
                      </Badge>
                    )}
                    {dataset.status && (
                      <Badge variant="outline" className={cn(statusClass(dataset.status))}>
                        {dataset.status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // List view (table)
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Dataset</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Klasifikasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedDatasets.map((dataset) => (
                  <TableRow
                    key={dataset.dataset_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => openViewDialog(dataset)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10 flex-shrink-0">
                          <Database className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-medium">{dataset.dataset_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{dataset.schema_name}</span>
                    </TableCell>
                    <TableCell>{providerName(dataset)}</TableCell>
                    <TableCell>
                      {dataset.classification && (
                        <Badge variant="outline" className={cn(classificationClass(dataset.classification))}>
                          {dataset.classification}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {dataset.status && (
                        <Badge variant="outline" className={cn(statusClass(dataset.status))}>
                          {dataset.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(dataset)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <Pager page={page} total={filteredDatasets.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>

      <PublishDatasetDialog open={publishOpen} onOpenChange={setPublishOpen} />

      {/* Register Dataset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register New Dataset</DialogTitle>
            <DialogDescription>
              Add a dataset to the rapiDSK Enterprise catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dataset_name">Dataset Name *</Label>
              <Input
                id="dataset_name"
                placeholder="e.g. Well Production Q4 2025"
                value={formData.dataset_name}
                onChange={(e) =>
                  setFormData({ ...formData, dataset_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schema_name">Schema Name *</Label>
              <Input
                id="schema_name"
                placeholder="e.g. well-production-v1"
                value={formData.schema_name}
                onChange={(e) =>
                  setFormData({ ...formData, schema_name: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Reference ke schema yang sudah didaftarkan di catalog.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider_id">Provider ID</Label>
              <Input
                id="provider_id"
                placeholder="UUID dari /providers (opsional)"
                value={formData.provider_id}
                onChange={(e) =>
                  setFormData({ ...formData, provider_id: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Phase 5 akan ganti jadi dropdown dari /providers list.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDataset}
              className="bg-accent hover:bg-accent/90"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Register Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dataset Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Dataset Details</DialogTitle>
          </DialogHeader>
          {selectedDataset && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-accent/10 flex-shrink-0">
                  <Database className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">{selectedDataset.dataset_name}</h3>
                  <p className="text-sm text-muted-foreground">{providerName(selectedDataset)}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {levelOf(selectedDataset) && (
                      <Badge
                        variant="outline"
                        className={cn(LEVEL_BADGE[levelOf(selectedDataset)!])}
                        title={LEVEL_LABEL[levelOf(selectedDataset)!]}
                      >
                        {LEVEL_LABEL[levelOf(selectedDataset)!] ?? levelOf(selectedDataset)}
                      </Badge>
                    )}
                    {selectedDataset.status && (
                      <Badge
                        variant="outline"
                        className={cn(statusClass(selectedDataset.status))}
                      >
                        {selectedDataset.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Dataset ID</p>
                  <p className="font-mono text-xs break-all">
                    {selectedDataset.dataset_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Schema</p>
                  <p className="font-mono text-sm">{selectedDataset.schema_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{providerName(selectedDataset)}</p>
                </div>
                {selectedDataset.endpoint_url && (
                  <div>
                    <p className="text-sm text-muted-foreground">Endpoint (OGC API Features)</p>
                    <p className="font-mono text-xs break-all">{selectedDataset.endpoint_url}</p>
                  </div>
                )}
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Protokol</p>
                    <p className="text-sm font-medium">{selectedDataset.protocol ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Akses</p>
                    <p className="text-sm font-medium">{selectedDataset.access_type ?? "—"}</p>
                  </div>
                </div>
              </div>
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
  );
};

export default Datasets;
