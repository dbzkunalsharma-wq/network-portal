/** The DOD geometric mark (shared by the header, sub-nav and footer). */
export function DodMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-hidden="true" className={className}>
      <rect width="100" height="100" rx="22" fill="#ffffff" />
      <rect x="22" y="24" width="15" height="40" fill="none" stroke="#0a0a0b" strokeWidth="5" />
      <rect x="41.5" y="24" width="6" height="40" fill="#0a0a0b" />
      <circle cx="71" cy="34" r="12.5" fill="#0a0a0b" />
      <rect x="57" y="53" width="21" height="21" fill="none" stroke="#0a0a0b" strokeWidth="5" />
      <rect x="67" y="63" width="11" height="11" fill="#0a0a0b" />
    </svg>
  );
}
