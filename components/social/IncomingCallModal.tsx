import React, { useEffect, useState } from 'react';
import { Call } from '@/lib/callSystem';

interface IncomingCallModalProps {
  call: Call;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({ call, onAnswer, onDecline }: IncomingCallModalProps) {
  const [isRinging, setIsRinging] = useState(true);

  useEffect(() => {
    // Play ringtone (in production, use actual audio file)
    const interval = setInterval(() => {
      setIsRinging((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-[#00F0FF] rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Call Type Icon */}
        <div className="text-center mb-6">
          <div
            className={`w-32 h-32 mx-auto rounded-full bg-[#00F0FF]/20 flex items-center justify-center transition-transform ${
              isRinging ? 'scale-110' : 'scale-100'
            }`}
          >
            <span className="text-7xl">
              {call.type === 'video' ? '📹' : '📞'}
            </span>
          </div>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-8">
          <h2 className="text-white text-2xl font-bold mb-2">Incoming Call</h2>
          <p className="text-[#00F0FF] text-lg">{call.initiator}</p>
          <p className="text-gray-400 text-sm mt-2">
            {call.type === 'video' ? 'Video Call' : 'Voice Call'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          {/* Decline */}
          <button
            onClick={onDecline}
            className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-2xl">✕</span>
            <span>Decline</span>
          </button>

          {/* Answer */}
          <button
            onClick={onAnswer}
            className="flex-1 py-4 bg-[#50C878] hover:bg-[#50C878]/80 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-2xl">✓</span>
            <span>Answer</span>
          </button>
        </div>

        {/* Ringtone Animation */}
        <div className="mt-6 flex items-center justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full bg-[#00F0FF] transition-opacity ${
                isRinging && i % 2 === 0 ? 'opacity-100' : 'opacity-30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
