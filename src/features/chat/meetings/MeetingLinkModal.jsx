import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@utils/errorHandler';
import { CloseIcon, LinkIcon } from '../shared/icons';

const MeetingLinkModal = ({ open, onClose, meetingLink }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(meetingLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to copy link'));
            const textArea = document.createElement('textarea');
            textArea.value = meetingLink;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                toast.error(getErrorMessage(err, 'Fallback copy failed'));
            }
            document.body.removeChild(textArea);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            style={{ zIndex: 99999 }}
        >
            <div className="chat-surface rounded-lg w-full max-w-md p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4 gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold chat-text pr-2">
                        Here&apos;s the link to your meeting
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 chat-hover rounded-full flex-shrink-0"
                        aria-label="Close"
                    >
                        <CloseIcon className="w-5 h-5 chat-text" />
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                    <div className="flex-1 flex items-center gap-2 chat-control px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg min-w-0">
                        <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 chat-text-muted flex-shrink-0" />
                        <span className="flex-1 chat-text font-mono text-xs sm:text-sm truncate">
                            {meetingLink}
                        </span>
                    </div>
                    <button
                        onClick={handleCopyLink}
                        className={`px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                            copied
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                        {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>
        </div>
    );
};

MeetingLinkModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    meetingLink: PropTypes.string,
};

export default MeetingLinkModal;
