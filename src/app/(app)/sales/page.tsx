import { Topbar } from "@/components/layout/topbar";
import { InvoicesView } from "@/modules/sales";

export default function SalesPage() {
  return (
    <>
      <Topbar title="الفواتير" />
      <div className="p-6"><InvoicesView /></div>
    </>
  );
}
