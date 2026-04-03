'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original support page

export function TicketsTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="tickets"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
  >
    {/* Ticket List */}
    <div className="lg:col-span-1 space-y-4">
    <div className="flex items-center justify-between">
    <h3 className="font-semibold text-white">Your Tickets</h3>
    <button
    onClick={() => setActiveTab('new')}
    className="p-2 bg-jade-500/10 rounded-lg text-jade-400 hover:bg-jade-500/20"
    >
    <Plus size={18} />
    </button>
    </div>

    {tickets.length === 0 ? (
    <div className="p-8 bg-zinc-900/50 border border-zinc-700 rounded-xl text-center">
    <MessageCircle className="text-zinc-600 mx-auto mb-4" size={48} />
    <p className="text-zinc-400">No tickets yet</p>
    <button
    onClick={() => setActiveTab('new')}
    className="mt-4 px-4 py-2 bg-jade-500/10 text-jade-400 rounded-lg text-sm"
    >
    Create your first ticket
    </button>
    </div>
    ) : (
    <div className="space-y-2">
    {tickets.map(ticket => {
    const _StatusIcon = STATUS_CONFIG[ticket.status].icon;
    return (
    <button
    key={ticket.id}
    onClick={() => setSelectedTicket(ticket)}
    className={`w-full p-4 rounded-xl border text-left transition-all ${
    selectedTicket?.id === ticket.id
    ? 'border-jade-400 bg-jade-500/10'
    : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'
    }`}
    >
    <div className="flex items-start justify-between gap-2">
    <div className="flex-1 min-w-0">
    <p className="font-medium text-white truncate">{ticket.subject}</p>
    <p className="text-xs text-zinc-500 mt-1">{ticket.id}</p>
    </div>
    <span className={`px-2 py-1 rounded text-xs ${STATUS_CONFIG[ticket.status].color}`}>
    {STATUS_CONFIG[ticket.status].label}
    </span>
    </div>
    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
    <Clock size={12} />
    {ticket.updatedAt.toLocaleDateString()}
    </div>
    </button>
    );
    })}
    </div>
    )}
    </div>

    {/* Ticket Detail */}
    <div className="lg:col-span-2">
    {selectedTicket ? (
    <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden">
    {/* Ticket Header */}
    <div className="p-4 border-b border-zinc-700">
    <div className="flex items-start justify-between">
    <div>
    <h3 className="font-semibold text-white">{selectedTicket.subject}</h3>
    <div className="flex items-center gap-3 mt-2 text-sm">
    <span className="text-zinc-500">{selectedTicket.id}</span>
    <span className={`px-2 py-0.5 rounded ${STATUS_CONFIG[selectedTicket.status].color}`}>
    {STATUS_CONFIG[selectedTicket.status].label}
    </span>
    <span className={PRIORITY_CONFIG[selectedTicket.priority].color}>
    {PRIORITY_CONFIG[selectedTicket.priority].label} Priority
    </span>
    </div>
    </div>
    <div className="flex items-center gap-2">
    {(Object.entries(CATEGORY_CONFIG) as [TicketCategory, typeof CATEGORY_CONFIG[TicketCategory]][]).find(
    ([key]) => key === selectedTicket.category
    )?.[1] && (
    <span className="px-3 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center gap-1">
    {(() => {
    const CategoryIcon = CATEGORY_CONFIG[selectedTicket.category].icon;
    return <CategoryIcon size={12} />;
    })()}
    {CATEGORY_CONFIG[selectedTicket.category].label}
    </span>
    )}
    </div>
    </div>
    </div>

    {/* Messages */}
    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
    {selectedTicket.messages.map(msg => (
    <div
    key={msg.id}
    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
    <div className={`max-w-[80%] p-4 rounded-xl ${
    msg.sender === 'user'
    ? 'bg-jade-500/20 text-jade-100'
    : 'bg-zinc-800 text-zinc-100'
    }`}>
    <div className="flex items-center gap-2 mb-2">
    {msg.sender === 'support' && (
    <span className="px-2 py-0.5 bg-jade-500/20 text-jade-400 rounded text-xs">
    VFIDE Support
    </span>
    )}
    <span className="text-xs text-zinc-500">
    {msg.timestamp.toLocaleString()}
    </span>
    </div>
    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
    </div>
    </div>
    ))}
    </div>

    {/* Reply Box */}
    {selectedTicket.status !== 'closed' && (
    <div className="p-4 border-t border-zinc-700">
    <div className="flex gap-2">
    <input
    type="text"
    value={replyMessage}
    onChange={(e) => setReplyMessage(e.target.value)}
    placeholder="Type your reply..."
    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
    onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
    />
    <button
    onClick={handleSendReply}
    disabled={!replyMessage.trim()}
    className="px-4 py-3 bg-jade-500 text-black rounded-lg disabled:opacity-50"
    >
    <Send size={18} />
    </button>
    </div>
    </div>
    )}
    </div>
    ) : (
    <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-zinc-700 rounded-xl p-8">
    <div className="text-center">
    <MessageCircle className="text-zinc-600 mx-auto mb-4" size={48} />
    <p className="text-zinc-400">Select a ticket to view details</p>
    </div>
    </div>
    )}
    </div>
  </motion.div>
    </div>
  );
}
