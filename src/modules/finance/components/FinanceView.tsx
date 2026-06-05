"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDailyReconciliation, closePeriod } from "../api";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { ApiException } from "@/lib/api/http";
import { Lock, ShieldCheck, ShieldAlert } from "lucide-react";

/** Finance governance (OWNER): daily reconciliation report + accounting period close. */
export function FinanceView() {
  const toast = useToast();
  const [confirmMonth, setConfirmMonth] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reconciliation"],
    queryFn: ({ signal }) => getDailyReconciliation(signal),
    select: (r) => r.data,
  });

  const close = useMutation({
    mutationFn: closePeriod,
    onSuccess: ({ data }) => { toast("success", `أُقفلت الفترة ${data.closed} — لا قيود جديدة فيها`); setConfirmMonth(null); },
    onError: (e: unknown) => {
      toast("error", e instanceof ApiException ? e.error.message : "تعذر إقفال الفترة");
    },
  });

  const prevMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="التسوية اليومية — ميزان المراجعة" action={<Button size="sm" variant="ghost" onClick={() => refetch()}>تحديث</Button>} />
        <div className="p-4">
          {isLoading || !data ? (
            <p className="py-6 text-center text-sm text-ink-faint">جارٍ الفحص…</p>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 rounded-card border p-4 ${data.trialBalanceOk ? "border-primary/30 bg-primary-soft" : "border-danger/30 bg-danger-soft"}`}>
                {data.trialBalanceOk ? <ShieldCheck className="size-6 text-primary-ink" /> : <ShieldAlert className="size-6 text-danger" />}
                <div>
                  <p className={`font-extrabold ${data.trialBalanceOk ? "text-primary-ink" : "text-danger"}`}>
                    {data.trialBalanceOk ? "دفتر الأستاذ متوازن" : "اختلال في ميزان المراجعة!"}
                  </p>
                  <p className="num text-sm">
                    Σ مدين − Σ دائن = <b>{formatMoney(data.trialBalanceDiff)}</b>
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-ink">انحراف أرصدة العملاء المؤقتة عن دفتر الأستاذ</p>
                {data.customerBalanceDrift.length === 0 ? (
                  <p className="rounded-el bg-paper px-3 py-2 text-sm text-ink-soft">لا انحراف — كل الأرصدة المؤقتة مطابقة للقيود <Badge tone="green">سليم</Badge></p>
                ) : (
                  <Table>
                    <THead><Th>العميل</Th><Th>الرصيد المؤقت</Th><Th>رصيد الدفتر (الحقيقة)</Th></THead>
                    <tbody>
                      {data.customerBalanceDrift.map((c) => (
                        <Tr key={c.id}>
                          <Td className="font-bold">{c.name}</Td>
                          <Td className="num text-danger">{formatMoney(c.cached)}</Td>
                          <Td className="num font-bold">{formatMoney(c.ledger)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="إقفال الفترات المحاسبية" />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-soft">
            إقفال شهر يمنع أي قيد جديد فيه نهائياً (على مستوى قاعدة البيانات). التصحيحات تُرحَّل في الشهر المفتوح بقيود عكسية.
          </p>
          <Button variant="destructive" onClick={() => setConfirmMonth(prevMonth)}>
            <Lock className="size-4" /> إقفال شهر {prevMonth}
          </Button>
        </div>
      </Card>

      <Dialog open={!!confirmMonth} onOpenChange={(o) => !o && setConfirmMonth(null)}>
        <DialogContent>
          <DialogHeader tone="danger"><DialogTitle>تأكيد إقفال {confirmMonth}</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-ink-soft">
              لا يمكن التراجع عن الإقفال. سيُرفض أي قيد بتاريخ داخل هذه الفترة برمز <span className="font-mono text-xs">PERIOD_CLOSED</span>.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmMonth(null)}>تراجع</Button>
            <Button variant="destructive" loading={close.isPending} onClick={() => confirmMonth && close.mutate(confirmMonth)}>إقفال نهائي</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
