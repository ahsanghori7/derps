import PropTypes from "prop-types";
import {
  MicrophoneIcon,
  PauseFilledIcon,
  PlayFilledIcon,
  StopSquareIcon,
  TrashOutlineIcon,
} from "../shared/icons";
import { registerMediaPlaying } from "../shared/utils/mediaPlaybackManager";

/** In-composer voice recording controls: record/stop, pause/resume, discard, timer, and the recorded-draft preview player. */
const VoiceRecorderControls = ({
  isRecordingVoice = false,
  voiceDraftFile = null,
  voiceDraftUrl = null,
  sending = false,
  uploadingFile = false,
  hasPendingUpload = false,
  isVoicePaused = false,
  voiceSeconds = 0,
  voiceMaxSeconds,
  formatTime,
  onStartRecording,
  onStopRecording,
  onTogglePause,
  onDiscard,
}) => (
  <div className="flex items-center justify-end flex-1 min-w-0">
    {/* Voice-mode controls (only visible while actively recording) */}
    {isRecordingVoice && (
      <button
        type="button"
        onClick={() => (isRecordingVoice ? onStopRecording() : onStartRecording())}
        disabled={sending || uploadingFile || hasPendingUpload}
        className={`group inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)] ${
          isRecordingVoice
            ? "bg-red-500 hover:bg-red-600 text-white shadow-sm"
            : "chat-hover chat-text-muted"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isRecordingVoice ? `1Stop recording (${voiceSeconds}s)` : "2Record voice message"}
        aria-label={isRecordingVoice ? "Stop voice recording" : "Start voice recording"}
      >
        {isRecordingVoice ? (
          <StopSquareIcon />
        ) : (
          <MicrophoneIcon />
        )}
      </button>
    )}

    {isRecordingVoice && (
      <>
        <button
          type="button"
          onClick={onTogglePause}
          className="ml-2 inline-flex items-center justify-center w-10 h-10 rounded-full chat-hover chat-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)]"
          title={isVoicePaused ? "Resume recording" : "Pause recording"}
          aria-label={isVoicePaused ? "Resume voice recording" : "Pause voice recording"}
        >
          {isVoicePaused ? (
            <PlayFilledIcon />
          ) : (
            <PauseFilledIcon />
          )}
        </button>

        <button
          type="button"
          onClick={onDiscard}
          className="ml-2 inline-flex items-center justify-center w-10 h-10 rounded-full chat-hover chat-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)]"
          title="Discard recording"
          aria-label="Discard voice recording"
        >
          <TrashOutlineIcon />
        </button>

        <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-300 tabular-nums">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          {formatTime(voiceSeconds)} / {formatTime(voiceMaxSeconds)}
        </span>
      </>
    )}

    {voiceDraftFile && (
      <div className="flex-1 min-w-0">
        <div className="rounded-lg chat-reply-banner px-2.5 py-2">
          <audio
            src={voiceDraftUrl || undefined}
            controls
            className="w-full h-10"
            preload="metadata"
            onPlay={(e) => registerMediaPlaying(e.currentTarget)}
          >
            <track kind="captions" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    )}
  </div>
);

VoiceRecorderControls.propTypes = {
  isRecordingVoice: PropTypes.bool,
  voiceDraftFile: PropTypes.object,
  voiceDraftUrl: PropTypes.string,
  sending: PropTypes.bool,
  uploadingFile: PropTypes.bool,
  hasPendingUpload: PropTypes.bool,
  isVoicePaused: PropTypes.bool,
  voiceSeconds: PropTypes.number,
  voiceMaxSeconds: PropTypes.number.isRequired,
  formatTime: PropTypes.func.isRequired,
  onStartRecording: PropTypes.func.isRequired,
  onStopRecording: PropTypes.func.isRequired,
  onTogglePause: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
};

export default VoiceRecorderControls;
