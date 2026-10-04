import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { toast } from 'react-toastify';
import { getAutoReplySettings, updateAutoReplySettings } from '../api/chatApi';
import { getErrorMessage } from '@utils/errorHandler';
import { useAuthUser } from '@hooks/useAuthUser';
import { ChatModalShell, ToggleSwitch } from '../shared/components';
import { ClockIcon } from '../shared/icons';

const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = moment.utc(iso).local();
    if (!d.isValid()) return '';
    return d.format('YYYY-MM-DDTHH:mm');
};

const toIsoFromDatetimeLocal = (value) => {
    if (!value) return null;
    const d = moment(value);
    return d.isValid() ? d.toISOString() : null;
};

const defaultForm = () => ({
    enabled: false,
    message: '',
    startAt: '',
    endAt: '',
    sendOnlyDuringSchedule: true,
});

const AutoReplySettingsModal = ({ open, onClose, onSaved }) => {
    const { token } = useAuthUser();
    const [form, setForm] = useState(defaultForm);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !token) return;

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await getAutoReplySettings(token);
                const data = res?.data ?? res ?? {};
                if (cancelled) return;
                setForm({
                    enabled: Boolean(data.enabled),
                    message: data.message || '',
                    startAt: toDatetimeLocal(data.startAt),
                    endAt: toDatetimeLocal(data.endAt),
                    sendOnlyDuringSchedule: data.sendOnlyDuringSchedule !== false,
                });
            } catch (err) {
                if (!cancelled) {
                    toast.error(getErrorMessage(err, 'Could not load auto-reply settings'));
                    setForm(defaultForm());
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [open, token]);

    const handleSave = async () => {
        if (!token) return;

        const trimmedMessage = (form.message || '').trim();
        if (form.enabled && !trimmedMessage) {
            toast.error('Please enter an auto-reply message');
            return;
        }

        const startAt = toIsoFromDatetimeLocal(form.startAt);
        const endAt = toIsoFromDatetimeLocal(form.endAt);

        if (form.enabled && form.sendOnlyDuringSchedule) {
            if (!startAt || !endAt) {
                toast.error('Please set both start and end date & time');
                return;
            }
            if (moment(endAt).valueOf() <= moment(startAt).valueOf()) {
                toast.error('End time must be after start time');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                enabled: form.enabled,
                message: trimmedMessage,
                startAt: startAt || null,
                endAt: endAt || null,
                sendOnlyDuringSchedule: form.sendOnlyDuringSchedule,
            };
            await updateAutoReplySettings(token, payload);
            toast.success(form.enabled ? 'Auto-reply scheduled' : 'Auto-reply turned off');
            onSaved?.(payload);
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not save auto-reply settings'));
        } finally {
            setSaving(false);
        }
    };

    const minDatetime = moment().format('YYYY-MM-DDTHH:mm');

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 chat-text-secondary chat-hover rounded-lg transition-colors"
                disabled={saving}
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                {saving ? 'Saving…' : 'Save'}
            </button>
        </>
    );

    return (
        <ChatModalShell
            open={open}
            title="Schedule auto-replies"
            onClose={onClose}
            maxWidth="lg"
            maxHeight="85vh"
            footer={footer}
        >
            <div className="px-4 pb-4 chat-scroll overflow-y-auto flex-1">
                {loading ? (
                    <div className="py-8 text-center chat-text-muted">Loading…</div>
                ) : (
                    <div className="space-y-5">
                        <p className="text-sm chat-text-muted">
                            Automatically reply when someone messages you.
                        </p>

                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg chat-chrome-alt border chat-border">
                            <div>
                                <div className="font-medium chat-text">Automatic replies</div>
                                <div className="text-xs chat-text-muted mt-0.5">
                                    Send your message when you receive a chat
                                </div>
                            </div>
                            <ToggleSwitch
                                checked={form.enabled}
                                onChange={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                                ariaLabel="Automatic replies"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium chat-text mb-1.5" htmlFor="auto-reply-message">
                                Reply message
                            </label>
                            <textarea
                                id="auto-reply-message"
                                rows={4}
                                value={form.message}
                                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                                placeholder="I'm out of office until Friday."
                                className="w-full px-3 py-2 rounded-lg border chat-border chat-input-field chat-text text-sm resize-y min-h-[96px]"
                            />
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 accent-blue-500"
                                checked={form.sendOnlyDuringSchedule}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        sendOnlyDuringSchedule: e.target.checked,
                                    }))
                                }
                            />
                            <div>
                                <div className="text-sm font-medium chat-text">Only during scheduled time</div>
                                <div className="text-xs chat-text-muted mt-0.5">
                                    Replies are sent only between the start and end times below
                                </div>
                            </div>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium chat-text mb-1.5" htmlFor="auto-reply-start">
                                    Starts
                                </label>
                                <input
                                    id="auto-reply-start"
                                    type="datetime-local"
                                    min={minDatetime}
                                    value={form.startAt}
                                    onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border chat-border chat-input-field chat-text text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium chat-text mb-1.5" htmlFor="auto-reply-end">
                                    Ends
                                </label>
                                <input
                                    id="auto-reply-end"
                                    type="datetime-local"
                                    min={form.startAt || minDatetime}
                                    value={form.endAt}
                                    onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border chat-border chat-input-field chat-text text-sm"
                                />
                            </div>
                        </div>

                        {form.enabled && form.startAt && form.endAt && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    Active from{' '}
                                    <strong>{moment(form.startAt).format('MMM D, YYYY [at] hh:mm A')}</strong>
                                    {' '}to{' '}
                                    <strong>{moment(form.endAt).format('MMM D, YYYY [at] hh:mm A')}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ChatModalShell>
    );
};

AutoReplySettingsModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func,
};

export default AutoReplySettingsModal;
