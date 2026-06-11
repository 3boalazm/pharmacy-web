"use client";
import { code39Svg } from "@/lib/utils/barcode";
import { formatMoney, type Money } from "@/lib/utils/money";

export interface LabelItem { code: string; name: string; price: Money }

/**
 * ورقة ليبلات (3 أعمدة): باركود CODE39 للكود الداخلي + الاسم + السعر.
 * تُطبع وحدها عبر printArea("labels") — تُلصق على الأرفف/العلب ويقرؤها أي ماسح USB.
 */
export function LabelSheet({ items }: { items: LabelItem[] }) {
  return (
    <div className="label-sheet" dir="rtl">
      {items.map((it, i) => {
        const svg = code39Svg(it.code, { height: 44 });
        return (
          <div key={i} className="label">
            {svg ? <span dangerouslySetInnerHTML={{ __html: svg }} /> : <span>{it.code}</span>}
            <p style={{ fontFamily: "monospace", direction: "ltr" }}>{it.code}</p>
            <p>{it.name}</p>
            <p><b>{formatMoney(it.price)} ج.م</b></p>
          </div>
        );
      })}
    </div>
  );
}
