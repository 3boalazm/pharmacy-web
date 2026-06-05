"use client";
import { Bell, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/http";
import { getSession, clearSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";

const roleAr: Record<string, string> = { OWNER: "المالك", PHARMACIST: "صيدلي", ASSISTANT: "مساعد صيدلي", CASHIER: "كاشير" };

/** جرس التنبيهات الآن حقيقي: عدّاد غير المقروء + الضغط يفتح /alerts (كان زرًا ميتًا بنقطة ثابتة). */
export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const session = typeof window !== "undefined" ? getSession() : null;

  const { data: unread } = useQuery({
    queryKey: ["alerts.count"],
    queryFn: async ({ signal }) => (await api<unknown[]>("/alerts?status=UNREAD", { signal })).data.length,
    refetchInterval: 30_000,
    enabled: !!session,
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-card/80 px-4 backdrop-blur md:px-6">
      <h1 className="truncate text-lg font-extrabold text-ink">{title}</h1>
      <div className="flex items-center gap-2 md:gap-3">
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
  );
}
