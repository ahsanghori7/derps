export const PASSWORD_RULES = [
    { id: "minLength", label: "At least 8 characters", test: (password) => password.length >= 8 },
    { id: "uppercase", label: "Include at least one uppercase letter (A-Z)", test: (password) => /[A-Z]/.test(password) },
    { id: "lowercase", label: "Include at least one lowercase letter (a-z)", test: (password) => /[a-z]/.test(password) },
    { id: "number", label: "Include at least one number (0-9)", test: (password) => /\d/.test(password) },
];

export const getPasswordRuleStatus = (password) =>
    PASSWORD_RULES.map((rule) => ({
        ...rule,
        passed: rule.test(password),
    }));

export const isPasswordValid = (password) =>
    PASSWORD_RULES.every((rule) => rule.test(password));

export const getPasswordStrength = (password) => {
    if (!password) {
        return { score: 0, label: "", color: "#E5E7EB", width: "0%" };
    }

    const passedCount = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
    const hasExtraLength = password.length >= 12;
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    let score = passedCount;
    if (passedCount === PASSWORD_RULES.length && (hasExtraLength || hasSpecialChar)) {
        score = 5;
    }

    if (score <= 1) {
        return { score, label: "Weak", color: "#EF4444", width: "25%" };
    }
    if (score === 2) {
        return { score, label: "Weak", color: "#F97316", width: "50%" };
    }
    if (score === 3) {
        return { score, label: "Fair", color: "#EAB308", width: "75%" };
    }
    if (score === 4) {
        return { score, label: "Strong", color: "#22C55E", width: "100%" };
    }
    return { score, label: "Very Strong", color: "#16A34A", width: "100%" };
};
