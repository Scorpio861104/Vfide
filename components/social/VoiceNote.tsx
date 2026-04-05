/**
 * VoiceNote — Record and play voice messages
 *
 * Critical for the target demographic. Many market sellers
 * are more comfortable speaking than typing. Voice notes
 * are the primary communication method in WhatsApp across
 * West Africa, and VFIDE's messaging should match.
 *
 * Uses MediaRecorder API. Renders as a waveform with play button.
 */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Square, Play, Pause, Trash2 } from 'lucide-react';

interface VoiceNoteRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void;
  maxDuration?: number;
}

export function VoiceNoteRecorder({ onRecorded, maxDuration = 60 }: VoiceNoteRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        onRecorded(blob, duration);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(100);
      mediaRecorder.current = recorder;
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration) { recorder.stop(); setRecording(false); return d; }
          return d + 0.1;
        });
      }, 100);

      const updateAmplitude = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAmplitude(avg / 255);
        animRef.current = requestAnimationFrame(updateAmplitude);
      };
      updateAmplitude();
    } catch {}
  }, [duration, maxDuration, onRecorded]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    chunks.current = [];
    setRecording(false);
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <button onClick={startRecording} className="p-2.5 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all">
          <Mic size={20} />
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
          {/* Amplitude visualizer */}
          <div className="flex items-center gap-0.5 h-6">
            {Array.from({ length: 12 }, (_, i) => {
              const height = 4 + amplitude * 20 * Math.sin((i + Date.now() / 100) * 0.5);
              return <div key={i} className="w-0.5 rounded-full bg-red-400 transition-all" style={{ height: `${Math.max(4, height)}px` }} />;
            })}
          </div>
          <span className="text-red-400 text-xs font-mono min-w-[40px]">{Math.floor(duration)}s</span>
          <button onClick={cancelRecording} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
          <button onClick={stopRecording} className="p-1.5 bg-red-500 rounded-full text-white"><Square size={12} fill="white" /></button>
        </div>
      )}
    </div>
  );
}

interface VoiceNotePlayerProps {
  audioUrl: string;
  duration: number;
  fromSelf?: boolean;
}

export function VoiceNotePlayer({ audioUrl, duration, fromSelf = false }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setProgress(audio.currentTime / audio.duration || 0);
    const ended = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('ended', ended);
    return () => { audio.removeEventListener('timeupdate', update); audio.removeEventListener('ended', ended); };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl max-w-[240px] ${fromSelf ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button onClick={toggle} className={`p-1.5 rounded-full ${fromSelf ? 'bg-cyan-500/30 text-cyan-400' : 'bg-white/10 text-white'}`}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <span className={`text-[10px] font-mono ${fromSelf ? 'text-cyan-400' : 'text-gray-500'}`}>{Math.floor(duration)}s</span>
    </div>
  );
}
