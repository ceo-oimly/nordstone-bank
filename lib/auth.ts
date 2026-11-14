import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const AUTH_COOKIE = "yb_auth";
export type AuthStage = "pin" | "authenticated";
export type AuthClaims = { sub: string; sid: string; jti: string; stage: AuthStage };

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function hashPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must contain exactly four digits.");
  return bcrypt.hash(pin, 10);
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(claims: AuthClaims, expiresAt: Date) {
  return new SignJWT({ sid: claims.sid, jti: claims.jti, stage: claims.stage })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer("your-brand")
    .setAudience("your-brand-app")
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());
}

export async function readAuthToken(token: string): Promise<AuthClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], issuer: "your-brand", audience: "your-brand-app" });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string" || typeof payload.jti !== "string" || (payload.stage !== "pin" && payload.stage !== "authenticated")) return null;
    return { sub: payload.sub, sid: payload.sid, jti: payload.jti, stage: payload.stage };
  } catch {
    return null;
  }
}

export function requestIp(request: Request) {
  return request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
