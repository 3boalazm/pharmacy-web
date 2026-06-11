"use client";
<<<<<<< HEAD
import { Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { navGroupsForRole } from "@/lib/nav";
import { ThemeToggle } from "@/components/app/theme";
=======
import { Bell, LogOut, Menu, X, Cross } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { navForRole } from "@/lib/nav";
import { ThemeToggle } from "@/components/app/theme";
import { cn } from "@/lib/utils/cn";
>>>>>>> 8233f3233f04b1261a05c3eb8b9e24ec31ac6b26
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/http";
import { getSession, clearSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";

const roleAr: Record<string, string> = { OWNER: "المالك", PHARMACIST: "صيدلي", ASSISTANT: "مساعد صيدلي", CASHIER: "كاشير" };

/** جرس التنبيهات الآن حقيقي: عدّاد غير المقروء + الضغط يفتح /alerts (كان زرًا ميتًا بنقطة ثابتة). */
export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const session = typeof window !== "undefined" ? getSession() : null;
<<<<<<< HEAD
  const groups = session ? navGroupsForRole(session.user.role) : [];
=======
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const path = usePathname();
  const items = session ? navForRole(session.user.role) : [];
>>>>>>> 8233f3233f04b1261a05c3eb8b9e24ec31ac6b26

  const { data: unread } = useQuery({
    queryKey: ["alerts.count"],
    queryFn: async ({ signal }) => (await api<unknown[]>("/alerts?status=UNREAD", { signal })).data.length,
    refetchInterval: 30_000,
    enabled: !!session,
  });

  return (
    <>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-card/80 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-1">
<<<<<<< HEAD
=======
        <button aria-label="القائمة" onClick={() => setMenuOpen(true)} className="rounded-el p-2 text-ink-soft hover:bg-paper lg:hidden">
          <Menu className="size-5" />
        </button>
>>>>>>> 8233f3233f04b1261a05c3eb8b9e24ec31ac6b26
        <h1 className="truncate text-lg font-extrabold text-ink">{title}</h1>
      </div>
      <div className="flex items-center gap-1 md:gap-3">
        <ThemeToggle />
        <button
          aria-label="التنبيهات"
          onClick={() => router.push("/alerts")}
          className="relative rounded-el p-2 text-ink-soft transition-colors hover:bg-paper"
        >
          <Bell className="size-5" />
          {!!unread && (
            <span className="absolute -end-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-[18px] text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        {session && (
          <div className="hidden items-center gap-2 rounded-el border border-line px-3 py-1.5 sm:flex">
            <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-ink">
              {session.user.name.slice(0, 2)}
            </span>
            <div className="leading-tight">
              <p className="text-xs font-bold">{session.user.name}</p>
              <p className="text-[10px] text-ink-faint">{roleAr[session.user.role]}</p>
            </div>
          </div>
        )}
        <button
          aria-label="تسجيل الخروج"
          onClick={() => { clearSession(); router.push("/login"); }}
          className="rounded-el p-2 text-ink-soft hover:bg-danger-soft hover:text-danger"
        >
          <LogOut className="size-5" />
        </button>
      </div>

    </header>
<<<<<<< HEAD
=======
      {/* قائمة الموبايل المنزلقة — نفس عناصر السايدبار حسب الدور */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
          <nav className="rise absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <span className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-el bg-primary text-white"><Cross className="size-4" /></span>
                <b className="text-sm">صيدليتي</b>
              </span>
              <button aria-label="إغلاق" onClick={() => setMenuOpen(false)} className="rounded-el p-2 text-ink-soft hover:bg-paper">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? path === "/" : path.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    className={cn("flex items-center gap-3 rounded-el px-3 py-3 text-sm font-medium",
                      active ? "bg-primary-soft font-bold text-primary-ink" : "text-ink-soft hover:bg-paper")}>
                    <Icon className="size-[18px]" /> {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
>>>>>>> 8233f3233f04b1261a05c3eb8b9e24ec31ac6b26
    </>
  );
}