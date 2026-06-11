"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentShift, openShift, closeShift, listShifts } from "../api";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { ApiException } from "@/lib/api/http";
import { hasRole } from "@/lib/auth/session";
import { Clock, Lock, Banknote } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * الوردية ودرج الكاشير (WF-5): فتح برصيد افتتاحي ⟶ متوقع لحظي من الحقائق
 * (نقدي مبيعات + تحصيلات − مرتجعات) ⟶ إقفال بجرد فعلي؛ الفرق قيد فوري على 5900.
 */
export function ShiftView() {
  const toast = useToast();
  const qc = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const canHistory = hasRole(["PHARMACIST"]);

  const cur = useQuery({
    queryKey: ["shift.current"],
    queryFn: ({ signal }) => currentShift(signal),
    select: (r) => r.data,
    refetchInterval: 30_000,
  });
  const history = useQuery({
    queryKey: ["shifts"],
    queryFn: ({ signal }) => listShifts(signal),
    select: (r) => r.data,
    enabled: canHistory,
  });

  const doOpen = useMutation({
    mutationFn: () => openShift(openingFloat),
    onSuccess: () => {
      toast("success", "فُتحت الوردية — بيع موفق");
      setOpenDialog(false); setOpeningFloat("");
      qc.invalidateQueries({ queryKey: ["shift.current"] });
    },
    onError: (e: unknown) => toast("error", e instanceof ApiException ? e.error.message : "تعذر فتح الوردية"),
  });
  const doClose = useMutation({
    mutationFn: () => closeShift(cur.data!.shift!.id, countedCash),
    onSuccess: ({ data }) => {
      const os = Number(data.overShort ?? 0);
      toast(os === 0 ? "success" : "error",
        os === 0 ? "أُقفلت الوردية — الدرج مطابق تمامًا 👌"
          : os < 0 ? `أُقفلت الوردية — عجز ${formatMoney(String(-os))} (تقيّد تلقائيًا)`
          : `أُقفلت الوردية — زيادة ${formatMoney(String(os))} (تقيّدت تلقائيًا)`);
      setCloseDialog(false); setCountedCash("");
      qc.invalidateQueries({ queryKey: ["shift.current"] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (e: unknown) => toast("error", e instanceof ApiException ? e.error.message : "تعذر الإقفال"),
  });

  const s = cur.data;

  return (
    <div className="space-y-4">
      {/* الوردية الحالية */}
      <Card>
        <CardHeader title="ورديتي" />
        {cur.isLoading ? (
          <p className="p-6 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        ) : !s?.open ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-sm text-ink-soft">لا توجد وردية مفتوحة — افتح وردية قبل البيع لضبط الدرج.</p>
            <Button onClick={() => setOpenDialog(true)}><Clock className="size-4" /> فتح وردية</Button>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Stat label="فُتحت" value={new Date(s.shift!.openedAt).toLocaleTimeString("ar-EG", { timeStyle: "short" })} />
              <Stat label="رصيد افتتاحي" value={formatMoney(s.shift!.openingFloat)} />
              <Stat label="المتوقع بالدرج الآن" value={formatMoney(s.liveExpected ?? "0")} highlight />
            </div>
            <Button variant="destructive" className="w-full md:w-auto" onClick={() => setCloseDialog(true)}>
              <Lock className="size-4" /> إقفال الوردية وجرد الدرج
            </Button>
          </div>
        )}
      </Card>

      {/* السجل */}
      {canHistory && (
        <Card>
          <CardHeader title="سجل الورديات" />
          {!history.data?.length ? (
            <EmptyState title="لا ورديات بعد" />
          ) : (
            <Table>
              <THead><Th>الموظف</Th><Th>فُتحت</Th><Th>أُقفلت</Th><Th>افتتاحي</Th><Th>متوقع</Th><Th>معدود</Th><Th>الفرق</Th></THead>
              <tbody>
                {history.data.map((h) => {
                  const os = h.overShort === null ? null : Number(h.overShort);
                  return (
                    <Tr key={h.id}>
                      <Td className="font-bold">{h.user?.name ?? "—"}</Td>
                      <Td className="num text-xs">{new Date(h.openedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</Td>
                      <Td className="num text-xs">{h.closedAt ? new Date(h.closedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : <Badge tone="green">مفتوحة</Badge>}</Td>
                      <Td className="num">{formatMoney(h.openingFloat)}</Td>
                      <Td className="num">{h.expectedCash ? formatMoney(h.expectedCash) : "—"}</Td>
                      <Td className="num">{h.countedCash ? formatMoney(h.countedCash) : "—"}</Td>
                      <Td className={cn("num font-bold", os === null ? "" : os === 0 ? "text-primary-ink" : os < 0 ? "text-danger" : "text-warn")}>
                        {os === null ? "—" : os === 0 ? "مطابق" : os < 0 ? `عجز ${formatMoney(String(-os))}` : `زيادة ${formatMoney(String(os))}`}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* فتح */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>فتح وردية</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <Input label="الرصيد الافتتاحي بالدرج (فكّة)" type="number" min="0" step="0.25" dir="ltr" className="num text-end"
              value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="مثال: 200" autoFocus />
            <p className="text-[11px] text-ink-faint">عُدّ الفكّة فعليًا قبل الإدخال — الإقفال سيحاسب على هذا الرقم.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenDialog(false)}>إلغاء</Button>
            <Button loading={doOpen.isPending} disabled={openingFloat === "" || Number(openingFloat) < 0} onClick={() => doOpen.mutate()}>
              <Banknote className="size-4" /> فتح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إقفال */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader tone="danger"><DialogTitle>إقفال الوردية — جرد الدرج</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <p className="rounded-el bg-paper px-3 py-2 text-sm">
              المتوقع بالدرج: <b className="num">{formatMoney(s?.liveExpected ?? "0")}</b>
            </p>
            <Input label="النقدية المعدودة فعليًا" type="number" min="0" step="0.25" dir="ltr" className="num text-end"
              value={countedCash} onChange={(e) => setCountedCash(e.target.value)} autoFocus />
            <p className="text-[11px] text-ink-faint">أي فرق سيُرحَّل قيدًا تلقائيًا على حساب العجز/الزيادة (5900) ويُسجَّل باسمك.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCloseDialog(false)}>رجوع</Button>
            <Button variant="destructive" loading={doClose.isPending} disabled={countedCash === ""} onClick={() => doClose.mutate()}>
              إقفال نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-el p-3", highlight ? "bg-primary-soft" : "bg-paper")}>
      <p className="text-[11px] text-ink-soft">{label}</p>
      <p className={cn("num text-lg font-extrabold", highlight && "text-primary-ink")}>{value}</p>
    </div>
  );
}
