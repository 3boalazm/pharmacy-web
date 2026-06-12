"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, qs } from "@/lib/api/http";
import { listPrescriptions, createPrescription, cancelPrescription, handoffToPos, type Prescription, type RxMedicine } from "../api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { hasRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { FilePlus2, Search, ShoppingCart, Trash2, XCircle } from "lucide-react";

const STATUS_META = {
  READY: { label: "جاهزة للصرف", tone: "blue" as const },
  DISPENSED: { label: "مصروفة", tone: "green" as const },
  CANCELLED: { label: "ملغاة", tone: "gray" as const },
};

/** الروشتات v1: تسجيل يدوي سريع (جاهز للـ OCR) ← «إرسال للسلة» ← POS يصرف ويوسمها تلقائيًا. */
export function PrescriptionsView() {
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const canWrite = hasRole(["ASSISTANT", "PHARMACIST"]);
  const [status, setStatus] = useState<"READY" | "DISPENSED" | "CANCELLED">("READY");
  const [formOpen, setFormOpen] = useState(false);

  // ── نموذج الإنشاء ──
  const [doctorName, setDoctorName] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ medicine: RxMedicine; quantity: number }[]>([]);

  const list = useQuery({
    queryKey: ["rx.list", status],
    queryFn: ({ signal }) => listPrescriptions({ status }, signal),
    select: (r) => r.data,
  });
  const results = useQuery({
    queryKey: ["rx.search", search],
    queryFn: async ({ signal }) =>
      (await api<{ rows: RxMedicine[] } | RxMedicine[]>(`/medicines${qs({ search })}`, { signal })).data,
    enabled: formOpen && search.trim().length >= 2,
    select: (d) => (Array.isArray(d) ? d : d.rows).slice(0, 6),
  });

  const create = useMutation({
    mutationFn: () =>
      createPrescription({
        doctorName: doctorName || undefined,
        notes: notes || undefined,
        lines: picked.map((p) => ({ medicineId: p.medicine.id, quantity: p.quantity })),
      }),
    onSuccess: () => {
      toast("success", "سُجلت الروشتة — جاهزة للصرف");
      setFormOpen(false); setPicked([]); setDoctorName(""); setNotes(""); setSearch("");
      qc.invalidateQueries({ queryKey: ["rx.list"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelPrescription(id),
    onSuccess: () => { toast("success", "أُلغيت الروشتة"); qc.invalidateQueries({ queryKey: ["rx.list"] }); },
    onError: (e: Error) => toast("error", e.message),
  });

  const sell = (rx: Prescription) => {
    handoffToPos(rx);
    router.push("/pos");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k) => (
          <button key={k} onClick={() => setStatus(k)}
            className={cn("rounded-el px-3 py-2 text-xs font-bold", status === k ? "bg-primary text-white" : "bg-card text-ink-soft hover:bg-paper")}>
            {STATUS_META[k].label}
          </button>
        ))}
        {canWrite && (
          <Button className="ms-auto" onClick={() => setFormOpen(true)}>
            <FilePlus2 className="size-4" /> روشتة جديدة
          </Button>
        )}
      </div>

      <Card>
        {list.isLoading ? (
          <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        ) : !list.data?.rows.length ? (
          <EmptyState title="لا روشتات هنا" hint={status === "READY" ? "سجّل روشتة جديدة وسيظهر زر إرسالها للسلة فورًا" : undefined} />
        ) : (
          <Table>
            <THead><Th>التاريخ</Th><Th>الطبيب</Th><Th>الأصناف</Th><Th>الحالة</Th><Th></Th></THead>
            <tbody>
              {list.data.rows.map((rx) => (
                <Tr key={rx.id}>
                  <Td className="num text-xs">{new Date(rx.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</Td>
                  <Td className="text-xs">{rx.doctorName ?? "—"}</Td>
                  <Td className="max-w-[260px] text-xs">
                    {rx.lines.map((l) => `${l.medicine?.tradeNameAr ?? "؟"} ×${l.quantity}`).join(" · ")}
                  </Td>
                  <Td><Badge tone={STATUS_META[rx.status].tone}>{STATUS_META[rx.status].label}</Badge></Td>
                  <Td>
                    <span className="flex justify-end gap-1">
                      {rx.status === "READY" && (
                        <>
                          <Button size="sm" onClick={() => sell(rx)}><ShoppingCart className="size-3.5" /> إرسال للسلة</Button>
                          {hasRole(["PHARMACIST"]) && (
                            <Button size="sm" variant="ghost" title="إلغاء" onClick={() => cancel.mutate(rx.id)}><XCircle className="size-3.5" /></Button>
                          )}
                        </>
                      )}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* نموذج التسجيل السريع */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>روشتة جديدة</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div className="relative">
              <Search className="absolute end-3 top-3 size-4 text-ink-faint" />
              <Input placeholder="ابحث بالاسم أو الباركود وأضف الأصناف…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
              {(results.data?.length ?? 0) > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-el border border-line bg-card shadow-lg">
                  {results.data!.map((m) => (
                    <li key={m.id}>
                      <button className="flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-paper"
                        onClick={() => {
                          setPicked((prev) => prev.some((p) => p.medicine.id === m.id)
                            ? prev.map((p) => p.medicine.id === m.id ? { ...p, quantity: p.quantity + 1 } : p)
                            : [...prev, { medicine: m, quantity: 1 }]);
                          setSearch("");
                        }}>
                        <span>{m.tradeNameAr}{m.requiresPrescription && <Badge tone="amber">روشتة</Badge>}</span>
                        <span className="num text-xs text-ink-faint">{m.sellPrice}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {picked.length > 0 && (
              <ul className="space-y-1.5">
                {picked.map((p) => (
                  <li key={p.medicine.id} className="flex items-center gap-2 rounded-el border border-line px-3 py-2">
                    <span className="flex-1 text-sm font-bold">{p.medicine.tradeNameAr}</span>
                    <Input type="number" min={1} dir="ltr" className="num h-8 w-16 text-end" value={p.quantity}
                      onChange={(e) => setPicked((prev) => prev.map((x) => x.medicine.id === p.medicine.id ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x))} />
                    <button className="text-ink-faint hover:text-danger" onClick={() => setPicked((prev) => prev.filter((x) => x.medicine.id !== p.medicine.id))}>
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="اسم الطبيب (اختياري)" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
              <Input label="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <p className="rounded-el bg-paper px-3 py-2 text-[11px] text-ink-faint">
              ربط العميل يتم عند البيع في نقطة البيع — والروشتة تُوسم «مصروفة» تلقائيًا بإتمام الفاتورة.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>إلغاء</Button>
            <Button loading={create.isPending} disabled={picked.length === 0} onClick={() => create.mutate()}>تسجيل الروشتة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
