export default function NordstoneMark({ className = "", title = "Nordstone Bank" }: { className?: string; title?: string }) {
  return <svg className={className} viewBox="0 0 48 48" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="currentColor" />
    <path d="M13 35V13h5.3l11.4 13.7V13H35v22h-5.2L18.3 21.3V35H13Z" fill="white" />
  </svg>;
}
