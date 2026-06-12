"use client";
import { usePosStore, type CartLine } from "../store";
import { BatchPeek } from "./BatchPeek";
import { Card, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, previewMul } from "@/lib/utils/money";
import { Minus, Plus, Trash2, Percent } from "lucide-react";
import { useState } from "react";
import type { Discount } from "@/lib/zod/common";

/** Cart — quantities, per-line discounts (PERCENT/AMOUNT per Contract §5.1), FEFO peek, removal. */
export function CartPanel() {
  const { lines, setQty, remove } = usePosStore();
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader title={`السلة (${lines.length})`} />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {lines.length === 0 ? (
          <p className="py-14 text-center text-sm text-ink-faint">السلة فارغة — اختر دواءً من نتائج البحث</p>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.medicine.id} className="rise rounded-el border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{l.medicine.tradeNameAr}</p>
                    <p className="num text-xs text-ink-faint">{formatMoney(l.unitPrice)} / وحدة</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <BatchPeek medicineId={l.medicine.id} nameAr={l.medicine.tradeNameAr} />
                    <button
                      onClick={() => remove(l.medicine.id)}
                      aria-label="حذف"
                      className="rounded p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center rounded-el border border-line">
                    <button onClick={() => setQty(l.medicine.id, l.quantity + 1)} className="grid size-8 place-items-center hover:bg-paper" aria-label="زيادة">
                      <Plus className="size-3.5" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={l.quantity}
                      onChange={(e) => {
                        const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                        if (!Number.isNaN(n) && n > 0) setQty(l.medicine.id, n);
                        else if (e.target.value === "") setQty(l.medicine.id, 1);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="num w-10 border-0 bg-transparent text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label="الكمية"
                    />
                    <button onClick={() => setQty(l.medicine.id, l.quantity - 1)} className="grid size-8 place-items-center hover:bg-paper" aria-label="نقص">
                      <Minus className="size-3.5" />
                    </button>
                  </div>
                  <LineDiscount line={l} />
                  <b className="num text-sm">{formatMoney(previewMul(l.unitPrice, l.quantity))}</b>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function LineDiscount({ line }: { line: CartLine }) {
  const setLineDiscount = usePosStore((s) => s.setLineDiscount);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Discount["type"]>(line.discount?.type ?? "PERCENT");
  const [value, setValue] = useState(line.discount?.value ?? "");

  function apply() {
    setLineDiscount(line.medicine.id, value && Number(value) > 0 ? { type, value } : null);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex items-center gap-1 rounded-el border border-line px-2 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary-ink"
      >
        <Percent className="size-3" />
        {line.discount ? (
          <Badge tone="amber">{line.discount.type === "PERCENT" ? `${line.discount.value}%` : formatMoney(line.discount.value)}</Badge>
        ) : (
          "خصم"
        )}
      </PopoverTrigger>
      <PopoverContent className="w-60" align="start">
        <p className="mb-2 text-xs font-bold">خصم السطر — {line.medicine.tradeNameAr}</p>
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
          <Input inputMode="decimal" dir="ltr" className="num h-9 text-end" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "PERCENT" ? "10" : "5.00"} />
          <Button size="sm" className="h-9" onClick={apply}>تطبيق</Button>
        </div>
        {line.discount && (
          <button onClick={() => { setLineDiscount(line.medicine.id, null); setOpen(false); }} className="mt-2 text-xs text-danger hover:underline">
            إزالة الخصم
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
