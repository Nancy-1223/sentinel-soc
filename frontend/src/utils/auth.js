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

export function storeSession(user, token) {
  if (!token) {
    console.error("[auth] Refusing to store session: token missing", { role: getUserRole(user) });
    throw new Error("Login response did not include an access token.");
  }

  const sessionUser = { ...user, role: getUserRole(user), token };
  localStorage.setItem("soc_token", token);
  localStorage.setItem("soc_user", JSON.stringify(sessionUser));
  localStorage.setItem("soc_role", sessionUser.role);
  console.info("[auth] Session stored", {
    tokenFound: Boolean(token),
    role: sessionUser.role,
    userId: sessionUser.id,
  });
  return sessionUser;
}

export function clearSession() {
  console.warn("[auth] Clearing stored session");
  localStorage.removeItem("soc_user");
  localStorage.removeItem("soc_token");
  localStorage.removeItem("soc_role");
}

export function isInvalidTokenError(error) {
  return error?.response?.status === 401;
}

export function getUserRole(user = getStoredUser()) {
  const role = String(user?.role || localStorage.getItem("soc_role") || "admin").toLowerCase();
  return role === "endpoint_user" || role === "endpoint-user" || role === "user" ? "endpoint" : role;
}

export function endpointNeedsTeam(user = getStoredUser()) {
  return getUserRole(user) === "endpoint" && (!user?.team_id || !user?.admin_id || !user?.endpoint_id);
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
