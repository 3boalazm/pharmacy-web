"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "../cart";
import { getPortalSession, clearPortalSession } from "@/lib/shop/session";
import { Cross, ShoppingBag, ReceiptText, UserRound, LogOut } from "lucide-react";
<<<<<<< HEAD
import { ThemeToggle } from "@/components/app/theme";
=======
>>>>>>> 6f62a637c281a0762fa880cf0a3b3c194c3e5be6
import { cn } from "@/lib/utils/cn";

/** قشرة الستور — موبايل أولًا: هيدر خفيف + شريط تنقّل سفلي ثابت. */
export function ShopShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const session = typeof window !== "undefined" ? getPortalSession() : null;
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));

  const tabs = [
    { href: "/shop", label: "المتجر", icon: ShoppingBag },
    { href: "/shop/orders", label: "طلباتي", icon: ReceiptText },
    { href: "/shop/account", label: "حسابي", icon: UserRound },
  ];

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col pb-20">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-card/90 px-4 backdrop-blur">
        <Link href="/shop" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-el bg-primary text-white"><Cross className="size-4" /></span>
          <span className="text-sm font-extrabold">صيدليتي</span>
        </Link>
<<<<<<< HEAD
        <span className="ms-auto me-1"><ThemeToggle className="rounded-el p-1.5 text-ink-soft hover:bg-paper" /></span>
=======
>>>>>>> 6f62a637c281a0762fa880cf0a3b3c194c3e5be6
        {session ? (
          <button
            onClick={() => { clearPortalSession(); router.push("/shop"); router.refresh(); }}
            className="flex items-center gap-1 rounded-el px-2 py-1.5 text-xs font-bold text-ink-soft hover:bg-paper"
          >
            <LogOut className="size-3.5" /> {session.customer.name.split(" ")[0]}
          </button>
        ) : (
          <Link href="/shop/login" className="rounded-el bg-primary px-3 py-1.5 text-xs font-bold text-white">دخول</Link>
        )}
      </header>

      <main className="flex-1 p-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-2xl border-t border-line bg-card/95 backdrop-blur">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/shop" ? path === "/shop" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold",
                active ? "text-primary-ink" : "text-ink-faint")}>
              <Icon className="size-5" />
              {label}
              {href === "/shop" && count > 0 && (
                <span className="absolute end-[calc(50%-22px)] top-1 grid min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] leading-4 text-white">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
