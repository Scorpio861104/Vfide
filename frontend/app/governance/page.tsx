"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState, useEffect } from "react";
import { useProofScore, useDAOProposals } from "@/lib/vfide-hooks";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Bell, Search, Vote, Users, Clock, Sparkles, Crown, Lightbulb, MessageSquare, History, BarChart3, FileText, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { CONTRACT_ADDRESSES, DAOABI } from "@/lib/contracts";
import { TimelockQueue } from "@/components/governance/TimelockQueue";
import { OverviewTab } from "./components/OverviewTab";
import { ProposalsTab } from "./components/ProposalsTab";
import { HistoryTab } from "./components/HistoryTab";
import { MembersTab } from "./components/MembersTab";
import { StatsTab } from "./components/StatsTab";
import { SuggestionsTab } from "./components/SuggestionsTab";
import { DiscussionsTab } from "./components/DiscussionsTab";
import { CreateProposalTab } from "./components/CreateProposalTab";
import { CouncilTab } from "./components/CouncilTab";
import { zeroAddress as ZERO_ADDRESS } from "viem";
import { SectionHeading, SurfaceCard, AccentBadge } from "@/components/ui/primitives";

// Use centralized ABI from lib/abis
const DAO_ABI = DAOABI;

// Contract address from centralized config
const DAO_ADDRESS = CONTRACT_ADDRESSES.DAO;

type TabType =
  | "overview"
  | "proposals"
  | "create"
  | "timelock"
  | "council"
  | "suggestions"
  | "discussions"
  | "members"
  | "history"
  | "stats";

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");
  const { address } = useAccount();
  const { toast } = useToast();
  const { score } = useProofScore();
  const { proposalCount } = useDAOProposals();

  const DAO_DEPLOYED = Boolean(DAO_ADDRESS && DAO_ADDRESS !== ZERO_ADDRESS);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && lastAction) {
      const actionMessages: Record<string, { title: string; description: string }> = {
        "vote-for": { title: "Vote Cast", description: "You voted FOR the proposal." },
        "vote-against": { title: "Vote Cast", description: "You voted AGAINST the proposal." },
        propose: { title: "Proposal Created", description: "Your proposal has been submitted." },
        finalize: { title: "Proposal Finalized", description: "The proposal has been finalized." },
      };
      const message = actionMessages[lastAction] || { title: "Transaction Successful", description: "Your transaction has been confirmed." };
      toast({
        title: message.title,
        description: message.description,
        variant: "default",
      });
      setLastAction("");
    }
  }, [isSuccess, toast, lastAction]);

  const handleVote = (proposalId: bigint, support: boolean) => {
    if (!DAO_DEPLOYED) {
      toast({ title: "DAO Not Deployed", description: "Governance contract not available yet.", variant: "destructive" });
      return;
    }
    setLastAction(support ? "vote-for" : "vote-against");
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: "vote",
      args: [proposalId, support],
    });
  };

  const handlePropose = (
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string,
  ) => {
    if (!DAO_DEPLOYED) {
      toast({ title: "DAO Not Deployed", description: "Governance contract not available yet.", variant: "destructive" });
      return;
    }
    if (!targets.length) {
      toast({ title: "Missing target", description: "Add a target contract to submit a proposal.", variant: "destructive" });
      return;
    }
    setLastAction("propose");
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: "propose",
      args: [0, targets[0], values[0] || 0n, calldatas[0] || "0x", description],
    });
  };

  const handleFinalize = (proposalId: bigint) => {
    if (!DAO_DEPLOYED) {
      toast({ title: "DAO Not Deployed", description: "Governance contract not available yet.", variant: "destructive" });
      return;
    }
    setLastAction("finalize");
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: "finalize",
      args: [proposalId],
    });
  };

  const { data: activeProposalIds } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: "getActiveProposals",
  });

  const { data: votingPower } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: "getVotingPower",
    args: address ? [address] : undefined,
  });

  const { data: voterStats } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: "getVoterStats",
    args: address ? [address] : undefined,
  });

  const { data: isEligible } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: "isEligible",
    args: address ? [address] : undefined,
  });

  const { data: votingDelay } = useReadContract({
    address: DAO_DEPLOYED ? DAO_ADDRESS : undefined,
    abi: DAO_ABI,
    functionName: "votingDelay",
  });

  const { data: votingPeriod } = useReadContract({
    address: DAO_DEPLOYED ? DAO_ADDRESS : undefined,
    abi: DAO_ABI,
    functionName: "votingPeriod",
  });

  const { data: minVotesRequired } = useReadContract({
    address: DAO_DEPLOYED ? DAO_ADDRESS : undefined,
    abi: DAO_ABI,
    functionName: "minVotesRequired",
  });

  const { data: minParticipation } = useReadContract({
    address: DAO_DEPLOYED ? DAO_ADDRESS : undefined,
    abi: DAO_ABI,
    functionName: "minParticipation",
  });

  const canPropose = Boolean(isEligible);

  const councilMembers = [
    { name: "CryptoSage", address: "0x1a2b...3c4d", role: "Lead", tenure: "Term 1", attendance: 98, votesCast: 45200 },
    { name: "VaultMaster", address: "0x5e6f...7g8h", role: "Member", tenure: "Term 1", attendance: 95, votesCast: 38500 },
    { name: "DeFiWhale", address: "0x9i0j...1k2l", role: "Member", tenure: "Term 1", attendance: 93, votesCast: 32100 },
    { name: "TokenNinja", address: "0xmnop...qrst", role: "Member", tenure: "Term 1", attendance: 92, votesCast: 28900 },
  ];

  const terms = ["Term 1", "Term 2"];
  const currentTerm = terms[0];

  const epochData = [{ epoch: 1, participation: 92, avgDecisionTime: "3.2d", emergencyActions: 1 }];

  const electionEvents = [
    { title: "Candidate AMA", date: "Jan 4, 2025", type: "Community", link: "#" },
    { title: "Voting Opens", date: "Jan 7, 2025", type: "Voting", link: "#" },
    { title: "Results Announced", date: "Jan 15, 2025", type: "Announcement", link: "#" },
  ];

  const electionStats = [
    { label: "Voter Turnout", value: "68%", change: "+4% vs last term" },
    { label: "Avg Votes/Candidate", value: "12.4k", change: "+6% vs last term" },
    { label: "Contested Seats", value: "9 of 12", change: "More competition" },
  ];

  return (
    <>
      <GlobalNav />

      <AnimatePresence>
        {(isPending || isConfirming) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-8 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin" />
              <div className="text-xl font-bold text-white">
                {isPending ? "Confirm in Wallet..." : "Processing Transaction..."}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,240,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <main className="min-h-screen pt-20">
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12 border-b border-white/10 backdrop-blur-xl bg-white/[0.02]"
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div>
                <SectionHeading
                  badge="Decentralized Governance"
                  title="DAO Governance"
                  subtitle="Shape the future of the VFIDE ecosystem"
                  badgeColor="purple"
                  align="left"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search proposals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/10 transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-400" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center font-bold animate-pulse">
                    3
                  </span>
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mt-4 max-w-md ml-auto"
                >
                  <SurfaceCard variant="default" interactive={false} className="p-4 shadow-2xl">
                    <h3 className="font-bold text-white mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-cyan-400" />
                        Urgent Notifications
                      </span>
                      <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="text-red-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 5 hours left
                        </div>
                        <div className="text-gray-300">Security Audit proposal needs your vote</div>
                      </div>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <div className="text-amber-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Quorum alert
                        </div>
                        <div className="text-gray-300">Multi-Chain proposal at 85% quorum</div>
                      </div>
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <div className="text-emerald-400 font-bold flex items-center gap-1">
                          <Vote className="w-3 h-3" /> Vote confirmed
                        </div>
                        <div className="text-gray-300">Your vote on Proposal #140 recorded</div>
                      </div>
                    </div>
                  </SurfaceCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        <section className="py-4 border-b border-white/5 backdrop-blur-sm bg-black/20 sticky top-16 z-40">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Governance sections">
              {[
                { id: "overview", label: "Overview", icon: BarChart3, color: "cyan" },
                { id: "proposals", label: "Proposals", icon: FileText, color: "cyan" },
                { id: "create", label: "Create Proposal", icon: Plus, color: "emerald" },
                { id: "council", label: "Council", icon: Crown, color: "amber" },
                { id: "suggestions", label: "Submit Idea", icon: Lightbulb, color: "emerald" },
                { id: "discussions", label: "Discussions", icon: MessageSquare, color: "amber" },
                { id: "members", label: "Members", icon: Users, color: "cyan" },
                { id: "history", label: "History", icon: History, color: "cyan" },
                { id: "stats", label: "Statistics", icon: BarChart3, color: "cyan" },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const colorMap: Record<string, string> = {
                  cyan: isActive
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                    : "hover:bg-cyan-500/10 hover:text-cyan-400",
                  emerald: isActive
                    ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25"
                    : "hover:bg-emerald-500/10 hover:text-emerald-400",
                  amber: isActive
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                    : "hover:bg-amber-500/10 hover:text-amber-400",
                };
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                      isActive ? colorMap[tab.color] : `bg-white/5 text-gray-400 ${colorMap[tab.color]}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {activeTab === "overview" && (
          <OverviewTab
            score={score}
            proposalCount={proposalCount}
            votingPowerData={votingPower as readonly bigint[] | undefined}
            voterStats={voterStats}
            isEligible={isEligible as boolean | undefined}
          />
        )}
        {activeTab === "proposals" && (
          <ProposalsTab
            searchQuery={searchQuery}
            activeProposalIds={activeProposalIds as readonly bigint[] | undefined}
            onVote={handleVote}
            onFinalize={handleFinalize}
          />
        )}
        {activeTab === "create" && (
          <CreateProposalTab
            DAO_DEPLOYED={DAO_DEPLOYED}
            canPropose={canPropose}
            isCreating={isPending || isConfirming}
            votingDelay={votingDelay as bigint | undefined}
            votingPeriod={votingPeriod as bigint | undefined}
            minVotesRequired={minVotesRequired as bigint | undefined}
            minParticipation={minParticipation as bigint | undefined}
            onPropose={handlePropose}
          />
        )}
        {activeTab === "timelock" && (
          <section className="py-8">
            <div className="container mx-auto px-4">
              <TimelockQueue />
            </div>
          </section>
        )}
        {activeTab === "council" && (
          <CouncilTab
            councilMembers={councilMembers}
            terms={terms}
            currentTerm={currentTerm}
            epochData={epochData}
            electionEvents={electionEvents}
            electionStats={electionStats}
          />
        )}
        {activeTab === "suggestions" && <SuggestionsTab />}
        {activeTab === "discussions" && <DiscussionsTab searchQuery={searchQuery} />}
        {activeTab === "members" && <MembersTab searchQuery={searchQuery} />}
        {activeTab === "history" && <HistoryTab searchQuery={searchQuery} />}
        {activeTab === "stats" && <StatsTab />}
      </main>

      <Footer />
    </>
  );
}
