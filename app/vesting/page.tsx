'use client';

export const dynamic = 'force-dynamic';

import { AnimatePresence, m as motion } from 'framer-motion';
import { BarChart3, Clock, Gift } from 'lucide-react';
import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';

import { Footer } from '@/components/layout/Footer';
import { CONTRACT_ADDRESSES, DevReserveVestingABI, isConfiguredContractAddress } from '@/lib/contracts';
import { parseContractError } from '@/lib/errorHandling';

import { ClaimTab } from './components/ClaimTab';
import { OverviewTab } from './components/OverviewTab';
import { ScheduleTab } from './components/ScheduleTab';
import { useLocale } from '@/lib/locale/LocaleProvider';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: Clock    },
  { id: 'schedule',  label: 'Schedule',  icon: BarChart3 },
  { id: 'claim',     label: 'Claim',     icon: Gift     },
] as const;

type TabId = typeof TABS[number]['id'];

const VESTING_ADDRESS = CONTRACT_ADDRESSES.DevReserveVesting;
const VESTING_ABI = DevReserveVestingABI;

export default function VestingPage() {
  const { locale } = useLocale();
  void locale;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected, address } = useAccount();
  const isAvailable = isConfiguredContractAddress(VESTING_ADDRESS);
  const readQuery = { enabled: isAvailable };

  const { data: beneficiary }   = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'BENEFICIARY',       query: readQuery });
  const { data: claimsPaused }  = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'claimsPaused',      query: readQuery });
  const { data: vestingStatus } = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'getVestingStatus',  query: readQuery });
  const { data: schedule }      = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'getVestingSchedule', query: readQuery });

  const typedVestingStatus = vestingStatus as readonly [bigint, bigint, bigint, bigint, number, bigint, boolean] | undefined;
  const claimable = typedVestingStatus?.[3] ?? 0n;
  const isBeneficiary = Boolean(address && beneficiary && String(beneficiary).toLowerCase() === String(address).toLowerCase());

  // ── Claim wiring ─────────────────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const handleClaim = async () => {
    setClaimError(null);
    setClaimSuccess(null);
    if (!isAvailable) {
      setClaimError('DevReserveVesting contract is not configured on this network.');
      return;
    }
    setIsClaiming(true);
    try {
      const hash = await writeContractAsync({
        address: VESTING_ADDRESS,
        abi: VESTING_ABI,
        functionName: 'claim',
        args: [],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setClaimSuccess('Claim submitted successfully. Vested VFIDE has been transferred to your wallet.');
    } catch (err) {
      const parsed = parseContractError(err);
      setClaimError(`Claim failed: ${parsed.userMessage}`);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Token Release</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  Token Vesting
                </span>
              </h1>
              <p className="text-white/50 text-lg">Vesting schedules, unlock timelines, and token claims.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-purple-400">24mo</div>
                <div className="text-xs text-white/40">Schedule</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-cyan-400">
                  {isBeneficiary ? '✓' : '—'}
                </div>
                <div className="text-xs text-white/40">Beneficiary</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sticky Tab Bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'overview' && <OverviewTab vestingStatus={typedVestingStatus} />}
            {activeTab === 'schedule' && (
              <ScheduleTab schedule={schedule as readonly { month: number; percentage: number; unlockTime: number | bigint; unlocked: boolean; }[] | undefined} />
            )}
            {activeTab === 'claim' && (
              <ClaimTab
                isConnected={isConnected}
                isBeneficiary={isBeneficiary}
                claimable={claimable}
                claimsPaused={Boolean(claimsPaused)}
                onClaim={handleClaim}
                isClaiming={isClaiming}
                claimError={claimError}
                claimSuccess={claimSuccess}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
