import React from "react";
import { Box, Button, Typography } from "@mui/material";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import { OPPORTUNITY_STAGES } from "./OpportunityStageForm";

const PROPOSAL_STEP = 0;
const QUOTATION_STEP = 1;
const NEGOTIATION_STEP = 2;

const getOpportunityPathAction = ({
    activeStep,
    maxUnlockedStep,
    isCrmAccountLinked,
    terminalOutcome,
}) => {
    if (terminalOutcome) return null;
    if (activeStep > maxUnlockedStep || activeStep < maxUnlockedStep) return null;

    if (activeStep === PROPOSAL_STEP && !isCrmAccountLinked) {
        return { type: "convert", label: "Move to Quotation" };
    }

    if (activeStep === PROPOSAL_STEP && isCrmAccountLinked) {
        const nextLabel = OPPORTUNITY_STAGES[QUOTATION_STEP];
        return {
            type: "complete",
            label: nextLabel ? `Move to ${nextLabel}` : "Move to Next Stage",
        };
    }

    if (activeStep === QUOTATION_STEP) {
        const nextLabel = OPPORTUNITY_STAGES[NEGOTIATION_STEP];
        return {
            type: "complete",
            label: nextLabel ? `Move to ${nextLabel}` : "Move to Next Stage",
        };
    }

    if (activeStep === NEGOTIATION_STEP) {
        return { type: "terminal" };
    }

    return null;
};

export default function OpportunityPath({
    activeStep = 0,
    /** Highest pipeline step the user may open (0 = proposal). */
    maxUnlockedStep = 0,
    isCrmAccountLinked = false,
    /** `closed_won` | `closed_lost` when deal has a terminal outcome. */
    terminalOutcome = null,
    onStepChange,
    onComplete,
    onConvert,
    onClosedWon,
    onClosedLost,
    completing = false,
    converting = false,
    terminalActionsDisabled = false,
}) {
    const isStepLocked = (index) => index > maxUnlockedStep;

    const pathAction = getOpportunityPathAction({
        activeStep,
        maxUnlockedStep,
        isCrmAccountLinked,
        terminalOutcome,
    });

    const handleStepClick = (index) => {
        if (isStepLocked(index)) return;
        onStepChange?.(index);
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                overflowY: "hidden",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": {
                    display: "none",
                },
            }}
        >
            <Box sx={{ display: "flex", flex: 1, minWidth: 0 }}>
                {OPPORTUNITY_STAGES.map((stage, index) => {
                    const isActive = index === activeStep;
                    const isCompleted = index < activeStep;

                    const isLockedFuture = isStepLocked(index);
                    const isLastStep = index === OPPORTUNITY_STAGES.length - 1;

                    return (
                        <Box
                            key={stage}
                            onClick={() => handleStepClick(index)}
                            sx={{
                                position: "relative",
                                minWidth: isLastStep
                                    ? { xs: 168, sm: 188, md: 210 }
                                    : { xs: 140, sm: 160, md: 180 },
                                height: 44,
                                cursor: isLockedFuture ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                pl: 3,
                                ml: index === 0 ? 0 : "-12px",
                                color: isActive ? "#fff" : "var(--dashboard-text-primary)",
                                backgroundColor: isActive
                                    ? "#1976d2"
                                    : isCompleted
                                    ? "var(--dashboard-badge-bg)"
                                    : "var(--dashboard-card-bg)",
                                clipPath:
                                    "polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)",
                                border: "1px solid var(--dashboard-border)",
                                zIndex: OPPORTUNITY_STAGES.length - index,
                                transition: "all .2s ease",
                                opacity: isLockedFuture ? 0.45 : 1,
                                pointerEvents: isLockedFuture ? "none" : "auto",
                                "&:hover": {
                                    opacity: isLockedFuture ? 0.45 : 0.9,
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    border: `1px solid ${isActive ? "#fff" : "var(--dashboard-border)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 12,
                                    mr: 1,
                                    flexShrink: 0,
                                }}
                            >
                                {String(index + 1).padStart(2, "0")}
                            </Box>

                            <Typography
                                sx={{
                                    fontSize: "14px",
                                    fontWeight: isActive ? 600 : 500,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {stage}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {pathAction?.type === "convert" ? (
                <Button
                    variant="contained"
                    startIcon={<DescriptionOutlined />}
                    onClick={onConvert}
                    disabled={converting || completing}
                    sx={{
                        backgroundColor: "#1976d2",
                        textTransform: "none",
                        minWidth: 190,
                        height: 40,
                        borderRadius: "4px",
                        boxShadow: "none",
                        flexShrink: 0,
                        opacity: converting ? 0.7 : 1,
                        "&:hover": {
                            backgroundColor: "#1565c0",
                            boxShadow: "none",
                        },
                    }}
                >
                    {converting ? "Converting..." : pathAction.label}
                </Button>
            ) : pathAction?.type === "terminal" ? (
                <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                    <Button
                        variant="outlined"
                        onClick={onClosedLost}
                        disabled={completing || converting || terminalActionsDisabled}
                        sx={{
                            textTransform: "none",
                            minWidth: 120,
                            height: 40,
                            borderRadius: "4px",
                            borderColor: "#EF4444",
                            color: "#EF4444",
                            fontWeight: 500,
                            "&:hover": {
                                borderColor: "#DC2626",
                                backgroundColor: "#FEF2F2",
                            },
                        }}
                    >
                        {completing ? "Updating..." : "Closed Lost"}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={onClosedWon}
                        disabled={completing || converting || terminalActionsDisabled}
                        sx={{
                            backgroundColor: "#10B981",
                            textTransform: "none",
                            minWidth: 120,
                            height: 40,
                            borderRadius: "4px",
                            boxShadow: "none",
                            fontWeight: 500,
                            opacity: completing ? 0.7 : 1,
                            "&:hover": {
                                backgroundColor: "#059669",
                                boxShadow: "none",
                            },
                        }}
                    >
                        {completing ? "Updating..." : "Closed Won"}
                    </Button>
                </Box>
            ) : pathAction?.type === "complete" ? (
                <Button
                    variant="contained"
                    onClick={onComplete}
                    disabled={completing || converting}
                    sx={{
                        backgroundColor: "#1976d2",
                        textTransform: "none",
                        minWidth: 170,
                        height: 40,
                        borderRadius: "4px",
                        boxShadow: "none",
                        flexShrink: 0,
                        opacity: completing ? 0.7 : 1,
                        "&:hover": {
                            backgroundColor: "#1565c0",
                            boxShadow: "none",
                        },
                    }}
                >
                    {completing ? "Updating..." : pathAction.label}
                </Button>
            ) : null}
        </Box>
    );
}
