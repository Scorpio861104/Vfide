'use client'

import { useMemo, useState } from "react"

export function MembersTab({ searchQuery }: { searchQuery: string }) {
  const [sortBy, setSortBy] = useState<"score" | "votes" | "participation">("score")

  const filteredMembers = useMemo(() => {
    const members = [
      { address: "0x742d...bEb", score: 945, votes: 28, participation: 98, fatigue: 15, lastVote: "2 hours ago" },
      { address: "0x1a2b...3c4d", score: 892, votes: 26, participation: 91, fatigue: 25, lastVote: "5 hours ago" },
      { address: "0x5e6f...7g8h", score: 845, votes: 24, participation: 87, fatigue: 40, lastVote: "1 day ago" },
      { address: "0x9i0j...1k2l", score: 823, votes: 22, participation: 82, fatigue: 10, lastVote: "12 hours ago" },
      { address: "0x3m4n...5o6p", score: 801, votes: 21, participation: 78, fatigue: 50, lastVote: "3 days ago" },
      { address: "0x7q8r...9s0t", score: 789, votes: 19, participation: 75, fatigue: 30, lastVote: "18 hours ago" },
      { address: "0x1u2v...3w4x", score: 756, votes: 18, participation: 71, fatigue: 20, lastVote: "6 hours ago" },
      { address: "0x5y6z...7a8b", score: 734, votes: 16, participation: 68, fatigue: 35, lastVote: "2 days ago" },
    ]

    const filtered = members.filter((m) => searchQuery === "" || m.address.toLowerCase().includes(searchQuery.toLowerCase()))

    if (sortBy === "score") return filtered.sort((a, b) => b.score - a.score)
    if (sortBy === "votes") return filtered.sort((a, b) => b.votes - a.votes)
    if (sortBy === "participation") return filtered.sort((a, b) => b.participation - a.participation)
    return filtered
  }, [searchQuery, sortBy])

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-zinc-100">DAO Members & Voting Activity</h2>
              <button
                onClick={() => {
                  const csv =
                    "Address,Score,Votes,Participation,Fatigue\n" +
                    filteredMembers.map((m) => `${m.address},${m.score},${m.votes},${m.participation},${m.fatigue}`).join("\n")
                  const blob = new Blob([csv], { type: "text/csv" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "members.csv"
                  a.click()
                }}
                className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400"
              >
                📊 Export CSV
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[{ key: "score", label: "By Score" }, { key: "votes", label: "By Votes" }, { key: "participation", label: "By Participation" }].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key as typeof sortBy)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      sortBy === key ? "bg-cyan-400 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-cyan-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-zinc-400 text-sm">Total: {filteredMembers.length} members</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 text-zinc-400 text-sm">Member</th>
                  <th className="text-right py-3 px-4 text-zinc-400 text-sm">ProofScore</th>
                  <th className="text-right py-3 px-4 text-zinc-400 text-sm">Total Votes</th>
                  <th className="text-right py-3 px-4 text-zinc-400 text-sm">Participation</th>
                  <th className="text-right py-3 px-4 text-zinc-400 text-sm">Fatigue</th>
                  <th className="text-right py-3 px-4 text-zinc-400 text-sm">Last Vote</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, idx) => (
                  <tr key={member.address} className="border-b border-zinc-700 hover:bg-zinc-900 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {idx === 2 && <span className="text-cyan-400">👤</span>}
                        <span className="text-zinc-100 font-mono text-sm">{member.address}</span>
                        {idx === 2 && <span className="text-cyan-400 text-xs">(You)</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-cyan-400 font-bold">{member.score}</span>
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-100">{member.votes}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={member.participation >= 85 ? "text-emerald-500" : "text-zinc-400"}>{member.participation}%</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={member.fatigue > 40 ? "text-orange-500" : "text-zinc-400"}>{member.fatigue}%</span>
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-400 text-sm">{member.lastVote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-zinc-900 rounded-lg">
            <h3 className="text-lg font-bold text-zinc-100 mb-3">Governance Fatigue Explanation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-400">
              <div>
                <div className="text-cyan-400 font-bold mb-1">How it Works</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Each vote costs 5% fatigue</li>
                  <li>Fatigue reduces your effective voting power</li>
                  <li>Recovers 5% per day (natural restoration)</li>
                  <li>Prevents spam voting</li>
                </ul>
              </div>
              <div>
                <div className="text-cyan-400 font-bold mb-1">Example</div>
                <div className="space-y-1">
                  <div>ProofScore: 800 → Voting Power: 800</div>
                  <div>After 1 vote: 5% fatigue → Power: 760</div>
                  <div>After 5 votes: 25% fatigue → Power: 600</div>
                  <div>After 1 day rest: 20% fatigue → Power: 640</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
