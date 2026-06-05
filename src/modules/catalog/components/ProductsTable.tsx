"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMedicines } from "../api";
import { CreateMedicineDialog } from "./CreateMedicineDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { hasRole } from "@/lib/auth/session";
import { PackagePlus } from "lucide-react";

/** Product List — catalog master data (descriptive truth; quantities live in Inventory). */
export function ProductsTable() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const canWrite = hasRole(["PHARMACIST"]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["medicines.list", search],
    queryFn: ({ signal }) => searchMedicines(search || "", signal, 100),
    select: (r) => r.data,
  });

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في المنتجات…" className="h-9 w-64" />
        {canWrite && (
          <Button size="sm" className="ms-auto" onClick={() => setCreateOpen(true)}>
            <PackagePlus className="size-4" /> منتج جديد
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا توجد منتجات" hint="أضف أول منتج لبدء الكتالوج" />
      ) : (
        <Table>
          <THead>
            <Th>الاسم التجاري</Th><Th>المادة الفعالة</Th><Th>الشكل</Th><Th>الكود</Th><Th>السعر</Th><Th>المتاح</Th><Th>خصائص</Th>
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
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <CreateMedicineDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { setCreateOpen(false); refetch(); }} />
    </Card>
  );
}
