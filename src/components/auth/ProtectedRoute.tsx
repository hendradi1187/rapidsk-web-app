import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDefaultV2RouteForRole, isDataspaceV2Enabled } from "@/lib/dataspace-version";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 */
export const PublicRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={isDataspaceV2Enabled() ? getDefaultV2RouteForRole(role) : "/"} replace />;
  }

  return <>{children}</>;
};

/**
 * Auth Loading Component
 * Shows a loading screen while checking authentication
 */
export const AuthLoading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};
