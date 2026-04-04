'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useAccount } from 'wagmi';
import { ArrowLeft, Copy, ShieldCheck, Users } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { StaffManager, type StaffMember } from '@/components/staff';
import { buildStaffPermissionsForRole, type StaffRole } from '@/lib/merchantStaff';

interface StaffRecord {
  id: string;
  staffName: string;
  walletAddress?: string | null;
  role: StaffRole;
  permissions: ReturnType<typeof buildStaffPermissionsForRole>;
  active: boolean;
  posLink?: string;
}

interface StaffActivity {
  id: number | string;
  staff_name?: string;
  action: string;
  created_at: string;
  details?: Record<string, unknown>;
}

export default function MerchantStaffPage() {
  const { address } = useAccount();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [activity, setActivity] = useState<StaffActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<{ name: string; posLink: string } | null>(null);

  async function loadData() {
    try {
      const [staffResponse, activityResponse] = await Promise.all([
        fetch('/api/merchant/staff'),
        fetch('/api/merchant/staff?view=activity'),
      ]);

      const staffData = staffResponse.ok ? await staffResponse.json() : { staff: [] };
      const activityData = activityResponse.ok ? await activityResponse.json() : { activity: [] };
      setStaff(Array.isArray(staffData.staff) ? staffData.staff : []);
      setActivity(Array.isArray(activityData.activity) ? activityData.activity : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load staff data');
    }
  }

  useEffect(() => {
    if (address) {
      void loadData();
    }
  }, [address]);

  const staffMembers: StaffMember[] = useMemo(() => staff.map((member) => ({
    id: member.id,
    name: member.staffName,
    walletAddress: member.walletAddress || 'session link',
    role: member.role,
    permissions: Object.entries(member.permissions)
      .filter(([, value]) => typeof value === 'boolean' && value)
      .map(([key]) => key),
    active: member.active,
    addedAt: Date.now(),
  })), [staff]);

  async function handleAdd(name: string, walletAddress: string, role: StaffRole, limits?: { maxSaleAmount: number; dailySaleLimit: number }) {
    const permissions = buildStaffPermissionsForRole(role);
    permissions.maxSaleAmount = limits?.maxSaleAmount || permissions.maxSaleAmount;
    permissions.dailySaleLimit = limits?.dailySaleLimit || permissions.dailySaleLimit;

    const response = await fetch('/api/merchant/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffName: name,
        walletAddress,
        role,
        permissions,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Failed to add staff member');
      return;
    }

    if (data.posLink) {
      setSelectedInvite({ name, posLink: data.posLink });
    }
    await loadData();
  }

  async function handleRemove(id: string) {
    const response = await fetch(`/api/merchant/staff?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to revoke staff session' }));
      setError(data.error || 'Failed to revoke staff session');
      return;
    }
    await loadData();
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                <Users size={14} /> Staff roles and cashier mode
              </div>
              <h1 className="text-4xl font-bold">Delegate POS access safely</h1>
              <p className="mt-3 max-w-3xl text-gray-400">
                Create limited session links for cashiers and managers without sharing the merchant wallet key.
              </p>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to manage staff sessions.
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <StaffManager staff={staffMembers} onAdd={handleAdd} onRemove={handleRemove} />
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 flex items-center gap-2 text-white">
                      <ShieldCheck size={16} className="text-cyan-400" />
                      <h2 className="text-xl font-bold">Invite link / QR</h2>
                    </div>

                    {selectedInvite ? (
                      <div className="space-y-4 text-sm text-gray-300">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="font-semibold text-white">{selectedInvite.name}</div>
                          <div className="mt-2 break-all text-xs text-cyan-200">{selectedInvite.posLink}</div>
                        </div>
                        <div className="inline-block rounded-xl bg-white p-3">
                          <QRCodeSVG value={selectedInvite.posLink} size={180} includeMargin />
                        </div>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(selectedInvite.posLink)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-200"
                        >
                          <Copy size={14} /> Copy POS link
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Create a staff session to generate a cashier-mode link and QR code.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h2 className="mb-3 text-xl font-bold text-white">Recent staff activity</h2>
                    <div className="space-y-3 text-sm">
                      {activity.length === 0 ? (
                        <p className="text-gray-400">No staff actions recorded yet.</p>
                      ) : activity.map((entry) => (
                        <div key={String(entry.id)} className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="font-semibold text-white">{entry.staff_name || 'Staff session'} · {entry.action}</div>
                          <div className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
