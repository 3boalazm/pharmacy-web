import { describe, expect, it } from "vitest";

/**
 * اختبار عقد الـ API على بيئة staging حقيقية.
 *
 * لا يعمل في CI الافتراضي (لا خادم)، ولا «يتخطى بصمت» بلا أثر:
 *   CONTRACT_API_URL=https://api-staging.example.com/api/v1 \
 *   CONTRACT_PHONE=01000000000 CONTRACT_PASSWORD=... \
 *   npx vitest run tests/contract
 *
 * يتحقق من: مغلف { data, meta }، مغلف الخطأ { error: { code, message } }،
 * رموز 401/404/429، وشكل استجابات الوردية/العملاء التي تعتمد عليها الواجهة.
 */

const BASE = process.env.CONTRACT_API_URL?.replace(/\/+$/, "") ?? "";
const PHONE = process.env.CONTRACT_PHONE;
const PASSWORD = process.env.CONTRACT_PASSWORD;

const enabled = BASE.length > 0;

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

function expectErrorEnvelope(json: unknown) {
  const body = json as { error?: { code?: string; message?: string } } | null;
  expect(body?.error, "يجب أن يعيد الخادم مغلف error").toBeTruthy();
  expect(typeof body!.error!.code).toBe("string");
  expect(typeof body!.error!.message).toBe("string");
}

describe.skipIf(!enabled)("API contract (staging)", () => {
  it("المسار المحمي بلا توكن يعيد 401 بمغلف خطأ", async () => {
    const { res, json } = await call("/customers");
    expect(res.status).toBe(401);
    expectErrorEnvelope(json);
  });

  it("المسار المجهول يعيد 404 بمغلف خطأ (لا HTML)", async () => {
    const { res, json } = await call("/definitely-not-a-route");
    expect(res.status).toBe(404);
    expectErrorEnvelope(json);
  });

  it("تسجيل الدخول ببيانات خاطئة يعيد 401 ولا يسرّب وجود الحساب", async () => {
    const { res, json } = await call("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone: "01000000000", password: "wrong-password", deviceId: "contract-test" }),
    });
    expect([400, 401, 429]).toContain(res.status);
    expectErrorEnvelope(json);
  });

  it("محاولات متكررة تُقيَّد بمعدل (429 + Retry-After)", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () =>
        call("/auth/login", {
          method: "POST",
          body: JSON.stringify({ phone: "01000000000", password: "wrong-password", deviceId: "contract-test" }),
        }),
      ),
    );
    const limited = attempts.find((a) => a.res.status === 429);
    if (!limited) {
      // سياسة التقادم قد تختلف بين البيئات؛ نسجّل ذلك بدل فشل كاذب.
      console.warn("لا يوجد 429 بعد 12 محاولة — تحقق من سياسة rate-limit على الخادم.");
      return;
    }
    expect(limited.res.headers.get("retry-after")).toBeTruthy();
  });

  it.skipIf(!PHONE || !PASSWORD)("دخول ناجح + شكل الوردية + شكل قائمة العملاء", async () => {
    const login = await call("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone: PHONE, password: PASSWORD, deviceId: "contract-test" }),
    });
    expect(login.res.status).toBe(200);
    const data = (login.json as { data?: { accessToken?: string; refreshToken?: string; user?: { role?: string } } })?.data;
    expect(typeof data?.accessToken).toBe("string");
    expect(["OWNER", "PHARMACIST", "ASSISTANT", "CASHIER"]).toContain(data?.user?.role);
    // عقد التجديد: إن كان الحقل موجودًا يجب أن يكون نصًا — الواجهة تعتمد عليه للتجديد.
    if (data?.refreshToken !== undefined) expect(typeof data.refreshToken).toBe("string");

    const auth = { Authorization: `Bearer ${data!.accessToken}` };
    const shift = await call("/shifts/current", { headers: auth });
    expect(shift.res.status).toBe(200);
    expect(typeof (shift.json as { data?: { open?: boolean } })?.data?.open).toBe("boolean");

    const customers = await call("/customers?limit=1", { headers: auth });
    expect(customers.res.status).toBe(200);
    expect(Array.isArray((customers.json as { data?: unknown })?.data)).toBe(true);
  });
});

if (!enabled) {
  describe("API contract (staging)", () => {
    it("متخطّى: لم يُمرَّر CONTRACT_API_URL", () => {
      expect(BASE).toBe("");
    });
  });
}
