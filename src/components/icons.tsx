type P = { className?: string }

const base = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
} as const

export const BulbIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
  </svg>
)
export const ChartIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
)
export const UserIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
)
export const LockIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
)
export const CloseIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const BackspaceIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7z" /><path d="M13 10l4 4M17 10l-4 4" /></svg>
)
export const ShareIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 16V4M8 8l4-4 4 4" /><path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" /></svg>
)