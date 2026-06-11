"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalLogin, portalRegister } from "../api";
import { setPortalSession } from "@/lib/shop/session";
import { ApiException } from "@/lib/api/http";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** دخول/تسجيل العميل. رقم له دفتر قائم بالصيدلية ⟶ تفعيل بموافقة الصيدلية (حماية كشف الحساب). */
export function PortalAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ tone: "error" | "info"; text: string }>();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(undefined);
    try {
      if (mode === "login") {
        const { data } = await portalLogin({ phone, password });
        setPortalSession({ accessToken: data.accessToken, customer: data.customer });
        router.replace("/shop");
      } else {
        const { data } = await portalRegister({ name, phone, password });
        if (data.accessToken && data.customer) {
          setPortalSession({ accessToken: data.accessToken, customer: data.customer });
          router.replace("/shop");
        } else {
          setMsg({ tone: "info", text: data.message ?? "سيُفعَّل حسابك بعد تأكيد الصيدلية" });
        }
      }
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof ApiException ? err.error.message : "تعذر الاتصال بالخادم" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 max-w-sm space-y-4 rounded-card border border-line bg-card p-6 shadow-card">
      <div className="flex rounded-el border border-line p-0.5 text-sm font-bold">
        {([["login", "تسجيل الدخول"], ["register", "حساب جديد"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => { setMode(v); setMsg(undefined); }}
            className={cn("flex-1 rounded-[6px] py-2", mode === v ? "bg-primary text-white" : "text-ink-soft")}>
            {label}
          </button>
        ))}
      </div>
      {mode === "register" && <Input label="الاسم" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />}
      <Input label="رقم الموبايل" inputMode="tel" dir="ltr" className="text-end" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <Input label="كلمة المرور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} />
      {msg && (
        <p className={cn("rounded-el px-3 py-2 text-sm font-medium", msg.tone === "error" ? "bg-danger-soft text-danger" : "bg-info-soft text-info")}>
          {msg.text}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {mode === "login" ? "دخول" : "إنشاء الحساب"}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-ink-faint">
        لو رقمك له حساب دفتري بالصيدلية، سيُفعَّل دخولك بعد تأكيد الصيدلية — لحماية كشف حسابك.
      </p>
    </form>
  );
}
