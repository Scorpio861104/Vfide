'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, Plus, Search, Clock, Check, X, Shield, AlertTriangle, Users, ChevronDown, ChevronUp, Zap, ArrowRight, HandCoins } from 'lucide-react';
import { formatEther, parseEther } from 'viem';
import { SEED_LOAN_OFFERS } from '@/lib/data/seed';
import { Footer } from '@/components/layout/Footer';

type Tab = 'borrow' | 'lend' | 'my-loans' | 'flash';
type LoanState = 'OPEN' | 'COSIGNING' | 'ACTIVE' | 'GRACE' | 'RESTRUCTURED' | 'REPAID' | 'DEFAULTED' | 'CANCELLED';

const STATE_LABELS: Record<number, LoanState> = { 0: 'OPEN', 1: 'COSIGNING', 2: 'ACTIVE', 3: 'GRACE', 4: 'RESTRUCTURED', 5: 'REPAID', 6: 'DEFAULTED', 7: 'CANCELLED' };
const STATE_COLORS: Record<LoanState, string> = {
  OPEN: 'bg-cyan-500/20 text-cyan-400', COSIGNING: 'bg-blue-500/20 text-blue-400',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400', GRACE: 'bg-amber-500/20 text-amber-400',
  RESTRUCTURED: 'bg-purple-500/20 text-purple-400', REPAID: 'bg-emerald-500/20 text-emerald-400',
  DEFAULTED: 'bg-red-500/20 text-red-400', CANCELLED: 'bg-gray-500/20 text-gray-400',
};

interface LoanData {
  id: number; lender: string; borrower: string; principal: bigint;
  interestBps: bigint; duration: bigint; startTime: bigint; deadline: bigint;
  amountRepaid: bigint; revenueAssignment: boolean; state: number;
}

export default function LendingPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>('borrow');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);

  // Create loan form
  const [principal, setPrincipal] = useState('');
  const [interestBps, setInterestBps] = useState('500'); // 5% default
  const [durationDays, setDurationDays] = useState('14');

  // Mock data — in production, read from contract events / subgraph
  const [openLoans, setOpenLoans] = useState<LoanData[]>([]);
  const [myLoans, setMyLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLaneCount, setPreviewLaneCount] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const shortAddr = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '';
  const daysFromSeconds = (s: bigint) => Number(s) / 86400;
  const formatVFIDE = (wei: bigint) => {
    const eth = Number(formatEther(wei));
    return eth.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadLanes() {
      if (!address) {
        setPreviewLaneCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPreviewError(null);
        const response = await fetch('/api/flashloans/lanes?limit=6', { credentials: 'include' });
        const data = await response.json().catch(() => ({ lanes: [] }));

        if (!response.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Lane preview offline');
        }

        if (!cancelled) {
          setPreviewLaneCount(Array.isArray(data?.lanes) ? data.lanes.length : 0);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Lane preview offline');
          setPreviewLaneCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLanes();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!isConnected) return (
    <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center">
      <div className="text-center"><Banknote size={48} className="mx-auto mb-4 text-gray-600" /><p className="text-gray-400">Connect wallet to access P2P lending</p></div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2"><HandCoins className="text-cyan-400" />P2P Lending</h1>
          <p className="text-gray-400 text-sm mb-6">Trust-based loans between people. Your ProofScore is your collateral.</p>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Live lanes</div>
              <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : previewLaneCount}</div>
              <div className="mt-1 text-sm text-gray-300">{loading ? 'Loading preview…' : `${previewLaneCount} live lane${previewLaneCount === 1 ? '' : 's'}`}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <div className="flex flex-wrap gap-3">
                <Link href="/flashloans" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white">
                  Open Flashloans Workspace <ArrowRight size={14} />
                </Link>
                <Link href="/flashloans" className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
                  View Flash Loans <ArrowRight size={14} />
                </Link>
              </div>
              {previewError ? (
                <div className="mt-3 text-xs text-amber-200">{previewError}</div>
              ) : null}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-6 p-1 bg-white/3 rounded-xl border border-white/10">
            {([
              { id: 'borrow' as Tab, label: 'Borrow', icon: <Banknote size={14} /> },
              { id: 'lend' as Tab, label: 'Lend', icon: <Plus size={14} /> },
              { id: 'my-loans' as Tab, label: 'My Loans', icon: <Clock size={14} /> },
              { id: 'flash' as Tab, label: 'Flash Loans', icon: <Zap size={14} /> },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition-all ${tab === t.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── BORROW TAB ─────────────────────────────────────── */}
          {tab === 'borrow' && (
            <div className="space-y-4">
              <div className="p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
                <p className="text-cyan-400 text-sm font-medium mb-1">How borrowing works</p>
                <p className="text-gray-400 text-xs">Browse offers from lenders. Accept one and your vault guardian co-signs. No token collateral — your ProofScore and your guardian&apos;s commitment are your guarantee. Interest is capped at 12%. Duration is max 30 days.</p>
              </div>

              {SEED_LOAN_OFFERS.length === 0 ? (
                <div className="text-center py-16">
                  <Search size={48} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 mb-1">No loan offers available right now</p>
                  <p className="text-gray-600 text-xs">Check back later or ask a community member to create an offer</p>
                </div>
              ) : (
                SEED_LOAN_OFFERS.map(loan => (
                  <div key={loan.id} className="p-4 bg-white/3 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-white font-mono font-bold text-lg">{loan.principal} VFIDE</span>
                        <span className="text-gray-500 text-xs ml-2">from {loan.lenderName}</span>
                        <span className="text-cyan-400 text-[10px] ml-1 flex items-center gap-0.5 inline-flex"><Shield size={8} />{loan.lenderScore}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">{loan.state}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400 mb-3">
                      <span>Interest: <span className="text-white">{loan.interestBps / 100}%</span></span>
                      <span>Duration: <span className="text-white">{loan.durationDays} days</span></span>
                      <span>Repay: <span className="text-white">{(loan.principal * (1 + loan.interestBps / 10000)).toFixed(0)} VFIDE</span></span>
                    </div>
                    <button className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                      Accept Loan <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── LEND TAB ──────────────────────────────────────── */}
          {tab === 'lend' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <p className="text-emerald-400 text-sm font-medium mb-1">How lending works</p>
                <p className="text-gray-400 text-xs">Create an offer with your terms. A borrower accepts and their guardian co-signs. You earn interest when they repay. If they default, their ProofScore is devastated (-20.0) and their guardian&apos;s funds are slowly extracted to repay you. Risk is real — lend to people you trust.</p>
              </div>

              <button onClick={() => setShowCreate(!showCreate)}
                className="w-full py-3 flex items-center justify-center gap-2 bg-white/3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
                <Plus size={16} />Create Loan Offer
              </button>

              <AnimatePresence>
                {showCreate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="p-5 bg-white/3 border border-white/10 rounded-2xl space-y-4">

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Amount to Lend (VFIDE)</label>
                      <input value={principal} onChange={e => setPrincipal(e.target.value)} type="number" step="1" placeholder="500"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-lg focus:border-emerald-500/50 focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Interest Rate</label>
                        <div className="flex gap-1.5">
                          {['300', '500', '800', '1000'].map(r => (
                            <button key={r} onClick={() => setInterestBps(r)}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold ${interestBps === r ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                              {parseInt(r) / 100}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                        <div className="flex gap-1.5">
                          {['7', '14', '21', '30'].map(d => (
                            <button key={d} onClick={() => setDurationDays(d)}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold ${durationDays === d ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                              {d}d
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {principal && (
                      <div className="p-3 bg-white/3 rounded-xl space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-gray-400">You lend</span><span className="text-white font-mono">{principal} VFIDE</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Interest earned</span><span className="text-emerald-400 font-mono">{(parseFloat(principal) * parseInt(interestBps) / 10000).toFixed(2)} VFIDE</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">You receive back</span><span className="text-white font-mono font-bold">{(parseFloat(principal) * (1 + parseInt(interestBps) / 10000)).toFixed(2)} VFIDE</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="text-white">{durationDays} days + 3 day grace</span></div>
                      </div>
                    )}

                    <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                      <p className="text-amber-400 text-xs flex items-center gap-1.5"><AlertTriangle size={12} />Your principal is locked until the borrower repays or defaults. If they default, guarantor extraction begins (10% per week). Risk is real.</p>
                    </div>

                    <button disabled={!principal || parseFloat(principal) <= 0}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl disabled:opacity-30 flex items-center justify-center gap-2">
                      <Banknote size={16} />Create Offer & Lock {principal || '0'} VFIDE
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── MY LOANS TAB ──────────────────────────────────── */}
          {tab === 'my-loans' && (
            <div className="space-y-4">
              {myLoans.length === 0 ? (
                <div className="text-center py-16">
                  <Clock size={48} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 mb-1">No active loans</p>
                  <p className="text-gray-600 text-xs">Your lending and borrowing history will appear here</p>
                </div>
              ) : (
                myLoans.map(loan => {
                  const isBorrower = loan.borrower.toLowerCase() === address?.toLowerCase();
                  const isLender = loan.lender.toLowerCase() === address?.toLowerCase();
                  const state = STATE_LABELS[loan.state] ?? 'OPEN';
                  return (
                    <div key={loan.id} className="p-4 bg-white/3 border border-white/10 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${isBorrower ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isBorrower ? 'Borrowing' : 'Lending'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATE_COLORS[state]}`}>{state}</span>
                        </div>
                        <span className="text-white font-mono font-bold">{formatVFIDE(loan.principal)} VFIDE</span>
                      </div>
                      <div className="text-gray-500 text-xs space-y-0.5">
                        <div>{isBorrower ? 'From' : 'To'}: {shortAddr(isBorrower ? loan.lender : loan.borrower)}</div>
                        <div>Interest: {Number(loan.interestBps) / 100}% · Duration: {daysFromSeconds(loan.duration)} days</div>
                        {loan.deadline > 0n && <div>Deadline: {new Date(Number(loan.deadline) * 1000).toLocaleDateString()}</div>}
                      </div>

                      {/* Action buttons based on state */}
                      {state === 'ACTIVE' && isBorrower && (
                        <button className="mt-3 w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl text-sm">Repay Now</button>
                      )}
                      {state === 'DEFAULTED' && isBorrower && (
                        <button className="mt-3 w-full py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-xl text-sm">Repay Default & Restore Score</button>
                      )}
                      {state === 'DEFAULTED' && isLender && (
                        <button className="mt-3 w-full py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold rounded-xl text-sm">Extract from Guarantors</button>
                      )}
                      {state === 'COSIGNING' && isBorrower && (
                        <div className="mt-3 p-2 bg-blue-500/5 border border-blue-500/15 rounded-lg text-blue-400 text-xs flex items-center gap-1.5">
                          <Users size={12} />Waiting for your guardian to co-sign this loan
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── FLASH LOANS TAB ───────────────────────────────── */}
          {tab === 'flash' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                <p className="text-purple-400 text-sm font-medium mb-1 flex items-center gap-1.5"><Zap size={14} />Atomic Flash Loans</p>
                <p className="text-gray-400 text-xs">Borrow any amount, use it, and repay in the same transaction. If you don&apos;t repay, the entire transaction reverts. Zero risk to lenders. Used for arbitrage, liquidations, and refinancing.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/3 border border-white/10 rounded-2xl text-center">
                  <h3 className="text-sm text-gray-400 mb-2">Provide Liquidity</h3>
                  <p className="text-gray-500 text-xs mb-4">Deposit VFIDE for others to flash-borrow. Set your fee. Earn on every loan. Your funds are never at risk.</p>
                  <button className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl text-sm">Deposit & Earn</button>
                </div>
                <div className="p-5 bg-white/3 border border-white/10 rounded-2xl text-center">
                  <h3 className="text-sm text-gray-400 mb-2">Flash Borrow</h3>
                  <p className="text-gray-500 text-xs mb-4">For developers: borrow via smart contract callback. See docs for IERC3156FlashBorrower implementation.</p>
                  <button onClick={() => window.open('/developer', '_blank')} className="w-full py-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold rounded-xl text-sm">Developer Docs</button>
                </div>
              </div>

              {/* Flash lender stats would go here */}
              <div className="p-4 bg-white/3 border border-white/10 rounded-2xl">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Your Flash Loan Stats</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-gray-500 text-xs">Deposited</div><div className="text-white font-mono">0 VFIDE</div></div>
                  <div><div className="text-gray-500 text-xs">Earned</div><div className="text-emerald-400 font-mono">0 VFIDE</div></div>
                  <div><div className="text-gray-500 text-xs">Loans Served</div><div className="text-white font-mono">0</div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
