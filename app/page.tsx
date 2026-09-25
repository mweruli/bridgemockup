"use client";

import { ButtonHTMLAttributes, FormEvent, useState } from "react";
import { AuthCard, FieldLabel } from "@/components/AuthCard";
import { BrandPanel } from "@/components/BrandPanel";
import {
  ApiError,
  OtpChannel,
  UserProfile,
  fetchMe,
  forgotPassword,
  login,
  resetPassword,
  sendOtp,
  verifyOtp,
} from "@/lib/api";

type Step =
  | "login"
  | "otp-channel"
  | "otp-verify"
  | "success"
  | "forgot-email"
  | "forgot-reset";

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="15" r="4" />
      <path d="m10.5 12.5 8.5-8.5M16 6l2 2M13 9l2 2" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.4 5.5A10.7 10.7 0 0 1 12 5c5 0 9 4 10 7-.4 1.1-1.2 2.4-2.3 3.6M6.1 6.9C4.2 8.2 2.8 10 2 12c1 3 5 7 10 7 1.3 0 2.6-.3 3.7-.7" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
      {message}
    </div>
  );
}

function PrimaryButton({
  children,
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // otp
  const [pendingToken, setPendingToken] = useState("");
  const [channels, setChannels] = useState<OtpChannel[]>([]);
  const [channel, setChannel] = useState<OtpChannel | null>(null);
  const [otpCode, setOtpCode] = useState("");

  // session
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotChannel, setForgotChannel] = useState<OtpChannel>("email");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const challenge = await login(username, password);
      setPendingToken(challenge.pending_token);
      setChannels(challenge.available_channels);
      setChannel(challenge.available_channels[0] ?? null);
      setStep("otp-channel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!channel) return;
    resetMessages();
    setLoading(true);
    try {
      await sendOtp(pendingToken, channel);
      setNotice(`We sent a 6-digit code to your ${channel === "email" ? "email" : "phone"}.`);
      setStep("otp-verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const tokens = await verifyOtp(pendingToken, otpCode);
      const me = await fetchMe(tokens.access_token);
      setProfile(me);
      setStep("success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't work. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const message = await forgotPassword(forgotEmail, forgotChannel);
      setNotice(message);
      setStep("forgot-reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to process that request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const message = await resetPassword(forgotEmail, forgotOtp, newPassword);
      setNotice(message);
      setStep("login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    resetMessages();
    setPassword("");
    setOtpCode("");
    setPendingToken("");
    setStep("login");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

      <AuthCard>
        {step === "login" && (
          <form onSubmit={handleLogin}>
            <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
            <p className="mt-1 text-sm text-slate-500">Access your Bridge Talent workspace</p>

            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            <div className="mt-6">
              <FieldLabel>USERNAME</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon />
                </span>
                <input
                  className={inputClasses}
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="jsmith"
                />
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>PASSWORD</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon />
                </span>
                <input
                  className={inputClasses}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setForgotEmail("");
                  setStep("forgot-email");
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <div className="mt-6">
              <PrimaryButton type="submit" loading={loading}>
                Sign In to Workspace
                <ArrowIcon />
              </PrimaryButton>
            </div>
          </form>
        )}

        {step === "otp-channel" && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Verify it&apos;s you</h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose where we should send your verification code.
            </p>

            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            <div className="mt-6 space-y-2">
              {channels.map((c) => (
                <label
                  key={c}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                    channel === c ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    className="accent-blue-600"
                    checked={channel === c}
                    onChange={() => setChannel(c)}
                  />
                  <span className="text-slate-700">
                    {c === "email" ? "Send code to email" : "Send code via SMS"}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <PrimaryButton type="button" loading={loading} onClick={handleSendOtp}>
                Send Code
                <ArrowIcon />
              </PrimaryButton>
            </div>

            <button
              type="button"
              onClick={backToLogin}
              className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ← Back to sign in
            </button>
          </div>
        )}

        {step === "otp-verify" && (
          <form onSubmit={handleVerifyOtp}>
            <h1 className="text-2xl font-bold text-slate-900">Enter Code</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter the 6-digit verification code we sent you.
            </p>

            {notice && (
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {notice}
              </div>
            )}
            {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

            <div className="mt-5">
              <FieldLabel>VERIFICATION CODE</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyIcon />
                </span>
                <input
                  className={`${inputClasses} pr-3 tracking-[0.4em]`}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                />
              </div>
            </div>

            <div className="mt-6">
              <PrimaryButton type="submit" loading={loading}>
                Verify &amp; Continue
                <ArrowIcon />
              </PrimaryButton>
            </div>

            <button
              type="button"
              onClick={() => setStep("otp-channel")}
              className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ← Choose a different channel
            </button>
          </form>
        )}

        {step === "success" && profile && (
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Welcome, {profile.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">You&apos;re signed in to the Bridge Talent workspace.</p>

            <div className="mt-6 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Username</span>
                <span className="font-medium text-slate-700">{profile.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="font-medium text-slate-700">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Roles</span>
                <span className="font-medium text-slate-700">{profile.roles.join(", ") || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Companies</span>
                <span className="font-medium text-slate-700">{profile.companies.join(", ") || "—"}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setProfile(null);
                setUsername("");
                backToLogin();
              }}
              className="mt-6 w-full text-center text-xs font-medium text-blue-600 hover:underline"
            >
              Sign out
            </button>
          </div>
        )}

        {step === "forgot-email" && (
          <form onSubmit={handleForgotPassword}>
            <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
            <p className="mt-1 text-sm text-slate-500">
              We&apos;ll send a reset code to your account.
            </p>

            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            <div className="mt-6">
              <FieldLabel>WORK EMAIL</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon />
                </span>
                <input
                  className={inputClasses}
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@bridgetalentgroup.com"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {(["email", "sms"] as OtpChannel[]).map((c) => (
                <label
                  key={c}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    forgotChannel === c
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="forgot-channel"
                    className="hidden"
                    checked={forgotChannel === c}
                    onChange={() => setForgotChannel(c)}
                  />
                  {c === "email" ? "Email" : "SMS"}
                </label>
              ))}
            </div>

            <div className="mt-6">
              <PrimaryButton type="submit" loading={loading}>
                Send Reset Code
                <ArrowIcon />
              </PrimaryButton>
            </div>

            <button
              type="button"
              onClick={backToLogin}
              className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {step === "forgot-reset" && (
          <form onSubmit={handleResetPassword}>
            <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter the code we sent you and choose a new password.
            </p>

            {notice && (
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {notice}
              </div>
            )}
            {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

            <div className="mt-5">
              <FieldLabel>RESET CODE</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyIcon />
                </span>
                <input
                  className={`${inputClasses} pr-3 tracking-[0.4em]`}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                />
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>NEW PASSWORD</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon />
                </span>
                <input
                  className={`${inputClasses} pr-3`}
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="mt-6">
              <PrimaryButton type="submit" loading={loading}>
                Reset Password
                <ArrowIcon />
              </PrimaryButton>
            </div>

            <button
              type="button"
              onClick={backToLogin}
              className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </AuthCard>
    </div>
  );
}
