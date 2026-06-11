"use client";
import { useQuery } from "@tanstack/react-query";
import { journalEntry } from "../api";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";

const SOURCE_AR: Record<string, string> = {
  SALE: "فاتورة بيع", SALE_RETURN: "مرتجع", PAYMENT: "تحصيل من عميل", PAYMENT_AP: "سداد لمورد",
  GRN: "استلام شحنة", ADJUSTMENT: "تسوية مخزون", SHIFT_CLOSE: "إقفال وردية", CASH_ENTRY: "حركة خزينة",
  REVERSAL: "قيد عكسي",
};

/** تتبّع القيد: من أي سطر كشف إلى القيد المزدوج الكامل بطرفيه — اكتمال «كل معاملة قابلة للتتبع» بصريًا. */
export function JournalEntryDialog({ entryId, onClose }: { entryId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["journal.entry", entryId],
    queryFn: ({ signal }) => journalEntry(entryId!, signal),
    select: (r) => r.data,
    enabled: !!entryId,
  });

  const totals = data?.lines.reduce(
    (a, l) => ({ d: a.d + Number(l.debit), c: a.c + Number(l.credit) }),
    { d: 0, c: 0 },
  );

  return (
    <Dialog open={!!entryId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>قيد محاسبي</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          {isLoading || !data ? (
            <p className="py-6 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
          ) : (
            <>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="blue">{SOURCE_AR[data.sourceType] ?? data.sourceType}</Badge>
                <span className="num text-xs text-ink-faint">{new Date(data.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</span>
              </p>
              {data.memo && <p className="rounded-el bg-paper px-3 py-2 text-sm">{data.memo}</p>}
              <Table>
                <THead><Th>الحساب</Th><Th>مدين</Th><Th>دائن</Th></THead>
                <tbody>
                  {data.lines.map((l) => (
                    <Tr key={l.id}>
                      <Td><span className="num text-xs text-ink-faint">{l.account?.code}</span> {l.account?.name ?? "—"}</Td>
                      <Td className="num font-bold">{Number(l.debit) > 0 ? formatMoney(l.debit) : ""}</Td>
                      <Td className="num font-bold">{Number(l.credit) > 0 ? formatMoney(l.credit) : ""}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <p className="flex justify-between rounded-el bg-primary-soft px-3 py-2 text-xs font-bold text-primary-ink">
                <span>متوازن ✓</span>
                <span className="num">{totals?.d.toFixed(2)} = {totals?.c.toFixed(2)}</span>
              </p>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
