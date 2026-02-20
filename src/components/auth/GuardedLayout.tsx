import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { MainLayout } from "@/components/layout/MainLayout";


export default function GuardedLayout() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RoleGuard>
          <Outlet />
        </RoleGuard>
      </MainLayout>
    </ProtectedRoute>
  );
}