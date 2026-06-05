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

export function getRoleHome(role = getUserRole()) {
  return role === "endpoint" ? "/endpoint-portal" : "/dashboard";
}
