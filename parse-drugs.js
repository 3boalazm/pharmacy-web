const fs = require('fs');
const XLSX = require('xlsx');
const { OpenAI } = require('openai');
// Load environment variables from .env if present (do NOT commit .env)
require('dotenv').config();

// Use OPENAI_API_KEY from environment. Do NOT hardcode secrets in source.
if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is not set. Create a .env file with OPENAI_API_KEY=your_key and do not commit it.");
    process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_FILE = "الاصناف.xlsx";
const OUTPUT_FILE = "الاصناف_المعدلة.xlsx";
const BATCH_SIZE = 20;

const SYSTEM_PROMPT = `
You are a precise medical data extraction system. Your task is to analyze Egyptian pharmaceutical brand names and return their accurate medical data in a structured JSON format.
Strict Rules:
1. "Zero-Hallucination Policy": If the brand name is heavily misspelled, ambiguous, or you are not 100% sure, set fields to null and write a note in 'ai_notes'.
2. Return ONLY a JSON object containing a list named 'results'. No markdown blocks.
Expected JSON Output Format:
{
  "results": [
    {
      "original_name": "اسم الصنف",
      "corrected_arabic_name": "الاسم العربي الصحيح أو null",
      "english_name": "English Name or null",
      "primary_category": "Tablets / Capsules / Syrup / Drops / Suppositories / Injections / Topical / Spray / null",
      "therapeutic_class": ["Antibiotics", "Analgesic", "Vitamins", etc. or null],
      "active_ingredients": [{"name": "Cefadroxil", "strength": "750mg"}],
      "manufacturer": "Company or null",
      "attributes": { "is_child_friendly": true/false, "availability": "OTC"/"Prescription", "controlled": "Normal"/"Controlled", "origin": "Imported"/"Local" },
      "ai_notes": "Valid or reason for review"
    }
  ]
}
`;

async function main() {
    console.log(`🔄 جاري قراءة الملف: ${INPUT_FILE}...`);
    const workbook = XLSX.readFile(INPUT_FILE);
    const sheetName = workbook.SheetNames[0]; // Sheet1
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    // فلترة الأصناف اللي ليها اسم
    const items = rawData.filter(row => row['اسم الصنف']).map(row => ({
        original_name: row['اسم الصنف'].toString().trim(),
        reported_type: row['النوع'] ? row['النوع'].toString().trim() : ''
    }));

    console.log(`🎯 تم العثور على ${items.length} صنف.`);
    const finalResults = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        console.log(`⏳ معالجة مجموعة الأدوية من ${i} إلى ${Math.min(i + BATCH_SIZE, items.length)}...`);

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Analyze: ${JSON.stringify(batch)}` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.0
            });

            const data = JSON.parse(response.choices[0].message.content);
            const results = data.results || [];

            results.forEach(out => {
                finalResults.push({
                    "اسم الصنف الأصلي": out.original_name,
                    "الاسم العربي المصحح": out.corrected_arabic_name,
                    "الاسم الإنجليزي": out.english_name,
                    "شكل الجرعة (Primary)": out.primary_category,
                    "الغرض العلاجي (Therapeutic)": out.therapeutic_class ? out.therapeutic_class.join(", ") : null,
                    "المادة الفعالة": out.active_ingredients ? out.active_ingredients.map(ing => `${ing.name} (${ing.strength})`).join(", ") : null,
                    "الشركة المصنعة": out.manufacturer,
                    "مناسب للأطفال": out.attributes?.is_child_friendly,
                    "تصنيف الصرف": out.attributes?.availability,
                    "جدول أم عادي": out.attributes?.controlled,
                    "مستورد أم محلي": out.attributes?.origin,
                    "ملاحظات الـ AI": out.ai_notes
                });
            });
        } catch (err) {
            console.error(`❌ خطأ في المجموعة: ${err.message}`);
            batch.forEach(b => finalResults.push({ "اسم الصنف الأصلي": b.original_name, "ملاحظات الـ AI": "Error API" }));
        }
    }

    // حفظ في ملف إكسيل جديد
    const newSheet = XLSX.utils.json_to_sheet(finalResults);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "الاصناف المعدلة");
    XLSX.writeFile(newWorkbook, OUTPUT_FILE);
    console.log(`🎉 تم بنجاح! الملف الجديد جاهز باسم: ${OUTPUT_FILE}`);
}

main();