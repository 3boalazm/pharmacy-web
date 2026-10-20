import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRecovery, stashRecovery, takeRecovery } from "./recovery";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
}

const storage = new MemoryStorage();
const session = (id: string) => JSON.stringify({ accessToken: "token-abcdefgh", user: { id, name: "n", role: "CASHIER" } });

beforeEach(() => {
  // تخزين نظيف لكل اختبار: الحالة لا تتسرب بين الحالات
  for (const k of ["pharmacy.session", "pharmacy.pos.cart", "pharmacy.pos.intent", "pharmacy.pos.recovery"]) {
    storage.removeItem(k);
  }
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("window", { location: { pathname: "/pos", search: "" }, dispatchEvent: () => true, addEventListener: () => undefined });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POS recovery — سلة غير مؤكدة", () => {
  it("يحفظ السلة موسومة بالمستخدم وتُستعاد لنفس المستخدم", () => {
    storage.setItem("pharmacy.session", session("u1"));
    storage.setItem("pharmacy.pos.cart", JSON.stringify({ state: { lines: [{ id: 1 }] } }));
    storage.setItem("pharmacy.pos.intent", "intent-1");

    stashRecovery();
    expect(takeRecovery("u1")).toMatchObject({ intent: "intent-1" });

    // الاستعادة تُنظّف نفسها
    expect(takeRecovery("u1")).toBeNull();
  });

  it("يرفض استعادة سلة مستخدم آخر على الجهاز المشترك", () => {
    storage.setItem("pharmacy.session", session("u1"));
    storage.setItem("pharmacy.pos.cart", JSON.stringify({ state: { lines: [] } }));
    stashRecovery();
    expect(takeRecovery("u2")).toBeNull();
    expect(storage.getItem("pharmacy.pos.recovery")).toBeNull();
  });

  it("يرفض السلة الأقدم من 30 دقيقة", () => {
    storage.setItem("pharmacy.session", session("u1"));
    storage.setItem("pharmacy.pos.cart", JSON.stringify({ state: { lines: [] } }));
    stashRecovery();

    const saved = JSON.parse(storage.getItem("pharmacy.pos.recovery")!);
    saved.at = Date.now() - 31 * 60 * 1000;
    storage.setItem("pharmacy.pos.recovery", JSON.stringify(saved));

    expect(takeRecovery("u1")).toBeNull();
  });

  it("لا ينشئ استعادة إن لم تكن هناك سلة أو جلسة", () => {
    stashRecovery();
    expect(storage.getItem("pharmacy.pos.recovery")).toBeNull();

    storage.setItem("pharmacy.session", session("u1"));
    stashRecovery();
    expect(storage.getItem("pharmacy.pos.recovery")).toBeNull();
  });

  it("يتعامل مع بيانات تالفة بلا استثناء", () => {
    storage.setItem("pharmacy.pos.recovery", "{broken");
    expect(takeRecovery("u1")).toBeNull();
    expect(storage.getItem("pharmacy.pos.recovery")).toBeNull();
    clearRecovery();
  });
});
