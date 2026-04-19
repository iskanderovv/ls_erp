import {
  OrganizationStatus,
  PrismaClient,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const phone = "+998885880331";
  const passwordHash = await bcrypt.hash("akbar1003", 12);

  const basicPlan = await prisma.plan.upsert({
    where: { code: SubscriptionPlan.BASIC },
    create: {
      name: "Basic",
      code: SubscriptionPlan.BASIC,
      priceCents: 9900000,
      maxStudents: 100,
      maxBranches: 1,
    },
    update: {},
  });
  const proPlan = await prisma.plan.upsert({
    where: { code: SubscriptionPlan.PRO },
    create: {
      name: "Pro",
      code: SubscriptionPlan.PRO,
      priceCents: 29900000,
      maxStudents: 500,
      maxBranches: 3,
      featureFlags: { ANALYTICS: true, REPORTS: true },
    },
    update: {},
  });
  await prisma.plan.upsert({
    where: { code: SubscriptionPlan.ENTERPRISE },
    create: {
      name: "Enterprise",
      code: SubscriptionPlan.ENTERPRISE,
      priceCents: 99900000,
      maxStudents: 5000,
      maxBranches: 10,
      featureFlags: { ANALYTICS: true, REPORTS: true, AUTOMATION: true },
    },
    update: {},
  });

  const existingOrganization = await prisma.organization.findFirst({
    where: { name: "Super Admin Organization" },
    orderBy: { createdAt: "asc" },
  });

  const organization =
    existingOrganization ??
    (await prisma.organization.create({
      data: {
        name: "Super Admin Organization",
        subscriptionPlan: SubscriptionPlan.ENTERPRISE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    }));

  const superAdmin = await prisma.user.upsert({
    where: { phone },
    create: {
      organizationId: organization.id,
      firstName: "Akbar",
      lastName: "SuperAdmin",
      phone,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    update: {
      organizationId: organization.id,
      firstName: "Akbar",
      lastName: "SuperAdmin",
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      branchId: null,
    },
  });

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      ownerId: superAdmin.id,
      subscriptionPlan: SubscriptionPlan.PRO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      status: OrganizationStatus.ACTIVE,
    },
  });

  const existingActive = await prisma.subscription.findFirst({
    where: {
      organizationId: organization.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });
  if (!existingActive) {
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        planId: proPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
      },
    });
  }

  const hasTrial = await prisma.subscription.findFirst({
    where: {
      organizationId: organization.id,
      status: SubscriptionStatus.TRIAL,
    },
  });
  if (!hasTrial) {
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        planId: basicPlan.id,
        status: SubscriptionStatus.TRIAL,
        startDate: new Date(),
      },
    });
  }

  console.log("Super admin created/updated.");
  console.log(`Phone: ${phone}`);
  console.log("Password: akbar1003");
  console.log(`User ID: ${superAdmin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
