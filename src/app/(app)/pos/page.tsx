import { Topbar } from "@/components/layout/topbar";
import { PosScreen } from "@/modules/pos";

export default function PosPage() {
  return (
    <>
      <Topbar title="نقطة البيع" />
      <PosScreen />
    </>
  );
}
