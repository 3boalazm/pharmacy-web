"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { importBaseCatalog, searchMedicines } from "../api";
import { CreateMedicineDialog } from "./CreateMedicineDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { getSession, hasRole } from "@/lib/auth/session";
import { DatabaseZap, PackagePlus, Printer } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { LabelSheet, type LabelItem } from "./LabelSheet";
import { printArea } from "@/lib/utils/print";

/** Product List — catalog master data (descriptive truth; quantities live in Inventory). */
export function ProductsTable() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [labels, setLabels] = useState<LabelItem[] | null>(null);
  const canWrite = hasRole(["PHARMACIST"]);
  const isOwner = getSession()?.user.role === "OWNER";
  const toast = useToast();
  const importBase = useMutation({
    mutationFn: importBaseCatalog,
    onSuccess: ({ data }) => {
      toast("success", `اكتمل الاستيراد: أُضيف ${data.inserted} صنفًا (${data.alreadyExisted} كانوا موجودين)`);
      refetch();
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["medicines.list", search],
    queryFn: ({ signal }) => searchMedicines(search || "", signal, 100),
    select: (r) => r.data,
  });

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في المنتجات…" className="h-9 w-64" />
        <span className="ms-auto flex gap-2">
          {isOwner && (
            <Button size="sm" variant="secondary" loading={importBase.isPending} onClick={() => importBase.mutate()}>
              <DatabaseZap className="size-4" /> استيراد قاعدة الأدوية (1,951)
            </Button>
          )}
          {canWrite && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PackagePlus className="size-4" /> منتج جديد
            </Button>
          )}
        </span>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا توجد منتجات" hint="أضف أول منتج لبدء الكتالوج" />
      ) : (
        <Table>
          <THead>
            <Th>الاسم التجاري</Th><Th>المادة الفعالة</Th><Th>الشكل</Th><Th>الكود</Th><Th>السعر</Th><Th>المتاح</Th><Th>خصائص</Th><Th>ليبل</Th>
          </THead>
          <tbody>
            {data.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <p className="font-bold">{m.tradeNameAr}</p>
                  <p className="text-xs text-ink-faint">{m.tradeName}</p>
                </Td>
                <Td className="text-ink-soft">{m.scientificName}</Td>
                <Td className="text-ink-soft">{m.form}</Td>
                <Td className="font-mono text-xs" dir="ltr">{m.internalCode}</Td>
                <Td className="num font-bold">{formatMoney(m.sellPrice)}</Td>
                <Td className="num">{m.stock?.onHand ?? 0}</Td>
                <Td>
                  <span className="flex gap-1">
                    {m.requiresPrescription && <Badge tone="blue">روشتة</Badge>}
                    {m.isControlled && <Badge tone="red">مراقب</Badge>}
                  </span>
                </Td>
                <Td>
                  <Button size="sm" variant="ghost" title="طباعة ليبل باركود"
                    onClick={() => {
                      setLabels(Array.from({ length: 12 }, () => ({ code: m.internalCode, name: m.tradeNameAr, price: m.sellPrice })));
                      setTimeout(() => printArea("labels"), 60);
                    }}>
                    <Printer className="size-3.5" />
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {labels && <LabelSheet items={labels} />}
      <CreateMedicineDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { setCreateOpen(false); refetch(); }} />
    </Card>
  );
}
