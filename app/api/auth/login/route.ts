import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_NAME, createSessionToken } from "@/lib/auth/token";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Login ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  let user: Awaited<ReturnType<typeof prisma.user.findFirst>>;
  try {
    user = await prisma.user.findFirst({
      where: {
        phone: parsed.data.phone,
        status: UserStatus.ACTIVE,
      },
    });
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

  const token = await createSessionToken({
    userId: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    branchId: user.branchId,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
