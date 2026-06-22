export interface RuntimeSsoConfig {
  enabled: boolean;
  keycloakUrl: string;
  realm: string;
  clientId: string;
}

export interface RuntimeConfig {
  initialized: boolean;
  publicAppUrl: string;
  apiBaseUrl: string;
  adapterEndpoint: string;
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

const defaultApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";

const defaultPublicAppUrl =
  typeof window !== "undefined" ? window.location.origin : "";

const defaultRuntimeConfig: RuntimeConfig = {
  initialized: true,
  publicAppUrl: defaultPublicAppUrl,
  apiBaseUrl: defaultApiBaseUrl,
  adapterEndpoint: import.meta.env.VITE_ADAPTER_ENDPOINT || "",
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
    initialized: true,
    configValid: true,
    licenseValid: true,
    needsSetup: false,
    warnings: [],
    blockingErrors: [],
  },
  runtimeConfig: defaultRuntimeConfig,
  licenseState: null,
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON response, got ${contentType || "unknown content type"}`);
  }
  return response.json() as Promise<T>;
};

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
    }>(statusResponse);

    const setupStatus: SetupStatus = {
      initialized: statusPayload.initialized,
      configValid: statusPayload.configValid,
      licenseValid: statusPayload.licenseValid,
      serverPermissionValid: (statusPayload as { serverPermissionValid?: boolean }).serverPermissionValid ?? true,
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
        runtimeConfig = await parseJson<RuntimeConfig>(configResponse);
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
        initialized: true,
        configValid: true,
        licenseValid: true,
        needsSetup: false,
        warnings: ["Bootstrap server tidak terdeteksi, memakai fallback dev/local."],
        blockingErrors: [],
      },
      runtimeConfig: defaultRuntimeConfig,
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
  return getRuntimeBootstrapState().runtimeConfig ?? defaultRuntimeConfig;
}

export function getRuntimePublicAppUrl(): string {
  return getRuntimeConfig().publicAppUrl || defaultPublicAppUrl;
}

export function getRuntimeBackendApiBaseUrl(): string {
  return getRuntimeConfig().apiBaseUrl || defaultApiBaseUrl;
}

export function getRuntimeAdapterEndpoint(): string {
  return getRuntimeConfig().adapterEndpoint || "";
}

export function getFrontendApiBasePath(): string {
  return "/api/v1";
}

export function getRuntimeSsoConfig(): RuntimeSsoConfig {
  return getRuntimeConfig().sso;
}

declare global {
  interface Window {
    __RAPIDSK_BOOTSTRAP__?: RuntimeBootstrapState;
  }
}
