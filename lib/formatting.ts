export function formatCurrency(amount: string | number, currency: string, locale = "en-US") {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return `— ${currency}`;
  try {
    return `${new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${currency}`;
  } catch {
    return `${currency} ${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function formatNumber(amount: string | number, locale = "en-US", digits = 2) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatDate(date: string | Date, locale = "en-US", options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? "—" : value.toLocaleDateString(locale, options);
}

export function formatDateTime(date: string | Date, locale = "en-US", options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? "—" : value.toLocaleString(locale, options);
}
