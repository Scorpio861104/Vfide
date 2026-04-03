'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original governance page

export function CouncilTab() {
  return (
    <div className="space-y-6">
      <CouncilTab
  currentTerm="Q2 2026"
  terms={["Q1 2026", "Q2 2026"]}
  councilMembers={[
    { name: 'Amara Okafor', address: '0x742d...bEb', role: 'Lead Steward', tenure: '8 months', attendance: 96, votesCast: 184 },
    { name: 'Luis Ferreira', address: '0x1a2b...3c4d', role: 'Treasury Steward', tenure: '6 months', attendance: 92, votesCast: 171 },
    { name: 'Maya Rahman', address: '0x5e6f...7g8h', role: 'Security Steward', tenure: '5 months', attendance: 94, votesCast: 163 },
  ]}
  epochData={[
    { epoch: 12, participation: 87, avgDecisionTime: '4.2h', emergencyActions: 1 },
  ]}
  electionEvents={[
    { title: 'Candidate registration closes', date: 'April 14, 2026', type: 'Deadline', link: '/governance' },
    { title: 'Council town hall', date: 'April 18, 2026', type: 'Community', link: '/governance' },
    { title: 'Voting opens', date: 'April 22, 2026', type: 'Election', link: '/governance' },
  ]}
  electionStats={[
    { label: 'Registered voters', value: '247', change: '+12 this week' },
    { label: 'Avg turnout', value: '73%', change: '+4% vs last term' },
    { label: 'Open nominations', value: '9', change: '3 new today' },
  ]}
  />
    </div>
  );
}
