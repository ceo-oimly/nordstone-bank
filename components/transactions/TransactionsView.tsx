"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { TransactionFilters } from "@/lib/transactions";

type Row = { id: string; type: string; amount: string; currency: string; status: string; description: string | null; counterpartyName: string | null; recipientName: string | null; recipientAccountNumber: string | null; recipientBank: string | null; transferType: string | null; reference: string; createdAt: string | Date };
type Data = { transactions: Row[]; total: number; page: number; perPage: number; totalPages: number };
const emptyData: Data = { transactions: [], total: 0, page: 1, perPage: 10, totalPages: 1 };
const money = (amount: string | number, currency: string) => `${currency === "USD" ? "$" : `${currency} `}${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency === "USD" ? " USD" : ""}`;
const dateText = (date: string | Date) => new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default function TransactionsView({ filters: initialFilters, initial }: { filters: TransactionFilters; initial: Data }) {
  const { t } = useLanguage();
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(initial);
  const [searchText, setSearchText] = useState(initialFilters.search);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportStyle, setExportStyle] = useState("modern");
  const [delivery, setDelivery] = useState("download");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function load(next: TransactionFilters) {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => { if (value !== "" && value != null) params.set(key, String(value)); });
    window.history.replaceState(null, "", `/transactions?${params.toString()}`);
    try {
      const response = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load transactions.");
      setData(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load transactions."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (searchText === filters.search) return;
    const timer = setTimeout(() => { const next = { ...filters, search: searchText, page: 1 }; setFilters(next); void load(next); }, 350);
    return () => clearTimeout(timer);
  // Filters other than search are applied through explicit controls.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function applyFilters(next: TransactionFilters) { setFilters(next); setSearchText(next.search); void load(next); setFilterOpen(false); }
  async function exportStatement() {
    setExportError(""); setExporting(true);
    const params = new URLSearchParams({ format: exportFormat, style: exportStyle, delivery, from: filters.from, to: filters.to, status: filters.status });
    try {
      const response = await fetch(`/api/transactions/export?${params}`, { cache: "no-store" });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Export failed."); }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `statement.${exportFormat}`;
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); setExportOpen(false);
    } catch (e) { setExportError(e instanceof Error ? e.message : "Export failed."); }
    finally { setExporting(false); }
  }

  const setPage = (page: number) => { const next = { ...filters, page }; setFilters(next); void load(next); };
  return <main className="transactions-page">
    <div className="transactions-breadcrumb"><Link href="/dashboard">{t("Dashboard")}</Link><span>›</span><strong>{t("Transactions")}</strong></div>
    <section className="transactions-hero"><div><span className="transactions-kicker">ACCOUNT ACTIVITY</span><h1>{t("Transactions")}</h1><p>Review, filter, and download your account activity.</p></div><div className="transactions-hero-icon">↗</div></section>
    <section className="transactions-panel">
      <div className="transactions-toolbar"><div className="transactions-toolbar-actions"><button className="transactions-secondary-button" onClick={() => setFilterOpen(true)} type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.3 7.2v5.4l-3.4 1.9v-7.3L4 5Z"/></svg><span>{t("Filter")}</span></button><button className="transactions-primary-button" onClick={() => { setExportError(""); setExportOpen(true); }} type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></svg><span>{t("Export")}</span></button></div><label className="transactions-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={`${t("Search")}...`} aria-label="Search by transaction reference"/><kbd>/</kbd></label></div>
      <div className="transactions-applied"><span>{data.total} transaction{data.total === 1 ? "" : "s"}</span><span>{filters.from} – {filters.to}</span>{filters.status !== "all" && <span className="transaction-chip">{t(filters.status.charAt(0).toUpperCase() + filters.status.slice(1))}</span>}{filters.sort !== "newest" && <span className="transaction-chip">{filters.sort.replace("_", " ")}</span>}</div>
      {error && <div className="transactions-error" role="alert">{error}</div>}
      <div className={`transactions-table-wrap ${loading ? "is-loading" : ""}`}><table className="transactions-table"><thead><tr><th>{t("Amount")}</th><th>{t("Type")}</th><th>{t("Status")}</th><th>{t("Date")}</th></tr></thead><tbody>
        {data.transactions.map((row) => <tr key={row.id} onClick={() => setSelected(row)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setSelected(row); }}><td><span className={`transaction-amount-mark ${row.type.toLowerCase() === "credit" ? "credit" : "debit"}`}>{row.type.toLowerCase() === "credit" ? "+" : "−"}</span><span className="transaction-amount-copy"><strong>{money(row.amount, row.currency)}</strong><small>{row.description || row.recipientName || row.counterpartyName || row.reference}</small></span></td><td><span className={`transaction-kind-pill ${row.type.toLowerCase()}`}>{t(row.type)}</span></td><td><span className={`transaction-status ${row.status.toLowerCase()}`}>{t(row.status)}</span></td><td>{dateText(row.createdAt)}</td></tr>)}
      </tbody></table>{loading && <div className="transactions-loading">Loading transactions…</div>}
      {!loading && data.transactions.length === 0 && <div className="transactions-empty"><span>⌁</span><h2>No transactions yet</h2><p>When you send or receive money, your activity will appear here.</p><Link href="/transfer/local">Make your first transfer</Link></div>}</div>
      {data.total > 0 && <div className="transactions-pagination"><span>Showing {Math.min((data.page - 1) * data.perPage + 1, data.total)}–{Math.min(data.page * data.perPage, data.total)} of {data.total}</span><div><button type="button" onClick={() => setPage(data.page - 1)} disabled={data.page <= 1 || loading}>← <span>{t("Previous")}</span></button><strong>{data.page} / {data.totalPages}</strong><button type="button" onClick={() => setPage(data.page + 1)} disabled={data.page >= data.totalPages || loading}><span>{t("Next")}</span> →</button></div></div>}
    </section>
    {filterOpen && <div className="transactions-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setFilterOpen(false); }}><section className="transactions-modal" role="dialog" aria-modal="true" aria-labelledby="filter-title"><button className="transactions-modal-close" type="button" onClick={() => setFilterOpen(false)} aria-label="Close">×</button><h2 id="filter-title">Filter transactions</h2><p>Choose the activity you want to see.</p><div className="transactions-form-grid"><label>From<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}/></label><label>To<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}/></label><label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as TransactionFilters["status"] })}><option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option></select></label><label>Sort by<select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value as TransactionFilters["sort"] })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount_high">Amount: high to low</option><option value="amount_low">Amount: low to high</option></select></label><label>Rows per page<select value={filters.perPage} onChange={(e) => setFilters({ ...filters, perPage: Number(e.target.value) })}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label></div><div className="transactions-modal-actions"><button type="button" className="transactions-secondary-button" onClick={() => { const today = new Date().toISOString().slice(0, 10); const from = new Date(); from.setUTCDate(from.getUTCDate() - 30); setFilters({ ...filters, from: from.toISOString().slice(0, 10), to: today, status: "all", sort: "newest", perPage: 10 }); }}>Reset</button><button type="button" className="transactions-primary-button" onClick={() => applyFilters({ ...filters, search: searchText, page: 1 })}>Apply filters</button></div></section></div>}
    {exportOpen && <div className="transactions-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setExportOpen(false); }}><section className="transactions-modal" role="dialog" aria-modal="true" aria-labelledby="export-title"><button className="transactions-modal-close" type="button" onClick={() => setExportOpen(false)} aria-label="Close">×</button><h2 id="export-title">Export statement</h2><p>Your export will include activity from {filters.from} to {filters.to}.</p><div className="transactions-form-grid"><label>File format<select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}><option value="pdf">PDF statement</option><option value="csv">CSV spreadsheet</option><option value="xlsx">Excel workbook</option></select></label><label>Delivery<select value={delivery} onChange={(e) => setDelivery(e.target.value)}><option value="download">Download</option><option value="email">Email me</option></select></label><label>Statement style<select value={exportStyle} onChange={(e) => setExportStyle(e.target.value)}><option value="modern">Modern</option><option value="classic">Classic</option></select></label></div>{exportError && <div className="transactions-error" role="alert">{exportError}</div>}<div className="transactions-modal-actions"><button type="button" className="transactions-secondary-button" onClick={() => setExportOpen(false)}>Cancel</button><button type="button" className="transactions-primary-button" disabled={exporting} onClick={() => void exportStatement()}>{exporting ? "Preparing…" : delivery === "email" ? "Send statement" : "Download statement"}</button></div></section></div>}
    {selected && <div className="transactions-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><section className="transactions-modal transaction-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="transactions-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close">×</button><span className={`transaction-type-icon ${selected.type.toLowerCase() === "credit" ? "credit" : "debit"}`}>{selected.type.toLowerCase() === "credit" ? "↓" : "↑"}</span><h2 id="detail-title">Transaction details</h2><strong className="transaction-detail-amount">{selected.type.toLowerCase() === "credit" ? "+" : "−"}{money(selected.amount, selected.currency)}</strong><div className="transaction-detail-list">{[["Description", selected.description || "—"], ["Recipient", selected.recipientName || selected.counterpartyName || "—"], ["Account number", selected.recipientAccountNumber || "—"], ["Bank", selected.recipientBank || "—"], ["Reference", selected.reference], ["Date", new Date(selected.createdAt).toLocaleString()], ["Type", selected.transferType || selected.type], ["Status", selected.status]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="transactions-modal-actions"><button type="button" className="transactions-primary-button" onClick={() => setSelected(null)}>Done</button></div></section></div>}
  </main>;
}
