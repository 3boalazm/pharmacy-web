/**
 * Tax policy (single source).
 * Architecture §0: no tax invoices for the launch market today; ETA e-invoicing is a v1.1
 * integration. The API contract therefore carries NO tax fields and the server total is
 * tax-exclusive. The POS summary still renders a tax row, computed from this rate, so the
 * UI is VAT-ready: enabling ETA later means changing this constant + contract v1.1 — no
 * component changes. While the rate is 0 the displayed total equals the server total.
 */
export const TAX_RATE = 0; // e.g. 0.14 when ETA e-invoicing is enabled
export const TAX_LABEL = "ضريبة القيمة المضافة";
export const TAX_EXEMPT_LABEL = "معفاة";
