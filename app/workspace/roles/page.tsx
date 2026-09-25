"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, ErrorBanner, LinkButton, PageHeader, Pagination, Spinner } from "@/components/ui";
import { ApiError, Role, listRoles } from "@/lib/api";
import { useSession } from "@/lib/session";

const PAGE_SIZE = 10;

export default function RolesPage() {
  const { session } = useSession();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setRoles(null);
    setError(null);

    listRoles(session.accessToken, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setRoles(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Unable to load roles.");
        setRoles([]);
      });

    return () => {
      cancelled = true;
    };
  }, [session, page]);

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Define what each role can do, and who holds it."
        action={<LinkButton href="/workspace/roles/new">+ New Role</LinkButton>}
      />

      {error && <ErrorBanner message={error} />}

      <Card className="p-0">
        {roles === null ? (
          <Spinner />
        ) : roles.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No roles yet. Create the first one to get started." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">Scope</th>
                <th className="px-6 py-3 font-medium">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.role_id} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-3">
                    <Link
                      href={`/workspace/roles/${role.role_id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {role.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{role.code}</td>
                  <td className="px-6 py-3">
                    {role.is_system ? (
                      <Badge tone="amber">System</Badge>
                    ) : role.company_id ? (
                      <Badge tone="blue">Company</Badge>
                    ) : (
                      <Badge>Template</Badge>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{role.permissions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
