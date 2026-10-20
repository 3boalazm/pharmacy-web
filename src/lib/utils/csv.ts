/** أدوات CSV آمنة: BOM للعربية + تهريب علامات الصيغ (CSV/Formula Injection). */

export type CsvValue = string | number | null | undefined;

/**
 * خلية CSV واحدة.
 * - تقتبس كل القيم وتهرّب علامات التنصيص.
 * - تمنع تنفيذ الصيغ في Excel/LibreOffice: أي نص يبدأ بـ = + - @ TAB CR يُسبق بفاصلة عليا.
 * - الأرقام الحقيقية لا تُلمس (حتى لا تتحول −5 إلى نص).
 */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '""';
  const raw = String(value);
  const numeric = typeof value === "number" || /^-?\d+(?:\.\d+)?$/.test(raw.trim());
  const guarded = !numeric && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** يبني ملف CSV كاملًا مع BOM (ليسهل فتحه بالعربية في Excel). */
export function toCsv(headers: CsvValue[], rows: CsvValue[][]): string {
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
