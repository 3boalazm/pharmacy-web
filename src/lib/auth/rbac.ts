import type { SessionUser } from "./session";

export type Role = SessionUser["role"];

/** BR-6 RBAC matrix — single source for nav + route gating (UX layer; the API is the enforcer). */
export const can = {
  pos: (r: Role) => true && !!r,
  inventoryWrite: (r: Role) => r !== "CASHIER",
  clinicalOverride: (r: Role) => r === "PHARMACIST" || r === "OWNER",
  catalogWrite: (r: Role) => r === "PHARMACIST" || r === "OWNER",
  dashboard: (r: Role) => r === "PHARMACIST" || r === "OWNER",
  governance: (r: Role) => r === "OWNER", // reconcile, periods, audit
};
