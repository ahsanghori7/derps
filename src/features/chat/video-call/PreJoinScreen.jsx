import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@utils/errorHandler';
import { DEVICE_STATUS, resolveMediaConstraints, stopMediaStream } from '../shared/utils/mediaDevices';
import { useLocalMediaDeviceStatus } from '../shared/hooks';
import MediaDeviceAlerts from './MediaDeviceAlerts';
import MicLevelMeter from './MicLevelMeter';
import { MicToggleIcon, VideoCamOffIcon, VideoToggleIcon } from '../shared/icons';
import '../shared/theme/ChatWindow.css';

const PreJoinScreen = ({ onJoin, onCancel, withVideo = true, withAudio = true }) => {
    const [videoEnabled, setVideoEnabled] = useState(withVideo);
    const [audioEnabled, setAudioEnabled] = useState(withAudio);
    const [localStream, setLocalStream] = useState(null);
    const [isJoining, setIsJoining] = useState(false);
    const videoRef = useRef(null);
    const localStreamRef = useRef(null);
    const isMountedRef = useRef(true);

    const {
        micStatus,
        cameraStatus,
        permissionError,
        micLabel,
        micLevel,
        micInputDetected,
        reportMediaError,
        refreshEnumeratedDevices,
        clearMicInputDetected,
        clearMediaErrors,
    } = useLocalMediaDeviceStatus({
        stream: localStream,
        audioEnabled,
        videoEnabled,
        enableMicLevel: true,
    });

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const getMedia = async () => {
            const { finalAudioEnabled, finalVideoEnabled, constraints } = resolveMediaConstraints(
                audioEnabled,
                videoEnabled
            );

            stopMediaStream(localStreamRef.current);
            localStreamRef.current = null;
            setLocalStream(null);

            if (audioEnabled) {
                clearMicInputDetected();
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (!isMountedRef.current) {
                    stopMediaStream(stream);
                    return;
                }

                clearMediaErrors();

                if (!audioEnabled && stream.getAudioTracks().length > 0) {
                    stream.getAudioTracks().forEach((track) => {
                        track.enabled = false;
                    });
                }
                if (!videoEnabled && stream.getVideoTracks().length > 0) {
                    stream.getVideoTracks().forEach((track) => {
                        track.enabled = false;
                    });
                }

                localStreamRef.current = stream;
                setLocalStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                refreshEnumeratedDevices();
            } catch (error) {
                if (!isMountedRef.current) return;

                const mapped = reportMediaError(error, {
                    wantsAudio: finalAudioEnabled && audioEnabled,
                    wantsVideo: finalVideoEnabled,
                });
                toast.error(getErrorMessage(error, mapped.userMessage));
            }
        };

        getMedia();

        return () => {
            stopMediaStream(localStreamRef.current);
            localStreamRef.current = null;
        };
    }, [videoEnabled, audioEnabled, refreshEnumeratedDevices, reportMediaError, clearMicInputDetected, clearMediaErrors]);

    const handleToggleVideo = () => {
        setVideoEnabled(!videoEnabled);
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoEnabled;
            }
        }
    };

    const handleToggleAudio = () => {
        const nextAudioEnabled = !audioEnabled;
        setAudioEnabled(nextAudioEnabled);
        if (!nextAudioEnabled) {
            clearMicInputDetected();
        }
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = nextAudioEnabled;
            }
        }
    };

    const handleJoin = async () => {
        if (isJoining) return;
        setIsJoining(true);
        try {
            stopMediaStream(localStreamRef.current);
            localStreamRef.current = null;
            if (onJoin) {
                await onJoin({ videoEnabled, audioEnabled });
            } else {
                toast.error('Failed to join the meeting');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to join the meeting'));
        } finally {
            if (isMountedRef.current) {
                setIsJoining(false);
            }
        }
    };

    const handleCancel = () => {
        stopMediaStream(localStreamRef.current);
        localStreamRef.current = null;
        if (onCancel) {
            onCancel();
        } else {
            toast.error('Failed to cancel the meeting');
        }
    };

    const showMicTest = audioEnabled && micStatus === DEVICE_STATUS.READY;

    return (
        <div className="chat-scroll fixed chat-fullscreen flex items-center justify-center py-2 sm:py-3 z-50 overflow-auto" style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}>
            <div className="w-full max-w-4xl mx-2 sm:mx-4 flex flex-col items-center justify-center py-4 sm:py-0" style={{ maxHeight: '100%' }}>
                <div className="text-center mb-2 sm:mb-3 px-2">
                    <h2 className="text-xl sm:text-2xl font-semibold chat-text mb-1 sm:mb-2">Ready to join?</h2>
                    <p className="text-sm sm:text-base chat-text-muted">Check your camera and microphone before joining</p>
                </div>

                <MediaDeviceAlerts
                    permissionError={permissionError}
                    micStatus={micStatus}
                    cameraStatus={cameraStatus}
                    audioEnabled={audioEnabled}
                    videoEnabled={videoEnabled}
                    variant="prejoin"
                />

                <div className="relative bg-black rounded-lg overflow-hidden mb-4 sm:mb-6 w-full max-w-full chat-prejoin-device-panel" style={{ aspectRatio: '16/9' }}>
                    {videoEnabled ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center chat-video-tile">
                            <div className="text-center">
                                <VideoCamOffIcon className="w-12 h-12 sm:w-16 sm:h-16 chat-text-muted mx-auto mb-2 sm:mb-4" />
                                <p className="text-sm sm:text-base chat-text-muted">Camera is off</p>
                            </div>
                        </div>
                    )}
                </div>

                {showMicTest && (
                    <MicLevelMeter
                        micLabel={micLabel}
                        micLevel={micLevel}
                        micInputDetected={micInputDetected}
                    />
                )}

                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <button
                        type="button"
                        onClick={handleToggleVideo}
                        disabled={isJoining}
                        className={`p-3 sm:p-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            videoEnabled ? 'chat-prejoin-media-on' : 'chat-prejoin-media-off'
                        }`}
                    >
                        <VideoToggleIcon enabled={videoEnabled} />
                    </button>

                    <button
                        type="button"
                        onClick={handleToggleAudio}
                        disabled={isJoining}
                        className={`p-3 sm:p-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            audioEnabled ? 'chat-prejoin-media-on' : 'chat-prejoin-media-off'
                        }`}
                    >
                        <MicToggleIcon enabled={audioEnabled} />
                    </button>
                </div>

                <div className="flex items-center justify-center gap-3 sm:gap-4 w-full px-4 sm:px-0">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isJoining}
                        className="flex-1 sm:flex-none px-4 py-2.5 sm:px-6 sm:py-3 chat-prejoin-cancel rounded-lg font-semibold transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleJoin}
                        disabled={isJoining}
                        aria-busy={isJoining}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 chat-prejoin-join rounded-lg font-semibold transition-colors text-sm sm:text-base"
                    >
                        {isJoining ? (
                            <>
                                <span
                                    className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                                    aria-hidden
                                />
                                <span>Joining…</span>
                            </>
                        ) : (
                            'Join Meeting'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

PreJoinScreen.propTypes = {
    onJoin: PropTypes.func,
    onCancel: PropTypes.func,
    withVideo: PropTypes.bool,
    withAudio: PropTypes.bool,
};

export default PreJoinScreen;
