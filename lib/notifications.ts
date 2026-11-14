import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NotificationType = "card" | "loan" | "kyc" | "transfer" | "security" | "support" | "deposit" | "system";
export type NewNotification = { type: NotificationType; title: string; message: string; link?: string | null };

export async function createNotification(userId: string, notification: NewNotification) {
  if (!db) return false;
  try {
    await db.insert(notifications).values({ userId, type: notification.type, title: notification.title, message: notification.message, link: notification.link ?? null });
    return true;
  } catch (error) {
    console.error("Could not create notification:", error);
    return false;
  }
}
