import { describe, expect, it } from "vitest";
import { cartTotals, clampRedeemPoints, maxRedeemablePoints, redeemValue } from "./totals";

const line = (price: string, qty: number, discount: { type: "PERCENT" | "AMOUNT"; value: string } | null = null) => ({
  unitPrice: price,
  quantity: qty,
  discount,
});

describe("cartTotals", () => {
  it("يجمع السطور ويحسب الخصم النسبي بدقة", () => {
    const t = cartTotals([line("100.0000", 2, { type: "PERCENT", value: "10" })], null);
    expect(t.subtotal).toBe("200.0000");
    expect(t.lineDiscounts).toBe("20.0000");
    expect(t.total).toBe("180.0000");
    expect(t.tax).toBe("0.0000");
  });

  it("يحسب خصم الفاتورة على الصافي بعد خصومات السطور", () => {
    const t = cartTotals(
      [line("100.0000", 1, { type: "AMOUNT", value: "10" })],
      { type: "PERCENT", value: "10" },
    );
    expect(t.invoiceDiscount).toBe("9.0000");
    expect(t.total).toBe("81.0000");
    expect(t.totalDiscount).toBe("19.0000");
  });

  it("لا يسمح بإجمالي سالب عند خصم أكبر من القيمة", () => {
    const t = cartTotals([line("50.0000", 1)], { type: "AMOUNT", value: "80" });
    expect(t.total).toBe("0.0000");
  });

  it("يحافظ على 4 خانات عشرية كما يتوقع الخادم", () => {
    const t = cartTotals([line("0.1000", 3)], null);
    expect(t.total).toBe("0.3000");
  });
});

describe("loyalty redemption", () => {
  it("قيمة النقطة 10 قروش", () => {
    expect(redeemValue(10)).toBe(1);
    expect(redeemValue(1)).toBe(0.1);
    expect(redeemValue(123)).toBe(12.3);
  });

  it("لا تتجاوز النقاط قيمة الفاتورة", () => {
    expect(maxRedeemablePoints("50.0000")).toBe(500);
    expect(maxRedeemablePoints("0")).toBe(0);
    expect(clampRedeemPoints(10_000, 10_000, "50.0000")).toBe(500);
  });

  it("لا تتجاوز رصيد العميل", () => {
    expect(clampRedeemPoints(400, 300, "50.0000")).toBe(300);
    expect(clampRedeemPoints(-5, 300, "50.0000")).toBe(0);
    expect(clampRedeemPoints(Number.NaN, 300, "50")).toBe(0);
  });
});
