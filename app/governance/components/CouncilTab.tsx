'use client'

import { useState } from "react"

interface CouncilTabProps {
  councilMembers?: Array<{
    name: string
    address: string
    role: string
    tenure: string
    attendance: number
    votesCast: number
  }>
  terms?: string[]
  currentTerm?: string
  epochData?: Array<{
    epoch: number
    participation: number
    avgDecisionTime: string
    emergencyActions: number
  }>
  electionEvents?: Array<{
    title: string
    date: string
    type: string
    link: string
  }>
  electionStats?: Array<{
    label: string
    value: string
    change: string
  }>
}

const DEFAULT_TERMS = ['Current Term', 'Previous Term']
const DEFAULT_COUNCIL_MEMBERS = [
  {
    name: 'Sentinel One',
    address: '0x742d...BeB1',
    role: 'Chair',
    tenure: '11 months',
    attendance: 98,
    votesCast: 142,
  },
  {
    name: 'Vault Keeper',
    address: '0x8ba1...BA72',
    role: 'Security',
    tenure: '9 months',
    attendance: 95,
    votesCast: 131,
  },
]
const DEFAULT_EPOCH_DATA = [{ epoch: 12, participation: 91, avgDecisionTime: '18h', emergencyActions: 0 }]
const DEFAULT_ELECTION_EVENTS = [
  { title: 'Q2 Council Review', date: 'Apr 15, 2026', type: 'Review', link: '#' },
  { title: 'Community Nomination Window', date: 'May 2, 2026', type: 'Election', link: '#' },
]
const DEFAULT_ELECTION_STATS = [
  { label: 'Participation', value: '91%', change: '+4% vs last term' },
  { label: 'Avg turnout', value: '1.8k', change: '+12% month-over-month' },
]

export function CouncilTab({
  councilMembers = DEFAULT_COUNCIL_MEMBERS,
  terms = DEFAULT_TERMS,
  currentTerm,
  epochData = DEFAULT_EPOCH_DATA,
  electionEvents = DEFAULT_ELECTION_EVENTS,
  electionStats = DEFAULT_ELECTION_STATS,
}: CouncilTabProps) {
  const [selectedTerm, setSelectedTerm] = useState(currentTerm ?? terms[0] ?? 'Current Term')

  return (
    <section className="py-12">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3 space-y-6">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">👥 Council Members</h2>
                  <p className="text-zinc-400">Current governing council and their contributions.</p>
                </div>
                <div className="flex gap-2">
                  {terms.map((term) => (
                    <button
                      key={term}
                      onClick={() => setSelectedTerm(term)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                        selectedTerm === term ? "bg-cyan-400 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-cyan-400"
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {councilMembers.map((member) => (
                  <div key={member.address} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100">{member.name}</h3>
                        <p className="text-cyan-400 font-mono text-sm">{member.address}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs bg-cyan-400/10 text-cyan-400 border border-cyan-400">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Tenure</span>
                        <span className="text-zinc-100">{member.tenure}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attendance</span>
                        <span className="text-zinc-100">{member.attendance}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Votes Cast</span>
                        <span className="text-zinc-100">{member.votesCast}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-zinc-100">📅 Election Events</h3>
                  <p className="text-zinc-400">Important milestones and community touchpoints.</p>
                </div>
                <button className="px-4 py-2 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all">
                  View Schedule
                </button>
              </div>

              <div className="space-y-3">
                {electionEvents.map((event) => (
                  <div key={event.title} className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-cyan-400">📌</span>
                        <span className="text-zinc-100 font-bold">{event.title}</span>
                      </div>
                      <p className="text-zinc-400 text-sm">{event.date}</p>
                    </div>
                    <span className="px-3 py-1 text-xs rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400">
                      {event.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-1/3 space-y-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-zinc-100">📊 Term Metrics</h3>
                <span className="px-2 py-1 text-xs rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400">
                  {selectedTerm}
                </span>
              </div>
              <div className="space-y-2 text-sm text-zinc-400">
                <div className="flex justify-between">
                  <span>Avg Participation</span>
                  <span className="text-zinc-100">{epochData[0]?.participation ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Decision Time</span>
                  <span className="text-zinc-100">{epochData[0]?.avgDecisionTime ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency Actions</span>
                  <span className="text-zinc-100">{epochData[0]?.emergencyActions ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Election Insights</h3>
              <div className="space-y-3">
                {electionStats.map((stat) => (
                  <div key={stat.label} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>{stat.label}</span>
                      <span className="text-zinc-100">{stat.value}</span>
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">{stat.change}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Community Actions</h3>
              <div className="space-y-2 text-sm text-zinc-400">
                <button className="w-full px-4 py-2 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all">
                  Nominate Candidate
                </button>
                <button className="w-full px-4 py-2 bg-zinc-900 text-zinc-400 font-bold rounded-lg border border-zinc-700 hover:text-cyan-400 transition-all">
                  View Charter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
