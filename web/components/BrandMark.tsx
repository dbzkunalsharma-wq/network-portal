/** The Network Portal mark — a flat violet tile with a page and a Turbo bookmark dot. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-hidden="true" className={className}>
      <rect width="100" height="100" rx="22" fill="#834DFB" />
      <rect x="26" y="22" width="48" height="56" rx="8" fill="#F5F3FF" />
      <rect x="36" y="38" width="28" height="5" rx="2.5" fill="#834DFB" />
      <rect x="36" y="50" width="20" height="5" rx="2.5" fill="#834DFB" />
      <rect x="36" y="62" width="24" height="5" rx="2.5" fill="#834DFB" />
      <circle cx="68" cy="26" r="9" fill="#F0E100" />
    </svg>
  );
}
