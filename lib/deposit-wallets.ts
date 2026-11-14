import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminWalletConfigs } from "@/db/schema";

export type DepositWallet = {
  id: string;
  name: string;
  symbol: string;
  network: string;
  address: string;
  icon: string;
  paymentUriPrefix: string | null;
};

function toWallets(value: unknown): DepositWallet[] {
  const source = Array.isArray(value) ? value : value && typeof value === "object" ? Object.entries(value as Record<string, unknown>).map(([id, wallet]) => ({ id, ...(wallet as Record<string, unknown>) })) : [];
  return source.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const address = typeof item.address === "string" ? item.address.trim() : "";
    const isActive = item.isActive === true || item.active === true;
    if (!isActive || !/^[a-z0-9_-]{1,80}$/i.test(id) || !address || address.length > 500) return [];
    const name = typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 100) : id;
    const symbol = typeof item.symbol === "string" && item.symbol.trim() ? item.symbol.trim().slice(0, 12).toUpperCase() : id.toUpperCase().slice(0, 12);
    const network = typeof item.network === "string" && item.network.trim() ? item.network.trim().slice(0, 100) : name;
    const icon = typeof item.icon === "string" && item.icon.trim() ? item.icon.trim().slice(0, 8) : "◈";
    const paymentUriPrefix = typeof item.paymentUriPrefix === "string" ? item.paymentUriPrefix.slice(0, 80) : null;
    return [{ id, name, symbol, network, address, icon, paymentUriPrefix }];
  });
}

export async function getActiveDepositWallets() {
  if (!db) return [];
  const rows = await db.select().from(adminWalletConfigs).where(eq(adminWalletConfigs.isActive, true)).orderBy(asc(adminWalletConfigs.name));
  return rows.map((wallet) => ({ id: wallet.id, name: wallet.name, symbol: wallet.symbol, network: wallet.network, address: wallet.address, icon: wallet.icon, paymentUriPrefix: wallet.paymentUriPrefix }));
}
