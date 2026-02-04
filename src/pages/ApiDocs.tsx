import { useState } from "react";
import { Search, ExternalLink, RefreshCw, Server } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CategorySection, apiCategories, ApiCategory } from "@/components/api-docs";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://45.158.126.171:8181";

export default function ApiDocs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Filter categories and endpoints based on search
  const filteredCategories: ApiCategory[] = apiCategories
    .map((category) => ({
      ...category,
      endpoints: category.endpoints.filter(
        (endpoint) =>
          endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          endpoint.method.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.endpoints.length > 0);

  const totalEndpoints = apiCategories.reduce(
    (acc, cat) => acc + cat.endpoints.length,
    0
  );

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        mode: "cors",
      });
      setIsConnected(response.ok);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">
            RapiDSK Connector API - Explore and test API endpoints
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnection}
            disabled={isChecking}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`}
            />
            Check Connection
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(`${API_BASE_URL}/docs`, "_blank")
            }
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Swagger UI
          </Button>
        </div>
      </div>

      {/* API Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Base URL:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {API_BASE_URL}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {isConnected === null ? (
                <Badge variant="secondary">Not checked</Badge>
              ) : isConnected ? (
                <Badge variant="default" className="bg-green-500">
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">Disconnected</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total Endpoints:</span>
              <Badge variant="outline">{totalEndpoints}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Categories:</span>
              <Badge variant="outline">{apiCategories.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search endpoints by path, method, or description..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No endpoints found matching "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category, index) => (
            <CategorySection
              key={category.name}
              category={category}
              defaultOpen={index === 0}
            />
          ))
        )}
      </div>

      {/* Footer Info */}
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Note:</strong> This documentation is generated from the
              OpenAPI specification. For the full interactive Swagger UI, click
              the "Swagger UI" button above.
            </p>
            <p>
              Use the "Try it out" feature to test API endpoints directly. Make
              sure the backend server is running and accessible.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
