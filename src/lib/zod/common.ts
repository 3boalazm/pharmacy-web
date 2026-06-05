import { z } from "zod";

/** Money travels as string decimals NUMERIC(19,4) — never floats (Contract §0.5). */
export const zMoney = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,4})?$/, "قيمة نقدية غير صحيحة")
  .transform((v) => (v.includes(".") ? v : `${v}.0000`));

export const zUuid = z.string().uuid();

/** Discount DTO per Contract §5.1. */
export const zDiscount = z.object({
  type: z.enum(["PERCENT", "AMOUNT"]),
  value: z.string().regex(/^\d{1,9}(\.\d{1,4})?$/, "قيمة خصم غير صحيحة"),
});
export type Discount = z.infer<typeof zDiscount>;
