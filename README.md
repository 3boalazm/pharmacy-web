# Pharmacy SaaS — Web Frontend (Next.js)

Production frontend for the Pharmacy SaaS platform. Implements — without deviation — the
**CTO Architecture Decision Document v1.0** and **API Contract Specification v1.0**.

## Stack
Next.js 14 (App Router) · TypeScript strict · Tailwind (token-driven) · TanStack Query · Zustand (POS cart only) · Cairo typeface · Arabic RTL.

## Module structure (mirrors backend bounded contexts)

```
src/
├─ app/                  # Routes only — thin pages that compose module facades
│  ├─ (auth)/login
│  └─ (app)/             # Auth-guarded shell (sidebar per design system)
│     ├─ pos/  ├─ inventory/ (+ /grn)  ├─ customers/ (+ /[id])  └─ page (dashboard)
├─ modules/              # Bounded contexts — STRICT boundaries
│  ├─ catalog/           # read facade: medicine search (used by POS & GRN)
│  ├─ pos/               # cart store, POST /sales, DUR gate, payment panel
│  ├─ inventory/         # stock, FEFO batches, GRN posting
│  └─ customers/         # CRM + customer ledger statement + payments
├─ components/ui/        # Design-system kit (tokens only — no module logic)
├─ components/layout/    # Sidebar / Topbar shell
└─ lib/                  # api client (envelope, errors, Idempotency-Key), auth, money, uuidv7
```

### Boundary rules (enforced by `npm run boundaries` — dependency-cruiser)
1. A module imports another module **only through its `index.ts` facade** (e.g., POS uses
   `@/modules/customers` → `searchCustomers`, never its internals).
2. `components/ui` may never import from `modules/` — the design system stays generic.
3. Pages in `app/` compose facades; they contain no business logic.

### Contract-compliance highlights
- **Money is `string` end-to-end** (NUMERIC(19,4)); client math is preview-only — the server total is authoritative.
- **`Idempotency-Key` (uuidv7)** sent on every financial/inventory POST (`/sales`, `/finance/payments`, `/inventory/grn`).
- **`pharmacy_id` never leaves the client** — tenancy lives in the JWT (Contract §0.1).
- **Error codes drive UX:** `DUR_BLOCK` → pharmacist PIN-elevation modal (`/auth/pin-elevate` → retry with `durOverride`);
  `INSUFFICIENT_STOCK`, `CREDIT_LIMIT_EXCEEDED`, `EXPIRED_BATCH_BLOCKED` → typed toasts.
- **Customer balance is read-only** — rendered from `GET /finance/ar/:id/statement`; there is no UI path that writes a balance.
- **No localStorage for domain data**; session token in `sessionStorage` only.

## Run
```bash
cp .env.example .env.local   # point API_PROXY_TARGET at the NestJS monolith
npm install
npm run dev                  # http://localhost:3001 (Next) → proxies /api/v1 to backend
npm run boundaries           # verify module-boundary rules
```

## Design system
Tokens live in `src/app/globals.css` only (green #16A34A primary, paper/ink neutrals,
8px grid, radii 8/12px, Cairo, tabular numerals for all money/quantities). Components must
consume tokens via Tailwind theme — hard-coded colors fail review.


## PWA (تثبيت على Android / iPhone / Windows / macOS)
- `public/manifest.webmanifest` — الاسم والأيقونات (any + maskable) واختصارات POS/العملاء/المخزون، RTL.
- `public/sw.js` — Service worker مكتوب يدويًا وقابل للمراجعة:
  - **قاعدة صارمة: `/api/*` لا يُكاش أبدًا** — الفلوس والمخزون لا يُقدَّمان من نسخة قديمة؛
    الأوفلاين للكتابة محلول في طبقة التطبيق (طابور أوامر بمفاتيح uuidv7 → `/sales/sync`).
  - التنقّل: network-first مع صفحة `/offline` كبديل · أصول البناء والأيقونات والخطوط: cache-first.
  - جاهز للإشعارات: معالجا `push` و`notificationclick` (عقد الحمولة: `{title, body, url}`).
- زر **تثبيت التطبيق** يظهر تلقائيًا (Chromium)، وتلميح «إضافة إلى الشاشة الرئيسية» على iOS.

## نشر مجاني للبداية
| الطبقة | الخدمة | ملاحظات |
|---|---|---|
| Frontend | Vercel Free | اضبط `NEXT_PUBLIC_API_BASE_URL` على رابط الـ API الكامل |
| Backend | Render/Koyeb Free | اضبط `CORS_ORIGIN` على دومين Vercel · **تنبيه:** الخطة المجانية تنام بعد الخمول — أول طلب صباحي بطيء، وطابور POS الأوفلاين يغطي الانقطاع لكن ليس بطء الإيقاظ |
| Database | Neon Free | `DATABASE_URL` (مع pooler) ثم `prisma migrate deploy` + ملف `001_invariants.sql` |
| Redis | اختياري | بدونها يعمل النظام بكامل صحته (وضع متدهور موثَّق) |
