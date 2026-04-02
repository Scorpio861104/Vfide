import { Clock } from 'lucide-react';

interface ComingSoonProps {
  feature: string;
  description?: string;
}

export function ComingSoon({ feature, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
          <Clock className="h-10 w-10 text-amber-400" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-white">{feature}</h2>
        <p className="mb-2 text-gray-400">This feature is under development.</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <span className="text-sm font-bold text-amber-400">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
