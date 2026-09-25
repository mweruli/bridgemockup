"use client";

import { Card, PageHeader } from "@/components/ui";
import { useSession } from "@/lib/session";

export default function DashboardPage() {
  const { session } = useSession();
  if (!session) return null;
  const { profile } = session;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile.full_name}`}
        description="Bridge Talent Management workspace"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Username</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{profile.username}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{profile.email}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Roles</div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            {profile.roles.join(", ") || "—"}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Companies</div>
          <div className="mt-1 text-sm font-medium text-slate-900">{profile.companies.length}</div>
        </Card>
      </div>
    </div>
  );
}
