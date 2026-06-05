"use client";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePosStore } from "../store";
import { zPaymentForm } from "../schemas";
import type { PaymentFormValues, InstallmentPlan, PaymentMethod } from "../types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/utils/money";
import { Banknote, CreditCard, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const methods: { key: Exclude<PaymentMethod, "SPLIT">; label: string; icon: React.ElementType; hot: string }[] = [
  { key: "CASH", label: "نقدي", icon: Banknote, hot: "F2" },
  { key: "CARD", label: "بطاقة", icon: CreditCard, hot: "F3" },
  { key: "CREDIT", label: "آجل", icon: NotebookPen, hot: "F4" },
];

/**
 * Payment Modal (Contract §5.1 payment object): method CASH/CARD/CREDIT,
 * optional installmentPlan for CREDIT, cash-received → change calculation (client-only).
 */
export function PaymentDialog({
  open, onOpenChange, total, busy, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: string;
  busy: boolean;
  onConfirm: (method: Exclude<PaymentMethod, "SPLIT">, installmentPlan?: InstallmentPlan) => void;
}) {
  const customer = usePosStore((s) => s.customer);
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(zPaymentForm),
    defaultValues: { method: "CASH", cashReceived: "", withInstallments: false, installmentCount: 3, intervalDays: 30 },
  });
  const method = form.watch("method");
  const withInstallments = form.watch("withInstallments");
  const cashReceived = form.watch("cashReceived");

  const change = useMemo(() => {
    const r = Number(cashReceived || 0) - Number(total);
    return r > 0 ? r.toFixed(2) : null;
  }, [cashReceived, total]);

  // Hotkeys while the dialog is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); form.setValue("method", "CASH"); }
      if (e.key === "F3") { e.preventDefault(); form.setValue("method", "CARD"); }
      if (e.key === "F4") { e.preventDefault(); form.setValue("method", "CREDIT"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, form]);

  function submit(values: PaymentFormValues) {
    const plan: InstallmentPlan | undefined =
      values.method === "CREDIT" && values.withInstallments
        ? { count: values.installmentCount!, intervalDays: values.intervalDays!, firstDueDate: values.firstDueDate! }
        : undefined;
    onConfirm(values.method, plan);
  }

  const creditWithoutCustomer = method === "CREDIT" && !customer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>الدفع — الإجمالي <span className="num">{formatMoney(total)}</span></DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)}>
            <DialogBody className="space-y-4">
              {/* Method */}
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {methods.map(({ key, label, icon: Icon, hot }) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => field.onChange(key)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-el border px-2 py-3 text-xs font-bold transition-colors",
                            field.value === key ? "border-primary bg-primary-soft text-primary-ink" : "border-line text-ink-soft hover:bg-paper",
                          )}
                        >
                          <Icon className="size-5" />
                          {label}
                          <kbd className="text-[10px] font-normal text-ink-faint">{hot}</kbd>
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              {/* CASH: received + change */}
              {method === "CASH" && (
                <FormField
                  control={form.control}
                  name="cashReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ المستلم (اختياري لحساب الباقي)</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" dir="ltr" className="num text-end" placeholder="0.00" autoFocus {...field} />
                      </FormControl>
                      {change && (
                        <p className="rounded-el bg-primary-soft px-3 py-2 text-sm font-bold text-primary-ink">
                          الباقي للعميل: <span className="num">{formatMoney(change)}</span>
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* CREDIT: customer requirement + installments */}
              {method === "CREDIT" && (
                <div className="space-y-3">
                  {creditWithoutCustomer ? (
                    <p className="rounded-el bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
                      البيع الآجل يتطلب اختيار عميل أولاً — أغلق النافذة واختر العميل من الملخص.
                    </p>
                  ) : (
                    <p className="rounded-el bg-info-soft px-3 py-2 text-xs font-medium text-info">
                      سيُضاف <b className="num">{formatMoney(total)}</b> إلى دفتر حساب «{customer!.name}» كقيد مزدوج غير قابل للتعديل.
                      الرصيد الحالي: <span className="num">{formatMoney(customer!.balance)}</span> / الحد: <span className="num">{formatMoney(customer!.creditLimit)}</span>.
                    </p>
                  )}

                  <FormField
                    control={form.control}
                    name="withInstallments"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 rounded-el border border-line px-3 py-2.5">
                        <FormLabel className="cursor-pointer">تقسيط المبلغ (جدول سداد)</FormLabel>
                        <FormControl>
                          <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="size-4 accent-[--c-primary]" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {withInstallments && (
                    <div className="grid grid-cols-3 gap-3">
                      <FormField control={form.control} name="installmentCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>عدد الأقساط</FormLabel>
                          <FormControl><Input type="number" min={2} max={24} dir="ltr" className="num text-end" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="intervalDays" render={({ field }) => (
                        <FormItem>
                          <FormLabel>كل (يوم)</FormLabel>
                          <FormControl><Input type="number" min={7} max={90} dir="ltr" className="num text-end" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="firstDueDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>أول استحقاق</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}
                </div>
              )}

              <Separator />
              <p className="text-[11px] text-ink-faint">
                يُرسل الطلب بمفتاح Idempotency فريد — إعادة المحاولة عند انقطاع الاتصال لا تكرر الفاتورة أبداً.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>رجوع</Button>
              <Button type="submit" size="lg" loading={busy} disabled={creditWithoutCustomer}>
                تأكيد الدفع — <span className="num">{formatMoney(total)}</span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
