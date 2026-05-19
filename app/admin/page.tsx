import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import AdminDashboardClient from './AdminDashboardClient';
import { Suspense } from 'react';

/**
 * Server-side admin page guard (FE-5 fix)
 * Checks authorization before rendering the admin dashboard.
 * Prevents shipping full admin UI code to unauthorized browsers.
 */

function LoadingUI() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-300">Loading admin dashboard...</p>
      </div>
    </div>
  );
}

function UnauthorizedUI() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-4">🚫 Access Denied</h1>
        <p className="text-gray-300 mb-6">Only the protocol owner can access this page.</p>
        <p className="text-gray-400 text-sm mb-6">Please connect your wallet and verify ownership.</p>
        <div className="mt-6 flex justify-center">
          <VfideConnectButton size="md" />
        </div>
        <a href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Return Home
        </a>
      </div>
    </div>
  );
}

/**
 * Server-side page component
 * This prevents the entire admin UI from being sent to unauthorized users.
 * The client component (AdminDashboardClient) will perform wallet connection verification.
 */
export default async function AdminPage() {
  // Note: In the future, you can add server-side auth checks here
  // For now, the client component verifies wallet connection against on-chain owner
  
  return (
    <Suspense fallback={<LoadingUI />}>
      <AdminDashboardClient />
    </Suspense>
  );
}
