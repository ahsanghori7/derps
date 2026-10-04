/**
 * Ensures only one chat audio/video element plays at a time. Native <audio>/<video>
 * elements don't coordinate with each other, so without this, playing one message's
 * media doesn't stop another that's already playing.
 */
let activeMediaElement = null;

export const registerMediaPlaying = (mediaElement) => {
  if (activeMediaElement && activeMediaElement !== mediaElement) {
    activeMediaElement.pause();
  }
  activeMediaElement = mediaElement;
};

export const unregisterMediaElement = (mediaElement) => {
  if (activeMediaElement === mediaElement) {
    activeMediaElement = null;
  }
};
