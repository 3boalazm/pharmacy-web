import type { Metadata, Viewport } from "next";
import "./globals.css";
// خط عربي مستضاف محليًا: البناء لا يعتمد على شبكة Google، والخط يعمل دون اتصال
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import { Providers } from "@/lib/query-client";
import { PwaProvider } from "@/components/app/pwa";
import { ThemeProvider } from "@/components/app/theme";


export const metadata: Metadata = {
  title: "صيدليتي — منصة إدارة الصيدليات",
  description: "نظام تشغيل مالي وتشغيلي للصيدليات",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "صيدليتي", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/favicon.ico" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#16A34A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
      </head>
      <body className="font-sans grain">
                <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("pharmacy.theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <ThemeProvider><Providers>{children}</Providers></ThemeProvider>
        <PwaProvider />
      </body>
    </html>
  );
}
