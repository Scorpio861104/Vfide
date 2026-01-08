import React, { useEffect, useRef, useState } from 'react';
import { Call, formatCallDuration } from '@/lib/callSystem';

interface CallModalProps {
  call: Call;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onMinimize?: () => void;
}

export default function CallModal({
  call,
  localStream,
  remoteStream,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onMinimize,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Update local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Update call duration
  useEffect(() => {
    if (call.status !== 'active') return;

    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - call.startedAt!) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.status, call.startedAt]);

  const handleMinimize = () => {
    setIsMinimized(true);
    onMinimize?.();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 backdrop-blur-sm border-2 border-[#00F0FF] rounded-lg p-4 shadow-2xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
            <span className="text-2xl">{call.type === 'video' ? '📹' : '📞'}</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">{call.recipient}</p>
            <p className="text-[#00F0FF] text-sm">{formatCallDuration(callDuration)}</p>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ⬆️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-2xl font-bold">
              {call.type === 'video' ? 'Video Call' : 'Voice Call'}
            </h2>
            <p className="text-[#00F0FF]">
              {call.status === 'active'
                ? formatCallDuration(callDuration)
                : call.status === 'ringing'
                ? 'Ringing...'
                : call.status === 'initiating'
                ? 'Connecting...'
                : 'Ended'}
            </p>
          </div>
          {onMinimize && (
            <button
              onClick={handleMinimize}
              className="text-white hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              ⬇️
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {call.type === 'video' ? (
          <>
            {/* Remote Video (Full Screen) */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                <div className="w-32 h-32 rounded-full bg-[#00F0FF]/20 flex items-center justify-center mb-4">
                  <span className="text-6xl">👤</span>
                </div>
                <p className="text-white text-xl">{call.recipient}</p>
                <p className="text-gray-400 mt-2">Waiting for video...</p>
              </div>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {localStream && (
              <div className="absolute top-20 right-6 w-48 h-36 rounded-lg overflow-hidden border-2 border-[#00F0FF] shadow-2xl">
                {isVideoMuted ? (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <span className="text-4xl">📷</span>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                )}
              </div>
            )}
          </>
        ) : (
          // Voice Call UI
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <div className="w-48 h-48 rounded-full bg-[#00F0FF]/20 flex items-center justify-center mb-8 animate-pulse">
              <span className="text-8xl">📞</span>
            </div>
            <p className="text-white text-3xl font-bold mb-2">{call.recipient}</p>
            <p className="text-[#00F0FF] text-xl">{formatCallDuration(callDuration)}</p>

            {/* Audio Waveform Visualization */}
            {call.status === 'active' && (
              <div className="flex items-center gap-1 mt-8">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-[#00F0FF] rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 40 + 10}px`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8">
        <div className="flex items-center justify-center gap-6">
          {/* Mute Audio */}
          <button
            onClick={onToggleAudio}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isAudioMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            <span className="text-2xl">{isAudioMuted ? '🔇' : '🎤'}</span>
          </button>

          {/* Toggle Video (only for video calls) */}
          {call.type === 'video' && (
            <button
              onClick={onToggleVideo}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isVideoMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
            >
              <span className="text-2xl">{isVideoMuted ? '📷' : '📹'}</span>
            </button>
          )}

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all scale-110 shadow-lg"
            title="End Call"
          >
            <span className="text-3xl">📞</span>
          </button>
        </div>

        {/* Connection Quality */}
        {call.status === 'active' && (
          <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-[#50C878] rounded-full" />
              <div className="w-1 h-4 bg-[#50C878] rounded-full" />
              <div className="w-1 h-5 bg-[#50C878] rounded-full" />
            </div>
            <span>Good connection</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
