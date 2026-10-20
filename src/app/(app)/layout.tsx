"use client";
import { Sidebar } from "@/components/layout/sidebar";
import { Onboarding } from "@/components/app/onboarding";
import { MobileNav } from "@/components/layout/mobile-nav";
import { OfflineBanner } from "@/components/app/offline-banner";
import { AccountActions } from "@/modules/identity";
import { clearSession, getSession, onRemoteLogout } from "@/lib/auth/session";
import { canAccessPath, firstAllowedPath } from "@/lib/nav";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const toast = useToast();
  const [ready, setReady] = useState(false);

  // حارس الدور: إخفاء الزر ليس حماية، لكن فتح مسار ممنوع بالرابط يجب ألا يعرض شاشة تعمل.
  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canAccessPath(session.user.role, pathname)) {
      setReady(false);
      toast("warn", "هذه الشاشة غير متاحة لدورك الحالي");
      router.replace(firstAllowedPath(session.user.role));
      return;
    }
    setReady(true);
  }, [router, pathname, toast]);

  // خروج من تبويب آخر (sessionStorage لا يتزامن بين التبويبات)
  useEffect(
    () =>
      onRemoteLogout(() => {
        clearSession();
        qc.clear();
        router.replace("/login");
      }),
    [qc, router],
  );

  if (!ready) return null;
  return (
    <div className="relative z-10 flex min-h-screen">
      {/* تجاوز التنقل بلوحة المفاتيح: أول عنصر قابل للتركيز في الصفحة */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-el focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        تجاوز إلى المحتوى
      </a>
      <Onboarding />
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-20 lg:pb-0">
        <OfflineBanner />
        {children}
      </main>
      <MobileNav />
      <AccountActions />
    </div>
  );
}
