import { useState, useMemo } from "react";
import {
  Search,
  ExternalLink,
  RefreshCw,
  Server,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CategorySection } from "@/components/api-docs";
import type { ApiCategory } from "@/components/api-docs";
import { useOpenApiSpec } from "@/hooks/use-openapi-spec";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8184/api/v1";

// FastAPI exposes /docs and /openapi.json at root (bukan di bawah /api/v1).
const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

export default function ApiDocs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const {
    data: specData,
    isLoading,
    isError,
    error,
    refetch,
  } = useOpenApiSpec();

  const apiCategories = specData?.categories ?? [];

  // Filter categories and endpoints based on search
  const filteredCategories: ApiCategory[] = useMemo(
    () =>
      apiCategories
        .map((category) => ({
          ...category,
          endpoints: category.endpoints.filter(
            (endpoint) =>
              endpoint.path
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              endpoint.summary
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              endpoint.method
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((category) => category.endpoints.length > 0),
    [apiCategories, searchQuery]
  );

  const totalEndpoints = apiCategories.reduce(
    (acc, cat) => acc + cat.endpoints.length,
    0
  );

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${API_ROOT_URL}/openapi.json`, {
        method: "HEAD",
        mode: "cors",
        signal: AbortSignal.timeout(5000),
      });
      setIsConnected(response.ok);
      if (response.ok) refetch();
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
          <h1 className="text-2xl font-bold tracking-tight">
            API Documentation
          </h1>
          <p className="text-muted-foreground">
            {specData?.info?.title || "GX-Space"} v
            {specData?.info?.version || "0.1.0"} - Explore and test API
            endpoints
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
            onClick={() => window.open(`${API_ROOT_URL}/docs`, "_blank")}
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
              <span className="text-sm font-medium">Source:</span>
              <Badge variant="outline">
                {specData?.source === "backend"
                  ? "Live Backend"
                  : specData?.source === "local"
                    ? "Local Fallback"
                    : "—"}
              </Badge>
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

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Loading API documentation from server...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-lg font-medium">
              Failed to load API documentation
            </p>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || "An error occurred"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {!isLoading && !isError && (
        <div className="space-y-4">
          {filteredCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? `No endpoints found matching "${searchQuery}"`
                    : "No endpoints available"}
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
      )}

      {/* Footer Info */}
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Note:</strong> This documentation is loaded dynamically
              from the backend OpenAPI specification. For the full interactive
              Swagger UI, click the "Swagger UI" button above.
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
