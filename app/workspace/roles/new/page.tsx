"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorBanner, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import { ApiError, Company, createRole, listMyCompanies } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function NewRolePage() {
  const router = useRouter();
  const { session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    listMyCompanies(session.accessToken).then(setCompanies).catch(() => setCompanies([]));
  }, [session]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const role = await createRole(session.accessToken, {
        name,
        code,
        company_id: companyId || null,
      });
      router.push(`/workspace/roles/${role.role_id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create the role.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New Role" description="Give it a name and a scope — you'll set its permissions next." />

      <Card>
        <form onSubmit={handleSubmit}>
          {error && <ErrorBanner message={error} />}

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              NAME
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Leave Manager"
              required
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              CODE
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. leave_manager"
              required
              maxLength={100}
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
              COMPANY SCOPE
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">System template (usable by any company)</option>
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <PrimaryButton type="submit" loading={loading}>
              Create Role
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
