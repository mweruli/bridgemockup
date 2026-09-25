const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    return JSON.stringify(body.detail ?? body);
  } catch {
    return response.statusText || "Request failed";
  }
}

export type OtpChannel = "email" | "sms";

export interface LoginChallenge {
  otp_required: true;
  pending_token: string;
  available_channels: OtpChannel[];
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
  if (!response.ok) throw new ApiError(await parseErrorDetail(response));
  return response.json();
}

export async function sendOtp(pendingToken: string, channel: OtpChannel): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pending_token: pendingToken, channel }),
  });
  if (!response.ok) throw new ApiError(await parseErrorDetail(response));
}

export async function verifyOtp(pendingToken: string, otpCode: string): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/auth/login/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pending_token: pendingToken, otp_code: otpCode }),
  });
  if (!response.ok) throw new ApiError(await parseErrorDetail(response));
  return response.json();
}

export async function fetchMe(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new ApiError(await parseErrorDetail(response));
  return response.json();
}

export async function forgotPassword(email: string, channel: OtpChannel): Promise<string> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, channel }),
  });
  if (!response.ok) throw new ApiError(await parseErrorDetail(response));
  return (await response.json()).message as string;
}

export async function resetPassword(
  email: string,
  otpCode: string,
  newPassword: string,
): Promise<string> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword }),
  });
  if (!response.ok) throw new ApiError(await parseErrorDetail(response));
  return (await response.json()).message as string;
}
