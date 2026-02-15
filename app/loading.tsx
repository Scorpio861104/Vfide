'use client';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full border-2 border-cyan-500/30 animate-spin" />
          <div className="absolute h-10 w-10 rounded-full bg-cyan-500/20 animate-pulse" />
          <div className="text-3xl font-bold text-cyan-400">V</div>
        </div>
        <div className="text-zinc-300 font-semibold">Loading</div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" />
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
