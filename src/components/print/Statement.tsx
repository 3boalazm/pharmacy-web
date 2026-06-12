"use client";
import { getSession } from "@/lib/auth/session";
import { formatMoney, type Money } from "@/lib/utils/money";

export interface StatementPrintData {
  customerName: string;
  customerPhone: string;
  from?: string;
  to?: string;
  openingBalance: Money;
  closingBalance: Money;
  rows: { date: string; description: string; debit: Money | null; credit: Money | null; runningBalance: Money }[];
}

/** كشف حساب عميل بتنسيق طباعة A4 — يُخفى على الشاشة ويظهر فقط عبر printArea("statement"). */
export function Statement({ data }: { data: StatementPrintData }) {
  const pharmacy = typeof window !== "undefined" ? getSession()?.pharmacy?.name : undefined;
  return (
    <div className="statement-print" dir="rtl">
      <header>
        <h1>{pharmacy ?? "الصيدلية"}</h1>
        <h2>كشف حساب عميل</h2>
        <p>
          العميل: <b>{data.customerName}</b> · <span className="num" dir="ltr">{data.customerPhone}</span>
          {data.from && data.to && <> · الفترة: <span className="num">{data.from}</span> ← <span className="num">{data.to}</span></>}
          · طُبع: <span className="num">{new Date().toLocaleDateString("ar-EG")}</span>
        </p>
      </header>
      <table>
        <thead>
          <tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>
        </thead>
        <tbody>
          <tr className="opening">
            <td colSpan={4}>رصيد أول المدة</td>
            <td className="num">{formatMoney(data.openingBalance)}</td>
          </tr>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td className="num">{new Date(r.date).toLocaleDateString("ar-EG")}</td>
              <td>{r.description}</td>
              <td className="num">{r.debit ? formatMoney(r.debit) : ""}</td>
              <td className="num">{r.credit ? formatMoney(r.credit) : ""}</td>
              <td className="num">{formatMoney(r.runningBalance)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={4}>الرصيد الختامي المستحق</td><td className="num">{formatMoney(data.closingBalance)}</td></tr>
        </tfoot>
      </table>
      <footer>
        <p>هذا الكشف مُشتق من دفتر الأستاذ بالقيد المزدوج — كل سطر له قيد محاسبي مرجعي.</p>
        <p className="sign">توقيع الصيدلية: ____________</p>
      </footer>
    </div>
  );
}
