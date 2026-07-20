import type { AxiosInstance } from "axios";

export interface RuntimeServiceMap {
  auth: string;
  cts: string;
  connector: string;
  adapter: string;
  monitoring: string;
}

export interface RuntimeSsoConfig {
  enabled: boolean;
  keycloakUrl: string;
  realm: string;
  clientId: string;
}

export type RuntimeServiceName =
  | "auth"
  | "cts"
  | "connector"
  | "adapter"
  | "monitoring";

export interface RuntimeServicesConfig {
  auth: string;
  cts: string;
  connector: string;
  adapter: string;
  monitoring: string;
}

export interface RuntimeConfig {
  initialized: boolean;
  publicAppUrl: string;
  apiBaseUrl: string;
  adapterEndpoint: string;
  sso: RuntimeSsoConfig;
  services: RuntimeServiceMap;
  /**
   * Target upstream ASLI dari runtime.json wrapper (URL absolut). Browser tidak memakai
   * ini untuk request — `services` sudah berisi path same-origin wrapper (bebas CORS).
   * Dipakai halaman Deployment Config supaya admin melihat/menyimpan target sebenarnya.
   */
  upstreams?: {
    apiBaseUrl: string;
    adapterEndpoint: string;
    services: RuntimeServiceMap;
  } | null;
}

export interface LicenseState {
  licenseKeyMasked: string;
  licenseStatus: string;
  licensedHost: string;
  activatedAt: string | null;
  expiresAt: string | null;
  lastValidationAt: string | null;
}

export interface SetupStatus {
  initialized: boolean;
  configValid: boolean;
  licenseValid: boolean;
  serverPermissionValid?: boolean;
  needsSetup: boolean;
  warnings: string[];
  blockingErrors: string[];
}

export interface RuntimeBootstrapState {
  source: "bootstrap" | "fallback";
  ready: boolean;
  setupStatus: SetupStatus;
  runtimeConfig: RuntimeConfig | null;
  licenseState: LicenseState | null;
}

const FRONTEND_API_BASE_PATH = "/api/v1";
const FRONTEND_ADAPTER_RUNTIME_BASE_PATH = "/adapter-runtime";
const FRONTEND_ADAPTER_SERVICE_BASE_PATH = "/adapter-service";
// Connector service (8582/8583) di dev lewat proxy Vite `/connector-api` (strip prefix).
const FRONTEND_CONNECTOR_SERVICE_BASE_PATH = "/connector-api/api/v1";

const normalizeBaseUrl = (value: string | undefined | null): string =>
  String(value ?? "").trim().replace(/\/+$/, "");

const isLocalDevHost = (): boolean => {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname.trim().toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const defaultApiBaseUrl =
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) || FRONTEND_API_BASE_PATH;
const defaultPrimaryApiBaseUrl = defaultApiBaseUrl;
const defaultPublicAppUrl =
  typeof window !== "undefined" ? window.location.origin : "";
const defaultAdapterEndpoint =
  normalizeBaseUrl(import.meta.env.VITE_ADAPTER_ENDPOINT) || "";

const defaultSsoConfig: RuntimeSsoConfig = {
  enabled: Boolean(
    import.meta.env.VITE_KEYCLOAK_URL &&
      import.meta.env.VITE_KEYCLOAK_REALM &&
      import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  ),
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL || "",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "",
};

const buildRuntimeServices = (
  services?: Partial<RuntimeServicesConfig> | null,
  apiBaseUrl?: string | null,
  adapterEndpoint?: string | null,
): RuntimeServiceMap => {
  if (isLocalDevHost()) {
    return {
      auth: FRONTEND_API_BASE_PATH,
      cts: FRONTEND_API_BASE_PATH,
      connector: FRONTEND_CONNECTOR_SERVICE_BASE_PATH,
      adapter: FRONTEND_ADAPTER_SERVICE_BASE_PATH,
      monitoring: FRONTEND_API_BASE_PATH,
    };
  }

  const normalizedPrimary =
    normalizeBaseUrl(
      services?.cts ||
        services?.auth ||
        services?.connector ||
        services?.monitoring ||
        apiBaseUrl ||
        defaultPrimaryApiBaseUrl,
    ) || FRONTEND_API_BASE_PATH;

  const normalizedAdapter = normalizeBaseUrl(
    services?.adapter || adapterEndpoint || defaultAdapterEndpoint,
  );

  return {
    auth: normalizeBaseUrl(services?.auth || normalizedPrimary) || normalizedPrimary,
    cts: normalizeBaseUrl(services?.cts || normalizedPrimary) || normalizedPrimary,
    connector:
      normalizeBaseUrl(services?.connector || normalizedPrimary) || normalizedPrimary,
    adapter: normalizedAdapter,
    monitoring:
      normalizeBaseUrl(services?.monitoring || normalizedPrimary) || normalizedPrimary,
  };
};

const defaultRuntimeConfig: RuntimeConfig = {
  initialized: false,
  publicAppUrl: defaultPublicAppUrl,
  apiBaseUrl: isLocalDevHost() ? FRONTEND_API_BASE_PATH : defaultPrimaryApiBaseUrl,
  adapterEndpoint: isLocalDevHost()
    ? FRONTEND_ADAPTER_SERVICE_BASE_PATH
    : defaultAdapterEndpoint,
  sso: defaultSsoConfig,
  services: buildRuntimeServices(undefined, defaultPrimaryApiBaseUrl, defaultAdapterEndpoint),
};

let bootstrapState: RuntimeBootstrapState = {
  source: "fallback",
  ready: true,
  setupStatus: {
    initialized: false,
    configValid: false,
    licenseValid: false,
    serverPermissionValid: false,
    needsSetup: true,
    warnings: [],
    blockingErrors: ["Bootstrap runtime belum dimuat."],
  },
  runtimeConfig: null,
  licenseState: null,
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON, got ${contentType || "unknown"}`);
  }
  return response.json() as Promise<T>;
};

const fallbackSetupStatus = (): SetupStatus => ({
  initialized: false,
  configValid: false,
  licenseValid: false,
  serverPermissionValid: false,
  needsSetup: true,
  warnings: [
    "Bootstrap server tidak terdeteksi. FE memakai fallback lokal/proxy.",
  ],
  blockingErrors: [
    "Wrapper runtime tidak aktif atau runtime-config server gagal dibaca.",
  ],
});

export function normalizeRuntimeConfig(
  runtimeConfig?: Partial<RuntimeConfig> | null,
): RuntimeConfig {
  const services = buildRuntimeServices(
    runtimeConfig?.services,
    runtimeConfig?.apiBaseUrl,
    runtimeConfig?.adapterEndpoint,
  );

  const normalizedApiBaseUrl =
    services.cts ||
    normalizeBaseUrl(runtimeConfig?.apiBaseUrl) ||
    (isLocalDevHost() ? FRONTEND_API_BASE_PATH : defaultPrimaryApiBaseUrl);

  const normalizedAdapterEndpoint =
    services.adapter ||
    normalizeBaseUrl(runtimeConfig?.adapterEndpoint) ||
    (isLocalDevHost() ? FRONTEND_ADAPTER_SERVICE_BASE_PATH : defaultAdapterEndpoint);

  return {
    initialized: Boolean(runtimeConfig?.initialized),
    publicAppUrl: String(runtimeConfig?.publicAppUrl || defaultPublicAppUrl || ""),
    apiBaseUrl: normalizedApiBaseUrl,
    adapterEndpoint: normalizedAdapterEndpoint,
    sso: runtimeConfig?.sso ?? defaultSsoConfig,
    services,
    upstreams: runtimeConfig?.upstreams ?? null,
  };
}

export async function loadRuntimeBootstrapState(): Promise<RuntimeBootstrapState> {
  try {
    const statusResponse = await fetch("/setup/status", {
      signal: AbortSignal.timeout(5000),
      credentials: "same-origin",
    });

    if (!statusResponse.ok) {
      throw new Error(`Setup status unavailable (${statusResponse.status})`);
    }

    const statusPayload = await parseJson<{
      initialized: boolean;
      configValid: boolean;
      licenseValid: boolean;
      needsSetup: boolean;
      warnings?: string[];
      blockingErrors?: string[];
      licenseState?: LicenseState | null;
      serverPermissionValid?: boolean;
    }>(statusResponse);

    const setupStatus: SetupStatus = {
      initialized: statusPayload.initialized,
      configValid: statusPayload.configValid,
      licenseValid: statusPayload.licenseValid,
      serverPermissionValid: statusPayload.serverPermissionValid ?? true,
      needsSetup: statusPayload.needsSetup,
      warnings: statusPayload.warnings ?? [],
      blockingErrors: statusPayload.blockingErrors ?? [],
    };

    let runtimeConfig: RuntimeConfig | null = null;

    if (setupStatus.initialized && !setupStatus.needsSetup) {
      const configResponse = await fetch("/runtime-config.json", {
        signal: AbortSignal.timeout(5000),
        credentials: "same-origin",
      });

      if (configResponse.ok) {
        const raw = await parseJson<Partial<RuntimeConfig>>(configResponse);
        runtimeConfig = normalizeRuntimeConfig({
          initialized: raw.initialized ?? true,
          publicAppUrl: raw.publicAppUrl ?? defaultPublicAppUrl,
          apiBaseUrl: raw.apiBaseUrl ?? defaultPrimaryApiBaseUrl,
          adapterEndpoint: raw.adapterEndpoint ?? defaultAdapterEndpoint,
          sso: raw.sso ?? defaultSsoConfig,
          services: raw.services,
          upstreams: raw.upstreams,
        });
      } else {
        setupStatus.configValid = false;
        setupStatus.needsSetup = true;
        setupStatus.blockingErrors = [
          ...setupStatus.blockingErrors,
          "Runtime config tidak dapat dimuat dari server wrapper.",
        ];
      }
    }

    bootstrapState = {
      source: "bootstrap",
      ready: true,
      setupStatus,
      runtimeConfig,
      licenseState: statusPayload.licenseState ?? null,
    };
    return bootstrapState;
  } catch {
    bootstrapState = {
      source: "fallback",
      ready: true,
      setupStatus: fallbackSetupStatus(),
      runtimeConfig: normalizeRuntimeConfig(defaultRuntimeConfig),
      licenseState: null,
    };
    return bootstrapState;
  }
}

export async function initializeRuntime(): Promise<RuntimeBootstrapState> {
  const state = await loadRuntimeBootstrapState();
  if (typeof window !== "undefined") {
    window.__RAPIDSK_BOOTSTRAP__ = state;
  }
  return state;
}

export function getRuntimeBootstrapState(): RuntimeBootstrapState {
  if (typeof window !== "undefined" && window.__RAPIDSK_BOOTSTRAP__) {
    return window.__RAPIDSK_BOOTSTRAP__;
  }
  return bootstrapState;
}

export function setRuntimeBootstrapState(state: RuntimeBootstrapState): void {
  bootstrapState = state;
  if (typeof window !== "undefined") {
    window.__RAPIDSK_BOOTSTRAP__ = state;
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return normalizeRuntimeConfig(
    getRuntimeBootstrapState().runtimeConfig ?? defaultRuntimeConfig,
  );
}

export function getRuntimeServices(): RuntimeServiceMap {
  return getRuntimeConfig().services;
}

export function getRuntimeServiceUrl(name: RuntimeServiceName): string {
  return getRuntimeServices()[name] || "";
}

export function getRuntimePublicAppUrl(): string {
  return getRuntimeConfig().publicAppUrl || defaultPublicAppUrl;
}

export function getRuntimeBackendApiBaseUrl(): string {
  return getRuntimeServiceUrl("cts") || getRuntimeConfig().apiBaseUrl || FRONTEND_API_BASE_PATH;
}

export function getRuntimeAdapterEndpoint(): string {
  return (
    getRuntimeServices().adapter ||
    getRuntimeConfig().adapterEndpoint ||
    FRONTEND_ADAPTER_SERVICE_BASE_PATH
  );
}

export function getFrontendApiBasePath(_service?: RuntimeServiceName): string {
  return FRONTEND_API_BASE_PATH;
}

export function getFrontendAdapterRuntimeBasePath(): string {
  return FRONTEND_ADAPTER_RUNTIME_BASE_PATH;
}

export function getRuntimeSsoConfig(): RuntimeSsoConfig {
  return getRuntimeConfig().sso;
}

export function getAuthServiceBaseUrl(): string {
  return getRuntimeServices().auth || getRuntimeBackendApiBaseUrl();
}

export function getCtsServiceBaseUrl(): string {
  return getRuntimeServices().cts || getRuntimeBackendApiBaseUrl();
}

export function getConnectorServiceBaseUrl(): string {
  return getRuntimeServices().connector || getRuntimeBackendApiBaseUrl();
}

export function getAdapterServiceBaseUrl(): string {
  return getRuntimeServices().adapter || getRuntimeAdapterEndpoint();
}

export function getMonitoringServiceBaseUrl(): string {
  return getRuntimeServices().monitoring || getRuntimeBackendApiBaseUrl();
}

const clients: Record<string, AxiosInstance> = {};

export function registerLogicalClient(name: string, instance: AxiosInstance): void {
  clients[name] = instance;
}

export function getLogicalClient(name: string): AxiosInstance | undefined {
  return clients[name];
}

declare global {
  interface Window {
    __RAPIDSK_BOOTSTRAP__?: RuntimeBootstrapState;
  }
}
