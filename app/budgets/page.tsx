'use client';

import React, { useState, useCallback } from 'react';
import { useFinancialIntelligence, Budget } from '@/lib/financialIntelligence';
import { useAccount } from 'wagmi';
import { toast } from '@/lib/toast';

export default function BudgetsPage() {
  const { address } = useAccount();
  const { budgets, spendingByCategory, setBudget, loading: _loading } = useFinancialIntelligence(address);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      id: Date.now().toString(),
      category: newBudget.category,
      limit: parseFloat(newBudget.limit),
      spent: 0,
      period: newBudget.period,
      alerts: true,
    });

    setShowCreateModal(false);
    setNewBudget({ category: '', limit: '', period: 'monthly' });
    toast.success('Budget created');
  }, [newBudget, setBudget]);

  const getSpentAmount = (category: string) => {
    const cat = spendingByCategory.find(c => c.name === category);
    return cat?.amount || 0;
  };

  const getProgress = (budget: Budget) => {
    const spent = getSpentAmount(budget.category);
    return Math.min((spent / budget.limit) * 100, 100);
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Track and control your spending</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          + Create Budget
        </button>
      </div>

      {/* Budget Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {budgets.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-card rounded-xl border">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-medium mb-2">No budgets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a budget to start tracking your spending
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Create First Budget
            </button>
          </div>
        ) : (
          budgets.map((budget) => {
            const progress = getProgress(budget);
            const spent = getSpentAmount(budget.category);
            const isOverBudget = spent > budget.limit;

            return (
              <div key={budget.id} className="bg-card rounded-xl p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{budget.category}</h3>
                  <span className="text-xs text-muted-foreground capitalize">{budget.period}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>${spent.toFixed(2)} spent</span>
                    <span className="text-muted-foreground">${budget.limit.toFixed(2)} limit</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverBudget
                          ? 'bg-red-500'
                          : progress > 80
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={isOverBudget ? 'text-red-500' : 'text-muted-foreground'}>
                      {isOverBudget
                        ? `$${(spent - budget.limit).toFixed(2)} over budget`
                        : `$${(budget.limit - spent).toFixed(2)} remaining`}
                    </span>
                    <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80">
                    Edit
                  </button>
                  <button className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm">
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Spending Overview */}
      <div className="bg-card rounded-xl p-4 border">
        <h3 className="font-medium mb-4">Spending by Category</h3>
        {spendingByCategory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No spending data yet
          </div>
        ) : (
          <div className="space-y-3">
            {spendingByCategory.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className="w-24 text-sm truncate">{cat.name}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
                <div className="w-20 text-right text-sm">${cat.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-card border rounded-2xl p-6 z-50 space-y-4">
            <h2 className="text-xl font-bold">Create Budget</h2>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Category</label>
              <select
                value={newBudget.category}
                onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                className="w-full p-3 bg-muted border border-border rounded-lg"
              >
                <option value="">Select category</option>
                <option>DeFi</option>
                <option>NFT</option>
                <option>Gaming</option>
                <option>Transfers</option>
                <option>Exchange</option>
                <option>Gas</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Monthly Limit ($)</label>
              <input
                type="number"
                value={newBudget.limit}
                onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
                placeholder="0.00"
                className="w-full p-3 bg-muted border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Period</label>
              <select
                value={newBudget.period}
                onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value as typeof newBudget.period })}
                className="w-full p-3 bg-muted border border-border rounded-lg"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-muted rounded-lg hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
