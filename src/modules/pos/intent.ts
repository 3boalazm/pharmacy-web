"use client";
import { uuidv7 } from "@/lib/utils/uuid";

/**
 * مفتاح نية البيع (Idempotency) — يُشتق من محتوى السلة نفسه، ويُحفظ في sessionStorage.
 *
 * لماذا؟ لأن توليد المفتاح داخل دالة النداء يعني مفتاحًا جديدًا في كل محاولة، فيفقد
 * الخادم قدرته على منع التكرار. هنا: نفس السلة + نفس العميل = نفس المفتاح، حتى لو
 * أُغلقت نافذة الدفع أو أُعيد تحميل الصفحة أو انقطع الاتصال بعد أن سجّل الخادم الفاتورة.
 * أي تعديل في السلة ينتج بصمة مختلفة → نية جديدة → مفتاح جديد.
 */

const STORAGE_KEY = "pharmacy.pos.intent";

export interface IntentLine {
  medicineId: string;
  quantity: number;
  unitPrice: string;
  discount: { type: string; value: string } | null;
}

export interface IntentInput {
  lines: IntentLine[];
  invoiceDiscount: { type: string; value: string } | null;
  customerId: string | null;
  prescriptionId: string | null;
  redeemPoints: number;
}

/** بصمة حتمية (نفس المدخلات → نفس الناتج) لمحتوى نية البيع. */
export function cartFingerprint(input: IntentInput): string {
  return JSON.stringify({
    lines: input.lines.map((l) => ({
      id: l.medicineId,
      qty: l.quantity,
      price: l.unitPrice,
      discount: l.discount ? { type: l.discount.type, value: l.discount.value } : null,
    })),
    invoiceDiscount: input.invoiceDiscount ? { type: input.invoiceDiscount.type, value: input.invoiceDiscount.value } : null,
    customerId: input.customerId,
    prescriptionId: input.prescriptionId,
    redeemPoints: input.redeemPoints,
  });
}

/** يعيد مفتاح النية المطابق للبصمة، أو ينشئ واحدًا جديدًا ويحفظه. */
export function getIntentKey(fingerprint: string): string {
  if (typeof window === "undefined") return uuidv7();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { fp?: string; key?: string };
      if (saved.fp === fingerprint && typeof saved.key === "string" && saved.key.length >= 16) return saved.key;
    }
  } catch {
    /* تخزين غير متاح — نكمل بمفتاح في الذاكرة */
  }
  const key = uuidv7();
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ fp: fingerprint, key }));
  } catch {
    /* تجاهل */
  }
  return key;
}

/** تُمسح بعد نجاح البيع حتى لا تُعاد الاستجابة القديمة لسلة جديدة. */
export function clearIntentKey(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* تجاهل */
  }
}
