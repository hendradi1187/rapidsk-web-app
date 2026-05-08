import { useQuery } from "@tanstack/react-query";
import { parseOpenApiSpec } from "@/components/api-docs/openapi-parser";
import type { ApiCategory } from "@/components/api-docs/api-endpoints";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export interface OpenApiSpecResult {
  categories: ApiCategory[];
  source: "backend" | "local";
  info?: { title: string; version: string };
}

/**
 * FastAPI default expose `/openapi.json` di root (bukan di bawah /api/v1).
 * Strip suffix /api/v1 (kalau ada) supaya fetch ke `${root}/openapi.json` benar.
 */
function deriveRootUrl(baseUrl: string): string {
  return baseUrl.replace(/\/api\/v\d+\/?$/, "");
}

async function fetchOpenApiSpec(): Promise<OpenApiSpecResult> {
  let spec: Record<string, unknown>;
  let source: "backend" | "local" = "backend";

  try {
    const rootUrl = deriveRootUrl(API_BASE_URL);
    const response = await fetch(`${rootUrl}/openapi.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    spec = await response.json();
  } catch {
    // Fallback to local copy in public/
    source = "local";
    const fallbackResponse = await fetch("/openapi.json");
    if (!fallbackResponse.ok)
      throw new Error("Failed to load OpenAPI specification");
    spec = await fallbackResponse.json();
  }

  const categories = parseOpenApiSpec(spec);
  const info = spec.info as { title: string; version: string } | undefined;

  return { categories, source, info };
}

export function useOpenApiSpec() {
  return useQuery({
    queryKey: ["openapi-spec"],
    queryFn: fetchOpenApiSpec,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
