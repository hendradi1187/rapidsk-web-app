import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { FloatingGatewayWidget } from "../gateway/FloatingGatewayWidget";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
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
      
      {/* POC Demo Widget - Visible for all users */}
      <FloatingGatewayWidget />
    </div>
  );
};
