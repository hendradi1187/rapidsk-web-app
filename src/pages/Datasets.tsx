import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
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
  MapPin,
  Calendar,
  Building2,
  ExternalLink,
  X,
  Eye,
  Trash2,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DatasetRegistrationForm } from "@/components/datasets/DatasetRegistrationForm";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useDatasets, useDeleteDataset } from "@/api/hooks/useDatasets";
import { Dataset } from "@/api/types";

const Datasets = () => {
  // Domain selection
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");

  // State management
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // View dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // API hooks
  const { data: domainsData, isLoading: isLoadingDomains } = useAllDomains({ limit: 100 });
  const {
    data: datasetsData,
    isLoading: isLoadingDatasets,
    isError,
    error,
    refetch,
  } = useDatasets(selectedDomainId, { limit: 100 });
  const deleteMutation = useDeleteDataset();

  // Filter datasets
  const filteredDatasets = useMemo(() => {
    if (!datasetsData?.data) return [];
    return datasetsData.data.filter((dataset) => {
      const matchesSearch =
        dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.endpoint?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFormat = filterFormat === "all" || dataset.format === filterFormat;
      const matchesStatus = filterStatus === "all" || dataset.status === filterStatus;
      return matchesSearch && matchesFormat && matchesStatus;
    });
  }, [datasetsData?.data, searchQuery, filterFormat, filterStatus]);

  // Check if any filter is active
  const hasActiveFilters = filterFormat !== "all" || filterStatus !== "all";

  // Clear all filters
  const clearFilters = () => {
    setFilterFormat("all");
    setFilterStatus("all");
  };

  // Handle external link click
  const handleExternalLink = (endpoint: string) => {
    const url = endpoint.startsWith("http") ? endpoint : `https://${endpoint}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Opening endpoint in new tab");
  };

  // Handle view dataset
  const handleViewDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsViewDialogOpen(true);
  };

  // Handle delete dataset
  const handleDeleteDataset = async () => {
    if (!selectedDataset || !selectedDomainId) return;
    try {
      await deleteMutation.mutateAsync({
        domainId: selectedDomainId,
        id: String(selectedDataset.id),
      });
      setIsDeleteDialogOpen(false);
      setSelectedDataset(null);
      toast.success("Dataset deleted successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete dataset");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // No domain selected state
  if (!selectedDomainId) {
    return (
      <div className="min-h-screen">
        <Header
          title="Dataset Catalog"
          subtitle="Browse and manage registered datasets"
        />
        <div className="p-6 space-y-6">
          {/* Domain Selector */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-5 h-5 text-accent" />
              <h3 className="font-semibold">Select Domain</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Please select a domain to view and manage datasets.
            </p>
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Select a domain..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDomains ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading domains...
                  </div>
                ) : domainsData?.data?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No domains available. Please create a domain first.
                  </div>
                ) : (
                  domainsData?.data?.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      <div className="flex items-center gap-2">
                        <span>{domain.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {domain.code}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Empty State */}
          <div className="flex items-center justify-center h-[40vh]">
            <div className="text-center">
              <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">Select a domain to view datasets</p>
              <p className="text-sm text-muted-foreground mt-1">
                Datasets are organized by domain
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingDatasets) {
    return (
      <div className="min-h-screen">
        <Header
          title="Dataset Catalog"
          subtitle="Browse and manage registered datasets"
        />
        <div className="p-6">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
              <p className="mt-2 text-muted-foreground">Loading datasets...</p>
            </div>
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
        <div className="p-6">
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
      </div>
    );
  }

  const selectedDomain = domainsData?.data?.find((d) => d.id === selectedDomainId);

  return (
    <div className="min-h-screen">
      <Header
        title="Dataset Catalog"
        subtitle="Browse and manage registered datasets"
      />
      <div className="p-6 space-y-6">
        {/* Domain Selector */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium">Domain:</span>
          </div>
          <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domainsData?.data?.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  <div className="flex items-center gap-2">
                    <span>{domain.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {domain.code}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDomain && (
            <Badge className={selectedDomain.status === "ACTIVE" ? "badge-active" : "badge-inactive"}>
              {selectedDomain.status}
            </Badge>
          )}
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Database className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{datasetsData?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Datasets</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Database className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {datasetsData?.data?.filter((d) => d.status === "published").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Database className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {datasetsData?.data?.filter((d) => d.status === "draft").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Draft</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={cn("rounded-none", viewMode === "grid" && "bg-muted")}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("rounded-none", viewMode === "list" && "bg-muted")}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={hasActiveFilters ? "border-accent" : ""}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {[filterFormat !== "all", filterStatus !== "all"].filter(Boolean).length}
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
                    <Label>Format</Label>
                    <Select value={filterFormat} onValueChange={setFilterFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="All formats" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All formats</SelectItem>
                        <SelectItem value="WMS">WMS</SelectItem>
                        <SelectItem value="WFS">WFS</SelectItem>
                        <SelectItem value="WCS">WCS</SelectItem>
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
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Dataset
            </Button>
          </div>
        </div>

        {/* Dataset Grid/List */}
        {filteredDatasets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No datasets found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatasets.map((dataset, index) => (
              <Card
                key={dataset.id}
                className="group hover:shadow-lg transition-all duration-300 hover:border-accent/50 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Database className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          dataset.status === "published"
                            ? "badge-active"
                            : "badge-pending"
                        }
                      >
                        {dataset.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDataset(dataset)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExternalLink(dataset.endpoint)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Endpoint
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDataset(dataset);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Dataset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-3 group-hover:text-accent transition-colors">
                    {dataset.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>{dataset.provider || "Unknown provider"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{dataset.endpoint}</span>
                    </div>
                    {dataset.created_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(dataset.created_at)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex gap-2">
                      <Badge variant="outline">{dataset.format}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-accent"
                      onClick={() => handleExternalLink(dataset.endpoint)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Dataset</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDatasets.map((dataset) => (
                  <TableRow key={dataset.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Database className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <span className="font-medium">{dataset.name}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {dataset.endpoint}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{dataset.provider || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{dataset.format}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          dataset.status === "published"
                            ? "badge-active"
                            : "badge-pending"
                        }
                      >
                        {dataset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {dataset.created_at ? formatDate(dataset.created_at) : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDataset(dataset)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExternalLink(dataset.endpoint)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Endpoint
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDataset(dataset);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Dataset
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

        {/* Registration Form Modal */}
        <DatasetRegistrationForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          domainId={selectedDomainId}
        />

        {/* View Dataset Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Dataset Details</DialogTitle>
            </DialogHeader>
            {selectedDataset && (
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Database className="w-8 h-8 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedDataset.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedDataset.provider}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{selectedDataset.format}</Badge>
                      <Badge
                        className={
                          selectedDataset.status === "published"
                            ? "badge-active"
                            : "badge-pending"
                        }
                      >
                        {selectedDataset.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedDataset.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedDataset.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Endpoint</p>
                    <p className="font-medium text-sm truncate">{selectedDataset.endpoint}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-medium">{selectedDataset.version || "-"}</p>
                  </div>
                  {selectedDataset.created_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p className="font-medium">{formatDate(selectedDataset.created_at)}</p>
                    </div>
                  )}
                  {selectedDataset.updated_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Updated At</p>
                      <p className="font-medium">{formatDate(selectedDataset.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              <Button
                className="bg-accent hover:bg-accent/90"
                onClick={() => {
                  if (selectedDataset) {
                    handleExternalLink(selectedDataset.endpoint);
                  }
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Endpoint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedDataset?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDataset}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Datasets;
