import { Topbar } from "@/components/layout/topbar";
import { SupplierDetail, SupplierIntelligence } from "@/modules/suppliers";

export default function SupplierPage() {
  return (
    <>
      <Topbar title="ملف المورد" />
      <div className="space-y-6 p-4 md:p-6">
        <SupplierDetail />
        <SupplierIntelligence />
      </div>
    </>
  );
}
