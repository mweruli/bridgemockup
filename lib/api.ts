const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  code: string | null;
  data: Record<string, unknown>;
  retryAfter: number | null;

  constructor(message: string, status = 0, data: Record<string, unknown> = {}, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = typeof data.code === "string" ? data.code : null;
    this.retryAfter = retryAfter;
  }
}

// Builds an ApiError carrying the backend's machine-readable `code` and extra
// fields (attempts_remaining, retry_after, full_name...). Falls back to the
// plain `detail` string, or flattens FastAPI's 422 validation list.
async function errorFrom(response: Response): Promise<ApiError> {
  let data: Record<string, unknown> = {};
  let message = response.statusText || "Request failed";
  try {
    data = await response.json();
    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data.detail)) {
      message = data.detail
        .map((d: { msg?: string }) => (d.msg ?? "").replace(/^Value error, /, ""))
        .filter(Boolean)
        .join("; ");
    }
  } catch {
    // non-JSON body: keep statusText
  }
  const header = Number(response.headers.get("Retry-After"));
  const retryAfter = Number.isFinite(header) && header > 0 ? header : null;
  return new ApiError(message, response.status, data, retryAfter);
}

export type OtpChannel = "email" | "sms";

export interface ChannelOption {
  channel: OtpChannel;
  destination: string;
  recommended: boolean;
}

export interface LoginChallenge {
  otp_required: true;
  pending_token: string;
  available_channels: OtpChannel[];
  channels: ChannelOption[];
  full_name: string;
  email: string;
}

export interface PasswordPolicy {
  min_length: number;
  max_length: number;
  rules: { id: string; label: string }[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface UserProfile {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  employee_id: string | null;
  roles: string[];
  companies: string[];
}

export async function login(username: string, password: string): Promise<LoginChallenge> {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

export async function sendOtp(pendingToken: string, channel: OtpChannel): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pending_token: pendingToken, channel }),
  });
  if (!response.ok) throw await errorFrom(response);
}

export async function verifyOtp(pendingToken: string, otpCode: string): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/auth/login/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pending_token: pendingToken, otp_code: otpCode }),
  });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

export async function fetchMe(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

export async function fetchPasswordPolicy(): Promise<PasswordPolicy> {
  const response = await fetch(`${API_URL}/auth/password-policy`);
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

export async function fetchRecoveryChannels(email: string): Promise<ChannelOption[]> {
  const response = await fetch(`${API_URL}/auth/forgot-password/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()).channels as ChannelOption[];
}

export async function forgotPassword(email: string, channel: OtpChannel): Promise<string> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, channel }),
  });
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()).message as string;
}

export interface ResetResult {
  message: string;
  access_token: string;
  refresh_token: string;
}

export async function resetPassword(
  email: string,
  otpCode: string,
  newPassword: string,
): Promise<ResetResult> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword }),
  });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

// ---------------------------------------------------------------------
// Authenticated JSON helper — every endpoint below needs a Bearer token.
// ---------------------------------------------------------------------

async function authedFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Company {
  company_id: string;
  name: string;
  code: string;
  company_type: string;
  is_active: boolean;
}

export interface Permission {
  permission_id: string;
  code: string;
  module: string;
  description: string;
}

export interface Role {
  role_id: string;
  company_id: string | null;
  name: string;
  code: string;
  is_system: boolean;
  permissions: Permission[];
}

export interface RoleUser {
  user_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string | null;
  is_active: boolean;
  reports_to_id: string | null;
  role_codes: string[];
  companies: Company[];
}

export function listMyCompanies(accessToken: string): Promise<Company[]> {
  return authedFetch(accessToken, "/companies");
}

export function listRoles(accessToken: string, page = 1, pageSize = 50): Promise<Page<Role>> {
  return authedFetch(accessToken, `/rbac/roles?page=${page}&page_size=${pageSize}`);
}

export function getRole(accessToken: string, roleId: string): Promise<Role> {
  return authedFetch(accessToken, `/rbac/roles/${roleId}`);
}

export function createRole(
  accessToken: string,
  payload: { name: string; code: string; company_id?: string | null },
): Promise<Role> {
  return authedFetch(accessToken, "/rbac/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteRole(accessToken: string, roleId: string): Promise<void> {
  return authedFetch(accessToken, `/rbac/roles/${roleId}`, { method: "DELETE" });
}

export function updateRole(accessToken: string, roleId: string, name: string): Promise<Role> {
  return authedFetch(accessToken, `/rbac/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function cloneRole(
  accessToken: string,
  roleId: string,
  payload: { company_id: string; name: string; code: string },
): Promise<Role> {
  return authedFetch(accessToken, `/rbac/roles/${roleId}/clone`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function setRolePermissions(
  accessToken: string,
  roleId: string,
  permissionCodes: string[],
): Promise<Role> {
  return authedFetch(accessToken, `/rbac/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permission_codes: permissionCodes }),
  });
}

export function listRoleUsers(
  accessToken: string,
  roleId: string,
  page = 1,
  pageSize = 50,
): Promise<Page<RoleUser>> {
  return authedFetch(
    accessToken,
    `/rbac/roles/${roleId}/users?page=${page}&page_size=${pageSize}`,
  );
}

export function listGrantablePermissions(
  accessToken: string,
  page = 1,
  pageSize = 200,
): Promise<Page<Permission>> {
  return authedFetch(
    accessToken,
    `/rbac/permissions/grantable?page=${page}&page_size=${pageSize}`,
  );
}

// Not a backend endpoint — composed client-side from listRoles + the
// grantable-permissions set, so a role picker only ever shows roles the
// caller could actually successfully assign (their full permission set
// is a subset of what the caller holds). Mirrors the same "don't even
// show it" reasoning behind /rbac/permissions/grantable, without needing
// a matching /rbac/roles/assignable endpoint on the backend.
export async function listAssignableRoles(accessToken: string): Promise<Role[]> {
  const [rolesPage, grantablePage] = await Promise.all([
    listRoles(accessToken, 1, 200),
    listGrantablePermissions(accessToken, 1, 200),
  ]);
  const grantableCodes = new Set(grantablePage.items.map((p) => p.code));
  return rolesPage.items.filter((role) =>
    role.permissions.every((p) => grantableCodes.has(p.code)),
  );
}

export function assignUserRole(
  accessToken: string,
  userId: string,
  roleId: string,
): Promise<Role> {
  return authedFetch(accessToken, `/rbac/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ role_id: roleId }),
  });
}

export function unassignUserRole(
  accessToken: string,
  userId: string,
  roleId: string,
): Promise<void> {
  return authedFetch(accessToken, `/rbac/users/${userId}/roles/${roleId}`, {
    method: "DELETE",
  });
}

// /users is not paginated (out of scope for the RBAC batch this mockup
// otherwise mirrors) — returns a bare array, unlike the /rbac/* list
// endpoints above.
export function listUsers(accessToken: string): Promise<RoleUser[]> {
  return authedFetch(accessToken, "/users");
}

export function getUser(accessToken: string, userId: string): Promise<RoleUser> {
  return authedFetch(accessToken, `/users/${userId}`);
}

export function createUser(
  accessToken: string,
  payload: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    company_ids?: string[];
    reports_to_id?: string | null;
  },
): Promise<RoleUser> {
  return authedFetch(accessToken, "/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  accessToken: string,
  userId: string,
  payload: {
    first_name?: string;
    last_name?: string;
    phone_number?: string | null;
    is_active?: boolean;
    reports_to_id?: string | null;
  },
): Promise<RoleUser> {
  return authedFetch(accessToken, `/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function addUserCompany(
  accessToken: string,
  userId: string,
  companyId: string,
): Promise<RoleUser> {
  return authedFetch(accessToken, `/users/${userId}/companies`, {
    method: "POST",
    body: JSON.stringify({ company_id: companyId }),
  });
}

export function removeUserCompany(
  accessToken: string,
  userId: string,
  companyId: string,
): Promise<RoleUser> {
  return authedFetch(accessToken, `/users/${userId}/companies/${companyId}`, {
    method: "DELETE",
  });
}
