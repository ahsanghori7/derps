const FALLBACK_TIMEZONES = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Africa/Cairo",
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Bangkok",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Pacific/Auckland",
];

export const getSupportedTimeZones = () => {
    try {
        if (typeof Intl.supportedValuesOf === "function") {
            const zones = Intl.supportedValuesOf("timeZone");
            if (Array.isArray(zones) && zones.length) return zones;
        }
    } catch (error) {
        // fall through to the static list
    }
    return FALLBACK_TIMEZONES;
};

export const getBrowserTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (error) {
        return "UTC";
    }
};
