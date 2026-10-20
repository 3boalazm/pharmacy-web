import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("يهرّب علامات التنصيص", () => {
    expect(csvCell('صنف "خاص"')).toBe('"صنف ""خاص"""');
  });

  it("يمنع صيغ Excel الخطرة", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+1+1")).toBe('"\'+1+1"');
    expect(csvCell("-cmd")).toBe('"\'-cmd"');
    expect(csvCell("@SUM(A1)")).toBe('"\'@SUM(A1)"');
  });

  it("لا يلمس الأرقام (بما فيها السالبة)", () => {
    expect(csvCell(-5)).toBe('"-5"');
    expect(csvCell(-5.25)).toBe('"-5.25"');
    expect(csvCell("-5.25")).toBe('"-5.25"');
  });

  it("يتعامل مع الفراغات", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell("")).toBe('""');
  });
});

describe("toCsv", () => {
  it("يبدأ بـ BOM ويضم العناوين", () => {
    const out = toCsv(["الاسم", "المبلغ"], [["أحمد", 12.5]]);
    expect(out.startsWith("\uFEFF")).toBe(true);
    expect(out).toContain('"الاسم","المبلغ"');
    expect(out).toContain('"أحمد","12.5"');
  });
});
