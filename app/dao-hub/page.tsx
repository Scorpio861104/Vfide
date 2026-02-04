'use client'

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Crown,
  DollarSign,
  FileCheck,
  Gavel,
  MessageCircle,
  Scale,
  Shield,
  Timer,
  Users,
} from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { CouncilElectionABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { useProofScore } from "@/lib/vfide-hooks";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const accessRules = [
  {
    title: "Active DAO Term Required",
    detail: "Only active DAO members can access the hub. Term-limited members are locked from proposals, disputes, and DAO payouts.",
    icon: <Crown className="w-4 h-4" />,
  },
  {
    title: "Auto-lock on Term Expiry",
    detail: "DAO access revokes immediately when a term ends or the member is removed, including escrow dispute authority.",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    title: "DAO-only Messaging",
    detail: "Encrypted messaging stays private to active members for deliberations, arbitration notes, and P2P credit disputes.",
    icon: <MessageCircle className="w-4 h-4" />,
  },
  {
    title: "Seer Oversight & Vote Attendance",
    detail: "The Seer can remove members for misconduct before the 12-month term ends. Missing more than 2 votes locks DAO access and payments.",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  {
    title: "90% Member Removal Vote",
    detail: "DAO members can vote peers out with a 90% supermajority. Successful removals immediately lock access, payouts, and DAO payment approvals.",
    icon: <Gavel className="w-4 h-4" />,
  },
];

const disputeQueue = [
  {
    id: "ESC-1421",
    status: "Arbitration Pending",
    reported: "12 minutes ago",
    priority: "High",
    summary: "Buyer alleges non-delivery on cross-chain merchant order.",
  },
  {
    id: "ESC-1417",
    status: "Evidence Review",
    reported: "1 hour ago",
    priority: "Medium",
    summary: "Merchant submitted delivery proof; awaiting buyer response.",
  },
  {
    id: "ESC-1399",
    status: "Cooling-off",
    reported: "4 hours ago",
    priority: "Low",
    summary: "Small ticket dispute, auto-resolution window open.",
  },
];

const proposalQueue = [
  {
    id: "DAO-72",
    title: "Adjust escrow timeout for high-trust merchants",
    status: "Voting live",
    quorum: "68%",
    due: "23h",
  },
  {
    id: "DAO-73",
    title: "Add DAO dispute reviewers rotation",
    status: "Draft",
    quorum: "Pending",
    due: "—",
  },
  {
    id: "DAO-70",
    title: "Treasury safety runway update",
    status: "Queued",
    quorum: "92%",
    due: "7d",
  },
];

const messageQueue = [
  {
    topic: "Escrow arbitration briefing",
    from: "Council Chair",
    time: "5m ago",
    preview: "New evidence bundle uploaded for ESC-1421. Please review.",
  },
  {
    topic: "Term rotation check-in",
    from: "DAO Ops",
    time: "1h ago",
    preview: "Confirm availability for upcoming rotation and offboarding.",
  },
  {
    topic: "Treasury vote reminder",
    from: "Governance Bot",
    time: "2h ago",
    preview: "DAO-72 voting closes in 23 hours. Quorum at 68%.",
  },
];

const paymentQueue = [
  {
    id: "PAYOUT-88",
    status: "Council Review",
    amount: "42,800 VFIDE",
    approvals: "3 of 5",
    summary: "Merchant arbitration refund batch for closed disputes.",
  },
  {
    id: "PAYOUT-86",
    status: "Queued",
    amount: "18,250 VFIDE",
    approvals: "Pending",
    summary: "Treasury grant milestone for infrastructure partners.",
  },
  {
    id: "PAYOUT-84",
    status: "Scheduled",
    amount: "9,600 VFIDE",
    approvals: "5 of 5",
    summary: "DAO member compensation auto-release at term close.",
  },
];

export default function DaoHubPage() {
  const { address, isConnected } = useAccount();
  const councilAddress = CONTRACT_ADDRESSES.CouncilElection;
  const isCouncilDeployed = councilAddress !== ZERO_ADDRESS;
  const { score } = useProofScore(address);

  const { data: isCouncilMember } = useReadContract({
    address: councilAddress,
    abi: CouncilElectionABI,
    functionName: "isCouncilMember",
    args: address ? [address] : undefined,
    query: { enabled: isCouncilDeployed && !!address },
  });

  const { data: termEligibility } = useReadContract({
    address: councilAddress,
    abi: CouncilElectionABI,
    functionName: "canServeNextTerm",
    args: address ? [address] : undefined,
    query: { enabled: isCouncilDeployed && !!address },
  });

  const eligibilityData = termEligibility as [boolean, number, bigint] | undefined;
  const termsServed = eligibilityData ? Number(eligibilityData[1]) : 0;
  const cooldownEnds = eligibilityData ? eligibilityData[2] : BigInt(0);
  const cooldownEndsDate = cooldownEnds > 0n ? new Date(Number(cooldownEnds) * 1000) : null;
  const isActiveMember = Boolean(isCouncilMember);
  const accessMode = (() => {
    if (!isConnected) return "disconnected";
    if (!isCouncilDeployed) return "preview";
    if (isActiveMember) return "active";
    return "locked";
  })();

  const currentTermNumber = isActiveMember ? Math.max(1, termsServed || 1) : termsServed;
  const termLabel = currentTermNumber > 0 ? `Term ${currentTermNumber}` : "—";

  const nextEligibleLabel = cooldownEndsDate
    ? cooldownEndsDate.toLocaleDateString()
    : isCouncilDeployed
      ? "On-chain"
      : "—";

  const currentMember = {
    name: isActiveMember ? "Active DAO Member" : "DAO Member",
    address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—",
    term: termLabel,
    nextEligible: nextEligibleLabel,
    status: isActiveMember ? "active" : "locked",
    proofScore: score,
  };
  const maxMissedVotes = 2;
  const missedVotes = isActiveMember ? 1 : 0;
  const attendanceLabel = isActiveMember ? `${missedVotes} / ${maxMissedVotes}` : "—";
  const remainingVotes = Math.max(0, maxMissedVotes - missedVotes);
  const attendanceBufferLabel = isActiveMember
    ? `${remainingVotes} vote${remainingVotes === 1 ? "" : "s"} left`
    : "—";

  const accessStatusMap = {
    active: "Access Active",
    preview: "Preview Mode",
    disconnected: "Wallet Required",
    locked: "Access Locked",
  } as const;
  const accessStatusLabel = accessStatusMap[accessMode];

  const termExpiryLabel =
    cooldownEndsDate && isActiveMember
      ? `${Math.max(0, Math.ceil((cooldownEndsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d`
      : "—";

  return (
    <>
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#101322] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.12),transparent_50%)]" />
      </div>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-16"
      >
        <section className="container mx-auto px-3 sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-200">
              <Shield className="w-4 h-4" /> DAO Members Only
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-black text-white">
              DAO Operations Hub
            </h1>
            <p className="mt-3 text-lg text-zinc-400 max-w-3xl mx-auto">
              Central command for active proposals, escrow disputes, and member-only communications.
              Term-limited members are automatically locked out of DAO functions and payments.
            </p>
          </motion.div>

          {accessMode !== "active" && (
            <div className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
              <div className="flex items-center gap-3 text-base font-semibold text-amber-100">
                <AlertTriangle className="w-5 h-5" />
                DAO Access Required
              </div>
              <p className="mt-2 text-amber-100/80">
                {accessMode === "disconnected"
                  ? "Connect a wallet linked to an active DAO term to unlock proposals, dispute handling, and DAO messaging."
                  : accessMode === "preview"
                    ? "DAO membership verification is offline. Features are in preview mode until the council contract is connected."
                    : "Your DAO term has ended or you are no longer an active member. Access to DAO functions and payments is locked."}
              </p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 mb-12">
            <div className="rounded-2xl border border-indigo-500/20 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-5 h-5 text-indigo-300" />
                <h2 className="text-lg font-bold text-white">Active Member Status</h2>
              </div>
              <div className="space-y-3 text-sm text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Member</span>
                  <span className="font-semibold">{currentMember.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Wallet</span>
                  <span className="font-mono">{currentMember.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Term</span>
                  <span>{currentMember.term}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Next Eligible</span>
                  <span className="text-amber-300">{currentMember.nextEligible}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ProofScore</span>
                  <span className="text-emerald-300 font-semibold">{currentMember.proofScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Votes Missed</span>
                  <span className="text-amber-300">{attendanceLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Attendance Buffer</span>
                  <span className="text-emerald-300">{attendanceBufferLabel}</span>
                </div>
                <div className={`flex items-center gap-2 ${isActiveMember ? "text-emerald-300" : "text-amber-300"}`}>
                  <CheckCircle className="w-4 h-4" />
                  {accessStatusLabel}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-cyan-300" />
                <h2 className="text-lg font-bold text-white">DAO Notifications</h2>
              </div>
              <div className="space-y-4 text-sm text-zinc-300">
                <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
                  <div>
                    <div className="font-semibold text-cyan-100">Dispute Escalations</div>
                    <div className="text-xs text-zinc-400">Auto-pushed to DAO hub queue</div>
                  </div>
                  <span className="text-cyan-200 font-semibold">Live</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
                  <div>
                    <div className="font-semibold text-indigo-100">Proposal Alerts</div>
                    <div className="text-xs text-zinc-400">Voting windows + quorum updates</div>
                  </div>
                  <span className="text-indigo-200 font-semibold">Enabled</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <div>
                    <div className="font-semibold text-emerald-100">Term Expiry</div>
                    <div className="text-xs text-zinc-400">Auto-locking + offboarding</div>
                  </div>
                  <span className="text-emerald-200 font-semibold">{termExpiryLabel}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Gavel className="w-5 h-5 text-amber-300" />
                <h2 className="text-lg font-bold text-white">DAO Rules</h2>
              </div>
              <div className="space-y-3 text-sm text-zinc-300">
                {accessRules.map((rule) => (
                  <div key={rule.title} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2 text-amber-200 font-semibold">
                      {rule.icon}
                      {rule.title}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{rule.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {accessMode === "active" && (
            <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="w-5 h-5 text-red-300" />
                  <h2 className="text-lg font-bold text-white">Active Disputes</h2>
                </div>
                <div className="space-y-4 text-sm">
                  {disputeQueue.map((dispute) => (
                    <div key={dispute.id} className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-red-200 font-semibold">{dispute.id}</span>
                        <span className="text-xs text-red-100">{dispute.priority}</span>
                      </div>
                      <div className="mt-1 text-zinc-100">{dispute.status}</div>
                      <p className="text-xs text-zinc-400 mt-2">{dispute.summary}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-red-200">
                        <Timer className="w-4 h-4" /> {dispute.reported}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileCheck className="w-5 h-5 text-cyan-300" />
                  <h2 className="text-lg font-bold text-white">Proposal Pipeline</h2>
                </div>
                <div className="space-y-4 text-sm">
                  {proposalQueue.map((proposal) => (
                    <div key={proposal.id} className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                      <div className="flex items-center justify-between text-cyan-100 font-semibold">
                        <span>{proposal.id}</span>
                        <span className="text-xs">{proposal.due}</span>
                      </div>
                      <p className="mt-2 text-zinc-100">{proposal.title}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                        <span>Status: {proposal.status}</span>
                        <span>Quorum: {proposal.quorum}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-5 h-5 text-emerald-300" />
                  <h2 className="text-lg font-bold text-white">DAO Messages</h2>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 mb-4">
                  <div className="font-semibold">Encrypted DAO-only Channel</div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Messages are visible only to active DAO members. Term-expired accounts are locked out automatically.
                  </p>
                  <textarea
                    placeholder="Share arbitration notes or proposal updates…"
                    className="mt-3 w-full rounded-lg border border-emerald-500/20 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    rows={3}
                  />
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                  >
                    Send to DAO Channel
                  </button>
                </div>
                <div className="space-y-4 text-sm">
                  {messageQueue.map((message) => (
                    <div key={message.topic} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between text-emerald-100 font-semibold">
                        <span>{message.topic}</span>
                        <span className="text-xs">{message.time}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">From: {message.from}</div>
                      <p className="mt-2 text-zinc-100">{message.preview}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-amber-300" />
                  <h2 className="text-lg font-bold text-white">DAO Payment Queue</h2>
                </div>
                <div className="space-y-4 text-sm">
                  {paymentQueue.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="flex items-center justify-between text-amber-100 font-semibold">
                        <span>{payment.id}</span>
                        <span className="text-xs">{payment.approvals}</span>
                      </div>
                      <p className="mt-2 text-zinc-100">{payment.summary}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                        <span>Status: {payment.status}</span>
                        <span>{payment.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              {
                icon: <Users className="w-4 h-4" />,
                title: "Member Term Limits",
                description: "Members rotate on fixed terms. Access revokes immediately at term end or removal.",
              },
              {
                icon: <Gavel className="w-4 h-4" />,
                title: "90% Removal Vote",
                description: "Members can vote peers out with a 90% supermajority. Offboarded members lose DAO access instantly.",
              },
              {
                icon: <AlertTriangle className="w-4 h-4" />,
                title: "Escrow Arbitration",
                description: "Disputes auto-route here with evidence packs for DAO resolution.",
              },
              {
                icon: <MessageCircle className="w-4 h-4" />,
                title: "DAO-only Messaging",
                description: "Private coordination channel for live deliberation and dispute notes.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                <div className="flex items-center gap-2 text-zinc-100 font-semibold">
                  {card.icon}
                  {card.title}
                </div>
                <p className="mt-2 text-xs text-zinc-400">{card.description}</p>
              </div>
            ))}
          </div>
        </section>
      </motion.main>
      <Footer />
    </>
  );
}
