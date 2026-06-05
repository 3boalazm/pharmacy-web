"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBatches, quarantineBatch } from "../api";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils/money";
import { useToast } from "@/components/ui/toast";
import { hasRole } from "@/lib/auth/session";

/** Batches in FEFO order — the dispensing order the server will follow. */
export function BatchDrawer({ medicine, onClose }: { medicine: { id: string; name: string } | null; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["batches", medicine?.id],
    queryFn: () => getBatches(medicine!.id),
    enabled: !!medicine,
    select: (r) => r.data,
  });

  const quarantine = useMutation({
    mutationFn: (batchId: string) => quarantineBatch(batchId, "قرار صيدلي — فحص جودة"),
    onSuccess: () => {
      toast("success", "تم نقل التشغيلة إلى الحجر الرقمي");
      qc.invalidateQueries({ queryKey: ["batches", medicine?.id] });
    },
    onError: () => toast("error", "تعذر تنفيذ الإجراء"),
  });

  const canQuarantine = hasRole(["PHARMACIST"]);

  return (
    <Modal open={!!medicine} onClose={onClose} title={`تشغيلات: ${medicine?.name ?? ""}`} wide>
      {!data ? (
        <p className="py-6 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : (
        <Table>
          <THead>
            <Th>ترتيب FEFO</Th><Th>رقم التشغيلة</Th><Th>الصلاحية</Th><Th>الكمية</Th><Th>التكلفة</Th><Th>الحالة</Th><Th></Th>
          </THead>
          <tbody>
            {data.map((b) => (
              <Tr key={b.id}>
                <Td className="num font-bold text-primary-ink">#{b.fefoOrder}</Td>
                <Td className="font-mono text-xs">{b.batchNumber}</Td>
                <Td className="num">{new Date(b.expiryDate).toLocaleDateString("ar-EG")}</Td>
                <Td className="num font-bold">{b.quantity}</Td>
                <Td className="num text-ink-soft">{formatMoney(b.unitCost)}</Td>
                <Td>
                  {b.status === "ACTIVE" && <Badge tone="green">نشطة</Badge>}
                  {b.status === "QUARANTINED" && <Badge tone="amber">حجر</Badge>}
                  {b.status === "EXPIRED" && <Badge tone="red">منتهية</Badge>}
                  {b.status === "DEPLETED" && <Badge tone="gray">مستنفدة</Badge>}
                </Td>
                <Td>
                  {b.status === "ACTIVE" && canQuarantine && (
                    <Button size="sm" variant="ghost" onClick={() => quarantine.mutate(b.id)}>حجر</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-[11px] text-ink-faint">
        الصرف يتبع آلياً قاعدة «ما ينتهي أولاً يخرج أولاً». التشغيلات المنتهية محظورة الصرف على مستوى قاعدة البيانات.
      </p>
    </Modal>
  );
}
