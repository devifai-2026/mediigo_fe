// Patient-portal hero: the blue-to-mint band from the homepage.
export function DarkHero({ children, className = '' }) {
  return (
    <div className={`mg-hero p-6 sm:p-8 ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function LivePill({ children = 'Real time queue telemetry' }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs sm:text-sm">
      <span className="mg-live-dot w-2 h-2 rounded-full bg-red-500 text-red-500" />
      {children}
    </p>
  );
}
