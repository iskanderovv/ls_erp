import type { JWTPayload } from "jose";
import { jwtVerify, SignJWT } from "jose";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import type { AppRole } from "@/lib/auth/roles";

const AUTH_EXPIRES_IN = "12h";

function authSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "phase1-change-this-secret-key",
  );
}

export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: AppRole;
  firstName: string;
  lastName: string;
  branchId: string | null;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(AUTH_EXPIRES_IN)
    .sign(authSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    return payload as JWTPayload & SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_NAME = SESSION_COOKIE_NAME;
