/**
 * API Contract §0.5 — money travels as string decimals (NUMERIC(19,4)). Never floats.
 * All arithmetic on the client is presentational only; the server is the source of truth.
 */
export type Money = string;

const fmt = new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: Money | null | undefined, currency = "ج.م"): string {
  if (value == null) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${fmt.format(n)} ${currency}`;
}

/** Presentational sums only (cart preview). Server recomputes authoritatively. */
export function previewAdd(...values: Money[]): Money {
  const cents = values.reduce((acc, v) => acc + Math.round(Number(v) * 10_000), 0);
  return (cents / 10_000).toFixed(4);
}
export function previewMul(value: Money, qty: number): Money {
  return ((Math.round(Number(value) * 10_000) * qty) / 10_000).toFixed(4);
}
