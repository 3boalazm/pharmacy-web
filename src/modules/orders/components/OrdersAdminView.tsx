"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, setOrderStatus, deliverOrder, type AdminOrder } from "../api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { ApiException } from "@/lib/api/http";
import { cn } from "@/lib/utils/cn";
import { Bike, Store, Phone } from "lucide-react";

const STATUS = {
  PENDING: { label: "جديد", tone: "amber" },
  ACCEPTED: { label: "مقبول", tone: "blue" },
  PREPARING: { label: "تجهيز", tone: "blue" },
  READY: { label: "جاهز", tone: "green" },
  DELIVERED: { label: "مُسلَّم", tone: "green" },
  CANCELLED: { label: "ملغي", tone: "red" },
} as const;
const NEXT: Record<string, { to: string; label: string } | undefined> = {
  PENDING: { to: "ACCEPTED", label: "قبول الطلب" },
  ACCEPTED: { to: "PREPARING", label: "بدء التجهيز" },
  PREPARING: { to: "READY", label: "جاهز للتسليم" },
};
const TABS = ["PENDING", "ACCEPTED", "PREPARING", "READY", "DELIVERED"] as const;

/** شاشة الطلبات الواردة من الستور: قبول ⟶ تجهيز ⟶ جاهز ⟶ تسليم (يتحول فاتورة حقيقية). */
export function OrdersAdminView() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING");
  const [deliverTarget, setDeliverTarget] = useState<AdminOrder | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["orders.admin", tab],
    queryFn: ({ signal }) => listOrders(tab, signal),
    select: (r) => r.data,
    refetchInterval: 20_000,
  });

  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => setOrderStatus(id, to),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders.admin"] }),
    onError: (e: Error) => toast("error", e.message),
  });
  const deliver = useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: "CASH" | "CARD" | "CREDIT" }) => deliverOrder(id, payment),
    onSuccess: ({ data }) => {
      toast("success", `تم التسليم — فاتورة ${data.invoiceNo}`);
      setDeliverTarget(null);
      qc.invalidateQueries({ queryKey: ["orders.admin"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiException
        ? e.error.code === "DUR_BLOCK" ? "تعارض دوائي — يتطلب مراجعة الصيدلي على الكاونتر"
        : e.error.code === "INSUFFICIENT_STOCK" ? "المخزون لا يكفي — راجع الكميات"
        : e.error.code === "CREDIT_LIMIT_EXCEEDED" ? "تجاوز حد الائتمان — حصّل نقدًا أو ارفع الحد"
        : e.error.message
        : "تعذر التسليم";
      toast("error", msg);
    },
  });

  return (
    <Card>
      <div className="flex gap-1 overflow-x-auto border-b border-line p-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("whitespace-nowrap rounded-el px-3 py-2 text-xs font-bold",
              tab === t ? "bg-primary text-white" : "text-ink-soft hover:bg-paper")}>
            {STATUS[t].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا توجد طلبات هنا" hint="الطلبات الجديدة من الستور تظهر فورًا مع تنبيه" />
      ) : (
        <ul className="divide-y divide-line/60">
          {data.map((o) => (
            <li key={o.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                <b className="text-sm">{o.customer.name}</b>
                <a href={`tel:${o.customer.phone}`} className="num flex items-center gap-1 text-xs text-info" dir="ltr">
                  <Phone className="size-3" />{o.customer.phone}
                </a>
                <span className="ms-auto flex items-center gap-1 text-xs text-ink-faint">
                  {o.fulfillment === "DELIVERY" ? <Bike className="size-3.5" /> : <Store className="size-3.5" />}
                  {o.fulfillment === "DELIVERY" ? "توصيل" : "استلام"}
                  · <span className="num">{new Date(o.createdAt).toLocaleTimeString("ar-EG", { timeStyle: "short" })}</span>
                </span>
              </div>
              {o.address && <p className="text-xs text-ink-soft">📍 {o.address}</p>}
              {o.note && <p className="rounded-el bg-paper px-2 py-1 text-xs text-ink-soft">💬 {o.note}</p>}
              <ul className="text-xs text-ink-soft">
                {o.lines.map((l) => (
                  <li key={l.id} className="flex justify-between py-0.5">
                    <span>{l.nameAr} <b className="num">×{l.quantity}</b></span>
                    <span className="num">{(Number(l.unitPrice) * l.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <b className="num text-sm">{formatMoney(o.total)} ج.م</b>
                <span className="flex gap-2">
                  {o.status !== "DELIVERED" && o.status !== "CANCELLED" && (
                    <Button size="sm" variant="ghost" onClick={() => move.mutate({ id: o.id, to: "CANCELLED" })}>إلغاء</Button>
                  )}
                  {NEXT[o.status] && (
                    <Button size="sm" variant="secondary" loading={move.isPending}
                      onClick={() => move.mutate({ id: o.id, to: NEXT[o.status]!.to })}>
                      {NEXT[o.status]!.label}
                    </Button>
                  )}
                  {o.status === "READY" && (
                    <Button size="sm" onClick={() => setDeliverTarget(o)}>تسليم + فاتورة</Button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!deliverTarget} onOpenChange={(op) => !op && setDeliverTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسليم طلب {deliverTarget?.customer.name}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-ink-soft">
              سيُنفَّذ الآن بيع حقيقي بكل بواباته (تعارضات دوائية، مخزون FEFO، حد الائتمان) ويُصدر فاتورة وقيودًا.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["CASH", "CARD", "CREDIT"] as const).map((m) => (
                <Button key={m} variant={m === "CREDIT" ? "secondary" : "default"} loading={deliver.isPending}
                  onClick={() => deliverTarget && deliver.mutate({ id: deliverTarget.id, payment: m })}>
                  {m === "CASH" ? "نقدي" : m === "CARD" ? "بطاقة" : "على الحساب"}
                </Button>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeliverTarget(null)}>رجوع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
