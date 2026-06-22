import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRuntime } from "@/context/RuntimeContext";

export const SetupBoundary = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { ready, setupStatus } = useRuntime();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
          <p className="text-muted-foreground text-sm">Memuat wrapper runtime...</p>
        </div>
      </div>
    );
  }

  if (setupStatus.needsSetup && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  if (!setupStatus.needsSetup && location.pathname === "/setup") {
    return <Navigate to={isAuthenticated ? "/" : "/login"} replace />;
  }

  return <>{children}</>;
};
