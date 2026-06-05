"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomer, getStatement, recordPayment } from "../api";
import { CustomerForm } from "./CustomerForm";
import { InvoicesView } from "@/modules/sales";
import { Card, CardHeader } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { HandCoins, Printer, Pencil } from "lucide-react";

/**
 * Customer 360: Credit Balance KPIs (ledger projections) · Ledger View (كشف حساب —
 * pure fold over AR journal lines, BR-2.3) · Purchase History (invoices via Sales facade) · edit.
 */
export function CustomerDetail({ customerId }: { customerId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"ledger" | "purchases">("ledger");
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const customer = useQuery({ queryKey: ["customer", customerId], queryFn: () => getCustomer(customerId), select: (r) => r.data });
  const statement = useQuery({
    queryKey: ["statement", customerId],
    queryFn: () => getStatement(customerId),
    enabled: tab === "ledger",
    select: (r) => r.data,
  });

  const pay = useMutation({
    mutationFn: () => recordPayment({ customerId, amount: Number(amount).toFixed(4), method: "CASH", allocateTo: "OLDEST" }),
    onSuccess: ({ data }) => {
      toast("success", `تم تسجيل الدفعة — الرصيد الجديد ${formatMoney(data.customerBalanceAfter)}`);
      setPayOpen(false); setAmount("");
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      qc.invalidateQueries({ queryKey: ["statement", customerId] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  if (!customer.data) return <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>;
  const c = customer.data;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            {c.name}
            <button onClick={() => setEditOpen(true)} aria-label="تعديل" className="rounded p-1.5 text-ink-faint transition-colors hover:bg-paper hover:text-ink">
              <Pencil className="size-4" />
            </button>
          </h2>
          <p className="num text-sm text-ink-faint" dir="ltr">{c.phone}</p>
          {c.allergies.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1">{c.allergies.map((a) => <Badge key={a} tone="red">حساسية: {a}</Badge>)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" /> طباعة كشف الحساب</Button>
          <Button onClick={() => setPayOpen(true)}><HandCoins className="size-4" /> تسجيل دفعة</Button>
        </div>
      </div>

      {/* Credit Balance — projections derived from the AR subledger */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="المديونية الحالية" value={formatMoney(c.balance)} tone={Number(c.balance) > 0 ? "warn" : "good"} sub="مشتقة من دفتر الأستاذ" />
        <KpiCard label="إجمالي المشتريات" value={formatMoney(c.totalPurchases)} />
        <KpiCard label="إجمالي المسدَّد" value={formatMoney(c.totalPaid)} tone="good" />
        <KpiCard label="حد الائتمان" value={formatMoney(c.creditLimit)} />
      </div>

      <div className="flex rounded-el border border-line bg-card p-0.5 w-fit">
        {([["ledger", "كشف الحساب"], ["purchases", "سجل المشتريات"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn("rounded-[6px] px-4 py-2 text-sm font-bold transition-colors",
              tab === k ? "bg-primary text-white" : "text-ink-soft hover:bg-paper")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ledger" ? (
        <Card>
          <CardHeader title="كشف الحساب — من واقع القيود" />
          {!statement.data ? (
            <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
          ) : statement.data.rows.length === 0 ? (
            <EmptyState title="لا توجد حركات" hint="ستظهر هنا المبيعات الآجلة والدفعات" />
          ) : (
            <>
              <p className="flex justify-between border-b border-line px-4 py-2 text-xs font-semibold text-ink-faint">
                <span>رصيد أول المدة</span><span className="num">{formatMoney(statement.data.openingBalance)}</span>
              </p>
              <Table>
                <THead><Th>التاريخ</Th><Th>البيان</Th><Th>مدين (مشتريات)</Th><Th>دائن (سداد)</Th><Th>الرصيد</Th></THead>
                <tbody>
                  {statement.data.rows.map((r, i) => (
                    <Tr key={`${r.journalEntryId}-${i}`}>
                      <Td className="num text-ink-soft">{new Date(r.date).toLocaleDateString("ar-EG")}</Td>
                      <Td>{r.description}</Td>
                      <Td className="num font-bold text-warn">{r.debit ? `+${formatMoney(r.debit)}` : ""}</Td>
                      <Td className="num font-bold text-primary-ink">{r.credit ? `-${formatMoney(r.credit)}` : ""}</Td>
                      <Td className={cn("num font-extrabold", Number(r.runningBalance) > 0 ? "text-ink" : "text-primary-ink")}>{formatMoney(r.runningBalance)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <p className="flex justify-between border-t border-line px-4 py-2 text-sm font-extrabold">
                <span>الرصيد الختامي</span><span className="num">{formatMoney(statement.data.closingBalance)}</span>
              </p>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="سجل المشتريات" />
          <InvoicesView customerId={customerId} compact />
        </Card>
      )}

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل دفعة — {c.name}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <Input label="المبلغ (ج.م)" inputMode="decimal" dir="ltr" className="num text-end" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            <p className="rounded-el bg-info-soft px-3 py-2 text-xs text-info">
              ستُخصم الدفعة من أقدم مديونية أولاً، وتُسجَّل كقيد مزدوج غير قابل للتعديل.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>إلغاء</Button>
            <Button loading={pay.isPending} disabled={!amount || Number(amount) <= 0} onClick={() => pay.mutate()}>تأكيد الدفعة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerForm
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={c}
        onSaved={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ["customer", customerId] }); }}
      />
    </div>
  );
}
