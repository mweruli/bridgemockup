"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, ErrorBanner, LinkButton, PageHeader, Spinner } from "@/components/ui";
import { ApiError, RoleUser, listUsers } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function UsersPage() {
  const { session } = useSession();
  const [users, setUsers] = useState<RoleUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    listUsers(session.accessToken)
      .then(setUsers)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Unable to load users.");
        setUsers([]);
      });
  }, [session]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Everyone you share a company with. Manage role assignments from a role's page."
        action={<LinkButton href="/workspace/users/new">+ New User</LinkButton>}
      />

      {error && <ErrorBanner message={error} />}

      <Card className="p-0">
        {users === null ? (
          <Spinner />
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No users visible yet." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Username</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Companies</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-3">
                    <Link
                      href={`/workspace/users/${user.user_id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {user.full_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{user.username}</td>
                  <td className="px-6 py-3 text-slate-500">{user.email}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {user.companies.map((c) => c.name).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-3">
                    {user.is_active ? (
                      <Badge tone="emerald">Active</Badge>
                    ) : (
                      <Badge tone="red">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
