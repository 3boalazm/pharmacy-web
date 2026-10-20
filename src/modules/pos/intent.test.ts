import { describe, expect, it } from "vitest";
import { cartFingerprint, type IntentInput } from "./intent";

const base: IntentInput = {
  lines: [{ medicineId: "med-1", quantity: 1, unitPrice: "10.0000", discount: null }],
  invoiceDiscount: null,
  customerId: null,
  prescriptionId: null,
  redeemPoints: 0,
};

describe("cartFingerprint", () => {
  it("ثابتة لنفس النية", () => {
    expect(cartFingerprint(base)).toBe(cartFingerprint({ ...base }));
  });

  it("تتغير عند تغيير الكمية أو السعر أو العميل أو النقاط", () => {
    const variants: IntentInput[] = [
      { ...base, lines: [{ ...base.lines[0], quantity: 2 }] },
      { ...base, lines: [{ ...base.lines[0], unitPrice: "11.0000" }] },
      { ...base, customerId: "cust-1" },
      { ...base, redeemPoints: 10 },
      { ...base, invoiceDiscount: { type: "AMOUNT", value: "5" } },
      { ...base, prescriptionId: "rx-1" },
    ];
    const seen = new Set(variants.map(cartFingerprint));
    expect(seen.size).toBe(variants.length);
    expect(seen.has(cartFingerprint(base))).toBe(false);
  });

  it("تتضمن خصم السطر", () => {
    const withDiscount = {
      ...base,
      lines: [{ ...base.lines[0], discount: { type: "PERCENT", value: "5" } }],
    };
    expect(cartFingerprint(withDiscount)).not.toBe(cartFingerprint(base));
  });
});
