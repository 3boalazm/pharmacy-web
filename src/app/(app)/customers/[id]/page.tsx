import { Topbar } from "@/components/layout/topbar";
import { CustomerDetail } from "@/modules/customers";

export default function CustomerPage({ params }: { params: { id: string } }) {
  return (
    <>
      <Topbar title="دفتر حساب العميل" />
      <CustomerDetail customerId={params.id} />
    </>
  );
}
