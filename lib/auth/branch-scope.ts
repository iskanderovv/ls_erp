import type { SessionPayload } from "@/lib/auth/token";

export function isGlobalRole(role: SessionPayload["role"]) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAccessBranch(session: SessionPayload, branchId: string | null | undefined) {
  if (!branchId) return isGlobalRole(session.role);
  if (isGlobalRole(session.role)) return true;
  return session.branchId === branchId;
}

export function scopedBranchId(session: SessionPayload) {
  return isGlobalRole(session.role) ? null : session.branchId;
}
