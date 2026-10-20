#!/usr/bin/env node
/**
 * تحقق نشر حقيقي — يغلق فجوة «نجح البناء ≠ الإعداد صحيح».
 *
 *   node scripts/verify-deployment.mjs https://pharmacy.example.com https://api.example.com
 *
 * يتحقق من:
 *  1) الصفحة تعمل وترويسات الأمان موجودة وقوية.
 *  2) CSP تسمح فعلًا بأصل الـ API المستخدم (connect-src) أو same-origin.
 *  3) الـ API يستجيب على /customers بـ 401 JSON (لا HTML) — دلالة على أن /api/v1 موصول.
 *  4) CORS preflight من أصل الواجهة إلى الـ API: Access-Control-Allow-Origin مطابق.
 *  5) لا وجود لمضيف API قديم/مثبت بالكود في سياسة الاتصال.
 *
 * يخرج بكود 1 عند أي فشل. لا يحتاج اعتماديات.
 */
const [, , frontendArg, apiArg] = process.argv;

if (!frontendArg) {
  console.error("الاستخدام: node scripts/verify-deployment.mjs <frontend-url> <api-base-url>");
  process.exit(2);
}

const frontend = frontendArg.replace(/\/+$/, "");
const api = (apiArg ?? "").replace(/\/+$/, "");
const failures = [];
const notes = [];
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => { failures.push(m); console.error(`  ✖ ${m}`); };

async function head(url, init) {
  try {
    return await fetch(url, { redirect: "manual", ...init });
  } catch (e) {
    return { error: e };
  }
}

console.log(`\n▶ الواجهة: ${frontend}`);
const page = await head(frontend);
if (page.error) bad(`تعذر الوصول للواجهة: ${page.error.message}`);
else {
  ok(`HTTP ${page.status}`);
  const h = page.headers;
  const csp = h.get("content-security-policy") ?? "";
  const checks = [
    ["content-security-policy", !!csp],
    ["frame-ancestors 'none' (أو XFO DENY)", /frame-ancestors\s+'none'/.test(csp) || h.get("x-frame-options") === "DENY"],
    ["object-src 'none'", /object-src\s+'none'/.test(csp)],
    ["base-uri محدّد", /base-uri\s+('self'|'none')/.test(csp)],
    ["x-content-type-options", h.get("x-content-type-options") === "nosniff"],
    ["strict-transport-security", !!h.get("strict-transport-security")],
    ["permissions-policy", !!h.get("permissions-policy")],
  ];
  for (const [label, pass] of checks) (pass ? ok : bad)(`ترويسة: ${label}`);

  const connect = (csp.match(/connect-src([^;]*)/)?.[1] ?? "").trim();
  notes.push(`connect-src = ${connect || "(غير محدّد — يرث default-src)"}`);

  if (api) {
    const apiOrigin = new URL(api).origin;
    if (connect.includes(apiOrigin)) ok(`CSP connect-src يسمح بأصل الـ API (${apiOrigin})`);
    else if (connect.includes("'self'") && api.startsWith(frontend)) ok("CSP same-origin + API تحت نفس الأصل");
    else bad(`CSP لا يسمح بأصل الـ API (${apiOrigin}). المتسلسلة الحالية: ${connect}`);
    // مضيف قديم مكتوب يدويًا = خطر انقطاع عند تغيير النشر
    if (/railway\.app/.test(connect) && !api.includes("railway.app")) {
      notes.push("تنبيه: CSP يحوي مضيف Railway قديمًا — يُفضَّل توليده من NEXT_PUBLIC_API_BASE_URL فقط.");
    }
  }
}

if (api) {
  console.log(`\n▶ الـ API: ${api}`);
  const probe = await head(`${api}/customers`, { headers: { Accept: "application/json" } });
  if (probe.error) bad(`تعذر الوصول للـ API: ${probe.error.message}`);
  else {
    const ct = probe.headers.get("content-type") ?? "";
    if ([401, 403].includes(probe.status) && ct.includes("json")) ok(`حماية الـ API تعمل (${probe.status} JSON)`);
    else bad(`المتوقع 401/403 JSON على /customers، وصل ${probe.status} (${ct || "بلا نوع"}) — قد يكون المسار غير موصول أو يعيد HTML`);
  }

  const pre = await head(`${api}/customers`, {
    method: "OPTIONS",
    headers: {
      Origin: frontend,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  if (pre.error) bad(`فشل CORS preflight: ${pre.error.message}`);
  else {
    const acao = pre.headers.get("access-control-allow-origin");
    const acac = pre.headers.get("access-control-allow-credentials");
    if (!acao) bad("لا توجد ترويسة Access-Control-Allow-Origin — المتصفح سيمنع الطلب من دومين الواجهة");
    else if (acao === frontend || acao === "*") ok(`CORS يسمح بمنشأ الواجهة (${acao})`);
    else bad(`CORS يسمح بـ ${acao} فقط، وليس ${frontend}`);
    if (acao && acao !== "*" && acac !== "true") {
      notes.push("CORS يعيد أصلًا محددًا بلا allow-credentials — مناسب لأن المصادقة Bearer وليست كوكيز.");
    }
    if (!(pre.headers.get("access-control-allow-headers") ?? "").toLowerCase().includes("authorization")) {
      notes.push("تنبيه: allow-headers لا يذكر authorization — قد تحتاجه بعض المتصفحات في preflight.");
    }
  }
}

if (notes.length) {
  console.log("\nملاحظات:");
  for (const n of notes) console.log(`  • ${n}`);
}

if (failures.length) {
  console.error(`\n✖ فشل التحقق (${failures.length}):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log("\n✔ إعدادات النشر متوافقة مع عنوان الـ API وسياسة CORS.\n");
