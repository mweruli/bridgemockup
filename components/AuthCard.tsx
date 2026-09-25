import { ReactNode } from "react";
import { Logo } from "./Logo";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#F5F6FA] px-6 py-10 lg:bg-white">
      <div className="mb-8 lg:hidden">
        <Logo />
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_10px_40px_-15px_rgba(15,23,41,0.25)]">
        {children}
      </div>

      <p className="mt-8 text-xs text-slate-400">© 2026 Bridge Talent Management</p>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-slate-500">
      {children}
    </label>
  );
}
