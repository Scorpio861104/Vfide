export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900" role="status" aria-live="polite" aria-label="Loading page content">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="animate-spin w-16 h-16 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full" />
          <div className="animate-pulse absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">V</span>
          </div>
        </div>
        <p className="text-zinc-400 mt-6 text-sm font-medium tracking-wide">Loading</p>
        <div className="flex gap-1.5 justify-center mt-3">
          <span className="animate-bounce w-2 h-2 bg-cyan-400 rounded-full" />
          <span
            className="animate-bounce w-2 h-2 bg-cyan-400 rounded-full"
            style={{ animationDelay: '0.15s' }}
          />
          <span
            className="animate-bounce w-2 h-2 bg-cyan-400 rounded-full"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>
    </div>
  );
}
