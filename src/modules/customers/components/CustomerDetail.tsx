"use client";
import { hasRole } from "@/lib/auth/session";
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
import { HandCoins, Printer, Pencil, KeyRound, Smartphone, Download } from "lucide-react";
import { downloadCsv } from "@/modules/reporting";
import { JournalEntryDialog } from "@/modules/finance";
import { Statement } from "@/components/print/Statement";
import { printArea } from "@/lib/utils/print";
import { updateCustomer } from "../api";
import { Input as TextInput } from "@/components/ui/input";

/**
 * Customer 360: Credit Balance KPIs (ledger projections) · Ledger View (كشف حساب —
 * pure fold over AR journal lines, BR-2.3) · Purchase History (invoices via Sales facade) · edit.
 */
export function CustomerDetail({ customerId }: { customerId: string }) {
  const toast = useToast();
  const canDrill = hasRole(["PHARMACIST"]);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"ledger" | "purchases">("ledger");
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [drillEntry, setDrillEntry] = useState<string | null>(null);
  const [newPortalPw, setNewPortalPw] = useState("");
  const [portalResetOpen, setPortalResetOpen] = useState(false);
  const [portalPw, setPortalPw] = useState("");
  const portalUpdate = useMutation({
    mutationFn: (body: { portalApproved?: boolean; portalPassword?: string }) => updateCustomer(customerId, body as never),
    onSuccess: () => {
      toast("success", "تم تحديث دخول الستور");
      setPortalResetOpen(false); setPortalPw("");
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
    },
    onError: (e: Error) => toast("error", e.message),
  });
  const [amount, setAmount] = useState("");
  const [stFrom, setStFrom] = useState("");
  const [stTo, setStTo] = useState("");

  const customer = useQuery({ queryKey: ["customer", customerId], queryFn: () => getCustomer(customerId), select: (r) => r.data });
  const statement = useQuery({
    queryKey: ["statement", customerId, stFrom, stTo],
    queryFn: () => getStatement(customerId, stFrom || stTo ? { from: stFrom || undefined, to: stTo || undefined } : undefined),
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
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            {c.name}
            <button onClick={() => setEditOpen(true)} aria-label="تعديل" className="rounded p-1.5 text-ink-faint transition-colors hover:bg-paper hover:text-ink">
              <Pencil className="size-4" />
            </button>
          </h2>
          <p className="num text-sm text-ink-faint" dir="ltr">{c.phone}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Smartphone className="size-3.5 text-ink-faint" />
            {(c as { portalStatus?: string }).portalStatus === "ACTIVE" ? (
              <Badge tone="green">الستور: مفعّل</Badge>
            ) : (c as { portalStatus?: string }).portalStatus === "PENDING" ? (
              <>
                <Badge tone="amber">الستور: بانتظار التفعيل</Badge>
                <Button size="sm" variant="secondary" loading={portalUpdate.isPending}
                  onClick={() => portalUpdate.mutate({ portalApproved: true })}>تفعيل الدخول</Button>
              </>
            ) : (
              <Badge tone="gray">الستور: غير مسجل</Badge>
            )}
            {(c as { portalStatus?: string }).portalStatus && (
              <Button size="sm" variant="ghost" onClick={() => setPortalResetOpen(true)}>
                <KeyRound className="size-3.5" /> إعادة تعيين كلمة المرور
              </Button>
            )}
          </p>
          {c.allergies.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1">{c.allergies.map((a) => <Badge key={a} tone="red">حساسية: {a}</Badge>)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPortalOpen(true)}><Smartphone className="size-4" /> بوابة العميل</Button>
          <Button variant="secondary" onClick={() => printArea("statement")}><Printer className="size-4" /> طباعة كشف الحساب</Button>
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
          <div className="flex flex-wrap items-end gap-2 border-b border-line p-3 print:hidden">
            <Input label="من" type="date" dir="ltr" value={stFrom} onChange={(e) => setStFrom(e.target.value)} className="h-9 w-36" />
            <Input label="إلى" type="date" dir="ltr" value={stTo} onChange={(e) => setStTo(e.target.value)} className="h-9 w-36" />
            {(stFrom || stTo) && (
              <Button size="sm" variant="ghost" onClick={() => { setStFrom(""); setStTo(""); }}>كل المدة</Button>
            )}
            <Button size="sm" variant="ghost" className="ms-auto" disabled={!statement.data?.rows?.length}
              onClick={() => statement.data && downloadCsv(
                `statement-${customerId.slice(0, 8)}-${stFrom || "all"}-${stTo || "now"}.csv`,
                ["التاريخ", "البيان", "مدين", "دائن", "الرصيد"],
                statement.data.rows.map((r) => [
                  new Date(r.date).toLocaleDateString("ar-EG"), r.description, r.debit ?? "", r.credit ?? "", r.runningBalance,
                ]))}>
              <Download className="size-3.5" /> CSV
            </Button>
          </div>
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
                    <Tr key={`${r.journalEntryId}-${i}`} className={cn(canDrill && "cursor-pointer hover:bg-paper")} onClick={() => canDrill && setDrillEntry(r.journalEntryId)}>
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
        
      <JournalEntryDialog entryId={drillEntry} onClose={() => setDrillEntry(null)} />
      {statement.data && c && (
        <Statement data={{
          customerName: c.name,
          customerPhone: c.phone,
          from: stFrom || undefined,
          to: stTo || undefined,
          openingBalance: statement.data.openingBalance ?? "0",
          closingBalance: statement.data.closingBalance ?? "0",
          rows: statement.data.rows ?? [],
        }} />
      )}
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

      <Dialog open={portalResetOpen} onOpenChange={setPortalResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إعادة تعيين كلمة مرور الستور — {c.name}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <TextInput label="كلمة المرور الجديدة (8+ أحرف)" type="password" value={portalPw} onChange={(e) => setPortalPw(e.target.value)} autoFocus />
            <p className="text-[11px] text-ink-faint">العميل الناسي يطلبها منك على الكاونتر — الإجراء يُسجَّل في التدقيق دون حفظ الكلمة.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPortalResetOpen(false)}>إلغاء</Button>
            <Button loading={portalUpdate.isPending} disabled={portalPw.length < 8}
              onClick={() => portalUpdate.mutate({ portalPassword: portalPw, portalApproved: true })}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* إدارة دخول الستور: تفعيل الحسابات المعلقة + إعادة تعيين كلمة المرور للعميل الناسي */}
      <Dialog open={portalOpen} onOpenChange={setPortalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>بوابة العميل — {c.name}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm">
              حالة الدخول:{" "}
              {c.portalStatus === "ACTIVE" ? <Badge tone="green">نشط</Badge>
                : c.portalStatus === "PENDING" ? <Badge tone="amber">بانتظار التفعيل</Badge>
                : <Badge tone="gray">لم يسجل بعد</Badge>}
            </p>
            {c.portalStatus === "PENDING" && (
              <Button className="w-full" onClick={async () => {
                await updateCustomer(c.id, { portalApproved: true });
                toast("success", "تم تفعيل دخول العميل للستور");
                qc.invalidateQueries({ queryKey: ["customer", customerId] });
              }}>تأكيد هوية العميل وتفعيل الدخول</Button>
            )}
            <div className="space-y-2 rounded-el border border-line p-3">
              <p className="text-xs font-bold text-ink-soft">إعادة تعيين كلمة مرور الستور (للعميل الناسي)</p>
              <Input type="password" placeholder="كلمة مرور جديدة (8+ أحرف)" value={newPortalPw} onChange={(e) => setNewPortalPw(e.target.value)} />
              <Button variant="secondary" className="w-full" disabled={newPortalPw.length < 8} onClick={async () => {
                await updateCustomer(c.id, { portalPassword: newPortalPw });
                setNewPortalPw("");
                toast("success", "تم تعيين كلمة المرور — أبلغ العميل بها شفهيًا");
              }}>تعيين</Button>
            </div>
            <p className="text-[11px] text-ink-faint">كل إجراء هنا يُسجَّل في سجل التدقيق باسمك.</p>
          </DialogBody>
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
