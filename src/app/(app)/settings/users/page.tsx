import { Topbar } from "@/components/layout/topbar";
import { UsersView } from "@/modules/identity";

export default function UsersPage() {
  return (
    <>
      <Topbar title="المستخدمون" />
      <div className="p-6"><UsersView /></div>
    </>
  );
}
