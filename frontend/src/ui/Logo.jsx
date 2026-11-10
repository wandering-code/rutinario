export function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--color-accent)" />
      <g fill="var(--color-on-accent)">
        <rect x="10" y="25" width="6" height="14" rx="2" />
        <rect x="17" y="20" width="7" height="24" rx="2.5" />
        <rect x="40" y="20" width="7" height="24" rx="2.5" />
        <rect x="48" y="25" width="6" height="14" rx="2" />
        <rect x="24" y="30" width="16" height="4" rx="1.5" />
      </g>
    </svg>
  )
}
