import { z } from "zod";
import {
  zCreateSaleRequest, zDurAlert, zInstallmentPlan, zPaymentForm, zPaymentMethod, zSaleLine, zSaleResponse,
} from "./schemas";

export type PaymentMethod = z.infer<typeof zPaymentMethod>;
export type SaleLineInput = z.infer<typeof zSaleLine>;
export type InstallmentPlan = z.infer<typeof zInstallmentPlan>;
export type CreateSaleRequest = z.infer<typeof zCreateSaleRequest>;
export type SaleResponse = z.infer<typeof zSaleResponse>;
export type DurAlert = z.infer<typeof zDurAlert>;
export type PaymentFormValues = z.infer<typeof zPaymentForm>;
