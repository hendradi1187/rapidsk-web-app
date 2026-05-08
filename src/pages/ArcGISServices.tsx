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
import { Label } from "@/components/ui/label";
import {
  Globe,
  Plug,
  Layers,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useArcGISLayers, useArcGISConnect } from "@/api/hooks/useArcGIS";

const GEOMETRY_STYLES: Record<string, string> = {
  esrigeometrypoint: "bg-blue-50 text-blue-700 border-blue-200",
  esrigeometrypolyline: "bg-emerald-50 text-emerald-700 border-emerald-200",
  esrigeometrypolygon: "bg-amber-50 text-amber-700 border-amber-200",
  esrigeometrymultipoint: "bg-violet-50 text-violet-700 border-violet-200",
  point: "bg-blue-50 text-blue-700 border-blue-200",
  polyline: "bg-emerald-50 text-emerald-700 border-emerald-200",
  polygon: "bg-amber-50 text-amber-700 border-amber-200",
};

const geometryClass = (value: string) =>
  GEOMETRY_STYLES[value?.toLowerCase()] ??
  "bg-slate-50 text-slate-700 border-slate-200";

const ArcGISServices = () => {
  const [serviceName, setServiceName] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const connectMutation = useArcGISConnect();
  const {
    data: layers,
    isLoading,
    isError,
    error,
    refetch,
  } = useArcGISLayers();

  const filtered = useMemo(() => {
    if (!layers) return [];
    const q = searchQuery.toLowerCase();
    return layers.filter(
      (l) =>
        l.layer_name?.toLowerCase().includes(q) ||
        l.geometry_type?.toLowerCase().includes(q),
    );
  }, [layers, searchQuery]);

  const distinctGeometries = useMemo(
    () => new Set(layers?.map((l) => l.geometry_type).filter(Boolean) ?? []),
    [layers],
  );

  const handleConnect = async () => {
    if (!serviceName.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!serviceUrl.trim()) {
      toast.error("Service URL is required");
      return;
    }

    try {
      await connectMutation.mutateAsync({
        service_name: serviceName.trim(),
        service_url: serviceUrl.trim(),
      });
      toast.success("ArcGIS service connected");
      setServiceName("");
      setServiceUrl("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to connect ArcGIS service");
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="ArcGIS Services" subtitle="Connect ArcGIS endpoints and discover layers" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connect form */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plug className="w-5 h-5 text-accent" />
                <h3 className="font-semibold">Connect Service</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Register a new ArcGIS endpoint. Discovered layers appear on the right.
              </p>
              <div className="space-y-2">
                <Label htmlFor="service_name">Service Name</Label>
                <Input
                  id="service_name"
                  placeholder="e.g. PHE-Wells-MapServer"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_url">Service URL</Label>
                <Input
                  id="service_url"
                  placeholder="https://gis.example.com/arcgis/rest/services/..."
                  value={serviceUrl}
                  onChange={(e) => setServiceUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleConnect}
                className="w-full bg-accent hover:bg-accent/90"
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Plug className="w-4 h-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>

          {/* Discovered layers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-info/10">
                    <Layers className="w-6 h-6 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{layers?.length ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Total Layers</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Layers className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{filtered.length}</p>
                    <p className="text-sm text-muted-foreground">Showing</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <Globe className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{distinctGeometries.size}</p>
                    <p className="text-sm text-muted-foreground">Geometry Types</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search layers..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh Layers
              </Button>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden min-h-[200px]">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
                  <p className="mt-2 text-muted-foreground">Discovering layers...</p>
                </div>
              ) : isError ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                  <p className="mt-2 text-lg font-medium">Failed to discover layers</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(error as any)?.message || "An error occurred"}
                  </p>
                  <Button onClick={() => refetch()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No layers found</p>
                  <p className="text-sm">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Connect a service first, then refresh"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Layer</TableHead>
                      <TableHead>Geometry Type</TableHead>
                      <TableHead>Layer ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l) => (
                      <TableRow key={l.layer_id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/10">
                              <Layers className="w-4 h-4 text-accent" />
                            </div>
                            <span className="font-medium">{l.layer_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {l.geometry_type && (
                            <Badge variant="outline" className={cn(geometryClass(l.geometry_type))}>
                              {l.geometry_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{l.layer_id}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArcGISServices;
