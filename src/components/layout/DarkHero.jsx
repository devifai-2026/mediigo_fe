export function DarkHero({ children, className = '' }) {
  return (
    <div className={`bg-hero-dark text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden ${className}`}>
      <div className="absolute -right-12 -top-12 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function LivePill({ children = 'Real-Time Queue Telemetry' }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
      <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
      {children}
    </div>
  );
}
