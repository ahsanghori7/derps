import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { VideoCallScreen, PreJoinScreen, ChatThemeRoot, getChatRoute } from '@features/chat';
import { getVideoRoom, normalizeVideoRoomResponse } from '@api/videoRoomApi';
import { useVideoCallState } from '@contexts/VideoCallContext';

const isMobileBrowser = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || '',
  );

/**
 * Try opening the native Derps app for this meeting. If the app is not installed,
 * the browser stays on this web call page after a short delay.
 */
const tryOpenMeetingInApp = (meetingId) => {
  if (!meetingId || typeof window === 'undefined') return;
  if (!isMobileBrowser()) return;

  const skipKey = `derps_skip_app_open_${meetingId}`;
  try {
    if (sessionStorage.getItem(skipKey) === '1') return;
  } catch {
    // ignore
  }

  const appUrl = `derps://home/call?meeting=${encodeURIComponent(meetingId)}`;
  const started = Date.now();

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = appUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        // ignore
      }
    }, 2000);
  } catch {
    // ignore
  }

  try {
    window.location.href = appUrl;
  } catch {
    // ignore
  }

  setTimeout(() => {
    if (Date.now() - started < 4000) {
      try {
        sessionStorage.setItem(skipKey, '1');
      } catch {
        // ignore
      }
    }
  }, 1800);
};

const Call = ({ exitPath, onExit, recvOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedExitPath = exitPath ?? `${getChatRoute(location.pathname)}/`;
  const [searchParams] = useSearchParams();
  const [showPreJoinScreen, setShowPreJoinScreen] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [roomId, setRoomId] = useState(() => searchParams.get('meeting'));
  const [meetingOptions, setMeetingOptions] = useState({ withVideo: true, withAudio: true });
  const { setActiveVideoCall } = useVideoCallState();
  const [meetingInvalidMessage, setMeetingInvalidMessage] = useState(null);
  const [preferWeb, setPreferWeb] = useState(false);

  const expiredMeetingText =
    'This Meeting Link has expired. Please create a new meeting or use a valid meeting link.';

  useEffect(() => {
    const meetingParam = searchParams.get('meeting');
    // Recorder sessions must never sit on the interactive PreJoin screen —
    // there's no one there to click "Join" — so recvOnly always auto-joins.
    const autoJoin = recvOnly || searchParams.get('autoJoin') === 'true';
    const videoParam = searchParams.get('video');
    const audioParam = searchParams.get('audio');
    const stayOnWeb = searchParams.get('web') === '1' || searchParams.get('forceWeb') === 'true';

    if (meetingParam) {
      setRoomId(meetingParam);

      if (videoParam !== null) {
        setMeetingOptions(prev => ({ ...prev, withVideo: videoParam === 'true' }));
      }
      if (audioParam !== null) {
        setMeetingOptions(prev => ({ ...prev, withAudio: audioParam === 'true' }));
      }

      if (!stayOnWeb) {
        tryOpenMeetingInApp(meetingParam);
      } else {
        setPreferWeb(true);
      }

      if (autoJoin) {
        const token = localStorage.getItem('accessToken');
        const isGuestUser = recvOnly || Boolean(localStorage.getItem('guestInfo'));
        setMeetingInvalidMessage(null);

        (async () => {
          // Guests/recorders have no account token to validate the room with —
          // skip the lookup, same as the manual PreJoin path does for guests.
          if (isGuestUser) {
            setShowVideoCall(true);
            setActiveVideoCall(
              meetingParam,
              videoParam !== null ? videoParam === 'true' : true,
              audioParam !== null ? audioParam === 'true' : true,
              null,
              recvOnly
            );
            return;
          }

          try {
            const response = await getVideoRoom(token, meetingParam);
            const roomData = normalizeVideoRoomResponse(response);
            setShowVideoCall(true);
            setActiveVideoCall(
              meetingParam,
              videoParam !== null ? videoParam === 'true' : true,
              audioParam !== null ? audioParam === 'true' : true,
              roomData
            );
          } catch (e) {
            const status = e?.status;
            if (status === 404) {
              setMeetingInvalidMessage(expiredMeetingText);
            } else {
              const msg = e?.message ? String(e.message) : 'Failed to validate meeting link.';
              setMeetingInvalidMessage(msg);
            }
            setShowVideoCall(false);
            setShowPreJoinScreen(false);
          }
        })();
      } else {
        setShowPreJoinScreen(true);
      }
    }
  }, [searchParams, setActiveVideoCall, recvOnly]);

  const handlePreJoinJoin = async ({ videoEnabled, audioEnabled }) => {
    const token = localStorage.getItem('accessToken');
    const isGuestUser = Boolean(localStorage.getItem('guestInfo'));
    setMeetingInvalidMessage(null);

    let roomData = null;
    if (!isGuestUser) {
      try {
        const response = await getVideoRoom(token, roomId);
        roomData = normalizeVideoRoomResponse(response);
      } catch (e) {
        const status = e?.status;
        const msg = status === 404 ? expiredMeetingText : (e?.message ? String(e.message) : 'Failed to validate meeting link.');
        setMeetingInvalidMessage(msg);
        return;
      }
    }

    setMeetingOptions({ withVideo: videoEnabled, withAudio: audioEnabled });
    flushSync(() => {
      setShowPreJoinScreen(false);
      setShowVideoCall(true);
    });
    setActiveVideoCall(roomId, videoEnabled, audioEnabled, roomData, recvOnly);
  };

  const handlePreJoinCancel = () => {
    setShowPreJoinScreen(false);
    if (onExit) onExit();
    navigate(resolvedExitPath);
  };

  const handleVideoCallLeave = () => {
    setShowVideoCall(false);
    setRoomId(null);
    setMeetingOptions({ withVideo: true, withAudio: true });
    if (onExit) onExit();
    navigate(resolvedExitPath);
  };

  const handleOpenInApp = () => {
    if (!roomId) return;
    try {
      sessionStorage.removeItem(`derps_skip_app_open_${roomId}`);
    } catch {
      // ignore
    }
    window.location.href = `derps://home/call?meeting=${encodeURIComponent(roomId)}`;
  };

  if (!roomId) {
    return (
      <ChatThemeRoot className="flex items-center justify-center h-screen chat-fullscreen">
        <div className="text-center">
          <p className="chat-text text-lg mb-4">No meeting room specified</p>
          <button
            onClick={() => {
              if (onExit) onExit();
              navigate(resolvedExitPath);
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
          >
            Go back
          </button>
        </div>
      </ChatThemeRoot>
    );
  }

  if (meetingInvalidMessage) {
    return (
      <ChatThemeRoot className="flex items-center justify-center h-screen chat-fullscreen">
        <div className="text-center max-w-xl px-4">
          <p className="chat-text text-lg font-semibold mb-2">Unable to join meeting</p>
          <p className="chat-text-secondary text-sm sm:text-base mb-6">{meetingInvalidMessage}</p>
          <button
            onClick={() => {
              if (onExit) onExit();
              navigate(resolvedExitPath);
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
          >
            Go back
          </button>
        </div>
      </ChatThemeRoot>
    );
  }

  return (
    <ChatThemeRoot className="chat-fullscreen inset-0">
      {isMobileBrowser() && showPreJoinScreen && !preferWeb ? (
        <div className="absolute top-3 left-3 right-3 z-50 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleOpenInApp}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-md"
          >
            Open in Derps app
          </button>
          <button
            type="button"
            onClick={() => setPreferWeb(true)}
            className="px-4 py-2 rounded-lg bg-white/90 text-slate-800 text-sm font-semibold shadow-md"
          >
            Continue on web
          </button>
        </div>
      ) : null}

      {showPreJoinScreen && roomId && (
        <PreJoinScreen
          onJoin={handlePreJoinJoin}
          onCancel={handlePreJoinCancel}
          withVideo={meetingOptions.withVideo}
          withAudio={meetingOptions.withAudio}
        />
      )}

      {showVideoCall && roomId && (
        <VideoCallScreen
          roomId={roomId}
          onLeave={handleVideoCallLeave}
          withVideo={meetingOptions.withVideo}
          withAudio={meetingOptions.withAudio}
        />
      )}
    </ChatThemeRoot>
  );
};

Call.propTypes = {
  exitPath: PropTypes.string,
  onExit: PropTypes.func,
  recvOnly: PropTypes.bool,
};

export default Call;
