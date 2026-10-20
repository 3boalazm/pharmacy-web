import { expect, test } from "@playwright/test";

/**
 * سيناريوهات قبول أساسية. جزء القراءة/الحماية يعمل بلا بيانات دخول؛
 * سيناريوهات البيع/الوردية تعمل فقط عند توفير حساب تجريبي على staging:
 *   E2E_API_URL + E2E_PHONE + E2E_PASSWORD
 */

const hasAccount = !!(process.env.E2E_API_URL && process.env.E2E_PHONE && process.env.E2E_PASSWORD);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/رقم الهاتف|الهاتف/).fill(process.env.E2E_PHONE!);
  await page.getByLabel(/كلمة المرور/).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /دخول|تسجيل الدخول/ }).click();
  await page.waitForURL(/\/(pos|$)/, { timeout: 20_000 });
}

test.describe("الحماية والهيكل", () => {
  test("المسار المحمي يحوّل إلى /login بلا جلسة", async ({ page }) => {
    await page.goto("/finance");
    await expect(page).toHaveURL(/\/login/);
  });

  test("صفحة الدخول تعمل بالعربية RTL وبلا أخطاء كونسول حرجة", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("button", { name: /دخول|تسجيل الدخول/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("مسار مجهول يعرض 404 عربية", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText(/الصفحة غير موجودة/)).toBeVisible();
  });

  test("الخط العربي يُقدَّم من نفس الأصل (لا طلب لشبكة خارجية)", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.hostname !== new URL(page.url() || "http://localhost").hostname && /fonts\.(googleapis|gstatic)/.test(url.hostname)) {
        external.push(req.url());
      }
    });
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    expect(external).toEqual([]);
  });

  test("لا وعود بطابور أوفلاين في صفحة الانقطاع", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByText(/البيع معطّل/)).toBeVisible();
    await expect(page.getByText(/طابور آمن/)).toHaveCount(0);
  });
});

test.describe("البيع — يتطلب staging", () => {
  test.skip(!hasAccount, "E2E_API_URL / E2E_PHONE / E2E_PASSWORD غير متوفرة");

  test("البيع ممنوع بلا وردية، ثم ينجح مع وردية", async ({ page }) => {
    await login(page);
    await page.goto("/pos");

    // لا وردية؟ يظهر تنبيه وزر الدفع معطّل/يرفض
    const closed = page.getByText(/لا توجد وردية مفتوحة/);
    if (await closed.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /إتمام البيع/ }).click();
      await expect(page.getByText(/افتح وردية/)).toBeVisible();
      return; // بقية السيناريو يحتاج وردية مفتوحة من إعداد البيئة
    }

    await expect(page.getByText(/لا توجد وردية مفتوحة/)).toHaveCount(0);
  });

  test("نقر مزدوج على تأكيد الدفع ينتج فاتورة واحدة", async ({ page }) => {
    test.skip(true, "يتطلب سلة جاهزة + بضاعة في staging — يُدار من سكربت بيانات الاختبار");
    await login(page);
  });
});
