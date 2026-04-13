'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { User, Save, Loader2, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';

interface UserProfile {
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  proof_score: number;
  reputation_score: number;
  is_verified: boolean;
  created_at: string;
  stats: {
    badge_count: number;
    friend_count: number;
    proposal_count: number;
    endorsement_count: number;
  };
}

export function AccountTab() {
  const { address } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', display_name: '', bio: '', avatar_url: '' });

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/users/${address}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setForm({
            username: data.user.username ?? '',
            display_name: data.user.display_name ?? '',
            bio: data.user.bio ?? '',
            avatar_url: data.user.avatar_url ?? '',
          });
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [address]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/users/${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Save failed');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <User size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to manage your account.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Badges', value: profile.stats.badge_count },
            { label: 'Friends', value: profile.stats.friend_count },
            { label: 'Proposals', value: profile.stats.proposal_count },
            { label: 'Endorsements', value: profile.stats.endorsement_count },
          ].map((s) => (
            <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Edit form */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Edit2 size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold">Edit Profile</h3>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Username</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
             
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Display Name</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
             
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Bio</label>
            <textarea
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50 resize-none"
             
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Avatar URL</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white  focus:outline-none focus:border-cyan-500/50"
             
              value={form.avatar_url}
              onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={14} /> Profile saved successfully
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Wallet info */}
      <div className="bg-white/3 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
        <p className="text-sm text-gray-300 font-mono break-all">{address}</p>
        {profile?.is_verified && (
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20">
            <CheckCircle size={10} /> Verified
          </span>
        )}
      </div>
    </div>
  );
}
