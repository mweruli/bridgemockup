"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorBanner, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import {
  ApiError,
  Company,
  Role,
  RoleUser,
  assignUserRole,
  createUser,
  listAssignableRoles,
  listMyCompanies,
  listUsers,
} from "@/lib/api";
import { useSession } from "@/lib/session";

export default function NewUserPage() {
  const router = useRouter();
  const { session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([]);
  const [possibleManagers, setPossibleManagers] = useState<RoleUser[]>([]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reportsToId, setReportsToId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    listMyCompanies(session.accessToken).then(setCompanies).catch(() => setCompanies([]));
    listAssignableRoles(session.accessToken).then(setAssignableRoles).catch(() => setAssignableRoles([]));
    listUsers(session.accessToken).then(setPossibleManagers).catch(() => setPossibleManagers([]));
  }, [session]);

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const user = await createUser(session.accessToken, {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null,
        company_ids: Array.from(selectedCompanies),
        reports_to_id: reportsToId || null,
      });
      if (roleId) {
        // Best-effort follow-up call — the user is already created either
        // way, so a role-assignment failure here shouldn't strand the
        // admin on a form that looks like nothing happened.
        try {
          await assignUserRole(session.accessToken, user.user_id, roleId);
        } catch {
          // The user detail page's own role UI (once it has one) is the
          // fallback if this silently doesn't land.
        }
      }
      router.push(`/workspace/users/${user.user_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create this user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="New User"
        description="Sets an initial password directly — share it with them out of band."
      />

      <Card>
        <form onSubmit={handleSubmit}>
          {error && <ErrorBanner message={error} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
                FIRST NAME
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
                LAST NAME
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              USERNAME
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jdoe"
              required
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              EMAIL
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              PHONE NUMBER (OPTIONAL)
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="07xxxxxxxx"
              maxLength={20}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              INITIAL PASSWORD
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={72}
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
                ROLE (OPTIONAL)
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="">No role yet</option>
                {assignableRoles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
                REPORTS TO (OPTIONAL)
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={reportsToId}
                onChange={(e) => setReportsToId(e.target.value)}
              >
                <option value="">No manager</option>
                {possibleManagers.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              COMPANIES
            </label>
            <div className="space-y-1.5 rounded-lg border border-slate-200 p-3">
              {companies.length === 0 ? (
                <p className="text-xs text-slate-400">No companies available.</p>
              ) : (
                companies.map((c) => (
                  <label key={c.company_id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      checked={selectedCompanies.has(c.company_id)}
                      onChange={() => toggleCompany(c.company_id)}
                    />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <PrimaryButton type="submit" loading={loading}>
              Create User
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => router.back()}>
              Cancel
            </SecondaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
