export default function CharityDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto border-4 border-zinc-700 border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400">Loading charity details…</p>
      </div>
    </div>
  );
}
