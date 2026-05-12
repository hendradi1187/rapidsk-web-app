import { useState } from "react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Map, Layers, Link as LinkIcon, Database, CheckCircle2, RefreshCw, Plus, Trash2 } from "lucide-react";
import {
  useTestGeoServerConnection,
  useGetGeoServerConnection,
  useGetGeoServerLayers,
  useSyncGeoServerLayers,
  useGetLayerMappings,
  useSaveLayerMapping,
  useDeleteLayerMapping,
  GeoServerLayer
} from "@/api/hooks/useGeoServer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const GeoServerSettings = () => {
  const { data: connection, isLoading: loadingConn } = useGetGeoServerConnection();
  const testConn = useTestGeoServerConnection();
  
  const defaultWs = connection?.default_workspace || "cts";
  const { data: layersData, isLoading: loadingLayers } = useGetGeoServerLayers(defaultWs);
  const syncLayers = useSyncGeoServerLayers();
  
  const { data: mappingsData, isLoading: loadingMappings } = useGetLayerMappings();
  const saveMapping = useSaveLayerMapping();
  const deleteMapping = useDeleteLayerMapping();

  const [connForm, setConnForm] = useState({
    base_url: connection?.base_url || "https://maps.domain.go.id/geoserver",
    username: connection?.username || "admin",
    password: "",
    workspace: connection?.default_workspace || "cts"
  });

  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    layer_name: "",
    module_name: "",
    data_type: "",
    source_table: "",
    label: ""
  });

  const handleTestConnection = () => {
    if (!connForm.base_url || !connForm.username || !connForm.password || !connForm.workspace) {
      toast.error("Please fill all connection fields");
      return;
    }
    testConn.mutate(connForm);
  };

  const handleSyncLayers = () => {
    if (!connection) {
      toast.error("Please connect to GeoServer first");
      return;
    }
    syncLayers.mutate({ connection_id: connection.id, workspace: connection.default_workspace });
  };

  const handleSaveMapping = () => {
    if (!mappingForm.layer_name || !mappingForm.module_name || !mappingForm.data_type) {
      toast.error("Layer, Module, and Data Type are required");
      return;
    }
    saveMapping.mutate({
      workspace: defaultWs,
      ...mappingForm
    }, {
      onSuccess: () => {
        setMappingDialogOpen(false);
        setMappingForm({ layer_name: "", module_name: "", data_type: "", source_table: "", label: "" });
      }
    });
  };

  const layers = layersData?.layers || [];
  const mappings = mappingsData?.data || [];

  return (
    <V2PageShell title="GeoServer Configuration" subtitle="Configure map server connection, discover spatial layers, and map internal data types to GeoServer endpoints." status="Local Mock API">
      
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <MetricCard 
          title="Connection Status" 
          value={loadingConn ? "..." : connection?.status || "Not Configured"} 
          subtitle={connection?.base_url || "No active connection"} 
          icon={Map} 
          trend={connection?.status === "Connected" ? "up" : "neutral"} 
        />
        <MetricCard 
          title="Discovered Layers" 
          value={loadingLayers ? "..." : layers.length} 
          subtitle={`Workspace: ${defaultWs}`} 
          icon={Layers} 
          trend="neutral" 
        />
        <MetricCard 
          title="Active Mappings" 
          value={loadingMappings ? "..." : mappings.length} 
          subtitle="Data Type → WMS/WFS" 
          icon={LinkIcon} 
          trend="neutral" 
        />
      </div>

      <Tabs defaultValue="connection">
        <TabsList className="mb-4">
          <TabsTrigger value="connection">Connection Setup</TabsTrigger>
          <TabsTrigger value="layers">Layer Sync & Discovery</TabsTrigger>
          <TabsTrigger value="mapping">Data Type Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <Card className="border-border/50 max-w-2xl">
            <CardHeader>
              <CardTitle>GeoServer Connection</CardTitle>
              <CardDescription>
                Configure credentials and REST API endpoints to communicate with your GeoServer instance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connection?.status === "Connected" && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-500 rounded-md text-sm border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully connected to <strong>{connection.base_url}</strong>.
                </div>
              )}
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input 
                  value={connForm.base_url} 
                  onChange={(e) => setConnForm(prev => ({...prev, base_url: e.target.value}))}
                  placeholder="https://maps.domain.go.id/geoserver" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    value={connForm.username} 
                    onChange={(e) => setConnForm(prev => ({...prev, username: e.target.value}))}
                    placeholder="admin" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password (REST API)</Label>
                  <Input 
                    type="password" 
                    value={connForm.password} 
                    onChange={(e) => setConnForm(prev => ({...prev, password: e.target.value}))}
                    placeholder="••••••••" 
                  />
                  <p className="text-[10px] text-muted-foreground">Try password "geoserver" for this demo.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Workspace</Label>
                <Input 
                  value={connForm.workspace} 
                  onChange={(e) => setConnForm(prev => ({...prev, workspace: e.target.value}))}
                  placeholder="cts" 
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 flex justify-between">
              <Button variant="outline">Reset</Button>
              <Button onClick={handleTestConnection} disabled={testConn.isPending}>
                {testConn.isPending ? "Testing..." : "Test & Save Connection"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="layers">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Layer Discovery</CardTitle>
                <CardDescription>
                  Automatically parse and discover available WMS/WFS layers from the <code>{defaultWs}</code> workspace.
                </CardDescription>
              </div>
              <Button onClick={handleSyncLayers} disabled={syncLayers.isPending} variant="secondary" className="gap-2">
                <RefreshCw className={`w-4 h-4 ${syncLayers.isPending ? "animate-spin" : ""}`} />
                {syncLayers.isPending ? "Syncing..." : "Sync Layers"}
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable 
                headers={["Layer Name", "Qualified Name", "WMS Endpoint", "WFS Endpoint"]} 
                isLoading={loadingLayers}
              >
                {layers.map((layer: GeoServerLayer) => (
                  <tr key={layer.name} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{layer.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-[10px]">{layer.qualified_name}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground truncate max-w-[200px]" title={layer.wms_url}>{layer.wms_url}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground truncate max-w-[200px]" title={layer.wfs_url}>{layer.wfs_url}</td>
                  </tr>
                ))}
                {layers.length === 0 && !loadingLayers && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No layers found. Try syncing.
                    </td>
                  </tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Data Type Routing</CardTitle>
                <CardDescription>
                  Map internal module data types (e.g., <code>lokasi_kantor</code>) to discovered GeoServer layers.
                </CardDescription>
              </div>
              <Button onClick={() => setMappingDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Mapping
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable 
                headers={["Module", "Data Type", "Label", "Source Table", "Target Layer", "Actions"]} 
                isLoading={loadingMappings}
              >
                {mappings.map((mapping) => (
                  <tr key={mapping.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm">{mapping.module_name}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="font-mono text-[10px]">{mapping.data_type}</Badge></td>
                    <td className="px-4 py-3 text-sm">{mapping.label}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{mapping.source_table || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{mapping.workspace}:{mapping.layer_name}</td>
                    <td className="px-4 py-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMapping.mutate(mapping.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && !loadingMappings && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No mappings configured.
                    </td>
                  </tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Layer Mapping</DialogTitle>
            <DialogDescription>Define routing rule for incoming data to map onto a GeoServer layer.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Target GeoServer Layer *</Label>
              <Select 
                value={mappingForm.layer_name} 
                onValueChange={(val) => setMappingForm(p => ({...p, layer_name: val}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parsed layer..." />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((l: GeoServerLayer) => (
                    <SelectItem key={l.name} value={l.name}>
                      {l.qualified_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module Name *</Label>
                <Input 
                  placeholder="e.g. kepegawaian" 
                  value={mappingForm.module_name}
                  onChange={(e) => setMappingForm(p => ({...p, module_name: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Type *</Label>
                <Input 
                  placeholder="e.g. lokasi_kantor" 
                  value={mappingForm.data_type}
                  onChange={(e) => setMappingForm(p => ({...p, data_type: e.target.value}))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UI Label</Label>
                <Input 
                  placeholder="e.g. Lokasi Kantor" 
                  value={mappingForm.label}
                  onChange={(e) => setMappingForm(p => ({...p, label: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Source Table (Optional)</Label>
                <Input 
                  placeholder="e.g. offices" 
                  value={mappingForm.source_table}
                  onChange={(e) => setMappingForm(p => ({...p, source_table: e.target.value}))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMapping} disabled={saveMapping.isPending}>
              {saveMapping.isPending ? "Saving..." : "Save Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </V2PageShell>
  );
};

export default GeoServerSettings;
