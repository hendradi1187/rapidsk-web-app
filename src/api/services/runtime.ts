import type {
  LicenseState,
  RuntimeBootstrapState,
  RuntimeConfig,
  SetupStatus,
} from "@/lib/runtime-config";
import { loadRuntimeBootstrapState } from "@/lib/runtime-config";

export interface SetupLicenseValidateRequest {
  licenseKey: string;
  publicAppUrl: string;
}

export interface SetupValidationRequest {
  apiBaseUrl: string;
  publicAppUrl: string;
  adapterEndpoint?: string;
  sso: {
    enabled: boolean;
    keycloakUrl: string;
    realm: string;
    clientId: string;
  };
}

export interface SetupCheckItem {
  key: string;
  label: string;
  status: "pass" | "warning" | "fail";
  message: string;
}

export interface SetupLicenseValidateResponse {
  valid: boolean;
  status: string;
  licensedHost: string;
  warnings: string[];
  blockingErrors: string[];
}

export interface SetupValidationResponse {
  checks: SetupCheckItem[];
  warnings: string[];
  blockingErrors: string[];
}

export interface SetupInitRequest extends SetupValidationRequest {
  licenseKey: string;
}

export interface RuntimeAdminUpdateRequest extends SetupValidationRequest {}

export const runtimeApi = {
  getBootstrapState: async (): Promise<RuntimeBootstrapState> => loadRuntimeBootstrapState(),

  validateLicense: async (
    body: SetupLicenseValidateRequest,
  ): Promise<SetupLicenseValidateResponse> => {
    const response = await fetch("/setup/license/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "License validation failed");
    return payload as SetupLicenseValidateResponse;
  },

  validateSetup: async (
    body: SetupValidationRequest,
  ): Promise<SetupValidationResponse> => {
    const response = await fetch("/setup/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Setup validation failed");
    return payload as SetupValidationResponse;
  },

  initializeSetup: async (
    body: SetupInitRequest,
  ): Promise<{
    setupStatus: SetupStatus;
    runtimeConfig: RuntimeConfig;
    licenseState: LicenseState;
  }> => {
    const response = await fetch("/setup/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Setup initialization failed");
    return payload;
  },

  updateRuntimeConfig: async (
    body: RuntimeAdminUpdateRequest,
    token?: string | null,
  ): Promise<{ runtimeConfig: RuntimeConfig; setupStatus: SetupStatus }> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch("/admin/runtime-config", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Runtime config update failed");
    return payload;
  },

  getLicenseStatus: async (token?: string | null): Promise<LicenseState> => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch("/admin/license-status", {
      headers,
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Failed to load license status");
    return payload as LicenseState;
  },

  revalidateLicense: async (
    token?: string | null,
  ): Promise<{
    licenseState: LicenseState;
    warnings: string[];
    blockingErrors: string[];
  }> => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch("/admin/license/revalidate", {
      method: "POST",
      headers,
      credentials: "same-origin",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "License revalidation failed");
    return payload;
  },
};
