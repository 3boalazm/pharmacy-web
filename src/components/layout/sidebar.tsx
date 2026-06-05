"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { navForRole, type NavItem } from "@/lib/nav";
import { getSession } from "@/lib/auth/session";
import { api } from "@/lib/api/http";
import { formatMoney } from "@/lib/utils/money";
import { ChevronDown, Clock, Cross, PanelRightClose, PanelRightOpen } from "lucide-react";

const COLLAPSE_KEY = "pharmacy.nav.collapsed"; // مجموعات مطوية
const RAIL_KEY = "pharmacy.nav.rail"; // وضع السكة

/** شريحة الوردية (نمط Careem Captain): حالة العمل دائمًا في الوجه — ليست بندًا في القائمة. */
function ShiftSlice({ rail }: { rail: boolean }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["shift", "current"],
    queryFn: async ({ signal }) =>
      (await api<{ open: boolean; shift?: { openedAt: string }; liveExpected?: string }>("/shifts/current", { signal })).data,
    refetchInterval: 30_000,
  });
  const open = data?.open;
  if (rail) {
    return (
      <button onClick={() => router.push("/shifts")} title={open ? "وردية مفتوحة" : "افتح وردية"}
        className={cn("mx-auto mb-1 grid size-10 place-items-center rounded-el",
          open ? "bg-primary-soft text-primary-ink" : "bg-warn-soft text-warn")}>
        <Clock className="size-5" />
      </button>
    );
  }
  return (
    <button onClick={() => router.push("/shifts")}
      className={cn("mx-3 mb-1 flex items-center gap-2.5 rounded-el border px-3 py-2.5 text-start transition-colors",
        open ? "border-primary/30 bg-primary-soft/60 hover:bg-primary-soft" : "border-warn/30 bg-warn-soft/60 hover:bg-warn-soft")}>
      <Clock className={cn("size-4 shrink-0", open ? "text-primary-ink" : "text-warn")} />
      {open && data?.shift ? (
        <span className="min-w-0 leading-tight">
          <p className="text-xs font-extrabold text-primary-ink">وردية مفتوحة</p>
          <p className="truncate text-[10px] text-ink-soft">
            منذ <span className="num">{new Date(data.shift.openedAt).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</span>
            {" · "}المتوقع <span className="num">{formatMoney(data.liveExpected ?? "0")}</span>
          </p>
        </span>
      ) : (
        <span className="leading-tight">
          <p className="text-xs font-extrabold text-warn">لا وردية مفتوحة</p>
          <p className="text-[10px] text-ink-soft">اضغط لفتح وردية</p>
        </span>
      )}
    </button>
  );
}

/**
 * السايدبار v2 (Notion-style): مجموعات قابلة للطي تُحفظ لكل مستخدم، فتح تلقائي
 * للمجموعة الحاوية للمسار الحالي، ووضع Rail (72px) لشاشات الكاشير الضيقة.
 * البنود من lib/nav.ts بالدور — الإخفاء UX والـ API يفرض الصلاحية.
 */
export function Sidebar() {
  const path = usePathname();
  const [items, setItems] = useState<NavItem[]>([]);
  const [pharmacyName, setPharmacyName] = useState("");
  const [online, setOnline] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [rail, setRail] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) {
      setItems(navForRole(s.user.role));
      setPharmacyName(s.pharmacy?.name ?? "");
    }
    try {
      setCollapsed(JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? "[]"));
      setRail(localStorage.getItem(RAIL_KEY) === "1");
    } catch { /* تجاهل تفضيلات تالفة */ }
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // اختصار [ لطي/فتح السكة
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "[" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setRail((r) => { localStorage.setItem(RAIL_KEY, r ? "0" : "1"); return !r; });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    const out: { section: string | null; items: NavItem[] }[] = [];
    for (const item of items) {
      const sec = item.section ?? null;
      const last = out[out.length - 1];
      if (last && last.section === sec) last.items.push(item);
      else out.push({ section: sec, items: [item] });
    }
    return out;
  }, [items]);

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const toggleGroup = (sec: string) =>
    setCollapsed((prev) => {
      const next = prev.includes(sec) ? prev.filter((x) => x !== sec) : [...prev, sec];
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      return next;
    });

  return (
    <aside className={cn(
      "sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line bg-card transition-[width] duration-200 lg:flex",
      rail ? "w-[72px]" : "w-64",
    )}>
      {/* الرأس */}
      <Link href="/" className={cn("flex items-center gap-2.5 py-5", rail ? "justify-center px-0" : "px-5")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-el bg-primary text-white shadow-sm">
          <Cross className="size-5" />
        </span>
        {!rail && (
          <span className="leading-tight">
            <p className="text-sm font-extrabold text-ink">صيدليتي</p>
            <p className="max-w-[150px] truncate text-[11px] text-ink-faint">{pharmacyName || "نظام إدارة الصيدليات"}</p>
          </span>
        )}
      </Link>

      <ShiftSlice rail={rail} />

      {/* المجموعات */}
      <nav className={cn("flex-1 overflow-y-auto pb-2", rail ? "px-2.5" : "px-3")}>
        {groups.map((g, gi) => {
          const isCollapsed = g.section ? collapsed.includes(g.section) : false;
          return (
            <div key={gi}>
              {g.section && !rail && (
                <button onClick={() => toggleGroup(g.section!)}
                  className="flex w-full items-center justify-between px-3 pb-1 pt-3 text-[10px] font-bold text-ink-faint hover:text-ink-soft">
                  {g.section}
                  <ChevronDown className={cn("size-3 transition-transform", isCollapsed && "-rotate-90")} />
                </button>
              )}
              {g.section && rail && <div className="mx-2 my-2 border-t border-line" />}
              {g.items
                .filter((it) => rail || !isCollapsed || isActive(it.href)) // المطوية تُظهر بندها النشط فقط
                .map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link key={href} href={href} title={rail ? label : undefined}
                      className={cn(
                        "flex items-center rounded-el text-sm font-medium transition-colors",
                        rail ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                        active ? "bg-primary-soft font-bold text-primary-ink" : "text-ink-soft hover:bg-paper",
                      )}>
                      <Icon className="size-[18px] shrink-0" />
                      {!rail && label}
                      {!rail && active && <span className="ms-auto h-5 w-1 rounded-full bg-primary" />}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {/* القاعدة */}
      <div className={cn("border-t border-line py-3", rail ? "px-2.5" : "px-4")}>
        <button onClick={() => setRail((r) => { localStorage.setItem(RAIL_KEY, r ? "0" : "1"); return !r; })}
          title={rail ? "توسيع القائمة ( [ )" : "طي القائمة ( [ )"}
          className={cn("mb-2 flex items-center gap-2 rounded-el p-2 text-xs text-ink-faint hover:bg-paper hover:text-ink-soft", rail && "mx-auto")}>
          {rail ? <PanelRightOpen className="size-4" /> : <><PanelRightClose className="size-4" /> طي القائمة</>}
        </button>
        <p className={cn("flex items-center gap-1.5 text-[11px] text-ink-faint", rail && "justify-center")}>
          <span className={online ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-danger"} />
          {!rail && (online ? "متصل" : "غير متصل — البيع يُحفَظ محليًا")}
        </p>
      </div>
    </aside>
  );
}
