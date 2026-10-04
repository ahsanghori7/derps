import PropTypes from 'prop-types';
import { BackIcon, CloseIcon } from '../icons';

const MAX_WIDTH_MAP = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
};

/**
 * Generic centered modal shell shared by all chat modals (NewGroup, DirectChat,
 * GroupInfo, StartMeeting, MeetingLink). Renders the overlay, panel, header
 * (with optional back button + close X) and optional footer slot.
 */
const ChatModalShell = ({
    open,
    title,
    onClose,
    onBack,
    maxWidth = 'md',
    maxHeight = '75vh',
    showCloseButton = true,
    headerExtras,
    footer,
    panelClassName = '',
    children,
}) => {
    if (!open) return null;

    const widthClass = MAX_WIDTH_MAP[maxWidth] || MAX_WIDTH_MAP.md;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            style={{ zIndex: 99999 }}
        >
            <div
                className={`chat-surface rounded-lg w-full ${widthClass} flex flex-col ${panelClassName}`}
                style={{ margin: '0 10px', maxHeight }}
            >
                <div className="p-4 chat-divider-b flex items-center">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="mr-3 p-2 chat-hover rounded-full"
                            aria-label="Back"
                        >
                            <BackIcon className="w-5 h-5 chat-text" />
                        </button>
                    )}
                    {title && (
                        <h2 className="text-xl font-semibold chat-text">
                            {title}
                        </h2>
                    )}
                    {headerExtras}
                    {showCloseButton && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="ml-auto p-2 chat-hover rounded-full"
                            aria-label="Close"
                        >
                            <CloseIcon className="w-5 h-5 chat-text" />
                        </button>
                    )}
                </div>

                {children}

                {footer && (
                    <div className="p-4 chat-divider-t flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

ChatModalShell.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.node,
    onClose: PropTypes.func,
    onBack: PropTypes.func,
    maxWidth: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl']),
    maxHeight: PropTypes.string,
    showCloseButton: PropTypes.bool,
    headerExtras: PropTypes.node,
    footer: PropTypes.node,
    panelClassName: PropTypes.string,
    children: PropTypes.node,
};

export default ChatModalShell;
