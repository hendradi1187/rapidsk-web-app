import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  getKeycloak,
  isKeycloakConfigured,
  logoutFromKeycloak,
} from "@/auth/keycloak";
import { setActiveDomainId } from "@/lib/domain";
import { clearSessionBinding } from "@/lib/session-binding";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const { clearAuth } = useAuth();

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    setActiveDomainId(null);
    clearSessionBinding();
    clearAuth();
    queryClient.invalidateQueries();

    const keycloak = getKeycloak();
    if (isKeycloakConfigured() && keycloak?.authenticated) {
      logoutFromKeycloak();
      return;
    }

    toast.info("You have been logged out");
  };

  return logout;
};
