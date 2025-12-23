"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useVaultRecovery } from "@/hooks/useVaultRecovery";
import { useVaultHub } from "@/hooks/useVaultHub";
import { TransactionHistory } from "@/components/vault/TransactionHistory";
import { useToast } from "@/components/ui/toast";
import { useAccount } from "wagmi";
import { useState } from "react";

function VaultContent() {
  const { showToast } = useToast();

const { address } = useAccount();
  
  // Get user's vault address from VaultHub contract
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  
  const {
    vaultOwner,
    guardianCount,
    isUserGuardian,
    isGuardianMature,
    nextOfKin,
    recoveryStatus,
    isWritePending,
    setNextOfKinAddress,
    addGuardian,
    requestRecovery,
    approveRecovery,
    finalizeRecovery,
    cancelRecovery,
  } = useVaultRecovery(vaultAddress);
  
  const [newKinAddress, setNewKinAddress] = useState("");
  const [newGuardianAddress, setNewGuardianAddress] = useState("");
  const [recoveryAddress, setRecoveryAddress] = useState("");
  
  const handleSetNextOfKin = async () => {
    if (!newKinAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      showToast("Invalid address format", "error");
      return;
    }
    try {
      await setNextOfKinAddress(newKinAddress as `0x${string}`);
      setNewKinAddress("");
      showToast("Next of Kin set successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to set Next of Kin", "error");
    }
  };
  
  const handleAddGuardian = async () => {
    if (!newGuardianAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      showToast("Invalid address format", "error");
      return;
    }
    try {
      await addGuardian(newGuardianAddress as `0x${string}`);
      setNewGuardianAddress("");
      showToast("Guardian added successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to add guardian", "error");
    }
  };
  
  const handleRequestRecovery = async () => {
    if (!recoveryAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      showToast("Invalid address format", "error");
      return;
    }
    try {
      await requestRecovery(recoveryAddress as `0x${string}`);
      setRecoveryAddress("");
      showToast("Recovery requested! Guardians will be notified.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to request recovery", "error");
    }
  };
  
  const handleApproveRecovery = async () => {
    try {
      await approveRecovery();
      showToast("Recovery approved!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to approve recovery", "error");
    }
  };
  
  const handleFinalizeRecovery = async () => {
    try {
      await finalizeRecovery();
      showToast("Recovery finalized! Vault ownership transferred.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to finalize recovery", "error");
    }
  };
  
  const handleCancelRecovery = async () => {
    try {
      await cancelRecovery();
      showToast("Recovery cancelled successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to cancel recovery", "error");
    }
  };
  
  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Header */}
        <section className="py-12 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4 max-w-6xl">
            <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
              Vault Manager
            </h1>
            <p className="text-xl text-[#A0A0A5] font-[family-name:var(--font-body)] mb-4">
              Non-custodial storage with dual protection: recovery + inheritance
            </p>
            
            {/* No Vault - Create One */}
            {!hasVault && !isLoadingVault && address && (
              <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-6 mt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#FFD700] mb-2">No Vault Found</h3>
                    <p className="text-[#A0A0A5]">Create your vault to start using VFIDE securely</p>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await createVault();
                        showToast("Vault created successfully!", "success");
                      } catch (error) {
                        console.error('Vault creation error:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                        showToast(errorMessage, "error");
                      }
                    }}
                    disabled={isCreatingVault}
                    className="px-8 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingVault ? "Creating..." : "Create Vault"}
                  </button>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {isLoadingVault && (
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg p-6 mt-6 text-center">
                <p className="text-[#A0A0A5]">Loading vault information...</p>
              </div>
            )}
            
            {/* Wallet Not Connected */}
            {!address && (
              <div className="bg-[#FF4444]/10 border border-[#FF4444] rounded-lg p-6 mt-6 text-center">
                <p className="text-[#FF4444] font-bold mb-2">Wallet Not Connected</p>
                <p className="text-[#A0A0A5]">Please connect your wallet to view your vault</p>
              </div>
            )}
            
            {/* Feature Distinction Card - Only show when vault exists */}
            {hasVault && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-[#00F0FF]/10 border border-[#00F0FF] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl">🔑</div>
                  <div className="text-[#00F0FF] font-bold">Chain of Return</div>
                </div>
                <div className="text-[#A0A0A5] text-sm">
                  Lost wallet? Guardians verify your identity and help YOU regain access with a new wallet address.
                </div>
              </div>
              
              <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl">💎</div>
                  <div className="text-[#FFD700] font-bold">Next of Kin</div>
                </div>
                <div className="text-[#A0A0A5] text-sm">
                  Estate planning. If you die, guardians verify death and your HEIR inherits vault ownership.
                </div>
              </div>
            </div>
            )}
          </div>
        </section>

        {/* Only show vault content sections when vault exists */}
        {hasVault && (<>
        {/* Vault Overview */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                <div className="text-[#A0A0A5] text-sm font-[family-name:var(--font-body)] mb-2">Total Balance</div>
                <div className="text-4xl font-bold text-[#F5F3E8] mb-1">24,850 VFIDE</div>
                <div className="text-[#A0A0A5] text-sm">≈ $12,425 USD</div>
              </div>
              
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                <div className="text-[#A0A0A5] text-sm font-[family-name:var(--font-body)] mb-2">Vault Status</div>
                <div className="text-4xl font-bold text-[#50C878] mb-1">ACTIVE</div>
                <div className="text-[#A0A0A5] text-sm">All systems secure</div>
              </div>
              
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                <div className="text-[#A0A0A5] text-sm font-[family-name:var(--font-body)] mb-2">Guardians</div>
                <div className="text-4xl font-bold text-[#00F0FF] mb-1">3/3</div>
                <div className="text-[#A0A0A5] text-sm">Recovery enabled</div>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                Quick Actions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 md:p-6 min-h-[56px] bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 active:scale-95 transition-transform touch-manipulation">
                  Deposit Funds
                </button>
                <button className="p-4 md:p-6 min-h-[56px] border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 active:bg-[#00F0FF]/20 transition-colors touch-manipulation">
                  Withdraw Funds
                </button>
                <button className="p-4 md:p-6 min-h-[56px] border-2 border-[#A0A0A5] text-[#A0A0A5] rounded-lg font-bold hover:border-[#F5F3E8] hover:text-[#F5F3E8] active:bg-[#F5F3E8]/10 transition-colors touch-manipulation">
                  Transfer to Vault
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Next of Kin (Inheritance) */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/10 border-2 border-[#FFD700] rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
                    Next of Kin (Inheritance)
                  </h2>
                  <p className="text-[#A0A0A5] text-sm max-w-2xl">
                    Estate planning for crypto. Your designated heir can claim vault ownership if you pass away or become incapacitated. 
                    If guardians exist, they must approve (2/3). If no guardians, Next of Kin gets instant access.
                  </p>
                </div>
                <div className="px-4 py-2 bg-[#FFD700]/20 border border-[#FFD700] rounded-lg">
                  <div className="text-[#FFD700] text-xs font-bold">INHERITANCE</div>
                  <div className="text-[#A0A0A5] text-xs">(Death/Incapacitation)</div>
                </div>
              </div>
              
              {/* Current Next of Kin */}
              <div className="p-4 bg-[#1A1A1D] border border-[#FFD700]/50 rounded-lg mb-4">
                {nextOfKin && nextOfKin !== "0x0000000000000000000000000000000000000000" ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#A0A0A5] text-xs mb-1">Designated Heir</div>
                      <div className="text-[#F5F3E8] font-mono font-bold text-lg">
                        {nextOfKin.slice(0, 6)}...{nextOfKin.slice(-4)}
                      </div>
                      <div className="text-[#50C878] text-xs mt-1 flex items-center gap-1">
                        ✓ Can inherit vault ownership
                      </div>
                    </div>
                    {address === vaultOwner && (
                      <button 
                        onClick={() => setNewKinAddress("")}
                        className="px-4 py-2 border-2 border-[#FFA500] text-[#FFA500] rounded-lg hover:bg-[#FFA500]/10 transition-colors"
                      >
                        Change Heir
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-[#FFA500] font-bold text-sm mb-3">
                      ⚠️ No Next of Kin Set
                    </div>
                    {address === vaultOwner ? (
                      <div>
                        <input
                          type="text"
                          placeholder="Heir address (0x...)"
                          value={newKinAddress}
                          onChange={(e) => setNewKinAddress(e.target.value)}
                          pattern="^0x[a-fA-F0-9]{40}$"
                          aria-label="Next of kin address"
                          className="w-full px-4 py-2 text-sm md:text-base bg-[#2A2A2F] border border-[#3A3A3F] rounded text-[#F5F3E8] mb-3 touch-manipulation"
                        />
                        <button
                          onClick={handleSetNextOfKin}
                          disabled={isWritePending || !newKinAddress}
                          className="w-full min-h-[56px] px-4 py-3 bg-[#FFD700] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#FFA500] active:bg-[#FF8C00] transition-colors disabled:opacity-50 touch-manipulation"
                        >
                          {isWritePending ? "Processing..." : "Set Next of Kin"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[#A0A0A5] text-sm">Only vault owner can set Next of Kin</div>
                    )}
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-[#1A1A1D]/50 rounded-lg border border-[#3A3A3F]">
                  <div className="text-[#FFD700] font-bold text-sm mb-1">🔓 Instant Inheritance (No Guardians)</div>
                  <div className="text-[#A0A0A5] text-xs">
                    If you have 0 guardians, your Next of Kin can immediately claim ownership after your death. No approval needed.
                  </div>
                </div>
                <div className="p-3 bg-[#1A1A1D]/50 rounded-lg border border-[#3A3A3F]">
                  <div className="text-[#00F0FF] font-bold text-sm mb-1">🛡️ Protected Inheritance (With Guardians)</div>
                  <div className="text-[#A0A0A5] text-xs">
                    If you have guardians, your Next of Kin must get 2/3 guardian approval to inherit. Prevents premature claims.
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#FFD700]/10 border border-[#FFD700]/50 rounded-lg">
                <div className="text-[#FFD700] font-bold text-sm mb-1">💎 Estate Planning</div>
                <div className="text-[#A0A0A5] text-xs">
                  Set your spouse, child, or parent as Next of Kin. If you pass away, they can inherit your vault. 
                  Guardians prevent fraudulent death claims - they verify you&apos;re truly gone before approving inheritance.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Guardian Management */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
                    Chain of Return (Lost Wallet Recovery)
                  </h2>
                  <p className="text-[#A0A0A5] text-sm">
                    If you lose your wallet or it gets compromised, guardians can help you regain access. 
                    Requires 2/3 approval + 7-day maturity period. Prevents flash attacks.
                  </p>
                </div>
                <div className="px-4 py-2 bg-[#00F0FF]/20 border border-[#00F0FF] rounded-lg text-center">
                  <div className="text-[#00F0FF] text-xs font-bold">30-DAY EXPIRY</div>
                  <div className="text-[#A0A0A5] text-xs">Recovery requests</div>
                </div>
              </div>
              
              <div className="space-y-4">
                {guardianCount > 0 ? (
                  <div className="text-[#A0A0A5] text-sm text-center py-4">
                    {guardianCount} guardian{guardianCount !== 1 ? 's' : ''} configured
                    {isUserGuardian && (
                      <div className="text-[#00F0FF] mt-2">
                        ✓ You are a guardian{isGuardianMature ? " (Mature - can vote)" : " (Maturing - 7 days required)"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[#FFA500] text-sm text-center py-4">
                    ⚠️ No guardians configured. Next of Kin will have instant access.
                  </div>
                )}
                
                {/* Guardian list fetched via contract events */}
              </div>
              
              {address === vaultOwner && (
                <div className="mt-6">
                  <input
                    type="text"
                    placeholder="Guardian address (0x...)"
                    value={newGuardianAddress}
                    onChange={(e) => setNewGuardianAddress(e.target.value)}
                    pattern="^0x[a-fA-F0-9]{40}$"
                    aria-label="Guardian address"
                    className="w-full px-4 py-2 text-sm md:text-base bg-[#1A1A1D] border border-[#3A3A3F] rounded text-[#F5F3E8] mb-3 touch-manipulation"
                  />
                  <button
                    onClick={handleAddGuardian}
                    disabled={isWritePending || !newGuardianAddress}
                    className="w-full min-h-[56px] px-6 py-3 border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 active:bg-[#00F0FF]/20 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    {isWritePending ? "Processing..." : "Add New Guardian"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Security Features */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                Security Features
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] hover:border-[#00F0FF] transition-colors">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-2">Withdrawal Cooldown</h3>
                  <p className="text-[#A0A0A5] text-sm mb-2">Configurable 24h cooldown between withdrawals</p>
                  <div className="text-[#50C878] text-xs">✓ Active: 24 hours</div>
                </div>
                
                <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] hover:border-[#00F0FF] transition-colors">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-2">Large Transfer Alert</h3>
                  <p className="text-[#A0A0A5] text-sm mb-2">Threshold tracking for amounts ≥10k VFIDE</p>
                  <div className="text-[#50C878] text-xs">✓ Threshold: 10,000 VFIDE</div>
                </div>
                
                <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] hover:border-[#00F0FF] transition-colors">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-2">Execute Cooldown</h3>
                  <p className="text-[#A0A0A5] text-sm mb-2">1-hour cooldown on execute() calls</p>
                  <div className="text-[#50C878] text-xs">✓ Prevents rapid attacks</div>
                </div>
                
                <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] hover:border-[#00F0FF] transition-colors">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-2">Guardian Maturity</h3>
                  <p className="text-[#A0A0A5] text-sm mb-2">7-day wait before guardians can vote</p>
                  <div className="text-[#50C878] text-xs">✓ Prevents flash attacks</div>
                </div>
                
                <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] hover:border-[#00F0FF] transition-colors">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-2">Recovery Expiry</h3>
                  <p className="text-[#A0A0A5] text-sm mb-2">Recovery requests expire after 30 days</p>
                  <div className="text-[#50C878] text-xs">✓ Prevents stale requests</div>
                </div>
                
                <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] hover:border-[#00F0FF] transition-colors">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-2">Security Lock</h3>
                  <p className="text-[#A0A0A5] text-sm mb-2">SecurityHub can freeze vault if needed</p>
                  <div className="text-[#50C878] text-xs">✓ Emergency protection</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-[#00F0FF]/10 to-[#0080FF]/10 border border-[#00F0FF] rounded-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-[#00F0FF] font-bold mb-1">⚙️ Customize Security Settings</div>
                    <div className="text-[#A0A0A5] text-sm">
                      Adjust withdrawal cooldown (1h-7days) and transfer threshold (100-1M VFIDE)
                    </div>
                  </div>
                  <button className="w-full md:w-auto min-h-[56px] px-6 py-2 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D0DF] active:bg-[#00B0BF] transition-colors touch-manipulation">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recovery Status Dashboard */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-gradient-to-br from-[#C41E3A]/10 to-[#FF6B6B]/10 border-2 border-[#C41E3A] rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                🚨 Active Recovery Request (Lost/Compromised Wallet)
              </h2>
              
              {/* Active Recovery Status - Real-time from blockchain */}
              {!recoveryStatus.isActive ? (
                <div className="p-6 bg-[#1A1A1D] border border-[#50C878] rounded-lg text-center">
                  <div className="text-[#50C878] text-4xl mb-3">✓</div>
                  <div className="text-[#50C878] font-bold text-lg mb-1">No Recovery In Progress</div>
                  <div className="text-[#A0A0A5] text-sm">Your vault is secure. Only you have access.</div>
                  
                  {/* Recovery Initiation Form */}
                  {(isUserGuardian || address === nextOfKin) && (
                    <div className="mt-6 p-4 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg">
                      <div className="text-[#F5F3E8] font-bold text-sm mb-3">Initiate Recovery</div>
                      <input
                        type="text"
                        placeholder="New owner address (0x...)"
                        value={recoveryAddress}
                        onChange={(e) => setRecoveryAddress(e.target.value)}
                        pattern="^0x[a-fA-F0-9]{40}$"
                        aria-label="Recovery address"
                        className="w-full px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] rounded text-[#F5F3E8] mb-3"
                      />
                      <button
                        onClick={handleRequestRecovery}
                        disabled={isWritePending || !recoveryAddress}
                        className="w-full px-6 py-2 bg-[#FFA500] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#FF8C00] transition-colors disabled:opacity-50"
                      >
                        {isWritePending ? "Processing..." : "Request Recovery"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-[#1A1A1D] border border-[#C41E3A] rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[#C41E3A] font-bold text-lg">Recovery to: {recoveryStatus.proposedOwner}</div>
                      <div className="text-[#A0A0A5] text-sm">
                        {recoveryStatus.daysRemaining} days remaining
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#FFA500] font-bold text-2xl">
                        {recoveryStatus.approvals}/{guardianCount}
                      </div>
                      <div className="text-[#A0A0A5] text-xs">Approvals</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-[#A0A0A5]">Progress:</span>
                      <span className="text-[#FFD700] font-bold">
                        {Math.round((recoveryStatus.approvals / Math.max(guardianCount, 2)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#3A3A3F] rounded-full h-2">
                      <div 
                        className="bg-[#FFA500] h-2 rounded-full transition-all" 
                        style={{width: `${(recoveryStatus.approvals / Math.max(guardianCount, 2)) * 100}%`}}
                      ></div>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-3">
                    {address === vaultOwner && (
                      <button
                        onClick={handleCancelRecovery}
                        disabled={isWritePending}
                        className="flex-1 px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-bold hover:bg-[#A01828] transition-colors disabled:opacity-50"
                      >
                        {isWritePending ? "Processing..." : "🛑 Cancel Recovery"}
                      </button>
                    )}
                    
                    {isUserGuardian && isGuardianMature && (
                      <button
                        onClick={handleApproveRecovery}
                        disabled={isWritePending}
                        className="flex-1 px-6 py-3 border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 transition-colors disabled:opacity-50"
                      >
                        {isWritePending ? "Processing..." : "✓ Approve Recovery"}
                      </button>
                    )}
                    
                    {recoveryStatus.approvals >= Math.max(guardianCount >= 2 ? 2 : 1, 1) && (
                      <button
                        onClick={handleFinalizeRecovery}
                        disabled={isWritePending}
                        className="flex-1 px-6 py-3 border-2 border-[#50C878] text-[#50C878] rounded-lg font-bold hover:bg-[#50C878]/10 transition-colors disabled:opacity-50"
                      >
                        {isWritePending ? "Processing..." : "✓ Finalize Recovery"}
                      </button>
                    )}
                  </div>

                  <div className="text-[#FFA500] text-xs text-center">
                    ⚠️ Owner can cancel anytime. Use if recovery was initiated by mistake or fraud.
                  </div>
                </div>
              )}

              {/* Archived: Old example */}

              <div className="mt-4 p-4 bg-[#1A1A1D]/50 border border-[#3A3A3F] rounded-lg">
                <div className="text-[#F5F3E8] font-bold text-sm mb-2">Two Recovery Paths</div>
                <div className="space-y-3 text-[#A0A0A5] text-xs">
                  <div>
                    <div className="text-[#00F0FF] font-bold mb-1">🔑 Lost Wallet (Chain of Return):</div>
                    <ul className="space-y-1 ml-4">
                      <li>• Guardian initiates requestRecovery(yourNewAddress)</li>
                      <li>• 2/3 mature guardians approve</li>
                      <li>• You regain access with new wallet</li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-[#FFD700] font-bold mb-1">💀 Death/Incapacitation (Next of Kin):</div>
                    <ul className="space-y-1 ml-4">
                      <li>• Next of Kin initiates requestRecovery(theirAddress)</li>
                      <li>• Guardians verify death/incapacitation (2/3 approval)</li>
                      <li>• Heir inherits vault ownership</li>
                    </ul>
                  </div>
                  <div className="text-[#C41E3A] font-bold">⚠️ Protection: Recovery expires after 30 days if not completed.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Transaction History */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                Recent Activity
              </h2>
              
              <div className="space-y-2">
                {[
                  { type: "Deposit", amount: "+5,000 VFIDE", time: "2 hours ago", status: "Completed" },
                  { type: "Transfer", amount: "-125 VFIDE", time: "1 day ago", status: "Completed" },
                  { type: "Withdraw", amount: "-2,000 VFIDE", time: "3 days ago", status: "Completed" },
                  { type: "Guardian Added", amount: "0x5e6f...7g8h", time: "5 days ago", status: "Maturing" },
                  { type: "Next of Kin Set", amount: "0x9a8b...7c6d", time: "1 week ago", status: "Active" },
                ].map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg">
                    <div>
                      <div className="text-[#F5F3E8] font-bold">{tx.type}</div>
                      <div className="text-[#A0A0A5] text-sm">{tx.time}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        tx.amount.startsWith('+') ? 'text-[#50C878]' : 
                        tx.amount.startsWith('-') ? 'text-[#FFA500]' : 
                        'text-[#00F0FF]'
                      }`}>
                        {tx.amount}
                      </div>
                      <div className={`text-sm ${
                        tx.status === 'Completed' ? 'text-[#50C878]' :
                        tx.status === 'Maturing' ? 'text-[#FFA500]' :
                        'text-[#00F0FF]'
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        
        {/* Transaction History */}
        <section className="py-12 container mx-auto px-4 max-w-6xl">
          <TransactionHistory />
        </section>
        </>)}
      </main>

      <Footer />
    </>
  );
}

export default function VaultPage() {
  return <VaultContent />;
}
