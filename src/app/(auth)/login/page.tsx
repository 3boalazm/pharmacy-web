"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiException } from "@/lib/api/http";
import { setSession, type SessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cross } from "lucide-react";

/** POST /auth/login — API Contract §2 */
interface LoginResponse { accessToken: string; refreshToken: string; user: SessionUser }

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(undefined);
    try {
      const { data } = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: { phone, password, deviceId: "web-admin" },
      });
      setSession({ accessToken: data.accessToken, user: data.user });
      router.replace("/pos");
    } catch (err) {
      setError(err instanceof ApiException ? err.error.message : "تعذر الاتصال بالخادم");
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
          <Input label="رقم الهاتف" inputMode="tel" dir="ltr" className="text-end" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label="كلمة المرور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="rounded-el bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>دخول</Button>
        </div>
      </form>
    </div>
  );
}
