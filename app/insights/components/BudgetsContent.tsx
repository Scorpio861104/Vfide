'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useCallback } from 'react';
import { useFinancialIntelligence, Budget } from '@/lib/financialIntelligence';
import { useAccount } from 'wagmi';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, PlusCircle, Edit2, Trash2, BarChart3 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function BudgetsContent() {
  const { address } = useAccount();
  const { budgets, spendingByCategory, setBudget, removeBudget, loading: _loading } = useFinancialIntelligence(address);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);
  const [newBudget, setNewBudget] = useState({
    category: '',
    limit: '',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly',
  });

  const handleCreate = useCallback(() => {
    if (!newBudget.category || !newBudget.limit) {
      toast.error('Please fill all fields');
      return;
    }
    setBudget({
      id: editingId ?? Date.now().toString(),
      category: newBudget.category,
      limit: parseFloat(newBudget.limit),
      spent: 0,
      period: newBudget.period,
      alerts: true,
    });
    setShowCreateModal(false);
    setEditingId(null);
    setNewBudget({ category: '', limit: '', period: 'monthly' });
    toast.success(editingId ? 'Budget updated' : 'Budget created');
  }, [newBudget, setBudget, editingId]);

  const handleEdit = useCallback((budget: Budget) => {
    setEditingId(budget.id);
    setNewBudget({ category: budget.category, limit: String(budget.limit), period: budget.period as 'daily' | 'weekly' | 'monthly' });
    setShowCreateModal(true);
  }, []);

  const handleDelete = useCallback((budget: Budget) => {
    setPendingDelete(budget);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    removeBudget(pendingDelete.id);
    toast.success('Budget deleted');
    setPendingDelete(null);
  }, [pendingDelete, removeBudget]);

  const getSpentAmount = (category: string) => {
    const cat = spendingByCategory.find(c => c.name === category);
    return cat?.amount || 0;
  };

  const getProgress = (budget: Budget) => {
    const spent = getSpentAmount(budget.category);
    return Math.min((spent / budget.limit) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-4xl space-y-6">
        {/* Device-only notice */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-accent/20 bg-accent/5 p-3 text-xs text-accent">
          Budgets are saved on this device only — they won&apos;t appear on other devices you sign in from.
          Spending totals are still computed from your full transaction history.
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="badge-live"><span className="badge-live-dot" />Spending Control</span>
            </div>
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-clip-text text-transparent flex items-center gap-3">
                <PieChart size={32} className="text-emerald-400" />Budgets
              </span>
            </h1>
            <p className="text-white/50 mt-1">Track and control your spending</p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="btn-premium-primary flex items-center gap-2">
            <PlusCircle size={16} />Create Budget
          </button>
        </motion.div>

        {/* Budget Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-2 text-center py-16 glass-card-premium">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="font-semibold text-white mb-2">No budgets yet</h3>
              <p className="text-sm text-white/40 mb-6">Create a budget to start tracking your spending</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-premium-primary">
                Create First Budget
              </button>
            </motion.div>
          ) : (
            budgets.map(budget => {
              const progress = getProgress(budget);
              const spent = getSpentAmount(budget.category);
              const isOverBudget = spent > budget.limit;

              return (
                <motion.div key={budget.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card-premium p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{budget.category}</h3>
                    <span className="text-xs text-white/40 capitalize px-2 py-1 bg-white/5 rounded-full">{budget.period}</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">${spent.toFixed(2)} spent</span>
                      <span className="text-white/40">${budget.limit.toFixed(2)} limit</span>
                    </div>
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        isOverBudget ? 'bg-red-500' : progress > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={isOverBudget ? 'text-red-400' : 'text-white/40'}>
                        {isOverBudget ? `$${(spent - budget.limit).toFixed(2)} over budget` : `$${(budget.limit - spent).toFixed(2)} remaining`}
                      </span>
                      <span className="text-white/40">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(budget)}
                      className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-1.5">
                      <Edit2 size={12} />Edit
                    </button>
                    <button onClick={() => handleDelete(budget)}
                      className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Spending Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card-premium p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-accent" />Spending by Category
          </h3>
          {spendingByCategory.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">No spending data yet</div>
          ) : (
            <div className="space-y-3">
              {spendingByCategory.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-white/70 truncate">{cat.name}</div>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full"
                      style={{ width: `${cat.percentage}%` }} />
                  </div>
                  <div className="w-20 text-right text-sm text-white/70">${cat.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => { setShowCreateModal(false); setEditingId(null); setNewBudget({ category: '', limit: '', period: 'monthly' }); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md glass-card-premium p-6 z-50 space-y-4">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Budget' : 'Create Budget'}</h2>
              <div>
                <label className="text-xs text-white/50 block mb-1.5 uppercase tracking-wider">Category</label>
                <select value={newBudget.category} onChange={e => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50">
                  <option value="">Select category</option>
                  {['DeFi', 'NFT', 'Gaming', 'Transfers', 'Exchange', 'Gas', 'Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1.5 uppercase tracking-wider">Monthly Limit ($)</label>
                <input type="number" value={newBudget.limit} onChange={e => setNewBudget({ ...newBudget, limit: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1.5 uppercase tracking-wider">Period</label>
                <select value={newBudget.period} onChange={e => setNewBudget({ ...newBudget, period: e.target.value as typeof newBudget.period })}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowCreateModal(false); setEditingId(null); setNewBudget({ category: '', limit: '', period: 'monthly' }); }}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl hover:bg-white/10 transition-all">
                  Cancel
                </button>
                <button onClick={handleCreate} className="flex-1 btn-premium-primary">
                  {editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete budget?"
        message={pendingDelete ? `Delete budget for ${pendingDelete.category}? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Keep"
        variant="danger"
      />
    </div>
  );
}
