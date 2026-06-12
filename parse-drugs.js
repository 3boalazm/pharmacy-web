const fs = require("fs");
const XLSX = require("xlsx");
const { OpenAI } = require("openai");
require("dotenv").config();

const INPUT_FILE = "الاصناف.xlsx";
const OUTPUT_FILE = "الاصناف_المعدلة.xlsx";
const BATCH_SIZE = 20;

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("ERROR: OPENAI_API_KEY is not set. Create a .env file with OPENAI_API_KEY=your_key and do not commit it.");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

const SYSTEM_PROMPT = `You are a precise medical data extraction system. Your task is to analyze Egyptian pharmaceutical brand names and return accurate structured medical data.

Strict Rules:
1. Zero-Hallucination Policy: If the brand name is heavily misspelled, ambiguous, or you are not 100% sure, set fields to null and write a short note in ai_notes.
2. Return ONLY a JSON object with a top-level list named results. Do NOT include markdown fences, extraneous text, or any explanation.

Expected JSON output:
{
  "results": [
    {
      "original_name": "اسم الصنف",
      "corrected_arabic_name": "الاسم العربي الصحيح أو null",
      "english_name": "English Name or null",
      "primary_category": "Tablets / Capsules / Syrup / Drops / Suppositories / Injections / Topical / Spray / null",
      "therapeutic_class": ["Antibiotics", "Analgesic", "Vitamins", "Painkiller", "Anti-inflammatory", "Bronchodilator", "Antihistamine", "Gastrointestinal", "Cardiovascular", "Dermatological", "Respiratory", "Hormonal", "Vitamins", "Supplements", "Antidiabetic", "Antihypertensive", "null"],
      "active_ingredients": [{ "name": "Cefadroxil", "strength": "750mg" }],
      "manufacturer": "Company or null",
      "attributes": { "is_child_friendly": true, "availability": "OTC", "controlled": "Normal", "origin": "Imported" },
      "ai_notes": "Valid or reason for review"
    }
  ]
}
`;

function cleanJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return text;
  return text.slice(start, end + 1);
}

async function parseWorkbook() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(INPUT_FILE);
  const sheetName = workbook.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  const items = rawRows
    .map((row) => ({
      original_name: String(row["اسم الصنف"] || row["الاسم التجاري"] || "").trim(),
      reported_type: String(row["النوع"] || row["الشكل"] || "").trim(),
    }))
    .filter((item) => item.original_name.length > 0);

  console.log(`🔄 Found ${items.length} medicines in ${INPUT_FILE}`);

  const finalResults = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`⏳ Processing batch ${i + 1}-${Math.min(i + BATCH_SIZE, items.length)}...`);

    const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this batch and return only JSON. Batch:${JSON.stringify(batch, null, 2)}`;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this batch of medicine names and return only JSON with the exact schema.` },
          { role: "user", content: JSON.stringify(batch, null, 2) },
        ],
        temperature: 0.0,
        max_tokens: 1500,
      });

      const raw = response.choices?.[0]?.message?.content;
      if (!raw) throw new Error("Empty model response");

      const jsonText = cleanJson(String(raw));
      const data = JSON.parse(jsonText);
      const results = Array.isArray(data.results) ? data.results : [];

      if (!results.length) {
        throw new Error("No results returned from model");
      }

      results.forEach((out) => {
        finalResults.push({
          "اسم الصنف الأصلي": out.original_name ?? null,
          "الاسم العربي المصحح": out.corrected_arabic_name ?? null,
          "الاسم الإنجليزي": out.english_name ?? null,
          "شكل الجرعة (Primary)": out.primary_category ?? null,
          "الغرض العلاجي (Therapeutic)": Array.isArray(out.therapeutic_class)
            ? out.therapeutic_class.join(", ")
            : out.therapeutic_class ?? null,
          "المادة الفعالة": Array.isArray(out.active_ingredients)
            ? out.active_ingredients
                .map((ing) => `${ing.name || ""}${ing.strength ? ` (${ing.strength})` : ""}`.trim())
                .filter(Boolean)
                .join(", ")
            : null,
          "الشركة المصنعة": out.manufacturer ?? null,
          "مناسب للأطفال": out.attributes?.is_child_friendly ?? null,
          "تصنيف الصرف": out.attributes?.availability ?? null,
          "جدول أم عادي": out.attributes?.controlled ?? null,
          "مستورد أم محلي": out.attributes?.origin ?? null,
          "ملاحظات الـ AI": out.ai_notes ?? null,
        });
      });
    } catch (error) {
      console.error(`❌ Batch ${i + 1}-${Math.min(i + BATCH_SIZE, items.length)} failed: ${error.message || error}`);
      batch.forEach((item) => {
        finalResults.push({
          "اسم الصنف الأصلي": item.original_name,
          "الاسم العربي المصحح": null,
          "الاسم الإنجليزي": null,
          "شكل الجرعة (Primary)": null,
          "الغرض العلاجي (Therapeutic)": null,
          "المادة الفعالة": null,
          "الشركة المصنعة": null,
          "مناسب للأطفال": null,
          "تصنيف الصرف": null,
          "جدول أم عادي": null,
          "مستورد أم محلي": null,
          "ملاحظات الـ AI": "Error processing batch",
        });
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  const sheet = XLSX.utils.json_to_sheet(finalResults);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "الاصناف المعدلة");
  XLSX.writeFile(workbook, OUTPUT_FILE);

  console.log(`🎉 Done! Output written to ${OUTPUT_FILE}`);
}

parseWorkbook().catch((error) => {
  console.error("ERROR:", error);
  process.exit(1);
});
