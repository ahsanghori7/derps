import React from "react";

const NoDataFound = ({
    title = "No Data Found",
    description = "There is nothing to show here right now.",
    actionLabel,
    onAction,
    icon,
    containerStyle,
}) => {
    const showAction = typeof onAction === "function" && String(actionLabel || "").trim().length > 0;

    return (
        <div
            style={{
                borderRadius: 14,
                background:
                    "radial-gradient(1200px 400px at 50% -30%, rgba(67,121,238,0.20) 0%, rgba(67,121,238,0.00) 60%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 100%)",
                border: "1px solid rgba(67,121,238,0.22)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                padding: 24,
                textAlign: "center",
                color: "var(--sidebar-text-primary)",
                ...containerStyle,
            }}
        >
            <div
                style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    margin: "0 auto 12px",
                    background: "rgba(67,121,238,0.14)",
                    border: "1px solid rgba(67,121,238,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {icon ? (
                    icon
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M4 6.5C4 5.11929 5.11929 4 6.5 4H17.5C18.8807 4 20 5.11929 20 6.5V17.5C20 18.8807 18.8807 20 17.5 20H6.5C5.11929 20 4 18.8807 4 17.5V6.5Z"
                            stroke="#0C79F7"
                            strokeWidth="1.6"
                        />
                        <path d="M8 9H16" stroke="#0C79F7" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M8 12H13" stroke="#0C79F7" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M8 15H16" stroke="#0C79F7" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                )}
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, letterSpacing: 0.2 }}>{title}</div>
            <div style={{ fontSize: 13, opacity: 0.85, maxWidth: 520, margin: "0 auto" }}>{description}</div>

            {showAction ? (
                <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                    <button
                        type="button"
                        onClick={onAction}
                        style={{
                            height: 38,
                            padding: "0 14px",
                            borderRadius: 10,
                            border: "1px solid rgba(67,121,238,0.35)",
                            background: "rgba(67,121,238,0.10)",
                            color: "var(--sidebar-text-primary)",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        {actionLabel}
                    </button>
                </div>
            ) : null}
        </div>
    );
};

export default NoDataFound;
