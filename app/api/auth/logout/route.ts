import { NextResponse } from "next/server";

import { SESSION_NAME } from "@/lib/auth/token";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
