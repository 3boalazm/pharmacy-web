"use client";
import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { FinanceView, TreasuryCard, CashboxView, InstallmentsView, CashFlowView, ArAgingView } from "@/modules/finance";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { key: "cashbox", label: "الخزينة" },
  { key: "installments", label: "الأقساط" },
  { key: "ar", label: "الحسابات المدينة" },
  { key: "cashflow", label: "حركة النقدية" },
  { key: "aging", label: "أعمار الديون" },
  { key: "governance", label: "الحوكمة والتسوية" },
] as const;

export default function FinancePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("cashbox");
  return (
    <>
      <Topbar title="المالية" />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex gap-1 overflow-x-auto rounded-card border border-line bg-card p-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("whitespace-nowrap rounded-el px-4 py-2 text-sm font-bold", tab === t.key ? "bg-primary text-white" : "text-ink-soft hover:bg-paper")}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === "cashbox" && <CashboxView />}
        {tab === "installments" && <InstallmentsView />}
        {tab === "ar" && <ArAgingView />}
        {tab === "cashflow" && <CashFlowView />}
        {tab === "aging" && <ArAgingView />}
        {tab === "governance" && <div className="space-y-4"><TreasuryCard /><FinanceView /></div>}
      </div>
    </>
  );
}
