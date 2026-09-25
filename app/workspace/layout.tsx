"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { useSession } from "@/lib/session";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) router.replace("/");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] text-sm text-slate-400">
        Loading workspace…
      </div>
    );
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
