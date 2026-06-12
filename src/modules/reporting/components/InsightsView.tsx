"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCashVariance, getDiscountAnalytics, getExpiryLoss, getDeadStock,
  getAbc, getCustomerSegments, getStockoutForecast,
} from "../api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { key: "cash", label: "فروق الدرج" },
  { key: "discounts", label: "الخصومات الشاذة" },
  { key: "expiry", label: "خطر الانتهاء" },
  { key: "dead", label: "البضاعة الراكدة" },
  { key: "abc", label: "تحليل ABC" },
  { key: "segments", label: "شرائح العملاء" },
  { key: "stockout", label: "تنبؤ النفاد" },
] as const;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="num mt-0.5 text-lg font-extrabold">{value}</p>
    </Card>
  );
}

/** رؤى تحليلية — قراءة فقط، تشتق من بيانات موجودة دون أي تعديل في القيود أو المخزون. */
export function InsightsView() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("cash");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("rounded-el px-3 py-2 text-xs font-bold", tab === t.key ? "bg-primary text-white" : "bg-card text-ink-soft hover:bg-paper")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "cash" && <CashVariance />}
      {tab === "discounts" && <Discounts />}
      {tab === "expiry" && <ExpiryLoss />}
      {tab === "dead" && <DeadStock />}
      {tab === "abc" && <Abc />}
      {tab === "segments" && <Segments />}
      {tab === "stockout" && <Stockout />}
    </div>
  );
}

const SEVERITY = {
  NORMAL: { tone: "green" as const, label: "طبيعي" },
  WARNING: { tone: "amber" as const, label: "تحذير" },
  CRITICAL: { tone: "red" as const, label: "حرج" },
};

function CashVariance() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics.cash"], queryFn: ({ signal }) => getCashVariance(signal), select: (r) => r.data });
  if (isLoading) return <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>;
  if (!data?.rows.length) return <EmptyState title="لا ورديات مقفلة بعد" hint="ستظهر فروق الدرج هنا بعد إقفال أول وردية" />;
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="متوسط الفرق (آخر 30)" value={formatMoney(data.summary.avgVariance)} />
        <StatCard label="أعلى فرق" value={formatMoney(data.summary.maxVariance)} />
        <StatCard label="عدد الورديات" value={String(data.summary.count)} />
      </div>
      <Card>
        <Table>
          <THead><Th>المستخدم</Th><Th>التاريخ</Th><Th>المتوقع</Th><Th>الفعلي</Th><Th>الفرق</Th><Th>النسبة</Th><Th>الحالة</Th></THead>
          <tbody>
            {data.rows.map((r) => (
              <Tr key={r.shiftId}>
                <Td className="font-bold">{r.user}</Td>
                <Td className="num text-xs">{new Date(r.closedAt).toLocaleDateString("ar-EG")}</Td>
                <Td className="num">{formatMoney(r.expected)}</Td>
                <Td className="num">{formatMoney(r.counted)}</Td>
                <Td className={cn("num font-bold", Number(r.variance) < 0 ? "text-danger" : "text-primary-ink")}>{formatMoney(r.variance)}</Td>
                <Td className="num">{r.variancePct}%</Td>
                <Td><Badge tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].label}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

function Discounts() {
  const [threshold, setThreshold] = useState(15);
  const { data, isLoading } = useQuery({ queryKey: ["analytics.disc", threshold], queryFn: ({ signal }) => getDiscountAnalytics(threshold, signal), select: (r) => r.data });
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">عتبة التنبيه:</span>
        {[10, 15, 20, 30].map((t) => (
          <button key={t} onClick={() => setThreshold(t)}
            className={cn("num rounded-el px-2.5 py-1 text-xs font-bold", threshold === t ? "bg-primary text-white" : "bg-card text-ink-soft hover:bg-paper")}>
            {t}%
          </button>
        ))}
      </div>
      {data && data.topUsers.length > 0 && (
        <Card className="p-3">
          <p className="mb-2 text-xs font-bold text-ink-soft">أعلى المستخدمين بإجمالي الخصم (90 يومًا)</p>
          <div className="flex flex-wrap gap-2">
            {data.topUsers.map((u) => (
              <span key={u.user} className="rounded-el bg-paper px-2.5 py-1 text-xs">{u.user}: <span className="num font-bold">{formatMoney(u.totalDiscount)}</span></span>
            ))}
          </div>
        </Card>
      )}
      <Card>
        {isLoading ? <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        : !data?.flagged.length ? <EmptyState title="لا خصومات شاذة 🎉" hint={`لا فاتورة بخصم يتجاوز ${threshold}%`} />
        : (
          <Table>
            <THead><Th>الفاتورة</Th><Th>الكاشير</Th><Th>العميل</Th><Th>الخصم</Th><Th>النسبة</Th><Th>التاريخ</Th></THead>
            <tbody>
              {data.flagged.map((r) => (
                <Tr key={r.invoiceNo}>
                  <Td className="num font-bold">{r.invoiceNo}</Td>
                  <Td>{r.cashier}</Td>
                  <Td className="text-xs">{r.customer}</Td>
                  <Td className="num font-bold text-danger">{formatMoney(r.discount)}</Td>
                  <Td className="num">{r.discountPct}%</Td>
                  <Td className="num text-xs">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function ExpiryLoss() {
  const [days, setDays] = useState(90);
  const { data, isLoading } = useQuery({ queryKey: ["analytics.expiry", days], queryFn: ({ signal }) => getExpiryLoss(days, signal), select: (r) => r.data });
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">ينتهي خلال:</span>
        {[30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={cn("num rounded-el px-2.5 py-1 text-xs font-bold", days === d ? "bg-primary text-white" : "bg-card text-ink-soft hover:bg-paper")}>
            {d} يوم
          </button>
        ))}
        {data && <span className="ms-auto text-xs text-ink-soft">إجمالي معرّض للخسارة: <span className="num font-extrabold text-danger">{formatMoney(data.summary.totalAtRisk)}</span></span>}
      </div>
      <Card>
        {isLoading ? <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        : !data?.rows.length ? <EmptyState title="لا مخاطر انتهاء 🎉" hint={`لا تشغيلات تنتهي خلال ${days} يومًا`} />
        : (
          <Table>
            <THead><Th>الصنف</Th><Th>التشغيلة</Th><Th>الانتهاء</Th><Th>متبقٍ</Th><Th>الكمية</Th><Th>التكلفة</Th><Th>الخسارة المحتملة</Th></THead>
            <tbody>
              {data.rows.map((r, i) => (
                <Tr key={`${r.batchNumber}-${i}`}>
                  <Td className="font-bold">{r.medicine}</Td>
                  <Td className="num text-xs">{r.batchNumber}</Td>
                  <Td className="num text-xs">{new Date(r.expiryDate).toLocaleDateString("ar-EG")}</Td>
                  <Td className={cn("num text-xs", r.daysLeft <= 30 && "font-bold text-danger")}>{r.daysLeft} يوم</Td>
                  <Td className="num">{r.quantity}</Td>
                  <Td className="num">{formatMoney(r.costPrice)}</Td>
                  <Td className="num text-base font-extrabold text-danger">{formatMoney(r.potentialLoss)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function DeadStock() {
  const [days, setDays] = useState(60);
  const { data, isLoading } = useQuery({ queryKey: ["analytics.dead", days], queryFn: ({ signal }) => getDeadStock(days, signal), select: (r) => r.data });
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">بلا بيع منذ:</span>
        {[30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={cn("num rounded-el px-2.5 py-1 text-xs font-bold", days === d ? "bg-primary text-white" : "bg-card text-ink-soft hover:bg-paper")}>
            {d} يوم
          </button>
        ))}
        {data && <span className="ms-auto text-xs text-ink-soft">قيمة متجمّدة: <span className="num font-extrabold text-warn">{formatMoney(data.summary.frozenValue)}</span></span>}
      </div>
      <Card>
        {isLoading ? <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        : !data?.rows.length ? <EmptyState title="لا بضاعة راكدة 🎉" hint={`كل الأصناف تحرّكت خلال ${days} يومًا`} />
        : (
          <Table>
            <THead><Th>الصنف</Th><Th>الكمية</Th><Th>قيمة المخزون</Th><Th>آخر بيع</Th><Th>أيام الركود</Th></THead>
            <tbody>
              {data.rows.map((r, i) => (
                <Tr key={`${r.medicine}-${i}`}>
                  <Td className="font-bold">{r.medicine}</Td>
                  <Td className="num">{r.quantity}</Td>
                  <Td className="num font-bold text-warn">{formatMoney(r.inventoryValue)}</Td>
                  <Td className="num text-xs">{r.lastSale ? new Date(r.lastSale).toLocaleDateString("ar-EG") : "لا بيع قط"}</Td>
                  <Td className="num text-xs">{r.daysInactive ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

const ABC_TONE = { A: "green", B: "amber", C: "red" } as const;
function Abc() {
  const [days, setDays] = useState(90);
  const { data, isLoading } = useQuery({ queryKey: ["analytics.abc", days], queryFn: ({ signal }) => getAbc(days, signal), select: (r) => r.data });
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">الفترة:</span>
        {[30, 90, 180].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={cn("num rounded-el px-2.5 py-1 text-xs font-bold", days === d ? "bg-primary text-white" : "bg-card text-ink-soft hover:bg-paper")}>{d} يوم</button>
        ))}
        {data && <span className="ms-auto text-xs text-ink-soft">A:{data.summary.counts.A} · B:{data.summary.counts.B} · C:{data.summary.counts.C}</span>}
      </div>
      <Card>
        {isLoading ? <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        : !data?.rows.length ? <EmptyState title="لا مبيعات في الفترة" hint="يحتاج تحليل ABC فواتير مبيعات" />
        : (
          <Table>
            <THead><Th>الصنف</Th><Th>الإيراد</Th><Th>الكمية</Th><Th>% الإيراد</Th><Th>تراكمي</Th><Th>الفئة</Th></THead>
            <tbody>
              {data.rows.map((r, i) => (
                <Tr key={`${r.medicine}-${i}`}>
                  <Td className="font-bold">{r.medicine}</Td>
                  <Td className="num">{formatMoney(r.revenue)}</Td>
                  <Td className="num">{r.qty}</Td>
                  <Td className="num text-xs">{r.revenuePct}%</Td>
                  <Td className="num text-xs">{r.cumulativePct}%</Td>
                  <Td><Badge tone={ABC_TONE[r.class]}>{r.class}</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

const SEG_TONE: Record<string, "green" | "amber" | "red" | "blue"> = { "دائم": "green", "متكرر": "blue", "جديد": "amber", "خامل": "red", "بلا مشتريات": "red" };
function Segments() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics.segments"], queryFn: ({ signal }) => getCustomerSegments(signal), select: (r) => r.data });
  if (isLoading) return <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>;
  if (!data?.rows.length) return <EmptyState title="لا عملاء بعد" hint="ستظهر الشرائح بعد تسجيل عملاء ومبيعات" />;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.summary.segments).map(([seg, n]) => (
          <span key={seg} className="rounded-el bg-paper px-2.5 py-1 text-xs">{seg}: <span className="num font-bold">{n}</span></span>
        ))}
      </div>
      <Card>
        <Table>
          <THead><Th>العميل</Th><Th>الشريحة</Th><Th>الفواتير</Th><Th>إجمالي الشراء</Th><Th>الرصيد</Th><Th>آخر شراء</Th></THead>
          <tbody>
            {data.rows.map((r, i) => (
              <Tr key={`${r.customer}-${i}`}>
                <Td className="font-bold">{r.customer}</Td>
                <Td><Badge tone={SEG_TONE[r.segment] ?? "amber"}>{r.segment}</Badge></Td>
                <Td className="num">{r.invoices}</Td>
                <Td className="num">{formatMoney(r.totalSpent)}</Td>
                <Td className={cn("num", Number(r.balance) > 0 && "text-danger")}>{formatMoney(r.balance)}</Td>
                <Td className="num text-xs">{r.lastPurchase ? new Date(r.lastPurchase).toLocaleDateString("ar-EG") : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

function Stockout() {
  const [days, setDays] = useState(14);
  const { data, isLoading } = useQuery({ queryKey: ["analytics.stockout", days], queryFn: ({ signal }) => getStockoutForecast(days, signal), select: (r) => r.data });
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">ينفد خلال:</span>
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={cn("num rounded-el px-2.5 py-1 text-xs font-bold", days === d ? "bg-primary text-white" : "bg-card text-ink-soft hover:bg-paper")}>{d} يوم</button>
        ))}
        {data && <span className="ms-auto text-xs text-ink-soft">أصناف معرّضة: <span className="num font-extrabold text-danger">{data.summary.atRisk}</span></span>}
      </div>
      <Card>
        {isLoading ? <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
        : !data?.rows.length ? <EmptyState title="لا أصناف معرّضة للنفاد 🎉" hint={`لا صنف ينفد خلال ${days} يومًا بالمعدل الحالي`} />
        : (
          <Table>
            <THead><Th>الصنف</Th><Th>المتاح</Th><Th>بيع 30 يوم</Th><Th>معدل يومي</Th><Th>ينفد خلال</Th></THead>
            <tbody>
              {data.rows.map((r, i) => (
                <Tr key={`${r.medicine}-${i}`}>
                  <Td className="font-bold">{r.medicine}</Td>
                  <Td className="num">{r.onHand}</Td>
                  <Td className="num">{r.sold30}</Td>
                  <Td className="num text-xs">{r.dailyRate}/يوم</Td>
                  <Td className={cn("num font-bold", (r.daysToStockout ?? 99) <= 7 ? "text-danger" : "text-warn")}>{r.daysToStockout} يوم</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
