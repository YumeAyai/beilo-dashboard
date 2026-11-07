import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { Dashboard } from '../pages/Dashboard';
import { Topology } from '../pages/Topology';
import { ThreatMonitoring } from '../pages/Threat';
import { RulesManagement } from '../pages/Rules';
import { Users } from '../pages/Users';
import { Settings } from '../pages/Settings';
import { LogsViewer } from '../pages/Logs';
import { BlockManagement } from '../pages/Block';
import { Dataplane } from '../pages/Dataplane';
import { RuntimeProtection } from '../pages/RuntimeProtection';
import { ClusterManagement } from '../pages/ClusterManagement';
import { PolicyAudit } from '../pages/PolicyAudit';
import { Login } from '../pages/Login';
import { TOTPSetup } from '../pages/TOTPSetup';
import { useAuth } from '../services/api';
import { Box, CircularProgress } from '@mui/material';

function LoginRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute><Login /></LoginRoute>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="topology" element={<Topology />} />
          <Route path="threat" element={<ThreatMonitoring />} />
          <Route path="rules" element={<RulesManagement />} />
          <Route path="audit" element={<PolicyAudit />} />
          <Route path="logs" element={<LogsViewer />} />
          <Route path="blocking" element={<BlockManagement />} />
          <Route path="dataplane" element={<Dataplane />} />
          <Route path="runtime" element={<RuntimeProtection />} />
          <Route path="cluster" element={<ClusterManagement />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="totp-setup" element={<TOTPSetup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
