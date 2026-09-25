"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Badge,
  Card,
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
  Role,
  RoleUser,
  addUserCompany,
  assignUserRole,
  getUser,
  listAssignableRoles,
  listMyCompanies,
  listRoles,
  listUsers,
  removeUserCompany,
  unassignUserRole,
  updateUser,
} from "@/lib/api";
import { useSession } from "@/lib/session";

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const { session } = useSession();

  const [user, setUser] = useState<RoleUser | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [addCompanyId, setAddCompanyId] = useState("");
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([]);
  const [possibleManagers, setPossibleManagers] = useState<RoleUser[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reportsToId, setReportsToId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [addingCompany, setAddingCompany] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  async function reload() {
    if (!session) return;
    const record = await getUser(session.accessToken, params.userId);
    setUser(record);
    setFirstName(record.first_name);
    setLastName(record.last_name);
    setPhoneNumber(record.phone_number ?? "");
    setReportsToId(record.reports_to_id ?? "");
  }

  useEffect(() => {
    if (!session) return;
    setError(null);
    reload().catch((err) => {
      setError(err instanceof ApiError ? err.message : "Unable to load this user.");
    });
    listMyCompanies(session.accessToken).then(setCompanies).catch(() => setCompanies([]));
    listRoles(session.accessToken, 1, 200)
      .then((page) => setAllRoles(page.items))
      .catch(() => setAllRoles([]));
    listAssignableRoles(session.accessToken).then(setAssignableRoles).catch(() => setAssignableRoles([]));
    listUsers(session.accessToken)
      .then((users) => setPossibleManagers(users.filter((u) => u.user_id !== params.userId)))
      .catch(() => setPossibleManagers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, params.userId]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setNotice(null);
    setSavingProfile(true);
    try {
      const updated = await updateUser(session.accessToken, params.userId, {
        first_name: firstName,
        last_name: lastName,
        // Explicit null clears the field server-side; an empty string
        // input is treated the same way here for a simpler form.
        phone_number: phoneNumber || null,
        reports_to_id: reportsToId || null,
      });
      setUser(updated);
      setNotice("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update this profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveRole(e: FormEvent) {
    e.preventDefault();
    if (!session || !user || !selectedRoleId) return;
    setError(null);
    setNotice(null);
    setSavingRole(true);
    try {
      // This mockup's role picker is single-select (the backend itself
      // supports multiple roles per user) — replacing means unassigning
      // whatever they currently hold, then assigning the new one.
      const currentRoleIds = allRoles
        .filter((r) => user.role_codes.includes(r.code))
        .map((r) => r.role_id);
      for (const roleId of currentRoleIds) {
        if (roleId !== selectedRoleId) {
          await unassignUserRole(session.accessToken, user.user_id, roleId);
        }
      }
      if (!currentRoleIds.includes(selectedRoleId)) {
        await assignUserRole(session.accessToken, user.user_id, selectedRoleId);
      }
      await reload();
      setNotice("Role updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update this role.");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleToggleActive() {
    if (!session || !user) return;
    setError(null);
    setNotice(null);
    setTogglingActive(true);
    try {
      const updated = await updateUser(session.accessToken, params.userId, {
        is_active: !user.is_active,
      });
      setUser(updated);
      setNotice(updated.is_active ? "User activated." : "User deactivated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to change account status.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleAddCompany(e: FormEvent) {
    e.preventDefault();
    if (!session || !addCompanyId) return;
    setError(null);
    setNotice(null);
    setAddingCompany(true);
    try {
      const updated = await addUserCompany(session.accessToken, params.userId, addCompanyId);
      setUser(updated);
      setAddCompanyId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to add this company.");
    } finally {
      setAddingCompany(false);
    }
  }

  async function handleRemoveCompany(companyId: string) {
    if (!session) return;
    setError(null);
    setNotice(null);
    try {
      const updated = await removeUserCompany(session.accessToken, params.userId, companyId);
      setUser(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to remove this company.");
    }
  }

  if (error && !user) return <ErrorBanner message={error} />;
  if (!user) return <Spinner />;

  const assignableCompanies = companies.filter(
    (c) => !user.companies.some((uc) => uc.company_id === c.company_id),
  );

  return (
    <div>
      <PageHeader
        title={user.full_name}
        description={user.username}
        action={
          <div className="flex items-center gap-3">
            {user.is_active ? (
              <Badge tone="emerald">Active</Badge>
            ) : (
              <Badge tone="red">Inactive</Badge>
            )}
            <SecondaryButton type="button" onClick={handleToggleActive} loading={togglingActive}>
              {user.is_active ? "Deactivate" : "Activate"}
            </SecondaryButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <NoticeBanner message={notice} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <form onSubmit={handleSaveProfile} className="mt-4">
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
                FIRST NAME
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={100}
                required
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
                maxLength={100}
                required
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
                PHONE NUMBER
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
                REPORTS TO
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
            <div className="mb-4 text-xs text-slate-400">
              Email: {user.email} — username and email aren&apos;t editable here.
            </div>
            <PrimaryButton type="submit" loading={savingProfile}>
              Save Profile
            </PrimaryButton>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Role</h2>
          <p className="mt-1 text-xs text-slate-500">
            Current: {user.role_codes.length > 0 ? user.role_codes.join(", ") : "none"}. Only
            roles you could yourself assign are selectable here.
          </p>
          <form onSubmit={handleSaveRole} className="mt-3 flex gap-2">
            <select
              className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              <option value="">Select a role…</option>
              {assignableRoles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.name}
                </option>
              ))}
            </select>
            <SecondaryButton
              type="submit"
              disabled={!selectedRoleId}
              loading={savingRole}
              className="px-3 py-2 text-xs"
            >
              Set Role
            </SecondaryButton>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Companies</h2>

          <form onSubmit={handleAddCompany} className="mt-3 flex gap-2">
            <select
              className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
              value={addCompanyId}
              onChange={(e) => setAddCompanyId(e.target.value)}
            >
              <option value="">Select a company…</option>
              {assignableCompanies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name}
                </option>
              ))}
            </select>
            <SecondaryButton
              type="submit"
              disabled={!addCompanyId}
              loading={addingCompany}
              className="px-3 py-2 text-xs"
            >
              Add
            </SecondaryButton>
          </form>

          <div className="mt-4 space-y-2">
            {user.companies.length === 0 ? (
              <p className="text-sm text-slate-400">Not assigned to any company yet.</p>
            ) : (
              user.companies.map((company) => (
                <div
                  key={company.company_id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-800">{company.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCompany(company.company_id)}
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
  );
}
