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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
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

interface Dataset {
  id: number;
  name: string;
  provider: string;
  domain: string;
  format: string;
  endpoint: string;
  period: string;
  wells: number;
  status: string;
  lastUpdated: string;
}

const initialDatasets: Dataset[] = [
  {
    id: 1,
    name: "Well Production Data Q4 2025",
    provider: "PHE ONWJ",
    domain: "Lifting Data",
    format: "WMS",
    endpoint: "geoserver.pheonwj.id/wms",
    period: "Oct - Dec 2025",
    wells: 45,
    status: "published",
    lastUpdated: "2025-12-28",
  },
  {
    id: 2,
    name: "Reservoir Pressure Analysis",
    provider: "Pertamina Hulu Energi",
    domain: "Reservoir Data",
    format: "WFS",
    endpoint: "geo.phe.id/wfs",
    period: "2025",
    wells: 32,
    status: "published",
    lastUpdated: "2025-12-15",
  },
  {
    id: 3,
    name: "Daily Production Report",
    provider: "Chevron Indonesia",
    domain: "Lifting Data",
    format: "WCS",
    endpoint: "data.chevron.id/wcs",
    period: "Streaming",
    wells: 120,
    status: "published",
    lastUpdated: "2025-12-30",
  },
  {
    id: 4,
    name: "Well Test Results 2025",
    provider: "Medco E&P",
    domain: "Well Test",
    format: "WMS",
    endpoint: "geoserver.medco.id/wms",
    period: "2025",
    wells: 28,
    status: "draft",
    lastUpdated: "2025-12-20",
  },
  {
    id: 5,
    name: "Seismic Survey Data Block A",
    provider: "PHE ONWJ",
    domain: "Exploration",
    format: "WCS",
    endpoint: "geoserver.pheonwj.id/wcs",
    period: "2024-2025",
    wells: 0,
    status: "published",
    lastUpdated: "2025-11-30",
  },
  {
    id: 6,
    name: "Monthly Lifting Summary",
    provider: "Pertamina Hulu Energi",
    domain: "Lifting Data",
    format: "WFS",
    endpoint: "geo.phe.id/wfs",
    period: "Monthly",
    wells: 56,
    status: "published",
    lastUpdated: "2025-12-01",
  },
  {
    id: 7,
    name: "Field Development Plan Data",
    provider: "ExxonMobil Indonesia",
    domain: "Exploration",
    format: "WMS",
    endpoint: "geo.exxon.id/wms",
    period: "2025",
    wells: 15,
    status: "published",
    lastUpdated: "2025-12-10",
  },
  {
    id: 8,
    name: "Quarterly Well Test Report",
    provider: "ConocoPhillips",
    domain: "Well Test",
    format: "WFS",
    endpoint: "data.conocophillips.id/wfs",
    period: "Q4 2025",
    wells: 22,
    status: "draft",
    lastUpdated: "2025-12-22",
  },
];

const domainTabs = ["All", "Lifting Data", "Reservoir Data", "Well Test", "Exploration"];

const Datasets = () => {
  // State management
  const [datasets, setDatasets] = useState<Dataset[]>(initialDatasets);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState("All");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProvider, setFilterProvider] = useState<string>("all");

  // View dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Get unique providers for filter
  const providers = useMemo(() => {
    return [...new Set(datasets.map(d => d.provider))];
  }, [datasets]);

  // Filter datasets
  const filteredDatasets = useMemo(() => {
    return datasets.filter((dataset) => {
      const matchesSearch =
        dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = activeDomain === "All" || dataset.domain === activeDomain;
      const matchesFormat = filterFormat === "all" || dataset.format === filterFormat;
      const matchesStatus = filterStatus === "all" || dataset.status === filterStatus;
      const matchesProvider = filterProvider === "all" || dataset.provider === filterProvider;
      return matchesSearch && matchesDomain && matchesFormat && matchesStatus && matchesProvider;
    });
  }, [datasets, searchQuery, activeDomain, filterFormat, filterStatus, filterProvider]);

  // Check if any filter is active
  const hasActiveFilters = filterFormat !== "all" || filterStatus !== "all" || filterProvider !== "all";

  // Clear all filters
  const clearFilters = () => {
    setFilterFormat("all");
    setFilterStatus("all");
    setFilterProvider("all");
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
  const handleDeleteDataset = () => {
    if (!selectedDataset) return;
    setDatasets(datasets.filter(d => d.id !== selectedDataset.id));
    setIsDeleteDialogOpen(false);
    setSelectedDataset(null);
    toast.success("Dataset deleted successfully");
  };

  // Handle form submit - add new dataset
  const handleFormSubmit = (data: any) => {
    const newDataset: Dataset = {
      id: Math.max(...datasets.map(d => d.id)) + 1,
      name: data.name,
      provider: data.provider,
      domain: data.domain,
      format: data.endpointType,
      endpoint: data.endpointUrl,
      period: data.period,
      wells: data.wellCount || 0,
      status: "draft",
      lastUpdated: new Date().toISOString().split("T")[0],
    };
    setDatasets([...datasets, newDataset]);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Dataset Catalog"
        subtitle="Browse and manage registered datasets"
      />
      <div className="p-6 space-y-6">
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
                      {[filterFormat !== "all", filterStatus !== "all", filterProvider !== "all"].filter(Boolean).length}
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
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={filterProvider} onValueChange={setFilterProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="All providers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All providers</SelectItem>
                        {providers.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider}
                          </SelectItem>
                        ))}
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

        {/* Domain Filters */}
        <div className="flex gap-2 flex-wrap">
          {domainTabs.map((domain) => (
            <Button
              key={domain}
              variant={activeDomain === domain ? "default" : "outline"}
              size="sm"
              className={activeDomain === domain ? "bg-accent text-accent-foreground" : ""}
              onClick={() => setActiveDomain(domain)}
            >
              {domain}
              {domain !== "All" && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {datasets.filter(d => d.domain === domain).length}
                </Badge>
              )}
            </Button>
          ))}
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
                      <span>{dataset.provider}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{dataset.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{dataset.period}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex gap-2">
                      <Badge variant="outline">{dataset.format}</Badge>
                      <Badge variant="secondary">{dataset.domain}</Badge>
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
                  <TableHead>Domain</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Wells</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>{dataset.provider}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{dataset.domain}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dataset.format}</Badge>
                    </TableCell>
                    <TableCell>{dataset.period}</TableCell>
                    <TableCell className="text-center">{dataset.wells}</TableCell>
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
          onSubmit={handleFormSubmit}
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
                      <Badge variant="secondary">{selectedDataset.domain}</Badge>
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

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Endpoint</p>
                    <p className="font-medium text-sm truncate">{selectedDataset.endpoint}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-medium">{selectedDataset.period}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wells</p>
                    <p className="font-medium">{selectedDataset.wells}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{selectedDataset.lastUpdated}</p>
                  </div>
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
              >
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
