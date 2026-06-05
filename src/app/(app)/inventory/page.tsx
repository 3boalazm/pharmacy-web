"use client";
import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { ProductsTable } from "@/modules/catalog";
import { StockTable } from "@/modules/inventory";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { PackageOpen, SlidersHorizontal } from "lucide-react";

const tabs = [
  { key: "stock", label: "مستويات المخزون" },
  { key: "products", label: "المنتجات" },
  { key: "expiry", label: "متابعة الصلاحية" },
] as const;
type Tab = (typeof tabs)[number]["key"];

/** Inventory hub: Product List · Stock Levels · Batch/Expiry Tracking · entries to GRN & Adjustments. */
export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  return (
    <>
      <Topbar title="المخزون" />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-el border border-line bg-card p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-[6px] px-4 py-2 text-sm font-bold transition-colors",
                  tab === t.key ? "bg-primary text-white" : "text-ink-soft hover:bg-paper",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="ms-auto flex gap-2">
            <Link href="/inventory/adjustments">
              <Button variant="secondary"><SlidersHorizontal className="size-4" /> تسوية مخزون</Button>
            </Link>
            <Link href="/inventory/grn">
              <Button><PackageOpen className="size-4" /> استلام شحنة (GRN)</Button>
            </Link>
          </span>
        </div>

        {tab === "products" && <ProductsTable />}
        {tab === "stock" && <StockTable key="stock" />}
        {tab === "expiry" && <StockTable key="expiry" initialFilter="EXPIRING" />}
      </div>
    </>
  );
}
