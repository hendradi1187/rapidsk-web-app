import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/context/AuthContext";
import { canAccessAny } from "@/config/rbac";

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
  const { role, roles, hasPermission } = useAuth();
  const location = useLocation();

  const allowed = allowedRoles
    ? roles.some((item) => allowedRoles.includes(item))
    : canAccessAny(roles.length > 0 ? roles : [role], location.pathname, hasPermission);

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
