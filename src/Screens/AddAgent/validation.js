export const PAY_FREQUENCY_OPTIONS = [
    { name: "Bi-weekly" },
    { name: "Monthly" },
];

const payFrequencyValues = {
    "bi-weekly": "bi-weekly",
    monthly: "monthly",
};

export const normalizePayFrequency = (value) => {
    const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
    return payFrequencyValues[normalized] || null;
};

const getErrorPayload = (error) => {
    if (error?.data && typeof error.data === "object") return error.data;
    if (error?.response?.data && typeof error.response.data === "object") {
        return error.response.data;
    }

    const message = error?.message || "";
    try {
        const parsed = JSON.parse(message);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
};

const getFieldErrorMessages = (payload) => {
    const fieldErrors = payload?.errors;
    if (!fieldErrors || typeof fieldErrors !== "object") return [];

    return Object.values(fieldErrors)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => String(value || "").trim())
        .filter(Boolean);
};

export const getStaffSaveFieldErrors = (error) => {
    const payload = getErrorPayload(error);
    const fieldErrors = payload?.errors;
    if (!fieldErrors || typeof fieldErrors !== "object") return {};

    return Object.keys(fieldErrors).reduce((errors, field) => {
        errors[field] = true;
        return errors;
    }, {});
};

export const getStaffSaveErrorMessage = (error) => {
    const payload = getErrorPayload(error);
    const fieldMessages = getFieldErrorMessages(payload);
    const message = fieldMessages.join(", ")
        || payload?.message
        || error?.message
        || "";

    if (/payFrequency|data truncated|sequelize|query\.run/i.test(message)) {
        return "Unable to save staff member. Please verify the payroll information and try again.";
    }

    return message || "Unable to save staff member. Please try again.";
};
