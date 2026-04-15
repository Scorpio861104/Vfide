'use client';
import { containerVariants, fadeSlideUp as itemVariants } from "@/lib/motion-presets";

import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Shield, Mail, User, Users, AlertCircle, ChevronRight,
  Sparkles, Fingerprint, Unlock, Radar, Scan, RefreshCw, Zap
} from "lucide-react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress, keccak256, stringToHex, zeroAddress } from "viem";
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from "@/lib/contracts";
import { SeerABI, VFIDEBadgeNFTABI, VaultRegistryABI } from "@/lib/abis";

import { AuroraBackground, FloatingParticles, VaultKeyVisualization, GlassCard } from "./components/VisualEffects";
import { SearchMethodButton, SearchResultCard } from "./components/SearchComponents";
import { ClaimFlowModal } from "./components/ClaimFlowModal";

// ── Animation presets ───────────────────────────────────────────────────────

// ── How It Works steps ──────────────────────────────────────────────────────
const RECOVERY_STEPS = [
  { step: 1, icon: Search, title: "Find Your Vault", description: "Search using your recovery ID, email, username, or through a trusted guardian", gradient: "cyan" as const },
  { step: 2, icon: Users, title: "Guardian Verification", description: "Your pre-designated guardians verify your identity and approve the recovery request", gradient: "purple" as const },
  { step: 3, icon: Unlock, title: "Secure Transfer", description: "After a 7-day challenge period, ownership securely transfers to your new wallet", gradient: "green" as const },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function VaultRecoveryPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const isVaultRegistryAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultRegistry)
  const isSeerAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)
  const isBadgeNftAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.BadgeNFT)
  const [searchMethod, setSearchMethod] = useState<"recoveryId" | "email" | "username" | "guardian">("recoveryId");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    address: string; originalOwner: string; proofScore: number;
    badgeCount: number; hasGuardians: boolean; lastActive: string; isRecoverable: boolean;
  } | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [error, setError] = useState("");

  // ── Search handler ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) { setError("Please enter a search term"); return; }
    setIsSearching(true); setError(""); setSearchResult(null);

    try {
      if (!publicClient) { setError("Wallet client not ready. Please connect and try again."); return; }
      if (!isVaultRegistryAvailable) { setError("Vault registry contract is not configured in this environment."); return; }

      const normalizedQuery = searchQuery.trim();
      let resolvedVault: `0x${string}` | undefined;

      if (searchMethod === "recoveryId") {
        const v = await publicClient.readContract({ address: CONTRACT_ADDRESSES.VaultRegistry, abi: VaultRegistryABI, functionName: "searchByRecoveryId", args: [normalizedQuery] });
        if (v && v !== zeroAddress) resolvedVault = v as `0x${string}`;
      } else if (searchMethod === "email") {
        const emailHash = keccak256(stringToHex(normalizedQuery.toLowerCase()));
        const v = await publicClient.readContract({ address: CONTRACT_ADDRESSES.VaultRegistry, abi: VaultRegistryABI, functionName: "searchByEmail", args: [emailHash] });
        if (v && v !== zeroAddress) resolvedVault = v as `0x${string}`;
      } else if (searchMethod === "username") {
        const v = await publicClient.readContract({ address: CONTRACT_ADDRESSES.VaultRegistry, abi: VaultRegistryABI, functionName: "searchByUsername", args: [normalizedQuery] });
        if (v && v !== zeroAddress) resolvedVault = v as `0x${string}`;
      } else {
        if (!isAddress(normalizedQuery)) { setError("Please enter a valid guardian wallet address (0x...)"); return; }
        const vaults = await publicClient.readContract({ address: CONTRACT_ADDRESSES.VaultRegistry, abi: VaultRegistryABI, functionName: "searchByGuardian", args: [normalizedQuery as `0x${string}`] });
        resolvedVault = (vaults as `0x${string}`[] | undefined)?.find((v) => v !== zeroAddress);
      }

      if (!resolvedVault) { setError(`No vault found for the provided ${searchMethod}.`); return; }

      if (!isSeerAvailable || !isBadgeNftAvailable) {
        setError("Vault metadata contracts are not fully configured in this environment.")
        return
      }

      const [info, score, badges] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESSES.VaultRegistry, abi: VaultRegistryABI, functionName: "getVaultInfo", args: [resolvedVault] }),
        publicClient.readContract({ address: CONTRACT_ADDRESSES.Seer, abi: SeerABI, functionName: "getScore", args: [resolvedVault] }),
        publicClient.readContract({ address: CONTRACT_ADDRESSES.BadgeNFT, abi: VFIDEBadgeNFTABI, functionName: "balanceOf", args: [resolvedVault] }),
      ]);

      const parsedInfo = Array.isArray(info)
        ? {
            originalOwner: info[0] as string,
            createdAt: info[1] as bigint,
            hasGuardians: info[2] as boolean,
            isRecoverable: info[3] as boolean,
          }
        : (info as { originalOwner: string; createdAt: bigint; hasGuardians: boolean; isRecoverable: boolean } | undefined);

      if (!parsedInfo || !parsedInfo.isRecoverable) { setError("Vault exists in registry but metadata lookup failed."); return; }

      const { originalOwner: owner, createdAt, hasGuardians, isRecoverable } = parsedInfo;
      const daysSince = Math.floor((Date.now() - Number(createdAt) * 1000) / (1000 * 60 * 60 * 24));
      const lastActive = daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince} days ago`;

      setSearchResult({
        address: resolvedVault, originalOwner: owner,
        proofScore: score ? Number(score as bigint) / 100 : 0,
        badgeCount: badges ? Number(badges as bigint) : 0,
        hasGuardians, lastActive, isRecoverable: isRecoverable && owner !== address,
      });
    } catch { setError("Failed to fetch vault information. Please try again."); }
    finally { setIsSearching(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <h1 className="sr-only">Vault Recovery</h1>
      <AuroraBackground />
      <FloatingParticles />

      {/* Hero */}
      <section className="relative pt-28 pb-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </motion.div>
              <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Industry First: Wallet Recovery Without Seed Phrases</span>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
              <span className="text-white">Find & Recover</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">Your Vault</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Lost your wallet? No problem. Search for your vault using your <span className="text-cyan-400"> recovery ID</span>, <span className="text-purple-400"> email</span>, <span className="text-amber-400"> username</span>, or through your <span className="text-emerald-400"> guardians</span>.
            </motion.p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="mb-10">
            <VaultKeyVisualization isSearching={isSearching} />
          </motion.div>
        </div>
      </section>

      {/* Search Section */}
      <section className="relative py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
            <motion.div variants={itemVariants}>
              <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2"><Radar className="h-5 w-5 text-cyan-400" /> Select Search Method</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SearchMethodButton icon={Fingerprint} title="Recovery ID" description="Your secret phrase" active={searchMethod === "recoveryId"} onClick={() => setSearchMethod("recoveryId")} gradient="cyan" badge="Best" />
                <SearchMethodButton icon={Mail} title="Email" description="Linked email address" active={searchMethod === "email"} onClick={() => setSearchMethod("email")} gradient="purple" />
                <SearchMethodButton icon={User} title="Username" description="Your VFide username" active={searchMethod === "username"} onClick={() => setSearchMethod("username")} gradient="gold" />
                <SearchMethodButton icon={Users} title="Guardian" description="Through your guardian" active={searchMethod === "guardian"} onClick={() => setSearchMethod("guardian")} gradient="green" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassCard className="p-8" hover={false} glow gradient="cyan">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2"><Search className="h-5 w-5 text-cyan-400" /></div>
                    <input type={searchMethod === "email" ? "email" : "text"} value={searchQuery} onChange={(e) =>  setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                     
                      className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white/5 border-2 border-white/10 text-white  focus:outline-none focus:border-cyan-500/50 text-lg transition-all" />
                  </div>
                  <motion.button onClick={handleSearch} disabled={isSearching} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl font-bold text-white flex items-center justify-center gap-3 disabled:opacity-50 sm:min-w-50 shadow-lg shadow-cyan-500/30 relative overflow-hidden group">
                    {isSearching ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw className="h-5 w-5" /></motion.div><span>Searching...</span></>) : (<><Scan className="h-5 w-5" /><span>Search Vault</span></>)}
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </motion.button>
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" /><p className="text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>

            <AnimatePresence>
              {searchResult && <SearchResultCard vault={searchResult} onClaimClick={() => setShowClaimModal(true)} />}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
              <Zap className="h-4 w-4 text-purple-400" /><span className="text-sm text-purple-400 font-medium">Secure Process</span>
            </motion.div>
            <h2 className="text-4xl font-bold text-white mb-4">How Recovery Works</h2>
            <p className="text-gray-400 text-lg">A secure, multi-step process to protect against fraud</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {RECOVERY_STEPS.map((item, index) => (
              <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                <GlassCard className="p-8 h-full" gradient={item.gradient} glow>
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-2xl font-black text-white border border-white/20">{item.step}</motion.div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/10"><item.icon className="h-6 w-6 text-white" /></div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <GlassCard className="p-10 text-center relative overflow-hidden" gradient="gold" glow hover={false}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl" />
              <div className="relative z-10">
                <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity }} className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Shield className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-3">Set Up Your Recovery Now</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">Don&apos;t wait until you lose your wallet. Configure your recovery options today.</p>
                <Link href="/vault/settings">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-white inline-flex items-center gap-3 shadow-lg shadow-amber-500/30">
                    Configure Recovery <ChevronRight className="h-5 w-5" />
                  </motion.button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {showClaimModal && searchResult && <ClaimFlowModal vault={{ address: searchResult.address, originalOwner: searchResult.originalOwner }} onClose={() => setShowClaimModal(false)} />}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
