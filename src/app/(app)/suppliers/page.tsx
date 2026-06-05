import { Topbar } from "@/components/layout/topbar";
import { SuppliersView } from "@/modules/suppliers";

export default function SuppliersPage() {
  return (
    <>
      <Topbar title="الموردون" />
      <div className="p-4 md:p-6"><SuppliersView /></div>
    </>
  );
}
