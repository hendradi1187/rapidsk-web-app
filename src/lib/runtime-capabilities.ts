export type RuntimeEndpointStatus =
  | "live"
  | "broken_backend"
  | "missing_backend"
  | "fallback_available";

export interface RuntimeCapability {
  id: string;
  label: string;
  status: RuntimeEndpointStatus;
  primaryEndpoint: string;
  fallbackEndpoint?: string | null;
  fallbackMode?: string | null;
  description: string;
}

export interface RuntimeExecutionLogEntry {
  id: string;
  intent: string;
  endpointStatus: RuntimeEndpointStatus;
  primaryEndpoint: string;
  fallbackEndpoint?: string | null;
  fallbackMode?: string | null;
  outcome: "idle" | "success" | "error" | "fallback";
  detail: string;
  occurredAt: string;
}

export const runtimeCapabilities = {
  transferHistory: {
    id: "transfer-history",
    label: "Transfer History",
    status: "fallback_available",
    primaryEndpoint: "/api/v1/{domain_id}/transfer-processes/history",
    fallbackEndpoint: "/api/v1/{domain_id}/transfer-processes/active + /api/v1/{domain_id}/data-transfers",
    fallbackMode: "degraded_runtime_history",
    description: "History exists in OpenAPI but is broken at runtime; frontend must fallback.",
  } satisfies RuntimeCapability,
  contractTransferReport: {
    id: "contract-transfer-report",
    label: "Contract Transfer Report",
    status: "missing_backend",
    primaryEndpoint: "/api/v1/{domain_id}/transfer-reports?contract_id={contract_id}",
    fallbackEndpoint: "/api/v1/{domain_id}/data-transfers",
    fallbackMode: "domain_scoped_report",
    description: "No dedicated contract-scoped report endpoint exists; frontend joins domain transfer data client-side.",
  } satisfies RuntimeCapability,
  datasetHealth: {
    id: "dataset-health",
    label: "Dataset Health Check",
    status: "missing_backend",
    primaryEndpoint: "/api/v1/data-catalog/{domain_id}/datasets/{id}/health",
    fallbackEndpoint: null,
    fallbackMode: null,
    description: "Dataset health endpoint is not provided by backend.",
  } satisfies RuntimeCapability,
  providerProvide: {
    id: "provider-provide",
    label: "Trigger Provide",
    status: "live",
    primaryEndpoint: "/api/v1/provider/{domain_id}/provide/{agreement_id}",
    fallbackEndpoint: null,
    fallbackMode: null,
    description: "Provider runtime trigger is live.",
  } satisfies RuntimeCapability,
  consumerConsume: {
    id: "consumer-consume",
    label: "Trigger Consume",
    status: "live",
    primaryEndpoint: "/api/v1/consumer/{domain_id}/consume/{agreement_id}",
    fallbackEndpoint: null,
    fallbackMode: null,
    description: "Consumer runtime trigger is live.",
  } satisfies RuntimeCapability,
  channels: {
    id: "channels",
    label: "Communication Channels",
    status: "live",
    primaryEndpoint: "/api/v1/{domain_id}/channels",
    fallbackEndpoint: null,
    fallbackMode: null,
    description: "Channel lifecycle endpoints are live.",
  } satisfies RuntimeCapability,
  transferProcessMutations: {
    id: "transfer-process-mutations",
    label: "Transfer Process Actions",
    status: "live",
    primaryEndpoint: "/api/v1/{domain_id}/transfer-processes/*",
    fallbackEndpoint: null,
    fallbackMode: null,
    description: "Transfer process mutations are live.",
  } satisfies RuntimeCapability,
  dataTransferMutations: {
    id: "data-transfer-mutations",
    label: "Data Transfer Actions",
    status: "live",
    primaryEndpoint: "/api/v1/{domain_id}/data-transfers/*",
    fallbackEndpoint: null,
    fallbackMode: null,
    description: "Data transfer mutation endpoints are live.",
  } satisfies RuntimeCapability,
  contractFulfilmentPatch: {
    id: "contract-fulfilment-patch",
    label: "Contract Fulfilment Patch",
    status: "live",
    primaryEndpoint: "/api/v1/policy-contract/{domain_id}/contracts/{id}",
    fallbackEndpoint: null,
    fallbackMode: null,
    description: "Provider fulfilment still uses contract PATCH because no dedicated fulfilment endpoint exists.",
  } satisfies RuntimeCapability,
};

export function formatRuntimeStatusLabel(status: RuntimeEndpointStatus) {
  switch (status) {
    case "live":
      return "Live Endpoint";
    case "broken_backend":
      return "Broken in Backend";
    case "missing_backend":
      return "Missing Endpoint";
    case "fallback_available":
      return "Broken, Using Fallback";
    default:
      return "Unknown";
  }
}

export function createRuntimeExecutionLog(
  capability: RuntimeCapability,
  intent: string,
  outcome: RuntimeExecutionLogEntry["outcome"],
  detail: string
): RuntimeExecutionLogEntry {
  return {
    id: `${capability.id}-${Date.now()}`,
    intent,
    endpointStatus: capability.status,
    primaryEndpoint: capability.primaryEndpoint,
    fallbackEndpoint: capability.fallbackEndpoint,
    fallbackMode: capability.fallbackMode,
    outcome,
    detail,
    occurredAt: new Date().toISOString(),
  };
}
