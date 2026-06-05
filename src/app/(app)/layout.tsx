"use client";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
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
<<<<<<< HEAD
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
=======
      <main className="min-w-0 flex-1 pb-16 lg:pb-0">{children}</main>
>>>>>>> 91694c0ebbd810250755934c50313a2bb82f6478
      <MobileNav />
      <AccountActions />
    </div>
  );
}
