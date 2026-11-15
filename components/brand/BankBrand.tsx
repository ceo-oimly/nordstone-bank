import NordstoneMark from "@/components/brand/NordstoneMark";

export default function BankBrand({ href = "/", className = "" }: { href?: string; className?: string }) {
  return <a href={href} className={`bank-brand ${className}`} aria-label="Nordstone Bank home">
    <NordstoneMark className="bank-brand-mark" />
    <span className="bank-brand-copy"><b>NORDSTONE</b><span>BANK</span></span>
  </a>;
}
