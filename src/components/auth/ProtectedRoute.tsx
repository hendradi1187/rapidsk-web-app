import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const token = localStorage.getItem("auth_token");

  // Check if user is authenticated
  const isAuthenticated = !!token;

  // Show loading state while checking auth (optional, for future auth validation)
  // You can add a useEffect here to validate token with backend if needed

  if (!isAuthenticated) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the children
  return <>{children}</>;
};

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 */
export const PublicRoute = ({ children }: ProtectedRouteProps) => {
  const token = localStorage.getItem("auth_token");
  const isAuthenticated = !!token;

  if (isAuthenticated) {
    // User is already logged in, redirect to dashboard
    return <Navigate to="/" replace />;
  }

  // User is not authenticated, show the public route (login page)
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
