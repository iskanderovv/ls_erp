import { OrganizationStatus, SubscriptionStatus, UserStatus } from "@prisma/client";

type AccessCheckInput = {
  role: string;
  userStatus: UserStatus;
  organizationStatus: OrganizationStatus;
  subscriptionStatus: SubscriptionStatus;
};

export function canAccessSystem(input: AccessCheckInput) {
  if (input.role === "SUPER_ADMIN") return true;
  if (input.userStatus !== UserStatus.ACTIVE) return false;
  if (input.organizationStatus !== OrganizationStatus.ACTIVE) return false;
  return input.subscriptionStatus !== SubscriptionStatus.EXPIRED;
}

export const INACTIVE_SUBSCRIPTION_MESSAGE =
  "Your subscription is inactive. Please contact support.";
