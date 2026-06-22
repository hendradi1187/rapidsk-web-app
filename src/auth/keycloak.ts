import Keycloak from "keycloak-js";
import type { KeycloakInitOptions } from "keycloak-js";
import { getRuntimeSsoConfig } from "@/lib/runtime-config";

/**
 * Keycloak instance singleton — Phase 1B (IAM/SSO integration).
 *
 * Configuration via env vars:
 *   VITE_KEYCLOAK_URL           — base URL of Keycloak (e.g. http://localhost:8080)
 *   VITE_KEYCLOAK_REALM         — realm name (e.g. spektrum)
 *   VITE_KEYCLOAK_CLIENT_ID     — client ID (e.g. rapidsk-web)
 *
 * If any env var is missing, Keycloak integration is treated as DISABLED —
 * legacy rapiDSK login (form-based) tetap jalan sebagai fallback.
 *
 * Lihat `docs/SPEKTRUM_Migration_Plan.md` Section 4 (SSO Strategy).
 */

let keycloakInstance: Keycloak | null = null;

const resolveConfig = () => getRuntimeSsoConfig();

export const isKeycloakConfigured = (): boolean => {
  const config = resolveConfig();
  return Boolean(
    config.enabled &&
      config.keycloakUrl &&
      config.realm &&
      config.clientId,
  );
};

export const getKeycloak = (): Keycloak | null => {
  if (!isKeycloakConfigured()) return null;
  if (!keycloakInstance) {
    const config = resolveConfig();
    keycloakInstance = new Keycloak({
      url: config.keycloakUrl,
      realm: config.realm,
      clientId: config.clientId,
    });
  }
  return keycloakInstance;
};

export const keycloak = getKeycloak();

/**
 * Bootstrap Keycloak — dipanggil sekali di main.tsx sebelum render App.
 *
 * Mode `check-sso`: silent SSO check via iframe. Tidak redirect user kalau
 * belum login — App render normally dan user bisa klik "Login with SSO" di
 * Login page untuk explicit redirect.
 *
 * Returns `true` kalau user authenticated, `false` otherwise. Throws kalau
 * Keycloak tidak ter-konfigurasi (caller harus check `isKeycloakConfigured`
 * dulu).
 */
export async function initKeycloak(): Promise<boolean> {
  const keycloak = getKeycloak();
  if (!keycloak) {
    throw new Error(
      "Keycloak is not configured in runtime setup",
    );
  }

  const initOptions: KeycloakInitOptions = {
    onLoad: "check-sso",
    silentCheckSsoRedirectUri:
      window.location.origin + "/silent-check-sso.html",
    pkceMethod: "S256",
    checkLoginIframe: false, // less network noise; kita pakai event handlers manual
  };

  try {
    const authenticated = await keycloak.init(initOptions);

    if (authenticated && import.meta.env.DEV) {
      console.log("[Keycloak] authenticated as", keycloak.tokenParsed);
    }

    // Auto-refresh token sebelum expire (lead time 30 detik)
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch((err) => {
        console.warn("[Keycloak] token refresh failed:", err);
      });
    };

    return authenticated;
  } catch (err) {
    console.error("[Keycloak] init failed:", err);
    return false;
  }
}

/**
 * Trigger Keycloak login redirect.
 * After successful login, browser redirected back ke `redirectUri` (default
 * current page). Keycloak adapter akan exchange code → JWT secara otomatis.
 */
export function loginWithKeycloak(redirectUri?: string): void {
  const keycloak = getKeycloak();
  if (!keycloak) {
    console.warn("[Keycloak] not configured");
    return;
  }
  keycloak.login({
    redirectUri: redirectUri ?? window.location.origin + "/",
  });
}

/**
 * Trigger Keycloak logout — invalidates session di Keycloak side dan redirect
 * back ke `postLogoutRedirectUri`.
 */
export function logoutFromKeycloak(postLogoutRedirectUri?: string): void {
  const keycloak = getKeycloak();
  if (!keycloak) {
    console.warn("[Keycloak] not configured");
    return;
  }
  keycloak.logout({
    redirectUri: postLogoutRedirectUri ?? window.location.origin + "/login",
  });
}

/**
 * Try to refresh the access token. Returns `true` kalau token masih valid
 * atau berhasil di-refresh, `false` kalau gagal.
 *
 * Dipanggil dari axios interceptor untuk pastikan token belum expire saat
 * request dikirim.
 */
export async function ensureValidToken(
  minValiditySeconds = 30,
): Promise<boolean> {
  const keycloak = getKeycloak();
  if (!keycloak || !keycloak.authenticated) return false;
  try {
    await keycloak.updateToken(minValiditySeconds);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the current Keycloak access token, atau `null` kalau belum login
 * / Keycloak tidak ter-konfigurasi.
 */
export function getKeycloakToken(): string | null {
  const keycloak = getKeycloak();
  if (!keycloak || !keycloak.authenticated) return null;
  return keycloak.token ?? null;
}
