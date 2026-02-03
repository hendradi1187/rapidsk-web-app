import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Database, Globe, Plus, TestTube } from "lucide-react";
import { toast } from "sonner";

export const StepDataset = () => {
  const handleTestConnection = () => {
    toast.info("Testing connection...", { duration: 1500 });
    setTimeout(() => {
      toast.success("Connection successful!", {
        description: "GeoServer endpoint is accessible.",
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* GeoServer Configuration */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Globe className="w-4 h-4" />
          GeoServer Endpoint Configuration
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="geoserverUrl">GeoServer Base URL *</Label>
            <Input id="geoserverUrl" placeholder="https://geoserver.company.com/geoserver" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace</Label>
            <Input id="workspace" placeholder="e.g., hulu_migas" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wms">WMS (Web Map Service)</SelectItem>
                <SelectItem value="wfs">WFS (Web Feature Service)</SelectItem>
                <SelectItem value="wcs">WCS (Web Coverage Service)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="layerName">Layer Name *</Label>
            <Input id="layerName" placeholder="e.g., well_locations" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.1.1">1.1.1</SelectItem>
                <SelectItem value="1.3.0">1.3.0</SelectItem>
                <SelectItem value="2.0.0">2.0.0</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Button variant="outline" onClick={handleTestConnection} className="gap-2">
            <TestTube className="w-4 h-4" />
            Test Connection
          </Button>
        </div>
      </div>

      {/* Dataset Metadata */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Database className="w-4 h-4" />
          Initial Dataset Registration
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="datasetName">Dataset Name *</Label>
            <Input id="datasetName" placeholder="e.g., Cepu Block Well Locations" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataDomain">Data Domain *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seismic">Seismic Data</SelectItem>
                <SelectItem value="well">Well Logs</SelectItem>
                <SelectItem value="production">Production Data</SelectItem>
                <SelectItem value="geological">Geological Maps</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="datasetDesc">Description</Label>
          <Textarea 
            id="datasetDesc" 
            placeholder="Describe the dataset content, coverage, and purpose..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="format">Output Format</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geojson">GeoJSON</SelectItem>
                <SelectItem value="gml">GML</SelectItem>
                <SelectItem value="kml">KML</SelectItem>
                <SelectItem value="shapefile">Shapefile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessLevel">Access Level *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="updateFreq">Update Frequency</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Another Dataset
        </Button>
      </div>
    </div>
  );
};
