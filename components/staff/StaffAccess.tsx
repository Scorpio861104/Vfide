'use client';

import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';

export interface StaffMember {
  id: string;
  name: string;
  walletAddress: string;
  role: 'admin' | 'manager' | 'cashier';
  permissions: string[];
  active: boolean;
  addedAt: number;
}

interface StaffManagerProps {
  staff?: StaffMember[];
  onAdd?: (name: string, address: string, role: StaffMember['role']) => void;
  onRemove?: (id: string) => void;
  onUpdateRole?: (id: string, role: StaffMember['role']) => void;
}

const ROLES: Record<StaffMember['role'], { label: string; permissions: string[]; colorClass: string }> = {
  admin: {
    label: 'Admin',
    permissions: ['pos', 'products', 'orders', 'analytics', 'settings', 'staff', 'refunds'],
    colorClass: 'bg-red-500/20 text-red-400',
  },
  manager: {
    label: 'Manager',
    permissions: ['pos', 'products', 'orders', 'analytics', 'refunds'],
    colorClass: 'bg-amber-500/20 text-amber-400',
  },
  cashier: {
    label: 'Cashier',
    permissions: ['pos', 'orders'],
    colorClass: 'bg-cyan-500/20 text-cyan-400',
  },
};

export function StaffManager({ staff = [], onAdd, onRemove }: StaffManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('cashier');

  const handleAdd = () => {
    if (!name || !address) {
      return;
    }

    onAdd?.(name, address, role);
    setShowAdd(false);
    setName('');
    setAddress('');
    setRole('cashier');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <Users className="text-cyan-400" />
          Staff
        </h2>
        <button
          onClick={() => setShowAdd((value) => !value)}
          className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/20 px-4 py-2 text-sm font-bold text-cyan-400"
        >
          <Plus size={14} />
          Add Staff
        </button>
      </div>

      {showAdd && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Wallet address"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-mono text-white placeholder-gray-500 focus:outline-none"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as StaffMember['role'])}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
            >
              {Object.entries(ROLES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-xl border border-white/10 py-2.5 font-bold text-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 font-bold text-white"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {staff.map((member) => {
          const roleMeta = ROLES[member.role];

          return (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/3 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-sm font-bold text-white">
                  {member.name[0] ?? 'S'}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{member.name}</div>
                  <div className="font-mono text-xs text-gray-500">{member.walletAddress.slice(0, 8)}...</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${roleMeta.colorClass}`}>
                  {roleMeta.label}
                </span>
                <div className="text-xs text-gray-500">{roleMeta.permissions.length} permissions</div>
                <button
                  onClick={() => onRemove?.(member.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

