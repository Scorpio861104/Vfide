/**
 * Voice & Video Calling System
 * WebRTC-based peer-to-peer voice and video calls
 */

export interface Call {
  id: string;
  type: 'voice' | 'video';
  initiator: string;
  recipient: string;
  status: 'initiating' | 'ringing' | 'active' | 'ended' | 'declined' | 'missed' | 'failed';
  startedAt?: number;
  endedAt?: number;
  duration?: number; // in seconds
}

export interface CallState {
  call: Call | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isSpeakerOn: boolean;
}

/**
 * WebRTC Configuration
 */
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // In production, add TURN servers for NAT traversal
  ],
};

/**
 * Call Manager
 */
export class CallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onStateChange?: (state: Partial<CallState>) => void;

  constructor(onStateChange?: (state: Partial<CallState>) => void) {
    this.onStateChange = onStateChange;
  }

  /**
   * Initialize call - get user media
   */
  async initializeCall(type: 'voice' | 'video'): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.notifyStateChange({ localStream: this.localStream });

      return this.localStream;
    } catch (error: unknown) {
      console.error('Failed to get user media:', error);

      const errorName =
        error instanceof DOMException || error instanceof Error ? error.name : undefined;

      if (errorName === 'NotAllowedError') {
        throw new Error('Camera/microphone permission denied');
      } else if (errorName === 'NotFoundError') {
        throw new Error('No camera/microphone found');
      }

      throw new Error('Failed to access camera/microphone');
    }
  }

  /**
   * Create peer connection
   */
  createPeerConnection(): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.notifyStateChange({ remoteStream: this.remoteStream });
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer via signaling
        this.sendSignal('ice-candidate', { candidate: event.candidate });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      
      if (this.peerConnection?.connectionState === 'failed') {
        this.handleCallFailed();
      }
    };

    return this.peerConnection;
  }

  /**
   * Create offer (caller)
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    return offer;
  }

  /**
   * Create answer (callee)
   */
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    return answer;
  }

  /**
   * Handle answer (caller receives answer)
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  /**
   * Toggle audio mute
   */
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.notifyStateChange({ isAudioMuted: !audioTrack.enabled });
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Toggle video mute
   */
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.notifyStateChange({ isVideoMuted: !videoTrack.enabled });
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  /**
   * End call and cleanup
   */
  endCall(): void {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.notifyStateChange({
      localStream: null,
      remoteStream: null,
    });
  }

  /**
   * Signaling (in production, use WebSocket/WebRTC signaling server)
   */
  private sendSignal(type: string, data: Record<string, unknown>): void {
    // In production, send via WebSocket to signaling server
    console.log('Send signal:', type, data);
    
    // Fallback: store in localStorage for same-device testing
    const signals = JSON.parse(localStorage.getItem('vfide_call_signals') || '[]');
    signals.push({ type, data, timestamp: Date.now() });
    localStorage.setItem('vfide_call_signals', JSON.stringify(signals));
  }

  /**
   * Handle call failed
   */
  private handleCallFailed(): void {
    this.endCall();
    // Notify UI
  }

  /**
   * Notify state change
   */
  private notifyStateChange(state: Partial<CallState>): void {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }
}

/**
 * React hook for voice/video calls
 */
export function useCall() {
  const [state, setState] = React.useState<CallState>({
    call: null,
    localStream: null,
    remoteStream: null,
    isAudioMuted: false,
    isVideoMuted: false,
    isSpeakerOn: true,
  });

  const [callManager] = React.useState(() => new CallManager((newState) => {
    setState((prev) => ({ ...prev, ...newState }));
  }));

  // Initialize call
  const initiateCall = React.useCallback(async (
    recipient: string,
    type: 'voice' | 'video',
    initiator: string
  ) => {
    try {
      // Get user media
      await callManager.initializeCall(type);

      // Create call object
      const call: Call = {
        id: `call_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(7)), b => b.toString(16).padStart(2, '0')).join('').slice(0, 9)}`,
        type,
        initiator,
        recipient,
        status: 'initiating',
      };

      setState((prev) => ({ ...prev, call }));

      // Create offer
      const offer = await callManager.createOffer();

      // Send offer to recipient (via signaling server)
      sendCallSignal(recipient, 'offer', { call, offer });

      // Update status to ringing
      setState((prev) => ({
        ...prev,
        call: prev.call ? { ...prev.call, status: 'ringing' } : null,
      }));

      return call;
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }, [callManager]);

  // Answer call
  const answerCall = React.useCallback(async (call: Call, offer: RTCSessionDescriptionInit) => {
    try {
      // Get user media
      await callManager.initializeCall(call.type);

      // Create answer
      const answer = await callManager.createAnswer(offer);

      // Send answer to caller
      sendCallSignal(call.initiator, 'answer', { callId: call.id, answer });

      // Update call status
      const activeCall: Call = {
        ...call,
        status: 'active',
        startedAt: Date.now(),
      };

      setState((prev) => ({ ...prev, call: activeCall }));
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  }, [callManager]);

  // Decline call
  const declineCall = React.useCallback((call: Call) => {
    // Send decline signal
    sendCallSignal(call.initiator, 'decline', { callId: call.id });

    setState((prev) => ({
      ...prev,
      call: call ? { ...call, status: 'declined', endedAt: Date.now() } : null,
    }));

    callManager.endCall();
  }, [callManager]);

  // End call
  const endCall = React.useCallback(() => {
    if (state.call) {
      const endedCall: Call = {
        ...state.call,
        status: 'ended',
        endedAt: Date.now(),
        duration: state.call.startedAt
          ? Math.floor((Date.now() - state.call.startedAt) / 1000)
          : undefined,
      };

      // Send end signal to other party
      const otherParty = state.call.initiator === state.call.recipient
        ? state.call.recipient
        : state.call.initiator;
      sendCallSignal(otherParty, 'end', { callId: state.call.id });

      setState((prev) => ({ ...prev, call: endedCall }));
      
      callManager.endCall();

      // Clear after 2 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, call: null }));
      }, 2000);
    }
  }, [state.call, callManager]);

  // Toggle audio
  const toggleAudio = React.useCallback(() => {
    const isMuted = callManager.toggleAudio();
    setState((prev) => ({ ...prev, isAudioMuted: isMuted }));
  }, [callManager]);

  // Toggle video
  const toggleVideo = React.useCallback(() => {
    const isMuted = callManager.toggleVideo();
    setState((prev) => ({ ...prev, isVideoMuted: isMuted }));
  }, [callManager]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      callManager.endCall();
    };
  }, [callManager]);

  return {
    ...state,
    initiateCall,
    answerCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
}

/**
 * Send call signal (in production, use WebSocket)
 */
function sendCallSignal(recipient: string, type: string, data: Record<string, unknown>): void {
  // In production, send via WebSocket/signaling server
  console.log('Send call signal to', recipient, ':', type, data);
  
  // Fallback: use localStorage
  const key = `vfide_call_signal_${recipient}`;
  const signals = JSON.parse(localStorage.getItem(key) || '[]');
  signals.push({ type, data, timestamp: Date.now() });
  localStorage.setItem(key, JSON.stringify(signals));
}

/**
 * Format call duration
 */
export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Check if browser supports WebRTC
 */
export function isWebRTCSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    window.RTCPeerConnection
  );
}

/**
 * Request camera/microphone permissions
 */
export async function requestMediaPermissions(
  type: 'voice' | 'video'
): Promise<{ audio: boolean; video: boolean }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });

    // Stop tracks immediately
    stream.getTracks().forEach((track) => track.stop());

    return {
      audio: true,
      video: type === 'video',
    };
  } catch (error: unknown) {
    console.error('Permission denied:', error);
    return {
      audio: false,
      video: false,
    };
  }
}

// Call history storage
export const callHistory = {
  save(call: Call): void {
    const key = 'vfide_call_history';
    const history: Call[] = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift(call);
    
    // Keep only last 100 calls
    const trimmed = history.slice(0, 100);
    localStorage.setItem(key, JSON.stringify(trimmed));
  },

  load(): Call[] {
    const key = 'vfide_call_history';
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  clear(): void {
    localStorage.removeItem('vfide_call_history');
  },
};

// For React hook
import * as React from 'react';
