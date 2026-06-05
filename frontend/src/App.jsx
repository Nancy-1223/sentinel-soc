import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { SettingsProvider } from "./context/SettingsContext";
import AboutUs from "./pages/AboutUs";
import AlertsPanel from "./pages/AlertsPanel";
import Dashboard from "./pages/Dashboard";
import ConnectTeam from "./pages/ConnectTeam";
import EndpointManagement from "./pages/EndpointManagement";
import EndpointPortal from "./pages/EndpointPortal";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Quarantine from "./pages/Quarantine";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import SystemHealth from "./pages/SystemHealth";
import ThreatDetails from "./pages/ThreatDetails";
import UserBehavior from "./pages/UserBehavior";
import Users from "./pages/Users";

export default function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute allowedRoles={["admin"]}><AlertsPanel /></ProtectedRoute>} />
          <Route path="/alerts/:id" element={<ProtectedRoute allowedRoles={["admin"]}><ThreatDetails /></ProtectedRoute>} />
          <Route path="/behavior" element={<ProtectedRoute allowedRoles={["admin"]}><UserBehavior /></ProtectedRoute>} />
          <Route path="/endpoints" element={<Navigate to="/endpoint-management" replace />} />
          <Route path="/endpoint-details" element={<Navigate to="/endpoint-management" replace />} />
          <Route path="/endpoint-management" element={<ProtectedRoute allowedRoles={["admin"]}><EndpointManagement /></ProtectedRoute>} />
          <Route path="/quarantine" element={<ProtectedRoute allowedRoles={["admin"]}><Quarantine /></ProtectedRoute>} />
          <Route path="/health" element={<ProtectedRoute allowedRoles={["admin"]}><SystemHealth /></ProtectedRoute>} />
          <Route path="/incidents" element={<Navigate to="/dashboard" replace />} />
          <Route path="/about" element={<ProtectedRoute allowedRoles={["endpoint"]}><AboutUs /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><Settings /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><Users /></ProtectedRoute>} />
          <Route path="/connect-team" element={<ProtectedRoute allowedRoles={["endpoint"]}><ConnectTeam /></ProtectedRoute>} />
          <Route path="/endpoint-portal" element={<ProtectedRoute allowedRoles={["endpoint"]}><EndpointPortal /></ProtectedRoute>} />
          <Route path="/my-dashboard" element={<ProtectedRoute allowedRoles={["endpoint"]}><EndpointPortal /></ProtectedRoute>} />
          <Route path="/my-alerts" element={<ProtectedRoute allowedRoles={["endpoint"]}><EndpointPortal /></ProtectedRoute>} />
          <Route path="/my-behavior" element={<ProtectedRoute allowedRoles={["endpoint"]}><EndpointPortal /></ProtectedRoute>} />
          <Route path="/my-endpoint" element={<ProtectedRoute allowedRoles={["endpoint"]}><EndpointPortal /></ProtectedRoute>} />
          <Route path="/my-quarantine" element={<ProtectedRoute allowedRoles={["endpoint"]}><EndpointPortal /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  );
}
