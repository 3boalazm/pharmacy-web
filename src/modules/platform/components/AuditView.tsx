"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "../api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

const actionTone = (action: string): "red" | "amber" | "green" | "blue" | "gray" => {
  if (action.includes("OVERRIDE")) return "red";
  if (action.includes("ADJUST") || action.includes("REVERS")) return "amber";
  if (action.includes("SALE") || action.includes("PAYMENT")) return "green";
  if (action.includes("CREATED") || action.includes("UPDATED")) return "blue";
  return "gray";
};

/** Audit trail viewer (OWNER) — append-only rows written in the same tx as each mutation. */
export function AuditView() {
  const [action, setAction] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit", action],
    queryFn: ({ signal }) => listAuditLogs({ action: action || undefined }, signal),
    select: (r) => r.data,
  });

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Input value={action} onChange={(e) => setAction(e.target.value.toUpperCase())} placeholder="تصفية بالإجراء — مثال: DUR_OVERRIDE" className="h-9 w-72 font-mono text-xs" dir="ltr" />
      </div>
      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا توجد سجلات مطابقة" />
      ) : (
        <Table>
          <THead><Th>الوقت</Th><Th>الإجراء</Th><Th>الكيان</Th><Th>التفاصيل</Th></THead>
          <tbody>
            {data.map((r) => (
              <Tr key={r.id}>
                <Td className="num whitespace-nowrap text-xs text-ink-soft">
                  {new Date(r.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "medium" })}
                </Td>
                <Td><Badge tone={actionTone(r.action)}>{r.action}</Badge></Td>
                <Td className="text-xs">
                  {r.entityType}
                  {r.entityId && <span className="ms-1 font-mono text-[10px] text-ink-faint">{r.entityId.slice(0, 8)}</span>}
                </Td>
                <Td className="max-w-md truncate font-mono text-[11px] text-ink-faint" dir="ltr">
                  {r.detail ? JSON.stringify(r.detail) : "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
