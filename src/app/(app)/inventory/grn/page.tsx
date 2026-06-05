import { Topbar } from "@/components/layout/topbar";
import { GrnForm } from "@/modules/inventory";

export default function GrnPage() {
  return (
    <>
      <Topbar title="استلام شحنة — إذن إضافة (GRN)" />
      <GrnForm />
    </>
  );
}
