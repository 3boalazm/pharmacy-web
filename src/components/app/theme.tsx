"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const KEY = "pharmacy.theme";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => undefined });

/** مزود الثيم — يقرأ التفضيل المحفوظ أو نظام الجهاز؛ سكربت منع الوميض في layout. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    const system: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    apply(stored ?? system);
    // متابعة تغيّر نظام الجهاز طالما المستخدم لم يختر يدويًا
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = (e: MediaQueryListEvent) => { if (!localStorage.getItem(KEY)) apply(e.matches ? "dark" : "light"); };
    mq.addEventListener("change", onSystem);
    return () => mq.removeEventListener("change", onSystem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    apply(next);
  }

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useContext(ThemeCtx);
  return (
    <button
      aria-label={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
      title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
      onClick={toggle}
      className={className ?? "rounded-el p-2 text-ink-soft transition-colors hover:bg-paper"}
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
