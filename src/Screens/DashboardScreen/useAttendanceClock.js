import { useEffect, useRef, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

function parseTimeToSeconds(timeStr) {
  const [hours, minutes, seconds] = String(timeStr || "0:0:0").split(":").map(Number);
  return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
}

function formatSecondsToTime(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function useAttendanceClock({ accessToken, userId, signinFlag }) {
  const [signInStatus, setSignInStatus] = useState(false);
  const [signInData, setSignInData] = useState({});
  const [liveDuration, setLiveDuration] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!accessToken || !userId) return undefined;
    let cancelled = false;
    getRequestWithOutBody(`${baseURl}attendance/check-signin-status/${userId}`, accessToken)
      .then((result) => {
        if (cancelled) return;
        setSignInStatus(!!result?.data?.isSignedIn);
        setSignInData(result?.data || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, userId, signinFlag]);

  useEffect(() => {
    if (signInData?.totalHours && signInStatus) {
      let currentSeconds = parseTimeToSeconds(signInData.totalHours);
      setLiveDuration(formatSecondsToTime(currentSeconds));
      intervalRef.current = setInterval(() => {
        currentSeconds += 1;
        setLiveDuration(formatSecondsToTime(currentSeconds));
      }, 1000);
    }

    if (!signInStatus) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setLiveDuration(signInData.totalHours || "00:00:00");
    }

    return () => clearInterval(intervalRef.current);
  }, [signInData?.totalHours, signInData?.sign_out_time, signInStatus]);

  return { signInData, liveDuration };
}
