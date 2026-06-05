import { Navigate, useLocation } from "react-router-dom";
import { endpointNeedsTeam, getRoleHome, getStoredUser, getUserRole } from "../utils/auth";

export default function ProtectedRoute({ allowedRoles = [], roles = [], children }) {
  const location = useLocation();
  const token = localStorage.getItem("soc_token");
  const user = getStoredUser();
  const routeRoles = allowedRoles.length ? allowedRoles : roles;

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = getUserRole(user);
  if (role === "endpoint" && location.pathname === "/connect-team" && !endpointNeedsTeam(user)) {
    return <Navigate to="/endpoint-portal" replace />;
  }

  if (routeRoles.length && !routeRoles.includes(role)) {
    return (
      <Navigate
        to={getRoleHome(role)}
        replace
        state={{ deniedMessage: "Access denied for your role." }}
      />
    );
  }

  if (role === "endpoint" && endpointNeedsTeam(user) && location.pathname !== "/connect-team") {
    return <Navigate to="/connect-team" replace />;
  }

  return children;
}
