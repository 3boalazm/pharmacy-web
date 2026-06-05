import { z } from "zod";
import { zMoney } from "@/lib/zod/common";

export const zCustomerForm = z.object({
  name: z.string().min(2, "أدخل اسم العميل"),
  phone: z.string().min(8, "رقم هاتف صحيح"),
  creditLimit: zMoney,
  allergies: z.string().optional(), // comma-separated in the form; split before send
});
export type CustomerFormValues = z.infer<typeof zCustomerForm>;
