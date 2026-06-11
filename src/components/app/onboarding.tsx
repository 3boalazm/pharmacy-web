"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { BarChart3, Bell, Clock, FilePlus2, Package, ShoppingCart, Wallet } from "lucide-react";

const KEY = "pharmacy.onboarded.v1";

interface Step { icon: React.ElementType; title: string; body: string }

/** خطوات موجزة بحسب الدور — 3 لكل دور، أقل من دقيقة قراءة (هدف: عامل جديد يشتغل في 10 دقائق). */
const STEPS: Record<string, Step[]> = {
  CASHIER: [
    { icon: Clock, title: "افتح وردية أولًا", body: "كل بيع يحتاج وردية مفتوحة — الشريحة الخضراء أعلى القائمة تعرض حالتك ومتوقع الدرج لحظيًا." },
    { icon: ShoppingCart, title: "البيع في ثوانٍ", body: "اكتب اسم الصنف أو امسح الباركود فيُضاف فورًا. F9 للدفع · F2 نقدي · F6 دفع مجزأ · F8 لتعليق فاتورة." },
    { icon: Wallet, title: "مصروف نثري؟ من الخزينة", body: "أي مصروف يُسجل من شاشة المالية ← الخزينة، ويُخصم تلقائيًا من متوقع درجك — لا عجز مفاجئ عند الإقفال." },
  ],
  ASSISTANT: [
    { icon: ShoppingCart, title: "البيع والروشتات", body: "نقطة البيع بالباركود والاختصارات، وشاشة الروشتات لتسجيل روشتة وإرسالها للسلة بزر واحد." },
    { icon: Package, title: "المخزون مسؤوليتك", body: "استلام الشحنات (GRN)، التسويات، وقائمة اقتراح الشراء المحسوبة من سرعة البيع — كلها في شاشة المخزون." },
    { icon: Bell, title: "راقب التنبيهات", body: "النقطة الحمراء على الجرس = صلاحيات قاربت أو نواقص. كل تنبيه ينقلك لمكان التصرف مباشرة." },
  ],
  PHARMACIST: [
    { icon: Bell, title: "أنت خط الأمان", body: "تعارضات الأدوية وأصناف الروشتة توقف البيع تلقائيًا وتطلب موافقتك بالـ PIN — وكل تجاوز يُوثق باسمك." },
    { icon: Package, title: "المخزون والصلاحيات", body: "تنبيهات قرب الانتهاء والنواقص واقتراح الشراء في شاشة المخزون — الصرف دائمًا بالأقرب انتهاءً تلقائيًا." },
    { icon: Wallet, title: "المالية بقيد مزدوج", body: "الخزينة وكشوف العملاء والموردين وأعمار الديون — كل حركة بقيد محاسبي يمكنك فتحه بنقرة." },
  ],
  OWNER: [
    { icon: BarChart3, title: "لوحة قرارك اليومي", body: "مبيعات اليوم بدلتا أمس، النقدية، المستحقات، والطلبات المعلقة — وكل بطاقة تنقلك للتفاصيل." },
    { icon: Wallet, title: "المال كله مُقيَّد", body: "كل جنيه له قيد مزدوج: من الخزينة لأعمار الديون لإقفال الفترة — وشاشة الحوكمة تطابق كل شيء يوميًا." },
    { icon: FilePlus2, title: "فريقك بأدوار", body: "من الإعدادات أضف موظفيك بأدوار محددة — الكاشير يبيع فقط، والتجاوزات الحساسة تتطلب PIN صيدلي." },
  ],
};

const CTA: Record<string, { label: string; href: string }> = {
  CASHIER: { label: "ابدأ البيع الآن", href: "/pos" },
  ASSISTANT: { label: "ابدأ العمل الآن", href: "/pos" },
  PHARMACIST: { label: "ابدأ العمل الآن", href: "/" },
  OWNER: { label: "ابدأ من لوحة التحكم", href: "/" },
};

/** OnboardingStepper — يظهر مرة واحدة أول دخول، متكيف بالدور، قابل للتخطي دائمًا. */
export function Onboarding() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const s = getSession();
    if (s) setRole(s.user.role);
  }, []);

  if (!role) return null;
  const steps = STEPS[role] ?? STEPS.OWNER;
  const cta = CTA[role] ?? CTA.OWNER;
  const done = () => {
    localStorage.setItem(KEY, "1");
    setRole(null);
    router.push(cta.href);
  };
  const Icon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/50 p-4 backdrop-blur-sm" role="dialog" aria-label="جولة تعريفية">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex gap-1.5">
            {steps.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-primary" : "w-1.5 bg-line")} />
            ))}
          </span>
          <button onClick={done} className="text-xs text-ink-faint hover:text-ink-soft">تخطي</button>
        </div>

        <span className="mb-3 grid size-12 place-items-center rounded-card bg-primary-soft text-primary-ink">
          <Icon className="size-6" />
        </span>
        <h2 className="mb-1 text-lg font-extrabold">{steps[step].title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-ink-soft">{steps[step].body}</p>

        <div className="flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>السابق</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>التالي</Button>
          ) : (
            <Button onClick={done}>{cta.label} ←</Button>
          )}
        </div>
      </div>
    </div>
  );
}
