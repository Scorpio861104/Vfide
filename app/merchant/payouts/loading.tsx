import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton shown by Next.js while the route's async page renders.
 * Renders a list-shape placeholder (header + filters row + grid of cards).
 */
export default function MerchantPayoutsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-9 w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-10" rounded="lg" />
          <Skeleton className="h-10" rounded="lg" />
          <Skeleton className="h-10" rounded="lg" />
          <Skeleton className="h-10" rounded="lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32 border border-zinc-700/50" rounded="xl" />
          <Skeleton className="h-32 border border-zinc-700/50" rounded="xl" />
          <Skeleton className="h-32 border border-zinc-700/50" rounded="xl" />
          <Skeleton className="h-32 border border-zinc-700/50" rounded="xl" />
          <Skeleton className="h-32 border border-zinc-700/50" rounded="xl" />
          <Skeleton className="h-32 border border-zinc-700/50" rounded="xl" />
        </div>
      </div>
    </div>
  );
}
