"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Player {
  currentMs: number; playing: boolean; rate: number; durationMs: number;
  audioRef: React.RefObject<HTMLAudioElement | null>; hasMedia: boolean;
  play(): void; pause(): void; toggle(): void; seek(ms: number, autoplay?: boolean): void; setRate(r: number): void;
}

/**
 * One interface over two backends: a real <audio> element when the meeting has a media_url,
 * otherwise a simulated clock (the assignment allows a placeholder player). Transcript sync
 * only talks to this hook, so swapping in real media needs no UI changes.
 */
export function usePlayer(durationMs: number, mediaUrl: string | null): Player {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(1);
  const hasMedia = !!mediaUrl;
  const last = useRef(0);
  // Authoritative position. Deliberately NOT derived from render state: a render that lags a
  // timer tick must not make the clock lose time.
  const clockRef = useRef(0);

  // simulated clock
  useEffect(() => {
    if (hasMedia || !playing) return;
    last.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const next = clockRef.current + (now - last.current) * rate;
      last.current = now;
      if (next >= durationMs) { clockRef.current = durationMs; setCurrentMs(durationMs); setPlaying(false); }
      else { clockRef.current = next; setCurrentMs(next); }
    }, 100);
    return () => clearInterval(id);
  }, [hasMedia, playing, rate, durationMs]);

  // real media events
  useEffect(() => {
    const a = audioRef.current;
    if (!hasMedia || !a) return;
    const onTime = () => { clockRef.current = a.currentTime * 1000; setCurrentMs(clockRef.current); };
    const onPlay = () => setPlaying(true), onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime); a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause); a.addEventListener("ended", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime); a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause); a.removeEventListener("ended", onPause);
    };
  }, [hasMedia]);

  const play = useCallback(() => {
    if (hasMedia) { audioRef.current?.play().catch(() => setPlaying(false)); return; }
    if (clockRef.current >= durationMs) { clockRef.current = 0; setCurrentMs(0); }
    setPlaying(true);
  }, [hasMedia, durationMs]);
  const pause = useCallback(() => { if (hasMedia) audioRef.current?.pause(); else setPlaying(false); }, [hasMedia]);
  const seek = useCallback((ms: number, autoplay = false) => {
    const t = Math.min(Math.max(0, ms), durationMs);
    if (hasMedia && audioRef.current) audioRef.current.currentTime = t / 1000;
    setCurrentMs(t);
    clockRef.current = t;
    if (autoplay) play();
  }, [hasMedia, durationMs, play]);
  const setRate = useCallback((r: number) => {
    setRateState(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  return { currentMs, playing, rate, durationMs, audioRef, hasMedia, play, pause, toggle, seek, setRate };
}
