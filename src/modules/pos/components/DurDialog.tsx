"use client";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PinElevateDialog } from "@/components/app/pin-elevate-dialog";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { DurAlert } from "../types";

const typeAr = { INTERACTION: "تداخل دوائي", ALLERGY: "حساسية", DUPLICATE_THERAPY: "ازدواج علاجي" } as const;
const sevAr = { BLOCK: "حظر", WARN: "تحذير", INFO: "معلومة" } as const;
const sevTone = { BLOCK: "red", WARN: "amber", INFO: "blue" } as const;

/**
 * DUR clinical gate (Contract §5.1 DUR_BLOCK → §2 pin-elevate → retry with durOverride).
 * The override is pharmacist-scoped, expires in 120s, and is written to the audit log.
 */
export function DurDialog({
  alerts, onClose, onOverride,
}: {
  alerts: DurAlert[] | null;
  onClose: () => void;
  onOverride: (overrideToken: string, alertIds: string[]) => void;
}) {
  const [pinOpen, setPinOpen] = useState(false);
  if (!alerts) return null;

  return (
    <>
      <Dialog open={!pinOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader tone="danger">
            <DialogTitle>تنبيه سريري — مراجعة استخدام الدواء (DUR)</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-2 rounded-el border border-danger-soft bg-danger-soft/40 p-3">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                <div className="text-sm">
                  <p className="flex items-center gap-2 font-bold">
                    {typeAr[a.type]}
                    <Badge tone={sevTone[a.severity]}>{sevAr[a.severity]}</Badge>
                  </p>
                  <p className="text-ink-soft">{a.detail}</p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">قاعدة: {a.ruleId}</p>
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-ink-soft">
              المتابعة تتطلب مصادقة صيدلي مرخص. يُسجَّل التجاوز في سجل التدقيق ويصدر حدث DURAlertRaised.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>إلغاء العملية</Button>
            <Button variant="destructive" onClick={() => setPinOpen(true)}>مصادقة الصيدلي والمتابعة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinElevateDialog
        open={pinOpen}
        onOpenChange={(o) => { setPinOpen(o); if (!o) onClose(); }}
        title="تجاوز التنبيه السريري"
        confirmLabel="مصادقة وتجاوز"
        onToken={(token) => { setPinOpen(false); onOverride(token, alerts.map((a) => a.id)); }}
      />
    </>
  );
}
