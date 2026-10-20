import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiException, qs } from "./http";

/** بديل fetch قابل للتحكم: لا شبكة حقيقية في الاختبارات. */
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // لا نريد أي تحويل فعلي أثناء الاختبارات
  vi.stubGlobal("window", { location: { pathname: "/pos", search: "" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("api client — transport failures", () => {
  it("يحوّل فشل الشبكة إلى ApiException مصنّف (لا TypeError خام)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api("/sales", { method: "POST", token: null })).rejects.toMatchObject({
      status: 0,
      isNetwork: true,
      error: { code: "NETWORK_ERROR" },
    });
  });

  it("يميّز انتهاء المهلة عن فشل الشبكة", async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    );
    await expect(
      api("/reports/top-medicines", { token: null, timeoutMs: 10 }),
    ).rejects.toMatchObject({ status: 0, error: { code: "NETWORK_TIMEOUT" } });
  });

  it("لا يرمي SyntaxError عندما تعيد البوابة HTML", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }),
    );
    const err = await api("/sales", { token: null }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiException);
    expect(err.status).toBe(502);
    expect(err.error.code).toBe("HTTP_502");
  });

  it("يرفض استجابة 200 غير JSON بدل اعتبارها نجاحًا", async () => {
    fetchMock.mockResolvedValue(new Response("<html>login</html>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(api("/customers", { token: null })).rejects.toMatchObject({ error: { code: "BAD_RESPONSE" } });
  });
});

describe("api client — response contract", () => {
  it("يفكّ مغلف { data } ويعيد 204 كنجاح بلا جسم", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: "x" } }));
    await expect(api<{ id: string }>("/customers", { token: null })).resolves.toMatchObject({ data: { id: "x" } });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api("/alerts/1/ack", { method: "POST", token: null })).resolves.toEqual({ data: undefined });
  });

  it("يحفظ requestId من الترويسة داخل الخطأ", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "بيانات غير صحيحة" } }), {
        status: 422,
        headers: { "content-type": "application/json", "x-request-id": "req-123" },
      }),
    );
    const err = await api("/sales", { token: null }).catch((e) => e);
    expect(err.error.requestId).toBe("req-123");
  });

  it("يقرأ Retry-After رقميًا عند 429", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "slow down" } }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "30" },
      }),
    );
    const err = await api("/auth/login", { method: "POST", token: null }).catch((e) => e);
    expect(err.retryAfter).toBe(30);
  });

  it("يرسل Idempotency-Key وX-Override-Approved كما هي", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await api("/sales", { method: "POST", token: "t", idempotencyKey: "key-1", overrideToken: "ov-1" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("key-1");
    expect(headers["X-Override-Approved"]).toBe("ov-1");
  });
});

describe("qs", () => {
  it("يتجاهل الفراغات ولا يضيف ? فارغة", () => {
    expect(qs({ a: "1", b: undefined, c: "" })).toBe("?a=1");
    expect(qs({})).toBe("");
  });
});
