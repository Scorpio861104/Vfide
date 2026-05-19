export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="container mx-auto px-4 max-w-4xl py-10">
        {/* Profile header */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-white/8 animate-pulse shrink-0" />
            <div className="flex-1 text-center sm:text-left">
              <div className="h-7 w-48 rounded-xl bg-white/8 animate-pulse mb-2 mx-auto sm:mx-0" />
              <div className="h-4 w-32 rounded bg-white/5 animate-pulse mb-3 mx-auto sm:mx-0" />
              <div className="flex gap-6 justify-center sm:justify-start">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="h-6 w-12 rounded bg-white/8 animate-pulse mb-1 mx-auto" />
                    <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Activity feed */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/6 bg-white/[0.02] p-4 flex gap-3">
              <div className="w-9 h-9 rounded-full bg-white/8 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-white/8 animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
