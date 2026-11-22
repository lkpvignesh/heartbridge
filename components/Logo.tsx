export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <path d="M32 58C13 45 4 34 4 21C4 11.6 11.2 4 20 4c5.4 0 9.6 2.7 12 7c2.4-4.3 6.6-7 12-7c8.8 0 16 7.6 16 17c0 13-9 24-28 37z" fill="#E4573D" />
      <path d="M13 36Q32 16 51 36" fill="none" stroke="#F7F5F0" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 36H52" stroke="#F7F5F0" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 28.8V36M32 26V36M42 28.8V36" stroke="#F7F5F0" strokeWidth="3" />
    </svg>
  );
}

export function Logo({ size = 28, text = "text-lg", className = "" }: { size?: number; text?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="HeartBridge">
      <LogoMark size={size} />
      <span className={`font-display font-bold tracking-tight text-ink ${text}`}><span className="text-accent-600">Heart</span>Bridge</span>
    </span>
  );
}
