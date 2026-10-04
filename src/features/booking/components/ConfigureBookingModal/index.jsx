"use client"

import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import dayjs from "dayjs"
import { Check, Copy, Loader2, X } from "lucide-react"
import { getAvailability, saveAvailability } from "../../api/bookingApi"
import { frontendBaseUrl } from "../../../../Config/systemConfig"
import BookingTimePicker from "../BookingTimePicker"
import { buildHostSlug } from "../../utils/userSlug"
import { getSupportedTimeZones } from "../../screens/PublicBookingPage/timezones"

const DEFAULT_TIMEZONE = "America/Chicago";

const WEEKDAYS = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
];

const DURATION_OPTIONS = [
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hr" },
];

const DEFAULT_START = () => dayjs().hour(9).minute(0).second(0);
const DEFAULT_END = () => dayjs().hour(17).minute(0).second(0);

const minutesOf = (d) => d.hour() * 60 + d.minute();

const ConfigureBookingModal = ({ isOpen, onClose }) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedDays, setSelectedDays] = useState([]);
    const [startTime, setStartTime] = useState(DEFAULT_START());
    const [endTime, setEndTime] = useState(DEFAULT_END());
    const [slotDuration, setSlotDuration] = useState(30);
    const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
    const [errors, setErrors] = useState({});
    const [hasExistingConfig, setHasExistingConfig] = useState(false);
    const [confirmEmptyDays, setConfirmEmptyDays] = useState(false);
    const [copied, setCopied] = useState(false);

    const timeZoneOptions = useRef(getSupportedTimeZones()).current;

    useEffect(() => {
        if (!isOpen || !accessToken) return;

        setLoading(true);
        setErrors({});
        setConfirmEmptyDays(false);
        setCopied(false);

        getAvailability(accessToken)
            .then((result) => {
                const data = result?.data || {};
                const weeklyHours = Array.isArray(data.weeklyHours) ? data.weeklyHours : [];

                if (weeklyHours.length > 0) {
                    setSelectedDays(weeklyHours.map((w) => w.dayOfWeek));
                    const first = weeklyHours[0];
                    setStartTime(first?.startTime ? dayjs(first.startTime, "HH:mm") : DEFAULT_START());
                    setEndTime(first?.endTime ? dayjs(first.endTime, "HH:mm") : DEFAULT_END());
                    setHasExistingConfig(true);
                } else {
                    setSelectedDays([]);
                    setStartTime(DEFAULT_START());
                    setEndTime(DEFAULT_END());
                    setHasExistingConfig(false);
                }
                setSlotDuration(data.slotDurationMinutes || 30);
                setTimezone(data.timezone || DEFAULT_TIMEZONE);
            })
            .catch((error) => {
                toast.error(error?.response?.data?.message || error?.message || "Failed to load availability");
            })
            .finally(() => setLoading(false));
    }, [isOpen, accessToken]);

    if (!isOpen) return null;

    const toggleDay = (value) => {
        setErrors((prev) => (prev.days ? { ...prev, days: false } : prev));
        setConfirmEmptyDays(false);
        setSelectedDays((prev) =>
            prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
        );
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !loading && !saving) onClose();
    };

    const tenantSlug = userData?.tenant?.slug;
    const canShowLink = Boolean(tenantSlug && userData?.id);
    const hostSlug = canShowLink ? buildHostSlug(userData?.username || userData?.name, userData.id) : null;
    const bookingLink = canShowLink
        ? `${frontendBaseUrl}/schedule/${tenantSlug}/${hostSlug}`
        : null;

    const handleCopyLink = async () => {
        if (!bookingLink) return;
        try {
            await navigator.clipboard.writeText(bookingLink);
            setCopied(true);
            toast.success("Link copied");
            setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            toast.error("Failed to copy link");
        }
    };

    const handleSave = async () => {
        setErrors({});

        if (selectedDays.length === 0 && !confirmEmptyDays) {
            setErrors({ days: true });
            setConfirmEmptyDays(true);
            toast.error("Select at least one working day, or confirm to pause bookings");
            return;
        }

        if (!startTime || !endTime) {
            setErrors({ time: true });
            toast.error("Start and end time are required");
            return;
        }

        if (minutesOf(startTime) >= minutesOf(endTime)) {
            setErrors({ time: true });
            toast.error("Start time must be before end time");
            return;
        }

        setSaving(true);
        try {
            const weeklyHours = selectedDays.map((dayOfWeek) => ({
                dayOfWeek,
                startTime: startTime.format("HH:mm"),
                endTime: endTime.format("HH:mm"),
            }));

            const payload = {
                slotDurationMinutes: slotDuration,
                timezone,
                weeklyHours,
                dateOverrides: [],
            };

            const result = await saveAvailability(accessToken, payload);
            toast.success(result?.message || "Booking availability saved");
            setHasExistingConfig(true);
            setConfirmEmptyDays(false);
        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid availability data");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to perform this action");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setSaving(false);
        }
    };

    const busy = loading || saving;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
            style={{ zIndex: 9999 }}
            onClick={handleBackdropClick}
        >
            <div
                className="bg-[var(--dashboard-card-bg)] rounded-2xl shadow-2xl w-full max-w-lg relative border border-[var(--sidebar-text-primary)]/5 overflow-hidden max-h-[calc(100vh-80px)] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="configure-booking-modal-title"
            >
                <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-5">
                        <div className="min-w-0">
                            <h2
                                id="configure-booking-modal-title"
                                className="text-xl text-[var(--sidebar-text-primary)] font-semibold tracking-tight"
                            >
                                Configure Booking Page
                            </h2>
                            <p className="mt-1 text-sm text-[var(--sidebar-text-primary)]/55">
                                Set your weekly availability for meeting bookings
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            aria-label="Close"
                            className="shrink-0 p-2 rounded-full text-[var(--sidebar-text-primary)]/60 hover:text-[var(--sidebar-text-primary)] hover:bg-[var(--sidebar-text-primary)]/8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-[#0C79F7]" />
                        </div>
                    ) : (
                        <>
                            <div className="mb-5">
                                <div className="flex items-center mb-2">
                                    <p className="text-sm font-semibold text-[var(--sidebar-text-primary)]">
                                        Working days
                                    </p>
                                    <span style={{ color: "red", marginLeft: 4 }}>*</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {WEEKDAYS.map((day) => {
                                        const isActive = selectedDays.includes(day.value);
                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                                                style={
                                                    isActive
                                                        ? { backgroundColor: "var(--dashboard-tab-active)", color: "#fff" }
                                                        : {
                                                            backgroundColor: "var(--dashboard-tab-box)",
                                                            color: "var(--dashboard-tab-text-inactive)",
                                                            border: "1px solid var(--dashboard-box-border)",
                                                        }
                                                }
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.days && (
                                    <p style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>
                                        Select at least one working day
                                    </p>
                                )}
                                {confirmEmptyDays && selectedDays.length === 0 && (
                                    <p style={{ color: "#b45309", fontSize: 12, marginTop: 6 }}>
                                        No days selected — saving now will pause your booking page (no bookable slots). Click Save again to confirm.
                                    </p>
                                )}
                            </div>

                            <div className="mb-5">
                                <p className="text-sm font-semibold text-[var(--sidebar-text-primary)] mb-2">
                                    Timezone
                                </p>
                                <select
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 text-sm"
                                    style={{
                                        backgroundColor: "var(--dashboard-tab-box)",
                                        color: "var(--dashboard-text-primary)",
                                        border: "1px solid var(--dashboard-box-border)",
                                    }}
                                >
                                    {timeZoneOptions.map((tz) => (
                                        <option key={tz} value={tz}>
                                            {tz}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1.5 text-xs text-[var(--sidebar-text-primary)]/55">
                                    Start and end time below are in this timezone.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <BookingTimePicker
                                    label="Start time"
                                    value={startTime}
                                    onChange={(newValue) => {
                                        setStartTime(newValue);
                                        setErrors((prev) => (prev.time ? { ...prev, time: false } : prev));
                                    }}
                                    required
                                    error={!!errors.time}
                                />
                                <BookingTimePicker
                                    label="End time"
                                    value={endTime}
                                    onChange={(newValue) => {
                                        setEndTime(newValue);
                                        setErrors((prev) => (prev.time ? { ...prev, time: false } : prev));
                                    }}
                                    required
                                    error={!!errors.time}
                                />
                            </div>

                            <div className="mb-5">
                                <p className="text-sm font-semibold text-[var(--sidebar-text-primary)] mb-2">
                                    Meeting duration
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {DURATION_OPTIONS.map((option) => {
                                        const isActive = slotDuration === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setSlotDuration(option.value)}
                                                className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                                                style={
                                                    isActive
                                                        ? { backgroundColor: "var(--dashboard-tab-active)", color: "#fff" }
                                                        : {
                                                            backgroundColor: "var(--dashboard-tab-box)",
                                                            color: "var(--dashboard-tab-text-inactive)",
                                                            border: "1px solid var(--dashboard-box-border)",
                                                        }
                                                }
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {hasExistingConfig && (
                                <div className="mb-1">
                                    <p className="text-sm font-semibold text-[var(--sidebar-text-primary)] mb-2">
                                        Booking link
                                    </p>
                                    {canShowLink ? (
                                        <div
                                            className="flex items-center gap-2 rounded-lg px-3 py-2"
                                            style={{
                                                backgroundColor: "var(--dashboard-tab-box)",
                                                border: "1px solid var(--dashboard-box-border)",
                                            }}
                                        >
                                            <a
                                                href={bookingLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 min-w-0 truncate text-sm"
                                                style={{ color: "#0C79F7" }}
                                            >
                                                {bookingLink}
                                            </a>
                                            <button
                                                type="button"
                                                onClick={handleCopyLink}
                                                className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                                style={{ color: "var(--sidebar-text-primary)" }}
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                {copied ? "Copied" : "Copy"}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--sidebar-text-primary)]/55">
                                            Your booking link isn&apos;t available right now — please refresh or contact an admin.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--sidebar-text-primary)] bg-[var(--sidebar-text-primary)]/6 hover:bg-[var(--sidebar-text-primary)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={busy}
                            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${busy
                                    ? "bg-[#0C79F7]/60 cursor-not-allowed"
                                    : "bg-[#0C79F7] hover:bg-[#0047c7] active:bg-[#003db0]"
                                }`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

ConfigureBookingModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
}

export default ConfigureBookingModal
