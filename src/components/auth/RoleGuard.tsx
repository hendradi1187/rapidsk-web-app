import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/context/AuthContext";
import { canAccess } from "@/config/rbac";
import { getDefaultV2RouteForRole, isDataspaceV2Enabled } from "@/lib/dataspace-version";

interface RoleGuardProps {
  children: React.ReactNode;
  /** Explicit allow-list. If omitted, uses canAccess() from the RBAC config. */
  allowedRoles?: AppRole[];
}

/**
 * RoleGuard — checks the current route against the authenticated user's AppRole.
 * If access is denied, the user is silently redirected to the Dashboard.
 *
 * Place inside ProtectedRoute so that isAuthenticated is already guaranteed.
 */
export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { role } = useAuth();
  const location = useLocation();
  const isV2 = isDataspaceV2Enabled();

  const allowed = allowedRoles
    ? allowedRoles.includes(role)
    : canAccess(role, location.pathname, isV2);

  if (!allowed) {
    return <Navigate to={isV2 ? getDefaultV2RouteForRole(role) : "/"} replace />;
  }

  return <>{children}</>;
};
