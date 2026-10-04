import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import dayjs from "./dayjsSetup";
import { getSupportedTimeZones, getBrowserTimeZone } from "./timezones";
import { getPublicSlots, createPublicBooking } from "../../api/bookingApi";
import { userIdFromHostSlug } from "../../utils/userSlug";
import Loader from "@components/Loader";

const MAX_SPAN_DAYS = 30;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pageShellStyle = {
    position: "fixed",
    inset: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    background: "#F8FAFC",
    zIndex: 1,
};

const cardStyle = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E2E8F0",
    padding: 24,
};

const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #CBD5E1",
    fontSize: 14,
    color: "#0F172A",
    outline: "none",
    fontFamily: "inherit",
};

const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#0F172A",
};

const primaryButtonStyle = (disabled) => ({
    height: 44,
    padding: "0 20px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "rgba(12,121,247,0.5)" : "#0C79F7",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
});

const normalizeHHmm = (value) => (value ? value.slice(0, 5) : value);

/** Converts a host-timezone {date, "HH:mm[:ss]"} slot into a guest-timezone dayjs moment for display only. */
const toGuestMoment = (dateStr, hostTimeStr, hostTimezone, guestTimezone) => {
    const hhmm = normalizeHHmm(hostTimeStr);
    const hostMoment = dayjs.tz(`${dateStr} ${hhmm}`, "YYYY-MM-DD HH:mm", hostTimezone || "UTC");
    return hostMoment.tz(guestTimezone);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * userData.userDetails in Redux only gets hydrated when the authenticated
 * shell (Sidebar/UserSidebar/MasterSidebar) mounts and dispatches
 * setUserDetails from localStorage — this public route renders outside
 * that shell, so we read localStorage directly instead.
 */
const getStoredUserDetails = () => {
    try {
        const raw = localStorage.getItem("userDetails");
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
};

const PublicBookingPage = () => {
    const { tenantSlug, userSlug } = useParams();
    const userId = userIdFromHostSlug(userSlug);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const loggedInUser = getStoredUserDetails();
    const isOwnBookingPage = Boolean(
        accessToken && loggedInUser?.id && String(loggedInUser.id) === String(userId)
    );
    const abortRef = useRef(null);
    const todayRef = useRef(dayjs().startOf("day"));

    const [step, setStep] = useState("picker"); // 'picker' | 'form' | 'success'
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState("");
    const [host, setHost] = useState(null);
    const [slotDurationMinutes, setSlotDurationMinutes] = useState(null);
    const [hostTimezone, setHostTimezone] = useState(null);
    const [datesMap, setDatesMap] = useState({});
    const [visibleMonth, setVisibleMonth] = useState(() => dayjs().startOf("month"));
    const [fetchedUntil, setFetchedUntil] = useState(null); // dayjs — last date already loaded
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD'
    const [selectedSlot, setSelectedSlot] = useState(null); // { startTime, endTime }
    const [guestTimezone, setGuestTimezone] = useState(getBrowserTimeZone());

    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [slotStaleMessage, setSlotStaleMessage] = useState("");
    const [bookingResult, setBookingResult] = useState(null);

    const timeZoneOptions = useRef(getSupportedTimeZones()).current;

    const loadSlots = async (startDate, endDate, { silent } = {}) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        if (silent) setSlotsLoading(true);
        else setPageLoading(true);

        try {
            const result = await getPublicSlots(
                { tenantSlug, userId, startDate, endDate },
                { signal: controller.signal }
            );
            const data = result?.data;
            if (data) {
                setHost(data.host || null);
                setSlotDurationMinutes(data.slotDurationMinutes || null);
                setHostTimezone(data.timezone || null);
                setDatesMap((prev) => {
                    const next = { ...prev };
                    (data.dates || []).forEach((d) => {
                        next[d.date] = d.slots || [];
                    });
                    return next;
                });
                setFetchedUntil((prev) => {
                    const newEnd = dayjs(endDate);
                    return prev && prev.isAfter(newEnd) ? prev : newEnd;
                });
            }
            setPageError("");
        } catch (error) {
            if (error?.name === "AbortError") return;
            if (error?.status === 404) {
                setPageError("This booking page is not available.");
            } else {
                toast.error(error?.response?.data?.message || error?.message || "Failed to load available times");
            }
        } finally {
            if (silent) setSlotsLoading(false);
            else setPageLoading(false);
        }
    };

    useEffect(() => {
        if (isOwnBookingPage) {
            setPageLoading(false);
            return;
        }
        const start = todayRef.current;
        const end = start.add(MAX_SPAN_DAYS, "day");
        loadSlots(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantSlug, userId, isOwnBookingPage]);

    useEffect(() => {
        if (selectedDate || pageError) return;
        const firstBookable = Object.keys(datesMap)
            .filter((d) => (datesMap[d] || []).length > 0)
            .sort()[0];
        if (firstBookable) setSelectedDate(firstBookable);
    }, [datesMap, selectedDate, pageError]);

    const capDate = todayRef.current.add(MAX_SPAN_DAYS, "day");
    const prevDisabled = !visibleMonth.isAfter(todayRef.current, "month");
    const nextDisabled = !visibleMonth.isBefore(capDate, "month");

    const goToMonth = (direction) => {
        const newMonth = visibleMonth.add(direction, "month").startOf("month");
        setVisibleMonth(newMonth);

        const monthEnd = newMonth.endOf("month");
        const clampedEnd = monthEnd.isAfter(capDate) ? capDate : monthEnd;
        if (fetchedUntil && !clampedEnd.isAfter(fetchedUntil)) return;

        const needStart = fetchedUntil ? fetchedUntil.add(1, "day") : todayRef.current;
        loadSlots(needStart.format("YYYY-MM-DD"), clampedEnd.format("YYYY-MM-DD"), { silent: true });
    };

    const handleSelectSlot = (slot) => {
        setSelectedSlot(slot);
        setSlotStaleMessage("");
        setStep("form");
    };

    const refreshCurrentRange = () => {
        const end = fetchedUntil || todayRef.current.add(MAX_SPAN_DAYS, "day");
        loadSlots(todayRef.current.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"), { silent: true });
    };

    const handleSubmitBooking = async () => {
        const errors = {};
        if (!guestName.trim()) errors.guestName = "Name is required";
        if (!guestEmail.trim()) errors.guestEmail = "Email is required";
        else if (!EMAIL_RE.test(guestEmail.trim())) errors.guestEmail = "Enter a valid email";
        if (!notes.trim()) errors.notes = "Please tell us what you'd like to discuss";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        setSubmitting(true);
        try {
            const payload = {
                tenantSlug,
                userId: Number(userId),
                eventDate: selectedDate,
                startTime: selectedSlot.startTime,
                guestName: guestName.trim(),
                guestEmail: guestEmail.trim(),
                notes: notes.trim(),
            };
            if (guestPhone.trim()) payload.guestPhone = guestPhone.trim();

            const result = await createPublicBooking(payload);
            setBookingResult(result?.data || null);
            setStep("success");
        } catch (error) {
            if (error?.status === 409) {
                setSlotStaleMessage("This time slot is no longer available. Please pick another time.");
                setSelectedSlot(null);
                setStep("picker");
                refreshCurrentRange();
            } else if (error?.status === 404) {
                setPageError("This booking page is not available.");
            } else if (error?.status === 400) {
                toast.error(error?.response?.data?.message || "Invalid booking details");
            } else {
                toast.error(error?.response?.data?.message || error?.message || "Failed to book this meeting");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (isOwnBookingPage) {
        return (
            <div style={{ ...pageShellStyle, display: "grid", placeItems: "center", padding: 24 }}>
                <div style={{ ...cardStyle, maxWidth: 480, width: "100%", textAlign: "center" }}>
                    <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#0F172A" }}>
                        This is your own booking page
                    </h1>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 14, lineHeight: 1.5 }}>
                        You can&apos;t book a meeting with yourself. Share this link with others so they can schedule time with you.
                    </p>
                </div>
            </div>
        );
    }

    if (pageLoading) {
        return (
            <div style={{ ...pageShellStyle, display: "grid", placeItems: "center" }}>
                <Loader message="Loading booking page..." subMessage="Please wait" />
            </div>
        );
    }

    if (pageError) {
        return (
            <div style={{ ...pageShellStyle, display: "grid", placeItems: "center", padding: 24 }}>
                <div style={{ ...cardStyle, maxWidth: 480, width: "100%", textAlign: "center" }}>
                    <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#0F172A" }}>
                        Unable to open booking page
                    </h1>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 14, lineHeight: 1.5 }}>{pageError}</p>
                </div>
            </div>
        );
    }

    const monthDaysGrid = (() => {
        const startOfMonth = visibleMonth.startOf("month");
        const startOfGrid = startOfMonth.startOf("week");
        const days = [];
        let cursor = startOfGrid;
        for (let i = 0; i < 42; i += 1) {
            days.push(cursor);
            cursor = cursor.add(1, "day");
        }
        return days;
    })();

    const selectedSlots = selectedDate ? datesMap[selectedDate] || [] : [];

    return (
        <div style={{ ...pageShellStyle, padding: "24px 16px 48px" }}>
            <style>{`
                .booking-slot-scroll { scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
                .booking-slot-scroll::-webkit-scrollbar { width: 6px; }
                .booking-slot-scroll::-webkit-scrollbar-track { background: transparent; }
                .booking-slot-scroll::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 9999px; }
                .booking-slot-scroll::-webkit-scrollbar-thumb:hover { background-color: #94A3B8; }
            `}</style>
            <div style={{ maxWidth: 920, margin: "0 auto" }}>
                {step !== "success" && (
                    <div style={{ ...cardStyle, marginBottom: 16 }}>
                        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#0F172A" }}>
                            Meet with {host?.name || "our team"}
                        </h1>
                        {slotDurationMinutes ? (
                            <p style={{ margin: 0, color: "#64748B", fontSize: 14 }}>{slotDurationMinutes} min meeting</p>
                        ) : null}
                    </div>
                )}

                {step === "picker" && (
                    <div style={{ ...cardStyle, display: "flex", flexWrap: "wrap", gap: 24 }}>
                        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => goToMonth(-1)}
                                    disabled={prevDisabled}
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor: prevDisabled ? "not-allowed" : "pointer",
                                        opacity: prevDisabled ? 0.3 : 1,
                                        padding: 6,
                                    }}
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft size={20} color="#0F172A" />
                                </button>
                                <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>
                                    {visibleMonth.format("MMMM YYYY")}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => goToMonth(1)}
                                    disabled={nextDisabled}
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor: nextDisabled ? "not-allowed" : "pointer",
                                        opacity: nextDisabled ? 0.3 : 1,
                                        padding: 6,
                                    }}
                                    aria-label="Next month"
                                >
                                    <ChevronRight size={20} color="#0F172A" />
                                </button>
                            </div>
                            {nextDisabled && (
                                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94A3B8" }}>
                                    You can only book up to {MAX_SPAN_DAYS} days ahead.
                                </p>
                            )}
                            <div style={{ position: "relative" }}>
                                {slotsLoading && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            display: "grid",
                                            placeItems: "center",
                                            background: "rgba(255,255,255,0.6)",
                                            zIndex: 1,
                                        }}
                                    >
                                        <Loader2 size={22} className="animate-spin" color="#0C79F7" />
                                    </div>
                                )}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                                    {WEEKDAY_LABELS.map((label) => (
                                        <div key={label} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
                                            {label}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                                    {monthDaysGrid.map((day) => {
                                        const dateStr = day.format("YYYY-MM-DD");
                                        const inMonth = day.month() === visibleMonth.month();
                                        const isPast = day.isBefore(todayRef.current, "day");
                                        const isBeyondCap = day.isAfter(capDate, "day");
                                        const bookable = inMonth && !isPast && !isBeyondCap && (datesMap[dateStr] || []).length > 0;
                                        const isSelected = dateStr === selectedDate;
                                        return (
                                            <button
                                                key={dateStr}
                                                type="button"
                                                disabled={!bookable}
                                                onClick={() => setSelectedDate(dateStr)}
                                                style={{
                                                    aspectRatio: "1 / 1",
                                                    borderRadius: 8,
                                                    border: isSelected ? "1.5px solid #0C79F7" : "1px solid transparent",
                                                    background: isSelected ? "#0C79F7" : bookable ? "#EFF6FF" : "transparent",
                                                    color: !inMonth ? "#CBD5E1" : isSelected ? "#fff" : bookable ? "#0C79F7" : "#94A3B8",
                                                    fontWeight: bookable ? 700 : 400,
                                                    fontSize: 13,
                                                    cursor: bookable ? "pointer" : "default",
                                                }}
                                            >
                                                {day.date()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: "1 1 240px", minWidth: 220 }}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={labelStyle} htmlFor="guest-timezone">
                                    Timezone
                                </label>
                                <select
                                    id="guest-timezone"
                                    value={guestTimezone}
                                    onChange={(e) => setGuestTimezone(e.target.value)}
                                    style={inputStyle}
                                >
                                    {timeZoneOptions.map((tz) => (
                                        <option key={tz} value={tz}>
                                            {tz}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {slotStaleMessage && (
                                <p style={{ color: "#B91C1C", fontSize: 13, marginBottom: 10 }}>{slotStaleMessage}</p>
                            )}

                            <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>
                                {selectedDate ? dayjs(selectedDate).format("dddd, MMMM D") : "Select a date"}
                            </p>

                            <div className="booking-slot-scroll" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                                {selectedDate && selectedSlots.length === 0 && (
                                    <p style={{ color: "#64748B", fontSize: 13 }}>No available times in this range.</p>
                                )}
                                {selectedSlots.map((slot) => {
                                    const guestMoment = toGuestMoment(selectedDate, slot.startTime, hostTimezone, guestTimezone);
                                    const dayShift = guestMoment.format("YYYY-MM-DD") !== selectedDate;
                                    return (
                                        <button
                                            key={slot.startTime}
                                            type="button"
                                            onClick={() => handleSelectSlot(slot)}
                                            style={{
                                                textAlign: "left",
                                                padding: "10px 14px",
                                                borderRadius: 8,
                                                border: "1.5px solid #0C79F7",
                                                background: "#fff",
                                                color: "#0C79F7",
                                                fontWeight: 700,
                                                fontSize: 14,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {guestMoment.format("h:mm A")}
                                            {dayShift ? (
                                                <span style={{ fontWeight: 400, fontSize: 11, color: "#94A3B8", marginLeft: 6 }}>
                                                    ({guestMoment.isAfter(dayjs(selectedDate)) ? "next day" : "prev day"} in your timezone)
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {step === "form" && selectedSlot && (
                    <div style={cardStyle}>
                        <div
                            style={{
                                marginBottom: 20,
                                padding: "12px 14px",
                                borderRadius: 10,
                                background: "#EFF6FF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 8,
                            }}
                        >
                            <span style={{ fontSize: 14, color: "#0F172A", fontWeight: 600 }}>
                                {dayjs(selectedDate).format("ddd, MMM D")} ·{" "}
                                {toGuestMoment(selectedDate, selectedSlot.startTime, hostTimezone, guestTimezone).format("h:mm A")} –{" "}
                                {toGuestMoment(selectedDate, selectedSlot.endTime, hostTimezone, guestTimezone).format("h:mm A")}{" "}
                                ({guestTimezone})
                            </span>
                            <button
                                type="button"
                                onClick={() => setStep("picker")}
                                style={{ border: "none", background: "transparent", color: "#0C79F7", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
                            >
                                Change
                            </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={labelStyle} htmlFor="guest-name">First &amp; Last Name *</label>
                                <input
                                    id="guest-name"
                                    style={{ ...inputStyle, borderColor: formErrors.guestName ? "#EF4444" : "#CBD5E1" }}
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="Jane Doe"
                                />
                                {formErrors.guestName && (
                                    <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{formErrors.guestName}</p>
                                )}
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor="guest-email">Email Address *</label>
                                <input
                                    id="guest-email"
                                    style={{ ...inputStyle, borderColor: formErrors.guestEmail ? "#EF4444" : "#CBD5E1" }}
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    placeholder="jane@example.com"
                                />
                                {formErrors.guestEmail && (
                                    <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{formErrors.guestEmail}</p>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle} htmlFor="guest-phone">Phone Number</label>
                            <input
                                id="guest-phone"
                                style={inputStyle}
                                value={guestPhone}
                                onChange={(e) => setGuestPhone(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle} htmlFor="guest-notes">What would you like to discuss? *</label>
                            <textarea
                                id="guest-notes"
                                style={{ ...inputStyle, minHeight: 90, resize: "vertical", borderColor: formErrors.notes ? "#EF4444" : "#CBD5E1" }}
                                value={notes}
                                onChange={(e) => {
                                    setNotes(e.target.value);
                                    if (formErrors.notes) setFormErrors((prev) => ({ ...prev, notes: undefined }));
                                }}
                                placeholder="Tell us what you'd like to discuss"
                            />
                            {formErrors.notes && (
                                <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{formErrors.notes}</p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleSubmitBooking}
                            disabled={submitting}
                            style={{ ...primaryButtonStyle(submitting), width: "100%" }}
                        >
                            {submitting ? "Booking..." : "Schedule Meeting"}
                        </button>
                    </div>
                )}

                {step === "success" && bookingResult && (
                    <div style={{ ...cardStyle, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
                        <CheckCircle2 size={48} color="#16A34A" style={{ margin: "0 auto 12px" }} />
                        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#0F172A" }}>You&apos;re booked!</h1>
                        <p style={{ margin: "0 0 4px", fontSize: 15, color: "#0F172A", fontWeight: 600 }}>
                            {dayjs(bookingResult.eventDate).format("dddd, MMMM D")} ·{" "}
                            {toGuestMoment(bookingResult.eventDate, bookingResult.startTime, hostTimezone, guestTimezone).format("h:mm A")}
                        </p>
                        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>with {host?.name}</p>
                        {bookingResult.meetingLink && (
                            <a
                                href={bookingResult.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#0C79F7", fontWeight: 600, fontSize: 14 }}
                            >
                                {bookingResult.meetingLink}
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicBookingPage;
