import { useCallback, useRef } from 'react';

// Classic North American telephone ring: two sine tones a fourth apart, played
// together so they beat against each other into the familiar analog "warble",
// on for RING_ON_SEC then silent for RING_OFF_SEC before repeating.
const RING_FREQ_A = 440;   // A4
const RING_FREQ_B = 480;
const RING_ON_SEC = 1.5;
const RING_OFF_SEC = 2.5;
const RING_CYCLE_MS = (RING_ON_SEC + RING_OFF_SEC) * 1000;

/**
 * Synthesizes one ring burst via Web Audio oscillators, same technique
 * notificationService.playNotificationSound() already uses — avoids depending
 * on a licensed ringtone audio file, which this repo doesn't have.
 */
const playRingBurst = (ctx) => {
    const now = ctx.currentTime;
    const playTone = (frequency) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        osc.type = 'sine';
        // Fast fade in/out at the edges (avoids clicks), held at volume through the ring.
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.5, now + 0.05);
        gain.gain.setValueAtTime(0.5, now + RING_ON_SEC - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + RING_ON_SEC);
        osc.start(now);
        osc.stop(now + RING_ON_SEC);
    };
    playTone(RING_FREQ_A);
    playTone(RING_FREQ_B);
};

/** Looping ringtone for incoming calls — starts/stops a repeating ring burst. */
export const useRingtone = () => {
    const audioContextRef = useRef(null);
    const intervalRef = useRef(null);

    const getAudioContext = useCallback(() => {
        if (audioContextRef.current) return audioContextRef.current;
        if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return null;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new Ctx();
        return audioContextRef.current;
    }, []);

    const start = useCallback(() => {
        if (intervalRef.current) return; // already ringing
        const ctx = getAudioContext();
        if (!ctx) return;

        const ring = () => {
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            playRingBurst(ctx);
        };

        ring();
        intervalRef.current = setInterval(ring, RING_CYCLE_MS);
    }, [getAudioContext]);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    return { start, stop };
};

export default useRingtone;
