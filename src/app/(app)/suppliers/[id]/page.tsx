import { Topbar } from "@/components/layout/topbar";
import { SupplierDetail } from "@/modules/suppliers";

export default function SupplierPage() {
  return (
    <>
      <Topbar title="كشف مورد" />
      <div className="p-4 md:p-6"><SupplierDetail /></div>
    </>
  );
}
