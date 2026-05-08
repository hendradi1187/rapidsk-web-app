import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import Providers from "./pages/Providers";
import Datasets from "./pages/Datasets";
import Schemas from "./pages/Schemas";
import Vocabularies from "./pages/Vocabularies";
import Mapping from "./pages/Mapping";
import ArcGISServices from "./pages/ArcGISServices";
import Policies from "./pages/Policies";
import Audit from "./pages/Audit";
import ApiDocs from "./pages/ApiDocs";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Route - Login Page */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected Routes - Require Authentication + Role Check */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <RoleGuard>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/organizations" element={<Organizations />} />
                        <Route path="/providers" element={<Providers />} />
                        <Route path="/datasets" element={<Datasets />} />
                        <Route path="/schemas" element={<Schemas />} />
                        <Route path="/vocabularies" element={<Vocabularies />} />
                        <Route path="/mapping" element={<Mapping />} />
                        <Route path="/arcgis" element={<ArcGISServices />} />
                        <Route path="/policies" element={<Policies />} />
                        <Route path="/audit" element={<Audit />} />
                        <Route path="/api-docs" element={<ApiDocs />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </RoleGuard>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
