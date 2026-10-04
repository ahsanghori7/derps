import { useEffect, useState } from 'react';

// One AudioContext shared across every indicator so a call with many
// participants doesn't spin up a context (and rAF loop) per tile.
let sharedAudioContext = null;
const getSharedAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new AudioContextClass();
    }
    return sharedAudioContext;
};

const SPEAKING_THRESHOLD = 3; // RMS * 100; above the noise floor left after the browser's own noise suppression
const SPEAKING_ATTACK_MS = 150; // require sound to sustain briefly before lighting up, so one noisy frame can't trigger it
const SPEAKING_HOLD_MS = 900; // keep the indicator on through normal pauses between words/syllables, like Zoom
const LEVEL_SMOOTHING = 0.6; // EMA factor so a single loud/quiet frame can't swing the reading

/**
 * Reports whether a MediaStream's audio track currently has speech-level
 * activity, for driving a "speaking now" indicator on a participant tile.
 */
export const useAudioActivity = (stream, enabled = true) => {
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        if (!enabled || !stream) {
            setIsSpeaking(false);
            return undefined;
        }

        const audioTrack = stream.getAudioTracks?.()[0];
        if (!audioTrack || audioTrack.readyState !== 'live') {
            setIsSpeaking(false);
            return undefined;
        }

        const audioContext = getSharedAudioContext();
        if (!audioContext) return undefined;

        let rafId = null;
        let source = null;
        let analyser = null;
        let holdTimeoutId = null;
        let cancelled = false;

        const start = async () => {
            try {
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                if (cancelled) return;

                source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 1024;
                source.connect(analyser);

                // Time-domain RMS (not the frequency-bin average this used to use) — a full-spectrum
                // average dilutes a voice's energy across mostly-empty high-frequency bins and never
                // clears a usable threshold, which is why speech wasn't triggering the indicator.
                const data = new Uint8Array(analyser.fftSize);
                let smoothedLevel = 0;
                let aboveSinceTs = null;
                let confirmedSpeaking = false;

                const tick = () => {
                    analyser.getByteTimeDomainData(data);
                    let sumSquares = 0;
                    for (let i = 0; i < data.length; i += 1) {
                        const normalized = (data[i] - 128) / 128;
                        sumSquares += normalized * normalized;
                    }
                    const rawLevel = Math.sqrt(sumSquares / data.length) * 100;
                    // EMA so one loud/quiet animation frame can't flip the reading on its own.
                    smoothedLevel = (smoothedLevel * LEVEL_SMOOTHING) + (rawLevel * (1 - LEVEL_SMOOTHING));

                    const now = Date.now();
                    if (smoothedLevel > SPEAKING_THRESHOLD) {
                        if (aboveSinceTs === null) aboveSinceTs = now;

                        if (confirmedSpeaking) {
                            // Still talking — cancel any pending "gone quiet" hold.
                            if (holdTimeoutId) {
                                clearTimeout(holdTimeoutId);
                                holdTimeoutId = null;
                            }
                        } else if (now - aboveSinceTs >= SPEAKING_ATTACK_MS) {
                            confirmedSpeaking = true;
                            setIsSpeaking(true);
                        }
                    } else {
                        aboveSinceTs = null;
                        if (confirmedSpeaking && !holdTimeoutId) {
                            holdTimeoutId = setTimeout(() => {
                                confirmedSpeaking = false;
                                holdTimeoutId = null;
                                setIsSpeaking(false);
                            }, SPEAKING_HOLD_MS);
                        }
                    }

                    rafId = requestAnimationFrame(tick);
                };
                tick();
            } catch {
                // Analyser is a best-effort enhancement; leave the indicator off on failure.
            }
        };

        start();

        return () => {
            cancelled = true;
            if (rafId) cancelAnimationFrame(rafId);
            if (holdTimeoutId) clearTimeout(holdTimeoutId);
            source?.disconnect();
            analyser?.disconnect();
            setIsSpeaking(false);
        };
    }, [stream, enabled]);

    return isSpeaking;
};
