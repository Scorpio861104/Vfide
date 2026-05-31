'use client';

interface SupportMessage {
  id: string;
  sender: 'user' | 'support';
  content: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  messages: SupportMessage[];
}

interface TicketsTabProps {
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  selectedTicket: SupportTicket | null;
  noTicketsMessage: string;
  subjectPrefix: string;
  ticketIdLabel: string;
  supportTeamLabel: string;
  youLabel: string;
  selectTicketMessage: string;
  onSelectTicket: (ticketId: string) => void;
}

export function TicketsTab({
  tickets,
  selectedTicketId,
  selectedTicket,
  noTicketsMessage,
  subjectPrefix,
  ticketIdLabel,
  supportTeamLabel,
  youLabel,
  selectTicketMessage,
  onSelectTicket,
}: TicketsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
        {tickets.length === 0 ? (
          <p className="text-gray-400">{noTicketsMessage}</p>
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onSelectTicket(ticket.id)}
              className={`w-full text-left rounded-xl border px-3 py-3 ${selectedTicketId === ticket.id ? 'border-accent/30 bg-accent/10' : 'border-white/10 bg-black/20'}`}
            >
              <div className="text-white font-semibold">{ticket.id}</div>
              <div className="text-xs text-gray-400 mt-1">{subjectPrefix} • {ticket.subject}</div>
            </button>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        {selectedTicket ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedTicket.subject}</h2>
              <p className="text-sm text-gray-400 mt-1">{ticketIdLabel}: {selectedTicket.id}</p>
            </div>
            <div className="space-y-3">
              {selectedTicket.messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-sm font-semibold text-white mb-1">{message.sender === 'support' ? supportTeamLabel : youLabel}</div>
                  <p className="text-sm text-gray-300">{message.content}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-400">{selectTicketMessage}</p>
        )}
      </div>
    </div>
  );
}
