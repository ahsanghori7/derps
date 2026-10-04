import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getRequestWithOutBody, deleteRequest } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import {
    Box,
    Typography,
    Button,
    Chip,
    Tabs,
    Tab,
    Paper,
    Grid,
    IconButton,
    TextField,
    Link,
    FormControl,
    FormControlLabel,
    Select,
    MenuItem,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
} from "@mui/material";
import {
    ArrowBack,
    Phone,
    Email,
    Business,
    Close,
} from "@mui/icons-material";
import styled from "@mui/material/styles/styled";
import OpportunityPath from "./OpportunityPath";
import OpportunityStageForm from "./OpportunityStageForm";
import OpportunityTerminalFormDialog from "./OpportunityTerminalFormDialog";
import QuotationAuditLogsTab from "./QuotationAuditLogsTab";
import {
    getNextPipelineStageValue,
    getOpportunityTerminalOutcome,
    getPipelineStageIndex,
    OPPORTUNITY_STAGES,
    fetchPublishedStageFormDefinitionStrict,
    updateOpportunityStage,
    convertLeadToCrm,
    fetchLeadById,
    buildCrmAccountPayloadFromOpportunity,
    createCrmAccount,
    extractCreatedCrmAccountId,
    getFieldValueKey,
    OPPORTUNITY_DETAIL_INCLUDE_QUERY,
    extractOpportunityQuotations,
    pickPrimaryOpportunityQuotation,
    convertCrmQuotationToSalesOrder,
} from "../SalesFormBuilder/formDefinitionApi";
import { toast } from "react-toastify";
import { useSocket } from "../../Contexts/SocketContext";
import { usePageTitle } from "../../Hooks/usePageTitle";
import {
    ACTIVITY_TYPES,
    ACTIVITY_TYPE_COLORS,
    CALL_OUTCOMES,
    createLeadMeetingLink,
    createOpportunityActivity,
    createOpportunityMeeting,
    fetchActivityById,
    fetchOpportunityActivities,
    formatCallDuration,
    getActivityTypeLabel,
    getCallOutcomeLabel,
    getNowDatetimeLocal,
    getTomorrowDatetimeLocal,
    scheduleOpportunityFollowUp,
    sendOpportunityEmail,
} from "./crmActivityApi";
import {
    clickToCall,
    getGotoLines,
    getMyGotoLine,
    isGotoLineRequiredError,
    isGotoMissingPhoneError,
    isGotoNotConnectedError,
    isGotoPermissionError,
    parseGotoErrorMessage,
    reconcileGotoCallEvents,
    setMyGotoLine,
} from "../../Api/gotoApi";

const StyledPaper = styled(Paper)(() => ({
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "24px",
    marginBottom: "24px",
    backgroundColor: 'var(--dashboard-card-bg)',
}));

const InfoSection = styled(Box)(() => ({
    marginBottom: "24px",
}));

const InfoRow = styled(Box)(() => ({
    display: "flex",
    marginBottom: "16px",
    alignItems: "flex-start",
    borderBottom: "1px solid var(--dashboard-border)",
    paddingBottom: "12px",
    '@media (max-width: 480px)': {
        flexDirection: 'column',
        gap: '4px',
    },
}));

const InfoLabel = styled(Typography)(() => ({
    fontWeight: 600,
    color: "var(--dashboard-text-secondary)",
    minWidth: "180px",
    marginRight: "16px",
    fontSize: "14px",
    '@media (max-width: 480px)': {
        minWidth: 'unset',
        marginRight: 0,
    },
}));

const InfoValue = styled(Typography)(() => ({
    color: "var(--dashboard-text-primary)",
    fontSize: "14px",
    flex: 1,
}));

const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
);

const formatCloseDate = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
};

const formatAmount = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    }
    return String(value);
};

const formatStage = (stage) => {
    if (!stage) return "-";
    return String(stage).replace(/_/g, " ");
};

const formatBooleanDisplay = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
};

const formatProbability = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "string" && value.includes("%")) return value;
    return `${value}%`;
};

const isEmptyDisplayValue = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
};

const formatFormFieldDisplayValue = (value) => {
    if (isEmptyDisplayValue(value)) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item !== "string") return String(item);
                return item
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (char) => char.toUpperCase());
            })
            .join(", ");
    }
    if (typeof value === "object") {
        if (value.url) return value.name || value.url;
        if (value.name) return value.name;
        return JSON.stringify(value);
    }
    return String(value);
};

const isRenderableFormField = (field) => {
    const type = String(field?.type || "").toLowerCase();
    return type !== "heading" && Boolean(getFieldValueKey(field));
};

const buildFormDisplaySections = (forms = []) => {
    const submissions = Array.isArray(forms) ? forms : [];
    const sections = [];

    submissions.forEach((submission) => {
        const schemaSections = submission?.formDefinition?.schema?.sections;
        if (!Array.isArray(schemaSections) || !schemaSections.length) return;

        const submissionData =
            submission?.data && typeof submission.data === "object" ? submission.data : {};

        schemaSections.forEach((section) => {
            const sectionFields = (section.fields || [])
                .filter(isRenderableFormField)
                .map((field) => {
                    const key = getFieldValueKey(field);
                    const rawValue = submissionData[key];
                    return {
                        key,
                        label: field.label || key,
                        value: formatFormFieldDisplayValue(rawValue),
                        rawValue,
                        masked: Boolean(field.masked),
                    };
                });

            if (sectionFields.length) {
                sections.push({
                    id: section.id || section.title,
                    title: section.title || "Details",
                    fields: sectionFields,
                });
            }
        });
    });

    return sections;
};

const renderFormFieldValue = (field) => {
    if (field.masked && !isEmptyDisplayValue(field.rawValue)) {
        return "••••••••";
    }

    if (field.rawValue && typeof field.rawValue === "object" && field.rawValue.url) {
        return (
            <Link
                href={field.rawValue.url}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
            >
                {field.rawValue.name || "View file"}
            </Link>
        );
    }

    return field.value;
};

const renderDisplayFieldRows = (fields = []) =>
    fields.map((field) => (
        <InfoRow key={field.key}>
            <InfoLabel>{field.label}</InfoLabel>
            <InfoValue>{renderFormFieldValue(field)}</InfoValue>
        </InfoRow>
    ));

const mergeFormSubmissionData = (forms = []) =>
    (Array.isArray(forms) ? forms : []).reduce((acc, submission) => {
        if (submission?.data && typeof submission.data === "object") {
            return { ...acc, ...submission.data };
        }
        return acc;
    }, {});

const mergeOpportunityRecordData = (itemData = {}, forms = []) => {
    const inlineFormData =
        itemData.formData && typeof itemData.formData === "object"
            ? itemData.formData
            : {};
    const submissionData = mergeFormSubmissionData(forms);
    return { ...itemData, ...inlineFormData, ...submissionData };
};

const extractOpportunityResponse = (result) => {
    const payload = result?.data ?? result;
    if (!payload) return { opportunity: null, forms: [], quotations: [] };

    const quotationsFromPayload = extractOpportunityQuotations(payload);

    if (payload.opportunity) {
        const quotations = quotationsFromPayload.length
            ? quotationsFromPayload
            : extractOpportunityQuotations(payload.opportunity);

        return {
            opportunity: payload.opportunity,
            forms: payload.forms ?? payload.formSubmissions ?? [],
            quotations,
        };
    }

    const forms = payload.forms ?? payload.formSubmissions ?? [];
    const {
        forms: _forms,
        formSubmissions: _formSubmissions,
        opportunity: _opportunity,
        quotations: _quotations,
        crmQuotations: _crmQuotations,
        ...opportunityFields
    } = payload;

    return {
        opportunity: Object.keys(opportunityFields).length ? opportunityFields : payload,
        forms: Array.isArray(forms) ? forms : [],
        quotations: quotationsFromPayload,
    };
};

const pickCrmAccountId = (record) => {
    if (!record || typeof record !== "object") return null;
    const raw =
        record.crmAccountId
        ?? record.crm_account_id
        ?? record.accountId
        ?? record.account_id
        ?? record.customerId
        ?? record.customer_id
        ?? record.crmAccount?.id
        ?? record.account?.id
        ?? record.customer?.id;
    return raw != null && raw !== "" ? raw : null;
};

const pickLeadId = (record) => {
    if (!record || typeof record !== "object") return null;
    const raw =
        record.leadId
        ?? record.lead_id
        ?? record.linkedLeadId
        ?? record.sourceLeadId
        ?? record.source_lead_id
        ?? record.LeadId
        ?? record.lead?.id
        ?? record.lead?._id;
    return raw != null && raw !== "" ? raw : null;
};

const pickCrmAccountIdFromConvertResult = (result) => {
    const data = result?.data ?? result;
    return pickCrmAccountId(data) ?? pickCrmAccountId(data?.opportunity) ?? pickCrmAccountId(data?.lead) ?? null;
};

/** Board list row (`location.state.opportunity`) often has `leadId` while GET detail omits it — merge for Closed Won. */
const enrichOpportunityFromNavigationState = (record, locationState) => {
    if (!record) return record;
    const nav = locationState?.opportunity;
    if (!nav || typeof nav !== "object") return record;
    const merged = { ...nav, ...record };
    return {
        ...merged,
        leadId: pickLeadId(merged) ?? merged.leadId,
        crmAccountId: pickCrmAccountId(merged) ?? merged.crmAccountId,
        crmAccount: merged.crmAccount ?? merged.account,
        lead: merged.lead,
    };
};

const flattenBoardOpportunities = (columns = []) =>
    (Array.isArray(columns) ? columns : []).flatMap((column) => {
        const items =
            column?.opportunities ??
            column?.items ??
            column?.cards ??
            column?.data ??
            [];
        return Array.isArray(items) ? items : [];
    });

const parseBoardOpportunities = (result) => {
    const payload = result?.data ?? result;
    if (!payload) return [];

    if (Array.isArray(payload)) {
        return payload.some((item) => item?.opportunities || item?.items || item?.cards)
            ? flattenBoardOpportunities(payload)
            : payload;
    }

    if (Array.isArray(payload.opportunities)) return payload.opportunities;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data)) return parseBoardOpportunities({ data: payload.data });

    const columnCollections = [
        payload.columns,
        payload.stages,
        payload.board,
    ].find(Array.isArray);

    if (columnCollections) {
        return flattenBoardOpportunities(columnCollections);
    }

    if (payload.board && typeof payload.board === "object" && !Array.isArray(payload.board)) {
        return Object.values(payload.board).flatMap((items) =>
            Array.isArray(items) ? items : []
        );
    }

    return [];
};

const findOpportunityInBoard = (result, opportunityId) => {
    const idStr = String(opportunityId);
    return (
        parseBoardOpportunities(result).find(
            (item) =>
                String(item?.id ?? item?._id ?? item?.opportunityId ?? "") === idStr
        ) ?? null
    );
};

const getStageIndexFromValue = (stage) => getPipelineStageIndex(stage);

/** Highest step the user may open based on CRM link and API pipeline stage. */
const getMaxUnlockedStage = (record, crmLinked) => {
    const pipelineIdx = getStageIndexFromValue(record?.stage || record?.status);
    if (!crmLinked) return 0;
    return Math.max(0, pipelineIdx);
};

const getAgentDisplayName = (itemData = {}) => {
    const agent = itemData?.agent;
    if (agent && typeof agent === "object" && agent.name) return agent.name;
    if (typeof agent === "string" && agent.trim()) return agent.trim();
    return null;
};

const pickFirstPhone = (...candidates) => {
    for (const value of candidates) {
        const phone = String(value || "").trim();
        if (phone && phone !== "-") return phone;
    }
    return "";
};

const pickOpportunityPhoneFromRecord = (data = {}) =>
    pickFirstPhone(
        data.phone,
        data.phoneNumber,
        data.phone_number,
        data.mobile,
        data.contact?.phone,
        data.contact?.phoneNumber,
        data.contact?.phone_number,
        data.contact?.mobile,
        data.crmContact?.phone,
        data.crmContact?.phoneNumber,
        data.crmContact?.phone_number,
        data.crmContact?.mobile,
        data.crmContact?.contact?.phone,
        data.crmContact?.contact?.phoneNumber,
        data.crmContact?.contact?.phone_number,
        data.crmContact?.contact?.mobile,
        data.lead?.phone,
        data.lead?.phoneNumber,
        data.lead?.phone_number,
        data.lead?.mobile,
        data.crmAccount?.phone,
        data.crmAccount?.phoneNumber,
        data.crmAccount?.phone_number,
        data.crmAccount?.mobile,
        data.account?.phone,
        data.account?.phoneNumber
    );

const mapApiOpportunityToDetail = (itemData = {}, forms = []) => {
    const data = mergeOpportunityRecordData(itemData, forms);

    return {
        opportunityName: data.name || data.opportunityName || "-",
        agentName: getAgentDisplayName(data) || "-",
        companyName:
            data.crmAccount?.name?.trim() ||
            data.companyName ||
            data.account ||
            "-",
        phone: pickOpportunityPhoneFromRecord(data) || "-",
        email:
            data.email ||
            data.contact?.email ||
            data.crmContact?.contact?.email ||
            data.crmContact?.email ||
            "-",
        opportunityOwner:
            data.owner?.name ||
            data.ownerName ||
            data.opportunityOwner ||
            (data.ownerId ? `#${data.ownerId}` : "-"),
        isPrivate: formatBooleanDisplay(data.isPrivate ?? data.private),
        recordType: data.recordType || "-",
        type: data.type || "-",
        leadSource: data.leadSource || "-",
        orderNumber: data.orderNumber || "-",
        installationStatus: data.installationStatus || "-",
        trackingNumber: data.trackingNumber || "-",
        mainCompetitors: data.mainCompetitors || "-",
        currentGenerators: data.currentGenerators || data.currentGenerator || "-",
        amount: formatAmount(data.amount),
        expectedRevenue: formatAmount(data.expectedRevenue),
        closeDate: formatCloseDate(data.closeDate),
        nextStep: data.nextStep || "-",
        probability: formatProbability(data.probability),
        stage: formatStage(data.stage || data.status),
    };
};

const formatActivityTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const formatDueDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
};

const formatActivityDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const getCallOutcomeStyle = (outcome) => {
    const key = String(outcome || "").toLowerCase();
    const styles = {
        answered: { backgroundColor: "#D1FAE5", color: "#10B981" },
        no_answer: { backgroundColor: "#FEF3C7", color: "#F59E0B" },
        busy: { backgroundColor: "#FEE2E2", color: "#EF4444" },
        voicemail: { backgroundColor: "#EDE9FE", color: "#8B5CF6" },
        wrong_number: { backgroundColor: "#FEE2E2", color: "#DC2626" },
    };
    return styles[key] || { backgroundColor: "#F3F4F6", color: "#6B7280" };
};

const ActivityDetailRow = ({ label, children, alignStart = false }) => (
    <Box
        sx={{
            display: "flex",
            gap: 1.5,
            alignItems: alignStart ? "flex-start" : "center",
        }}
    >
        <Typography
            variant="caption"
            sx={{
                minWidth: 76,
                fontWeight: 600,
                color: "var(--dashboard-text-secondary)",
                flexShrink: 0,
                pt: alignStart ? 0.25 : 0,
            }}
        >
            {label}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
);

const toIsoDueDate = (localDateTime) => {
    if (!localDateTime) return null;
    const date = new Date(localDateTime);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
};

const getStageChipStyle = (stage) => {
    const normalized = stage?.toLowerCase() || "";

    if (normalized.includes("won")) {
        return { backgroundColor: "#D1FAE5", color: "#10B981" };
    }
    if (normalized.includes("lost")) {
        return { backgroundColor: "#FEE2E2", color: "#EF4444" };
    }
    if (normalized.includes("negotiation")) {
        return { backgroundColor: "#EDE9FE", color: "#8B5CF6" };
    }
    if (normalized.includes("quotation")) {
        return { backgroundColor: "#E0F2FE", color: "#0284C7" };
    }
    if (normalized.includes("proposal")) {
        return { backgroundColor: "#FEF3C7", color: "#F59E0B" };
    }

    return { backgroundColor: "#DBEAFE", color: "#3B82F6" };
};

const STAGE_SLUGS = ['proposal', 'quotation', 'negotiation', 'closed'];
const OPPORTUNITY_TAB = {
    DETAILS: 0,
    ACTIVITY: 1,
    LOGS: 2,
};
const stageIndexToSlug = (index) => STAGE_SLUGS[index] ?? STAGE_SLUGS[0];
const slugToStageIndex = (slug) => {
    const idx = STAGE_SLUGS.indexOf(String(slug || '').toLowerCase());
    return idx >= 0 ? idx : -1;
};
const QUOTATION_STAGE_INDEX = slugToStageIndex('quotation');
const GOTO_RECONCILE_LOOKBACK_HOURS = 2;

const sortActivitiesNewestFirst = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    return list.slice().sort((a, b) => {
        const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
};

const activityMatchesOpportunity = (activity, opportunityId) => {
    if (!activity || opportunityId == null) return false;
    const entityType = String(activity.entityType || activity.entity_type || "").toLowerCase();
    const entityId = activity.entityId ?? activity.entity_id;
    if (entityType && entityType !== "opportunity") return false;
    if (entityId == null) return true;
    return String(entityId) === String(opportunityId);
};

const OpportunityDetail = () => {
    const { id, stage: urlStagePart } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const { socket } = useSocket();
    const [tabValue, setTabValue] = useState(0);
    const [activitySubTab, setActivitySubTab] = useState(0);
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [activitySubmitting, setActivitySubmitting] = useState(false);
    const [activitySubject, setActivitySubject] = useState("");
    const [activityDescription, setActivityDescription] = useState("");
    const [activityDueDate, setActivityDueDate] = useState(getTomorrowDatetimeLocal);
    const [activityCallAt, setActivityCallAt] = useState(getNowDatetimeLocal);
    const [activityCallDurationMinutes, setActivityCallDurationMinutes] = useState("");
    const [activityCallOutcome, setActivityCallOutcome] = useState("");
    const [activityCallNotes, setActivityCallNotes] = useState("");
    const [activityScheduledAt, setActivityScheduledAt] = useState(getNowDatetimeLocal);
    const [activitySendInvite, setActivitySendInvite] = useState(true);
    const [activityEmailCcList, setActivityEmailCcList] = useState([]);
    const [activityEmailCcInput, setActivityEmailCcInput] = useState("");
    const [activityEmailAttachments, setActivityEmailAttachments] = useState([]);
    const [activityMeetingLink, setActivityMeetingLink] = useState("");
    const [activityGeneratingLink, setActivityGeneratingLink] = useState(false);
    const [activitySendFollowUpEmail, setActivitySendFollowUpEmail] = useState(true);
    const [activitySubjectError, setActivitySubjectError] = useState(false);
    const [gotoCalling, setGotoCalling] = useState(false);
    const [gotoPolling, setGotoPolling] = useState(false);
    const [gotoActivityId, setGotoActivityId] = useState(null);
    const [gotoLine, setGotoLine] = useState(null);
    const [gotoLines, setGotoLines] = useState([]);
    const [gotoLinesLoading, setGotoLinesLoading] = useState(false);
    const [linePickerOpen, setLinePickerOpen] = useState(false);
    const [selectedGotoLineId, setSelectedGotoLineId] = useState("");
    const [gotoLineSaving, setGotoLineSaving] = useState(false);
    const [pendingCallAfterLine, setPendingCallAfterLine] = useState(false);
    const [activeStage, setActiveStage] = useState(0);
    const [stageUpdating, setStageUpdating] = useState(false);
    const [convertSubmitting, setConvertSubmitting] = useState(false);
    const [convertToSalesOrderSubmitting, setConvertToSalesOrderSubmitting] = useState(false);
    const [confirmConvertSalesOrderOpen, setConfirmConvertSalesOrderOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [opportunityRecord, setOpportunityRecord] = useState(null);
    const [opportunityForms, setOpportunityForms] = useState([]);
    const [opportunityQuotations, setOpportunityQuotations] = useState([]);
    const [terminalFormDialog, setTerminalFormDialog] = useState({ open: false, stageValue: null });
    const [stageFormValid, setStageFormValid] = useState(false);
    const stageFormRef = useRef(null);
    const locationRef = useRef(location);
    const initialUrlStageRef = useRef(slugToStageIndex(urlStagePart));
    const gotoActivityIdRef = useRef(null);

    const selectedActivityType = ACTIVITY_TYPES[activitySubTab]?.value || "call";
    const isFollowUpActivity = selectedActivityType === "follow_up";
    const isCallActivity = selectedActivityType === "call";
    const isEmailActivity = selectedActivityType === "email";
    const isMeetingActivity = selectedActivityType === "meeting";

    const fetchActivities = useCallback(() => {
        if (!id || !accessToken) return Promise.resolve([]);

        setActivitiesLoading(true);
        return fetchOpportunityActivities(id, accessToken)
            .then((rows) => {
                const sorted = sortActivitiesNewestFirst(rows);
                setActivities(sorted);
                return sorted;
            })
            .catch(() => {
                setActivities([]);
                return [];
            })
            .finally(() => {
                setActivitiesLoading(false);
            });
    }, [id, accessToken]);

    const fetchOpportunity = useCallback(async () => {
        if (!id || !accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const applyOpportunityRecord = (record, forms = [], quotations = []) => {
            const loc = locationRef.current;
            const enriched = enrichOpportunityFromNavigationState(record, loc);
            setOpportunityRecord(enriched);
            setOpportunityForms(Array.isArray(forms) ? forms : []);
            setOpportunityQuotations(Array.isArray(quotations) ? quotations : []);
            const crmLinked = Boolean(pickCrmAccountId(enriched));
            const pipelineIdx = getStageIndexFromValue(enriched?.stage || enriched?.status);
            const maxUnlocked = getMaxUnlockedStage(enriched, crmLinked);

            const requestedStage = loc.state?.initialStage ?? loc.state?.activeStage;
            const openQuotationTab = loc.state?.fromRoute === "quotations";
            let nextActiveStage = Math.min(Math.max(0, pipelineIdx), maxUnlocked);

            if (openQuotationTab && requestedStage != null) {
                const stage = Number(requestedStage);
                if (Number.isFinite(stage)) {
                    nextActiveStage = Math.min(Math.max(0, stage), maxUnlocked);
                }
            }

            if (initialUrlStageRef.current >= 0 && initialUrlStageRef.current <= maxUnlocked) {
                nextActiveStage = initialUrlStageRef.current;
            }
            initialUrlStageRef.current = -1;

            setActiveStage(nextActiveStage);
            navigate(`/home/opportunities/${id}/${stageIndexToSlug(nextActiveStage)}`, { replace: true });
        };

        const applyFallback = () => {
            const fallback = locationRef.current.state?.opportunity;
            if (fallback) {
                applyOpportunityRecord(fallback, [], []);
            } else {
                setOpportunityRecord(null);
                setOpportunityForms([]);
                setOpportunityQuotations([]);
            }
        };

        try {
            const boardResult = await getRequestWithOutBody(
                `${baseURl}crm-opportunity/board`,
                accessToken
            );
            const boardOpportunity = findOpportunityInBoard(boardResult, id);

            if (boardOpportunity) {
                try {
                    const detailResult = await getRequestWithOutBody(
                        `${baseURl}crm-opportunity/${id}${OPPORTUNITY_DETAIL_INCLUDE_QUERY}`,
                        accessToken
                    );
                    const { opportunity, forms, quotations } = extractOpportunityResponse(detailResult);
                    applyOpportunityRecord(
                        opportunity ? { ...boardOpportunity, ...opportunity } : boardOpportunity,
                        forms,
                        quotations
                    );
                } catch {
                    applyOpportunityRecord(boardOpportunity, [], []);
                }
                return;
            }

            const detailResult = await getRequestWithOutBody(
                `${baseURl}crm-opportunity/${id}${OPPORTUNITY_DETAIL_INCLUDE_QUERY}`,
                accessToken
            );
            const { opportunity, forms, quotations } = extractOpportunityResponse(detailResult);
            applyOpportunityRecord(opportunity, forms, quotations);
        } catch {
            applyFallback();
        } finally {
            setLoading(false);
        }
    }, [id, accessToken]);

    useEffect(() => {
        fetchOpportunity();
    }, [fetchOpportunity]);

    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    useEffect(() => {
        if (tabValue === OPPORTUNITY_TAB.ACTIVITY) {
            fetchActivities();
        }
    }, [tabValue, fetchActivities]);

    useEffect(() => {
        if (!accessToken || tabValue !== OPPORTUNITY_TAB.ACTIVITY) return;

        getMyGotoLine(accessToken)
            .then((line) => setGotoLine(line))
            .catch(() => setGotoLine(null));
    }, [accessToken, tabValue]);

    useEffect(() => {
        gotoActivityIdRef.current = gotoActivityId;
    }, [gotoActivityId]);

    useEffect(() => {
        if (!id || !accessToken) return;

        let cancelled = false;

        const syncMissedCallEvents = async () => {
            await fetchActivities();
            if (cancelled) return;

            try {
                await reconcileGotoCallEvents(accessToken, {
                    lookbackHours: GOTO_RECONCILE_LOOKBACK_HOURS,
                });
            } catch {
                return;
            }

            if (!cancelled) {
                await fetchActivities();
            }
        };

        syncMissedCallEvents();

        return () => {
            cancelled = true;
        };
    }, [id, accessToken, fetchActivities]);

    useEffect(() => {
        if (!socket || !id || !accessToken) return;

        const handleGotoCallUpdated = async (payload = {}) => {
            const activityId = payload.activityId ?? payload.activity_id;
            const entityType = payload.entityType ?? payload.entity_type;
            const entityId = payload.entityId ?? payload.entity_id;
            const sameOpportunity =
                String(entityType || "").toLowerCase() === "opportunity" &&
                String(entityId) === String(id);
            const samePendingCall =
                activityId != null && String(activityId) === String(gotoActivityIdRef.current);

            if (!sameOpportunity && !samePendingCall) return;

            try {
                if (activityId) {
                    const activity = await fetchActivityById(activityId, accessToken);
                    const record = activity?.data ?? activity;
                    if (record && activityMatchesOpportunity(record, id)) {
                        setActivities((prev) => {
                            const withoutCurrent = prev.filter(
                                (item) => String(item?.id) !== String(record.id)
                            );
                            return sortActivitiesNewestFirst([record, ...withoutCurrent]);
                        });
                    }
                }

                await fetchActivities();

                if (samePendingCall) {
                    setGotoPolling(false);
                    setGotoActivityId(null);
                    toast.success("Call completed. Duration and outcome updated.");
                }
            } catch {
                fetchActivities();
            }
        };

        socket.on("goto:call-updated", handleGotoCallUpdated);
        return () => {
            socket.off("goto:call-updated", handleGotoCallUpdated);
        };
    }, [socket, id, accessToken, fetchActivities]);

    const resetActivityForm = () => {
        setActivitySubject("");
        setActivityDescription("");
        setActivityDueDate(getTomorrowDatetimeLocal());
        setActivityCallAt(getNowDatetimeLocal());
        setActivityCallDurationMinutes("");
        setActivityCallOutcome("");
        setActivityCallNotes("");
        setActivityScheduledAt(getNowDatetimeLocal());
        setActivitySendInvite(true);
        setActivityEmailCcList([]);
        setActivityEmailCcInput("");
        setActivityEmailAttachments([]);
        setActivityMeetingLink("");
        setActivityGeneratingLink(false);
        setActivitySendFollowUpEmail(true);
        setActivitySubjectError(false);
    };

    const handleGenerateFollowUpMeetingLink = async () => {
        if (!accessToken || activityGeneratingLink) return;

        setActivityGeneratingLink(true);
        try {
            const link = await createLeadMeetingLink(accessToken);
            setActivityMeetingLink(link);
            toast.success("Meeting link generated");
        } catch (error) {
            toast.error(error?.message || "Failed to generate meeting link");
        } finally {
            setActivityGeneratingLink(false);
        }
    };

    const handleActivityAttachmentChange = (event) => {
        const selected = Array.from(event.target.files || []);
        if (selected.length > 0) {
            setActivityEmailAttachments((prev) => [...prev, ...selected]);
        }
        event.target.value = "";
    };

    const handleRemoveActivityAttachment = (indexToRemove) => {
        setActivityEmailAttachments((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
    };

    const handleAddActivityCcEmail = (email) => {
        const trimmedEmail = String(email || "").trim();
        if (!trimmedEmail) return;
        setActivityEmailCcList((prev) =>
            prev.includes(trimmedEmail) ? prev : [...prev, trimmedEmail]
        );
        setActivityEmailCcInput("");
    };

    const handleRemoveActivityCcEmail = (emailToRemove) => {
        setActivityEmailCcList((prev) =>
            prev.filter((email) => email !== emailToRemove)
        );
    };

    const handleActivityCcInputKeyDown = (event) => {
        if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
            event.preventDefault();
            handleAddActivityCcEmail(activityEmailCcInput);
        } else if (
            event.key === "Backspace" &&
            !activityEmailCcInput &&
            activityEmailCcList.length > 0
        ) {
            setActivityEmailCcList((prev) => prev.slice(0, -1));
        }
    };

    const handleSubmitActivity = async () => {
        if (!id || !accessToken || activitySubmitting) return;

        if (!activitySubject.trim()) {
            setActivitySubjectError(true);
            toast.error(
                isEmailActivity || isMeetingActivity ? "Subject is required" : "Title is required"
            );
            return;
        }

        if (isEmailActivity && !activityDescription.trim()) {
            toast.error("Message is required");
            return;
        }

        if (isMeetingActivity && !activityScheduledAt) {
            toast.error("Scheduled date & time is required");
            return;
        }

        setActivitySubmitting(true);
        try {
            if (isEmailActivity) {
                const contactEmail =
                    opportunity?.email && opportunity.email !== "-"
                        ? opportunity.email
                        : null;

                if (!contactEmail) {
                    toast.error("Contact email not found");
                    return;
                }

                const pendingCc = activityEmailCcInput.trim();
                const ccEmails = pendingCc
                    ? activityEmailCcList.includes(pendingCc)
                        ? activityEmailCcList
                        : [...activityEmailCcList, pendingCc]
                    : activityEmailCcList;

                await sendOpportunityEmail({
                    opportunityId: id,
                    subject: activitySubject,
                    message: activityDescription,
                    to: contactEmail,
                    cc: ccEmails,
                    files: activityEmailAttachments,
                    token: accessToken,
                });
                toast.success("Email sent successfully");
            } else if (isMeetingActivity) {
                const contactEmail =
                    opportunity?.email && opportunity.email !== "-"
                        ? opportunity.email
                        : null;

                if (activitySendInvite && !contactEmail) {
                    toast.error("Contact email not found");
                    return;
                }

                const scheduledAt = toIsoDueDate(activityScheduledAt);
                if (!scheduledAt) {
                    toast.error("Invalid scheduled date & time");
                    return;
                }

                await createOpportunityMeeting({
                    opportunityId: id,
                    subject: activitySubject,
                    description: activityDescription,
                    scheduledAt,
                    to: contactEmail || undefined,
                    sendInvite: activitySendInvite,
                    token: accessToken,
                });
                toast.success("Meeting created successfully");
            } else if (isFollowUpActivity) {
                const contactEmail =
                    opportunity?.email && opportunity.email !== "-"
                        ? opportunity.email
                        : null;

                if (activitySendFollowUpEmail && !contactEmail) {
                    toast.error("Contact email not found");
                    return;
                }

                let meetingLink = activityMeetingLink.trim();
                if (activitySendFollowUpEmail && !meetingLink) {
                    try {
                        meetingLink = await createLeadMeetingLink(accessToken);
                        setActivityMeetingLink(meetingLink);
                    } catch (error) {
                        toast.error(error?.message || "Failed to generate meeting link");
                        return;
                    }
                }

                const notes = activityDescription.trim();
                const descriptionWithLink = meetingLink
                    ? notes
                        ? `${notes}\n\nMeeting link: ${meetingLink}`
                        : `Meeting link: ${meetingLink}`
                    : notes || undefined;

                await scheduleOpportunityFollowUp({
                    opportunityId: id,
                    subject: activitySubject,
                    description: descriptionWithLink,
                    dueDate: toIsoDueDate(activityDueDate) || null,
                    to: contactEmail || undefined,
                    sendInvite: activitySendFollowUpEmail,
                    meetingLink: meetingLink || undefined,
                    token: accessToken,
                });
                toast.success("Follow-up scheduled successfully");
            } else {
                const callDurationMinutes = Number(activityCallDurationMinutes);
                const callDurationSeconds =
                    isCallActivity && Number.isFinite(callDurationMinutes) && callDurationMinutes > 0
                        ? Math.round(callDurationMinutes * 60)
                        : null;

                await createOpportunityActivity({
                    opportunityId: id,
                    type: selectedActivityType,
                    subject: activitySubject,
                    description: isCallActivity ? null : activityDescription,
                    dueDate: null,
                    callAt: isCallActivity ? toIsoDueDate(activityCallAt) : null,
                    callDurationSeconds,
                    callOutcome: isCallActivity ? activityCallOutcome || null : null,
                    callNotes: isCallActivity ? activityCallNotes : null,
                    token: accessToken,
                });
                toast.success("Activity logged successfully");
            }
            resetActivityForm();
            fetchActivities();
        } catch (error) {
            toast.error(
                error?.message ||
                    (isEmailActivity
                        ? "Failed to send email"
                        : isMeetingActivity
                          ? "Failed to create meeting"
                          : isFollowUpActivity
                            ? "Failed to schedule follow-up"
                            : "Failed to log activity")
            );
        } finally {
            setActivitySubmitting(false);
        }
    };

    const opportunity = useMemo(() => {
        if (opportunityRecord) {
            return mapApiOpportunityToDetail(opportunityRecord, opportunityForms);
        }
        const stateOpportunity = location.state?.opportunity;
        return stateOpportunity
            ? mapApiOpportunityToDetail(stateOpportunity, [])
            : null;
    }, [opportunityRecord, opportunityForms, location.state]);

    const getOpportunityPhoneNumber = useCallback(() => {
        const merged = mergeOpportunityRecordData(
            opportunityRecord || {},
            opportunityForms
        );
        return (
            pickOpportunityPhoneFromRecord(merged) ||
            pickFirstPhone(opportunity?.phone)
        );
    }, [opportunityRecord, opportunityForms, opportunity]);

    const markGotoCallInProgress = useCallback((activityId) => {
        if (!activityId) return;
        setGotoActivityId(activityId);
        setGotoPolling(true);
    }, []);

    const openGotoLinePicker = useCallback(
        async ({ thenCall = false } = {}) => {
            if (!accessToken) return;
            setPendingCallAfterLine(thenCall);
            setLinePickerOpen(true);
            setGotoLinesLoading(true);
            try {
                const lines = await getGotoLines(accessToken);
                const list = Array.isArray(lines) ? lines : [];
                setGotoLines(list);
                setSelectedGotoLineId(gotoLine?.lineId || list[0]?.lineId || "");
            } catch (error) {
                const message = parseGotoErrorMessage(error);
                if (isGotoNotConnectedError(message)) {
                    setLinePickerOpen(false);
                    setPendingCallAfterLine(false);
                    toast.error("GoTo is not connected. Ask an admin to connect it under Settings → GoTo Connect.");
                } else {
                    toast.error(message || "Failed to load GoTo lines");
                }
            } finally {
                setGotoLinesLoading(false);
            }
        },
        [accessToken, gotoLine]
    );

    const placeGotoCall = useCallback(async () => {
        if (!id || !accessToken || gotoCalling) return;

        const phoneNumber = getOpportunityPhoneNumber();
        if (!phoneNumber) {
            toast.error("No phone number on this opportunity. Add a phone number first.");
            return;
        }

        setGotoCalling(true);
        try {
            const result = await clickToCall(accessToken, {
                entityType: "opportunity",
                entityId: Number(id),
                phoneNumber,
                subject: activitySubject.trim() || undefined,
            });

            const activity = result?.activity || result?.data?.activity;
            const activityId = activity?.id || result?.activityId;
            toast.success("Calling… answer your GoTo app");
            setTabValue(OPPORTUNITY_TAB.ACTIVITY);
            setActivitySubTab(0);
            fetchActivities();

            if (activityId) {
                markGotoCallInProgress(activityId);
            }
        } catch (error) {
            const message = parseGotoErrorMessage(error);
            if (isGotoLineRequiredError(message)) {
                await openGotoLinePicker({ thenCall: true });
                return;
            }
            if (isGotoNotConnectedError(message)) {
                toast.error("GoTo is not connected. Ask an admin to connect it under Settings → GoTo Connect.");
                return;
            }
            if (isGotoMissingPhoneError(message)) {
                toast.error("No phone number on this opportunity. Add a phone number first.");
                return;
            }
            if (isGotoPermissionError(message)) {
                toast.error(
                    "GoTo says you don’t have permission to make this call. That is a GoTo Admin outbound/international dialing setting, not a CRM issue."
                );
                return;
            }
            toast.error(message || "Failed to place GoTo call");
        } finally {
            setGotoCalling(false);
        }
    }, [
        id,
        accessToken,
        gotoCalling,
        getOpportunityPhoneNumber,
        activitySubject,
        fetchActivities,
        markGotoCallInProgress,
        openGotoLinePicker,
    ]);

    const handleGotoCall = useCallback(async () => {
        setTabValue(OPPORTUNITY_TAB.ACTIVITY);
        setActivitySubTab(0);
        if (!gotoLine?.lineId) {
            await openGotoLinePicker({ thenCall: true });
            return;
        }
        await placeGotoCall();
    }, [gotoLine, openGotoLinePicker, placeGotoCall]);

    const handleSaveGotoLine = useCallback(async () => {
        if (!accessToken || gotoLineSaving) return;
        const selected = gotoLines.find((line) => line.lineId === selectedGotoLineId);
        if (!selected?.lineId) {
            toast.error("Select your GoTo line first");
            return;
        }

        setGotoLineSaving(true);
        try {
            await setMyGotoLine(accessToken, {
                lineId: selected.lineId,
                extensionNumber: selected.extensionNumber,
            });
            setGotoLine(selected);
            toast.success(
                selected.extensionNumber
                    ? `GoTo line set to ext ${selected.extensionNumber}`
                    : "GoTo line saved"
            );
            setLinePickerOpen(false);
            if (pendingCallAfterLine) {
                setPendingCallAfterLine(false);
                await placeGotoCall();
            }
        } catch (error) {
            toast.error(parseGotoErrorMessage(error) || "Failed to save GoTo line");
        } finally {
            setGotoLineSaving(false);
        }
    }, [
        accessToken,
        gotoLineSaving,
        gotoLines,
        selectedGotoLineId,
        pendingCallAfterLine,
        placeGotoCall,
    ]);

    const isCrmAccountLinked = useMemo(
        () =>
            Boolean(
                pickCrmAccountId(
                    enrichOpportunityFromNavigationState(opportunityRecord || {}, location)
                )
            ),
        [opportunityRecord, location]
    );

    const enrichedOpportunityRecord = useMemo(
        () => enrichOpportunityFromNavigationState(opportunityRecord || {}, location),
        [opportunityRecord, location]
    );

    const maxUnlockedStage = useMemo(
        () => getMaxUnlockedStage(enrichedOpportunityRecord, isCrmAccountLinked),
        [enrichedOpportunityRecord, isCrmAccountLinked]
    );

    const terminalOutcome = useMemo(
        () => getOpportunityTerminalOutcome(enrichedOpportunityRecord),
        [enrichedOpportunityRecord]
    );

    const formDisplaySections = useMemo(
        () => buildFormDisplaySections(opportunityForms),
        [opportunityForms]
    );

    const hasFormSections = formDisplaySections.length > 0;

    const primaryQuotation = useMemo(
        () => pickPrimaryOpportunityQuotation(opportunityQuotations),
        [opportunityQuotations]
    );

    const quotationId = primaryQuotation?.id ?? primaryQuotation?._id ?? null;
    const hasCreatedQuotation = quotationId != null && quotationId !== "";
    const isQuotationStageView = activeStage === QUOTATION_STAGE_INDEX;
    const showLogsTab = isQuotationStageView && hasCreatedQuotation;
    const isClosedWon = terminalOutcome === "closed_won";
    const isClosed = terminalOutcome === "closed_won" || terminalOutcome === "closed_lost";
    const canDeleteOpportunity = !isClosed;
    const showConvertToSalesOrderButton =
        isClosedWon && hasCreatedQuotation && !primaryQuotation?.convertedToSalesOrder;

    useEffect(() => {
        if (!showLogsTab && tabValue === OPPORTUNITY_TAB.LOGS) {
            setTabValue(OPPORTUNITY_TAB.DETAILS);
        }
    }, [showLogsTab, tabValue]);

    const isViewingCompletedStage = activeStage < maxUnlockedStage;

    const ensureCurrentStageSaved = useCallback(async () => {
        const saved = await stageFormRef.current?.validateAndSave?.();
        return saved !== false;
    }, []);

    const handleStageStepChange = useCallback(
        async (index) => {
            if (index > maxUnlockedStage) return;

            const saved = await ensureCurrentStageSaved();
            if (!saved) return;

            setActiveStage(index);
            navigate(`/home/opportunities/${id}/${stageIndexToSlug(index)}`, { replace: true });
        },
        [id, maxUnlockedStage, navigate, ensureCurrentStageSaved]
    );

    usePageTitle(opportunity?.opportunityName || "Opportunity", location);

    const handleConvertToSalesOrder = async () => {
        if (!quotationId || !accessToken || convertToSalesOrderSubmitting) return;

        setConfirmConvertSalesOrderOpen(false);
        setConvertToSalesOrderSubmitting(true);
        try {
            const result = await convertCrmQuotationToSalesOrder(quotationId, accessToken);
            toast.success("Converted to sale order successfully.");

            // Mark converted locally right away so the button hides even if id
            // extraction/navigation below fails — prevents a second conversion.
            setOpportunityQuotations((prev) =>
                prev.map((q) =>
                    (q?.id ?? q?._id) === quotationId
                        ? { ...q, convertedToSalesOrder: true }
                        : q
                )
            );

            const salesOrderId =
                result?.data?.id
                ?? result?.data?.salesOrderId
                ?? result?.id
                ?? result?.salesOrderId
                ?? null;
            if (salesOrderId) {
                navigate(`/home/salesOrder/${salesOrderId}`, {
                    state: { salesOrder: result?.data ?? result },
                });
            }
        } catch (err) {
            toast.error(err.message || "Failed to convert to sale order");
        } finally {
            setConvertToSalesOrderSubmitting(false);
        }
    };

    const handleDeleteOpportunity = () => {
        if (!canDeleteOpportunity || deleting) return;
        setShowDeleteModal(true);
    };

    const confirmDeleteOpportunity = async () => {
        if (!id || !accessToken || !canDeleteOpportunity || deleting) return;

        setDeleting(true);
        try {
            await deleteRequest(
                `${baseURl}crm-opportunity/${encodeURIComponent(id)}`,
                accessToken
            );

            const leadId = pickLeadId(enrichedOpportunityRecord);
            if (leadId) {
                try {
                    await deleteRequest(
                        `${baseURl}lead/${encodeURIComponent(leadId)}`,
                        accessToken
                    );
                } catch (leadErr) {
                    toast.error(
                        leadErr?.message ||
                            "Opportunity deleted, but linked lead could not be deleted."
                    );
                    setShowDeleteModal(false);
                    navigate("/home/opportunities/");
                    return;
                }
            }

            toast.success("Opportunity deleted successfully");
            setShowDeleteModal(false);
            navigate("/home/opportunities/");
        } catch (error) {
            toast.error(error?.message || "Failed to delete opportunity");
        } finally {
            setDeleting(false);
        }
    };

    const handleConvertToOpportunity = async () => {
        if (!id || !accessToken || convertSubmitting) return;

        const formSaved = await ensureCurrentStageSaved();
        if (!formSaved) return;

        const base = enrichOpportunityFromNavigationState(opportunityRecord || {}, location);
        const record = mergeOpportunityRecordData(base, opportunityForms);
        const nextStageValue = getNextPipelineStageValue(0);
        if (!nextStageValue) return;

        setConvertSubmitting(true);
        try {
            const payload = buildCrmAccountPayloadFromOpportunity(record);
            const createRes = await createCrmAccount(payload, accessToken);
            const accountId = extractCreatedCrmAccountId(createRes);
            if (accountId == null || accountId === "") {
                throw new Error("CRM account was created but no account id was returned");
            }
            await updateOpportunityStage(id, nextStageValue, accessToken, { crmAccountId: accountId });
            await fetchOpportunity();
            const nextLabel = OPPORTUNITY_STAGES[getStageIndexFromValue(nextStageValue)] || nextStageValue;
            toast.success(`Converted to opportunity and moved to ${nextLabel}.`);
        } catch (err) {
            toast.error(err.message || "Convert to opportunity failed");
        } finally {
            setConvertSubmitting(false);
        }
    };

    const resolveClosedWonPutExtra = async () => {
        const recordForClosedWon = enrichOpportunityFromNavigationState(
            opportunityRecord || {},
            location
        );
        let accountId = pickCrmAccountId(recordForClosedWon);
        const leadId = pickLeadId(recordForClosedWon);

        if (!accountId && leadId) {
            try {
                const convertResult = await convertLeadToCrm(leadId, accessToken);
                accountId = pickCrmAccountIdFromConvertResult(convertResult) ?? accountId;
            } catch (convertErr) {
                toast.error(
                    convertErr.message
                    || "Lead must be converted to a CRM account before marking Closed Won."
                );
                return null;
            }

            if (!accountId) {
                try {
                    const detailResult = await getRequestWithOutBody(
                        `${baseURl}crm-opportunity/${id}${OPPORTUNITY_DETAIL_INCLUDE_QUERY}`,
                        accessToken
                    );
                    const { opportunity, forms, quotations } = extractOpportunityResponse(detailResult);
                    if (opportunity) {
                        const enriched = enrichOpportunityFromNavigationState(
                            { ...(opportunityRecord || {}), ...opportunity },
                            location
                        );
                        setOpportunityRecord(enriched);
                        accountId = pickCrmAccountId(enriched);
                    }
                    if (Array.isArray(forms)) {
                        setOpportunityForms(forms);
                    }
                    if (Array.isArray(quotations)) {
                        setOpportunityQuotations(quotations);
                    }
                } catch {
                    // ignore; try lead record next
                }
            }

            if (!accountId) {
                try {
                    const { lead } = await fetchLeadById(leadId, accessToken, {
                        includeForms: false,
                    });
                    accountId = pickCrmAccountId(lead);
                } catch {
                    // ignore
                }
            }
        }

        return accountId ? { crmAccountId: accountId } : {};
    };

    const handleMarkComplete = async () => {
        if (activeStage === 0 && !isCrmAccountLinked) return;
        if (activeStage > 1) return;

        const formSaved = await ensureCurrentStageSaved();
        if (!formSaved) return;

        const nextStageValue = getNextPipelineStageValue(activeStage);
        if (!nextStageValue || !id || !accessToken) return;

        const nextStageIndex = getStageIndexFromValue(nextStageValue);
        const nextLabel = OPPORTUNITY_STAGES[nextStageIndex] || nextStageValue;

        setStageUpdating(true);
        try {
            await updateOpportunityStage(id, nextStageValue, accessToken, {});
            setActiveStage(nextStageIndex);
            navigate(`/home/opportunities/${id}/${stageIndexToSlug(nextStageIndex)}`, { replace: true });
            setOpportunityRecord((prev) => (prev ? { ...prev, stage: nextStageValue } : prev));
            toast.success(`Moved to ${nextLabel}`);
        } catch (error) {
            toast.error(error.message || "Failed to update opportunity stage");
        } finally {
            setStageUpdating(false);
        }
    };

    const executeClosedStageUpdate = async (stageValue) => {
        if (!stageValue || !id || !accessToken) return false;

        const targetIndex = getStageIndexFromValue(stageValue);
        setStageUpdating(true);
        try {
            let putExtra = {};
            if (String(stageValue).toLowerCase() === "closed_won") {
                const extra = await resolveClosedWonPutExtra();
                if (extra === null) return false;
                putExtra = extra;
            }

            await updateOpportunityStage(id, stageValue, accessToken, putExtra);
            setActiveStage(targetIndex);
            navigate(`/home/opportunities/${id}/${stageIndexToSlug(targetIndex)}`, { replace: true });
            setOpportunityRecord((prev) =>
                prev ? { ...prev, stage: stageValue, ...putExtra } : prev
            );
            toast.success("Stage updated successfully");
            return true;
        } catch (error) {
            toast.error(error.message || "Failed to update opportunity stage");
            return false;
        } finally {
            setStageUpdating(false);
        }
    };

    const handleSelectClosedStage = async (stageValue) => {
        if (!stageValue || !id || !accessToken || stageUpdating) return;

        const formSaved = await ensureCurrentStageSaved();
        if (!formSaved) return;

        let formDef;
        try {
            formDef = await fetchPublishedStageFormDefinitionStrict(stageValue, accessToken);
        } catch {
            toast.error("Could not verify the closing form. Please try again.");
            return;
        }

        if (formDef) {
            setTerminalFormDialog({ open: true, stageValue });
            return;
        }

        await executeClosedStageUpdate(stageValue);
    };

    const handleTerminalFormConfirm = async (stageValue) => {
        const resolvedStage = stageValue || terminalFormDialog.stageValue;
        if (!resolvedStage) return false;

        const updated = await executeClosedStageUpdate(resolvedStage);
        if (!updated) return false;

        setTerminalFormDialog({ open: false, stageValue: null });
        await handleStageSubmissionSaved();
        return true;
    };

    const handleTerminalFormClose = () => {
        if (stageUpdating) return;
        setTerminalFormDialog({ open: false, stageValue: null });
    };

    const handleStageSubmissionSaved = useCallback(async () => {
        if (!id || !accessToken) return;

        try {
            const detailResult = await getRequestWithOutBody(
                `${baseURl}crm-opportunity/${id}${OPPORTUNITY_DETAIL_INCLUDE_QUERY}`,
                accessToken
            );
            const { opportunity, forms, quotations } = extractOpportunityResponse(detailResult);
            if (opportunity) {
                setOpportunityRecord((prev) =>
                    enrichOpportunityFromNavigationState({ ...(prev || {}), ...opportunity }, location)
                );
            }
            setOpportunityForms(Array.isArray(forms) ? forms : []);
            setOpportunityQuotations(Array.isArray(quotations) ? quotations : []);
        } catch {
            // Keep current values if refresh fails after save.
        }
    }, [id, accessToken, location]);

    const renderField = (field) => (
        <InfoRow key={field.label}>
            <InfoLabel>{field.label}</InfoLabel>
            {field.isStage ? (
                <Chip
                    label={field.value}
                    size="small"
                    sx={{
                        ...getStageChipStyle(field.value),
                        fontWeight: 600,
                        fontSize: "12px",
                        textTransform: "capitalize",
                    }}
                />
            ) : (
                <InfoValue>{field.value}</InfoValue>
            )}
        </InfoRow>
    );

    if (loading) {
        return (
            <Box
                sx={{
                    px: 3,
                    pb: 3,
                    backgroundColor: "var(--dashboard-bg)",
                    minHeight: "100vh",
                    marginTop: "-65px",
                    pt: 2,
                }}
            >
                <Loader message="Loading opportunity..." subMessage="Please wait" />
            </Box>
        );
    }

    if (!opportunity) {
        return (
            <Box
                sx={{
                    px: 3,
                    pb: 3,
                    backgroundColor: "var(--dashboard-bg)",
                    minHeight: "100vh",
                    marginTop: "-65px",
                    pt: 2,
                }}
            >
                <IconButton
                    onClick={() => navigate("/home/opportunities/")}
                    sx={{ mb: 2, color: 'var(--sidebar-text-primary)' }}
                >
                    <ArrowBack />
                </IconButton>
                <NoDataFound
                    title="Opportunity Not Found"
                    description="Unable to load opportunity details."
                />
            </Box>
        );
    }

    const leftColumnFields = [
        { label: "Agent", value: opportunity.agentName },
        { label: "Opportunity Owner", value: opportunity.opportunityOwner },
        { label: "Private", value: opportunity.isPrivate },
        { label: "Opportunity Name", value: opportunity.opportunityName },
        { label: "Opportunity Record Type", value: opportunity.recordType },
        { label: "Type", value: opportunity.type },
        { label: "Lead Source", value: opportunity.leadSource },
        { label: "Order Number", value: opportunity.orderNumber },
        { label: "Installation Status", value: opportunity.installationStatus },
        { label: "Tracking Number", value: opportunity.trackingNumber },
        { label: "Main Competitors", value: opportunity.mainCompetitors },
        { label: "Current Generators", value: opportunity.currentGenerators },
    ];

    const rightColumnFields = [
        { label: "Amount", value: opportunity.amount },
        { label: "Expected Revenue", value: opportunity.expectedRevenue },
        { label: "Close Date", value: opportunity.closeDate },
        { label: "Next Step", value: opportunity.nextStep },
        { label: "Probability (%)", value: opportunity.probability },
        {
            label: "Stage",
            value: opportunity.stage,
            isStage: true,
        },
    ];

    return (
        <Box
            sx={{
                px: 3,
                pb: 3,
                backgroundColor: "var(--dashboard-bg)",
                minHeight: "100vh",
                marginTop: "-65px",
                pt: 2,
                width: "100%",
                maxWidth: "100%",
                overflowX: "hidden",
                boxSizing: "border-box",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 3,
                    width: "100%",
                    maxWidth: "100%",
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <IconButton
                        onClick={() => navigate("/home/opportunities/")}
                        sx={{ mr: 2, flexShrink: 0, color: 'var(--sidebar-text-primary)' }}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography
                        variant="h4"
                        noWrap
                        sx={{
                            fontWeight: 600,
                            color: "var(--sidebar-text-primary)",
                            m: 0,
                            lineHeight: 1.2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {opportunity.opportunityName}
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
                    {canDeleteOpportunity ? (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDeleteOpportunity}
                            disabled={deleting}
                            sx={{
                                borderRadius: "4px",
                                textTransform: "none",
                                fontSize: "14px",
                                fontWeight: 400,
                                padding: "6px 12px",
                                minWidth: "auto",
                            }}
                        >
                            Delete
                        </Button>
                    ) : null}
                    {showConvertToSalesOrderButton ? (
                        <Button
                            variant="contained"
                            onClick={() => setConfirmConvertSalesOrderOpen(true)}
                            disabled={convertToSalesOrderSubmitting}
                            sx={{
                                backgroundColor: "#1976d2",
                                color: "white",
                                borderRadius: "4px",
                                textTransform: "none",
                                fontSize: "14px",
                                fontWeight: 400,
                                padding: "6px 12px",
                                minWidth: "auto",
                                "&:hover": {
                                    backgroundColor: "#1565c0",
                                },
                            }}
                        >
                            {convertToSalesOrderSubmitting ? "Converting..." : "Convert to Sale Order"}
                        </Button>
                    ) : null}
                </Box>
            </Box>

            {/* Contact Summary */}
            <Box sx={{ display: "flex", gap: 6, mb: 3, flexWrap: "wrap" }}>
                <Box sx={{ minWidth: "150px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Business sx={{ fontSize: "16px", color: "var(--dashboard-text-secondary)" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--dashboard-text-secondary)" }}>
                            Company Name
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: "var(--dashboard-text-primary)" }}>
                        {opportunity.companyName}
                    </Typography>
                </Box>
                <Box sx={{ minWidth: "150px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Phone sx={{ fontSize: "16px", color: "var(--dashboard-text-secondary)" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--dashboard-text-secondary)" }}>
                            Phone
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body1" sx={{ color: "var(--dashboard-text-primary)" }}>
                            {opportunity.phone}
                        </Typography>
                        {getOpportunityPhoneNumber() ? (
                            <IconButton
                                size="small"
                                onClick={handleGotoCall}
                                disabled={gotoCalling}
                                title="Call via GoTo Connect"
                                sx={{ color: "#1976d2" }}
                            >
                                {gotoCalling ? <CircularProgress size={16} /> : <Phone fontSize="small" />}
                            </IconButton>
                        ) : null}
                    </Box>
                </Box>
                <Box sx={{ minWidth: "200px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Email sx={{ fontSize: "16px", color: "var(--dashboard-text-secondary)" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--dashboard-text-secondary)" }}>
                            Email
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: "var(--dashboard-text-primary)" }}>
                        {opportunity.email}
                    </Typography>
                </Box>
            </Box>

            {/* Opportunity Path */}
            <Box sx={{ mb: 3, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
                <OpportunityPath
                    activeStep={activeStage}
                    maxUnlockedStep={maxUnlockedStage}
                    isCrmAccountLinked={isCrmAccountLinked}
                    terminalOutcome={terminalOutcome}
                    onStepChange={handleStageStepChange}
                    onComplete={handleMarkComplete}
                    onConvert={handleConvertToOpportunity}
                    onClosedWon={() => handleSelectClosedStage("closed_won")}
                    onClosedLost={() => handleSelectClosedStage("closed_lost")}
                    completing={stageUpdating}
                    converting={convertSubmitting}
                    terminalActionsDisabled={!stageFormValid}
                />
            </Box>

            <OpportunityStageForm
                key={`${activeStage}-${terminalOutcome ?? "open"}`}
                ref={stageFormRef}
                activeStage={activeStage}
                terminalOutcome={terminalOutcome}
                opportunityId={id}
                accessToken={accessToken}
                opportunityRecord={opportunityRecord}
                opportunityForms={opportunityForms}
                opportunityQuotations={opportunityQuotations}
                onSubmissionSaved={handleStageSubmissionSaved}
                onValidityChange={setStageFormValid}
                readOnly={isViewingCompletedStage}
            />

            <OpportunityTerminalFormDialog
                open={terminalFormDialog.open}
                stageValue={terminalFormDialog.stageValue}
                opportunityId={id}
                accessToken={accessToken}
                opportunityRecord={opportunityRecord}
                opportunityForms={opportunityForms}
                onClose={handleTerminalFormClose}
                onConfirm={handleTerminalFormConfirm}
                submitting={stageUpdating}
            />

            {/* Tabs Card */}
            <StyledPaper sx={{ padding: 0 }}>
                <Box
                    sx={{
                        borderBottom: 1,
                        borderColor: "divider",
                        px: 3,
                    }}
                >
                    <Tabs
                        value={tabValue}
                        onChange={(_, newValue) => setTabValue(newValue)}
                        sx={{
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                minHeight: 48,
                            },
                        }}
                        className="dark:text-white"
                    >
                        <Tab label="Details" />
                        <Tab label="Activity" />
                        {showLogsTab ? <Tab label="Logs" /> : null}
                    </Tabs>
                </Box>

                <Box sx={{ px: 3, pb: 3 }}>
                    <TabPanel value={tabValue} index={0}>
                        {hasFormSections ? (
                            formDisplaySections.map((section, sectionIndex) => {
                                const agentField = {
                                    key: "agentName",
                                    label: "Agent",
                                    value: opportunity.agentName,
                                    rawValue: opportunity.agentName,
                                };
                                const sectionFields =
                                    sectionIndex === 0
                                        ? [agentField, ...section.fields]
                                        : section.fields;
                                const midpoint = Math.ceil(sectionFields.length / 2);
                                const leftFields = sectionFields.slice(0, midpoint);
                                const rightFields = sectionFields.slice(midpoint);

                                return (
                                    <Box
                                        key={section.id}
                                        sx={{
                                            mb:
                                                formDisplaySections.length > 1 ? 4 : 0,
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                mb: 3,
                                                fontWeight: 600,
                                                color: "#2c3e50",
                                            }}
                                        >
                                            {section.title}
                                        </Typography>
                                        <Grid container spacing={4}>
                                            <Grid item xs={12} md={6}>
                                                <InfoSection>
                                                    {renderDisplayFieldRows(leftFields)}
                                                </InfoSection>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <InfoSection>
                                                    {renderDisplayFieldRows(rightFields)}
                                                </InfoSection>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                );
                            })
                        ) : (
                            <>
                                <Typography
                                    variant="h6"
                                    sx={{ mb: 3, fontWeight: 600, color: "#2c3e50" }}
                                >
                                    Opportunity Information
                                </Typography>
                                <Grid container spacing={4}>
                                    <Grid item xs={12} md={6}>
                                        <InfoSection>
                                            {leftColumnFields.map(renderField)}
                                        </InfoSection>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <InfoSection>
                                            {rightColumnFields.map(renderField)}
                                        </InfoSection>
                                    </Grid>
                                </Grid>
                            </>
                        )}
                    </TabPanel>

                    <TabPanel value={tabValue} index={OPPORTUNITY_TAB.ACTIVITY}>
                        <Box>
                            <Box
                                sx={{
                                    borderBottom: 1,
                                    borderColor: "divider",
                                    mb: 3,
                                }}
                            >
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                    {ACTIVITY_TYPES.map((tab, index) => (
                                        <Button
                                            key={tab.value}
                                            variant={
                                                activitySubTab === index
                                                    ? "contained"
                                                    : "text"
                                            }
                                            onClick={() => setActivitySubTab(index)}
                                            sx={{
                                                borderRadius: "4px",
                                                textTransform: "none",
                                                fontSize: "14px",
                                                fontWeight:
                                                    activitySubTab === index ? 500 : 400,
                                                backgroundColor:
                                                    activitySubTab === index
                                                        ? "#1976d2"
                                                        : "transparent",
                                                color:
                                                    activitySubTab === index
                                                        ? "white"
                                                        : "inherit",
                                                "&:hover": {
                                                    backgroundColor:
                                                        activitySubTab === index
                                                            ? "#1565c0"
                                                            : "#f5f5f5",
                                                },
                                            }}
                                            className={activitySubTab === index ? '' : 'dark:text-gray-300'}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    mb: 3,
                                    p: 2,
                                    backgroundColor: "var(--dashboard-bg)",
                                    borderRadius: "8px",
                                    width: "100%",
                                }}
                            >
                                <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600, mb: 1.5, color: 'var(--sidebar-text-primary)' }}
                                >
                                    Log an Activity
                                </Typography>
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                    >
                                        {isEmailActivity || isMeetingActivity ? "Subject" : "Title"}
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={activitySubject}
                                        error={activitySubjectError}
                                        onChange={(event) => {
                                            setActivitySubject(event.target.value);
                                            if (activitySubjectError) setActivitySubjectError(false);
                                        }}
                                        placeholder={
                                            isEmailActivity
                                                ? "Follow-up on your application"
                                                : isMeetingActivity
                                                  ? "Discovery call"
                                                  : "Follow-up call with client"
                                        }
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "4px",
                                                backgroundColor: 'white',
                                                '& fieldset': {
                                                    borderColor: activitySubjectError ? '#ef4444' : 'var(--dashboard-border-light)',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: activitySubjectError ? '#ef4444' : 'var(--dashboard-primary)',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: activitySubjectError ? '#ef4444' : 'var(--dashboard-primary)',
                                                },
                                            },
                                            '& .MuiInputBase-input': {
                                                color: 'var(--dashboard-text-primary)',
                                            },
                                        }}
                                    />
                                </Box>
                                {isEmailActivity ? (
                                    <>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                            >
                                                To
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={
                                                    opportunity?.email && opportunity.email !== "-"
                                                        ? opportunity.email
                                                        : ""
                                                }
                                                disabled
                                                placeholder="Contact email"
                                                variant="outlined"
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: "4px",
                                                        backgroundColor: "white",
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                            >
                                                CC
                                            </Typography>
                                            <Box
                                                onClick={() =>
                                                    document
                                                        .getElementById("opportunity-activity-cc-input")
                                                        ?.focus()
                                                }
                                                sx={{
                                                    border: "1px solid var(--dashboard-border-light)",
                                                    borderRadius: "4px",
                                                    backgroundColor: "white",
                                                    padding: "8px",
                                                    minHeight: "40px",
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    cursor: "text",
                                                    "&:focus-within": {
                                                        borderColor: "var(--dashboard-primary)",
                                                    },
                                                }}
                                            >
                                                {activityEmailCcList.map((email) => (
                                                    <Chip
                                                        key={email}
                                                        label={email}
                                                        onDelete={() =>
                                                            handleRemoveActivityCcEmail(email)
                                                        }
                                                        deleteIcon={
                                                            <Close sx={{ fontSize: "16px" }} />
                                                        }
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: "#e3f2fd",
                                                            color: "#1976d2",
                                                            fontSize: "12px",
                                                            height: "28px",
                                                        }}
                                                    />
                                                ))}
                                                <Box
                                                    component="input"
                                                    id="opportunity-activity-cc-input"
                                                    type="text"
                                                    value={activityEmailCcInput}
                                                    onChange={(event) =>
                                                        setActivityEmailCcInput(event.target.value)
                                                    }
                                                    onKeyDown={handleActivityCcInputKeyDown}
                                                    onBlur={() => {
                                                        if (activityEmailCcInput.trim()) {
                                                            handleAddActivityCcEmail(
                                                                activityEmailCcInput
                                                            );
                                                        }
                                                    }}
                                                    placeholder={
                                                        activityEmailCcList.length === 0
                                                            ? "Type email and press Enter"
                                                            : ""
                                                    }
                                                    sx={{
                                                        border: "none",
                                                        outline: "none",
                                                        flex: 1,
                                                        minWidth: "140px",
                                                        fontSize: "14px",
                                                        backgroundColor: "transparent",
                                                        padding: "4px",
                                                        color: "var(--dashboard-text-primary)",
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                            >
                                                Message
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={4}
                                                maxRows={14}
                                                value={activityDescription}
                                                onChange={(event) =>
                                                    setActivityDescription(event.target.value)
                                                }
                                                placeholder="Hi, just checking if you had any questions."
                                                variant="outlined"
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: "4px",
                                                        backgroundColor: "white",
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: "var(--dashboard-text-secondary)",
                                                    mb: 0.5,
                                                }}
                                            >
                                                Attachments
                                            </Typography>
                                            <Box
                                                sx={{
                                                    border: "1px dashed var(--dashboard-border-light)",
                                                    borderRadius: "4px",
                                                    backgroundColor: "white",
                                                    padding: "12px",
                                                }}
                                            >
                                                <Button
                                                    component="label"
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{
                                                        textTransform: "none",
                                                        borderColor:
                                                            "var(--dashboard-border-light)",
                                                        color: "var(--dashboard-primary)",
                                                        mb:
                                                            activityEmailAttachments.length > 0
                                                                ? 1
                                                                : 0,
                                                    }}
                                                >
                                                    Add file
                                                    <input
                                                        type="file"
                                                        hidden
                                                        multiple
                                                        onChange={handleActivityAttachmentChange}
                                                    />
                                                </Button>
                                                {activityEmailAttachments.length > 0 ? (
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 0.75,
                                                        }}
                                                    >
                                                        {activityEmailAttachments.map(
                                                            (file, index) => (
                                                                <Box
                                                                    key={`${file.name}-${index}`}
                                                                    sx={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent:
                                                                            "space-between",
                                                                        gap: 1,
                                                                        px: 1,
                                                                        py: 0.75,
                                                                        borderRadius: "4px",
                                                                        backgroundColor:
                                                                            "var(--dashboard-bg)",
                                                                        border: "1px solid var(--dashboard-border-light)",
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            color: "var(--dashboard-text-primary)",
                                                                            overflow: "hidden",
                                                                            textOverflow:
                                                                                "ellipsis",
                                                                            whiteSpace: "nowrap",
                                                                            fontSize: "13px",
                                                                        }}
                                                                    >
                                                                        {file.name}
                                                                    </Typography>
                                                                    <Button
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={() =>
                                                                            handleRemoveActivityAttachment(
                                                                                index
                                                                            )
                                                                        }
                                                                        sx={{
                                                                            minWidth: "auto",
                                                                            px: 1,
                                                                            textTransform: "none",
                                                                        }}
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                </Box>
                                                            )
                                                        )}
                                                    </Box>
                                                ) : (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            display: "block",
                                                            color: "var(--dashboard-text-secondary)",
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        Optional — select one or more files to
                                                        attach
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </>
                                ) : isMeetingActivity ? (
                                    <>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                            >
                                                Description
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={4}
                                                maxRows={14}
                                                value={activityDescription}
                                                onChange={(event) =>
                                                    setActivityDescription(event.target.value)
                                                }
                                                placeholder="Discuss pricing and next steps"
                                                variant="outlined"
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: "4px",
                                                        backgroundColor: "white",
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Grid container spacing={1.5} sx={{ mb: 1.5 }} alignItems="flex-end">
                                            <Grid item xs={12} sm={4}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                                >
                                                    Scheduled At
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="datetime-local"
                                                    value={activityScheduledAt}
                                                    onChange={(event) =>
                                                        setActivityScheduledAt(event.target.value)
                                                    }
                                                    variant="outlined"
                                                    InputLabelProps={{ shrink: true }}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: "4px",
                                                            backgroundColor: "white",
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={5}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                                >
                                                    To
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={
                                                        opportunity?.email && opportunity.email !== "-"
                                                            ? opportunity.email
                                                            : ""
                                                    }
                                                    disabled
                                                    placeholder="Contact email"
                                                    variant="outlined"
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: "4px",
                                                            backgroundColor: "white",
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={activitySendInvite}
                                                            onChange={(event) =>
                                                                setActivitySendInvite(event.target.checked)
                                                            }
                                                            color="primary"
                                                        />
                                                    }
                                                    label="Send invite"
                                                    sx={{
                                                        m: 0,
                                                        color: "var(--dashboard-text-primary)",
                                                        "& .MuiFormControlLabel-label": {
                                                            fontSize: "14px",
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </>
                                ) : isCallActivity ? (
                                    <>
                                        <Box
                                            sx={{
                                                mb: 2,
                                                p: 1.5,
                                                borderRadius: "8px",
                                                border: "1px solid #bbdefb",
                                                backgroundColor: "#e3f2fd",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{ fontWeight: 600, color: "#1565c0", mb: 0.5 }}
                                            >
                                                GoTo Connect
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 1 }}
                                            >
                                                Click Call now. Your GoTo app or desk phone will ring first — answer it, then the customer is dialed. Duration and outcome update when the call ends.
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    alignItems: "center",
                                                    gap: 1,
                                                    mb: 1,
                                                }}
                                            >
                                                <Typography variant="body2" sx={{ color: "var(--dashboard-text-primary)" }}>
                                                    Phone: {getOpportunityPhoneNumber() || "No number on this opportunity"}
                                                </Typography>
                                                {gotoLine?.extensionNumber ? (
                                                    <Chip
                                                        size="small"
                                                        label={`Your line: ext ${gotoLine.extensionNumber}`}
                                                        sx={{ height: 22, fontSize: "11px" }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        size="small"
                                                        label="No GoTo line set"
                                                        sx={{ height: 22, fontSize: "11px" }}
                                                    />
                                                )}
                                                <Button
                                                    size="small"
                                                    onClick={() => openGotoLinePicker({ thenCall: false })}
                                                    sx={{ textTransform: "none", minWidth: 0, px: 0.5 }}
                                                >
                                                    {gotoLine?.lineId ? "Change line" : "Set line"}
                                                </Button>
                                            </Box>
                                            <Button
                                                variant="contained"
                                                startIcon={
                                                    gotoCalling ? (
                                                        <CircularProgress size={16} color="inherit" />
                                                    ) : (
                                                        <Phone />
                                                    )
                                                }
                                                onClick={handleGotoCall}
                                                disabled={gotoCalling || !getOpportunityPhoneNumber()}
                                                sx={{
                                                    textTransform: "none",
                                                    backgroundColor: "#1976d2",
                                                    "&:hover": { backgroundColor: "#1565c0" },
                                                }}
                                            >
                                                {gotoCalling ? "Calling…" : "Call now"}
                                            </Button>
                                            {gotoPolling ? (
                                                <Alert severity="info" sx={{ mt: 1.5 }}>
                                                    Call in progress. Duration and outcome will update when the call ends.
                                                </Alert>
                                            ) : null}
                                        </Box>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600, mb: 1, color: "var(--dashboard-text-secondary)" }}
                                        >
                                            Or log a call manually
                                        </Typography>
                                        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                                            <Grid item xs={12} sm={5}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                                >
                                                    Call At
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="datetime-local"
                                                    value={activityCallAt}
                                                    onChange={(event) =>
                                                        setActivityCallAt(event.target.value)
                                                    }
                                                    variant="outlined"
                                                    InputLabelProps={{ shrink: true }}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: "4px",
                                                            backgroundColor: "white",
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={2}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                                >
                                                    Duration (min)
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    type="number"
                                                    value={activityCallDurationMinutes}
                                                    onChange={(event) =>
                                                        setActivityCallDurationMinutes(event.target.value)
                                                    }
                                                    placeholder="7"
                                                    inputProps={{ min: 0, step: 1 }}
                                                    variant="outlined"
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: "4px",
                                                            backgroundColor: "white",
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={5}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                                >
                                                    Outcome
                                                </Typography>
                                                <FormControl fullWidth size="small">
                                                    <Select
                                                        value={activityCallOutcome}
                                                        onChange={(event) =>
                                                            setActivityCallOutcome(event.target.value)
                                                        }
                                                        displayEmpty
                                                        sx={{
                                                            borderRadius: "4px",
                                                            backgroundColor: "white",
                                                        }}
                                                    >
                                                        <MenuItem value="">
                                                            <em>Select outcome</em>
                                                        </MenuItem>
                                                        {CALL_OUTCOMES.map((option) => (
                                                            <MenuItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                        </Grid>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                            >
                                                Call Notes
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={4}
                                                maxRows={14}
                                                value={activityCallNotes}
                                                onChange={(event) =>
                                                    setActivityCallNotes(event.target.value)
                                                }
                                                placeholder="Key points from the call..."
                                                variant="outlined"
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: "4px",
                                                        backgroundColor: "white",
                                                    },
                                                }}
                                            />
                                        </Box>
                                    </>
                                ) : (
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                    >
                                        Notes
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        maxRows={14}
                                        value={activityDescription}
                                        onChange={(event) =>
                                            setActivityDescription(event.target.value)
                                        }
                                        placeholder="What happened? key points..."
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "4px",
                                                backgroundColor: 'white',
                                                '& fieldset': {
                                                    borderColor: 'var(--dashboard-border-light)',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: 'var(--dashboard-primary)',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: 'var(--dashboard-primary)',
                                                },
                                            },
                                            '& .MuiInputBase-input': {
                                                color: 'var(--dashboard-text-primary)',
                                            },
                                        }}
                                    />
                                </Box>
                                )}
                                {isFollowUpActivity && (
                                    <>
                                        <Box sx={{ mb: 1.5, maxWidth: 280 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                            >
                                                Due Date (optional)
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="datetime-local"
                                                value={activityDueDate}
                                                onChange={(event) =>
                                                    setActivityDueDate(event.target.value)
                                                }
                                                variant="outlined"
                                                InputLabelProps={{ shrink: true }}
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: "4px",
                                                        backgroundColor: "white",
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--dashboard-text-secondary)", mb: 0.5 }}
                                            >
                                                Meeting Link
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={activityMeetingLink}
                                                onChange={(event) =>
                                                    setActivityMeetingLink(event.target.value)
                                                }
                                                placeholder="Generate or paste a meeting link"
                                                variant="outlined"
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: "4px",
                                                        backgroundColor: "white",
                                                    },
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleGenerateFollowUpMeetingLink}
                                                disabled={activityGeneratingLink || activitySubmitting}
                                                sx={{
                                                    mt: 0.75,
                                                    px: 0,
                                                    minWidth: 0,
                                                    textTransform: "none",
                                                    fontSize: "12px",
                                                    color: "#0C79F7",
                                                    "&:hover": {
                                                        backgroundColor: "transparent",
                                                        textDecoration: "underline",
                                                    },
                                                }}
                                            >
                                                {activityGeneratingLink
                                                    ? "Generating…"
                                                    : "Generate Meeting Link"}
                                            </Button>
                                        </Box>
                                        <Grid container spacing={1.5} sx={{ mb: 1.5 }} alignItems="flex-end">
                                            <Grid item xs={12} sm={8}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "var(--dashboard-text-secondary)",
                                                        mb: 0.5,
                                                    }}
                                                >
                                                    To
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={
                                                        opportunity?.email && opportunity.email !== "-"
                                                            ? opportunity.email
                                                            : ""
                                                    }
                                                    disabled
                                                    placeholder="Contact email"
                                                    variant="outlined"
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: "4px",
                                                            backgroundColor: "white",
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={activitySendFollowUpEmail}
                                                            onChange={(event) =>
                                                                setActivitySendFollowUpEmail(
                                                                    event.target.checked
                                                                )
                                                            }
                                                            color="primary"
                                                        />
                                                    }
                                                    label="Send email"
                                                    sx={{
                                                        m: 0,
                                                        color: "var(--dashboard-text-primary)",
                                                        "& .MuiFormControlLabel-label": {
                                                            fontSize: "14px",
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </>
                                )}
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        alignItems: "center",
                                    }}
                                >
                                    <Button
                                        variant="contained"
                                        onClick={handleSubmitActivity}
                                        disabled={activitySubmitting || activityGeneratingLink}
                                        sx={{
                                            backgroundColor: "#1976d2",
                                            textTransform: "none",
                                            minWidth: 90,
                                            "&:hover": {
                                                backgroundColor: "#1565c0",
                                            },
                                        }}
                                    >
                                        {activitySubmitting
                                            ? isMeetingActivity || isFollowUpActivity
                                                ? "Scheduling..."
                                                : "Sending..."
                                            : isMeetingActivity || isFollowUpActivity
                                              ? "Schedule"
                                              : "Send"}
                                    </Button>
                                </Box>
                            </Box>

                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600, mb: 2, color: "var(--sidebar-text-primary)" }}
                                >
                                    Activity History
                                </Typography>

                                {activitiesLoading ? (
                                    <Loader
                                        message="Loading activities..."
                                        subMessage="Please wait"
                                    />
                                ) : activities.length === 0 ? (
                                    <Box
                                        sx={{
                                            py: 3,
                                            px: 2,
                                            borderRadius: "8px",
                                            border: "1px dashed var(--dashboard-border-light)",
                                            textAlign: "center",
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: "var(--dashboard-text-secondary)" }}>
                                            No activities logged yet.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                        {activities.map((activity, index) => {
                                            const activityType = String(
                                                activity?.type || "call"
                                            ).toLowerCase();
                                            const activityTypeLabel = getActivityTypeLabel(activityType);
                                            const dotColor =
                                                ACTIVITY_TYPE_COLORS[activityType] ||
                                                "#1976d2";
                                            const createdLabel = formatActivityTime(
                                                activity?.createdAt ||
                                                    activity?.updatedAt
                                            );
                                            const dueLabel = formatDueDate(
                                                activity?.dueDate
                                            );
                                            const callAtLabel = formatActivityDateTime(activity?.callAt);
                                            const callDurationLabel = formatCallDuration(
                                                activity?.callDurationSeconds
                                            );
                                            const callOutcomeLabel = activity?.callOutcome
                                                ? getCallOutcomeLabel(activity.callOutcome)
                                                : "";
                                            const callNotes =
                                                activityType === "call"
                                                    ? activity?.callNotes || activity?.description
                                                    : "";
                                            const activityDescription =
                                                activityType !== "call" ? activity?.description : "";

                                            const hasCallDetails =
                                                activityType === "call" &&
                                                (callOutcomeLabel ||
                                                    callAtLabel ||
                                                    callDurationLabel ||
                                                    callNotes);

                                            return (
                                                <Box
                                                    key={
                                                        activity?.id ||
                                                        `${activityType}-${index}`
                                                    }
                                                    sx={{
                                                        border: "1px solid var(--dashboard-border-light)",
                                                        borderLeft: `3px solid ${dotColor}`,
                                                        borderRadius: "8px",
                                                        p: 1.5,
                                                        backgroundColor: "white",
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            gap: 1,
                                                            mb: 0.75,
                                                        }}
                                                    >
                                                        <Chip
                                                            label={activityTypeLabel}
                                                            size="small"
                                                            sx={{
                                                                height: 22,
                                                                fontSize: "11px",
                                                                fontWeight: 600,
                                                                color: dotColor,
                                                                backgroundColor: `${dotColor}14`,
                                                                border: `1px solid ${dotColor}33`,
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: "var(--dashboard-text-secondary)",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {createdLabel}
                                                        </Typography>
                                                    </Box>

                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: "var(--dashboard-text-primary)",
                                                            lineHeight: 1.4,
                                                        }}
                                                    >
                                                        {activity?.subject || "Untitled activity"}
                                                    </Typography>

                                                    {hasCallDetails ? (
                                                        <Box
                                                            sx={{
                                                                mt: 1,
                                                                p: 1.25,
                                                                borderRadius: "6px",
                                                                backgroundColor: "var(--dashboard-bg)",
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: 0.75,
                                                            }}
                                                        >
                                                            {callOutcomeLabel ? (
                                                                <ActivityDetailRow label="Outcome">
                                                                    <Chip
                                                                        label={callOutcomeLabel}
                                                                        size="small"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: "11px",
                                                                            fontWeight: 600,
                                                                            ...getCallOutcomeStyle(
                                                                                activity.callOutcome
                                                                            ),
                                                                        }}
                                                                    />
                                                                </ActivityDetailRow>
                                                            ) : null}
                                                            {callAtLabel ? (
                                                                <ActivityDetailRow label="Call At">
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            color: "var(--dashboard-text-primary)",
                                                                        }}
                                                                    >
                                                                        {callAtLabel}
                                                                    </Typography>
                                                                </ActivityDetailRow>
                                                            ) : null}
                                                            {callDurationLabel ? (
                                                                <ActivityDetailRow label="Duration">
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            color: "var(--dashboard-text-primary)",
                                                                        }}
                                                                    >
                                                                        {callDurationLabel}
                                                                    </Typography>
                                                                </ActivityDetailRow>
                                                            ) : null}
                                                            {callNotes ? (
                                                                <ActivityDetailRow label="Notes" alignStart>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            color: "var(--dashboard-text-primary)",
                                                                            lineHeight: 1.5,
                                                                            whiteSpace: "pre-wrap",
                                                                            wordBreak: "break-word",
                                                                        }}
                                                                    >
                                                                        {callNotes}
                                                                    </Typography>
                                                                </ActivityDetailRow>
                                                            ) : null}
                                                        </Box>
                                                    ) : null}

                                                    {dueLabel ? (
                                                        <Box sx={{ mt: 1 }}>
                                                            <ActivityDetailRow label="Due Date">
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: "var(--dashboard-text-primary)",
                                                                    }}
                                                                >
                                                                    {dueLabel}
                                                                </Typography>
                                                            </ActivityDetailRow>
                                                        </Box>
                                                    ) : null}

                                                    {activityDescription ? (
                                                        <Box
                                                            sx={{
                                                                mt: 1,
                                                                p: 1.25,
                                                                borderRadius: "6px",
                                                                backgroundColor: "var(--dashboard-bg)",
                                                            }}
                                                        >
                                                            <ActivityDetailRow label="Description" alignStart>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: "var(--dashboard-text-primary)",
                                                                        lineHeight: 1.5,
                                                                        whiteSpace: "pre-wrap",
                                                                        wordBreak: "break-word",
                                                                    }}
                                                                >
                                                                    {activityDescription}
                                                                </Typography>
                                                            </ActivityDetailRow>
                                                        </Box>
                                                    ) : null}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </TabPanel>

                    {showLogsTab ? (
                        <TabPanel value={tabValue} index={OPPORTUNITY_TAB.LOGS}>
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600, mb: 3, color: "#2c3e50" }}
                                >
                                    Quotation Logs
                                </Typography>
                                <QuotationAuditLogsTab
                                    quotationId={quotationId}
                                    active={tabValue === OPPORTUNITY_TAB.LOGS}
                                />
                            </Box>
                        </TabPanel>
                    ) : null}
                </Box>
            </StyledPaper>

            <Dialog
                open={linePickerOpen}
                onClose={() => {
                    if (!gotoLineSaving) {
                        setPendingCallAfterLine(false);
                        setLinePickerOpen(false);
                    }
                }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 0.5, fontWeight: 600 }}>Set your GoTo line</DialogTitle>
                <DialogContent sx={{ pt: 0.5, pb: 1 }}>
                    <Typography variant="body2" sx={{ color: "var(--dashboard-text-secondary)", mb: 1.5 }}>
                        Each agent must pick their own GoTo extension before placing a call.
                    </Typography>
                    {gotoLinesLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <FormControl fullWidth size="small">
                            <Select
                                value={selectedGotoLineId}
                                onChange={(event) => setSelectedGotoLineId(event.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="">
                                    <em>Select a line</em>
                                </MenuItem>
                                {gotoLines.map((line) => (
                                    <MenuItem key={line.lineId} value={line.lineId}>
                                        {line.name || "Line"}
                                        {line.extensionNumber ? ` (ext ${line.extensionNumber})` : ""}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
                    <Button
                        onClick={() => {
                            setPendingCallAfterLine(false);
                            setLinePickerOpen(false);
                        }}
                        disabled={gotoLineSaving}
                        sx={{ textTransform: "none" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveGotoLine}
                        disabled={gotoLineSaving || gotoLinesLoading || !selectedGotoLineId}
                        sx={{ textTransform: "none", backgroundColor: "#1976d2" }}
                    >
                        {gotoLineSaving ? "Saving…" : pendingCallAfterLine ? "Save & call" : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmConvertSalesOrderOpen}
                onClose={() => !convertToSalesOrderSubmitting && setConfirmConvertSalesOrderOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 0.5, fontWeight: 600 }}>
                    Convert to Sale Order
                </DialogTitle>
                <DialogContent sx={{ pt: 0.5, pb: 1 }}>
                    <Typography variant="body2" sx={{ color: "#334155" }}>
                        Are you sure you want to convert this quotation to a sale order?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
                    <Button
                        onClick={() => setConfirmConvertSalesOrderOpen(false)}
                        disabled={convertToSalesOrderSubmitting}
                        sx={{ textTransform: "none" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConvertToSalesOrder}
                        disabled={convertToSalesOrderSubmitting}
                        sx={{ textTransform: "none", backgroundColor: "#1976d2" }}
                    >
                        {convertToSalesOrderSubmitting ? "Converting..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Opportunity"
                subtitle="Are you sure you want to delete"
                entityName={opportunity?.opportunityName || "this opportunity"}
                warningMessage="This action cannot be undone. The opportunity will be permanently removed, and its linked lead will also be deleted if present."
                onCancel={() => {
                    if (!deleting) setShowDeleteModal(false);
                }}
                onDelete={confirmDeleteOpportunity}
                isLoading={deleting}
            />
        </Box>
    );
};

export default OpportunityDetail;
