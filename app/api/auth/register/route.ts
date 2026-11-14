import { NextRequest, NextResponse } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import { randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { registrationAttempts, users } from "@/db/schema";
import { AUTH_COOKIE, cookieOptions, requestIp, signAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
const accountTypes = ["Checking", "Savings", "Business", "Student"] as const;
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validUsername = /^[A-Za-z0-9]{3,20}$/;
const validPhone = /^\+?[0-9\s().-]{7,24}$/;

type RegistrationBody = {
  firstName?: unknown; middleName?: unknown; lastName?: unknown; username?: unknown; email?: unknown;
  phone?: unknown; country?: unknown; accountType?: unknown; pin?: unknown; password?: unknown;
  confirmPassword?: unknown; agreeToTerms?: unknown;
};

async function recordAttempt(email: string | null, ip: string, success: boolean) {
  if (db) await db.insert(registrationAttempts).values({ email, ipAddress: ip, success });
}

function databaseErrorInfo(error: unknown) {
  const top = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return { code: top?.code ?? top?.cause?.code, constraint: top?.constraint ?? top?.cause?.constraint };
}

function makeAccountNumber() {
  return randomInt(0, 10_000_000_000).toString().padStart(10, "0");
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return NextResponse.json({ error: "Registration is not configured yet." }, { status: 503 });

  const body = await request.json().catch(() => null) as RegistrationBody | null;
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const middleName = typeof body?.middleName === "string" ? body.middleName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const country = typeof body?.country === "string" ? body.country.trim() : "";
  const accountType = typeof body?.accountType === "string" ? body.accountType : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  const ip = requestIp(request).slice(0, 64);
  const emailForLog = validEmail.test(email) ? email : null;

  const validationError = !firstName ? "First name is required." : !lastName ? "Last name is required." : !validUsername.test(username) ? "Username must be 3–20 characters using letters and numbers only." : !validEmail.test(email) ? "Enter a valid email address." : !validPhone.test(phone) ? "Enter a valid phone number." : !country ? "Country is required." : !accountTypes.includes(accountType as typeof accountTypes[number]) ? "Choose a valid account type." : !/^\d{4}$/.test(pin) ? "PIN must be exactly 4 digits." : password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) ? "Password must be at least 8 characters and include an uppercase letter and a number." : password !== confirmPassword ? "Passwords do not match." : body?.agreeToTerms !== true ? "Please agree to the Terms of Service and Privacy Policy." : "";
  if (validationError) {
    await recordAttempt(emailForLog, ip, false);
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(or(eq(users.email, email), eq(users.username, username))).limit(1);
  if (existing) {
    await recordAttempt(email, ip, false);
    return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });
  }

  const [passwordHash, pinHash] = await Promise.all([bcrypt.hash(password, 12), bcrypt.hash(pin, 10)]);
  const userId = randomUUID();
  const sessionId = randomUUID();
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const userAgent = request.headers.get("user-agent")?.slice(0, 2000) ?? null;

  let accountNumber = "";
  let inserted = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    accountNumber = makeAccountNumber();
    try {
      // One data-modifying CTE is a single PostgreSQL transaction: user, account, session and attempt commit together.
      await db.execute(sql`
        WITH new_user AS (
          INSERT INTO users (id, first_name, middle_name, last_name, username, email, phone, country, password_hash, pin_hash, account_type, email_verified, is_active, failed_login_attempts, created_at, updated_at)
          VALUES (${userId}, ${firstName}, ${middleName || null}, ${lastName}, ${username}, ${email}, ${phone}, ${country}, ${passwordHash}, ${pinHash}, ${accountType}, false, true, 0, now(), now())
          RETURNING id
        ), new_account AS (
          INSERT INTO accounts (user_id, account_number, account_type, currency, balance, status, created_at)
          SELECT id, ${accountNumber}, ${accountType}, 'USD', 0.00, 'active', now() FROM new_user
          RETURNING user_id
        ), new_session AS (
          INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at)
          SELECT ${sessionId}, id, ${sessionToken}, ${expiresAt}, ${ip}, ${userAgent}, now() FROM new_user
          RETURNING id
        ), new_attempt AS (
          INSERT INTO registration_attempts (email, ip_address, success, attempted_at)
          SELECT ${email}, ${ip}, true, now() FROM new_user
          RETURNING id
        )
        SELECT id FROM new_user
      `);
      inserted = true;
      break;
    } catch (error) {
      const info = databaseErrorInfo(error);
      if (info.code === "23505" && info.constraint?.includes("account_number")) continue;
      if (info.code === "23505" || info.constraint?.includes("email") || info.constraint?.includes("username")) {
        await recordAttempt(email, ip, false);
        return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });
      }
      console.error("Registration insert failed:", error);
      return NextResponse.json({ error: "We couldn’t create your account. Please try again." }, { status: 500 });
    }
  }
  if (!inserted) return NextResponse.json({ error: "We couldn’t generate an account number. Please try again." }, { status: 503 });

  const jwt = await signAuthToken({ sub: userId, sid: sessionId, jti: sessionToken, stage: "pin" }, expiresAt);
  const response = NextResponse.json({ success: true, user: { firstName, lastName, username, accountNumber }, redirect: "/verify-pin" });
  response.cookies.set(AUTH_COOKIE, jwt, { ...cookieOptions, expires: expiresAt, maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000) });
  return response;
}
