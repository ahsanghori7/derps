import PropTypes from 'prop-types';

/**
 * Shared inline SVG icons used across chat surfaces. Centralizing them keeps
 * stroke/path math out of the consumers and means a single visual update is
 * needed if the iconography ever changes.
 */

const Svg = ({
    className = 'w-5 h-5',
    children,
    viewBox = '0 0 24 24',
    fill = 'none',
    stroke = 'currentColor',
    strokeWidth = 2,
    ariaHidden = true,
}) => (
    <svg
        className={className}
        viewBox={viewBox}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={ariaHidden ? 'true' : undefined}
    >
        {children}
    </svg>
);
Svg.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    viewBox: PropTypes.string,
    fill: PropTypes.string,
    stroke: PropTypes.string,
    strokeWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ariaHidden: PropTypes.bool,
};

const SvgFilled = ({
    className = 'w-5 h-5',
    children,
    viewBox = '0 0 24 24',
    fill = 'currentColor',
    ariaHidden = true,
}) => (
    <svg
        className={className}
        viewBox={viewBox}
        fill={fill}
        aria-hidden={ariaHidden ? 'true' : undefined}
    >
        {children}
    </svg>
);
SvgFilled.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    viewBox: PropTypes.string,
    fill: PropTypes.string,
    ariaHidden: PropTypes.bool,
};

export const CloseIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M6 18L18 6M6 6l12 12" />
    </Svg>
);
CloseIcon.propTypes = { className: PropTypes.string };

export const BackIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M15 19l-7-7 7-7" />
    </Svg>
);
BackIcon.propTypes = { className: PropTypes.string };

export const PlusIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M12 4v16m8-8H4" />
    </Svg>
);
PlusIcon.propTypes = { className: PropTypes.string };

export const CheckIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M5 13l4 4L19 7" />
    </Svg>
);
CheckIcon.propTypes = { className: PropTypes.string };

export const TrashIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </Svg>
);
TrashIcon.propTypes = { className: PropTypes.string };

export const TrashOutlineIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m4 0H5" />
    </Svg>
);
TrashOutlineIcon.propTypes = { className: PropTypes.string };

export const LinkIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </Svg>
);
LinkIcon.propTypes = { className: PropTypes.string };

export const VideoIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </Svg>
);
VideoIcon.propTypes = { className: PropTypes.string };

export const PhoneIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </Svg>
);
PhoneIcon.propTypes = { className: PropTypes.string };

export const PhoneOffIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M3 3l18 18M10.68 9.316a1 1 0 01.05-1.14L9.23 3.684A1 1 0 008.28 3H6a2 2 0 00-2 2v1c0 1.657.348 3.234.974 4.663M8.5 13.83A11.06 11.06 0 0013.83 17.5m0 0l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1a10.94 10.94 0 01-5.517-1.5" />
    </Svg>
);
PhoneOffIcon.propTypes = { className: PropTypes.string };

export const GroupIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </Svg>
);
GroupIcon.propTypes = { className: PropTypes.string };

export const SearchIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </Svg>
);
SearchIcon.propTypes = { className: PropTypes.string };

export const MessageIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </Svg>
);
MessageIcon.propTypes = { className: PropTypes.string };

/* --- Format toolbar --- */

export const FormatCodeIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </Svg>
);
FormatCodeIcon.propTypes = { className: PropTypes.string };

export const NumberedListIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <path d="M4 6h1v4" />
        <path d="M4 10h2" />
        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </Svg>
);
NumberedListIcon.propTypes = { className: PropTypes.string };

export const BulletListIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <line x1="9" y1="6" x2="21" y2="6" />
        <line x1="9" y1="12" x2="21" y2="12" />
        <line x1="9" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
);
BulletListIcon.propTypes = { className: PropTypes.string };

/* --- Attachments & uploads --- */

export const FileDocumentIcon = ({ className = 'w-6 h-6' }) => (
    <Svg className={className}>
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </Svg>
);
FileDocumentIcon.propTypes = { className: PropTypes.string };

export const UploadCloudIcon = ({ className = 'w-12 h-12' }) => (
    <Svg className={className}>
        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </Svg>
);
UploadCloudIcon.propTypes = { className: PropTypes.string };

export const PaperclipIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </Svg>
);
PaperclipIcon.propTypes = { className: PropTypes.string };

/* --- Read receipts --- */

export const ReadCheckCircleIcon = ({ className = 'w-3 h-3' }) => (
    <SvgFilled className={className} viewBox="0 0 20 20">
        <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
        />
    </SvgFilled>
);
ReadCheckCircleIcon.propTypes = { className: PropTypes.string };

export const RecordIcon = ({ className = 'w-5 h-5' }) => (
    <SvgFilled className={className} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="6" />
    </SvgFilled>
);
RecordIcon.propTypes = { className: PropTypes.string };

export const UnreadClockIcon = ({ className = 'w-3 h-3' }) => (
    <SvgFilled className={className} viewBox="0 0 20 20">
        <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
        />
    </SvgFilled>
);
UnreadClockIcon.propTypes = { className: PropTypes.string };

export const ClockIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Svg>
);
ClockIcon.propTypes = { className: PropTypes.string };

export const CalendarIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M8 7V3m8 4V3M3.5 11h17M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </Svg>
);
CalendarIcon.propTypes = { className: PropTypes.string };

export const BoltIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className} fill="currentColor" stroke="none">
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </Svg>
);
BoltIcon.propTypes = { className: PropTypes.string };

export const SunriseIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M12 2v6" />
        <path d="M5.2 10l1.4 1.4" />
        <path d="M18.8 10l-1.4 1.4" />
        <path d="M3 18h18" />
        <path d="M8 18a4 4 0 018 0" />
    </Svg>
);
SunriseIcon.propTypes = { className: PropTypes.string };

export const ChevronDownIcon = ({ className = 'w-5 h-5' }) => (
    <Svg className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </Svg>
);
ChevronDownIcon.propTypes = { className: PropTypes.string };

/* --- Message context menu & header --- */

export const ReplyIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </Svg>
);
ReplyIcon.propTypes = { className: PropTypes.string };

export const CopyIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </Svg>
);
CopyIcon.propTypes = { className: PropTypes.string };

/** Mirror of ReplyIcon — curved tail + arrow pointing right (forward message). */
export const ForwardIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M21 10H11a8 8 0 00-8 8v2" />
        <path d="M21 10l-6 6m6-6l-6-6" />
    </Svg>
);
ForwardIcon.propTypes = { className: PropTypes.string };

/** Automated / auto-reply system message indicator. */
export const AutoReplyIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <Svg className={className}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M9 9h6M9 13h4" />
    </Svg>
);
AutoReplyIcon.propTypes = { className: PropTypes.string };

export const EditIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
);
EditIcon.propTypes = { className: PropTypes.string };

export const InfoCircleIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Svg>
);
InfoCircleIcon.propTypes = { className: PropTypes.string };

/* --- Composer --- */

export const EmojiIcon = ({ className }) => (
    <Svg className={className}>
        <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M12 22a10 10 0 110-20 10 10 0 010 20z" />
    </Svg>
);
EmojiIcon.propTypes = { className: PropTypes.string };

export const SendIcon = ({ className = 'w-5 h-5' }) => (
    <Svg className={className}>
        <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
    </Svg>
);
SendIcon.propTypes = { className: PropTypes.string };

export const MicrophoneIcon = ({ className = 'w-5 h-5' }) => (
    <SvgFilled className={className}>
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
    </SvgFilled>
);
MicrophoneIcon.propTypes = { className: PropTypes.string };

export const StopSquareIcon = ({ className = 'w-8 h-8' }) => (
    <SvgFilled className={className}>
        <rect x="8" y="8" width="8" height="8" rx="1.5" />
    </SvgFilled>
);
StopSquareIcon.propTypes = { className: PropTypes.string };

export const PlayFilledIcon = ({ className = 'w-5 h-5' }) => (
    <SvgFilled className={className}>
        <path d="M8 5v14l11-7z" />
    </SvgFilled>
);
PlayFilledIcon.propTypes = { className: PropTypes.string };

export const PauseFilledIcon = ({ className = 'w-5 h-5' }) => (
    <SvgFilled className={className}>
        <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </SvgFilled>
);
PauseFilledIcon.propTypes = { className: PropTypes.string };

/* --- Video call --- */

export const DesktopDeviceIcon = ({ className = 'w-full h-full' }) => (
    <SvgFilled className={className}>
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
    </SvgFilled>
);
DesktopDeviceIcon.propTypes = { className: PropTypes.string };

export const MobileDeviceIcon = ({ className = 'w-full h-full' }) => (
    <SvgFilled className={className}>
        <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
    </SvgFilled>
);
MobileDeviceIcon.propTypes = { className: PropTypes.string };

export const TabletDeviceIcon = ({ className = 'w-full h-full' }) => (
    <SvgFilled className={className}>
        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 16H6V4h12v14zm-5-1.5c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1z" />
    </SvgFilled>
);
TabletDeviceIcon.propTypes = { className: PropTypes.string };

/** Renders desktop, mobile, or tablet icon (top-right of video tile). */
export function DeviceIcon({ deviceType, className = 'w-8 h-8' }) {
    const type = deviceType || 'desktop';
    const title = type === 'desktop' ? 'Desktop' : type === 'mobile' ? 'Mobile' : 'Tablet';
    const Icon = type === 'mobile' ? MobileDeviceIcon : type === 'tablet' ? TabletDeviceIcon : DesktopDeviceIcon;

    return (
        <div className={`flex items-center justify-center rounded bg-black/60 text-white p-1 ${className}`} title={title}>
            <Icon />
        </div>
    );
}
DeviceIcon.propTypes = {
    deviceType: PropTypes.oneOf(['desktop', 'mobile', 'tablet']),
    className: PropTypes.string,
};

/** Google Material Symbols `front_hand` — same icon Google Meet uses for Raise hand */
const MEET_FRONT_HAND_PATH = 'M480-480v-400q0-17 11.5-28.5T520-920q17 0 28.5 11.5T560-880v400h-80Zm-160 0v-360q0-17 11.5-28.5T360-880q17 0 28.5 11.5T400-840v360h-80ZM500-40q-142 0-241-99t-99-241v-380q0-17 11.5-28.5T200-800q17 0 28.5 11.5T240-760v380q0 109 75.5 184.5T500-120q109 0 184.5-75.5T760-380v-140q-17 0-28.5 11.5T720-480v160H600q-33 0-56.5 23.5T520-240v40h-80v-40q0-66 47-113t113-47h40v-400q0-17 11.5-28.5T680-840q17 0 28.5 11.5T720-800v207q10-3 19.5-5t20.5-2h80v220q0 142-99 241T500-40Zm40-320Z';

export const RaisedHandIcon = ({ className = 'w-5 h-5' }) => (
    <SvgFilled className={className} viewBox="0 -960 960 960">
        <path d={MEET_FRONT_HAND_PATH} />
    </SvgFilled>
);
RaisedHandIcon.propTypes = { className: PropTypes.string };

export function HandRaisedBadge({ className = '' }) {
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full bg-[#FBBC04] text-white shadow-md ring-2 ring-white/50 ${className}`}
            title="Hand raised"
            aria-label="Hand raised"
        >
            <RaisedHandIcon className="w-[70%] h-[70%]" />
        </span>
    );
}
HandRaisedBadge.propTypes = { className: PropTypes.string };

export const VideoCamOnIcon = ({ className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    <SvgFilled className={className}>
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </SvgFilled>
);
VideoCamOnIcon.propTypes = { className: PropTypes.string };

export const VideoCamOffIcon = ({ className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    <SvgFilled className={className}>
        <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
    </SvgFilled>
);
VideoCamOffIcon.propTypes = { className: PropTypes.string };

export const MicOffIcon = ({ className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    <SvgFilled className={className}>
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
    </SvgFilled>
);
MicOffIcon.propTypes = { className: PropTypes.string };

export const VideoToggleIcon = ({ enabled, className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    enabled ? <VideoCamOnIcon className={className} /> : <VideoCamOffIcon className={className} />
);
VideoToggleIcon.propTypes = {
    enabled: PropTypes.bool,
    className: PropTypes.string,
};

export const MicToggleIcon = ({ enabled, className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    enabled ? <MicrophoneIcon className={className} /> : <MicOffIcon className={className} />
);
MicToggleIcon.propTypes = {
    enabled: PropTypes.bool,
    className: PropTypes.string,
};

export const SpeakerIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M11 5L6 9H3v6h3l5 4V5z" />
        <path d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a9 9 0 010 12.73" />
    </Svg>
);
SpeakerIcon.propTypes = { className: PropTypes.string };

export const SpeakerOffIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M11 5L6 9H3v6h3l5 4V5z" />
        <path d="M23 9l-6 6M17 9l6 6" />
    </Svg>
);
SpeakerOffIcon.propTypes = { className: PropTypes.string };

export const SpeakerToggleIcon = ({ enabled, className = 'w-4 h-4' }) => (
    enabled ? <SpeakerIcon className={className} /> : <SpeakerOffIcon className={className} />
);
SpeakerToggleIcon.propTypes = {
    enabled: PropTypes.bool,
    className: PropTypes.string,
};

export const ScreenShareIcon = ({ className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    <SvgFilled className={className}>
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
    </SvgFilled>
);
ScreenShareIcon.propTypes = { className: PropTypes.string };

export const FullscreenExpandIcon = ({ className = 'w-4 h-4 sm:w-5 sm:h-5' }) => (
    <Svg className={className}>
        <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </Svg>
);
FullscreenExpandIcon.propTypes = { className: PropTypes.string };

export const FullscreenCompressIcon = ({ className = 'w-4 h-4 sm:w-5 sm:h-5' }) => (
    <Svg className={className}>
        <path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
    </Svg>
);
FullscreenCompressIcon.propTypes = { className: PropTypes.string };

export const MoreVerticalIcon = ({ className = 'w-5 h-5 sm:w-6 sm:h-6 block' }) => (
    <SvgFilled className={className}>
        <path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 2a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4z" />
    </SvgFilled>
);
MoreVerticalIcon.propTypes = { className: PropTypes.string };

export const BackgroundEffectsIcon = ({ className = 'w-5 h-5 chat-text-secondary flex-shrink-0' }) => (
    <SvgFilled className={className}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
        <path d="M7 17l3-4 2 3 3-4 2 5H7z" />
    </SvgFilled>
);
BackgroundEffectsIcon.propTypes = { className: PropTypes.string };

export const FullscreenLayoutIcon = ({ className = 'w-5 h-5 chat-text-secondary flex-shrink-0' }) => (
    <SvgFilled className={className}>
        <path d="M7 14H5v5h5v-2H7v-3zm12 3h-3v2h5v-5h-2v3zM7 7h3V5H5v5h2V7zm12 3h2V5h-5v2h3v3z" />
    </SvgFilled>
);
FullscreenLayoutIcon.propTypes = { className: PropTypes.string };

export const CloseFilledIcon = ({ className = 'w-5 h-5' }) => (
    <SvgFilled className={className}>
        <path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7a1 1 0 10-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 101.41 1.42L12 13.41l4.89 4.9a1 1 0 001.42-1.41L13.41 12l4.9-4.89a1 1 0 000-1.4z" />
    </SvgFilled>
);
CloseFilledIcon.propTypes = { className: PropTypes.string };

export const LeaveCallIcon = ({ className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    <SvgFilled className={className}>
        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 01-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
    </SvgFilled>
);
LeaveCallIcon.propTypes = { className: PropTypes.string };

export const RefreshIcon = ({ className = 'w-5 h-5' }) => (
    <Svg className={className}>
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </Svg>
);
RefreshIcon.propTypes = { className: PropTypes.string };

export const SettingsIcon = ({ className = 'w-5 h-5' }) => (
    <Svg className={className}>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </Svg>
);
SettingsIcon.propTypes = { className: PropTypes.string };

export const BellOffIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className} strokeWidth={1.5}>
        <path d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 003.536-1.003A8.967 8.967 0 0118 9.75V9A6 6 0 006.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53" />
    </Svg>
);
BellOffIcon.propTypes = { className: PropTypes.string };

/** Reddish "this chat is muted" indicator — same glyph as BellOffIcon, color baked in so every usage stays consistent. */
export const MutedIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <BellOffIcon className={`${className} text-red-500 dark:text-red-400`} />
);
MutedIcon.propTypes = { className: PropTypes.string };

export const BellIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className} strokeWidth={1.5}>
        <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </Svg>
);
BellIcon.propTypes = { className: PropTypes.string };

export const LeaveGroupIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className} strokeWidth={1.5}>
        <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </Svg>
);
LeaveGroupIcon.propTypes = { className: PropTypes.string };

/* --- Pre-join & user details --- */

export const WarningTriangleIcon = ({ className = 'w-5 h-5 sm:w-6 sm:h-6' }) => (
    <Svg className={className}>
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </Svg>
);
WarningTriangleIcon.propTypes = { className: PropTypes.string };

export const UserIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </Svg>
);
UserIcon.propTypes = { className: PropTypes.string };

export const MailIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </Svg>
);
MailIcon.propTypes = { className: PropTypes.string };

export const BriefcaseIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </Svg>
);
BriefcaseIcon.propTypes = { className: PropTypes.string };

export const CrownIcon = ({ className = 'w-4 h-4' }) => (
    <Svg className={className}>
        <path d="M5 16h14M5 16l-1.5-8.5L9 10l3-4 3 4 5.5-2.5L19 16M5 16v1a1 1 0 001 1h12a1 1 0 001-1v-1" />
    </Svg>
);
CrownIcon.propTypes = { className: PropTypes.string };
