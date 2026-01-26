'use client'

import { useMemo } from "react"

export function HistoryTab({ searchQuery }: { searchQuery: string }) {
  const filteredHistory = useMemo(() => {
    const history = [
      { id: 140, title: "Fee Reduction", vote: "FOR", date: "2 hours ago", result: "Pending", power: 845 },
      { id: 139, title: "Council Election Q4", vote: "FOR", date: "1 day ago", result: "Passed ✓", power: 845 },
      { id: 138, title: "Token Burn Proposal", vote: "AGAINST", date: "3 days ago", result: "Rejected ✗", power: 845 },
      { id: 137, title: "Audit Budget Increase", vote: "FOR", date: "5 days ago", result: "Passed ✓", power: 823 },
      { id: 136, title: "Merchant Fee Update", vote: "FOR", date: "7 days ago", result: "Passed ✓", power: 823 },
      { id: 135, title: "Treasury Allocation", vote: "FOR", date: "10 days ago", result: "Passed ✓", power: 801 },
      { id: 134, title: "Protocol Upgrade v2.1", vote: "FOR", date: "12 days ago", result: "Passed ✓", power: 801 },
      { id: 133, title: "Fee Structure Change", vote: "AGAINST", date: "15 days ago", result: "Rejected ✗", power: 789 },
    ]

    return history.filter(
      (h) => searchQuery === "" || h.title.toLowerCase().includes(searchQuery.toLowerCase()) || h.id.toString().includes(searchQuery),
    )
  }, [searchQuery])

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-100">Your Voting History ({filteredHistory.length})</h2>
            <button
              onClick={() => {
                const csv =
                  "ID,Title,Vote,Date,Result,Power\n" +
                  filteredHistory.map((h) => `${h.id},"${h.title}",${h.vote},"${h.date}","${h.result}",${h.power}`).join("\n")
                const blob = new Blob([csv], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "voting-history.csv"
                a.click()
              }}
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400"
            >
              📊 Export CSV
            </button>
          </div>

          <div className="space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">No voting history found matching your search.</div>
            ) : null}
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg hover:border hover:border-zinc-700"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-zinc-400 text-sm">#{item.id}</span>
                    <span className="text-zinc-100 font-bold">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={item.vote === "FOR" ? "text-emerald-500" : "text-red-600"}>Voted {item.vote}</span>
                    <span className="text-zinc-400">{item.date}</span>
                    <span className="text-zinc-400">Power used: {item.power}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-bold ${
                      item.result.includes("Passed")
                        ? "text-emerald-500"
                        : item.result.includes("Rejected")
                          ? "text-red-600"
                          : "text-orange-500"
                    }`}
                  >
                    {item.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
