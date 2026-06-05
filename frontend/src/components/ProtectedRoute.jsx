import { Navigate, useLocation } from "react-router-dom";
import { endpointNeedsTeam, getRoleHome, getStoredUser, getUserRole } from "../utils/auth";

export default function ProtectedRoute({ roles = [], children }) {
  const location = useLocation();
  const token = localStorage.getItem("soc_token");
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = getUserRole(user);
  if (roles.length && !roles.includes(role)) {
    return (
      <Navigate
        to={getRoleHome(role)}
        replace
        state={{ deniedMessage: "Access denied. Admin only." }}
      />
    );
  }

  if (role === "endpoint" && endpointNeedsTeam(user) && location.pathname !== "/connect-team") {
    return <Navigate to="/connect-team" replace />;
  }

  return children;
}
