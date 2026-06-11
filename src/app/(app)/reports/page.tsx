import { Topbar } from "@/components/layout/topbar";
import { ReportsView } from "@/modules/reporting";

export default function ReportsPage() {
  return (
    <>
      <Topbar title="التقارير" />
      <div className="p-4 md:p-6"><ReportsView /></div>
    </>
  );
}
