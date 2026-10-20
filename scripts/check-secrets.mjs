#!/usr/bin/env node
/**
 * فحص أسرار مبدئي بلا اعتماديات خارجية — يُشغَّل في CI محليًا.
 * (ليس بديلًا عن GitHub Secret Scanning/gitleaks، لكنه يمنع أشهر التسريبات.)
 *
 * يفشل عند وجود: مفاتيح OpenAI/AWS/GitHub/Slack/Google، مفاتيح خاصة،
 * أو كلمات مرور داخل روابط اتصال قواعد البيانات.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const MAX_BYTES = 1_500_000; // تجاهل الملفات الضخمة/الثنائية
const SKIP = [
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
  /package-lock\.json$/,
  /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip|xlsx?|mp4)$/i,
  /(^|\/)audit\//, // تقارير قد تحتوي أمثلة توضيحية
];

const RULES = [
  { name: "OpenAI key", re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
  { name: "Private key block", re: /-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----/g },
  { name: "Postgres URL with password", re: /postgres(?:ql)?:\/\/[^\s:@/"']+:[^\s@/"']+@/g },
];

/** أدلة شرعية ليست أسرارًا (توكنات وهمية في اختبارات/أمثلة). */
const ALLOW = [
  /YOUR_|EXAMPLE|placeholder|xxx+|\*\*\*/i,
  /sk-test|test-token|fake/i,
];

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((f) => !SKIP.some((re) => re.test(f)));

const findings = [];

for (const file of files) {
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    continue;
  }
  if (size > MAX_BYTES) continue;

  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\u0000")) continue; // ثنائي

  const lines = content.split(/\r?\n/);
  for (const rule of RULES) {
    lines.forEach((line, i) => {
      rule.re.lastIndex = 0;
      const match = rule.re.exec(line);
      if (!match) return;
      if (ALLOW.some((a) => a.test(match[0]))) return;
      findings.push({ file, line: i + 1, rule: rule.name, sample: `${match[0].slice(0, 12)}…` });
    });
  }
}

if (findings.length) {
  console.error("✖ أسرار محتملة داخل الملفات المتتبعة:\n");
  for (const f of findings) console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.sample}`);
  console.error("\nأزل السر، أبطِله من المصدر، ثم أعد كتابة التاريخ إن لزم.");
  process.exit(1);
}

console.log(`✔ فحص الأسرار: ${files.length} ملفًا بلا نتائج.`);
