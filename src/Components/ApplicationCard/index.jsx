import CheckIcon from "@mui/icons-material/Check";

const SOLUTION_DESCRIPTIONS = {
    atm: "On-site cash withdrawal machines",
    "credit-card": "Accept chip, tap and swipe payments",
    "cash-advance": "Upfront capitals against future sales",
    pos: "Register, receipt printer, scanner",
    ebt: "Government benefit card support",
    airvac: "Cash transport for fuel sites",
    website: "Hosting, domain and side building",
    "ach-processing": "Direct bank-to-bank transfer",
};

const ApplicationCard = ({ data, onClick, isSelected = false }) => {
    return (
        <div
            style={{
                backgroundColor: "var(--dashboard-tab-box)",
                height: 96,
                borderRadius: 20,
                borderWidth: isSelected ? 2 : 1,
                borderStyle: "solid",
                borderColor: isSelected ? "var(--dashboard-tab-active)" : "var(--dashboard-box-border)",
                boxShadow: isSelected 
                    ? "0px 8px 24px rgba(0, 132, 255, 0.08)" 
                    : "0px 4px 12px rgba(0, 0, 0, 0.02)",
                cursor: "pointer",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                width: "100%",
                transition: "all 0.2s ease-in-out",
                userSelect: "none",
            }}
            onClick={onClick}
        >
            {/* Icon Wrapper */}
            <div
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: isSelected ? "var(--dashboard-tab-active)" : "var(--dashboard-card-bg2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease-in-out",
                }}
            >
                <img
                    src={data.icon}
                    alt={`${data.text} icon`}
                    className={isSelected ? "" : "dark:brightness-0 dark:invert"}
                    style={{
                        width: 28,
                        height: 28,
                        filter: isSelected ? "brightness(0) invert(1)" : undefined,
                        transition: "all 0.2s ease-in-out",
                    }}
                />
            </div>

            {/* Text Details */}
            <div style={{ marginLeft: 20, display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 }}>
                <span
                    style={{
                        fontFamily: "Nunito, sans-serif",
                        fontSize: "18px",
                        fontWeight: "700",
                        color: isSelected ? "var(--dashboard-tab-active)" : "var(--dashboard-text-primary)",
                        lineHeight: "1.2",
                        marginBottom: "4px",
                    }}
                >
                    {data.text}
                </span>
                <span
                    style={{
                        fontFamily: "Nunito, sans-serif",
                        fontSize: "13px",
                        fontWeight: "400",
                        color: "var(--dashboard-text-secondary)",
                        lineHeight: "1.2",
                    }}
                >
                    {SOLUTION_DESCRIPTIONS[data.value] || ""}
                </span>
            </div>

            {/* Checkbox Indicator */}
            <div
                style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: isSelected ? "none" : "2px solid var(--dashboard-box-border)",
                    backgroundColor: isSelected ? "var(--dashboard-tab-active)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginLeft: "auto",
                    transition: "all 0.2s ease-in-out",
                }}
            >
                {isSelected && (
                    <CheckIcon sx={{ color: "var(--dashboard-tab-text-active)", fontSize: 16 }} />
                )}
            </div>
        </div>
    );
};

export default ApplicationCard;

