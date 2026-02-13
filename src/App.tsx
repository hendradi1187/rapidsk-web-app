import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Organizations from "./pages/Organizations";
import Domains from "./pages/Domains";
import ParticipantsPage from "./pages/Participants";
import Datasets from "./pages/Datasets";
import Contracts from "./pages/Contracts";
import DataTransfer from "./pages/DataTransfer";
import Audit from "./pages/Audit";
import Compliance from "./pages/Compliance";
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

          {/* Protected Routes - Require Authentication */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/organizations" element={<Organizations />} />
                    <Route path="/domains" element={<Domains />} />
                    <Route path="/participants" element={<ParticipantsPage />} />
                    <Route path="/datasets" element={<Datasets />} />
                    <Route path="/contracts" element={<Contracts />} />
                    <Route path="/transfer" element={<DataTransfer />} />
                    <Route path="/audit" element={<Audit />} />
                    <Route path="/compliance" element={<Compliance />} />
                    <Route path="/api-docs" element={<ApiDocs />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
