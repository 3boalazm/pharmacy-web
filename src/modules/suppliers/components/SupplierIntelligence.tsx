"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getSupplierIntelligence } from "../api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { LineChart, BarChart } from "@/components/ui/charts";
import { formatMoney } from "@/lib/utils/money";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="num mt-0.5 text-lg font-extrabold">{value}</p>
    </Card>
  );
}

/** ذكاء المورد — قراءة فقط من بيانات GRN: تاريخ التوريد · أكثر الأصناف · اتجاه السعر · شذوذ. */
export function SupplierIntelligence() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["supplier.intel", id],
    queryFn: ({ signal }) => getSupplierIntelligence(id, signal),
    select: (r) => r.data,
  });

  if (isLoading) return <p className="p-6 text-center text-sm text-ink-faint">جارٍ تحليل تاريخ التوريد…</p>;
  if (!data || data.history.invoiceCount === 0)
    return <Card className="p-6 text-center text-sm text-ink-faint">لا توريدات سابقة من هذا المورد بعد.</Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="عدد الفواتير" value={String(data.history.invoiceCount)} />
        <Stat label="إجمالي المشتريات" value={formatMoney(data.history.totalPurchased)} />
        <Stat label="متوسط الفاتورة" value={formatMoney(data.history.avgInvoice)} />
        <Stat label="أصناف متتبَّعة" value={String(data.itemsTracked)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.purchaseSeries.length > 0 && (
          <Card>
            <div className="border-b border-line px-4 py-3"><p className="text-sm font-bold">المشتريات الشهرية</p></div>
            <div className="p-4">
              <BarChart
                data={data.purchaseSeries.map((p) => ({ label: p.month.slice(5) + "/" + p.month.slice(2, 4), value: Number(p.total) }))}
                height={180}
              />
            </div>
          </Card>
        )}
        {data.priceSeries.length > 1 && (
          <Card>
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-bold">اتجاه سعر: {data.priceSeriesItem}</p>
            </div>
            <div className="p-4">
              <LineChart
                data={data.priceSeries.map((p) => ({ label: new Date(p.at).toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" }), value: Number(p.cost) }))}
                height={180}
              />
            </div>
          </Card>
        )}
      </div>

      {data.anomalies.length > 0 && (
        <Card className="border-danger/30 p-3">
          <p className="mb-2 text-xs font-bold text-danger">⚠️ تنبيه شذوذ سعري (ارتفاع &gt; 20% عن آخر شراء)</p>
          <div className="flex flex-col gap-1.5">
            {data.anomalies.map((a) => (
              <div key={a.medicine} className="flex items-center justify-between text-sm">
                <span className="font-medium">{a.medicine}</span>
                <span className="num text-xs text-ink-soft">
                  {formatMoney(a.prevPrice!)} ← <span className="font-bold text-danger">{formatMoney(a.lastPrice)}</span> (+{a.changePct}%)
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-line px-4 py-3"><p className="text-sm font-bold">أكثر الأصناف توريدًا</p></div>
        <Table>
          <THead><Th>الصنف</Th><Th>إجمالي الكمية</Th><Th>آخر سعر</Th><Th>الاتجاه</Th><Th>مرات الشراء</Th></THead>
          <tbody>
            {data.topItems.map((it) => (
              <Tr key={it.medicine}>
                <Td className="font-bold">{it.medicine}</Td>
                <Td className="num">{it.totalQty}</Td>
                <Td className="num">{formatMoney(it.lastPrice)}</Td>
                <Td>
                  {it.changePct === null ? <span className="text-xs text-ink-faint">—</span>
                  : Number(it.changePct) > 0 ? <Badge tone={it.anomaly ? "red" : "amber"}>+{it.changePct}%</Badge>
                  : Number(it.changePct) < 0 ? <Badge tone="green">{it.changePct}%</Badge>
                  : <span className="num text-xs text-ink-soft">ثابت</span>}
                </Td>
                <Td className="num text-xs">{it.purchases}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
