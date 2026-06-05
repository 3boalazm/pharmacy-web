"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createAdjustment, getBatches } from "../api";
import { ADJUSTMENT_REASONS, zAdjustForm, type AdjustFormValues } from "../schemas";
import { searchMedicines } from "@/modules/catalog";
import { Card, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { ApiException } from "@/lib/api/http";
import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";

/**
 * Stock Adjustments (WF-4): count correction / damage / expiry write-off / theft.
 * Posts movement + balanced journal in one transaction; reason mandatory and audited.
 */
export function AdjustmentForm() {
  const toast = useToast();
  const [medicineName, setMedicineName] = useState<string>("");
  const [medOpen, setMedOpen] = useState(false);
  const [medTerm, setMedTerm] = useState("");
  const [result, setResult] = useState<{ journalEntryId: string; newQuantity: number } | null>(null);

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(zAdjustForm),
    defaultValues: { medicineId: "", batchId: "", direction: "REMOVE", quantity: 1, reason: "COUNT_CORRECTION", note: "" },
  });
  const medicineId = form.watch("medicineId");
  const direction = form.watch("direction");

  const meds = useQuery({
    queryKey: ["medicines.search", medTerm],
    queryFn: ({ signal }) => searchMedicines(medTerm, signal),
    enabled: medOpen && medTerm.length >= 2,
    select: (r) => r.data,
  });
  const batches = useQuery({
    queryKey: ["batches", medicineId],
    queryFn: () => getBatches(medicineId),
    enabled: !!medicineId,
    select: (r) => r.data.filter((b) => b.status === "ACTIVE" || b.status === "EXPIRED" || b.status === "QUARANTINED"),
  });

  const adjust = useMutation({
    mutationFn: (v: AdjustFormValues) =>
      createAdjustment({
        batchId: v.batchId,
        quantity: v.direction === "REMOVE" ? -v.quantity : v.quantity,
        reason: v.reason,
        note: v.note || undefined,
      }),
    onSuccess: ({ data }) => {
      setResult(data);
      toast("success", "تم ترحيل التسوية بقيد محاسبي");
      form.reset({ medicineId: "", batchId: "", direction: "REMOVE", quantity: 1, reason: "COUNT_CORRECTION", note: "" });
      setMedicineName("");
    },
    onError: (e: unknown) => {
      if (e instanceof ApiException && e.error.code === "INSUFFICIENT_STOCK") {
        form.setError("quantity", { message: e.error.message });
        return;
      }
      toast("error", e instanceof Error ? e.message : "تعذر تنفيذ التسوية");
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader title="تسوية مخزون — تصحيح جرد / تلف / إعدام" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => adjust.mutate(v))} className="space-y-4 p-4">
            {/* Medicine picker */}
            <FormField control={form.control} name="medicineId" render={() => (
              <FormItem>
                <FormLabel>الصنف</FormLabel>
                <Popover open={medOpen} onOpenChange={setMedOpen}>
                  <PopoverTrigger className="flex h-10 w-full items-center justify-between rounded-el border border-line bg-card px-3 text-sm transition-colors hover:border-primary">
                    <span className={medicineName ? "font-medium" : "text-ink-faint"}>{medicineName || "ابحث واختر الصنف…"}</span>
                    <ChevronDown className="size-4 text-ink-faint" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput autoFocus value={medTerm} onValueChange={setMedTerm} placeholder="اسم الدواء أو الكود…" />
                      <CommandList className="max-h-56">
                        {medTerm.length < 2 ? (
                          <p className="py-6 text-center text-xs text-ink-faint">اكتب حرفين على الأقل</p>
                        ) : (
                          <>
                            {!meds.isFetching && <CommandEmpty className="py-6 text-center text-xs text-ink-faint">لا نتائج</CommandEmpty>}
                            {(meds.data ?? []).map((m) => (
                              <CommandItem key={m.id} value={m.id} onSelect={() => {
                                form.setValue("medicineId", m.id, { shouldValidate: true });
                                form.setValue("batchId", "");
                                setMedicineName(m.tradeNameAr);
                                setMedOpen(false);
                                setMedTerm("");
                              }}>
                                <span className="font-medium">{m.tradeNameAr}</span>
                                <span className="num text-xs text-ink-faint">{m.stock?.onHand ?? 0} متاح</span>
                              </CommandItem>
                            ))}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />

            {/* Batch picker */}
            <FormField control={form.control} name="batchId" render={({ field }) => (
              <FormItem>
                <FormLabel>التشغيلة</FormLabel>
                {!medicineId ? (
                  <p className="rounded-el border border-dashed border-line px-3 py-3 text-center text-xs text-ink-faint">اختر الصنف أولاً</p>
                ) : !batches.data?.length ? (
                  <p className="rounded-el border border-dashed border-line px-3 py-3 text-center text-xs text-ink-faint">لا توجد تشغيلات</p>
                ) : (
                  <div className="space-y-1.5">
                    {batches.data.map((b) => (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => field.onChange(b.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-el border px-3 py-2 text-xs transition-colors",
                          field.value === b.id ? "border-primary bg-primary-soft" : "border-line hover:bg-paper",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{b.batchNumber}</span>
                          {b.status === "EXPIRED" && <Badge tone="red">منتهية</Badge>}
                          {b.status === "QUARANTINED" && <Badge tone="amber">حجر</Badge>}
                        </span>
                        <span className="flex items-center gap-3 text-ink-soft">
                          <span className="num">{new Date(b.expiryDate).toLocaleDateString("ar-EG")}</span>
                          <b className="num text-ink">{b.quantity}</b>
                          <span className="num">{formatMoney(b.unitCost)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="direction" render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الحركة</FormLabel>
                  <div className="flex rounded-el border border-line p-0.5 text-xs font-bold">
                    {([["REMOVE", "خصم (−)"], ["ADD", "إضافة (+)"]] as const).map(([v, label]) => (
                      <button type="button" key={v} onClick={() => field.onChange(v)}
                        className={field.value === v ? "flex-1 rounded-[6px] bg-primary px-2 py-2 text-white" : "flex-1 rounded-[6px] px-2 py-2 text-ink-soft hover:bg-paper"}>
                        {label}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )} />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>الكمية</FormLabel>
                  <FormControl><Input type="number" min={1} dir="ltr" className="num text-end" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>السبب (إلزامي — يُسجَّل في التدقيق)</FormLabel>
                <FormControl>
                  <select {...field} className="h-10 w-full rounded-el border border-line bg-card px-3 text-sm focus:border-primary focus-visible:outline-none">
                    {ADJUSTMENT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظة (اختياري)</FormLabel>
                <FormControl><Input placeholder="مثال: كسر أثناء الترتيب" {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />

            <p className="rounded-el bg-info-soft px-3 py-2 text-xs text-info">
              {direction === "REMOVE"
                ? "سيُرحَّل قيد: مدين «إعدام مخزون» / دائن «المخزون» بقيمة التكلفة."
                : "سيُرحَّل قيد: مدين «المخزون» / دائن «عجز/زيادة» بقيمة التكلفة."}
            </p>

            <Button type="submit" size="lg" className="w-full" loading={adjust.isPending}>ترحيل التسوية</Button>
          </form>
        </Form>
      </Card>

      {result && (
        <p className="rounded-card border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-ink">
          تمت التسوية — الكمية الجديدة <b className="num">{result.newQuantity}</b> · قيد محاسبي <span className="font-mono text-xs">{result.journalEntryId.slice(0, 8)}</span>
        </p>
      )}
    </div>
  );
}
