'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
interface NewTabProps {
  isConnected: boolean;
  subject: string;
  details: string;
  connectPrompt: string;
  subjectPlaceholder: string;
  detailsPlaceholder: string;
  submitTicketLabel: string;
  onSubjectChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onSubmitTicket: () => void;
}

export function NewTab({
  isConnected,
  subject,
  details,
  connectPrompt,
  subjectPlaceholder,
  detailsPlaceholder,
  submitTicketLabel,
  onSubjectChange,
  onDetailsChange,
  onSubmitTicket,
}: NewTabProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
      {!isConnected ? (
        <>
          <p className="text-gray-300">{connectPrompt}</p>
          <div className="mt-6 flex justify-center">
            <VfideConnectButton size="md" />
          </div>
        </>
      ) : (
        <>
          <input
            type="text"
            value={subject}
            onChange={(event) =>  onSubjectChange(event.target.value)}
            placeholder={subjectPlaceholder}
           
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white "
          />
          <textarea
            value={details}
            onChange={(event) =>  onDetailsChange(event.target.value)}
            placeholder={detailsPlaceholder}
           
            className="w-full min-h-32 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white "
          />
          <button
            type="button"
            onClick={onSubmitTicket}
            className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold"
          >
            {submitTicketLabel}
          </button>
        </>
      )}
    </div>
  );
}
