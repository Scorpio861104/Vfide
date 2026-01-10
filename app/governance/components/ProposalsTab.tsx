"use client"

import { useMemo, useState } from "react"
import { Sparkles } from "lucide-react"

import { GOVERNANCE_QUORUM_VOTES } from "@/lib/constants"

import { useCountdown } from "./useCountdown"
import type { Proposal } from "./types"

export function ProposalsTab({
  searchQuery,
  activeProposalIds,
  onVote,
  onFinalize,
}: {
  searchQuery: string
  activeProposalIds?: readonly bigint[]
  onVote?: (proposalId: bigint, support: boolean) => void
  onFinalize?: (proposalId: bigint) => void
}) {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [baseTime] = useState(() => Date.now())

  const filteredProposals = useMemo(() => {
    const now = baseTime
    const proposals: Proposal[] = [
      {
        id: 140,
        type: "PARAMETER",
        title: "Reduce Merchant Fee to 0.20%",
        author: "0x742d...bEb",
        timeLeft: "2 days",
        endTime: now + 48 * 60 * 60 * 1000,
        forVotes: 12450,
        againstVotes: 5820,
        voted: false,
        description:
          "This proposal aims to reduce the merchant transaction fee from 0.25% to 0.20% to increase competitiveness and merchant adoption.",
      },
      {
        id: 142,
        type: "TREASURY",
        title: "Allocate $50k for Security Audit",
        author: "Council",
        timeLeft: "5 hours",
        endTime: now + 5 * 60 * 60 * 1000,
        forVotes: 18900,
        againstVotes: 1640,
        voted: false,
        description: "Request treasury allocation of $50,000 to conduct comprehensive security audit by leading firm.",
      },
      {
        id: 141,
        type: "UPGRADE",
        title: "Enable Multi-Chain Support (Arbitrum)",
        author: "0x1a2b...3c4d",
        timeLeft: "1 day",
        endTime: now + 24 * 60 * 60 * 1000,
        forVotes: 9240,
        againstVotes: 7860,
        voted: false,
        description: "Deploy VFIDE protocol on Arbitrum to expand ecosystem reach and reduce transaction costs.",
      },
    ]

    return proposals.filter((p) => {
      const matchesSearch =
        searchQuery === "" || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toString().includes(searchQuery)
      const matchesType = filterType === "all" || p.type === filterType
      return matchesSearch && matchesType
    })
  }, [searchQuery, filterType, baseTime])

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#F5F3E8]">Active Proposals ({filteredProposals.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const csv =
                      "ID,Type,Title,For Votes,Against Votes\n" +
                      filteredProposals.map((p) => `${p.id},${p.type},"${p.title}",${p.forVotes},${p.againstVotes}`).join("\n")
                    const blob = new Blob([csv], { type: "text/csv" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "proposals.csv"
                    a.click()
                  }}
                  className="px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] text-[#00F0FF] rounded-lg font-bold hover:border-[#00F0FF] transition-colors"
                >
                  📊 Export CSV
                </button>
                <button className="px-6 py-2 bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform">
                  Create Proposal
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {["all", "PARAMETER", "TREASURY", "UPGRADE"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                    filterType === type ? "bg-[#00F0FF] text-[#1A1A1D]" : "bg-[#1A1A1D] text-[#A0A0A5] hover:text-[#00F0FF]"
                  }`}
                >
                  {type === "all" ? "All" : type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-12 text-[#A0A0A5]">
                No proposals found matching your search.
                {activeProposalIds && activeProposalIds.length ? (
                  <div className="mt-4 text-sm text-gray-600">
                    (Debug) Active on-chain IDs: {activeProposalIds.map((id) => id.toString()).join(", ")}
                  </div>
                ) : null}
              </div>
            ) : null}
            {filteredProposals.map((prop) => {
              const total = prop.forVotes + prop.againstVotes
              const forPercent = Math.round((prop.forVotes / total) * 100)

              return (
                <div
                  key={prop.id}
                  className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-6 hover:border-[#00F0FF] transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="inline-block px-3 py-1 bg-[#00F0FF]/20 border border-[#00F0FF] rounded text-[#00F0FF] text-sm font-bold mb-2">
                        {prop.type}
                      </div>
                      <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">{prop.title}</h3>
                      <p className="text-[#A0A0A5] text-sm">Proposed by {prop.author} • Ends in {prop.timeLeft}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#F5F3E8]">#{prop.id}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#50C878]">FOR: {prop.forVotes.toLocaleString()} votes ({forPercent}%)</span>
                      <span className="text-[#C41E3A]">AGAINST: {prop.againstVotes.toLocaleString()} votes ({100 - forPercent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#2A2A2F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#50C878]" style={{ width: `${forPercent}%` }} />
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#A0A0A5]">Quorum Progress</span>
                        <span className={total >= GOVERNANCE_QUORUM_VOTES ? "text-[#50C878]" : "text-[#FFD700]"}>
                          {total.toLocaleString()} / {GOVERNANCE_QUORUM_VOTES.toLocaleString()} {" "}
                          {total >= GOVERNANCE_QUORUM_VOTES ? "✓" : `(${Math.round((total / GOVERNANCE_QUORUM_VOTES) * 100)}%)`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#2A2A2F] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            total >= GOVERNANCE_QUORUM_VOTES ? "bg-[#50C878]" : "bg-linear-to-r from-[#FFD700] to-[#FFA500]"
                          }`}
                          style={{ width: `${Math.min(100, (total / GOVERNANCE_QUORUM_VOTES) * 100)}%` }}
                        />
                      </div>
                      {total >= GOVERNANCE_QUORUM_VOTES ? (
                        <div className="text-xs text-[#50C878] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Quorum reached!
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => onVote?.(BigInt(prop.id), true)}
                      className="flex-1 px-4 py-2 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#50C878]/90"
                    >
                      Vote FOR
                    </button>
                    <button
                      onClick={() => onVote?.(BigInt(prop.id), false)}
                      className="flex-1 px-4 py-2 bg-[#C41E3A] text-[#F5F3E8] rounded-lg font-bold hover:bg-[#C41E3A]/90"
                    >
                      Vote AGAINST
                    </button>
                    {onFinalize && baseTime > prop.endTime ? (
                      <button
                        onClick={() => onFinalize(BigInt(prop.id))}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600"
                      >
                        Finalize
                      </button>
                    ) : null}
                    <button
                      onClick={() => setSelectedProposal(prop)}
                      className="px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] text-[#A0A0A5] rounded-lg hover:text-[#00F0FF] hover:border-[#00F0FF]"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedProposal ? (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProposal(null)}>
          <div
            className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#3A3A3F] flex items-center justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-[#00F0FF]/20 border border-[#00F0FF] rounded text-[#00F0FF] text-sm font-bold mb-2">
                  {selectedProposal.type}
                </div>
                <h2 className="text-2xl font-bold text-[#F5F3E8]">
                  #{selectedProposal.id}: {selectedProposal.title}
                </h2>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="text-[#A0A0A5] hover:text-[#00F0FF] text-2xl">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-[#A0A0A5] text-sm mb-1">Proposed by</div>
                <div className="text-[#F5F3E8] font-mono">{selectedProposal.author}</div>
              </div>

              <div>
                <div className="text-[#A0A0A5] text-sm mb-1">Time Remaining</div>
                <ProposalCountdown endTime={selectedProposal.endTime} />
              </div>

              <div>
                <div className="text-[#A0A0A5] text-sm mb-2">Description</div>
                <div className="text-[#F5F3E8] bg-[#1A1A1D] p-4 rounded-lg">{selectedProposal.description}</div>
              </div>

              <div>
                <div className="text-[#A0A0A5] text-sm mb-2">Voting Results</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#50C878]">FOR: {selectedProposal.forVotes.toLocaleString()} votes</span>
                    <span className="text-[#C41E3A]">AGAINST: {selectedProposal.againstVotes.toLocaleString()} votes</span>
                  </div>
                  <div className="w-full h-3 bg-[#1A1A1D] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#50C878]"
                      style={{ width: `${(selectedProposal.forVotes / (selectedProposal.forVotes + selectedProposal.againstVotes)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-6 py-3 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#50C878]/90">
                  Vote FOR
                </button>
                <button className="flex-1 px-6 py-3 bg-[#C41E3A] text-[#F5F3E8] rounded-lg font-bold hover:bg-[#C41E3A]/90">
                  Vote AGAINST
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ProposalCountdown({ endTime }: { endTime: number }) {
  const timeLeft = useCountdown(endTime)
  return <div className="text-[#00F0FF] font-bold text-lg">{timeLeft}</div>
}
