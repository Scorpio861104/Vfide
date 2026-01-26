'use client'

export function StatsTab() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">DAO Statistics</h2>
            <div className="space-y-4">
              <StatRow label="Total Proposals" value="156" />
              <StatRow label="Passed Proposals" value="128 (82%)" highlight="text-emerald-500" />
              <StatRow label="Rejected Proposals" value="28 (18%)" highlight="text-red-600" />
              <StatRow label="Active Members" value="247" />
              <StatRow label="Average Participation" value="73%" />
              <StatRow label="Total Votes Cast" value="4,234" />
            </div>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Proposal Categories</h2>
            <div className="space-y-4">
              {[{
                name: "Parameter Changes",
                count: 42,
                percent: 27,
              },
              { name: "Treasury Allocations", count: 38, percent: 24 },
              { name: "Protocol Upgrades", count: 31, percent: 20 },
              { name: "Council Elections", count: 24, percent: 15 },
              { name: "Emergency Actions", count: 12, percent: 8 },
              { name: "Other", count: 9, percent: 6 },
              ].map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-100">{cat.name}</span>
                    <span className="text-zinc-400">
                      {cat.count} ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${cat.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Recent Pass/Fail Rate</h2>
            <div className="space-y-3">
              <PassFailBlock title="Last 30 Days" passed="18 Passed" failed="4 Failed" />
              <PassFailBlock title="Last 90 Days" passed="52 Passed" failed="11 Failed" />
              <PassFailBlock title="All Time" passed="128 Passed" failed="28 Failed" />
            </div>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Top Voters (This Month)</h2>
            <div className="space-y-3">
              {[
                { rank: 1, address: "0x742d...bEb", votes: 18, score: 945 },
                { rank: 2, address: "0x1a2b...3c4d", votes: 17, score: 892 },
                { rank: 3, address: "0x5e6f...7g8h", votes: 16, score: 845 },
                { rank: 4, address: "0x9i0j...1k2l", votes: 15, score: 823 },
                { rank: 5, address: "0x3m4n...5o6p", votes: 14, score: 801 },
              ].map((voter) => (
                <div key={voter.rank} className="flex items-center justify-between p-3 bg-zinc-900 rounded">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        voter.rank === 1
                          ? "bg-amber-400 text-zinc-900"
                          : voter.rank === 2
                            ? "bg-zinc-400 text-zinc-900"
                            : voter.rank === 3
                              ? "bg-amber-600 text-zinc-900"
                              : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {voter.rank}
                    </div>
                    <div>
                      <div className="text-zinc-100 font-mono text-sm">{voter.address}</div>
                      <div className="text-zinc-400 text-xs">Score: {voter.score}</div>
                    </div>
                  </div>
                  <div className="text-cyan-400 font-bold">{voter.votes} votes</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-400">{label}</span>
      <span className={`text-2xl font-bold ${highlight || "text-zinc-100"}`}>{value}</span>
    </div>
  )
}

function PassFailBlock({ title, passed, failed }: { title: string; passed: string; failed: string }) {
  return (
    <div>
      <div className="text-zinc-400 text-sm mb-2">{title}</div>
      <div className="flex gap-2">
        <div className="flex-1 h-12 bg-emerald-500 rounded flex items-center justify-center text-zinc-900 font-bold">{passed}</div>
        <div className="w-20 h-12 bg-red-600 rounded flex items-center justify-center text-zinc-100 font-bold">{failed}</div>
      </div>
    </div>
  )
}
