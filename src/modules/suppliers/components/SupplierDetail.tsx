"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/http";
import { supplierStatement, paySupplier, JournalEntryDialog } from "@/modules/finance";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatMoney, type Money } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { ArrowRight, HandCoins, Phone } from "lucide-react";

interface Supplier { id: string; name: string; phone: string | null; balanceCached: Money }

/** كائن المورد: ترويسة + كشف حساب دائن-طبيعي (استلام بضاعة يزيده، السداد ينقصه) + سداد فوري. */
export function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [drill, setDrill] = useState<string | null>(null);

  const supplier = useQuery({
    queryKey: ["supplier", id],
    queryFn: async ({ signal }) => (await api<Supplier[]>("/suppliers", { signal })).data.find((s) => s.id === id) ?? null,
  });
  const statement = useQuery({
    queryKey: ["supplier.statement", id],
    queryFn: ({ signal }) => supplierStatement(id, signal),
    select: (r) => r.data,
  });

  const pay = useMutation({
    mutationFn: () => paySupplier({ supplierId: id, amount }),
    onSuccess: () => {
      toast("success", "سُدِّدت الدفعة وقُيِّدت دفتريًا");
      setPayOpen(false); setAmount("");
      qc.invalidateQueries({ queryKey: ["supplier.statement", id] });
      qc.invalidateQueries({ queryKey: ["supplier", id] });
      qc.invalidateQueries({ queryKey: ["cash.summary"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const s = supplier.data;
  const balance = Number(s?.balanceCached ?? 0);

  return (
    <div className="space-y-4">
      {/* الترويسة */}
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <Button size="sm" variant="ghost" onClick={() => router.push("/suppliers")}><ArrowRight className="size-4" /> الموردون</Button>
        <span className="min-w-0">
          <h1 className="truncate text-lg font-extrabold">{s?.name ?? "…"}</h1>
          {s?.phone && <a href={`tel:${s.phone}`} className="num flex items-center gap-1 text-xs text-info" dir="ltr"><Phone className="size-3" />{s.phone}</a>}
        </span>
        <span className="ms-auto text-end">
          <p className="text-xs text-ink-faint">المستحق له</p>
          <p className={cn("num text-xl font-extrabold", balance > 0 ? "text-warn" : "text-primary-ink")}>{formatMoney(s?.balanceCached ?? "0")}</p>
        </span>
        <Button disabled={balance <= 0} onClick={() => setPayOpen(true)}><HandCoins className="size-4" /> سداد دفعة</Button>
      </Card>

      {/* الكشف */}
      <Card>
        <CardHeader title="كشف الحساب" />
        {statement.isLoading ? (
          <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        ) : !statement.data?.rows.length ? (
          <EmptyState title="لا حركات بعد" hint="أول استلام بضاعة سيظهر هنا" />
        ) : (
          <Table>
            <THead><Th>التاريخ</Th><Th>البيان</Th><Th>استلام بضاعة</Th><Th>سداد</Th><Th>الرصيد</Th></THead>
            <tbody>
              {statement.data.rows.map((r, i) => (
                <Tr key={`${r.journalEntryId}-${i}`} className="cursor-pointer hover:bg-paper" onClick={() => setDrill(r.journalEntryId)}>
                  <Td className="num text-xs text-ink-soft">{new Date(r.date).toLocaleDateString("ar-EG")}</Td>
                  <Td className="text-xs">{r.description}</Td>
                  <Td className="num font-bold text-warn">{r.credit ? `+${formatMoney(r.credit)}` : ""}</Td>
                  <Td className="num font-bold text-primary-ink">{r.debit ? `-${formatMoney(r.debit)}` : ""}</Td>
                  <Td className="num font-extrabold">{formatMoney(r.runningBalance)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* سداد */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>سداد للمورد {s?.name}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-ink-soft">المستحق حاليًا: <b className="num">{formatMoney(s?.balanceCached ?? "0")}</b> ج.م</p>
            <Input label="مبلغ الدفعة" inputMode="decimal" dir="ltr" className="num text-end" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            <p className="rounded-el bg-paper px-3 py-2 text-[11px] text-ink-faint">سيُقيَّد: مدين دائنو الموردين / دائن النقدية — ويظهر فورًا في الكشف وحركة النقدية.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>إلغاء</Button>
            <Button loading={pay.isPending} disabled={!amount || Number(amount) <= 0} onClick={() => pay.mutate()}>تأكيد السداد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <JournalEntryDialog entryId={drill} onClose={() => setDrill(null)} />
    </div>
  );
}
