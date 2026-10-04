import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useVideoCallState } from "@contexts/VideoCallContext";
import Call from "../screens/Call";
import { ChatThemeRoot } from "../shared/theme";
import GuestJoinScreen from "./GuestJoinScreen";

const GUEST_TOKEN_KEY = "guestAccessToken";
const GUEST_INFO_KEY = "guestInfo";

function readAccessToken() {
  return localStorage.getItem("accessToken");
}

function readGuestToken() {
  return localStorage.getItem(GUEST_TOKEN_KEY);
}

/**
 * Flips window.__DERPS_RECORDING_READY once the recorder session is in the
 * room AND at least one remote participant's audio/video is actually
 * consumed, so the backend's headless-Chromium recorder (ui-recorder-launcher.js)
 * knows when to start its ffmpeg capture instead of recording a blank/loading
 * screen. If the recorder is alone in the room, this never fires — the
 * backend's own ready-flag timeout (RECORDING_UI_READY_TIMEOUT_MS) covers that
 * case by starting the capture anyway after its deadline.
 */
function RecordingReadySignal() {
  const { isInRoom, remoteStreams } = useVideoCallState();
  const signaledRef = useRef(false);
  const hasRemoteMedia = Boolean(remoteStreams?.size);

  useEffect(() => {
    if (!isInRoom || !hasRemoteMedia || signaledRef.current) return;
    signaledRef.current = true;
    window.__DERPS_RECORDING_READY = true;
    document.documentElement.dataset.recordingReady = "true";
  }, [isInRoom, hasRemoteMedia]);

  return null;
}

const GuestCallEntry = () => {
  const [searchParams] = useSearchParams();
  const isRecorderSession = searchParams.get("recorder") === "1";
  const recorderToken = searchParams.get("recorderToken");
  const [recorderTokenReady, setRecorderTokenReady] = useState(false);
  const [guestTokenReady, setGuestTokenReady] = useState(
    Boolean(readGuestToken()),
  );

  const meeting = useMemo(() => searchParams.get("meeting"), [searchParams]);
  const isLoggedIn = Boolean(readAccessToken());

  // Recorder sessions authenticate with a server-minted, room-bound token (see
  // DERPSBackend's video-recorder-token.js) instead of the interactive
  // GuestJoinScreen flow — no display name, joins recv-only/muted/hidden.
  useEffect(() => {
    if (!isRecorderSession || !recorderToken) return;
    localStorage.setItem(GUEST_TOKEN_KEY, recorderToken);
    localStorage.setItem(
      GUEST_INFO_KEY,
      JSON.stringify({ guestId: `recorder-${meeting || "unknown"}`, displayName: "Recorder" }),
    );
    // Same-tab localStorage changes don't fire the native 'storage' event.
    // This lets SocketProvider react immediately and connect with the token.
    // Deferred to a macrotask: SocketProvider is an ANCESTOR of this component,
    // so on mount its effect (which attaches this listener) runs AFTER this
    // one (React fires effects bottom-up) — dispatching synchronously here
    // would fire before anyone is listening and get lost permanently.
    setTimeout(() => window.dispatchEvent(new Event("guest-token-changed")), 0);
    setRecorderTokenReady(true);
  }, [isRecorderSession, recorderToken, meeting]);

  if (isRecorderSession) {
    if (!meeting) {
      return <Call exitPath='/' />;
    }
    if (!recorderToken || !recorderTokenReady) {
      // Brief tick while the token above commits to localStorage.
      return null;
    }
    return (
      <>
        <Call exitPath='/' recvOnly />
        <RecordingReadySignal />
      </>
    );
  }

  // Logged-in users should just use the normal call behavior.
  if (isLoggedIn) {
    return <Call exitPath='/home/chat/' />;
  }

  if (!meeting) {
    // Let Call show its "No meeting room specified" screen (and we route exit to /).
    return (
      <Call
        exitPath='/'
        onExit={() => {
          localStorage.removeItem(GUEST_TOKEN_KEY);
          localStorage.removeItem(GUEST_INFO_KEY);
        }}
      />
    );
  }

  if (!guestTokenReady) {
    return (
      <ChatThemeRoot className="h-screen">
      <GuestJoinScreen
        onGuestToken={({ token, guestId, displayName }) => {
          localStorage.setItem(GUEST_TOKEN_KEY, token);
          localStorage.setItem(
            GUEST_INFO_KEY,
            JSON.stringify({ guestId, displayName }),
          );
          // Same-tab localStorage changes don't fire the native 'storage' event.
          // This lets SocketProvider react immediately and connect as guest.
          window.dispatchEvent(new Event("guest-token-changed"));
          setGuestTokenReady(true);
        }}
      />
      </ChatThemeRoot>
    );
  }

  return (
    <>
      <main>
        <Call
          exitPath='/'
          onExit={() => {
            localStorage.removeItem(GUEST_TOKEN_KEY);
            localStorage.removeItem(GUEST_INFO_KEY);
            window.dispatchEvent(new Event("guest-token-changed"));
          }}
        />
      </main>
    </>
  );
};

export default GuestCallEntry;
