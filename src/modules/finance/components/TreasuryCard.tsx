"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, qs } from "@/lib/api/http";
import { uuidv7 } from "@/lib/utils/uuid";
import type { Money } from "@/lib/utils/money";
import { formatMoney } from "@/lib/utils/money";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { Vault, Plus, Minus } from "lucide-react";

interface CashRow { id: string; date: string; memo: string; sourceType: string; debit: Money; credit: Money }
interface CashStatement { balance: Money; rows: CashRow[] }

const SOURCE_AR: Record<string, string> = {
  SALE: "بيع", SALE_RETURN: "مرتجع", PAYMENT: "تحصيل", TREASURY: "خزينة",
  SHIFT_CLOSE: "إقفال وردية", GRN: "استلام شحنة", ADJUSTMENT: "تسوية", REVERSAL: "قيد عكسي",
};

/** الخزينة: رصيد النقدية = فولد حساب 1000 (لا عدّاد موازٍ) + مصروف/إيراد يدوي بقيد متوازن. */
export function TreasuryCard() {
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState<null | "EXPENSE" | "INCOME">(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const { data } = useQuery({
    queryKey: ["treasury"],
    queryFn: async ({ signal }) => (await api<CashStatement>(`/finance/treasury${qs({})}`, { signal })).data,
  });

  const submit = useMutation({
    mutationFn: () =>
      api(`/finance/treasury/entries`, {
        method: "POST", idempotencyKey: uuidv7(),
        body: { type: open, amount, description, category: category || undefined },
      }),
    onSuccess: () => {
      toast("success", open === "EXPENSE" ? "تم تسجيل المصروف وخصمه من الخزينة" : "تم تسجيل الإيراد وإضافته للخزينة");
      setOpen(null); setAmount(""); setDescription(""); setCategory("");
      qc.invalidateQueries({ queryKey: ["treasury"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  return (
    <Card>
      <CardHeader
        title="الخزينة"
        action={
          <span className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setOpen("INCOME")}><Plus className="size-3.5" /> إيراد</Button>
            <Button size="sm" variant="destructive" onClick={() => setOpen("EXPENSE")}><Minus className="size-3.5" /> مصروف</Button>
          </span>
        }
      />
      <div className="flex items-center gap-3 border-b border-line bg-primary-soft/40 p-4">
        <span className="grid size-11 place-items-center rounded-el bg-primary text-white"><Vault className="size-5" /></span>
        <div>
          <p className="text-xs text-ink-soft">رصيد النقدية الآن (من واقع دفتر الأستاذ)</p>
          <p className="num text-2xl font-extrabold">{data ? formatMoney(data.balance) : "…"} <span className="text-sm font-bold">ج.م</span></p>
        </div>
      </div>

      {!data?.rows.length ? (
        <EmptyState title="لا حركات نقدية في آخر ١٤ يومًا" />
      ) : (
        <Table>
          <THead><Th>التاريخ</Th><Th>البيان</Th><Th>المصدر</Th><Th>داخل</Th><Th>خارج</Th></THead>
          <tbody>
            {data.rows.map((r) => (
              <Tr key={`${r.id}-${r.debit}-${r.credit}`}>
                <Td className="num text-xs">{new Date(r.date).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</Td>
                <Td className="max-w-[260px] truncate text-xs">{r.memo}</Td>
                <Td className="text-xs text-ink-faint">{SOURCE_AR[r.sourceType] ?? r.sourceType}</Td>
                <Td className={cn("num", Number(r.debit) > 0 && "font-bold text-primary-ink")}>{Number(r.debit) > 0 ? formatMoney(r.debit) : "—"}</Td>
                <Td className={cn("num", Number(r.credit) > 0 && "font-bold text-danger")}>{Number(r.credit) > 0 ? formatMoney(r.credit) : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "EXPENSE" ? "تسجيل مصروف" : "تسجيل إيراد آخر"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <Input label="المبلغ (ج.م)" type="number" min="0.01" step="0.01" dir="ltr" className="num text-end" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input label="البيان" placeholder={open === "EXPENSE" ? "مثال: فاتورة كهرباء يونيو" : "مثال: بيع كرتونة فارغة"} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input label="التصنيف (اختياري)" placeholder="كهرباء / إيجار / رواتب / نثرية…" value={category} onChange={(e) => setCategory(e.target.value)} />
            <p className="rounded-el bg-paper px-3 py-2 text-[11px] text-ink-faint">
              يُرحَّل قيدًا مزدوجًا متوازنًا فورًا ويُسجَّل في التدقيق باسمك — التصحيح لاحقًا بقيد عكسي وليس بالحذف.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>إلغاء</Button>
            <Button loading={submit.isPending} disabled={!amount || Number(amount) <= 0 || description.trim().length < 3} onClick={() => submit.mutate()}>
              ترحيل القيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
