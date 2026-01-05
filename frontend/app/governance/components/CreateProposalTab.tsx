"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { sanitizeString } from "@/lib/validation"

interface CreateProposalTabProps {
  DAO_DEPLOYED: boolean
  canPropose: boolean
  isCreating: boolean
  votingDelay?: bigint
  votingPeriod?: bigint
  minVotesRequired?: bigint
  minParticipation?: bigint
  onPropose?: (targets: `0x${string}`[], values: bigint[], calldatas: `0x${string}`[], description: string) => void
}

export function CreateProposalTab({
  DAO_DEPLOYED,
  canPropose,
  isCreating,
  votingDelay,
  votingPeriod,
  minVotesRequired,
  minParticipation,
  onPropose,
}: CreateProposalTabProps) {
  const { isConnected, address } = useAccount()

  const [proposal, setProposal] = useState({
    title: "",
    category: "funding",
    description: "",
    duration: 7,
    targetContract: "",
    calldata: "",
    amount: "",
  })

  const VALIDATION = {
    TITLE_MIN: 10,
    TITLE_MAX: 120,
    DESC_MIN: 50,
    DESC_MAX: 4000,
  }

  const updateProposal = (field: string, value: string | number) => {
    setProposal((prev) => ({ ...prev, [field]: value }))
  }

  const formatDuration = (seconds?: bigint) => {
    if (seconds === undefined) return "—"
    const days = Number(seconds) / 86400
    if (days >= 1) return `${days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)} days`
    const hours = Number(seconds) / 3600
    return `${hours.toFixed(0)} hours`
  }

  const formatCount = (value?: bigint) => {
    if (value === undefined) return "—"
    return value.toLocaleString()
  }

  const isValid =
    proposal.title.length >= VALIDATION.TITLE_MIN &&
    proposal.title.length <= VALIDATION.TITLE_MAX &&
    proposal.description.length >= VALIDATION.DESC_MIN &&
    proposal.description.length <= VALIDATION.DESC_MAX

  const handleSubmit = () => {
    if (!isValid || !canPropose || isCreating || !onPropose) return

    const targets: `0x${string}`[] = proposal.targetContract
      ? [proposal.targetContract as `0x${string}`]
      : []

    const values: bigint[] = targets.length
      ? [proposal.category === "funding" && proposal.amount ? BigInt(Math.floor(Number(proposal.amount) * 1e18)) : 0n]
      : []

    const calldatas: `0x${string}`[] = targets.length
      ? [(proposal.calldata as `0x${string}`) || "0x"]
      : []

    const fullDescription = `# ${proposal.title}\n\n${proposal.description}\n\n---\nCategory: ${proposal.category}\nDuration: ${proposal.duration} days`

    onPropose(targets, values, calldatas, fullDescription)
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#F5F3E8]">✍️ Create New Proposal</h2>
                  <p className="text-[#A0A0A5]">Share your idea with the community.</p>
                </div>
                {!DAO_DEPLOYED && (
                  <span className="px-3 py-1 text-xs rounded bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]">
                    Testnet Only
                  </span>
                )}
              </div>

              {!isConnected && (
                <div className="bg-[#FFD700]/20 border border-[#FFD700] rounded-lg p-3 mb-4 text-sm text-[#FFD700]">
                  ⚠️ Connect your wallet to propose with your identity
                </div>
              )}

              {!DAO_DEPLOYED && (
                <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/50 rounded-lg p-3 mb-4 text-sm text-[#00F0FF]">
                  This is a test environment. Proposals here are for demonstration purposes.
                </div>
              )}

              {!canPropose && (
                <div className="bg-[#2A1F1F] border border-[#7F1D1D] rounded-lg p-3 mb-4 text-sm text-[#FBBF24]">
                  🔒 You need more voting power to propose.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[#A0A0A5] text-sm mb-2">Title *</label>
                  <input
                    type="text"
                    value={proposal.title}
                    onChange={(e) => updateProposal("title", e.target.value)}
                    placeholder="e.g., Fund community validator nodes"
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
                  />
                  <div className="text-xs text-[#A0A0A5] mt-1">
                    {proposal.title.length}/{VALIDATION.TITLE_MAX} characters
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#A0A0A5] text-sm mb-2">Category</label>
                    <select
                      value={proposal.category}
                      onChange={(e) => updateProposal("category", e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                    >
                      <option value="funding">Funding</option>
                      <option value="protocol">Protocol</option>
                      <option value="operations">Operations</option>
                      <option value="partnerships">Partnerships</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#A0A0A5] text-sm mb-2">Voting Duration (days)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={proposal.duration}
                      onChange={(e) => updateProposal("duration", Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#A0A0A5] text-sm mb-2">Description *</label>
                  <textarea
                    value={proposal.description}
                    onChange={(e) => updateProposal("description", e.target.value)}
                    placeholder="Describe the problem, proposed solution, and impact..."
                    rows={8}
                    maxLength={2000}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none resize-none"
                  />
                  <div className="text-xs text-[#A0A0A5] mt-1">
                    {proposal.description.length}/{VALIDATION.DESC_MAX} characters
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#A0A0A5] text-sm mb-2">Target Contract</label>
                    <input
                      type="text"
                      value={proposal.targetContract}
                      onChange={(e) => updateProposal("targetContract", e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A0A0A5] text-sm mb-2">Calldata (optional)</label>
                    <input
                      type="text"
                      value={proposal.calldata}
                      onChange={(e) => updateProposal("calldata", e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
                    />
                  </div>
                </div>

                {proposal.category === "funding" && (
                  <div>
                    <label className="block text-[#A0A0A5] text-sm mb-2">Requested Amount (VFIDE)</label>
                    <input
                      type="number"
                      value={proposal.amount}
                      onChange={(e) => updateProposal("amount", e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || !canPropose || isCreating}
                    className="px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isCreating ? "Submitting..." : "🚀 Submit Proposal"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-5">
              <h3 className="text-lg font-bold text-[#F5F3E8] mb-3">ℹ️ Proposal Guidelines</h3>
              <ul className="space-y-2 text-sm text-[#A0A0A5]">
                <li>• Be clear about the problem and solution.</li>
                <li>• Include measurable success metrics.</li>
                <li>• Provide budget breakdowns when requesting funds.</li>
                <li>• Engage in community discussions before submitting.</li>
              </ul>
            </div>

            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-5">
              <h3 className="text-lg font-bold text-[#F5F3E8] mb-3">📊 DAO Parameters</h3>
              <dl className="space-y-2 text-sm text-[#A0A0A5]">
                <div className="flex justify-between">
                  <dt>Voting delay</dt>
                  <dd className="text-[#F5F3E8]">{formatDuration(votingDelay)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Voting period</dt>
                  <dd className="text-[#F5F3E8]">{formatDuration(votingPeriod)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Quorum (min votes)</dt>
                  <dd className="text-[#F5F3E8]">{formatCount(minVotesRequired)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Min participants</dt>
                  <dd className="text-[#F5F3E8]">{formatCount(minParticipation)}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-5">
              <h3 className="text-lg font-bold text-[#F5F3E8] mb-3">Your Identity</h3>
              <div className="text-sm text-[#A0A0A5] space-y-2">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={isConnected ? "text-[#50C878]" : "text-[#FFD700]"}>
                    {isConnected ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Address</span>
                  <span className="font-mono text-[#F5F3E8]">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-5">
              <h3 className="text-lg font-bold text-[#F5F3E8] mb-3">Costs</h3>
              <p className="text-sm text-[#A0A0A5]">
                Gas fees apply when submitting on-chain. Ensure your wallet has enough balance before submitting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
