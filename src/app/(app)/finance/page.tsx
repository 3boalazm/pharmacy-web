import { Topbar } from "@/components/layout/topbar";
import { FinanceView } from "@/modules/finance";

export default function FinancePage() {
  return (
    <>
      <Topbar title="المالية — الحوكمة والتسوية" />
      <div className="p-6"><FinanceView /></div>
    </>
  );
}
