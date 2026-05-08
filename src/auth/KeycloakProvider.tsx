import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { initKeycloak, isKeycloakConfigured, keycloak } from "./keycloak";

/**
 * Loader sederhana saat Keycloak init. Di-inline di sini supaya tidak
 * import dari `@/components/auth/ProtectedRoute` (yang import balik dari
 * AuthContext, bikin circular dependency).
 */
const KeycloakLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
      <p className="text-muted-foreground text-sm">Connecting to identity provider...</p>
    </div>
  </div>
);

interface KeycloakContextValue {
  /** Apakah Keycloak ter-konfigurasi (env vars terisi). */
  enabled: boolean;
  /** Apakah init sudah selesai (success or fail). */
  initialized: boolean;
  /** Apakah user authenticated via Keycloak. */
  authenticated: boolean;
  /**
   * Token version counter — di-increment setiap refresh sukses, supaya
   * consumer (axios interceptor pakai snapshot, atau components yang track
   * token) bisa re-render kalau perlu.
   */
  tokenVersion: number;
}

const KeycloakContext = createContext<KeycloakContextValue>({
  enabled: false,
  initialized: false,
  authenticated: false,
  tokenVersion: 0,
});

interface KeycloakProviderProps {
  children: ReactNode;
}

/**
 * Bootstrap Keycloak SSO sebelum render App.
 *
 * Behaviour:
 *   - Kalau Keycloak tidak ter-konfigurasi (env vars kosong) → langsung render
 *     children. Legacy rapiDSK login flow yang dipakai.
 *   - Kalau ter-konfigurasi → init Keycloak (silent SSO check). Tampilkan
 *     loading spinner sampai init selesai. Setelah itu render children.
 *
 * Children bisa pakai `useKeycloak()` untuk akses status auth.
 */
export const KeycloakProvider = ({ children }: KeycloakProviderProps) => {
  const [initialized, setInitialized] = useState(!isKeycloakConfigured);
  const [authenticated, setAuthenticated] = useState(false);
  const [tokenVersion, setTokenVersion] = useState(0);

  useEffect(() => {
    if (!isKeycloakConfigured) {
      // Skip init kalau Keycloak tidak ada — fallback ke legacy auth
      return;
    }

    let cancelled = false;

    initKeycloak()
      .then((isAuth) => {
        if (cancelled) return;
        setAuthenticated(isAuth);
        setInitialized(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Keycloak] init error:", err);
        setInitialized(true); // tetap render App pakai legacy auth
      });

    // Subscribe ke token refresh events untuk trigger re-render consumer
    if (keycloak) {
      keycloak.onAuthRefreshSuccess = () => {
        setTokenVersion((v) => v + 1);
      };
      keycloak.onAuthSuccess = () => {
        setAuthenticated(true);
        setTokenVersion((v) => v + 1);
      };
      keycloak.onAuthLogout = () => {
        setAuthenticated(false);
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (!initialized) {
    return <KeycloakLoadingScreen />;
  }

  return (
    <KeycloakContext.Provider
      value={{
        enabled: isKeycloakConfigured,
        initialized,
        authenticated,
        tokenVersion,
      }}
    >
      {children}
    </KeycloakContext.Provider>
  );
};

/**
 * React hook untuk akses Keycloak status. Berbeda dengan `useAuth` (rapiDSK
 * AuthContext), hook ini fokus ke Keycloak-level state (init, authenticated).
 *
 * Untuk akses user data + roles + permissions, pakai `useAuth()` dari
 * `@/context/AuthContext`.
 */
export const useKeycloak = (): KeycloakContextValue => {
  return useContext(KeycloakContext);
};
