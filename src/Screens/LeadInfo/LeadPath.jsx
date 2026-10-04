import React from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";

export const LEAD_STAGES = [
  {
    key: "open",
    label: "Open · Not Contacted",
    message: "Open · Not Contacted",
    completedLabel: "Open",
    description: "Lead has been created but has not yet been contacted.",
    apiValue: "open",
  },
  {
    key: "working",
    label: "Working (Contacted)",
    message: "Working · Contacted",
    completedLabel: "Contacted",
    description: "Lead has been contacted and is currently being worked by sales.",
    apiValue: "working",
  },
  {
    key: "lost",
    label: "Closed - Not Contacted",
    message: "Closed - Not Contacted",
    completedLabel: "Closed",
    description: "Lead is no longer being pursued and was not converted.",
    apiValue: "lost",
  },
  {
    key: "qualified",
    label: "Qualified",
    message: "Qualified",
    completedLabel: "Qualified",
    description: "Lead has been successfully qualified and converted.",
    apiValue: "qualified",
  },
];

const STATUS_ADVANCEMENTS = {
  open: { apiValue: "working" },
  working: { apiValue: "qualified" },
};

export const normalizeLeadStatusKey = (status) => {
  const normalized = String(status || "open")
    .toLowerCase()
    .trim()
    .replace(/[·•]/g, " ")
    .replace(/[\s-]+/g, "_");

  if (normalized.includes("not_contacted") || normalized === "notcontacted") return "lost";
  if (normalized.includes("lost") || normalized.includes("disqual")) return "lost";
  if (normalized.includes("qualif") || normalized.includes("convert")) return "qualified";
  if (normalized.includes("closed")) return "lost";
  if (normalized.includes("working") || (normalized.includes("contacted") && !normalized.includes("not"))) return "working";
  if (normalized.includes("open")) return "open";
  if (normalized === "completed") return "working";

  return "open";
};

export const getVisibleLeadStages = (status) => {
  const statusKey = normalizeLeadStatusKey(status);

  if (statusKey === "qualified") {
    return LEAD_STAGES.filter((stage) => stage.key !== "lost");
  }
  if (statusKey === "lost") {
    return LEAD_STAGES.filter((stage) => stage.key !== "qualified");
  }

  return LEAD_STAGES;
};

export const getLeadPathState = (status) => {
  const statusKey = normalizeLeadStatusKey(status);
  const visibleStages = getVisibleLeadStages(status);
  const activeStep = visibleStages.findIndex((stage) => stage.key === statusKey);

  return {
    activeStep: activeStep >= 0 ? activeStep : 0,
    completedThrough: activeStep > 0 ? activeStep - 1 : -1,
    visibleStages,
  };
};

export const getLeadStageIndex = (status) => getLeadPathState(status).activeStep;

export const getLeadStageInfo = (status) => {
  const statusKey = normalizeLeadStatusKey(status);
  const stage = LEAD_STAGES.find((item) => item.key === statusKey);
  return stage || LEAD_STAGES[0];
};

export const getNextLeadStage = (status) => {
  const statusKey = normalizeLeadStatusKey(status);
  if (statusKey === "lost" || statusKey === "qualified") return null;

  const next = STATUS_ADVANCEMENTS[statusKey];
  if (!next) return null;

  return next;
};

const getActionButtonLabel = (status) => {
  const statusKey = normalizeLeadStatusKey(status);
  if (statusKey === "lost" || statusKey === "qualified") return null;

  const next = getNextLeadStage(status);
  if (!next?.apiValue) return null;

  if (next.apiValue === "working") return "Mark as Working (Contacted)";

  return null;
};

export default function LeadPath({
  status,
  onAdvanceStatus,
  isUpdating = false,
  disabled = false,
}) {
  const { activeStep, completedThrough, visibleStages } = getLeadPathState(status);
  const actionLabel = getActionButtonLabel(status);
  const statusKey = normalizeLeadStatusKey(status);
  const isTerminalStatus = statusKey === "lost" || statusKey === "qualified";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        overflowX: "auto",
      }}
    >
      <Box sx={{ display: "flex", flex: 1 }}>
        {visibleStages.map((stage, index) => {
          const isActive = activeStep >= 0 && index === activeStep;
          const isCompleted =
            (activeStep >= 0 && index < activeStep) ||
            (activeStep === -1 && index <= completedThrough);

          return (
            <Box
              key={stage.key}
              sx={{
                position: "relative",
                minWidth: 220,
                height: 44,
                cursor: "default",
                display: "flex",
                alignItems: "center",
                pl: 3,
                ml: index === 0 ? 0 : "-12px",
                color: isActive || isCompleted ? "#fff" : "#555",
                backgroundColor: isActive
                  ? "#1976d2"
                  : isCompleted
                  ? "#2e7d32"
                  : "#ecebea",
                clipPath:
                  "polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)",
                border: isActive
                  ? "1px solid #1976d2"
                  : isCompleted
                  ? "1px solid #2e7d32"
                  : "1px solid #c9c7c5",
                zIndex: visibleStages.length - index,
                transition: "all .2s ease",
              }}
            >
              {isCompleted ? (
                <CheckCircle
                  sx={{
                    fontSize: 20,
                    mr: 1,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: `1px solid ${isActive ? "#fff" : "#8e8e8e"}`,
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
              )}

              <Typography
                sx={{
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {isCompleted ? stage.completedLabel : stage.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {!isTerminalStatus && actionLabel && (
        <Button
          variant="contained"
          onClick={onAdvanceStatus}
          disabled={disabled || isUpdating}
          sx={{
            backgroundColor: "#1976d2",
            textTransform: "none",
            minWidth: 190,
            height: 40,
            borderRadius: "4px",
            boxShadow: "none",
            flexShrink: 0,
            "&:hover": {
              backgroundColor: "#1565c0",
              boxShadow: "none",
            },
          }}
        >
          {isUpdating ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : (
            actionLabel
          )}
        </Button>
      )}
    </Box>
  );
}
