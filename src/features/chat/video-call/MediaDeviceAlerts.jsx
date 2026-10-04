import PropTypes from 'prop-types';
import { DEVICE_STATUS } from '../shared/utils/mediaDevices';
import { WarningTriangleIcon } from '../shared/icons';

const alertShell = (variant, tone) => {
    const isPrejoin = variant === 'prejoin';
    const tones = {
        yellow: isPrejoin
            ? 'bg-yellow-900/50 border-yellow-600 text-yellow-200'
            : 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100',
        red: isPrejoin
            ? 'bg-red-900/50 border-red-600 text-red-200'
            : 'bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-600 text-red-900 dark:text-red-100',
    };
    const iconTones = {
        yellow: isPrejoin ? 'text-yellow-400' : 'text-amber-600 dark:text-amber-400',
        red: isPrejoin ? 'text-red-400' : 'text-red-600 dark:text-red-400',
    };
    const subTones = {
        yellow: isPrejoin ? 'text-yellow-300' : 'text-amber-800 dark:text-amber-200',
        red: isPrejoin ? 'text-red-300' : 'text-red-800 dark:text-red-200',
    };
    return {
        box: `border rounded-lg p-3 sm:p-4 ${tones[tone]}`,
        icon: iconTones[tone],
        sub: `text-xs sm:text-sm ${subTones[tone]}`,
        title: 'text-sm sm:text-base font-medium mb-1',
    };
};

const DeviceAlert = ({ variant, tone, title, message }) => {
    const styles = alertShell(variant, tone);
    return (
        <div className={styles.box}>
            <div className="flex items-start gap-2 sm:gap-3">
                <WarningTriangleIcon className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 ${styles.icon}`} />
                <div className="flex-1">
                    <p className={styles.title}>{title}</p>
                    <p className={styles.sub}>{message}</p>
                </div>
            </div>
        </div>
    );
};

DeviceAlert.propTypes = {
    variant: PropTypes.oneOf(['prejoin', 'incall']).isRequired,
    tone: PropTypes.oneOf(['yellow', 'red']).isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
};

const MediaDeviceAlerts = ({
    permissionError = null,
    micStatus = DEVICE_STATUS.UNKNOWN,
    cameraStatus = DEVICE_STATUS.UNKNOWN,
    audioEnabled = false,
    videoEnabled = false,
    variant = 'prejoin',
    className = '',
}) => {
    const wrapperClass = variant === 'prejoin'
        ? `w-full max-w-full mb-4 sm:mb-6 px-4 ${className}`.trim()
        : `px-4 py-2 ${className}`.trim();

    const micPermissionDenied = permissionError?.includes('microphone') || micStatus === DEVICE_STATUS.DENIED;
    const cameraPermissionDenied = permissionError?.includes('camera') || cameraStatus === DEVICE_STATUS.DENIED;

    const showMicPermission = audioEnabled && micPermissionDenied;
    const showCameraPermission = videoEnabled && cameraPermissionDenied;
    const showPermission = showMicPermission || showCameraPermission;

    const micPermissionLabel = permissionError?.includes('microphone')
        ? 'microphone'
        : (showMicPermission ? 'microphone' : null);
    const cameraPermissionLabel = permissionError?.includes('camera')
        ? 'camera'
        : (showCameraPermission ? 'camera' : null);

    const showNoMic = audioEnabled && micStatus === DEVICE_STATUS.NONE && !showMicPermission;
    const showMicUnavailable = audioEnabled && (
        micStatus === DEVICE_STATUS.UNAVAILABLE || micStatus === DEVICE_STATUS.DISCONNECTED
    );
    const showNoCamera = videoEnabled && cameraStatus === DEVICE_STATUS.NONE && !showCameraPermission;
    const showCameraUnavailable = videoEnabled && (
        cameraStatus === DEVICE_STATUS.UNAVAILABLE || cameraStatus === DEVICE_STATUS.DISCONNECTED
    );

    const hasAlerts = showPermission || showNoMic || showMicUnavailable || showNoCamera || showCameraUnavailable;
    if (!hasAlerts) return null;

    const micDisconnected = micStatus === DEVICE_STATUS.DISCONNECTED;
    const cameraDisconnected = cameraStatus === DEVICE_STATUS.DISCONNECTED;

    return (
        <div className={wrapperClass}>
            <div className={variant === 'incall' ? 'flex flex-col gap-2' : 'flex flex-col gap-4 sm:gap-6'}>
                {showMicPermission && (
                    <DeviceAlert
                        variant={variant}
                        tone="yellow"
                        title="Microphone Permission Required"
                        message={`Please allow access to your ${micPermissionLabel || 'microphone'} to use it in the meeting. Check your browser settings and grant the necessary permissions.`}
                    />
                )}
                {showCameraPermission && (
                    <DeviceAlert
                        variant={variant}
                        tone="yellow"
                        title="Camera Permission Required"
                        message={`Please allow access to your ${cameraPermissionLabel || 'camera'} to use it in the meeting. Check your browser settings and grant the necessary permissions.`}
                    />
                )}
                {showNoMic && (
                    <DeviceAlert
                        variant={variant}
                        tone="red"
                        title="No Microphone Detected"
                        message="No microphone was found on this device. Connect a microphone or turn off your mic to continue muted."
                    />
                )}
                {showMicUnavailable && (
                    <DeviceAlert
                        variant={variant}
                        tone="yellow"
                        title={micDisconnected ? 'Microphone Disconnected' : 'Microphone Unavailable'}
                        message={micDisconnected
                            ? 'Your microphone was disconnected. Plug it back in or turn off your mic to continue muted.'
                            : 'Your microphone could not be accessed. It may be in use by another app or disconnected.'}
                    />
                )}
                {showNoCamera && (
                    <DeviceAlert
                        variant={variant}
                        tone="red"
                        title="No Camera Detected"
                        message="No camera was found on this device. Connect a camera or turn off your video to continue without camera."
                    />
                )}
                {showCameraUnavailable && (
                    <DeviceAlert
                        variant={variant}
                        tone="yellow"
                        title={cameraDisconnected ? 'Camera Disconnected' : 'Camera Unavailable'}
                        message={cameraDisconnected
                            ? 'Your camera was disconnected. Plug it back in or turn off your video to continue without camera.'
                            : 'Your camera could not be accessed. It may be in use by another app or disconnected.'}
                    />
                )}
            </div>
        </div>
    );
};

MediaDeviceAlerts.propTypes = {
    permissionError: PropTypes.string,
    micStatus: PropTypes.string,
    cameraStatus: PropTypes.string,
    audioEnabled: PropTypes.bool,
    videoEnabled: PropTypes.bool,
    variant: PropTypes.oneOf(['prejoin', 'incall']),
    className: PropTypes.string,
};

export default MediaDeviceAlerts;
