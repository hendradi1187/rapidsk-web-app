import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { FloatingGatewayWidget } from "../gateway/FloatingGatewayWidget";
import { isDataspaceV2Enabled } from "@/lib/dataspace-version";
import { RoleSwitcher } from "../dev/RoleSwitcher";
import { useAuth } from "@/context/AuthContext";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isV2 = isDataspaceV2Enabled();
  const { user } = useAuth();
  // STRICT: RoleSwitcher cuma untuk REAL super admin (JWT is_superadmin=true)
  // di DEV mode. Non-superadmin tidak bisa bypass role.
  const showRoleSwitcher = isV2 && import.meta.env.DEV && user?.is_superadmin === true;

  return (
    <div className="min-h-screen bg-background relative">
      <Sidebar />
      <main className="ml-64 transition-all duration-300">
        {children}
      </main>

      {!isV2 && <FloatingGatewayWidget />}
      {showRoleSwitcher && <RoleSwitcher />}
    </div>
  );
};
