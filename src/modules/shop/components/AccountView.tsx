"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { myProfile, myStatement } from "../api";
import { getPortalSession } from "@/lib/shop/session";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

/** «حسابي» — رصيد العميل وأقساطه وكشف حسابه: نفس إسقاطات دفتر الأستاذ، للقراءة فقط. */
export function AccountView() {
  const router = useRouter();
  useEffect(() => { if (!getPortalSession()) router.replace("/shop/login"); }, [router]);

  const profile = useQuery({ queryKey: ["shop.me"], queryFn: ({ signal }) => myProfile(signal), select: (r) => r.data });
  const statement = useQuery({ queryKey: ["shop.statement"], queryFn: ({ signal }) => myStatement(signal), select: (r) => r.data });

  if (!profile.data) return <p className="py-10 text-center text-sm text-ink-faint">جارٍ التحميل…</p>;
  const p = profile.data;
  const pending = p.installments.filter((i) => !i.paidAt);

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-card p-4">
        <p className="text-sm font-extrabold">{p.name}</p>
        <p className="num text-xs text-ink-faint" dir="ltr">{p.phone}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className={cn("rounded-el p-3", Number(p.balance) > 0 ? "bg-warn-soft" : "bg-primary-soft")}>
            <p className="text-[11px] text-ink-soft">عليك للصيدلية</p>
            <p className="num text-lg font-extrabold">{formatMoney(p.balance)}</p>
          </div>
          <div className="rounded-el bg-paper p-3">
            <p className="text-[11px] text-ink-soft">نقاط الولاء</p>
            <p className="num text-lg font-extrabold">{p.loyaltyPoints}</p>
          </div>
        </div>
      </section>

      {pending.length > 0 && (
        <section className="rounded-card border border-line bg-card p-4">
          <p className="mb-2 text-sm font-extrabold">أقساط مستحقة</p>
          <ul className="space-y-1.5">
            {pending.map((i) => {
              const overdue = new Date(i.dueDate) < new Date();
              return (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    قسط {i.seq} {overdue && <Badge tone="red">متأخر</Badge>}
                  </span>
                  <span className="num text-ink-soft">{new Date(i.dueDate).toLocaleDateString("ar-EG")}</span>
                  <b className="num">{formatMoney(i.amount)}</b>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-card border border-line bg-card p-4">
        <p className="mb-2 text-sm font-extrabold">كشف حسابي</p>
        {!statement.data?.rows.length ? (
          <p className="py-4 text-center text-xs text-ink-faint">لا توجد حركات بعد</p>
        ) : (
          <ul className="space-y-1">
            {statement.data.rows.slice(-15).reverse().map((r, i) => (
              <li key={`${r.journalEntryId}-${i}`} className="flex items-center justify-between border-b border-line/50 py-1.5 text-xs last:border-0">
                <span className="min-w-0 flex-1 truncate">{r.description}</span>
                <span className="num mx-2 text-ink-faint">{new Date(r.date).toLocaleDateString("ar-EG")}</span>
                <b className={cn("num", r.debit ? "text-warn" : "text-primary-ink")}>
                  {r.debit ? `+${formatMoney(r.debit)}` : `-${formatMoney(r.credit ?? "0")}`}
                </b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
