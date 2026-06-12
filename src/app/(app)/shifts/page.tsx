import { Topbar } from "@/components/layout/topbar";
import { ShiftView } from "@/modules/shifts";

export default function ShiftsPage() {
  return (
    <>
      <Topbar title="الوردية والدرج" />
      <div className="p-4 md:p-6"><ShiftView /></div>
    </>
  );
}
