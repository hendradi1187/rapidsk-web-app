import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { FloatingGatewayWidget } from "../gateway/FloatingGatewayWidget";
import { isDataspaceV2Enabled } from "@/lib/dataspace-version";
import { RoleSwitcher } from "../dev/RoleSwitcher";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isV2 = isDataspaceV2Enabled();

  return (
    <div className="min-h-screen bg-background relative">
      <Sidebar />
      {/* 
          Note: In a production app, the margin-left (ml-64) should ideally sync 
          dynamically with the Sidebar's 'collapsed' state via a shared context.
      */}
      <main className="ml-64 transition-all duration-300">
        {children}
      </main>
      
      {!isV2 && <FloatingGatewayWidget />}
      {isV2 && <RoleSwitcher />}
    </div>
  );
};
