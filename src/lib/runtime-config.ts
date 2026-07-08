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
  services: RuntimeServicesConfig;
  sso: RuntimeSsoConfig;
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

const defaultPrimaryApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const defaultAdapterEndpoint =
  import.meta.env.VITE_ADAPTER_ENDPOINT || "http://100.66.10.14:8182";
const defaultPublicAppUrl =
  typeof window !== "undefined" ? window.location.origin : "";

const normalizeBaseUrl = (value: string | undefined | null) =>
  String(value || "").trim().replace(/\/+$/, "");

const buildRuntimeServices = (
  services?: Partial<RuntimeServicesConfig> | null,
  apiBaseUrl?: string | null,
  adapterEndpoint?: string | null,
): RuntimeServicesConfig => {
  const normalizedPrimary = normalizeBaseUrl(
    services?.cts ||
      services?.auth ||
      services?.connector ||
      services?.monitoring ||
      apiBaseUrl ||
      defaultPrimaryApiBaseUrl,
  );
  const normalizedAdapter = normalizeBaseUrl(
    services?.adapter || adapterEndpoint || defaultAdapterEndpoint,
  );

  return {
    auth: normalizeBaseUrl(services?.auth || normalizedPrimary),
    cts: normalizeBaseUrl(services?.cts || normalizedPrimary),
    connector: normalizeBaseUrl(services?.connector || normalizedPrimary),
    adapter: normalizedAdapter,
    monitoring: normalizeBaseUrl(services?.monitoring || normalizedPrimary),
  };
};

const defaultRuntimeConfig: RuntimeConfig = {
  initialized: false,
  publicAppUrl: defaultPublicAppUrl,
  apiBaseUrl: normalizeBaseUrl(defaultPrimaryApiBaseUrl),
  adapterEndpoint: normalizeBaseUrl(defaultAdapterEndpoint),
  services: buildRuntimeServices(undefined, defaultPrimaryApiBaseUrl, defaultAdapterEndpoint),
  sso: {
    enabled: Boolean(
      import.meta.env.VITE_KEYCLOAK_URL &&
        import.meta.env.VITE_KEYCLOAK_REALM &&
        import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    ),
    keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL || "",
    realm: import.meta.env.VITE_KEYCLOAK_REALM || "",
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "",
  },
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
    throw new Error(`Expected JSON response, got ${contentType || "unknown content type"}`);
  }
  return response.json() as Promise<T>;
};

export function normalizeRuntimeConfig(
  runtimeConfig?: Partial<RuntimeConfig> | null,
): RuntimeConfig {
  const normalizedApiBaseUrl = normalizeBaseUrl(
    runtimeConfig?.apiBaseUrl || runtimeConfig?.services?.cts || defaultPrimaryApiBaseUrl,
  );
  const normalizedAdapterEndpoint = normalizeBaseUrl(
    runtimeConfig?.adapterEndpoint || runtimeConfig?.services?.adapter || defaultAdapterEndpoint,
  );

  return {
    initialized: Boolean(runtimeConfig?.initialized),
    publicAppUrl: String(runtimeConfig?.publicAppUrl || defaultPublicAppUrl || ""),
    apiBaseUrl: normalizedApiBaseUrl,
    adapterEndpoint: normalizedAdapterEndpoint,
    services: buildRuntimeServices(
      runtimeConfig?.services,
      normalizedApiBaseUrl,
      normalizedAdapterEndpoint,
    ),
    sso: {
      enabled: Boolean(runtimeConfig?.sso?.enabled),
      keycloakUrl: String(runtimeConfig?.sso?.keycloakUrl || ""),
      realm: String(runtimeConfig?.sso?.realm || ""),
      clientId: String(runtimeConfig?.sso?.clientId || ""),
    },
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
        runtimeConfig = normalizeRuntimeConfig(await parseJson<RuntimeConfig>(configResponse));
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
      setupStatus: {
        initialized: false,
        configValid: false,
        licenseValid: false,
        serverPermissionValid: false,
        needsSetup: true,
        warnings: [
          "Bootstrap server tidak terdeteksi. Mode dev murni tidak bisa membaca atau menyimpan runtime config server-side.",
        ],
        blockingErrors: [
          "Wrapper belum aktif. Jalankan browser bundle kalau mau setup tersimpan ke config/runtime.json dan config/license-state.json.",
        ],
      },
      runtimeConfig: null,
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
  return normalizeRuntimeConfig(getRuntimeBootstrapState().runtimeConfig ?? defaultRuntimeConfig);
}

export function getRuntimePublicAppUrl(): string {
  return getRuntimeConfig().publicAppUrl || defaultPublicAppUrl;
}

export function getRuntimeServices(): RuntimeServicesConfig {
  return getRuntimeConfig().services;
}

export function getRuntimeServiceUrl(serviceName: RuntimeServiceName): string {
  return getRuntimeServices()[serviceName] || "";
}

export function getRuntimeBackendApiBaseUrl(): string {
  return (
    getRuntimeServiceUrl("cts") ||
    getRuntimeConfig().apiBaseUrl ||
    normalizeBaseUrl(defaultPrimaryApiBaseUrl)
  );
}

export function getRuntimeAdapterEndpoint(): string {
  return getRuntimeServiceUrl("adapter") || getRuntimeConfig().adapterEndpoint || "";
}

export function getFrontendApiBasePath(
  serviceName: RuntimeServiceName = "cts",
): string {
  if (serviceName === "adapter") {
    return "/adapter-service/api/v1";
  }
  return "/api/v1";
}

export function getFrontendAdapterRuntimeBasePath(): string {
  return "/adapter-runtime";
}

export function getRuntimeSsoConfig(): RuntimeSsoConfig {
  return getRuntimeConfig().sso;
}

declare global {
  interface Window {
    __RAPIDSK_BOOTSTRAP__?: RuntimeBootstrapState;
  }
}
