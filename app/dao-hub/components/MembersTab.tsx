'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Users, Loader2, Crown, Vote, UserCircle } from 'lucide-react';

interface Proposal {
  id: number;
  proposer_address: string;
  proposer_username?: string;
  votes_for: number;
  votes_against: number;
}

interface ProtocolStats {
  totalUsers: number;
  averageProofScore: number;
}

interface Contributor {
  address: string;
  username?: string;
  proposals: number;
  totalVotes: number;
}

export function MembersTab() {
  const { address } = useAccount();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/proposals?limit=200').then((r) => r.json()),
      fetch('/api/stats/protocol').then((r) => r.json()),
    ])
      .then(([p, s]) => {
        setStats(s);
        const proposals: Proposal[] = p.proposals ?? [];
        // Aggregate contributors from proposers
        const map: Record<string, Contributor> = {};
        proposals.forEach((prop) => {
          const addr = prop.proposer_address;
          if (!map[addr]) {
            map[addr] = { address: addr, username: prop.proposer_username, proposals: 0, totalVotes: 0 };
          }
          map[addr].proposals++;
          map[addr].totalVotes += prop.votes_for + prop.votes_against;
        });
        setContributors(Object.values(map).sort((a, b) => b.proposals - a.proposals).slice(0, 20));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><Users size={14} className="text-cyan-400" /><p className="text-xs text-gray-400">Protocol Members</p></div>
            <p className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><Vote size={14} className="text-purple-400" /><p className="text-xs text-gray-400">Avg Proof Score</p></div>
            <p className="text-2xl font-bold text-white">{stats.averageProofScore}</p>
          </div>
        </div>
      )}

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown size={16} className="text-yellow-400" />
          <h3 className="text-white font-semibold text-sm">Top Governance Contributors</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : contributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No governance contributors yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contributors.map((c, i) => {
              const isMe = c.address.toLowerCase() === address?.toLowerCase();
              return (
                <div key={c.address} className={`flex items-center gap-3 p-3 rounded-lg ${
                  isMe ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/3'
                }`}>
                  <span className="text-xs text-gray-600 w-5">{i + 1}</span>
                  <UserCircle size={22} className={i < 3 ? 'text-yellow-400' : 'text-gray-600'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      {c.username ?? `${c.address.slice(0, 10)}…`}
                      {isMe && <span className="ml-1 text-xs text-cyan-400">(you)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white">{c.proposals} proposals</p>
                    <p className="text-xs text-gray-500">{c.totalVotes} votes</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
