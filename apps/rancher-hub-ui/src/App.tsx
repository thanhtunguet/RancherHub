import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/auth-context";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sites from "./pages/Sites";
import Environments from "./pages/Environments";
import HarborSites from "./pages/HarborSites";
import HarborBrowser from "./pages/HarborBrowser";
import GenericClusters from "./pages/GenericClusters";
import AppInstances from "./pages/AppInstances";
import Services from "./pages/Services";
import Storage from "./pages/Storage";

import ConfigMaps from "./pages/ConfigMaps";
import Secrets from "./pages/Secrets";
import SyncHistory from "./pages/SyncHistory";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import TrustedDevices from "./pages/TrustedDevices";
import Settings from "./pages/Settings";
import Monitoring from "./pages/Monitoring";
import MonitoringInstanceDetail from "./pages/MonitoringInstanceDetail";
import MonitoringConfig from "./pages/MonitoringConfig";
import MessageTemplates from "./pages/MessageTemplates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="rancher-hub-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="sites" element={<Sites />} />
                <Route path="environments" element={<Environments />} />
                <Route path="harbor" element={<HarborSites />} />
                <Route path="harbor/:siteId/browse/*" element={<HarborBrowser />} />
                <Route path="clusters" element={<GenericClusters />} />
                <Route path="app-instances" element={<AppInstances />} />
                <Route path="services" element={<Services />} />
                <Route path="storage" element={<Storage />} />
                
                <Route path="configmaps" element={<ConfigMaps />} />
                <Route path="secrets" element={<Secrets />} />
                <Route path="sync-history" element={<SyncHistory />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="monitoring/instances/:id" element={<MonitoringInstanceDetail />} />
                <Route path="monitoring/config" element={<MonitoringConfig />} />
                <Route path="monitoring/templates" element={<MessageTemplates />} />
                <Route path="users" element={<Users />} />
                <Route path="profile" element={<Profile />} />
                <Route path="trusted-devices" element={<TrustedDevices />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
