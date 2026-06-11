import { Topbar } from "@/components/layout/topbar";
import { PrescriptionsView } from "@/modules/prescriptions";

export default function PrescriptionsPage() {
  return (
    <>
      <Topbar title="الروشتات" />
      <div className="p-4 md:p-6"><PrescriptionsView /></div>
    </>
  );
}
