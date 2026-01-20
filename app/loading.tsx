export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-cyan-400/20 rounded-full" />
          
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-[#00F0FF] rounded-full animate-spin" />
          
          {/* Inner glow */}
          <div className="absolute inset-4 bg-linear-to-br from-cyan-400/20 to-blue-500/20 rounded-full animate-pulse" />
          
          {/* V logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-cyan-400">V</span>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-xl font-[family-name:var(--font-body)] text-zinc-100">
            Loading
          </h2>
          <div className="flex justify-center gap-1">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
