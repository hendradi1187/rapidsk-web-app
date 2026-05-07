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
import ParticipantGateway from "./pages/ParticipantGateway";
import UsersPage from "./pages/Users";
import AccessManagementPage from "./pages/AccessManagement";
import VocabulariesPage from "./pages/Vocabularies";
import ConnectionPoolsPage from "./pages/ConnectionPools";
import AgreementsPage from "./pages/Agreements";
import V2Router from "./pages/v2/V2Router";
import Activation from "./pages/Activation";
import ConfirmEmail from "./pages/ConfirmEmail";

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

            {/* POC Participant Gateway */}
            <Route
              path="/gateway"
              element={<ParticipantGateway />}
            />

            {/* Activation Page — Preview (public, pre-auth) */}
            <Route
              path="/activate"
              element={<Activation />}
            />

            {/* Email Confirmation — public, link from invite email */}
            <Route
              path="/confirm-email"
              element={<ConfirmEmail />}
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
                        <Route path="/v2/*" element={<V2Router />} />
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
                        <Route path="/access" element={<AccessManagementPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/vocabularies" element={<VocabulariesPage />} />
                        <Route path="/pools" element={<ConnectionPoolsPage />} />
                        <Route path="/agreements" element={<AgreementsPage />} />
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
