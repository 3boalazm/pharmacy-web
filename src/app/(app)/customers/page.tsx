import { Topbar } from "@/components/layout/topbar";
import { CustomerTable } from "@/modules/customers";

export default function CustomersPage() {
  return (
    <>
      <Topbar title="العملاء ودفاتر الحسابات" />
      <div className="p-6"><CustomerTable /></div>
    </>
  );
}
