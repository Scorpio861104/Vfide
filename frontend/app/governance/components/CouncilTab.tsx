"use client"

import { useState } from "react"

interface CouncilTabProps {
  councilMembers: Array<{
    name: string
    address: string
    role: string
    tenure: string
    attendance: number
    votesCast: number
  }>
  terms: string[]
  currentTerm: string
  epochData: Array<{
    epoch: number
    participation: number
    avgDecisionTime: string
    emergencyActions: number
  }>
  electionEvents: Array<{
    title: string
    date: string
    type: string
    link: string
  }>
  electionStats: Array<{
    label: string
    value: string
    change: string
  }>
}

export function CouncilTab({ councilMembers, terms, currentTerm, epochData, electionEvents, electionStats }: CouncilTabProps) {
  const [selectedTerm, setSelectedTerm] = useState(currentTerm)

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3 space-y-6">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#F5F3E8]">👥 Council Members</h2>
                  <p className="text-[#A0A0A5]">Current governing council and their contributions.</p>
                </div>
                <div className="flex gap-2">
                  {terms.map((term) => (
                    <button
                      key={term}
                      onClick={() => setSelectedTerm(term)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                        selectedTerm === term ? "bg-[#00F0FF] text-[#1A1A1D]" : "bg-[#1A1A1D] text-[#A0A0A5] hover:text-[#00F0FF]"
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {councilMembers.map((member) => (
                  <div key={member.address} className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-[#F5F3E8]">{member.name}</h3>
                        <p className="text-[#00F0FF] font-mono text-sm">{member.address}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-sm text-[#A0A0A5] space-y-1">
                      <div className="flex justify-between">
                        <span>Tenure</span>
                        <span className="text-[#F5F3E8]">{member.tenure}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attendance</span>
                        <span className="text-[#F5F3E8]">{member.attendance}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Votes Cast</span>
                        <span className="text-[#F5F3E8]">{member.votesCast}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#F5F3E8]">📅 Election Events</h3>
                  <p className="text-[#A0A0A5]">Important milestones and community touchpoints.</p>
                </div>
                <button className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all">
                  View Schedule
                </button>
              </div>

              <div className="space-y-3">
                {electionEvents.map((event) => (
                  <div key={event.title} className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#00F0FF]">📌</span>
                        <span className="text-[#F5F3E8] font-bold">{event.title}</span>
                      </div>
                      <p className="text-[#A0A0A5] text-sm">{event.date}</p>
                    </div>
                    <span className="px-3 py-1 text-xs rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]">
                      {event.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-1/3 space-y-4">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-[#F5F3E8]">📊 Term Metrics</h3>
                <span className="px-2 py-1 text-xs rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]">
                  {selectedTerm}
                </span>
              </div>
              <div className="space-y-2 text-sm text-[#A0A0A5]">
                <div className="flex justify-between">
                  <span>Avg Participation</span>
                  <span className="text-[#F5F3E8]">{epochData[0].participation}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Decision Time</span>
                  <span className="text-[#F5F3E8]">{epochData[0].avgDecisionTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency Actions</span>
                  <span className="text-[#F5F3E8]">{epochData[0].emergencyActions}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-5">
              <h3 className="text-lg font-bold text-[#F5F3E8] mb-3">Election Insights</h3>
              <div className="space-y-3">
                {electionStats.map((stat) => (
                  <div key={stat.label} className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg p-3">
                    <div className="flex justify-between text-sm text-[#A0A0A5]">
                      <span>{stat.label}</span>
                      <span className="text-[#F5F3E8]">{stat.value}</span>
                    </div>
                    <div className="text-xs text-[#50C878] mt-1">{stat.change}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-5">
              <h3 className="text-lg font-bold text-[#F5F3E8] mb-3">Community Actions</h3>
              <div className="space-y-2 text-sm text-[#A0A0A5]">
                <button className="w-full px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all">
                  Nominate Candidate
                </button>
                <button className="w-full px-4 py-2 bg-[#1A1A1D] text-[#A0A0A5] font-bold rounded-lg border border-[#3A3A3F] hover:text-[#00F0FF] transition-all">
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
