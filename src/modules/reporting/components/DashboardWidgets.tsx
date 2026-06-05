"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api/http";
import { reportDaily, reportTop } from "../api";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type Money } from "@/lib/utils/money";

interface StockRow {
  medicineId: string;
  tradeNameAr: string;
  form: string;
  onHand: number;
  minStockLevel: number;
  nearestExpiry: string | null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** رسم أعمدة خفيف بلا اعتماديات: مبيعات آخر ٣٠ يومًا من /reports/daily. */
function SalesChart() {
  const params = { from: iso(new Date(Date.now() - 29 * 86_400_000)), to: iso(new Date()) };
  const { data } = useQuery({
    queryKey: ["dash.daily", params],
    queryFn: ({ signal }) => reportDaily(params, signal),
    select: (r) => [...r.data].reverse(), // تصاعدي للرسم
  });

  if (!data?.length) return <EmptyState title="لا مبيعات بعد" hint="أول فاتورة سترسم أول عمود هنا" />;

  const W = 600, H = 140, pad = 4;
  const max = Math.max(...data.map((d) => Number(d.total)), 1);
  const bw = (W - pad * 2) / data.length;

  return (
    <div className="p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none" role="img" aria-label="مبيعات آخر ٣٠ يومًا">
        {data.map((d, i) => {
          const h = Math.max((Number(d.total) / max) * (H - 20), 2);
          return (
            <rect key={String(d.day)} x={pad + i * bw + 1} y={H - h} width={Math.max(bw - 2, 2)} height={h} rx="2" className="fill-primary/70">
              <title>{new Date(d.day).toLocaleDateString("ar-EG")} — {formatMoney(d.total)} ج.م</title>
            </rect>
          );
        })}
      </svg>
      <p className="mt-1 flex justify-between text-[10px] text-ink-faint">
        <span className="num">{new Date(String(data[0].day)).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</span>
        <span>إجمالي مبيعات اليوم — مرّر على الأعمدة للتفاصيل</span>
        <span className="num">{new Date(String(data[data.length - 1].day)).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</span>
      </p>
    </div>
  );
}

function TopSellersWidget() {
  const params = { from: iso(new Date(Date.now() - 29 * 86_400_000)), to: iso(new Date()) };
  const { data } = useQuery({
    queryKey: ["dash.top", params],
    queryFn: ({ signal }) => reportTop(params, signal),
    select: (r) => r.data.slice(0, 5),
  });
  return (
    <Card>
      <CardHeader title="الأكثر مبيعًا (٣٠ يومًا)" action={<Link href="/reports" className="text-xs font-bold text-primary-ink">التقارير ←</Link>} />
      {!data?.length ? (
        <EmptyState title="لا مبيعات بعد" />
      ) : (
        <ul className="divide-y divide-line/60">
          {data.map((t, i) => (
            <li key={t.medicineId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="num w-4 font-extrabold text-primary-ink">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{t.nameAr}</span>
              <span className="num text-xs text-ink-faint">{Number(t.quantity)} وحدة</span>
              <b className="num text-xs">{formatMoney(t.revenue)}</b>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StockWidget({ title, query, render }: {
  title: string;
  query: string;
  render: (r: StockRow) => React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ["dash.stock", query],
    queryFn: async ({ signal }) => (await api<StockRow[]>(`/stock?${query}`, { signal })).data.slice(0, 5),
  });
  return (
    <Card>
      <CardHeader title={title} action={<Link href="/inventory" className="text-xs font-bold text-primary-ink">المخزون ←</Link>} />
      {!data?.length ? (
        <EmptyState title="لا شيء هنا — تمام ✅" />
      ) : (
        <ul className="divide-y divide-line/60">
          {data.map((r) => (
            <li key={r.medicineId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-bold">{r.tradeNameAr}</span>
              {render(r)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** ودجتس لوحة التحكم — كلها قراءات من نفس مصادر الحقيقة (لا عدّادات موازية). */
export function DashboardWidgets() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="المبيعات — آخر ٣٠ يومًا" />
        <SalesChart />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <TopSellersWidget />
        <StockWidget
          title="أدوية تحت حد الأمان"
          query="belowMin=true"
          render={(r) => <Badge tone="red">متبقي {r.onHand}</Badge>}
        />
        <StockWidget
          title="قريبة الانتهاء (٩٠ يومًا)"
          query="expiringWithinDays=90"
          render={(r) => (
            <Badge tone="amber">
              {r.nearestExpiry ? new Date(r.nearestExpiry).toLocaleDateString("ar-EG", { month: "short", year: "2-digit" }) : "—"}
            </Badge>
          )}
        />
      </div>
    </div>
  );
}
