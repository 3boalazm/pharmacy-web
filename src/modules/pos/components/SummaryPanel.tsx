"use client";
import { useState } from "react";
import { usePosStore, cartTotals, redeemValue } from "../store";
import { TAX_EXEMPT_LABEL, TAX_LABEL, TAX_RATE } from "../tax";
import { CustomerSelect } from "./CustomerSelect";
import { getLastInvoiceForCustomer } from "@/modules/sales";
import { getMedicine, lookupByBarcode } from "@/modules/catalog";
import { useToast } from "@/components/ui/toast";
import { Card, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";
import { TicketPercent } from "lucide-react";
import type { Discount } from "@/lib/zod/common";

/**
 * Summary: customer, invoice-level discount, tax row (VAT-ready; rate from tax.ts —
 * 0 today per Architecture §0, so displayed total === server total), and checkout CTA.
 */
export function SummaryPanel({ onCheckout, busy }: { onCheckout: () => void; busy: boolean }) {
  const { lines, invoiceDiscount, customer, redeemPoints, setRedeemPoints } = usePosStore();
  const totals = cartTotals(lines, invoiceDiscount);

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader title="الملخص والدفع" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <CustomerSelect />
        <QuickActions />
        <InvoiceDiscount />
        {customer && customer.loyaltyPoints > 0 && (
          <div className="rounded-el border border-line p-3">
            <p className="mb-1.5 flex items-center justify-between text-xs font-bold text-ink-soft">
              <span>استبدال نقاط الولاء</span>
              <span className="num text-ink-faint">المتاح {customer.loyaltyPoints} نقطة = {redeemValue(customer.loyaltyPoints).toFixed(2)} ج.م</span>
            </p>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} max={customer.loyaltyPoints} dir="ltr" className="num h-9 text-end"
                value={redeemPoints || ""} placeholder="0"
                onChange={(e) => setRedeemPoints(Math.min(Math.max(0, Number(e.target.value) || 0), customer.loyaltyPoints))} />
              <Button type="button" size="sm" variant="secondary" onClick={() => setRedeemPoints(customer.loyaltyPoints)}>الكل</Button>
            </div>
          </div>
        )}

        <div className="mt-auto space-y-1.5 text-sm">
          <Separator className="mb-2" />
          <Row label="الإجمالي الفرعي" value={formatMoney(totals.subtotal)} />
          {Number(totals.lineDiscounts) > 0 && <Row label="خصومات السطور" value={`-${formatMoney(totals.lineDiscounts)}`} tone="danger" />}
          {Number(totals.invoiceDiscount) > 0 && <Row label="خصم الفاتورة" value={`-${formatMoney(totals.invoiceDiscount)}`} tone="danger" />}
          {redeemPoints > 0 && <Row label={`نقاط ولاء (${redeemPoints})`} value={`-${redeemValue(redeemPoints).toFixed(2)}`} tone="danger" />}
          <Row
            label={TAX_LABEL}
            value={TAX_RATE === 0 ? TAX_EXEMPT_LABEL : formatMoney(totals.tax)}
            tone="muted"
          />
          <Separator className="my-2" />
          <p className="flex items-baseline justify-between text-lg font-extrabold">
            <span>الإجمالي</span>
            <span className="num">{(Number(totals.total) - redeemValue(redeemPoints)).toFixed(2)}</span>
          </p>
          <p className="text-[11px] leading-relaxed text-ink-faint">
            القيمة النهائية يحددها الخادم — كل عملية بيع قيد محاسبي متوازن غير قابل للتعديل.
          </p>
        </div>

        <Button size="lg" className="w-full" loading={busy} disabled={lines.length === 0} onClick={onCheckout}>
          إتمام البيع (F9)
        </Button>
      </div>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "danger" | "muted" }) {
  return (
    <p className="flex justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className={tone === "danger" ? "num text-danger" : tone === "muted" ? "num text-ink-faint" : "num"}>{value}</span>
    </p>
  );
}

function InvoiceDiscount() {
  const { invoiceDiscount, setInvoiceDiscount } = usePosStore();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Discount["type"]>(invoiceDiscount?.type ?? "PERCENT");
  const [value, setValue] = useState(invoiceDiscount?.value ?? "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-10 w-full items-center justify-between rounded-el border border-line bg-card px-3 text-sm text-ink-soft transition-colors hover:border-primary">
        <span className="flex items-center gap-2"><TicketPercent className="size-4" /> خصم على إجمالي الفاتورة</span>
        {invoiceDiscount ? (
          <Badge tone="amber">{invoiceDiscount.type === "PERCENT" ? `${invoiceDiscount.value}%` : formatMoney(invoiceDiscount.value)}</Badge>
        ) : (
          <span className="text-xs text-ink-faint">بدون</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="mb-2 flex rounded-el border border-line p-0.5 text-xs font-bold">
          {(["PERCENT", "AMOUNT"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={t === type ? "flex-1 rounded-[6px] bg-primary px-2 py-1.5 text-white" : "flex-1 rounded-[6px] px-2 py-1.5 text-ink-soft hover:bg-paper"}
            >
              {t === "PERCENT" ? "نسبة %" : "مبلغ ج.م"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input inputMode="decimal" dir="ltr" className="num h-9 text-end" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "PERCENT" ? "5" : "10.00"} />
          <Button
            size="sm"
            className="h-9"
            onClick={() => {
              setInvoiceDiscount(value && Number(value) > 0 ? { type, value } : null);
              setOpen(false);
            }}
          >
            تطبيق
          </Button>
        </div>
        {invoiceDiscount && (
          <button onClick={() => { setInvoiceDiscount(null); setOpen(false); }} className="mt-2 text-xs text-danger hover:underline">
            إزالة الخصم
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** إجراءات سريعة: كرّر آخر فاتورة للعميل · مسح السلة. (تحسين POS، بلا سكيما) */
function QuickActions() {
  const { customer, lines, add, setQty, clear } = usePosStore();
  const toast = useToast();

  const repeat = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error("اختر عميلًا أولًا");
      const { data } = await getLastInvoiceForCustomer(customer.id);
      let added = 0, skipped = 0;
      for (const line of data.lines) {
        try {
          const { data: med } = await getMedicine(line.medicineId, true);
          if ((med.stock?.onHand ?? 0) <= 0) { skipped++; continue; }
          add(med);
          if (line.quantity > 1) setQty(med.id, line.quantity);
          added++;
        } catch { skipped++; }
      }
      return { added, skipped, invoiceNo: data.invoiceNo };
    },
    onSuccess: (r) => {
      toast("success", `أُضيف ${r.added} صنفًا من آخر فاتورة${r.skipped ? ` (${r.skipped} غير متاح)` : ""}`);
    },
    onError: (e: Error) => toast("error", e.message),
  });

  return (
    <div className="flex gap-2">
      {customer && (
        <Button variant="secondary" size="sm" className="flex-1" loading={repeat.isPending} onClick={() => repeat.mutate()}>
          كرّر آخر فاتورة
        </Button>
      )}
      {lines.length > 0 && (
        <Button variant="ghost" size="sm" className={customer ? "" : "flex-1"} onClick={() => clear()}>
          مسح السلة
        </Button>
      )}
    </div>
  );
}
