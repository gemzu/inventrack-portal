// Centralized role + permission constants and checks.
// Used by guards, sidebar filtering, and destructive-action UI.

export const ROLES = {
  ADMIN: "admin",
  WORKER: "worker",
  BUYER: "buyer",
} as const;

export const PERMISSIONS = {
  OWNER: "owner",
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function isOwner(perm?: string | null) {
  return perm === PERMISSIONS.OWNER;
}
export function isSuperadmin(perm?: string | null) {
  return perm === PERMISSIONS.SUPERADMIN || perm === PERMISSIONS.OWNER;
}
export function isAdminRole(role?: string | null) {
  return role === ROLES.ADMIN;
}
export function isBuyer(role?: string | null) {
  return role === ROLES.BUYER;
}
export function isWorker(role?: string | null) {
  return role === ROLES.WORKER;
}

/**
 * Can `actor` perform destructive actions on `target`?
 * Owner: anyone (except self-demote).
 * Superadmin: anyone except owner.
 * Admin: only worker / buyer.
 * Never on self.
 */
export function canManage(
  actor: { id: string | null; role?: string | null; permissions?: string | null },
  target: { id: string; role?: string | null; permissions?: string | null }
): boolean {
  if (!actor.id || actor.id === target.id) return false;
  if (isOwner(actor.permissions)) return true;
  if (isSuperadmin(actor.permissions)) return !isOwner(target.permissions);
  if (isAdminRole(actor.role)) {
    return target.role === ROLES.WORKER || target.role === ROLES.BUYER;
  }
  return false;
}

export function roleBadgeLabel(role?: string | null, permissions?: string | null): string {
  if (permissions === PERMISSIONS.OWNER) return "Owner";
  if (permissions === PERMISSIONS.SUPERADMIN) return "Super admin";
  if (role === ROLES.ADMIN) return "Admin";
  if (role === ROLES.WORKER) return "Worker";
  if (role === ROLES.BUYER) return "Buyer";
  return role || "User";
}
