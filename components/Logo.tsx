export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600">
        <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
          <circle cx="20" cy="12" r="3" fill="white" />
          <path
            d="M6 26c0-7.7 6.3-14 14-14s14 6.3 14 14"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M6 26h28" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M11 26v-6M16.5 26v-9M23.5 26v-9M29 26v-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-xl font-bold tracking-tight">
          <span className={light ? "text-white" : "text-slate-900"}>Bridge</span>
          <span className="text-blue-500">Talent</span>
        </div>
        <div
          className={`text-[10px] font-semibold tracking-[0.2em] ${
            light ? "text-slate-300" : "text-slate-400"
          }`}
        >
          MANAGEMENT
        </div>
      </div>
    </div>
  );
}
