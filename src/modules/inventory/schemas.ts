import { z } from "zod";
import { zMoney, zUuid } from "@/lib/zod/common";

/** WF-4 adjustment reasons (mirrors backend enum). */
export const zAdjustmentReason = z.enum(["COUNT_CORRECTION", "DAMAGE", "EXPIRY_WRITE_OFF", "THEFT", "OTHER"]);
export type AdjustmentReason = z.infer<typeof zAdjustmentReason>;

export const ADJUSTMENT_REASONS: { value: AdjustmentReason; label: string }[] = [
  { value: "COUNT_CORRECTION", label: "تصحيح جرد" },
  { value: "DAMAGE", label: "تلف" },
  { value: "EXPIRY_WRITE_OFF", label: "إعدام صلاحية" },
  { value: "THEFT", label: "فقد/سرقة" },
  { value: "OTHER", label: "أخرى" },
];

export const zAdjustForm = z.object({
  medicineId: zUuid.or(z.literal("")).refine((v) => v !== "", "اختر الصنف"),
  batchId: zUuid.or(z.literal("")).refine((v) => v !== "", "اختر التشغيلة"),
  direction: z.enum(["REMOVE", "ADD"]),
  quantity: z.coerce.number().int().min(1, "أدخل كمية صحيحة"),
  reason: zAdjustmentReason,
  note: z.string().max(300).optional(),
});
export type AdjustFormValues = z.infer<typeof zAdjustForm>;

export const zGrnLine = z.object({
  medicineId: zUuid,
  batchNumber: z.string().min(1),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().min(1),
  bonusQuantity: z.number().int().min(0).optional(),
  unitCost: zMoney,
});
