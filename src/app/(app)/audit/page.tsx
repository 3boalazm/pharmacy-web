import { Topbar } from "@/components/layout/topbar";
import { AuditView } from "@/modules/platform";

export default function AuditPage() {
  return (
    <>
      <Topbar title="سجل التدقيق" />
      <div className="p-4 md:p-6"><AuditView /></div>
    </>
  );
}
