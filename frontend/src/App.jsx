import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { SettingsProvider } from "./context/SettingsContext";
import AboutUs from "./pages/AboutUs";
import AlertsPanel from "./pages/AlertsPanel";
import Dashboard from "./pages/Dashboard";
import ConnectTeam from "./pages/ConnectTeam";
import EndpointDetails from "./pages/EndpointDetails";
import EndpointPortal from "./pages/EndpointPortal";
import IncidentInvestigation from "./pages/IncidentInvestigation";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Quarantine from "./pages/Quarantine";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import SystemHealth from "./pages/SystemHealth";
import ThreatDetails from "./pages/ThreatDetails";
import UserBehavior from "./pages/UserBehavior";

export default function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<ProtectedRoute roles={["admin"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute roles={["admin"]}><AlertsPanel /></ProtectedRoute>} />
          <Route path="/alerts/:id" element={<ProtectedRoute roles={["admin"]}><ThreatDetails /></ProtectedRoute>} />
          <Route path="/behavior" element={<ProtectedRoute roles={["admin"]}><UserBehavior /></ProtectedRoute>} />
          <Route path="/endpoints" element={<ProtectedRoute roles={["admin"]}><EndpointDetails /></ProtectedRoute>} />
          <Route path="/endpoint-details" element={<ProtectedRoute roles={["admin"]}><EndpointDetails /></ProtectedRoute>} />
          <Route path="/quarantine" element={<ProtectedRoute roles={["admin"]}><Quarantine /></ProtectedRoute>} />
          <Route path="/health" element={<ProtectedRoute roles={["admin"]}><SystemHealth /></ProtectedRoute>} />
          <Route path="/incidents" element={<ProtectedRoute roles={["admin"]}><IncidentInvestigation /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute roles={["admin", "endpoint"]}><AboutUs /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={["admin"]}><Settings /></ProtectedRoute>} />
          <Route path="/connect-team" element={<ProtectedRoute roles={["endpoint"]}><ConnectTeam /></ProtectedRoute>} />
          <Route path="/endpoint-portal" element={<ProtectedRoute roles={["endpoint"]}><EndpointPortal /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  );
}
