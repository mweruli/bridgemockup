"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { Logo } from "./Logo";
import { useSession } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/workspace", label: "Dashboard", icon: "▦" },
  { href: "/workspace/roles", label: "Roles & Permissions", icon: "🛡️" },
  { href: "/workspace/users", label: "Users", icon: "👥" },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, clearSession } = useSession();

  function signOut() {
    clearSession();
    router.push("/");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden flex-col justify-between bg-[#0F1729] px-5 py-6 text-white lg:flex">
        <div>
          <div className="px-1">
            <Logo light />
          </div>

          <nav className="mt-10 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/workspace" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="px-1 text-xs text-slate-400">
            <div className="font-medium text-slate-200">{session?.profile.full_name}</div>
            <div>{session?.profile.username}</div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col bg-[#F5F6FA]">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={signOut}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
