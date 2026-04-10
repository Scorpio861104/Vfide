'use client';

interface NewTabProps {
  isConnected: boolean;
  subject: string;
  details: string;
  onSubjectChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onSubmitTicket: () => void;
}

export function NewTab({
  isConnected,
  subject,
  details,
  onSubjectChange,
  onDetailsChange,
  onSubmitTicket,
}: NewTabProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
      {!isConnected ? (
        <p className="text-gray-300">Connect your wallet to create support tickets.</p>
      ) : (
        <>
          <input
            type="text"
            value={subject}
            onChange={(event) =>  onSubjectChange(event.target.value)}
            placeholder="Brief description of your issue"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
          />
          <textarea
            value={details}
            onChange={(event) =>  onDetailsChange(event.target.value)}
            placeholder="Describe your issue in detail"
            className="w-full min-h-32 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
          />
          <button
            type="button"
            onClick={onSubmitTicket}
            className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold"
          >
            Submit Ticket
          </button>
        </>
      )}
    </div>
  );
}
