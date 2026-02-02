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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DatasetRegistrationForm } from "@/components/datasets/DatasetRegistrationForm";

const datasets = [
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
];

const Datasets = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFormOpen, setIsFormOpen] = useState(false);

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
            <Input placeholder="Search datasets..." className="pl-10" />
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
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
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
          {["All", "Lifting Data", "Reservoir Data", "Well Test", "Exploration"].map(
            (domain) => (
              <Button
                key={domain}
                variant={domain === "All" ? "default" : "outline"}
                size="sm"
                className={domain === "All" ? "bg-accent text-accent-foreground" : ""}
              >
                {domain}
              </Button>
            )
          )}
        </div>

        {/* Dataset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset, index) => (
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
                  <Badge
                    className={
                      dataset.status === "published"
                        ? "badge-active"
                        : "badge-pending"
                    }
                  >
                    {dataset.status}
                  </Badge>
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
                  <Button variant="ghost" size="sm" className="text-accent">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Registration Form Modal */}
        <DatasetRegistrationForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen}
        />
      </div>
    </div>
  );
};

export default Datasets;
