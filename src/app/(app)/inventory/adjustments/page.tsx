import { Topbar } from "@/components/layout/topbar";
import { AdjustmentForm } from "@/modules/inventory";

export default function AdjustmentsPage() {
  return (
    <>
      <Topbar title="تسوية المخزون" />
      <div className="p-6"><AdjustmentForm /></div>
    </>
  );
}
