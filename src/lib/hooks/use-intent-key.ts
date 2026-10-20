"use client";
import { useCallback, useState } from "react";
import { uuidv7 } from "@/lib/utils/uuid";

/**
 * مفتاح نية ثابت لعملية كتابة واحدة (مرتجع، GRN، تسوية، دفعة…).
 * يُعاد استخدامه في كل محاولة حتى تنجح العملية أو يقرر المستخدم البدء من جديد.
 */
export function useIntentKey() {
  const [key, setKey] = useState<string>(() => uuidv7());
  const reset = useCallback(() => setKey(uuidv7()), []);
  return { key, reset };
}
