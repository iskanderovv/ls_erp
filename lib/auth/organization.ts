import { prisma } from "@/lib/prisma";
import { SubscriptionPlan } from "@prisma/client";

export async function getOrganization(id: string) {
  if (!prisma.organization) return null;
  return prisma.organization.findUnique({
    where: { id },
  });
}

export type FeatureFlag = "ANALYTICS" | "AUTOMATION" | "REPORTS";

const PLAN_FEATURES: Record<SubscriptionPlan, FeatureFlag[]> = {
  BASIC: [],
  PRO: ["ANALYTICS", "REPORTS"],
  ENTERPRISE: ["ANALYTICS", "REPORTS", "AUTOMATION"],
};

export async function checkFeatureAccess(organizationId: string, feature: FeatureFlag) {
  const org = await getOrganization(organizationId);
  if (!org) return false;

  // Plan-based features
  if (PLAN_FEATURES[org.subscriptionPlan].includes(feature)) {
    return true;
  }

  // Individual feature flags in Json
  const customFlags = org.featureFlags as Record<string, boolean> | null;
  if (customFlags?.[feature]) {
    return true;
  }

  return false;
}

export async function getOrganizationLimits(organizationId: string) {
  const org = await getOrganization(organizationId);
  if (!org) return null;

  switch (org.subscriptionPlan) {
    case "BASIC":
      return { maxBranches: 1, maxStudents: 100 };
    case "PRO":
      return { maxBranches: 3, maxStudents: 500 };
    case "ENTERPRISE":
      return { maxBranches: 10, maxStudents: 5000 };
    default:
      return { maxBranches: 1, maxStudents: 100 };
  }
}
