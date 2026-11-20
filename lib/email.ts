import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY || "placeholder";
export const supportFromEmail = process.env.SUPPORT_FROM_EMAIL || "support@[YOUR_BRAND].com";
export async function sendSupportReplyEmail({ to, userName, ticketNumber, ticketTitle, adminMessage, ticketId }: { to: string; userName: string; ticketNumber: string; ticketTitle: string; adminMessage: string; ticketId: string }) {
  if (!apiKey || apiKey === "placeholder") return { sent: false as const };
  const resend = new Resend(apiKey);
  const safeMessage = adminMessage.replace(/[\r\n]+/g, " ").trim();
  const result = await resend.emails.send({
    from: supportFromEmail,
    to,
    subject: `[${ticketNumber}] Reply to your ticket: ${ticketTitle}`,
    text: `Hello ${userName},\n\n${safeMessage}\n\nReply to this email to continue the chat.\n\nOpen your chat: https://[YOUR_DOMAIN]/support/${ticketId}`,
    html: `<p>Hello ${escapeHtml(userName)},</p><p>${escapeHtml(adminMessage).replace(/\n/g, "<br>")}</p><p>Reply to this email to continue the chat.</p><p><a href="https://[YOUR_DOMAIN]/support/${encodeURIComponent(ticketId)}">Open your chat</a></p>`,
  });
  return result.error ? { sent: false as const, error: result.error.message } : { sent: true as const, id: result.data?.id ?? null };
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]!); }
