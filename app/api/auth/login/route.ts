import bcrypt from "bcryptjs";
import { OrganizationStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { canAccessSystem, INACTIVE_SUBSCRIPTION_MESSAGE } from "@/lib/auth/access";
import { SESSION_NAME, createSessionToken } from "@/lib/auth/token";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Login ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  type LoginUser = Prisma.UserGetPayload<{
    include: {
      organization: {
        select: {
          subscriptionStatus: true;
        };
      };
    };
  }>;

  let user: LoginUser | null = null;
  try {
    const fetchedUser = await prisma.user.findFirst({
      where: {
        phone: parsed.data.phone,
      },
      include: {
        organization: {
          select: {
            subscriptionStatus: true,
          },
        },
      },
    });
    user = fetchedUser;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error:
            "Ma'lumotlar bazasiga ulanishda xatolik. Administratorga murojaat qiling.",
        },
        { status: 503 },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Telefon yoki parol noto'g'ri." }, { status: 401 });
  }

  const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "Telefon yoki parol noto'g'ri." }, { status: 401 });
  }

  if (
    !canAccessSystem({
      role: user.role,
      userStatus: user.status,
      organizationStatus: OrganizationStatus.ACTIVE,
      subscriptionStatus: user.organization.subscriptionStatus,
    })
  ) {
    return NextResponse.json({ error: INACTIVE_SUBSCRIPTION_MESSAGE }, { status: 403 });
  }

  const token = await createSessionToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    branchId: user.branchId,
  });

  const redirectTo = user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
  const response = NextResponse.json({ success: true, redirectTo });
  response.cookies.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
