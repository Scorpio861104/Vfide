'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original support page

export function NewTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="new"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="max-w-2xl mx-auto"
  >
    <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 space-y-6">
    <div className="flex items-center gap-3">
    <Plus className="text-jade-400" size={24} />
    <h3 className="text-xl font-semibold text-white">Create Support Ticket</h3>
    </div>

    {!isConnected && (
    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
    <div className="flex items-start gap-3">
    <AlertCircle className="text-amber-400 shrink-0" size={20} />
    <p className="text-sm text-amber-200">
    Connect your wallet to create support tickets and track their status.
    </p>
    </div>
    </div>
    )}

    <div className="space-y-4">
    <div>
    <label className="block text-sm font-medium text-zinc-300 mb-2">Subject</label>
    <input
    type="text"
    value={newSubject}
    onChange={(e) => setNewSubject(e.target.value)}
    placeholder="Brief description of your issue"
    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
    />
    </div>

    <div className="grid grid-cols-2 gap-4">
    <div>
    <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
    <select
    value={newCategory}
    onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-jade-500"
    >
    {(Object.entries(CATEGORY_CONFIG) as [TicketCategory, typeof CATEGORY_CONFIG[TicketCategory]][]).map(([key, config]) => (
    <option key={key} value={key}>{config.label}</option>
    ))}
    </select>
    </div>

    <div>
    <label className="block text-sm font-medium text-zinc-300 mb-2">Priority</label>
    <select
    value={newPriority}
    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-jade-500"
    >
    {(Object.entries(PRIORITY_CONFIG) as [TicketPriority, typeof PRIORITY_CONFIG[TicketPriority]][]).map(([key, config]) => (
    <option key={key} value={key}>{config.label}</option>
    ))}
    </select>
    </div>
    </div>

    <div>
    <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
    <textarea
    value={newMessage}
    onChange={(e) => setNewMessage(e.target.value)}
    placeholder="Describe your issue in detail. Include any relevant transaction IDs, error messages, or steps to reproduce the problem."
    rows={6}
    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500 resize-none"
    />
    </div>

    <div className="p-4 bg-zinc-800/50 rounded-lg">
    <p className="text-sm text-zinc-400">
    <strong className="text-zinc-300">Connected Wallet:</strong>{' '}
    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
    </p>
    </div>
    </div>

    <button
    onClick={handleCreateTicket}
    disabled={!newSubject.trim() || !newMessage.trim()}
    className="w-full py-4 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
    <Send size={18} />
    Submit Ticket
    </button>
    </div>
  </motion.div>
    </div>
  );
}
