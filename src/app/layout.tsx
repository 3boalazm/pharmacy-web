import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/query-client";
import { PwaProvider } from "@/components/app/pwa";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "صيدليتي — منصة إدارة الصيدليات",
  description: "نظام تشغيل مالي وتشغيلي للصيدليات",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "صيدليتي", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#16A34A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans grain">
        <Providers>{children}</Providers>
        <PwaProvider />
      </body>
    </html>
  );
}
