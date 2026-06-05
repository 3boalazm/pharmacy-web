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

/** GET /auth/bootstrap — does the system need first-run setup? */
export async function bootstrapStatus(signal?: AbortSignal) {
  return api<{ needsSetup: boolean }>("/auth/bootstrap", { signal });
}
/** POST /auth/bootstrap — one-time setup: pharmacy + chart of accounts + OWNER, auto-login. */
export async function bootstrap(input: { pharmacyName: string; ownerName: string; phone: string; password: string; pin: string }) {
  return api<AuthResult>("/auth/bootstrap", { method: "POST", body: input });
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
