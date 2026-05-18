'use client';

import { AccountSettings } from '@/components/settings/AccountSettings';
import { EndorsementsBadges } from '@/components/social/EndorsementsBadges';

interface AccountTabProps {
  address?: `0x${string}`;
}

export function AccountTab({ address }: AccountTabProps) {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <AccountSettings />
        {address ? <EndorsementsBadges userAddress={address} showGiveEndorsement={false} /> : null}
      </div>
    </div>
  );
}
