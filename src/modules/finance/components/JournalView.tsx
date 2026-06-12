"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { journalBrowse, ledgerAccounts } from "../api";
import { JournalEntryDialog } from "./JournalEntryDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils/money";

const SOURCES = [
  ["", "كل المصادر"], ["SALE", "بيع"], ["SALE_RETURN", "مرتجع"], ["PAYMENT", "تحصيل"],
  ["PAYMENT_AP", "سداد مورد"], ["GRN", "استلام"], ["ADJUSTMENT", "تسوية"],
  ["SHIFT_CLOSE", "وردية"], ["CASH_ENTRY", "خزينة"], ["REVERSAL", "عكسي"],
] as const;
const SOURCE_AR = Object.fromEntries(SOURCES.filter(([k]) => k));

/** دفتر الأستاذ — تصفح القيود قراءةً فقط: كل قيد بمصدره وقيمته، والنقر يفتح طرفيه المتوازنين. */
export function JournalView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [page, setPage] = useState(0);
  const [drill, setDrill] = useState<string | null>(null);

  const accounts = useQuery({ queryKey: ["ledger.accounts"], queryFn: ({ signal }) => ledgerAccounts(signal), select: (r) => r.data });
  const { data, isLoading } = useQuery({
    queryKey: ["journal.browse", from, to, sourceType, accountCode, page],
    queryFn: ({ signal }) => journalBrowse({
      from: from || undefined, to: to || undefined,
      sourceType: sourceType || undefined, accountCode: accountCode || undefined,
      skip: page * 50,
    }, signal),
    select: (r) => r.data,
  });

  const setF = (fn: () => void) => { fn(); setPage(0); };

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
        <Input label="من" type="date" dir="ltr" value={from} onChange={(e) => setF(() => setFrom(e.target.value))} className="h-9 w-36" />
        <Input label="إلى" type="date" dir="ltr" value={to} onChange={(e) => setF(() => setTo(e.target.value))} className="h-9 w-36" />
        <label className="text-xs font-bold text-ink-soft">
          المصدر
          <select value={sourceType} onChange={(e) => setF(() => setSourceType(e.target.value))} className="mt-1 block h-9 rounded-el border border-line bg-card px-2 text-sm font-normal">
            {SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-ink-soft">
          الحساب
          <select value={accountCode} onChange={(e) => setF(() => setAccountCode(e.target.value))} className="mt-1 block h-9 rounded-el border border-line bg-card px-2 text-sm font-normal">
            <option value="">كل الحسابات</option>
            {(accounts.data ?? []).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
          </select>
        </label>
        {data && <span className="ms-auto pb-2 text-xs text-ink-faint"><b className="num">{data.total}</b> قيد</span>}
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.rows.length ? (
        <EmptyState title="لا قيود مطابقة" hint="عدّل الفلاتر — الدفتر لا يفقد شيئًا أبدًا" />
      ) : (
        <>
          <Table>
            <THead><Th>التاريخ</Th><Th>المصدر</Th><Th>البيان</Th><Th>القيمة</Th></THead>
            <tbody>
              {data.rows.map((r) => (
                <Tr key={r.id} className="cursor-pointer hover:bg-paper" onClick={() => setDrill(r.id)}>
                  <Td className="num text-xs text-ink-soft">{new Date(r.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</Td>
                  <Td><Badge tone="blue">{SOURCE_AR[r.sourceType] ?? r.sourceType}</Badge></Td>
                  <Td className="max-w-[320px] truncate text-xs">{r.memo ?? "—"}</Td>
                  <Td className="num font-bold">{formatMoney(r.amount)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-end gap-2 border-t border-line p-3">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>السابق</Button>
            <Button size="sm" variant="ghost" disabled={(page + 1) * 50 >= data.total} onClick={() => setPage((p) => p + 1)}>التالي</Button>
          </div>
        </>
      )}
      <JournalEntryDialog entryId={drill} onClose={() => setDrill(null)} />
    </Card>
  );
}
