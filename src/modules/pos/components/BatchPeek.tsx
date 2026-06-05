"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBatches } from "@/modules/inventory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";
import { Layers } from "lucide-react";

/**
 * Batch Selection (FEFO preview) — GET /stock/:medicineId/batches.
 * Dispensing order is decided by the SERVER (BR-1.2): the contract does not accept
 * client batch ids, so this surface shows exactly which lots FEFO will draw from,
 * in order — full traceability without an override path.
 */
export function BatchPeek({ medicineId, nameAr }: { medicineId: string; nameAr: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["batches", medicineId],
    queryFn: () => getBatches(medicineId),
    enabled: open,
    select: (r) => r.data.filter((b) => b.status === "ACTIVE" && b.quantity > 0),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="rounded-el p-1.5 text-ink-faint transition-colors hover:bg-primary-soft hover:text-primary-ink"
        aria-label={`تشغيلات ${nameAr}`}
      >
        <Layers className="size-4" />
      </PopoverTrigger>
      <PopoverContent onClick={(e) => e.stopPropagation()} align="end">
        <p className="mb-2 text-xs font-bold text-ink">ترتيب الصرف (FEFO) — {nameAr}</p>
        {isLoading ? (
          <p className="py-4 text-center text-xs text-ink-faint">جارٍ التحميل…</p>
        ) : !data?.length ? (
          <p className="py-4 text-center text-xs text-ink-faint">لا توجد تشغيلات نشطة</p>
        ) : (
          <ul className="space-y-1.5">
            {data.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-el border border-line px-2.5 py-1.5 text-xs">
                <span className="flex items-center gap-2">
                  <Badge tone="green">#{b.fefoOrder}</Badge>
                  <span className="font-mono">{b.batchNumber}</span>
                </span>
                <span className="flex items-center gap-3 text-ink-soft">
                  <span className="num">{new Date(b.expiryDate).toLocaleDateString("ar-EG")}</span>
                  <b className="num text-ink">{b.quantity}</b>
                  <span className="num">{formatMoney(b.unitCost)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
          يخصص الخادم التشغيلات آلياً حسب الأقرب انتهاءً — لا يمكن صرف تشغيلة منتهية بأي صلاحية.
        </p>
      </PopoverContent>
    </Popover>
  );
}
