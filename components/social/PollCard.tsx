import React, { useState } from 'react';
import { Poll, voteOnPoll, getPollResults, isPollExpired } from '@/lib/advancedMessages';

interface PollCardProps {
  poll: Poll;
  onVote: (optionId: string) => void;
  userAddress: string;
}

export default function PollCard({ poll, onVote, userAddress }: PollCardProps) {
  const [hasVoted, setHasVoted] = useState(
    poll.options.some((opt) => opt.votes.includes(userAddress))
  );

  const results = getPollResults(poll);
  const isExpired = isPollExpired(poll);
  const showResults = hasVoted || isExpired || poll.anonymous === false;

  const handleVote = (optionId: string) => {
    if (isExpired) return;

    onVote(optionId);
    setHasVoted(true);
  };

  const getUserVotes = () => {
    return poll.options.filter((opt) => opt.votes.includes(userAddress)).map((opt) => opt.id);
  };

  const userVotes = getUserVotes();

  return (
    <div className="bg-gradient-to-br from-[#00F0FF]/10 to-[#FF6B9D]/10 border border-[#00F0FF]/30 rounded-lg p-4 mt-2">
      {/* Poll Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <h4 className="text-white font-semibold">Poll</h4>
          </div>
          <p className="text-white text-lg">{poll.question}</p>
        </div>
      </div>

      {/* Poll Options */}
      <div className="space-y-3">
        {poll.options.map((option) => {
          const percentage = results[option.id] || 0;
          const isVoted = userVotes.includes(option.id);

          return (
            <div key={option.id}>
              {showResults ? (
                // Results View
                <div className="relative">
                  <div
                    className={`relative rounded-lg p-3 border-2 overflow-hidden ${
                      isVoted
                        ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                        : 'border-gray-700 bg-gray-800/50'
                    }`}
                  >
                    {/* Progress Bar Background */}
                    <div
                      className="absolute inset-0 bg-[#00F0FF]/20 transition-all"
                      style={{ width: `${percentage}%` }}
                    />

                    {/* Content */}
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {isVoted && <span className="text-[#00F0FF]">✓</span>}
                        <span className="text-white">{option.text}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">{option.votes.length} votes</span>
                        <span className="text-[#00F0FF] font-semibold min-w-[3rem] text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Voting View
                <button
                  onClick={() => handleVote(option.id)}
                  disabled={isExpired}
                  className="w-full text-left rounded-lg p-3 border-2 border-gray-700 bg-gray-800/50 text-white hover:border-[#00F0FF] hover:bg-[#00F0FF]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {option.text}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Poll Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-400">
          <span>👥 {results.totalVotes} votes</span>
          {poll.allowMultiple && <span>✓ Multiple choice</span>}
          {poll.anonymous && <span>🔒 Anonymous</span>}
        </div>

        {isExpired ? (
          <span className="text-red-400">Ended</span>
        ) : poll.expiresAt ? (
          <span className="text-gray-400">
            Ends {new Date(poll.expiresAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-gray-400">No expiration</span>
        )}
      </div>

      {/* Non-anonymous voter list (if applicable) */}
      {!poll.anonymous && showResults && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Voters:</p>
          <div className="flex flex-wrap gap-2">
            {poll.options.flatMap((opt) =>
              opt.votes.map((voter, idx) => (
                <span
                  key={`${opt.id}-${idx}`}
                  className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded"
                >
                  {voter.slice(0, 6)}...{voter.slice(-4)}
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
