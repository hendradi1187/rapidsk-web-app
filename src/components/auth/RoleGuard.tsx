import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/context/AuthContext";
import { canAccess } from "@/config/rbac";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { effectiveRole } = useAuth();
  const location = useLocation();

  const allowed = allowedRoles
    ? allowedRoles.includes(effectiveRole)
    : canAccess(effectiveRole, location.pathname);

  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
};