export const getPreferenceOptions = (extra) => {
    if (Array.isArray(extra)) return extra;
    if (Array.isArray(extra?.options)) return extra.options;
    return [];
};

export const isPreferenceRequired = (extra) => {
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
        return extra.required === true;
    }
    return false;
};

export const isSecureInput = (extra) => {
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
        return extra.secureInput === true;
    }
    return false;
};

export const isPreferenceValueFilled = (preference, value) => {
    if (preference === 'switch') return true;
    if (value == null || value === '') return false;
    if (typeof value === 'string' && !value.trim()) return false;
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (typeof value === 'object' && typeof value.isValid === 'function') {
        return value.isValid();
    }
    return true;
};

export const getMissingRequiredPreferences = (fields = [], values = {}) =>
    (Array.isArray(fields) ? fields : [])
        .filter((field) => isPreferenceRequired(field?.extra))
        .filter((field) => !isPreferenceValueFilled(field?.preference, values?.[field?.name]))
        .map((field) => field?.name)
        .filter(Boolean);

export const buildPreferenceExtra = ({
    preference,
    options = [],
    isHidden = false,
    required = false,
}) => {
    const extra = { required: Boolean(required) };

    if (preference === 'dropdown') {
        extra.options = options;
    }

    if (preference === 'textField' && isHidden) {
        extra.secureInput = true;
    }

    return extra;
};
