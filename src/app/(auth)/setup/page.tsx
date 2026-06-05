"use client";
import { SetupForm } from "@/modules/identity";

/** /setup — تم تعديله لتخطي فحص الباك إند وعرض شاشة الإعداد فوراً */
export default function SetupPage() {
  // 🚀 تخطينا الـ Query والـ useEffect عشان الباك إند الحالي ناقص الـ bootstrap endpoint
  // وهنعرض الفورم مباشرة للمستخدم لتسجيل أول حساب (المالك)
  
  return <SetupForm />;
}