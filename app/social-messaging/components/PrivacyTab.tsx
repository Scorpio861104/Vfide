'use client';

import { PrivacySettings } from '@/components/social/PrivacySettings';

export function PrivacyTab() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-6xl">
        <PrivacySettings />
      </div>
    </div>
  );
}
