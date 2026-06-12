"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { shopCatalog } from "../api";
import { useCart, cartTotal } from "../cart";
import { CheckoutSheet } from "./CheckoutSheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils/money";
import { Minus, Plus, ShoppingCart } from "lucide-react";

/** كتالوج الستور — كروت موبايل، توافر بدون كشف كميات، سلة بشريط سفلي. */
export function CatalogView() {
  const [search, setSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const cart = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["shop.catalog", search],
    queryFn: ({ signal }) => shopCatalog(search || undefined, signal),
    select: (r) => r.data,
  });

  const total = cartTotal(cart.lines);

  return (
    <div className="space-y-3">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن دواء…" className="h-11" />

      {isLoading ? (
        <p className="py-10 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <p className="py-10 text-center text-sm text-ink-faint">لا توجد نتائج</p>
      ) : (
        <ul className="space-y-2">
          {data.map((item) => {
            const inCart = cart.lines.find((l) => l.item.id === item.id);
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-card border border-line bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.tradeNameAr}</p>
                  <p className="truncate text-[11px] text-ink-faint">{item.form}</p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <b className="num text-sm text-primary-ink">{formatMoney(item.sellPrice)}</b>
                    {!item.available && <Badge tone="gray">غير متوفر حاليًا</Badge>}
                    {item.requiresPrescription && <Badge tone="blue">روشتة</Badge>}
                  </p>
                </div>
                {inCart ? (
                  <span className="flex items-center gap-1">
                    <button aria-label="تقليل" onClick={() => cart.setQty(item.id, inCart.quantity - 1)} className="grid size-9 place-items-center rounded-el border border-line"><Minus className="size-4" /></button>
                    <b className="num w-7 text-center">{inCart.quantity}</b>
                    <button aria-label="زيادة" onClick={() => cart.setQty(item.id, inCart.quantity + 1)} className="grid size-9 place-items-center rounded-el bg-primary text-white"><Plus className="size-4" /></button>
                  </span>
                ) : (
                  <Button size="sm" disabled={!item.available} onClick={() => cart.add(item)}>
                    <Plus className="size-4" /> أضف
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {cart.lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-30 mx-auto max-w-2xl p-3">
          <Button size="lg" className="w-full shadow-pop" onClick={() => setCheckoutOpen(true)}>
            <ShoppingCart className="size-4" /> إتمام الطلب · <span className="num">{total.toFixed(2)}</span> ج.م
          </Button>
        </div>
      )}

      <CheckoutSheet open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  );
}
