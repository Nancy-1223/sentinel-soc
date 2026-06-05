import { useEffect, useState } from "react";
import { createApiClient, getApiErrorMessage } from "../api/client";
import { formatDate } from "../utils/format";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const api = createApiClient();
        const response = await api.get("/users");
        if (!cancelled) {
          setUsers(Array.isArray(response.data) ? response.data : []);
          setError("");
        }
      } catch (exc) {
        if (!cancelled) setError(getApiErrorMessage(exc, "Could not load users."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="mt-1 text-sm text-slate-400">Team-scoped admin and endpoint accounts.</p>
      </div>

      {error && <div className="rounded-lg border border-cyber-red/30 bg-cyber-red/10 p-3 text-sm text-cyber-red">{error}</div>}

      <section className="glass cyber-border rounded-lg p-4">
        {loading ? (
          <div className="text-sm text-slate-400">Loading users...</div>
        ) : users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Endpoint</th>
                  <th className="px-3 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
                  <tr key={user.id} className="text-slate-200">
                    <td className="px-3 py-3 font-medium text-white">{user.name}</td>
                    <td className="px-3 py-3">{user.email}</td>
                    <td className="px-3 py-3 capitalize">{user.role}</td>
                    <td className="px-3 py-3">{user.endpoint_id || "Not linked"}</td>
                    <td className="px-3 py-3">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No team users found." />
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
