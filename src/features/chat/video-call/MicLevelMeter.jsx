import PropTypes from 'prop-types';
import { MicrophoneIcon } from '../shared/icons';

const MicLevelMeter = ({
    micLabel = 'Microphone',
    micLevel = 0,
    micInputDetected = false,
}) => (
    <div className="w-full max-w-full mb-4 sm:mb-6 px-4">
        <div className="chat-surface rounded-lg p-3 sm:p-4 chat-prejoin-device-panel">
            <div className="flex items-center gap-2 mb-3">
                <MicrophoneIcon className="w-4 h-4 sm:w-5 sm:h-5 chat-text-muted flex-shrink-0" />
                <span className="text-sm chat-text-secondary truncate" title={micLabel}>
                    {micLabel || 'Microphone'}
                </span>
            </div>
            <div
                className="h-2 chat-control rounded-full overflow-hidden mb-2"
                role="meter"
                aria-valuenow={Math.round(micLevel)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Microphone input level"
            >
                <div
                    className={`h-full rounded-full transition-[width] duration-75 ${
                        micInputDetected ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${micLevel}%` }}
                />
            </div>
            <p className={`text-xs sm:text-sm ${micInputDetected ? 'text-green-400' : 'chat-text-muted'}`}>
                {micInputDetected
                    ? 'Microphone is working'
                    : 'Speak to test your microphone'}
            </p>
        </div>
    </div>
);

MicLevelMeter.propTypes = {
    micLabel: PropTypes.string,
    micLevel: PropTypes.number,
    micInputDetected: PropTypes.bool,
};

export default MicLevelMeter;
