"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ApiException, api, RETURN_TO_KEY } from "@/lib/api/http";
import { setSession, type SessionPharmacy, type SessionUser } from "@/lib/auth/session";
import { getDeviceId } from "@/lib/auth/device";
import { bootstrapStatus } from "@/modules/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cross } from "lucide-react";

/** POST /auth/login — API Contract §2. يحوّل تلقائيًا إلى /setup عند أول تشغيل. */
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  pharmacy?: SessionPharmacy;
}

/** يعيد مسارًا داخليًا آمنًا فقط (لا open redirect). */
function takeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  let target: string | null = null;
  try { target = sessionStorage.getItem(RETURN_TO_KEY); } catch { /* تجاهل */ }
  if (!target) target = new URLSearchParams(window.location.search).get("returnTo");
  try { sessionStorage.removeItem(RETURN_TO_KEY); } catch { /* تجاهل */ }
  if (!target || !target.startsWith("/") || target.startsWith("//")) return null;
  if (target.startsWith("/login") || target.startsWith("/setup")) return null;
  return target;
}

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  // أول تشغيل؟ → شاشة الإعداد بدل الدخول (فحص صامت؛ لو الخادم نائم نبقى هنا)
  useEffect(() => {
    bootstrapStatus()
      .then(({ data }) => { if (data.needsSetup) router.replace("/setup"); })
      .catch(() => undefined);
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(undefined);
    try {
      const { data } = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: { phone: phone.trim(), password, deviceId: getDeviceId() },
      });
      // كاش المستخدم السابق لا يورث للجلسة الجديدة (جهاز مشترك)
      qc.clear();
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user, pharmacy: data.pharmacy });
      router.replace(takeReturnTo() ?? "/pos");
    } catch (err) {
      if (err instanceof ApiException && err.status === 429) {
        setError(err.retryAfter ? `محاولات كثيرة — حاول بعد ${err.retryAfter} ثانية` : "محاولات كثيرة — حاول لاحقًا");
      } else {
        setError(err instanceof ApiException ? err.error.message : "تعذر الاتصال بالخادم");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="rise w-full max-w-sm rounded-card border border-line bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid size-12 place-items-center rounded-card bg-primary text-white shadow-sm">
            <Cross className="size-6" />
          </span>
          <h1 className="text-xl font-extrabold">صيدليتي</h1>
          <p className="text-sm text-ink-faint">سجّل الدخول للمتابعة</p>
        </div>
        <div className="space-y-4">
          <Input label="رقم الهاتف" inputMode="tel" autoComplete="tel" dir="ltr" className="text-end" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label="كلمة المرور" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="rounded-el bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>دخول</Button>
        </div>
      </form>
    </div>
  );
}
