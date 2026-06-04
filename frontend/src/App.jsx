import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { SettingsProvider } from "./context/SettingsContext";
import AboutUs from "./pages/AboutUs";
import AlertsPanel from "./pages/AlertsPanel";
import Dashboard from "./pages/Dashboard";
import EndpointDetails from "./pages/EndpointDetails";
import IncidentInvestigation from "./pages/IncidentInvestigation";
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alerts" element={<AlertsPanel />} />
          <Route path="/alerts/:id" element={<ThreatDetails />} />
          <Route path="/behavior" element={<UserBehavior />} />
          <Route path="/endpoints" element={<EndpointDetails />} />
          <Route path="/quarantine" element={<Quarantine />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/incidents" element={<IncidentInvestigation />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SettingsProvider>
  );
}
