"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navForRole, type NavItem } from "@/lib/nav";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { Menu, X, Clock } from "lucide-react";

/** تنقّل الموبايل لشاشات الإدارة: شريط سفلي بأهم 4 شاشات + «المزيد» يفتح بقية القائمة. */
export function MobileNav() {
  const path = usePathname();
  const [items, setItems] = useState<NavItem[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) setItems(navForRole(s.user.role));
  }, []);
  useEffect(() => setMoreOpen(false), [path]);

  if (!items.length) return null;
  const primary = items.slice(0, 4);
  const rest = items.slice(4);

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card/95 backdrop-blur lg:hidden">
        {primary.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold",
              isActive(href) ? "text-primary-ink" : "text-ink-faint")}>
            <Icon className="size-5" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
        {rest.length > 0 && (
          <button onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-ink-faint">
            <Menu className="size-5" />
            المزيد
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="القائمة">
          <button aria-label="إغلاق" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-ink/40" />
          <div className="rise absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-card p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <Link href="/shifts" onClick={() => setMoreOpen(false)} className="flex items-center gap-1.5 text-sm font-extrabold text-primary-ink"><Clock className="size-4" /> الوردية</Link>
              <button aria-label="إغلاق" onClick={() => setMoreOpen(false)} className="rounded p-1.5 text-ink-faint hover:bg-paper"><X className="size-4" /></button>
            </div>
            {/* بحسب المجموعات */}
            <ul className="grid grid-cols-3 gap-2">
              {rest.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href}
                    className={cn("flex flex-col items-center gap-1.5 rounded-card border p-3 text-[11px] font-bold",
                      isActive(href) ? "border-primary bg-primary-soft text-primary-ink" : "border-line text-ink-soft")}>
                    <Icon className="size-5" />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
