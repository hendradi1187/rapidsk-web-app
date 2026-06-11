// src/api/hooks/useAuth.ts
//
// Auth-related hooks (Phase 1B+ — Keycloak SSO mode).
// Login flow handled langsung di Login.tsx via `loginWithKeycloak()`.
// Hanya `useLogout` yang masih di-expose sebagai hook karena dipakai
// di multiple places (Header dropdown, dll).

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  isKeycloakConfigured,
  keycloak,
  logoutFromKeycloak,
} from "@/auth/keycloak";
import { setActiveDomainId } from "@/lib/domain";
import { clearSessionBinding } from "@/lib/session-binding";

/**
 * Hook for user logout.
 * - Kalau Keycloak aktif & user authenticated via Keycloak → trigger SSO logout
 *   (browser di-redirect ke Keycloak lalu balik ke /login).
 * - Kalau Keycloak tidak aktif (legacy fallback) → clear localStorage + AuthContext.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { clearAuth } = useAuth();

  const logout = () => {
    // Selalu clear local state dulu (defensif)
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    setActiveDomainId(null);
    clearSessionBinding();
    clearAuth();
    queryClient.invalidateQueries();

    if (isKeycloakConfigured && keycloak?.authenticated) {
      // Keycloak SSO logout — redirect away
      logoutFromKeycloak();
      return;
    }

    toast.info("You have been logged out");
  };

  return logout;
};
