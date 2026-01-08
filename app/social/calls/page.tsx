'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import SocialNav from '@/components/social/SocialNav';
import CallModal from '@/components/social/CallModal';
import IncomingCallModal from '@/components/social/IncomingCallModal';
import { useCall } from '@/lib/callSystem';
import { formatCallDuration } from '@/lib/callSystem';

export default function CallsPage() {
  const { address } = useAccount();
  const {
    call,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    initiateCall,
    answerCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useCall();

  const [recipientAddress, setRecipientAddress] = useState('');

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!recipientAddress.trim()) {
      alert('Please enter a recipient address');
      return;
    }
    initiateCall(recipientAddress, type, address);
  };

  return (
    <div className="min-h-screen bg-black">
      <SocialNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/social" className="text-[#00F0FF] hover:underline mb-2 inline-block">
            ← Back to Social Hub
          </Link>
          <h1 className="text-3xl font-bold text-white">Voice & Video Calls</h1>
          <p className="text-gray-400">WebRTC peer-to-peer calling</p>
        </div>

        {/* Start Call Section */}
        <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Start a Call</h2>
          
          <div className="max-w-md">
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Enter recipient wallet address (0x...)"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4 focus:outline-none focus:border-[#00F0FF] transition-colors"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleStartCall('voice')}
                className="flex-1 px-6 py-4 bg-[#50C878] text-white font-semibold rounded-lg hover:bg-[#50C878]/80 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-2xl">📞</span>
                <span>Voice Call</span>
              </button>
              <button
                onClick={() => handleStartCall('video')}
                className="flex-1 px-6 py-4 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-2xl">📹</span>
                <span>Video Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-bold text-white mb-2">Peer-to-Peer</h3>
            <p className="text-gray-400 text-sm">
              Direct WebRTC connections. Your calls never touch our servers.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="text-lg font-bold text-white mb-2">HD Quality</h3>
            <p className="text-gray-400 text-sm">
              Up to 1280x720 video with adaptive bitrate for smooth calls.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-lg font-bold text-white mb-2">Low Latency</h3>
            <p className="text-gray-400 text-sm">
              STUN/TURN servers ensure fast connections worldwide.
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-gradient-to-r from-[#00F0FF]/10 to-[#FF6B9D]/10 border border-[#00F0FF]/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">💡 Tips for Better Calls</h3>
          <ul className="space-y-2 text-gray-400">
            <li>• Use a stable internet connection (WiFi recommended)</li>
            <li>• Allow camera and microphone permissions when prompted</li>
            <li>• Use headphones to prevent echo</li>
            <li>• In production, signaling server enables call notifications</li>
          </ul>
        </div>
      </div>

      {/* Call Modals */}
      {call && call.status === 'ringing' && call.recipient === address && (
        <IncomingCallModal
          call={call}
          onAnswer={() => answerCall(call, {} as any)} // In production, pass actual offer
          onDecline={declineCall}
        />
      )}

      {call && (call.status === 'active' || call.status === 'initiating') && (
        <CallModal
          call={call}
          localStream={localStream}
          remoteStream={remoteStream}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}
    </div>
  );
}
