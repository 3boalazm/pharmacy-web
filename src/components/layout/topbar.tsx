"use client";
import { Bell, LogOut } from "lucide-react";
import { getSession, clearSession } from "@/lib/auth/session";
import { useRouter } from "next/navigation";

const roleAr: Record<string, string> = { OWNER: "المالك", PHARMACIST: "صيدلي", ASSISTANT: "مساعد صيدلي", CASHIER: "كاشير" };

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const session = typeof window !== "undefined" ? getSession() : null;
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-card/80 px-6 backdrop-blur">
      <h1 className="text-lg font-extrabold text-ink">{title}</h1>
      <div className="flex items-center gap-3">
        <button aria-label="التنبيهات" className="relative rounded-el p-2 text-ink-soft hover:bg-paper">
          <Bell className="size-5" />
          <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-danger" />
        </button>
        {session && (
          <div className="flex items-center gap-2 rounded-el border border-line px-3 py-1.5">
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
