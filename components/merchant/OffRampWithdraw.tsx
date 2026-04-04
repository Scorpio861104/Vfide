'use client';

import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OffRampButton, OffRampStatus } from '@/components/compliance/OffRampIntegration';

export default function OffRampWithdraw() {
  const { address } = useAccount();

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
      <CardHeader>
        <CardTitle>Cash out to local rails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Turn stablecoin balances into mobile-money or bank withdrawals using the repo’s existing off-ramp request flow.
        </p>

        {address ? (
          <div className="space-y-4">
            <OffRampButton walletAddress={address} className="w-full justify-center" />
            <OffRampStatus walletAddress={address} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4">
            Connect a wallet to create and track a withdrawal request.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
