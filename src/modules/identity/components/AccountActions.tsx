"use client";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

/**
 * زر عائم صغير أسفل القائمة الجانبية: تغيير كلمة المرور الشخصية (متاح لكل الأدوار).
 * يعيش في طبقة modules ويُركَّب من layout التطبيق احترامًا لحدود الوحدات
 * (components/ لا تستورد modules/).
 */
export function AccountActions() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="تغيير كلمة المرور"
        aria-label="تغيير كلمة المرور"
        className="fixed bottom-20 start-3 lg:bottom-3 z-40 grid size-10 place-items-center rounded-full border border-line bg-card text-ink-soft shadow-card transition-colors hover:border-primary hover:text-primary"
      >
        <KeyRound className="size-4" />
      </button>
      <ChangePasswordDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
