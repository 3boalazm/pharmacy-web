"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createGrn, getSuppliers } from "../api";
import { createSupplier } from "@/modules/suppliers";
import type { GrnLineInput } from "../types";
import { searchMedicines } from "@/modules/catalog";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * GRN — استلام شحنة (Contract §4). Posting creates batches + inventory transactions
 * + the AP/cash journal entry atomically; the UI surfaces the returned journalEntryId.
 */
export function GrnForm() {
  const toast = useToast();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<"CASH" | "CREDIT">("CREDIT");
  const [lines, setLines] = useState<(GrnLineInput & { nameAr: string })[]>([]);
  const [medTerm, setMedTerm] = useState("");

  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => getSuppliers(), select: (r) => r.data });
  const qc = useQueryClient();
  const [supOpen, setSupOpen] = useState(false);
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const createSup = useMutation({
    mutationFn: () => createSupplier({ name: supName.trim(), phone: supPhone.trim() || undefined }),
    onSuccess: ({ data }) => {
      toast("success", `أُضيف المورد ${data.name}`);
      setSupplierId(data.id);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setSupOpen(false); setSupName(""); setSupPhone("");
    },
    onError: (e: Error) => toast("error", e.message),
  });
  const meds = useQuery({
    queryKey: ["medicines.grn", medTerm],
    queryFn: ({ signal }) => searchMedicines(medTerm, signal),
    enabled: medTerm.length >= 2,
    select: (r) => r.data,
  });

  const post = useMutation({
    mutationFn: () =>
      createGrn({
        supplierId,
        supplierInvoiceNo: invoiceNo,
        receivedAt: new Date().toISOString(),
        paymentTerms,
        lines: lines.map(({ nameAr: _omit, ...l }) => l),
      }),
    onSuccess: ({ data }) => {
      toast("success", `تم ترحيل الاستلام — قيد محاسبي ${data.journalEntryId.slice(0, 8)}`);
      router.push("/inventory");
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const valid = supplierId && invoiceNo && lines.length > 0 &&
    lines.every((l) => l.batchNumber && l.expiryDate && l.quantity > 0 && Number(l.unitCost) > 0);

  function patch(i: number, p: Partial<GrnLineInput>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader title="بيانات الشحنة" />
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">المورد</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-el border border-line bg-card px-3 text-sm focus:border-primary"
            >
              <option value="">— اختر المورد —</option>
              {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" onClick={() => setSupOpen(true)} className="mt-1 flex items-center gap-1 text-xs font-bold text-primary-ink hover:underline">
              <UserPlus className="size-3.5" /> إضافة مورد جديد
            </button>
          </label>
          <Input label="رقم فاتورة المورد" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="S-4471" dir="ltr" className="text-end" />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">شروط السداد</span>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value as "CASH" | "CREDIT")}
              className="h-10 w-full rounded-el border border-line bg-card px-3 text-sm focus:border-primary"
            >
              <option value="CREDIT">آجل (ذمم موردين)</option>
              <option value="CASH">نقدي</option>
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`أصناف الشحنة (${lines.length})`}
          action={
            <div className="relative">
              <input
                value={medTerm}
                onChange={(e) => setMedTerm(e.target.value)}
                placeholder="أضف صنفاً…"
                className="h-9 w-56 rounded-el border border-line bg-card px-3 text-sm placeholder:text-ink-faint focus:border-primary"
              />
              {medTerm.length >= 2 && (meds.data?.length ?? 0) > 0 && (
                <ul className="absolute end-0 z-20 mt-1 w-72 overflow-hidden rounded-el border border-line bg-card shadow-pop">
                  {meds.data!.slice(0, 6).map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => {
                          setLines((ls) => [...ls, { medicineId: m.id, nameAr: m.tradeNameAr, batchNumber: "", expiryDate: "", quantity: 1, unitCost: "0.0000" }]);
                          setMedTerm("");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-paper"
                      >
                        <Plus className="size-3.5 text-primary" /> {m.tradeNameAr}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          }
        />
        {lines.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-faint">أضف الأصناف المستلمة — كل سطر يُنشئ «تشغيلة» برقم وصلاحية (إلزامي للتتبع).</p>
        ) : (
          <Table>
            <THead><Th>الصنف</Th><Th>رقم التشغيلة</Th><Th>تاريخ الصلاحية</Th><Th>الكمية</Th><Th>بونص</Th><Th>تكلفة الوحدة</Th><Th></Th></THead>
            <tbody>
              {lines.map((l, i) => (
                <Tr key={i}>
                  <Td className="font-bold">{l.nameAr}</Td>
                  <Td><input value={l.batchNumber} onChange={(e) => patch(i, { batchNumber: e.target.value })} dir="ltr" className="h-9 w-28 rounded-el border border-line px-2 text-end text-xs font-mono" /></Td>
                  <Td><input type="date" value={l.expiryDate} onChange={(e) => patch(i, { expiryDate: e.target.value })} className="h-9 rounded-el border border-line px-2 text-xs" /></Td>
                  <Td><input type="number" min={1} value={l.quantity} onChange={(e) => patch(i, { quantity: Number(e.target.value) })} className="num h-9 w-20 rounded-el border border-line px-2 text-center text-sm" /></Td>
                  <Td><input type="number" min={0} value={l.bonusQuantity ?? 0} onChange={(e) => patch(i, { bonusQuantity: Number(e.target.value) })} className="num h-9 w-16 rounded-el border border-line px-2 text-center text-sm" /></Td>
                  <Td><input inputMode="decimal" value={l.unitCost} onChange={(e) => patch(i, { unitCost: e.target.value })} dir="ltr" className="num h-9 w-24 rounded-el border border-line px-2 text-end text-sm" /></Td>
                  <Td><button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="rounded p-1 text-ink-faint hover:bg-danger-soft hover:text-danger" aria-label="حذف"><Trash2 className="size-4" /></button></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push("/inventory")}>إلغاء</Button>
        <Button size="lg" disabled={!valid} loading={post.isPending} onClick={() => post.mutate()}>
          ترحيل الاستلام (GRN)
        </Button>
      </div>

      {/* إضافة مورد سريع — بلا مغادرة شاشة الاستلام */}
      <Dialog open={supOpen} onOpenChange={setSupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>مورد جديد</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <Input label="اسم المورد" value={supName} onChange={(e) => setSupName(e.target.value)} autoFocus />
            <Input label="رقم الهاتف (اختياري)" inputMode="tel" dir="ltr" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSupOpen(false)}>إلغاء</Button>
            <Button loading={createSup.isPending} disabled={supName.trim().length < 2} onClick={() => createSup.mutate()}>حفظ واختيار</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
