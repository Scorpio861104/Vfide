export default function Loading() {
  return (
    <div className="min-h-screen bg-[#1A1A1D] flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-[#00F0FF]/20 rounded-full" />
          
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-[#00F0FF] rounded-full animate-spin" />
          
          {/* Inner glow */}
          <div className="absolute inset-4 bg-linear-to-br from-[#00F0FF]/20 to-[#0080FF]/20 rounded-full animate-pulse" />
          
          {/* V logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-[#00F0FF]">V</span>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-xl font-[family-name:var(--font-body)] text-[#F5F3E8]">
            Loading
          </h2>
          <div className="flex justify-center gap-1">
            <span className="w-2 h-2 bg-[#00F0FF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-[#00F0FF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-[#00F0FF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
