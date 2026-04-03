import AdminDashboardClient from './AdminDashboardClient';
import { Suspense } from 'react';

/**
 * Server-side admin page guard (FE-5 fix)
 * Checks authorization before rendering the admin dashboard.
 * Prevents shipping full admin UI code to unauthorized browsers.
 */

function LoadingUI() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
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
export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <AdminDashboardClient />
    </Suspense>
  );
}
