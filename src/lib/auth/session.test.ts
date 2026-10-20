import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientState, getSession, hasRole, setSession, updateTokens, type Session } from "./session";

/** sessionStorage وهمي: الاختبارات لا تعتمد على بيئة المتصفح. */
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(i: number) { return [...this.store.keys()][i] ?? null; }
  get length() { return this.store.size; }
}

const storage = new MemoryStorage();

const valid: Session = {
  accessToken: "access-token-123",
  refreshToken: "refresh-token-456",
  user: { id: "u1", name: "صيدلي", role: "PHARMACIST" },
  pharmacy: { id: "p1", name: "صيدلية النور" },
};

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("window", { location: { pathname: "/pos", search: "" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getSession — التحقق من بنية البيانات المخزّنة", () => {
  it("يعيد جلسة صحيحة كما هي", () => {
    setSession(valid);
    expect(getSession()).toEqual(valid);
  });

  it("يعيد null ويمسح التخزين عند JSON تالف", () => {
    storage.setItem("pharmacy.session", "{not-json");
    expect(getSession()).toBeNull();
    expect(storage.getItem("pharmacy.session")).toBeNull();
  });

  it("يرفض جلسة بلا توكن أو بدور غير معروف", () => {
    storage.setItem("pharmacy.session", JSON.stringify({ user: { id: "u", name: "n", role: "OWNER" } }));
    expect(getSession()).toBeNull();

    storage.setItem("pharmacy.session", JSON.stringify({ accessToken: "abcdefgh", user: { id: "u", name: "n", role: "ADMIN" } }));
    expect(getSession()).toBeNull();
  });

  it("لا ينهار إذا كان التخزين نفسه محجوبًا", () => {
    const blocked = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => undefined, removeItem: () => undefined };
    vi.stubGlobal("sessionStorage", blocked);
    expect(getSession()).toBeNull();
  });
});

describe("session mutations", () => {
  it("updateTokens يحفظ التوكن الجديد ولا يفقد المستخدم", () => {
    setSession(valid);
    updateTokens({ accessToken: "new-access" });
    const s = getSession();
    expect(s?.accessToken).toBe("new-access");
    expect(s?.refreshToken).toBe("refresh-token-456");
    expect(s?.user.name).toBe("صيدلي");
  });

  it("hasRole يعطي المالك كل الصلاحيات", () => {
    setSession({ ...valid, user: { ...valid.user, role: "OWNER" } });
    expect(hasRole(["CASHIER"])).toBe(true);
    setSession({ ...valid, user: { ...valid.user, role: "CASHIER" } });
    expect(hasRole(["PHARMACIST"])).toBe(false);
  });

  it("clearClientState يمسح الجلسة وبيانات POS المؤقتة ويطلق حدث الخروج", () => {
    setSession(valid);
    storage.setItem("pharmacy.pos.cart", "{}");
    storage.setItem("pharmacy.pos.intent", "{}");
    const listener = vi.fn();
    const win = globalThis.window as unknown as { addEventListener: unknown; dispatchEvent: unknown };
    win.dispatchEvent = (e: Event) => { if (e.type === "pharmacy:logout") listener(); return true; };
    win.addEventListener = () => undefined;

    clearClientState();

    expect(getSession()).toBeNull();
    expect(storage.getItem("pharmacy.pos.cart")).toBeNull();
    expect(storage.getItem("pharmacy.pos.intent")).toBeNull();
    expect(listener).toHaveBeenCalled();
  });
});
