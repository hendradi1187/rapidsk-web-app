import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

/**
 * Sweeps stuck Radix portal overlays (bg-black/80 fixed inset-0) on every
 * route change. These can persist when a Dialog/AlertDialog unmounts before
 * Radix can run its close animation, leaving an orphan dark overlay that
 * blocks the entire UI.
 */
const StuckOverlaySweeper = () => {
  const location = useLocation();
  useEffect(() => {
    const sweep = () => {
      // Any portal overlay element that has bg-black* and inset-0 — if it has
      // no live content sibling (data-state="open"), nuke it.
      document.querySelectorAll<HTMLElement>('div[class*="fixed"][class*="inset-0"]').forEach((el) => {
        const cls = el.className || "";
        if (!/bg-black|bg-background\/95/.test(cls)) return;
        // Check if any sibling has data-state="open" (live dialog content)
        const parent = el.parentElement;
        const hasLiveSibling = parent && [...parent.children].some(
          (c) => c !== el && (c as HTMLElement).getAttribute?.("data-state") === "open"
        );
        if (!hasLiveSibling) {
          el.style.display = "none";
          el.style.pointerEvents = "none";
        }
      });
    };
    // Sweep now and after a short delay (let Radix mount finish first)
    sweep();
    const t = setTimeout(sweep, 120);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Esc key: emergency nuke any leftover dark overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll<HTMLElement>('div[class*="fixed"][class*="inset-0"][class*="bg-black"]').forEach((el) => {
        el.style.display = "none";
        el.style.pointerEvents = "none";
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StuckOverlaySweeper />
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
