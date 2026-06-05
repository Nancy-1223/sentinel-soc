export function getStoredUser() {
  try {
    const raw = localStorage.getItem("soc_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user || parsed;
  } catch {
    return null;
  }
}

export function getUserRole(user = getStoredUser()) {
  const role = String(user?.role || "admin").toLowerCase();
  return role === "endpoint_user" || role === "endpoint-user" || role === "user" ? "endpoint" : role;
}

export function endpointNeedsTeam(user = getStoredUser()) {
  return getUserRole(user) === "endpoint" && !user?.team_id;
}

export function getRoleHome(roleOrUser = getStoredUser()) {
  if (typeof roleOrUser === "string") {
    return roleOrUser === "endpoint" ? "/endpoint-portal" : "/dashboard";
  }
  const user = roleOrUser;
  const role = getUserRole(user);
  if (role === "endpoint") {
    return endpointNeedsTeam(user) ? "/connect-team" : "/endpoint-portal";
  }
  return "/dashboard";
}
