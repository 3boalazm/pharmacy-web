import { ShopShell } from "@/modules/shop";

/** مجموعة مسارات الستور — بدون حارس الموظفين؛ جلسة العميل تُدار داخل المكونات. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
