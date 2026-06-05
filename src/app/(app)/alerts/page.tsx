import { Topbar } from "@/components/layout/topbar";
import { AlertsView } from "@/modules/platform";

export default function AlertsPage() {
  return (
    <>
      <Topbar title="التنبيهات" />
      <div className="p-6"><AlertsView /></div>
    </>
  );
}
