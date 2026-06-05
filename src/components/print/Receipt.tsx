"use client";
import { getSession } from "@/lib/auth/session";

export interface ReceiptData {
  invoiceNo: string;
  createdAt: string;
  customerName?: string;
  paymentMethod: "CASH" | "CARD" | "CREDIT" | "SPLIT";
  lines: { name: string; quantity: number; unitPrice: string; lineTotal: string }[];
  subtotal: string;
  discount: string;
  total: string;
}

const PAY_AR = { CASH: "نقدي", CARD: "بطاقة", CREDIT: "آجل — على الحساب", SPLIT: "مقسّم" } as const;

/** إيصال حراري 80mm — يُخفى على الشاشة ويظهر فقط أثناء printArea("receipt") عبر قواعد @media print. */
export function Receipt({ data }: { data: ReceiptData }) {
  const pharmacy = typeof window !== "undefined" ? getSession()?.pharmacy?.name : undefined;
  return (
    <div className="thermal-receipt" dir="rtl">
      <header>
        <h1>{pharmacy ?? "الصيدلية"}</h1>
        <p>فاتورة بيع · رقم {data.invoiceNo}</p>
        <p className="num">{new Date(data.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</p>
        {data.customerName && <p>العميل: {data.customerName}</p>}
      </header>
      <table>
        <thead>
          <tr><th>الصنف</th><th>ك</th><th>سعر</th><th>قيمة</th></tr>
        </thead>
        <tbody>
          {data.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.name}</td>
              <td className="num">{l.quantity}</td>
              <td className="num">{Number(l.unitPrice).toFixed(2)}</td>
              <td className="num">{l.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="totals">
        <p><span>الإجمالي قبل الخصم</span><b className="num">{Number(data.subtotal).toFixed(2)}</b></p>
        {Number(data.discount) > 0 && <p><span>الخصم</span><b className="num">-{Number(data.discount).toFixed(2)}</b></p>}
        <p className="grand"><span>المطلوب</span><b className="num">{Number(data.total).toFixed(2)} ج.م</b></p>
        <p><span>طريقة الدفع</span><b>{PAY_AR[data.paymentMethod]}</b></p>
      </section>
      <footer>
        <p>شكرًا لزيارتكم — نتمنى لكم الشفاء العاجل</p>
      </footer>
    </div>
  );
}
