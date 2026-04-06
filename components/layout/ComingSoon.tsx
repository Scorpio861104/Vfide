/**
 * ComingSoon — Drop-in placeholder for feature-flagged routes
 * 
 * Usage in any page.tsx:
 *   import { features } from '@/lib/features';
 *   import { ComingSoon } from '@/components/layout/ComingSoon';
 *   
 *   export default function StreamingPage() {
 *     if (!features.streaming) return <ComingSoon feature="Streaming Payments" />;
 *     return <ActualPage />;
 *   }
 */
import { Clock } from 'lucide-react';

interface ComingSoonProps {
  feature: string;
  description?: string;
}

export function ComingSoon({ feature, description }: ComingSoonProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">{feature}</h2>
        <p className="text-gray-400 mb-2">This workspace is rolling out in scheduled stages.</p>
        {description && <p className="text-gray-500 text-sm">{description}</p>}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <span className="text-amber-400 text-sm font-bold">Planned rollout</span>
        </div>
      </div>
    </div>
  );
}
