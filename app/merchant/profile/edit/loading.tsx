import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for a form-heavy page.
 */
export default function MerchantProfileEditLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <div className="border border-zinc-700/50 rounded-2xl p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-11" rounded="lg" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-11" rounded="lg" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24" rounded="lg" />
          <Skeleton className="h-11 w-32" rounded="lg" />
        </div>
      </div>
    </div>
  );
}
