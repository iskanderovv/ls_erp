"use client";

import { useQuery } from "@tanstack/react-query";
import { SubscriptionPlan } from "@prisma/client";

export type FeatureFlag = "ANALYTICS" | "AUTOMATION" | "REPORTS";

const PLAN_FEATURES: Record<SubscriptionPlan, FeatureFlag[]> = {
  BASIC: [],
  PRO: ["ANALYTICS", "REPORTS"],
  ENTERPRISE: ["ANALYTICS", "REPORTS", "AUTOMATION"],
};

export function useFeatureAccess(feature: FeatureFlag) {
  const { data: org, isLoading } = useQuery({
    queryKey: ["organization", "me"],
    queryFn: async () => {
      const res = await fetch("/api/organization/me");
      if (!res.ok) return null;
      return res.json() as Promise<{
        subscriptionPlan: SubscriptionPlan;
        featureFlags: Record<string, boolean> | null;
      }>;
    },
  });

  if (isLoading) return false;
  if (!org) return false;

  const planFeatures = PLAN_FEATURES[org.subscriptionPlan];
  if (planFeatures.includes(feature)) return true;

  return !!org.featureFlags?.[feature];
}
