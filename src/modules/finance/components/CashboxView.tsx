"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cashSummary, cashEntries, createCashEntry, reverseCashEntry, cashCategories, type CashEntryType } from "../api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { hasRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { Banknote, Landmark, MinusCircle, PlusCircle, Undo2 } from "lucide-react";

const TYPE_META: Record<string, { label: string; tone: "red" | "green" | "blue" | "gray"; sign: "-" | "+" }> = {
  EXPENSE: { label: "مصروف", tone: "red", sign: "-" },
  INCOME: { label: "إيراد", tone: "green", sign: "+" },
  DEPOSIT: { label: "إيداع بنكي", tone: "blue", sign: "-" },
  WITHDRAW: { label: "سحب من البنك", tone: "blue", sign: "+" },
};

/** الخزينة (WF-8): «أين نقديتي ولماذا تغيّرت» — أرصدة من الدفتر، وكل حركة بقيد، والعكس بقيد مرتبط. */
export function CashboxView() {
  const toast = useToast();
  const qc = useQueryClient();
  const isPharmacist = hasRole(["PHARMACIST"]);
  const [dialog, setDialog] = useState<CashEntryType | null>(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);

  const summary = useQuery({ queryKey: ["cash.summary"], queryFn: ({ signal }) => cashSummary(signal), select: (r) => r.data });
  const cats = useQuery({ queryKey: ["cash.cats"], queryFn: ({ signal }) => cashCategories(signal), select: (r) => r.data });
  const entries = useQuery({
    queryKey: ["cash.entries", typeFilter, page],
    queryFn: ({ signal }) => cashEntries({ type: typeFilter || undefined, skip: page * 50 }, signal),
    select: (r) => r.data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["cash.summary"] });
    qc.invalidateQueries({ queryKey: ["cash.entries"] });
    qc.invalidateQueries({ queryKey: ["shift"] }); // الدرج يتأثر بحركات الخزينة
  };

  const create = useMutation({
    mutationFn: () => createCashEntry({ type: dialog!, amount, memo, categoryId: categoryId || undefined }),
    onSuccess: () => {
      toast("success", "سُجِّلت الحركة وقُيِّدت دفتريًا");
      setDialog(null); setAmount(""); setMemo(""); setCategoryId("");
      refresh();
    },
    onError: (e: Error) => toast("error", e.message),
  });
  const reverse = useMutation({
    mutationFn: (id: string) => reverseCashEntry(id),
    onSuccess: () => { toast("success", "عُكست الحركة بقيد مرتبط"); refresh(); },
    onError: (e: Error) => toast("error", e.message),
  });

  const visibleCats = (cats.data ?? []).filter((c) => (dialog === "EXPENSE" ? c.kind === "EXPENSE" : c.kind === "INCOME"));

  return (
    <div className="space-y-4">
      {/* الأرصدة — من دفتر الأستاذ لحظيًا */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-el bg-primary-soft text-primary-ink"><Banknote className="size-5" /></span>
          <span><p className="text-xs text-ink-faint">رصيد الخزينة</p><p className="num text-lg font-extrabold">{summary.data ? formatMoney(summary.data.cash) : "…"}</p></span>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-el bg-info-soft text-info"><Landmark className="size-5" /></span>
          <span><p className="text-xs text-ink-faint">رصيد البنك</p><p className="num text-lg font-extrabold">{summary.data ? formatMoney(summary.data.bank) : "…"}</p></span>
        </Card>
        <Card className="col-span-2 flex items-center justify-between p-4 lg:col-span-1">
          <span><p className="text-xs text-ink-faint">مصروفات اليوم</p><p className="num text-lg font-extrabold text-danger">{summary.data ? formatMoney(summary.data.todayExpenses) : "…"}</p></span>
        </Card>
      </div>

      {/* الإجراءات */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialog("EXPENSE")} variant="destructive"><MinusCircle className="size-4" /> مصروف</Button>
        {isPharmacist && (
          <>
            <Button onClick={() => setDialog("INCOME")}><PlusCircle className="size-4" /> إيراد</Button>
            <Button variant="secondary" onClick={() => setDialog("DEPOSIT")}>إيداع بنكي</Button>
            <Button variant="secondary" onClick={() => setDialog("WITHDRAW")}>سحب من البنك</Button>
          </>
        )}
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className="ms-auto h-10 rounded-el border border-line bg-card px-3 text-sm">
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* السجل */}
      <Card>
        {!entries.data?.rows.length ? (
          <EmptyState title="لا حركات" hint="سجّل أول مصروف أو إيراد — سيُقيَّد دفتريًا تلقائيًا" />
        ) : (
          <>
            <Table>
              <THead><Th>التاريخ</Th><Th>النوع</Th><Th>البيان</Th><Th>الفئة</Th><Th>المبلغ</Th><Th>بواسطة</Th><Th></Th></THead>
              <tbody>
                {entries.data.rows.map((e) => {
                  const meta = TYPE_META[e.type];
                  return (
                    <Tr key={e.id} className={cn(e.reversedById && "opacity-50")}>
                      <Td className="num text-xs">{new Date(e.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</Td>
                      <Td><Badge tone={meta.tone}>{meta.label}</Badge>{e.reversesId && <Badge tone="gray">عكس</Badge>}{!e.shiftId && !e.reversesId && <span className="ms-1 text-[10px] text-ink-faint">خارج وردية</span>}</Td>
                      <Td className="max-w-[220px] truncate text-xs">{e.memo}</Td>
                      <Td className="text-xs text-ink-soft">{e.category?.name ?? "—"}</Td>
                      <Td className={cn("num font-bold", meta.sign === "-" ? "text-danger" : "text-primary-ink")}>{meta.sign}{formatMoney(e.amount)}</Td>
                      <Td className="text-xs text-ink-soft">{e.createdBy.name}</Td>
                      <Td>
                        {isPharmacist && !e.reversedById && !e.reversesId && (
                          <Button size="sm" variant="ghost" title="عكس الحركة" onClick={() => reverse.mutate(e.id)}>
                            <Undo2 className="size-3.5" />
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <div className="flex items-center justify-between border-t border-line p-3 text-xs text-ink-faint">
              <span className="num">{entries.data.total} حركة</span>
              <span className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>السابق</Button>
                <Button size="sm" variant="ghost" disabled={(page + 1) * 50 >= entries.data.total} onClick={() => setPage((p) => p + 1)}>التالي</Button>
              </span>
            </div>
          </>
        )}
      </Card>

      {/* نموذج الحركة */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog ? TYPE_META[dialog].label : ""} جديد</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <Input label="المبلغ (ج.م)" inputMode="decimal" dir="ltr" className="num text-end" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            {dialog === "EXPENSE" && (
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-soft">الفئة</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-10 w-full rounded-el border border-line bg-card px-3 text-sm">
                  <option value="">— اختر —</option>
                  {visibleCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <Input label="البيان" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="مثال: فاتورة كهرباء مايو" />
            <p className="rounded-el bg-paper px-3 py-2 text-[11px] text-ink-faint">
              ستُقيَّد الحركة فورًا في دفتر الأستاذ، والتصحيح لاحقًا يكون بقيد عكسي — لا حذف.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>إلغاء</Button>
            <Button loading={create.isPending} disabled={!amount || Number(amount) <= 0 || memo.trim().length < 3 || (dialog === "EXPENSE" && !categoryId)}
              onClick={() => create.mutate()}>تسجيل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
