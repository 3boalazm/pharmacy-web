import { Topbar } from "@/components/layout/topbar";
import { OrdersAdminView } from "@/modules/orders";

export default function OrdersPage() {
  return (
    <>
      <Topbar title="طلبات الستور" />
      <div className="p-6"><OrdersAdminView /></div>
    </>
  );
}
