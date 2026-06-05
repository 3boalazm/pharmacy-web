"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { bootstrapStatus, SetupForm } from "@/modules/identity";

/** /setup — يظهر فقط طالما قاعدة البيانات فارغة (لا توجد صيدلية بعد). */
export default function SetupPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: ({ signal }) => bootstrapStatus(signal),
    select: (r) => r.data,
    retry: 1,
  });

  useEffect(() => {
    if (data && !data.needsSetup) router.replace("/login");
  }, [data, router]);

  if (isLoading || !data?.needsSetup) {
    return <p className="grid min-h-screen place-items-center text-sm text-ink-faint">جارٍ التحقق…</p>;
  }
  return <SetupForm />;
}
