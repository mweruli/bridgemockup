"use client";

import { ButtonHTMLAttributes, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard, FieldLabel } from "@/components/AuthCard";
import { BrandPanel } from "@/components/BrandPanel";
import {
  ApiError,
  ChannelOption,
  OtpChannel,
  PasswordPolicy,
  fetchMe,
  fetchPasswordPolicy,
  fetchRecoveryChannels,
  forgotPassword,
  login,
  resetPassword,
  sendOtp,
  verifyOtp,
} from "@/lib/api";
import { useSession } from "@/lib/session";

type Step =
  | "login"
  | "inactive"
  | "otp-channel"
  | "otp-verify"
  | "forgot-email"
  | "forgot-channel"
  | "forgot-reset";

function useCountdown() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
}

function formatClock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function ruleMet(id: string, password: string, policy: PasswordPolicy) {
  switch (id) {
    case "min_length":
      return password.length >= policy.min_length;
    case "uppercase":
      return /[A-Z]/.test(password);
    case "lowercase":
      return /[a-z]/.test(password);
    case "number":
      return /\d/.test(password);
    case "symbol":
      return /[^A-Za-z0-9]/.test(password);
    default:
      return false;
  }
}

function attemptsSuffix(err: ApiError, noun: string) {
  const left = err.data.attempts_remaining;
  if (typeof left !== "number") return "";
  return left === 1 ? ` 1 ${noun} left.` : ` ${left} ${noun}s left.`;
}

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
  const router = useRouter();
  const { setSession } = useSession();
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
  const [channelOptions, setChannelOptions] = useState<ChannelOption[]>([]);
  const [channel, setChannel] = useState<OtpChannel | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);

  // countdowns driven by the backend: lockout and resend cooldown
  const [lockSeconds, setLockSeconds] = useCountdown();
  const [resendSeconds, setResendSeconds] = useCountdown();

  // forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotChannels, setForgotChannels] = useState<ChannelOption[]>([]);
  const [forgotChannel, setForgotChannel] = useState<OtpChannel>("email");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);

  useEffect(() => {
    if (step !== "forgot-reset" || policy) return;
    fetchPasswordPolicy().then(setPolicy).catch(() => {});
  }, [step, policy]);

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
      // Older backends don't send masked `channels`/`full_name` yet; fall back
      // to the plain channel list so the mockup still works against them.
      const options: ChannelOption[] =
        challenge.channels ??
        challenge.available_channels.map((c, i) => ({
          channel: c,
          destination: c === "email" ? "your email" : "your phone",
          recommended: i === 0,
        }));
      setChannelOptions(options);
      setChannel((options.find((c) => c.recommended) ?? options[0])?.channel ?? null);
      setAccount(challenge.full_name ? { name: challenge.full_name, email: challenge.email } : null);
      setStep("otp-channel");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Unable to sign in. Please try again.");
      } else if (err.code === "account_locked") {
        setLockSeconds(err.retryAfter ?? Number(err.data.retry_after) ?? 900);
      } else if (err.code === "account_inactive") {
        setAccount({ name: String(err.data.full_name ?? ""), email: String(err.data.email ?? "") });
        setStep("inactive");
      } else if (err.code === "invalid_credentials") {
        setError(`${err.message}.${attemptsSuffix(err, "attempt")}`);
      } else {
        setError(err.message);
      }
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
      const destination = channelOptions.find((c) => c.channel === channel)?.destination;
      setNotice(`We sent a 6-digit code to ${destination ?? "you"}. It expires in 10 minutes.`);
      setResendSeconds(60);
      setStep("otp-verify");
    } catch (err) {
      if (err instanceof ApiError && err.code === "otp_resend_limit") {
        setResendSeconds(err.retryAfter ?? 3600);
        setError("You've requested too many codes. Try again when the timer ends.");
      } else {
        setError(err instanceof ApiError ? err.message : "Unable to send the code. Please try again.");
      }
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
      const profile = await fetchMe(tokens.access_token);
      setSession({ accessToken: tokens.access_token, profile });
      router.push("/workspace");
    } catch (err) {
      if (err instanceof ApiError && err.code === "otp_attempts_exhausted") {
        setError("Too many incorrect codes. Request a new code to continue.");
      } else if (err instanceof ApiError) {
        setError(`Code incorrect or expired.${attemptsSuffix(err, "attempt")}`);
      } else {
        setError("That code didn't work. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotEmail(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const options = await fetchRecoveryChannels(forgotEmail);
      setForgotChannels(options);
      setForgotChannel((options.find((c) => c.recommended) ?? options[0]).channel);
      setStep("forgot-channel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to process that request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
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
      const result = await resetPassword(forgotEmail, forgotOtp, newPassword);
      const profile = await fetchMe(result.access_token);
      setSession({ accessToken: result.access_token, profile });
      router.push("/workspace");
    } catch (err) {
      if (err instanceof ApiError && err.code === "password_unchanged") {
        setError("Your new password must be different from your current one.");
      } else if (err instanceof ApiError && err.code?.startsWith("otp_")) {
        setError(`Code incorrect or expired.${attemptsSuffix(err, "attempt")}`);
      } else {
        setError(err instanceof ApiError ? err.message : "Unable to reset password.");
      }
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

            {lockSeconds > 0 && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                <p className="font-semibold">Account temporarily locked</p>
                <p className="mt-1">
                  Too many failed attempts. You can try again in{" "}
                  <span className="font-mono font-semibold">{formatClock(lockSeconds)}</span>.
                </p>
              </div>
            )}
            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            <div className="mt-6">
              <FieldLabel>WORK EMAIL OR USERNAME</FieldLabel>
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
                  placeholder="name@company.com"
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
              <PrimaryButton type="submit" loading={loading} disabled={lockSeconds > 0}>
                Sign In to Workspace
                <ArrowIcon />
              </PrimaryButton>
            </div>
          </form>
        )}

        {step === "inactive" && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your account is no longer active</h1>
            <p className="mt-1 text-sm text-slate-500">
              This usually happens when an assignment or contract ends. If you think this is a
              mistake, contact your HR administrator or Bridge Talent support.
            </p>
            {account && (
              <div className="mt-6 rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                <p className="text-xs text-slate-500">{account.email}</p>
                <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600">
                  DEACTIVATED
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={backToLogin}
              className="mt-6 w-full text-center text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to sign in
            </button>
          </div>
        )}

        {step === "otp-channel" && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Two-step verification</h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose where to receive your 6-digit verification code.
            </p>

            {account && (
              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                <p className="text-xs text-slate-500">{account.email}</p>
              </div>
            )}

            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            <div className="mt-6 space-y-2">
              {channelOptions.map((c) => (
                <label
                  key={c.channel}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                    channel === c.channel ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    className="accent-blue-600"
                    checked={channel === c.channel}
                    onChange={() => setChannel(c.channel)}
                  />
                  <span className="text-slate-700">
                    <span className="flex items-center gap-2 font-medium">
                      {c.channel === "email" ? "Email" : "SMS"}
                      {c.recommended && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500">{c.destination}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <PrimaryButton type="button" loading={loading} onClick={handleSendOtp}>
                Send verification code
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

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-400">Didn&apos;t receive it?</span>
              <button
                type="button"
                disabled={resendSeconds > 0 || loading}
                onClick={handleSendOtp}
                className="font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
              >
                {resendSeconds > 0 ? `Resend code (${formatClock(resendSeconds)})` : "Resend code"}
              </button>
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

        {step === "forgot-email" && (
          <form onSubmit={handleForgotEmail}>
            <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your work email and we&apos;ll help you recover your account.
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

            <div className="mt-6">
              <PrimaryButton type="submit" loading={loading}>
                Continue
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

        {step === "forgot-channel" && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Choose a verification channel</h1>
            <p className="mt-1 text-sm text-slate-500">
              Select where Bridge Talent should send your 6-digit recovery code.
            </p>

            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            <div className="mt-6 space-y-2">
              {forgotChannels.map((c) => (
                <label
                  key={c.channel}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                    forgotChannel === c.channel ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="forgot-channel"
                    className="accent-blue-600"
                    checked={forgotChannel === c.channel}
                    onChange={() => setForgotChannel(c.channel)}
                  />
                  <span className="text-slate-700">
                    <span className="flex items-center gap-2 font-medium">
                      {c.channel === "email" ? "Work email" : "SMS"}
                      {c.recommended && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500">{c.destination}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <PrimaryButton type="button" loading={loading} onClick={handleForgotPassword}>
                Send recovery code
                <ArrowIcon />
              </PrimaryButton>
            </div>

            <button
              type="button"
              onClick={() => { resetMessages(); setStep("forgot-email"); }}
              className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              ← Use a different email
            </button>
          </div>
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {policy && (
                <ul className="mt-3 space-y-1">
                  {policy.rules.map((rule) => {
                    const ok = ruleMet(rule.id, newPassword, policy);
                    return (
                      <li
                        key={rule.id}
                        className={`flex items-center gap-2 text-xs ${ok ? "text-emerald-600" : "text-slate-400"}`}
                      >
                        <span aria-hidden>{ok ? "✓" : "○"}</span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6">
              <PrimaryButton type="submit" loading={loading}>
                Reset password &amp; sign in
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
