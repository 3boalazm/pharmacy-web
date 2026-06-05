"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { placeOrder } from "../api";
import { useCart, cartTotal } from "../cart";
import { getPortalSession } from "@/lib/shop/session";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { ApiException } from "@/lib/api/http";
import { cn } from "@/lib/utils/cn";
import { Store, Bike } from "lucide-react";

/** التشيك أوت: مراجعة السلة ⟶ استلام/توصيل ⟶ تأكيد. الطلب نية فقط — الدفع عند الاستلام. */
export function CheckoutSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      placeOrder({
        lines: cart.lines.map((l) => ({ medicineId: l.item.id, quantity: l.quantity })),
        fulfillment,
        address: fulfillment === "DELIVERY" ? address : undefined,
        note: note || undefined,
      }),
    onSuccess: () => {
      cart.clear();
      onOpenChange(false);
      toast("success", "تم إرسال طلبك للصيدلية — تابع حالته من «طلباتي»");
      router.push("/shop/orders");
    },
    onError: (e: unknown) => {
      if (e instanceof ApiException && e.status === 401) {
        onOpenChange(false);
        router.push("/shop/login?next=checkout");
        return;
      }
      toast("error", e instanceof Error ? e.message : "تعذر إرسال الطلب");
    },
  });

  const total = cartTotal(cart.lines);
  const loggedIn = !!getPortalSession();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>مراجعة الطلب</DialogTitle></DialogHeader>
        <DialogBody className="space-y-4">
          <ul className="space-y-1.5">
            {cart.lines.map((l) => (
              <li key={l.item.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate">{l.item.tradeNameAr} <span className="num text-ink-faint">×{l.quantity}</span></span>
                <b className="num">{(Number(l.item.sellPrice) * l.quantity).toFixed(2)}</b>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
            <span>الإجمالي</span><span className="num">{total.toFixed(2)} ج.م</span>
          </p>

          <div className="grid grid-cols-2 gap-2">
            {([["PICKUP", "استلام من الصيدلية", Store], ["DELIVERY", "توصيل", Bike]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" onClick={() => setFulfillment(v)}
                className={cn("flex items-center justify-center gap-2 rounded-el border px-3 py-3 text-sm font-bold",
                  fulfillment === v ? "border-primary bg-primary-soft text-primary-ink" : "border-line text-ink-soft")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          {fulfillment === "DELIVERY" && (
            <Input label="عنوان التوصيل" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان بالتفصيل…" />
          )}
          <Input label="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />

          {!loggedIn && (
            <p className="rounded-el bg-info-soft px-3 py-2 text-xs text-info">ستحتاج لتسجيل الدخول أو إنشاء حساب لإتمام الطلب.</p>
          )}
          <p className="rounded-el bg-paper px-3 py-2 text-[11px] text-ink-faint">
            الدفع عند الاستلام نقدًا أو على حسابك الدفتري — الأصناف التي تتطلب روشتة تُراجَع من الصيدلي قبل التسليم.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>رجوع</Button>
          <Button loading={submit.isPending} disabled={fulfillment === "DELIVERY" && !address.trim()}
            onClick={() => (loggedIn ? submit.mutate() : (onOpenChange(false), router.push("/shop/login")))}>
            {loggedIn ? "تأكيد الطلب" : "سجّل الدخول للمتابعة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
