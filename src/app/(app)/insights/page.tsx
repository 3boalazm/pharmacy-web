import { Topbar } from "@/components/layout/topbar";
import { InsightsView } from "@/modules/reporting";

export default function InsightsPage() {
  return (
    <>
      <Topbar title="الرؤى التحليلية" />
      <div className="p-4 md:p-6"><InsightsView /></div>
    </>
  );
}
