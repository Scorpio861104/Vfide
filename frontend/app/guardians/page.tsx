"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Shield, Users, Clock, CheckCircle2, AlertCircle, Key, Heart, UserPlus, UserMinus, RefreshCw, XCircle, ArrowRightCircle, Timer, Lock, Unlock, FileText, Settings } from "lucide-react";

type TabType = 'overview' | 'my-guardians' | 'next-of-kin' | 'recovery' | 'responsibilities' | 'pending';

export default function GuardiansPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Header */}
        <section className="py-12 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00F0FF] to-[#0080FF] rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-[#1A1A1D]" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8]">
                  Guardian Dashboard
                </h1>
                <p className="text-xl text-[#A0A0A5] font-[family-name:var(--font-body)]">
                  Manage vault recoveries you&apos;re responsible for
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="bg-[#1A1A1D] border-b border-[#3A3A3F] sticky top-20 z-40">
          <div className="container mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" role="tablist" aria-label="Guardian management sections">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Shield },
                { id: 'my-guardians' as const, label: 'My Guardians', icon: Users },
                { id: 'next-of-kin' as const, label: 'Next of Kin', icon: Heart },
                { id: 'recovery' as const, label: 'Chain of Return', icon: Key },
                { id: 'responsibilities' as const, label: 'Responsibilities', icon: FileText },
                { id: 'pending' as const, label: 'Pending Actions', icon: Clock },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#00F0FF] text-[#1A1A1D]'
                      : 'bg-transparent text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A2F]'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div role="tabpanel" id="tabpanel-overview" hidden={activeTab !== 'overview'}>
            {activeTab === 'overview' && <OverviewTab />}
          </div>
          <div role="tabpanel" id="tabpanel-my-guardians" hidden={activeTab !== 'my-guardians'}>
            {activeTab === 'my-guardians' && <MyGuardiansTab isConnected={isConnected} />}
          </div>
          <div role="tabpanel" id="tabpanel-next-of-kin" hidden={activeTab !== 'next-of-kin'}>
            {activeTab === 'next-of-kin' && <NextOfKinTab isConnected={isConnected} />}
          </div>
          <div role="tabpanel" id="tabpanel-recovery" hidden={activeTab !== 'recovery'}>
            {activeTab === 'recovery' && <RecoveryTab isConnected={isConnected} />}
          </div>
          <div role="tabpanel" id="tabpanel-responsibilities" hidden={activeTab !== 'responsibilities'}>
            {activeTab === 'responsibilities' && <ResponsibilitiesTab isConnected={isConnected} />}
          </div>
          <div role="tabpanel" id="tabpanel-pending" hidden={activeTab !== 'pending'}>
            {activeTab === 'pending' && <PendingActionsTab isConnected={isConnected} />}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* What is a Guardian */}
      <div className="bg-[#2A2A2F] border border-[#00F0FF] rounded-xl p-8">
        <h2 className="text-2xl font-bold text-[#00F0FF] mb-6 flex items-center gap-3">
          <Shield className="w-7 h-7" />
          What is a Guardian?
        </h2>
        <p className="text-[#F5F3E8] leading-relaxed mb-4">
          Guardians are trusted individuals who can help vault owners recover access if they lose their wallet. 
          Being a guardian is a <strong>responsibility</strong>, not a privilege.
        </p>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#3A3A3F]">
          <p className="text-[#A0A0A5] text-sm">
            <strong className="text-[#FFD700]">⚠️ Important:</strong> Guardians cannot access funds directly. 
            They can only approve recovery requests from vault owners to a new wallet address.
          </p>
        </div>
      </div>

      {/* How Recovery Works */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6 flex items-center gap-3">
          <Clock className="w-7 h-7 text-[#00F0FF]" />
          How Recovery Works
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Owner Requests Recovery", desc: "Vault owner lost their wallet and requests recovery to a new address" },
            { step: "2", title: "7-Day Waiting Period", desc: "A mandatory waiting period allows the owner to cancel if the request was fraudulent" },
            { step: "3", title: "Guardians Verify & Approve", desc: "Guardians verify the owner's identity (off-chain) and approve the recovery" },
            { step: "4", title: "Recovery Finalized", desc: "Once enough guardians approve, the vault ownership is transferred to the new address" },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F]">
              <div className="w-10 h-10 bg-[#00F0FF] rounded-full flex items-center justify-center text-[#1A1A1D] font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <div className="text-[#F5F3E8] font-bold">{item.title}</div>
                <div className="text-[#A0A0A5] text-sm">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Recovery Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#00F0FF]/10 border border-[#00F0FF] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">🔑</span>
            <h3 className="text-xl font-bold text-[#00F0FF]">Chain of Return</h3>
          </div>
          <p className="text-[#F5F3E8] mb-2">
            <strong>Lost Wallet Recovery</strong>
          </p>
          <p className="text-[#A0A0A5] text-sm">
            The vault owner lost their wallet and needs to regain access using a new wallet address. 
            Guardians verify the owner&apos;s identity before approving.
          </p>
        </div>

        <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">💎</span>
            <h3 className="text-xl font-bold text-[#FFD700]">Next of Kin</h3>
          </div>
          <p className="text-[#F5F3E8] mb-2">
            <strong>Inheritance Recovery</strong>
          </p>
          <p className="text-[#A0A0A5] text-sm">
            The vault owner has passed away. Guardians verify the death and transfer ownership 
            to the designated heir.
          </p>
        </div>
      </div>
    </div>
  );
}

function ResponsibilitiesTab({ isConnected }: { isConnected: boolean }) {
  // Note: Full guardian tracking requires an indexer to scan GuardianSet events
  // For now, users should track their guardianship responsibilities manually
  // A future enhancement would add The Graph subgraph for this data
  const vaultsGuarding: Array<{ owner: string; alias: string; status: string; addedDate: string }> = [];

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Shield className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect your wallet to see vaults you&apos;re guarding</p>
      </div>
    );
  }

  if (vaultsGuarding.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
          <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">No Vaults Found</h2>
          <p className="text-[#A0A0A5] mb-4">
            You are not currently guarding any vaults, or we haven&apos;t indexed them yet.
          </p>
          <p className="text-sm text-[#8A8A8F]">
            If you know you are a guardian for a vault, enter the vault address below to check:
          </p>
          {/* Future: Add vault address input to verify guardianship */}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#00F0FF]" />
          Vaults You&apos;re Guarding ({vaultsGuarding.length})
        </h2>

        <div className="space-y-3">
          {vaultsGuarding.map((vault, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${vault.status === 'healthy' ? 'bg-[#50C878]/20' : 'bg-[#FFD700]/20'}`}>
                  {vault.status === 'healthy' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#50C878]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#FFD700]" />
                  )}
                </div>
                <div>
                  <div className="text-[#F5F3E8] font-bold">{vault.alias}</div>
                  <div className="text-[#A0A0A5] text-sm font-mono">{vault.owner}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${vault.status === 'healthy' ? 'text-[#50C878]' : 'text-[#FFD700]'}`}>
                  {vault.status === 'healthy' ? 'Healthy' : '⚠️ Action Required'}
                </div>
                <div className="text-[#A0A0A5] text-xs">Since {vault.addedDate}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#2A2A2F] border border-[#FFD700] rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#FFD700] mb-3">⚠️ Guardian Responsibilities</h3>
        <ul className="space-y-2 text-[#F5F3E8] text-sm">
          <li>• <strong>Verify identity</strong> before approving any recovery request</li>
          <li>• <strong>Contact the owner</strong> through known channels (phone, in-person)</li>
          <li>• <strong>Never approve</strong> if you can&apos;t verify the request is legitimate</li>
          <li>• <strong>Report suspicious</strong> activity if you suspect fraud</li>
        </ul>
      </div>
    </div>
  );
}

function PendingActionsTab({ isConnected }: { isConnected: boolean }) {
  // Note: Pending recovery data requires an indexer to scan RecoveryRequested events
  // and cross-reference with user's guardian status
  const pendingRecoveries: Array<{
    vaultOwner: string;
    alias: string;
    requestedBy: string;
    type: string;
    requestTime: string;
    expiresIn: string;
    approvalsNeeded: number;
    approvalsGiven: number;
  }> = [];

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Shield className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect your wallet to see pending recovery requests</p>
      </div>
    );
  }

  if (pendingRecoveries.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-[#50C878]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">All Clear!</h2>
        <p className="text-[#A0A0A5]">No pending recovery requests require your attention</p>
        <p className="text-sm text-[#8A8A8F] mt-2">
          If you expect to see a recovery request, ensure you are a guardian for the vault.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-[#C41E3A]/10 border border-[#C41E3A] rounded-xl p-4">
        <p className="text-[#C41E3A] font-bold text-center">
          ⚠️ {pendingRecoveries.length} recovery request(s) need your attention
        </p>
      </div>

      {pendingRecoveries.map((recovery, idx) => (
        <div key={idx} className="bg-[#2A2A2F] border border-[#FFD700] rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-[#F5F3E8] mb-1">{recovery.alias}</h3>
              <p className="text-[#A0A0A5] text-sm font-mono">{recovery.vaultOwner}</p>
            </div>
            <div className="px-3 py-1 bg-[#FFD700]/20 border border-[#FFD700] rounded-full">
              <span className="text-[#FFD700] text-sm font-bold">{recovery.type}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1A1A1D] rounded-lg p-3">
              <div className="text-[#A0A0A5] text-xs mb-1">New Address</div>
              <div className="text-[#F5F3E8] text-sm font-mono">{recovery.requestedBy}</div>
            </div>
            <div className="bg-[#1A1A1D] rounded-lg p-3">
              <div className="text-[#A0A0A5] text-xs mb-1">Requested</div>
              <div className="text-[#F5F3E8] text-sm">{recovery.requestTime}</div>
            </div>
            <div className="bg-[#1A1A1D] rounded-lg p-3">
              <div className="text-[#A0A0A5] text-xs mb-1">Time Left</div>
              <div className="text-[#FFD700] text-sm font-bold">{recovery.expiresIn}</div>
            </div>
            <div className="bg-[#1A1A1D] rounded-lg p-3">
              <div className="text-[#A0A0A5] text-xs mb-1">Approvals</div>
              <div className="text-[#F5F3E8] text-sm">{recovery.approvalsGiven}/{recovery.approvalsNeeded}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 px-6 py-3 bg-gradient-to-r from-[#50C878] to-[#3CB371] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform">
              ✓ Approve Recovery
            </button>
            <button className="px-6 py-3 border-2 border-[#A0A0A5] text-[#A0A0A5] rounded-lg font-bold hover:border-[#C41E3A] hover:text-[#C41E3A] transition-colors">
              Report Fraud
            </button>
          </div>

          <p className="text-center text-[#A0A0A5] text-xs mt-4">
            Only approve if you have verified the vault owner&apos;s identity through trusted means
          </p>
        </div>
      ))}
    </div>
  );
}

// ========== MY GUARDIANS TAB ==========
function MyGuardiansTab({ isConnected }: { isConnected: boolean }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  
  // Mock data - in production, fetch from contract
  const myGuardians = [
    { address: "0x1a2b...3c4d", alias: "Mom", addedDate: "Dec 1, 2025", mature: true },
    { address: "0x5e6f...7g8h", alias: "Brother", addedDate: "Dec 10, 2025", mature: true },
    { address: "0x9i0j...1k2l", alias: "Best Friend", addedDate: "Dec 15, 2025", mature: false },
  ];

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect your wallet to manage your guardians</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Guardian Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Total Guardians</span>
            <Users className="text-[#00F0FF]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#F5F3E8]">{myGuardians.length}</div>
          <div className="text-[#A0A0A5] text-xs">Max recommended: 5</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Mature Guardians</span>
            <CheckCircle2 className="text-[#50C878]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#50C878]">{myGuardians.filter(g => g.mature).length}</div>
          <div className="text-[#A0A0A5] text-xs">7+ days active</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Recovery Threshold</span>
            <Shield className="text-[#FFD700]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#FFD700]">2/{myGuardians.length}</div>
          <div className="text-[#A0A0A5] text-xs">Approvals needed</div>
        </div>
      </div>

      {/* Add Guardian */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#F5F3E8] flex items-center gap-2">
            <UserPlus size={20} className="text-[#00F0FF]" />
            Add Guardian
          </h3>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D4E0] transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Guardian'}
          </button>
        </div>
        
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-4 border-t border-[#3A3A3F]"
          >
            <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-4 mb-4">
              <p className="text-[#FFD700] text-sm">
                <strong>7-Day Maturity Period:</strong> New guardians cannot participate in recovery votes for 7 days after being added. This prevents last-minute guardian manipulation.
              </p>
            </div>
            <div>
              <label className="block text-[#A0A0A5] text-sm mb-2">Guardian Wallet Address</label>
              <input 
                type="text" 
                placeholder="0x..." 
                value={newGuardianAddress}
                onChange={(e) => setNewGuardianAddress(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none font-mono"
              />
            </div>
            <button className="w-full py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-[1.02] transition-transform">
              Add Guardian
            </button>
          </motion.div>
        )}
      </div>

      {/* Guardian List */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Your Guardians</h3>
        <div className="space-y-3">
          {myGuardians.map((guardian, idx) => (
            <div key={idx} className="p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${guardian.mature ? 'bg-[#50C878]/20' : 'bg-[#FFD700]/20'}`}>
                    {guardian.mature ? (
                      <CheckCircle2 className="text-[#50C878]" size={20} />
                    ) : (
                      <Timer className="text-[#FFD700]" size={20} />
                    )}
                  </div>
                  <div>
                    <div className="text-[#F5F3E8] font-bold">{guardian.alias}</div>
                    <div className="text-[#A0A0A5] text-sm font-mono">{guardian.address}</div>
                    <div className="text-[#A0A0A5] text-xs">Added: {guardian.addedDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!guardian.mature && (
                    <span className="px-3 py-1 bg-[#FFD700]/20 text-[#FFD700] rounded-full text-xs font-bold">
                      Maturing...
                    </span>
                  )}
                  <button className="p-2 border border-[#C41E3A] text-[#C41E3A] rounded-lg hover:bg-[#C41E3A]/10 transition-colors">
                    <UserMinus size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== NEXT OF KIN TAB ==========
function NextOfKinTab({ isConnected }: { isConnected: boolean }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [newKinAddress, setNewKinAddress] = useState('');
  
  // Mock data - in production, fetch from contract
  const currentNextOfKin = {
    address: "0xabcd...efgh",
    alias: "Spouse",
    setDate: "Nov 15, 2025"
  };
  
  const inheritanceRequest = null; // No active request

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Heart className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect your wallet to manage your Next of Kin</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* What is Next of Kin */}
      <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#FFD700] mb-4 flex items-center gap-3">
          <Heart size={24} />
          What is Next of Kin?
        </h2>
        <p className="text-[#F5F3E8] mb-4">
          Next of Kin is your designated heir who can inherit your vault funds if you pass away. 
          This is different from recovery (lost wallet) - inheritance requires guardian verification of death.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#3A3A3F]">
            <h4 className="text-[#00F0FF] font-bold mb-2">Chain of Return</h4>
            <p className="text-[#A0A0A5] text-sm">Lost wallet recovery. You&apos;re alive but can&apos;t access your wallet.</p>
          </div>
          <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#3A3A3F]">
            <h4 className="text-[#FFD700] font-bold mb-2">Next of Kin (Inheritance)</h4>
            <p className="text-[#A0A0A5] text-sm">Death inheritance. Funds transfer to designated heir after guardian verification.</p>
          </div>
        </div>
      </div>

      {/* Current Next of Kin */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#F5F3E8]">Current Next of Kin</h3>
          <button 
            onClick={() => setShowSetForm(!showSetForm)}
            className="px-4 py-2 border border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 transition-colors"
          >
            {showSetForm ? 'Cancel' : 'Change'}
          </button>
        </div>
        
        {currentNextOfKin ? (
          <div className="p-4 bg-[#1A1A1D] border border-[#FFD700]/30 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#FFD700]/20 rounded-full">
                <Heart className="text-[#FFD700]" size={24} />
              </div>
              <div>
                <div className="text-[#F5F3E8] font-bold text-lg">{currentNextOfKin.alias}</div>
                <div className="text-[#A0A0A5] text-sm font-mono">{currentNextOfKin.address}</div>
                <div className="text-[#A0A0A5] text-xs">Set: {currentNextOfKin.setDate}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-center">
            <Heart className="w-12 h-12 mx-auto mb-3 text-[#A0A0A5]" />
            <p className="text-[#A0A0A5]">No Next of Kin designated</p>
            <p className="text-[#8A8A8F] text-sm mt-1">Protect your legacy by setting an inheritor</p>
          </div>
        )}
        
        {showSetForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-4 mt-4 border-t border-[#3A3A3F]"
          >
            <div>
              <label className="block text-[#A0A0A5] text-sm mb-2">New Next of Kin Address</label>
              <input 
                type="text" 
                placeholder="0x..." 
                value={newKinAddress}
                onChange={(e) => setNewKinAddress(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#FFD700] focus:outline-none font-mono"
              />
            </div>
            <div className="bg-[#C41E3A]/10 border border-[#C41E3A] rounded-lg p-4">
              <p className="text-[#C41E3A] text-sm">
                <strong>Warning:</strong> Your Next of Kin must have their own VFIDE vault to receive inheritance. 
                They must also understand they need 2/3 guardian approval to claim.
              </p>
            </div>
            <button className="w-full py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1A1A1D] rounded-lg font-bold hover:scale-[1.02] transition-transform">
              Set Next of Kin
            </button>
          </motion.div>
        )}
      </div>

      {/* Active Inheritance Request (if any) */}
      {inheritanceRequest && (
        <div className="bg-[#C41E3A]/10 border border-[#C41E3A] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[#C41E3A] mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Active Inheritance Request
          </h3>
          <p className="text-[#F5F3E8] mb-4">
            Someone has initiated an inheritance claim on your vault. If you are alive and this is fraudulent, 
            deny the request immediately.
          </p>
          <button className="w-full py-3 bg-[#C41E3A] text-white rounded-lg font-bold hover:bg-[#A01830] transition-colors">
            Deny Inheritance Request (I&apos;m Alive!)
          </button>
        </div>
      )}

      {/* Inheritance Process */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Inheritance Process</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Next of Kin Initiates Claim", desc: "After your passing, they call requestInheritance()" },
            { step: "2", title: "30-Day Window", desc: "Allows time for you to deny if called prematurely (fraud protection)" },
            { step: "3", title: "Guardian Verification", desc: "2/3 guardians must verify death and approve transfer" },
            { step: "4", title: "Funds Transfer", desc: "Vault balance transfers to heir's vault. Original vault locked for records." },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-3 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F]">
              <div className="w-8 h-8 bg-[#FFD700] rounded-full flex items-center justify-center text-[#1A1A1D] font-bold flex-shrink-0 text-sm">
                {item.step}
              </div>
              <div>
                <div className="text-[#F5F3E8] font-bold text-sm">{item.title}</div>
                <div className="text-[#A0A0A5] text-xs">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== RECOVERY (CHAIN OF RETURN) TAB ==========
function RecoveryTab({ isConnected }: { isConnected: boolean }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  
  // Mock data - in production, fetch from contract
  const activeRecovery = null; // No active recovery
  /*
  const activeRecovery = {
    proposedOwner: "0xnew1...2345",
    approvals: 1,
    needed: 2,
    expiresIn: "25 days",
    startedBy: "Guardian: Mom"
  };
  */

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Key className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect your wallet to manage recovery</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* What is Chain of Return */}
      <div className="bg-[#00F0FF]/10 border border-[#00F0FF] rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#00F0FF] mb-4 flex items-center gap-3">
          <Key size={24} />
          Chain of Return
        </h2>
        <p className="text-[#F5F3E8] mb-4">
          Lost your wallet? Chain of Return allows you to recover vault access to a new wallet address 
          with guardian approval. This is for <strong>living users</strong> who lost access, not for inheritance.
        </p>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#3A3A3F]">
          <p className="text-[#A0A0A5] text-sm">
            <strong className="text-[#50C878]">Security:</strong> Recovery requires 2/3 guardian approval AND guardians must 
            have been active for 7+ days (maturity period) to prevent flash attacks.
          </p>
        </div>
      </div>

      {/* Active Recovery Status */}
      {activeRecovery ? (
        <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[#FFD700] mb-4 flex items-center gap-2">
            <RefreshCw size={20} className="animate-spin" />
            Active Recovery Request
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1A1A1D] rounded-lg p-4">
              <div className="text-[#A0A0A5] text-xs mb-1">New Address</div>
              <div className="text-[#F5F3E8] font-mono text-sm">0xnew1...2345</div>
            </div>
            <div className="bg-[#1A1A1D] rounded-lg p-4">
              <div className="text-[#A0A0A5] text-xs mb-1">Approvals</div>
              <div className="text-[#50C878] font-bold">1/2</div>
            </div>
            <div className="bg-[#1A1A1D] rounded-lg p-4">
              <div className="text-[#A0A0A5] text-xs mb-1">Expires In</div>
              <div className="text-[#FFD700] font-bold">25 days</div>
            </div>
            <div className="bg-[#1A1A1D] rounded-lg p-4">
              <div className="text-[#A0A0A5] text-xs mb-1">Started By</div>
              <div className="text-[#F5F3E8] text-sm">Guardian: Mom</div>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="flex-1 py-3 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#45B069] transition-colors">
              Finalize Recovery
            </button>
            <button className="px-6 py-3 border border-[#C41E3A] text-[#C41E3A] rounded-lg font-bold hover:bg-[#C41E3A]/10 transition-colors">
              Cancel Recovery
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#F5F3E8]">Request Recovery</h3>
            <button 
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D4E0] transition-colors"
            >
              {showRequestForm ? 'Cancel' : 'Start Recovery'}
            </button>
          </div>
          
          <p className="text-[#A0A0A5] mb-4">
            No active recovery request. If you lost your wallet, start a recovery to regain access via a new address.
          </p>
          
          {showRequestForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-[#3A3A3F]"
            >
              <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-4 mb-4">
                <p className="text-[#FFD700] text-sm">
                  <strong>Who can request recovery?</strong> The vault owner, any guardian, or Next of Kin. 
                  You&apos;re calling from your NEW wallet to recover to it.
                </p>
              </div>
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">New Owner Address (your new wallet)</label>
                <input 
                  type="text" 
                  placeholder="0x..." 
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none font-mono"
                />
              </div>
              <button className="w-full py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-[1.02] transition-transform">
                Request Recovery
              </button>
              <p className="text-[#A0A0A5] text-xs text-center">
                Recovery expires after 30 days. Contact your guardians to approve.
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Recovery Timeline */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Recovery Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-[#3A3A3F]" />
          <div className="space-y-6">
            {[
              { icon: Key, color: "#00F0FF", title: "Recovery Requested", desc: "Owner, guardian, or Next of Kin initiates request" },
              { icon: Timer, color: "#FFD700", title: "30-Day Window Opens", desc: "Owner can cancel if fraudulent. Guardians verify identity." },
              { icon: Users, color: "#50C878", title: "Guardian Approvals", desc: "2/3 mature guardians (7+ days active) must approve" },
              { icon: CheckCircle2, color: "#50C878", title: "Finalize Recovery", desc: "Anyone can call finalizeRecovery() once threshold met" },
              { icon: ArrowRightCircle, color: "#00F0FF", title: "Ownership Transferred", desc: "Vault now owned by new address. Full access restored." },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 relative">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  <step.icon size={16} style={{ color: step.color }} />
                </div>
                <div className="pt-1">
                  <div className="text-[#F5F3E8] font-bold text-sm">{step.title}</div>
                  <div className="text-[#A0A0A5] text-xs">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Special Case: NextOfKin with No Guardians */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#F5F3E8] mb-3 flex items-center gap-2">
          <Lock size={18} className="text-[#FFD700]" />
          Special Case: Instant Recovery
        </h3>
        <p className="text-[#A0A0A5] text-sm">
          If your vault has <strong>no guardians</strong> and you are the Next of Kin, you can recover instantly 
          without waiting for approvals. This is useful for simple estates but offers less security.
        </p>
      </div>
    </div>
  );
}
