"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { bootstrap } from "../api";
import { setSession } from "@/lib/auth/session";
import { ApiException } from "@/lib/api/http";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cross } from "lucide-react";

const schema = z
  .object({
    pharmacyName: z.string().min(3, "اسم الصيدلية 3 أحرف على الأقل"),
    ownerName: z.string().min(3, "اسم المالك 3 أحرف على الأقل"),
    phone: z.string().regex(/^01\d{9}$/, "رقم موبايل مصري صحيح (11 رقمًا)"),
    password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
    confirm: z.string(),
    pin: z.string().regex(/^\d{4,6}$/, "رمز PIN من 4 إلى 6 أرقام"),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "كلمتا المرور غير متطابقتين" });
type Values = z.infer<typeof schema>;

/** First-run setup — runs ONCE while the database is empty, replacing the seed shell step. */
export function SetupForm() {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { pharmacyName: "", ownerName: "", phone: "", password: "", confirm: "", pin: "" },
  });

  async function submit(v: Values) {
    try {
      const { data } = await bootstrap({
        pharmacyName: v.pharmacyName, ownerName: v.ownerName, phone: v.phone, password: v.password, pin: v.pin,
      });
      setSession({ accessToken: data.accessToken, user: data.user, pharmacy: data.pharmacy });
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiException && err.error.code === "FORBIDDEN") {
        router.replace("/login");
        return;
      }
      form.setError("root", { message: err instanceof ApiException ? err.error.message : "تعذر الاتصال بالخادم" });
    }
  }

  return (
    <div className="relative z-10 grid min-h-screen place-items-center p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="rise w-full max-w-md rounded-card border border-line bg-card p-8 shadow-card">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <span className="grid size-12 place-items-center rounded-card bg-primary text-white shadow-sm">
              <Cross className="size-6" />
            </span>
            <h1 className="text-xl font-extrabold">إعداد النظام لأول مرة</h1>
            <p className="text-sm text-ink-faint">خطوة واحدة تُنفَّذ مرة واحدة فقط — تُنشئ صيدليتك وحساب المالك ودليل الحسابات</p>
          </div>
          <div className="space-y-4">
            <FormField control={form.control} name="pharmacyName" render={({ field }) => (
              <FormItem><FormLabel>اسم الصيدلية</FormLabel><FormControl><Input autoFocus placeholder="صيدلية د. …" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="ownerName" render={({ field }) => (
              <FormItem><FormLabel>اسم المالك</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>رقم الهاتف (سيكون اسم الدخول)</FormLabel><FormControl><Input inputMode="tel" dir="ltr" className="text-end" placeholder="01xxxxxxxxx" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="confirm" render={({ field }) => (
                <FormItem><FormLabel>تأكيد كلمة المرور</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="pin" render={({ field }) => (
              <FormItem>
                <FormLabel>رمز PIN (لتجاوزات الصيدلي)</FormLabel>
                <FormControl><Input inputMode="numeric" dir="ltr" className="num text-center tracking-[0.4em]" maxLength={6} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {form.formState.errors.root && (
              <p className="rounded-el bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
              إنشاء الصيدلية والبدء
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
