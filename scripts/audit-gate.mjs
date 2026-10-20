#!/usr/bin/env node
/**
 * بوابة اعتماديات: تفشل على أي ثغرة critical/high في تبعيات الإنتاج،
 * إلا ما هو مسجّل صراحةً في .audit-allowlist.json مع سبب وتاريخ انتهاء.
 *
 * الهدف: «npm audit» لا يمكن أن يبقى فحصًا يدويًا يُنسى، ولا أن يتحول إلى
 * إنذار دائم يُتجاهل. كل استثناء له مالك وتاريخ.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const ALLOWLIST_FILE = ".audit-allowlist.json";
const FAIL_ON = new Set(["critical", "high"]);

function runAudit() {
  try {
    return JSON.parse(execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8" }));
  } catch (err) {
    // npm audit يخرج بكود != 0 عند وجود ثغرات، لكنه يطبع JSON صالحًا على stdout
    const out = err?.stdout?.toString?.() ?? "";
    if (!out.trim()) throw err;
    return JSON.parse(out);
  }
}

const allow = existsSync(ALLOWLIST_FILE)
  ? JSON.parse(readFileSync(ALLOWLIST_FILE, "utf8")).allow ?? []
  : [];
const today = new Date().toISOString().slice(0, 10);

const allowByName = new Map(allow.map((a) => [a.package, a]));
const report = runAudit();
const vulns = report.vulnerabilities ?? {};

const blocking = [];
const allowed = [];
const warnings = [];
const stale = [];

for (const [name, v] of Object.entries(vulns)) {
  const severity = v.severity;
  if (!FAIL_ON.has(severity)) {
    warnings.push(`${name} (${severity})`);
    continue;
  }
  const entry = allowByName.get(name);
  if (entry) {
    if (entry.expires && entry.expires < today) {
      stale.push(`${name} — انتهى استثناؤه في ${entry.expires}`);
      blocking.push(`${name} (${severity})`);
    } else {
      allowed.push(`${name} (${severity}) — ${entry.reason ?? "بلا سبب مذكور"}`);
    }
  } else {
    blocking.push(`${name} (${severity})`);
  }
}

// استثناءات لم تعد مطلوبة = تنظيف مطلوب، لا فشل
const active = new Set(Object.keys(vulns));
for (const a of allow) if (!active.has(a.package)) stale.push(`${a.package} — لم تبقَ له ثغرة، احذف الاستثناء`);

console.log(`فحص الإنتاج: ${Object.keys(vulns).length} ثغرة معلنة.`);
if (allowed.length) {
  console.log("\nاستثناءات موثّقة (مسموحة مؤقتًا):");
  for (const a of allowed) console.log(`  • ${a}`);
}
if (warnings.length) console.log(`\nمنخفض/متوسط (لا يمنع): ${warnings.join(", ")}`);
if (stale.length) {
  console.log("\nملاحظات على قائمة الاستثناءات:");
  for (const s of stale) console.log(`  ! ${s}`);
}

if (blocking.length) {
  console.error("\n✖ ثغرات حرجة/عالية غير مسموحة:");
  for (const b of blocking) console.error(`  • ${b}`);
  console.error("\nحدّث الحزمة أو أضف استثناءً مؤقتًا بسبب وتاريخ في .audit-allowlist.json.");
  process.exit(1);
}

console.log("\n✔ لا ثغرات حرجة/عالية غير مسموحة في تبعيات الإنتاج.");
