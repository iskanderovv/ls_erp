import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { SESSION_NAME, verifySessionToken } from "@/lib/auth/token";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePagePermission(permission: Permission) {
  const session = await requireSession();
  if (!hasPermission(session.role, permission)) {
    redirect("/dashboard");
  }
  return session;
}
