'use client'

import { useEffect, useMemo, useState } from "react"
import { useReadContract, usePublicClient } from "wagmi"

import { DAOABI } from "@/lib/abis"
import { CONTRACT_ADDRESSES } from "@/lib/contracts"

import type { Proposal } from "./types"
import { ProposalCard } from "./ProposalCard"
import { ProposalDetailModal } from "./ProposalDetailModal"

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

  const { data: liveActiveIds } = useReadContract({
    address: DAO_ADDRESS, abi: DAOABI, functionName: 'getActiveProposals',
  })

  const ids = (activeProposalIds ?? (liveActiveIds as readonly bigint[] | undefined) ?? [])
  const [proposals, setProposals] = useState<Proposal[]>([])

  useEffect(() => {
    const load = async () => {
      if (!publicClient || ids.length === 0) { setProposals([]); return; }

      const formatType = (ptype: number): string => ['PARAMETER', 'TREASURY', 'UPGRADE', 'POLICY'][ptype] || 'OTHER'
      const formatAddress = (value: `0x${string}`): string => `${value.slice(0, 6)}...${value.slice(-4)}`
      const formatTimeLeft = (endTimeMs: number): string => {
        const diff = endTimeMs - Date.now()
        if (diff <= 0) return 'Ended'
        const totalHours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(totalHours / 24)
        const hours = totalHours % 24
        if (days > 0) return `${days}d ${hours}h`
        if (totalHours > 0) return `${totalHours}h`
        return `${Math.max(Math.floor(diff / (1000 * 60)), 1)}m`
      }

      const fetched = await Promise.all(
        ids.map(async (proposalId) => {
          const proposal = await publicClient.readContract({
            address: DAO_ADDRESS, abi: DAOABI, functionName: 'getProposalDetails', args: [proposalId],
          }) as readonly [string, bigint, bigint, bigint, bigint, boolean, boolean, number]
          const [description, forVotes, againstVotes, startTime, endTime, executed, cancelled, ptype] = proposal
          const endMs = Number(endTime) * 1000
          const lines = description.split('\n')
          const title = lines[0] || `Proposal #${proposalId}`
          const body = lines.slice(1).join('\n').trim()
          const proposer = await publicClient.readContract({
            address: DAO_ADDRESS, abi: DAOABI, functionName: 'getProposalProposer', args: [proposalId],
          }).catch(() => '0x0000000000000000000000000000000000000000' as `0x${string}`)
          return {
            id: Number(proposalId), type: formatType(ptype), title, description: body || title,
            author: formatAddress(proposer as `0x${string}`),
            forVotes: Number(forVotes), againstVotes: Number(againstVotes),
            startTime: Number(startTime) * 1000, endTime: endMs,
            timeLeft: formatTimeLeft(endMs), executed, cancelled,
          } as Proposal
        })
      )
      setProposals(fetched.filter(p => !p.cancelled))
    }
    load()
  }, [publicClient, ids.length])

  const filteredProposals = useMemo(() => {
    let result = proposals
    if (filterType !== "all") result = result.filter(p => p.type === filterType)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.author.toLowerCase().includes(q))
    }
    return result
  }, [proposals, filterType, searchQuery])

  return (
    <section className="space-y-6">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-zinc-100">Active Proposals ({filteredProposals.length})</h2>
            <div className="flex gap-2">
              <button onClick={() => {
                const csv = "ID,Type,Title,For Votes,Against Votes\n" + filteredProposals.map(p => `${p.id},${p.type},"${p.title}",${p.forVotes},${p.againstVotes}`).join("\n")
                const blob = new Blob([csv], { type: "text/csv" })
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "proposals.csv"; a.click()
              }} className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400 transition-colors">📊 Export CSV</button>
              <button className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform">Create Proposal</button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {["all", "PARAMETER", "TREASURY", "UPGRADE", "POLICY", "OTHER"].map(type => (
              <button key={type} onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${filterType === type ? "bg-cyan-400 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-cyan-400"}`}>
                {type === "all" ? "All" : type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredProposals.length === 0 && <div className="text-center py-12 text-zinc-400">No active proposals found.</div>}
          {filteredProposals.map(prop => (
            <ProposalCard key={prop.id} proposal={prop} onVote={onVote} onFinalize={onFinalize} onViewDetails={setSelectedProposal} />
          ))}
        </div>
      </div>

      {selectedProposal && <ProposalDetailModal proposal={selectedProposal} onClose={() => setSelectedProposal(null)} />}
    </section>
  )
}
