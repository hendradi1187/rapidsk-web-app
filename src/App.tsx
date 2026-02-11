import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

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
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/login" element={<Login />} />

          {/* PROTECTED + LAYOUT */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="domains" element={<Domains />} />
            <Route path="participants" element={<ParticipantsPage />} />
            <Route path="datasets" element={<Datasets />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="transfer" element={<DataTransfer />} />
            <Route path="audit" element={<Audit />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="api-docs" element={<ApiDocs />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
