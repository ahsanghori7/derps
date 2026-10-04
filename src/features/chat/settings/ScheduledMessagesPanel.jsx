import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import {
    getScheduledMessages,
    updateScheduledMessage,
    deleteScheduledMessage,
} from '../api/chatApi';
import { getErrorMessage } from '@utils/errorHandler';
import { EmptyState } from '../shared/components';
import { ClockIcon, EditIcon, TrashIcon } from '../shared/icons';
import { formatScheduledTime } from '../shared/utils/chatUtility';
import Loader from '@components/Loader';
import ScheduleSendModal from './ScheduleSendModal';
import '../shared/theme/ChatWindow.css';

const normalizeScheduledList = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.messages)) return res.data.messages;
    if (Array.isArray(res?.data?.scheduledMessages)) return res.data.scheduledMessages;
    if (Array.isArray(res?.messages)) return res.messages;
    if (Array.isArray(res?.scheduledMessages)) return res.scheduledMessages;
    if (Array.isArray(res)) return res;
    return [];
};

const getMessagePreview = (message) => {
    if (!message) return 'Scheduled message';
    if (message.type === 'audio') return 'Voice message';
    if (message.type === 'file' || message.type === 'image') {
        return message.content || message.attachments?.[0]?.originalName || 'File attachment';
    }
    const text = String(message.content || '').trim();
    return text || 'Scheduled message';
};

const canEditContent = (message) => !message?.type || message.type === 'text';

const ScheduledMessagesPanel = ({ chatId, token, refreshKey = 0 }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const loadMessages = useCallback(async () => {
        if (!token || !chatId) return;
        setLoading(true);
        try {
            const res = await getScheduledMessages(token, chatId);
            setMessages(normalizeScheduledList(res));
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not load scheduled messages'));
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, [token, chatId]);

    useEffect(() => {
        setEditingMessage(null);
        loadMessages();
    }, [loadMessages, refreshKey]);

    const handleDelete = async (message) => {
        const id = message?.id;
        if (!token || !chatId || !id) return;
        const ok = window.confirm('Cancel this scheduled message?');
        if (!ok) return;

        setDeletingId(id);
        try {
            await deleteScheduledMessage(token, chatId, id);
            setMessages((prev) => prev.filter((m) => String(m.id) !== String(id)));
            toast.success('Scheduled message cancelled');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to cancel scheduled message'));
        } finally {
            setDeletingId(null);
        }
    };

    const handleUpdate = async (scheduledAt, { content } = {}) => {
        if (!token || !chatId || !editingMessage?.id) return;
        try {
            const payload = { scheduledAt };
            if (content !== undefined) payload.content = content;
            const res = await updateScheduledMessage(
                token,
                chatId,
                editingMessage.id,
                payload,
            );
            const updated = res?.data ?? {
                ...editingMessage,
                ...payload,
            };
            setMessages((prev) =>
                prev.map((m) =>
                    String(m.id) === String(editingMessage.id) ? { ...m, ...updated } : m,
                ),
            );
            toast.success(`Updated — will send ${formatScheduledTime(scheduledAt)}`);
            setEditingMessage(null);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update scheduled message'));
            throw err;
        }
    };

    return (
        <>
            <div className="chat-scroll flex-1 overflow-y-auto p-4 chat-chrome-alt">
                {loading ? (
                    <div className="py-6">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : messages.length === 0 ? (
                    <EmptyState className="py-12">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                            <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-base chat-text">No scheduled messages</p>
                        <p className="text-sm mt-1 max-w-sm mx-auto">
                            Use the clock icon next to Send to schedule a message for later.
                        </p>
                    </EmptyState>
                ) : (
                    <div>
                        <div className="mb-4">
                            <h3 className="font-semibold chat-text">
                                Upcoming ({messages.length})
                            </h3>
                            <p className="text-sm chat-text-muted mt-1">
                                These messages will send automatically at the chosen time.
                            </p>
                        </div>
                        <ul className="space-y-2">
                            {messages.map((message) => {
                                const preview = getMessagePreview(message);
                                const isDeleting = String(deletingId) === String(message.id);
                                return (
                                    <li
                                        key={message.id}
                                        className="flex items-start justify-between gap-3 p-3 chat-surface chat-hover rounded-lg"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="mt-0.5 p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
                                                <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium chat-text whitespace-pre-wrap break-words">
                                                    {preview}
                                                </p>
                                                <p className="mt-1.5 text-xs chat-text-muted flex items-center gap-1.5">
                                                    <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span>
                                                        {formatScheduledTime(
                                                            message.scheduledAt || message.sendAt,
                                                        ) || 'Unknown time'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditingMessage(message)}
                                                className="p-2 rounded-full chat-hover chat-text-secondary"
                                                title="Edit"
                                                aria-label="Edit scheduled message"
                                                disabled={isDeleting}
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(message)}
                                                className="p-2 rounded-full chat-hover text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                title="Cancel"
                                                aria-label="Cancel scheduled message"
                                                disabled={isDeleting}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

            <ScheduleSendModal
                open={Boolean(editingMessage)}
                onClose={() => setEditingMessage(null)}
                onSchedule={handleUpdate}
                mode="edit"
                initialDatetime={editingMessage?.scheduledAt || editingMessage?.sendAt}
                editableContent={
                    canEditContent(editingMessage)
                        ? String(editingMessage?.content || '')
                        : undefined
                }
                previewLabel={
                    canEditContent(editingMessage)
                        ? undefined
                        : getMessagePreview(editingMessage)
                }
            />
        </>
    );
};

ScheduledMessagesPanel.propTypes = {
    chatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    token: PropTypes.string,
    refreshKey: PropTypes.number,
};

export default ScheduledMessagesPanel;
