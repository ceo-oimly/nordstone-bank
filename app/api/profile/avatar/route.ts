import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { securityLogs, users } from "@/db/schema";
import { AUTH_COOKIE, requestIp } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const runtime = "nodejs";
const maxBytes = 2 * 1024 * 1024;
const supported = new Map<string, { extension: string; signature: (bytes: Buffer) => boolean }>([
  ["image/jpeg", { extension: "jpg", signature: (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ["image/png", { extension: "png", signature: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ["image/webp", { extension: "webp", signature: (bytes) => bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" }],
]);

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Avatar upload is unavailable." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size === 0 || file.size >= maxBytes) return NextResponse.json({ error: "Image must be smaller than 2 MB." }, { status: 400 });
  const format = supported.get(file.type);
  if (!format) return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!format.signature(bytes)) return NextResponse.json({ error: "The image contents do not match the selected file type." }, { status: 400 });
  const directory = path.join(process.cwd(), "public", "uploads", "profiles");
  const filename = `${auth.user.id}-${randomUUID()}.${format.extension}`;
  const filePath = path.join(directory, filename);
  const avatarUrl = `/uploads/profiles/${filename}`;
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, bytes, { flag: "wx" });
    const [previous] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, auth.user.id)).limit(1);
    await db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, auth.user.id));
    await db.insert(securityLogs).values({ userId: auth.user.id, action: "avatar_updated", ipAddress: requestIp(request).slice(0, 64), userAgent: request.headers.get("user-agent")?.slice(0, 1000) ?? null });
    const oldUrl = previous?.avatarUrl;
    if (oldUrl && new RegExp(`^/uploads/profiles/${auth.user.id}-[a-f0-9-]+\\.(?:jpg|png|webp)$`, "i").test(oldUrl)) {
      await unlink(path.join(directory, path.basename(oldUrl))).catch(() => undefined);
    }
    return NextResponse.json({ avatarUrl }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    await unlink(filePath).catch(() => undefined);
    return NextResponse.json({ error: "Avatar could not be saved. Please try again." }, { status: 500 });
  }
}
