export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-[oklch(0.42_0.13_255)]" />
        {/* a bridge (setu) arc connecting citizen and government */}
        <path d="M5 21c3.5-8 18.5-8 22 0" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M9 21v-3.5M13 21v-5.5M19 21v-5.5M23 21v-3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M4 23.5h24" stroke="oklch(0.74 0.16 60)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className={`block text-[15px] font-bold tracking-tight ${light ? "text-white" : "text-primary"}`}>
          Sewa Setu <span className="hidden font-semibold sm:inline">· सेवा सेतु</span>
        </span>
        <span className={`hidden text-[10px] font-medium uppercase tracking-wider sm:block ${light ? "text-white/70" : "text-muted-foreground"}`}>
          AI citizen services · prototype
        </span>
      </span>
    </span>
  );
}
