"use client";
import { api } from "@/lib/api/http";
import type { SessionPharmacy, SessionUser } from "@/lib/auth/session";

export interface ManagedUser {
  id: string;
  name: string;
  phone: string;
  role: SessionUser["role"];
  archivedAt: string | null;
  createdAt: string;
}
export interface AuthResult {
  accessToken: string;
  user: SessionUser;
  pharmacy: SessionPharmacy;
}

/** * GET /auth/bootstrap — تم تعديلها لتخطي الـ 404 وإرجاع أن النظام يحتاج إعداد دائماً
 * طالما الباك إند الحالي لا يحتوي على هذه الـ endpoint.
 */
export async function bootstrapStatus(signal?: AbortSignal) {
  // بدلاً من ضرب الـ API الناقص، سنعطي إجابة مباشرة للفرونت إند للتحرك فوراً
  return { data: { needsSetup: true } };
}

/** * POST /auth/register — تم تعديل المسار من bootstrap إلى register 
 * ليتوافق مع الـ Controller الجديد في باك إند NestJS لإنشاء حساب المالك والصيدلية
 */
export async function bootstrap(input: { pharmacyName: string; ownerName: string; phone: string; password: string; pin: string }) {
  // 🚀 ضربنا مباشرة على الـ endpoint الفعلية المتاحة في الباك إند
  return api<AuthResult>("/auth/register", { method: "POST", body: input });
}

export async function listUsers(signal?: AbortSignal) {
  return api<ManagedUser[]>("/users", { signal });
}
export async function createUser(input: { name: string; phone: string; password: string; role: ManagedUser["role"]; pin?: string }) {
  return api<ManagedUser>("/users", { method: "POST", body: input });
}
export async function updateUser(
  id: string,
  input: Partial<{ name: string; role: ManagedUser["role"]; password: string; pin: string; archived: boolean }>,
) {
  return api<ManagedUser>(`/users/${id}`, { method: "PATCH", body: input });
}
export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  return api<{ ok: boolean }>("/auth/change-password", { method: "POST", body: input });
}