"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { myOrders } from "../api";
import { getPortalSession } from "@/lib/shop/session";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";

export const ORDER_STATUS = {
  PENDING: { label: "بانتظار التأكيد", tone: "amber" },
  ACCEPTED: { label: "تم القبول", tone: "blue" },
  PREPARING: { label: "جارٍ التجهيز", tone: "blue" },
  READY: { label: "جاهز للاستلام", tone: "green" },
  DELIVERED: { label: "تم التسليم", tone: "green" },
  CANCELLED: { label: "ملغي", tone: "red" },
} as const;

/** طلباتي — متابعة حالة كل طلب لحظة بلحظة (تحديث كل 20 ثانية). */
export function MyOrdersView() {
  const router = useRouter();
  useEffect(() => { if (!getPortalSession()) router.replace("/shop/login"); }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ["shop.orders"],
    queryFn: ({ signal }) => myOrders(signal),
    select: (r) => r.data,
    refetchInterval: 20_000,
  });

  if (isLoading) return <p className="py-10 text-center text-sm text-ink-faint">جارٍ التحميل…</p>;
  if (!data?.length) return <p className="py-10 text-center text-sm text-ink-faint">لم تطلب شيئًا بعد — تصفح المتجر وابدأ</p>;

  return (
    <ul className="space-y-3">
      {data.map((o) => {
        const st = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS] ?? { label: o.status, tone: "gray" as const };
        return (
          <li key={o.id} className="rounded-card border border-line bg-card p-4">
            <p className="flex items-center justify-between">
              <Badge tone={st.tone}>{st.label}</Badge>
              <span className="num text-[11px] text-ink-faint">{new Date(o.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</span>
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
              {o.lines.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span className="truncate">{l.nameAr} <span className="num">×{l.quantity}</span></span>
                  <span className="num">{(Number(l.unitPrice) * l.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
              <span className="text-ink-faint">{o.fulfillment === "DELIVERY" ? "توصيل" : "استلام من الصيدلية"}</span>
              <b className="num">{formatMoney(o.total)} ج.م</b>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
