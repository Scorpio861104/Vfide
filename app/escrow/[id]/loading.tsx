import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for a detail page: hero block, then stacked sections.
 */
export default function EscrowIdLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-64 border border-zinc-700/50" rounded="xl" />
        <div className="space-y-4">
          <Skeleton className="h-24 border border-zinc-700/50" rounded="xl" />
          <Skeleton className="h-24 border border-zinc-700/50" rounded="xl" />
          <Skeleton className="h-24 border border-zinc-700/50" rounded="xl" />
        </div>
      </div>
    </div>
  );
}
