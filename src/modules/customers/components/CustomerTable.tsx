"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { searchCustomers } from "../api";
import { CustomerForm } from "./CustomerForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function CustomerTable() {
  const [search, setSearch] = useState("");
  const [debtOnly, setDebtOnly] = useState(false);
  const [openForm, setOpenForm] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", search, debtOnly],
    queryFn: ({ signal }) => searchCustomers({ search: search || undefined, hasDebt: debtOnly || undefined }, signal),
    select: (r) => r.data,
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف…"
          className="h-9 w-64 rounded-el border border-line bg-card px-3 text-sm placeholder:text-ink-faint focus:border-primary"
        />
        <button
          onClick={() => setDebtOnly((v) => !v)}
          className={cn("rounded-el border px-3 py-1.5 text-xs font-bold transition-colors",
            debtOnly ? "border-warn bg-warn-soft text-warn" : "border-line text-ink-soft hover:bg-paper")}
        >
          عليهم مديونية فقط
        </button>
        <Button size="sm" className="ms-auto" onClick={() => setOpenForm(true)}>
          <UserPlus className="size-4" /> عميل جديد
        </Button>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا يوجد عملاء" hint="أضف أول عميل لبدء دفتر الحسابات" />
      ) : (
        <Table>
          <THead>
            <Th>العميل</Th><Th>الهاتف</Th><Th>المديونية</Th><Th>حد الائتمان</Th><Th>نقاط الولاء</Th><Th>آخر زيارة</Th>
          </THead>
          <tbody>
            {data.map((c) => {
              const debt = Number(c.balance);
              const nearLimit = debt > 0 && debt >= Number(c.creditLimit) * 0.8;
              return (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/customers/${c.id}`} className="font-bold text-primary-ink hover:underline">{c.name}</Link>
                    {c.allergies.length > 0 && <Badge tone="red" className="ms-2">حساسية</Badge>}
                  </Td>
                  <Td className="num" dir="ltr">{c.phone}</Td>
                  <Td className={cn("num font-bold", debt > 0 ? "text-warn" : "text-ink-soft")}>{formatMoney(c.balance)}</Td>
                  <Td className="num text-ink-soft">
                    {formatMoney(c.creditLimit)} {nearLimit && <Badge tone="amber" className="ms-1">قارب الحد</Badge>}
                  </Td>
                  <Td className="num">{c.loyaltyPoints}</Td>
                  <Td className="num text-ink-soft">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("ar-EG") : "—"}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <CustomerForm open={openForm} onOpenChange={setOpenForm} onSaved={() => { setOpenForm(false); refetch(); }} />
    </Card>
  );
}
