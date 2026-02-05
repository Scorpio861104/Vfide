'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-cyan-400/10 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full border-2 border-cyan-400/40 flex items-center justify-center bg-zinc-950">
            <span className="text-2xl font-bold text-cyan-300">V</span>
          </div>
        </div>
        <div className="text-zinc-200 text-lg font-medium">Loading</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
