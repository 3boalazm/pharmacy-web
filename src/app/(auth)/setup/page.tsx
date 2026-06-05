"use client";

import { SetupForm } from "@/modules/identity";

/** * /setup — عرض شاشة الإعداد مباشرة وتخطي فحص الباك إند بالكامل 
 */
export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background">
      <SetupForm />
    </div>
  );
}