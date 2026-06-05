"use client";
/**
 * PWA runtime: service-worker registration + install UX.
 *  - Android/Windows/macOS (Chromium/Edge): captures `beforeinstallprompt` → "تثبيت التطبيق" button.
 *  - iPhone/iPad (Safari has no install event): shows a one-time hint — مشاركة ثم "إضافة إلى الشاشة الرئيسية".
 *  - Hidden entirely once running standalone (already installed).
 */
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // 1) Register the service worker (production only)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if (isStandalone()) return; // already installed

    // 2) Chromium install prompt
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // 3) iOS hint (Safari, not installed, not dismissed before)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && sessionStorage.getItem("pwa.ios.hint") !== "dismissed") {
      setShowIosHint(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  }

  if (installEvent) {
    return (
      <button
        onClick={install}
        className="rise fixed bottom-4 end-4 z-40 inline-flex h-11 items-center gap-2 rounded-card bg-primary px-4 text-sm font-bold text-white shadow-pop hover:bg-primary-ink"
      >
        <Download className="size-4" /> تثبيت التطبيق
      </button>
    );
  }

  if (showIosHint) {
    return (
      <div className="rise fixed bottom-4 start-4 end-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-card border border-line bg-card p-4 shadow-pop">
        <Share className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-ink">
          لتثبيت <b>صيدليتي</b> على الآيفون: اضغط زر <b>المشاركة</b> في سفاري ثم اختر
          <b> «إضافة إلى الشاشة الرئيسية»</b>.
        </p>
        <button
          onClick={() => { sessionStorage.setItem("pwa.ios.hint", "dismissed"); setShowIosHint(false); }}
          aria-label="إغلاق"
          className="rounded p-1 text-ink-faint hover:bg-paper"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return null;
}
