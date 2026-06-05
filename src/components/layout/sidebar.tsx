"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { navForRole, type NavItem } from "@/lib/nav";
import { getSession } from "@/lib/auth/session";
import { Cross } from "lucide-react";

/** Role-based sidebar — items come from lib/nav.ts (BR-6). Hiding is UX; the API enforces. */
export function Sidebar() {
  const path = usePathname();
  const [items, setItems] = useState<NavItem[]>([]);
  const [pharmacyName, setPharmacyName] = useState("");
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const s = getSession();
    if (s) {
      setItems(navForRole(s.user.role));
      setPharmacyName(s.pharmacy?.name ?? "");
    }
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-e border-line bg-card">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-el bg-primary text-white shadow-sm">
          <Cross className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-ink">صيدليتي</p>
          <p className="truncate text-[11px] text-ink-faint">{pharmacyName || "نظام إدارة الصيدليات"}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-el px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-primary-soft font-bold text-primary-ink" : "text-ink-soft hover:bg-paper",
              )}
            >
              <Icon className="size-[18px]" />
              {label}
              {active && <span className="ms-auto h-5 w-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
      <p className="flex items-center gap-1.5 px-5 py-4 text-[11px] text-ink-faint">
        v1.0 · <span className={online ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-danger"} /> {online ? "متصل" : "غير متصل — البيع يُحفَظ محليًا"}
      </p>
    </aside>
  );
}
