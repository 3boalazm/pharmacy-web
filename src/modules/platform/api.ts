"use client";
import { api, qs } from "@/lib/api/http";

export interface Alert {
  id: string;
  type: "LOW_STOCK" | "EXPIRY" | "DEBT_OVERDUE" | "RECONCILE" | "CREDIT_LIMIT" | string;
  message: string;
  refId: string | null;
  status: string;
  createdAt: string;
}
export interface AuditRow {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export async function listAlerts(status = "UNREAD", signal?: AbortSignal) {
  return api<Alert[]>(`/alerts${qs({ status })}`, { signal });
}
export async function ackAlert(id: string) {
  return api<{ ok: boolean }>(`/alerts/${id}/ack`, { method: "POST" });
}
export async function listAuditLogs(filters: { action?: string; entityType?: string } = {}, signal?: AbortSignal) {
  return api<AuditRow[]>(`/audit-logs${qs(filters)}`, { signal });
}
