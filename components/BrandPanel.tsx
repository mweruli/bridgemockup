import { Logo } from "./Logo";

export function BrandPanel() {
  return (
    <div className="relative hidden h-full w-full flex-col justify-between overflow-hidden bg-[#0F1729] px-12 py-10 text-white lg:flex">
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-3xl"
        aria-hidden
      />

      <Logo light />

      <div className="relative z-10 max-w-md">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
          ⚡ ENTERPRISE HR PLATFORM
        </span>

        <h1 className="mt-6 text-4xl font-bold leading-tight">
          Building Bold Futures
          <br />
          <span className="text-amber-400">– Together</span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Streamlining workforce operations, multi-company payroll, and talent
          management for modern African enterprises.
        </p>

        <div className="relative mt-10 flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-end gap-3">
            <div className="h-14 w-3 rounded-sm bg-blue-400/60" />
            <div className="h-24 w-3 rounded-sm bg-blue-400" />
            <div className="h-10 w-3 rounded-sm bg-amber-400/70" />
            <div className="h-20 w-3 rounded-sm bg-blue-300/60" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-[#0F1729]">
              ✓
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="mb-6 flex flex-col gap-4 text-sm text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              🛡️
            </span>
            Role-gated security
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              👥
            </span>
            Multi-tenant isolation
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>© 2026 Bridge Talent Management</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
