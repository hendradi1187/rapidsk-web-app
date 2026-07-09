import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/context/AuthContext";
import { canAccessAny } from "@/config/rbac";
import { canAccessManagedRoute } from "@/lib/feature-access";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { role, roles, hasPermission } = useAuth();
  const location = useLocation();
  const effectiveRoles = roles.length > 0 ? roles : [role];
  const accessContext = {
    role,
    roles: effectiveRoles,
    hasPermission,
  };

  const allowed = allowedRoles
    ? effectiveRoles.some((item) => allowedRoles.includes(item))
    : canAccessAny(effectiveRoles, location.pathname, hasPermission);

  const managedRouteAllowed = canAccessManagedRoute(location.pathname, accessContext);

  if (!allowed || !managedRouteAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
