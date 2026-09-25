"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  NoticeBanner,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from "@/components/ui";
import {
  ApiError,
  Company,
  Permission,
  Role,
  RoleUser,
  assignUserRole,
  cloneRole,
  deleteRole,
  getRole,
  listGrantablePermissions,
  listMyCompanies,
  listRoleUsers,
  listUsers,
  setRolePermissions,
  unassignUserRole,
  updateRole,
} from "@/lib/api";
import { useSession } from "@/lib/session";

export default function RoleDetailPage() {
  const params = useParams<{ roleId: string }>();
  const router = useRouter();
  const { session } = useSession();

  const [role, setRole] = useState<Role | null>(null);
  const [grantable, setGrantable] = useState<Permission[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [holders, setHolders] = useState<RoleUser[] | null>(null);
  const [allUsers, setAllUsers] = useState<RoleUser[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [cloneCompanyId, setCloneCompanyId] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneCode, setCloneCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function reload() {
    if (!session) return;
    const [roleResult, grantableResult, holdersResult] = await Promise.all([
      getRole(session.accessToken, params.roleId),
      listGrantablePermissions(session.accessToken, 1, 200),
      listRoleUsers(session.accessToken, params.roleId, 1, 200),
    ]);
    setRole(roleResult);
    setName(roleResult.name);
    setGrantable(grantableResult.items);
    setSelected(new Set(roleResult.permissions.map((p) => p.code)));
    setHolders(holdersResult.items);
  }

  useEffect(() => {
    if (!session) return;
    setError(null);
    reload().catch((err) => {
      setError(err instanceof ApiError ? err.message : "Unable to load this role.");
    });
    listUsers(session.accessToken).then(setAllUsers).catch(() => setAllUsers([]));
    listMyCompanies(session.accessToken).then(setCompanies).catch(() => setCompanies([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, params.roleId]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const perm of grantable ?? []) {
      const list = groups.get(perm.module) ?? [];
      list.push(perm);
      groups.set(perm.module, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [grantable]);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !role) return;
    setError(null);
    setNotice(null);
    setSavingName(true);
    try {
      const updated = await updateRole(session.accessToken, role.role_id, name);
      setRole(updated);
      setNotice("Role renamed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to rename this role.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleClone(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !role || !cloneCompanyId) return;
    setError(null);
    setNotice(null);
    setCloning(true);
    try {
      const clone = await cloneRole(session.accessToken, role.role_id, {
        company_id: cloneCompanyId,
        name: cloneName,
        code: cloneCode,
      });
      router.push(`/workspace/roles/${clone.role_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to clone this role.");
      setCloning(false);
    }
  }

  async function handleSavePermissions() {
    if (!session) return;
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const updated = await setRolePermissions(session.accessToken, params.roleId, Array.from(selected));
      setRole(updated);
      setNotice("Permissions saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !assignUserId) return;
    setError(null);
    setNotice(null);
    setAssigning(true);
    try {
      await assignUserRole(session.accessToken, assignUserId, params.roleId);
      setAssignUserId("");
      const holdersResult = await listRoleUsers(session.accessToken, params.roleId, 1, 200);
      setHolders(holdersResult.items);
      setNotice("User assigned.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to assign this role.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(userId: string) {
    if (!session) return;
    setError(null);
    try {
      await unassignUserRole(session.accessToken, userId, params.roleId);
      setHolders((prev) => prev?.filter((u) => u.user_id !== userId) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to remove this user.");
    }
  }

  async function handleDelete() {
    if (!session || !role) return;
    if (!confirm(`Delete "${role.name}"? This cannot be undone.`)) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteRole(session.accessToken, role.role_id);
      router.push("/workspace/roles");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to delete this role.");
      setDeleting(false);
    }
  }

  if (error && !role) {
    return <ErrorBanner message={error} />;
  }
  if (!role || !grantable || !holders) {
    return <Spinner />;
  }

  const editable = !role.is_system;
  const assignableUsers = allUsers.filter((u) => !holders.some((h) => h.user_id === u.user_id));

  return (
    <div>
      <PageHeader
        title={role.name}
        description={role.code}
        action={
          <div className="flex items-center gap-3">
            {role.is_system ? (
              <Badge tone="amber">System role</Badge>
            ) : role.company_id ? (
              <Badge tone="blue">Company role</Badge>
            ) : (
              <Badge>Template</Badge>
            )}
            {editable && (
              <SecondaryButton type="button" onClick={handleDelete} loading={deleting}>
                Delete Role
              </SecondaryButton>
            )}
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <NoticeBanner message={notice} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Permissions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Only permissions you yourself hold are shown here — you can never grant more than
            you have.
          </p>

          {!editable ? (
            <div className="mt-4">
              <EmptyState message="System roles are managed by the platform and cannot be edited here." />
            </div>
          ) : grouped.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="You don't hold any grantable permissions." />
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {grouped.map(([module, permissions]) => (
                <div key={module}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {module}
                  </div>
                  <div className="space-y-1.5">
                    {permissions.map((perm) => (
                      <label
                        key={perm.code}
                        className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-blue-600"
                          checked={selected.has(perm.code)}
                          onChange={() => toggle(perm.code)}
                        />
                        <span>
                          <span className="block text-sm text-slate-800">{perm.description}</span>
                          <span className="block text-xs text-slate-400">{perm.code}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {editable && (
            <div className="mt-6">
              <PrimaryButton type="button" onClick={handleSavePermissions} loading={saving}>
                Save Permissions
              </PrimaryButton>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {editable && (
            <Card>
              <h2 className="text-sm font-semibold text-slate-900">Role name</h2>
              <form onSubmit={handleSaveName} className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
                <SecondaryButton
                  type="submit"
                  loading={savingName}
                  disabled={name === role.name}
                  className="px-3 py-2 text-xs"
                >
                  Save
                </SecondaryButton>
              </form>
            </Card>
          )}

          {role.company_id === null && (
            <Card>
              <h2 className="text-sm font-semibold text-slate-900">Clone this template</h2>
              <p className="mt-1 text-xs text-slate-500">
                Copies its permission set into a new role owned by one of your companies.
              </p>
              <form onSubmit={handleClone} className="mt-3 space-y-2">
                <select
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
                  value={cloneCompanyId}
                  onChange={(e) => setCloneCompanyId(e.target.value)}
                  required
                >
                  <option value="">Select a company…</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="New role name"
                  maxLength={100}
                  required
                />
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
                  value={cloneCode}
                  onChange={(e) => setCloneCode(e.target.value)}
                  placeholder="new_role_code"
                  maxLength={100}
                  required
                />
                <SecondaryButton
                  type="submit"
                  loading={cloning}
                  disabled={!cloneCompanyId}
                  className="w-full px-3 py-2 text-xs"
                >
                  Clone
                </SecondaryButton>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Assigned users</h2>

            {editable && (
              <form onSubmit={handleAssign} className="mt-3 flex gap-2">
                <select
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                >
                  <option value="">Select a user…</option>
                  {assignableUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.username})
                    </option>
                  ))}
                </select>
                <SecondaryButton
                  type="submit"
                  disabled={!assignUserId}
                  loading={assigning}
                  className="px-3 py-2 text-xs"
                >
                  Assign
                </SecondaryButton>
              </form>
            )}

            <div className="mt-4 space-y-2">
              {holders.length === 0 ? (
                <EmptyState message="No one holds this role yet." />
              ) : (
                holders.map((holder) => (
                  <div
                    key={holder.user_id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-800">{holder.full_name}</div>
                      <div className="text-xs text-slate-400">{holder.username}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnassign(holder.user_id)}
                      className="text-xs font-medium text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
