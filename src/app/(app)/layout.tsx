"use client";
import { Sidebar } from "@/components/layout/sidebar";
import { AccountActions } from "@/modules/identity";
import { getSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getSession()) router.replace("/login");
    else setReady(true);
  }, [router]);
  if (!ready) return null;
  return (
    <div className="relative z-10 flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
      <AccountActions />
    </div>
  );
}
