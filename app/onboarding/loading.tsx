export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse, #06b6d4 0%, transparent 70%)" }}
        />
      </div>
      {/* Header */}
      <div className="container mx-auto px-4 max-w-6xl py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto h-3 w-20 rounded-full bg-accent/10 border border-accent/20 animate-pulse mb-3" />
          <div className="mx-auto h-9 w-56 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="mx-auto h-4 w-80 rounded-lg bg-white/5 animate-pulse" />
        </div>
        {/* Content */}
        {/* Wizard step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-2 rounded-full animate-pulse ${i === 0 ? 'w-8 bg-accent/40' : 'w-2 bg-white/10'}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5">
          {[...Array(1)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
