import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { toast } from 'react-toastify';
import { ChatModalShell } from '../shared/components';
import { BoltIcon, CalendarIcon, ClockIcon, SunriseIcon } from '../shared/icons';

const toDatetimeLocal = (date) => moment(date).format('YYYY-MM-DDTHH:mm');

const ACCENT_STYLES = {
    amber: {
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        selected: 'bg-amber-500 border-amber-500 shadow-md shadow-amber-500/25',
    },
    sky: {
        badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
        selected: 'bg-sky-500 border-sky-500 shadow-md shadow-sky-500/25',
    },
    violet: {
        badge: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
        selected: 'bg-violet-500 border-violet-500 shadow-md shadow-violet-500/25',
    },
};

const QUICK_OPTIONS = [
    { label: 'In 1 hour', getValue: () => moment().add(1, 'hour'), icon: BoltIcon, accent: 'amber' },
    { label: 'Tomorrow, 9:00 AM', getValue: () => moment().add(1, 'day').hour(9).minute(0).second(0), icon: SunriseIcon, accent: 'sky' },
    { label: 'Monday, 9:00 AM', getValue: () => {
        let next = moment().day(8).hour(9).minute(0).second(0);
        if (next.valueOf() <= moment().valueOf()) next = next.add(7, 'days');
        return next;
    }, icon: CalendarIcon, accent: 'violet' },
];

const ScheduleSendModal = ({
    open,
    onClose,
    onSchedule,
    previewLabel,
    mode = 'create',
    initialDatetime,
    editableContent,
    title,
    submitLabel,
}) => {
    const [datetime, setDatetime] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedQuickIndex, setSelectedQuickIndex] = useState(null);
    const [now, setNow] = useState(() => moment());
    const isEdit = mode === 'edit';
    const showContentField = editableContent !== undefined && editableContent !== null;

    useEffect(() => {
        if (!open) return;
        const seed = initialDatetime
            ? moment(initialDatetime)
            : moment().add(1, 'hour');
        setDatetime(toDatetimeLocal(seed.isValid() ? seed : moment().add(1, 'hour')));
        setContent(showContentField ? String(editableContent || '') : '');
        setSubmitting(false);
        setSelectedQuickIndex(null);
        setNow(moment());
    }, [open, initialDatetime, editableContent, showContentField]);

    // Keep "now" fresh so the min bound and the past-time check stay accurate
    // for a modal left open across a minute (or hour) boundary.
    useEffect(() => {
        if (!open) return undefined;
        const id = setInterval(() => setNow(moment()), 30 * 1000);
        return () => clearInterval(id);
    }, [open]);

    const minDatetime = toDatetimeLocal(now);
    const parsedDatetime = useMemo(() => (datetime ? moment(datetime) : null), [datetime]);
    const isPast = Boolean(parsedDatetime && parsedDatetime.isValid() && parsedDatetime.valueOf() <= now.valueOf());
    const dateError = parsedDatetime && !parsedDatetime.isValid()
        ? 'Invalid date or time'
        : isPast
            ? 'Please choose a time in the future'
            : '';

    const handleDatetimeChange = (value) => {
        setSelectedQuickIndex(null);
        setDatetime(value);
    };

    const handleQuickOption = (opt, index) => {
        setDatetime(toDatetimeLocal(opt.getValue()));
        setSelectedQuickIndex(index);
    };

    const handleSchedule = async () => {
        if (!datetime) {
            toast.error('Please choose a date and time');
            return;
        }
        const scheduled = moment(datetime);
        if (!scheduled.isValid()) {
            toast.error('Invalid date or time');
            return;
        }
        if (scheduled.valueOf() <= moment().valueOf()) {
            toast.error('Scheduled time must be in the future');
            return;
        }
        if (showContentField && !String(content || '').trim() && !previewLabel) {
            toast.error('Please enter a message');
            return;
        }

        setSubmitting(true);
        try {
            await onSchedule(scheduled.toISOString(), {
                content: showContentField ? String(content || '').trim() : undefined,
            });
            onClose();
        } catch {
            // Parent shows error toast
        } finally {
            setSubmitting(false);
        }
    };

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 chat-text-secondary chat-hover rounded-lg transition-colors"
                disabled={submitting}
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSchedule}
                disabled={submitting || !datetime || Boolean(dateError)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                {submitting
                    ? (isEdit ? 'Saving…' : 'Scheduling…')
                    : (submitLabel || (isEdit ? 'Save changes' : 'Schedule send'))}
            </button>
        </>
    );

    return (
        <ChatModalShell
            open={open}
            title={title || (isEdit ? 'Edit scheduled message' : 'Schedule message')}
            onClose={onClose}
            maxWidth="md"
            footer={footer}
        >
            <div className="chat-scroll overflow-y-auto flex-1 px-4 pb-4 space-y-5">
                {previewLabel && !showContentField && (
                    <div className="p-3 rounded-lg chat-chrome-alt border chat-border text-sm chat-text-secondary truncate">
                        {previewLabel}
                    </div>
                )}

                {showContentField && (
                    <div>
                        <label className="block text-sm font-medium chat-text mb-1.5" htmlFor="schedule-content">
                            Message
                        </label>
                        <textarea
                            id="schedule-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            placeholder="Type your message…"
                            className="w-full px-3 py-2 rounded-lg border chat-border chat-input-field chat-text text-sm resize-y min-h-[96px]"
                        />
                    </div>
                )}

                <div>
                    <p className="text-sm font-medium chat-text mb-2">
                        {isEdit ? 'Update send time' : 'Quick pick'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_OPTIONS.map((opt, index) => {
                            const Icon = opt.icon;
                            const accent = ACCENT_STYLES[opt.accent];
                            const isSelected = selectedQuickIndex === index;
                            return (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => handleQuickOption(opt, index)}
                                    className={`group flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 ${
                                        isSelected
                                            ? `${accent.selected} text-white`
                                            : 'chat-border chat-surface chat-text-secondary hover:shadow-sm hover:-translate-y-0.5'
                                    }`}
                                >
                                    <span
                                        className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors ${
                                            isSelected ? 'bg-white/20 text-white' : accent.badge
                                        }`}
                                    >
                                        <Icon className="w-3 h-3" />
                                    </span>
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium chat-text mb-1.5" htmlFor="schedule-datetime">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            <CalendarIcon className="w-3 h-3" />
                        </span>
                        Custom date &amp; time
                    </label>
                    <input
                        id="schedule-datetime"
                        type="datetime-local"
                        min={minDatetime}
                        value={datetime}
                        onChange={(e) => handleDatetimeChange(e.target.value)}
                        aria-invalid={Boolean(dateError)}
                        className={`w-full px-3 py-2 rounded-lg border chat-input-field chat-text text-sm transition-colors ${
                            dateError ? 'border-red-400 dark:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-400' : 'chat-border'
                        }`}
                    />
                    {dateError ? (
                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{dateError}</p>
                    ) : (
                        <p className="mt-1.5 text-xs chat-text-muted">Times in the past can&rsquo;t be selected.</p>
                    )}
                </div>

                {parsedDatetime && parsedDatetime.isValid() && !dateError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex-shrink-0">
                            <ClockIcon className="w-3.5 h-3.5" />
                        </span>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Will send on{' '}
                            <strong>{parsedDatetime.format('dddd, MMM D, YYYY [at] hh:mm A')}</strong>
                            {' '}
                            <span className="text-blue-600/80 dark:text-blue-300/80">({parsedDatetime.from(now)})</span>
                        </p>
                    </div>
                )}
            </div>
        </ChatModalShell>
    );
};

ScheduleSendModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onSchedule: PropTypes.func.isRequired,
    previewLabel: PropTypes.string,
    mode: PropTypes.oneOf(['create', 'edit']),
    initialDatetime: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    editableContent: PropTypes.string,
    title: PropTypes.string,
    submitLabel: PropTypes.string,
};

export default ScheduleSendModal;
