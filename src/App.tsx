import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { DomainProvider } from "@/context/DomainContext";
import { RuntimeProvider } from "@/context/RuntimeContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SetupBoundary } from "@/components/runtime/SetupBoundary";
import Login from "./pages/Login";
import RegisterKKKS from "./pages/RegisterKKKS";
import ConfirmEmail from "./pages/ConfirmEmail";
import Setup from "./pages/Setup";
import SetupJuknis from "./pages/SetupJuknis";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import Participants from "./pages/Participants";
import ParticipantDetail from "./pages/ParticipantDetail";
import Datasets from "./pages/Datasets";
import Schemas from "./pages/Schemas";
import Vocabularies from "./pages/Vocabularies";
import Policies from "./pages/Policies";
import Contracts from "./pages/Contracts";
import ProviderInbox from "./pages/ProviderInbox";
import TransferCenter from "./pages/TransferCenter";
import Audit from "./pages/Audit";
import ApiDocs from "./pages/ApiDocs";
import Settings from "./pages/Settings";
import DeploymentConfig from "./pages/DeploymentConfig";
import ConnectionPools from "./pages/ConnectionPools";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RuntimeProvider>
            <SetupBoundary>
              <Routes>
                <Route path="/setup" element={<Setup />} />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route path="/register-kkks" element={<RegisterKKKS />} />
                <Route path="/confirm-email" element={<ConfirmEmail />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <DomainProvider>
                        <MainLayout>
                          <RoleGuard>
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/setup-juknis" element={<SetupJuknis />} />
                              <Route path="/participants" element={<Participants />} />
                              <Route path="/participants/:id" element={<ParticipantDetail />} />
                              <Route path="/organizations" element={<Organizations />} />
                              <Route path="/datasets" element={<Datasets />} />
                              <Route path="/schemas" element={<Schemas />} />
                              <Route path="/vocabularies" element={<Vocabularies />} />
                              <Route path="/policies" element={<Policies />} />
                              <Route path="/contracts" element={<Contracts />} />
                              <Route path="/inbox" element={<ProviderInbox />} />
                              <Route path="/transfers" element={<TransferCenter />} />
                              <Route path="/audit" element={<Audit />} />
                              <Route path="/api-docs" element={<ApiDocs />} />
                              <Route path="/connection-pools" element={<ConnectionPools />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/deployment-config" element={<DeploymentConfig />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </RoleGuard>
                        </MainLayout>
                      </DomainProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </SetupBoundary>
          </RuntimeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
