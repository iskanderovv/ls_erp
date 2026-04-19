import { NextRequest, NextResponse } from "next/server";

import { apiPermission, hasPermission, routePermission } from "@/lib/auth/permissions";
import { SESSION_NAME, verifySessionToken } from "@/lib/auth/token";

const PUBLIC_ROUTES = ["/login"];
const PUBLIC_API_ROUTES = ["/api/auth/login", "/api/jobs/daily"];

function defaultLandingPath(role?: string) {
  return role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPublicApiRoute(pathname: string) {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isPublicRoute(pathname)) {
    if (session) {
      return NextResponse.redirect(new URL(defaultLandingPath(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const permission = routePermission(pathname);
    if (permission && !hasPermission(session.role, permission)) {
      return NextResponse.redirect(new URL(defaultLandingPath(session.role), request.url));
    }
  }

  if (pathname.startsWith("/api") && !isPublicApiRoute(pathname)) {
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 });
    }

    const permission = apiPermission(pathname);
    if (permission && !hasPermission(session.role, permission)) {
      return NextResponse.json({ error: "Bu amal uchun ruxsat yo'q." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
