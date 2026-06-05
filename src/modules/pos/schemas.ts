/**
 * Zod schemas mirroring API Contract §5.1 EXACTLY — these are the single source
 * of POS DTO types (types.ts re-exports inferred types). No client-invented fields.
 */
import { z } from "zod";
import { zDiscount, zMoney, zUuid } from "@/lib/zod/common";

export const zPaymentMethod = z.enum(["CASH", "CARD", "CREDIT", "SPLIT"]);

export const zSaleLine = z.object({
  medicineId: zUuid,
  quantity: z.number().int().min(1),
  unitPrice: zMoney,
  discount: zDiscount.optional(),
});

export const zInstallmentPlan = z.object({
  count: z.number().int().min(2).max(24),
  intervalDays: z.number().int().min(7).max(90),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const zCreateSaleRequest = z.object({
  clientSaleId: zUuid,
  clientTimestamp: z.string().datetime(),
  shiftId: zUuid.nullable(),
  customerId: zUuid.nullable(),
  prescriptionId: zUuid.nullable(),
  lines: z.array(zSaleLine).min(1),
  invoiceDiscount: zDiscount.optional(),
  payment: z.object({
    method: zPaymentMethod,
    splits: z.array(z.object({ method: z.enum(["CASH", "CARD", "CREDIT"]), amount: zMoney })).optional(),
    installmentPlan: zInstallmentPlan.optional(),
  }),
  durOverride: z.object({ alertIds: z.array(z.string()), overrideToken: z.string() }).optional(),
  loyaltyRedeem: z.object({ points: z.number().int().min(1) }).optional(),
});

export const zSaleResponse = z.object({
  invoiceId: zUuid,
  invoiceNo: z.string(),
  total: z.string(),
  totalDiscount: z.string(),
  allocations: z.array(z.object({ lineNo: z.number(), batchId: z.string(), batchNumber: z.string(), qty: z.number() })),
  journalEntryId: z.string(),
  customerBalanceAfter: z.string().nullable(),
  loyaltyPointsEarned: z.number(),
  receipt: z.object({ printPayloadUrl: z.string() }),
});

export const zDurAlert = z.object({
  id: z.string(),
  severity: z.enum(["BLOCK", "WARN", "INFO"]),
  type: z.enum(["INTERACTION", "ALLERGY", "DUPLICATE_THERAPY"]),
  detail: z.string(),
  ruleId: z.string(),
});

/** Payment dialog form (client-side; cashReceived is presentational for change calc). */
export const zPaymentForm = z
  .object({
    method: z.enum(["CASH", "CARD", "CREDIT"]),
    cashReceived: z.string().regex(/^\d{0,9}(\.\d{0,2})?$/).optional().or(z.literal("")),
    withInstallments: z.boolean(),
    installmentCount: z.coerce.number().int().min(2).max(24).optional(),
    intervalDays: z.coerce.number().int().min(7).max(90).optional(),
    firstDueDate: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.method === "CREDIT" && v.withInstallments) {
      if (!v.installmentCount) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["installmentCount"], message: "حدد عدد الأقساط" });
      if (!v.intervalDays) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["intervalDays"], message: "حدد الفترة بين الأقساط" });
      if (!v.firstDueDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["firstDueDate"], message: "حدد تاريخ أول قسط" });
    }
  });
