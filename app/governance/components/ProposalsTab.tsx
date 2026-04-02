'use client'

import { useEffect, useMemo, useState } from "react"
import { useReadContract, usePublicClient } from "wagmi"
import { Sparkles } from "lucide-react"

import { DAOABI } from "@/lib/abis"
import { CONTRACT_ADDRESSES } from "@/lib/contracts"
import { GOVERNANCE_QUORUM_VOTES } from "@/lib/constants"
import { VirtualizedList } from "@/lib/ux/performanceUtils"

import { useCountdown } from "./useCountdown"
import type { Proposal } from "./types"

const DAO_ADDRESS = CONTRACT_ADDRESSES.DAO

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
  const publicClient = usePublicClient()
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [showAllProposals, setShowAllProposals] = useState(false)

  const { data: liveActiveIds } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getActiveProposals',
  })

  const ids = (activeProposalIds ?? (liveActiveIds as readonly bigint[] | undefined) ?? [])

  const [proposals, setProposals] = useState<Proposal[]>([])

  useEffect(() => {
    const load = async () => {
      if (!publicClient || ids.length === 0) {
        setProposals([])
        return
      }

      const formatType = (ptype: number): string => {
        if (ptype === 0) return 'PARAMETER'
        if (ptype === 1) return 'TREASURY'
        if (ptype === 2) return 'UPGRADE'
        if (ptype === 3) return 'POLICY'
        return 'OTHER'
      }

      const formatAddress = (value: `0x${string}`): string => `${value.slice(0, 6)}...${value.slice(-4)}`

      const formatTimeLeft = (endTimeMs: number): string => {
        const diff = endTimeMs - Date.now()
        if (diff <= 0) return 'Ended'

        const totalHours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(totalHours / 24)
        const hours = totalHours % 24

        if (days > 0) return `${days}d ${hours}h`
        if (totalHours > 0) return `${totalHours}h`

        const minutes = Math.floor(diff / (1000 * 60))
        return `${Math.max(minutes, 1)}m`
      }

      const fetched = await Promise.all(
        ids.map(async (proposalId) => {
          const proposal = await publicClient.readContract({
            address: DAO_ADDRESS,
            abi: DAOABI,
            functionName: 'getProposalDetails',
            args: [proposalId],
          }) as readonly [
            `0x${string}`,
            number,
            `0x${string}`,
            bigint,
            string,
            bigint,
            bigint,
            bigint,
            bigint,
            boolean,
            boolean
          ]

          const [proposer, ptype, _target, _value, description, _startTime, endTime, forVotes, againstVotes] = proposal
          const endTimeMs = Number(endTime) * 1000

          return {
            id: Number(proposalId),
            type: formatType(ptype),
            title: description || `Proposal #${proposalId.toString()}`,
            author: formatAddress(proposer),
            timeLeft: formatTimeLeft(endTimeMs),
            endTime: endTimeMs,
            forVotes: Number(forVotes),
            againstVotes: Number(againstVotes),
            voted: false,
            description,
          } satisfies Proposal
        })
      )

      setProposals(fetched)
    }

    load().catch(() => setProposals([]))
  }, [ids, publicClient])

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesSearch =
        searchQuery === "" || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toString().includes(searchQuery)
      const matchesType = filterType === "all" || p.type === filterType
      return matchesSearch && matchesType
    })
  }, [searchQuery, filterType, proposals])

  const shouldVirtualize = filteredProposals.length > 8
  const usePerformanceMode = shouldVirtualize && !showAllProposals

  useEffect(() => {
    if (!shouldVirtualize) {
      setShowAllProposals(false)
    }
  }, [shouldVirtualize])

  const renderProposalCard = (prop: Proposal, padded = false) => {
    const total = prop.forVotes + prop.againstVotes
    const forPercent = total > 0 ? Math.round((prop.forVotes / total) * 100) : 0

    const content = (
      <div
        key={prop.id}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 hover:border-cyan-400 transition-colors"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold mb-2">
              {prop.type}
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">{prop.title}</h3>
            <p className="text-zinc-400 text-sm">Proposed by {prop.author} • Ends in {prop.timeLeft}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-zinc-100">#{prop.id}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-emerald-500">FOR: {prop.forVotes.toLocaleString()} votes ({forPercent}%)</span>
            <span className="text-red-600">AGAINST: {prop.againstVotes.toLocaleString()} votes ({100 - forPercent}%)</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${forPercent}%` }} />
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Quorum Progress</span>
              <span className={total >= GOVERNANCE_QUORUM_VOTES ? "text-emerald-500" : "text-amber-400"}>
                {total.toLocaleString()} / {GOVERNANCE_QUORUM_VOTES.toLocaleString()} {" "}
                {total >= GOVERNANCE_QUORUM_VOTES ? "✓" : `(${Math.round((total / GOVERNANCE_QUORUM_VOTES) * 100)}%)`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  total >= GOVERNANCE_QUORUM_VOTES ? "bg-emerald-500" : "bg-gradient-to-r from-amber-400 to-orange-500"
                }`}
                style={{ width: `${Math.min(100, (total / GOVERNANCE_QUORUM_VOTES) * 100)}%` }}
              />
            </div>
            {total >= GOVERNANCE_QUORUM_VOTES ? (
              <div className="text-xs text-emerald-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quorum reached!
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onVote?.(BigInt(prop.id), true)}
            className="flex-1 px-4 py-2 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90"
          >
            Vote FOR
          </button>
          <button
            onClick={() => onVote?.(BigInt(prop.id), false)}
            className="flex-1 px-4 py-2 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90"
          >
            Vote AGAINST
          </button>
          {onFinalize && Date.now() > prop.endTime ? (
            <button
              onClick={() => onFinalize(BigInt(prop.id))}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600"
            >
              Finalize
            </button>
          ) : null}
          <button
            onClick={() => setSelectedProposal(prop)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-lg hover:text-cyan-400 hover:border-cyan-400"
          >
            View Details
          </button>
        </div>
      </div>
    )

    return padded ? <div className="h-full pb-4">{content}</div> : content
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-zinc-100">Active Proposals ({filteredProposals.length})</h2>
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
                  className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400 transition-colors"
                >
                  📊 Export CSV
                </button>
                <button className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform">
                  Create Proposal
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {["all", "PARAMETER", "TREASURY", "UPGRADE", "POLICY", "OTHER"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                    filterType === type ? "bg-cyan-400 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-cyan-400"
                  }`}
                >
                  {type === "all" ? "All" : type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                No active proposals found.
              </div>
            ) : usePerformanceMode ? (
              <>
                <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-sm text-cyan-100">
                  Performance mode active — large proposal sets are windowed for smoother scrolling.
                </div>
                <VirtualizedList
                  items={filteredProposals}
                  itemHeight={320}
                  containerHeight={Math.min(filteredProposals.length * 320, 760)}
                  className="pr-2"
                  keyExtractor={(prop) => String(prop.id)}
                  renderItem={(prop) => renderProposalCard(prop, true)}
                />
              </>
            ) : (
              filteredProposals.map((prop) => renderProposalCard(prop))
            )}
          </div>

          {shouldVirtualize ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllProposals((prev) => !prev)}
                className="text-sm text-cyan-400 hover:underline"
              >
                {usePerformanceMode ? 'Show full proposal list' : 'Use performance mode'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selectedProposal ? (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProposal(null)}>
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-700 flex items-center justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold mb-2">
                  {selectedProposal.type}
                </div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  #{selectedProposal.id}: {selectedProposal.title}
                </h2>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="text-zinc-400 hover:text-cyan-400 text-2xl">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-zinc-400 text-sm mb-1">Proposed by</div>
                <div className="text-zinc-100 font-mono">{selectedProposal.author}</div>
              </div>

              <div>
                <div className="text-zinc-400 text-sm mb-1">Time Remaining</div>
                <ProposalCountdown endTime={selectedProposal.endTime} />
              </div>

              <div>
                <div className="text-zinc-400 text-sm mb-2">Description</div>
                <div className="text-zinc-100 bg-zinc-900 p-4 rounded-lg">{selectedProposal.description}</div>
              </div>

              <div>
                <div className="text-zinc-400 text-sm mb-2">Voting Results</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-500">FOR: {selectedProposal.forVotes.toLocaleString()} votes</span>
                    <span className="text-red-600">AGAINST: {selectedProposal.againstVotes.toLocaleString()} votes</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(selectedProposal.forVotes / Math.max(selectedProposal.forVotes + selectedProposal.againstVotes, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-6 py-3 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90">
                  Vote FOR
                </button>
                <button className="flex-1 px-6 py-3 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90">
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
  return <div className="text-cyan-400 font-bold text-lg">{timeLeft}</div>
}
