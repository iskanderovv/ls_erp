import type { SessionPayload } from "@/lib/auth/token";

export function getOrganizationFilter(session: SessionPayload) {
  return { organizationId: session.organizationId };
}

export function getBranchFilter(session: SessionPayload) {
  const orgFilter = getOrganizationFilter(session);
  
  // SUPER_ADMIN and ADMIN see all branches in their organization
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
    return orgFilter;
  }

  // Others are limited to their branch
  if (!session.branchId) {
    return { ...orgFilter, branchId: "__no_branch__" };
  }

  return { ...orgFilter, branchId: session.branchId };
}

export function canAccessBranch(session: SessionPayload, branchId: string) {
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
    return true;
  }
  return session.branchId === branchId;
}

export function scopedBranchId(session: SessionPayload) {
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
    return null;
  }
  return session.branchId ?? "__no_branch__";
}
