import { useNavigate, useLocation } from 'react-router-dom';
import { useVideoCallState } from '@contexts/VideoCallContext';
import { isOnCallPage } from '../shared/utils/chatUtility';

const VideoCallBadge = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { activeCall } = useVideoCallState();

    // Don't show badge if we're already on the call screen
    if (!activeCall || isOnCallPage(location.pathname)) {
        return null;
    }

    const handleClick = () => {
        // Navigate to call with autoJoin=true and saved preferences
        const params = new URLSearchParams({
            meeting: activeCall.roomId,
            autoJoin: 'true',
            video: activeCall.withVideo.toString(),
            audio: activeCall.withAudio.toString()
        });
        navigate(`/join?${params.toString()}`);
    };

    return (
        <button
            onClick={handleClick}
            className="fixed top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-3 shadow-lg flex items-center gap-2 transition-all duration-200 animate-pulse"
            title="Video call in progress - Click to return"
            style={{ zIndex: 2000 }}
        >
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
            </svg>
            <span className="text-sm font-semibold hidden sm:inline">Call in progress</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </button>
    );
};

export default VideoCallBadge;
