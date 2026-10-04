import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { styled } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SendIcon from "@mui/icons-material/Send";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import { toast } from "react-toastify";
import { getRequestWithOutBody, putRequestWithBodyAndToken, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import { usePageTitle } from "../../Hooks/usePageTitle";

const Page = styled("div")({
    minHeight: "100vh",
    marginTop: -65,
    backgroundColor: "var(--dashboard-bg)",
    color: "var(--dashboard-text-primary)",
    padding: 16,
});

const HeaderRow = styled("div")({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
    position: "relative",
    zIndex: 2,
});

const TitleGroup = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
});

const BackBtn = styled("button")({
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid var(--dashboard-box-border)",
    background: "var(--dashboard-tab-box)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--dashboard-text-secondary)",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
    position: "relative",
    zIndex: 3,
    flexShrink: 0,
});

const PageTitle = styled("h1")({
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "var(--dashboard-text-primary)",
    lineHeight: 1.2,
});

const StatusBadge = styled("span")(({ color, bg }) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    backgroundColor: bg,
    color,
    fontSize: 13,
    fontWeight: 600,
    border: `1px solid ${color}33`,
}));

const PrimaryBtn = styled("button")({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 40,
    padding: "0 16px",
    borderRadius: 10,
    border: "none",
    background: "#0C79F7",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
});

const ActionRow = styled("div")({
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
});

const OutlineBtn = styled("button")(({ tone }) => {
    const tones = {
        success: { color: "#16A34A", border: "#86EFAC" },
        danger: { color: "#DC2626", border: "#FCA5A5" },
        neutral: { color: "var(--dashboard-text-primary)", border: "var(--dashboard-box-border)" },
    };
    const t = tones[tone] || tones.neutral;
    return {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "0 14px",
        borderRadius: 10,
        border: `1.5px solid ${t.border}`,
        background: "var(--dashboard-tab-box)",
        color: t.color,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
    };
});

const Card = styled("div")({
    background: "var(--dashboard-tab-box)",
    borderRadius: 16,
    border: "1px solid var(--dashboard-box-border)",
    padding: 24,
    marginBottom: 16,
});

const StepperWrap = styled("div")({
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    overflowX: "auto",
});

const StepItem = styled("div")({
    flex: 1,
    minWidth: 120,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
});

const StepCircle = styled("div")(({ active, done, error }) => ({
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    zIndex: 1,
    background: error ? "#DC2626" : done || active ? "#0C79F7" : "var(--dashboard-tab-box)",
    color: error || done || active ? "#fff" : "var(--dashboard-text-secondary)",
    border: error || done || active ? "none" : "2px solid var(--dashboard-box-border)",
}));

const StepLine = styled("div")(({ done, error }) => ({
    position: "absolute",
    top: 20,
    left: "calc(50% + 24px)",
    width: "calc(100% - 48px)",
    height: 2,
    background: error ? "#FCA5A5" : done ? "#0C79F7" : "var(--dashboard-box-border)",
}));

const StepLabel = styled("div")(({ active, error }) => ({
    marginTop: 10,
    fontSize: 13,
    fontWeight: 600,
    textAlign: "center",
    color: error ? "#DC2626" : active ? "#0C79F7" : "var(--dashboard-text-secondary)",
}));

const ProfileHeader = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: 14,
    paddingBottom: 18,
    borderBottom: "1px solid var(--dashboard-box-border)",
    marginBottom: 18,
});

const Avatar = styled("div")({
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#DBEAFE",
    color: "#1D4ED8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
    flexShrink: 0,
});

const InfoGrid = styled("div")({
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    "@media (max-width: 768px)": {
        gridTemplateColumns: "1fr",
    },
});

const InfoItem = styled("div")({
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
});

const InfoIcon = styled("div")({
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "var(--dashboard-bg)",
    border: "1px solid var(--dashboard-box-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--dashboard-text-secondary)",
    flexShrink: 0,
});

const InfoLabel = styled("div")({
    fontSize: 12,
    color: "var(--dashboard-text-secondary)",
    fontWeight: 500,
    marginBottom: 2,
});

const InfoValue = styled("div")({
    fontSize: 14,
    color: "var(--dashboard-text-primary)",
    fontWeight: 600,
    wordBreak: "break-word",
});

const DetailsHeading = styled("h2")({
    margin: "0 0 20px",
    fontSize: 18,
    fontWeight: 700,
    color: "var(--dashboard-text-primary)",
});

const FormRow = styled("div")({
    display: "grid",
    gridTemplateColumns: "140px minmax(0, 420px)",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
    maxWidth: 580,
    "@media (max-width: 640px)": {
        gridTemplateColumns: "1fr",
        gap: 6,
        maxWidth: "100%",
    },
});

const FormLabel = styled("label")({
    fontSize: 14,
    fontWeight: 600,
    color: "var(--fieldsTitle)",
});

const FormInput = styled("input")({
    width: "100%",
    maxWidth: 420,
    height: 42,
    borderRadius: 10,
    border: "1px solid var(--dashboard-box-border)",
    background: "var(--dashboard-tab-box)",
    padding: "0 14px",
    fontSize: 14,
    color: "var(--dashboard-text-primary)",
    outline: "none",
    boxSizing: "border-box",
    "&::placeholder": {
        color: "var(--dashboard-text-secondary)",
        opacity: 0.75,
    },
});

const FormFooter = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
    flexWrap: "wrap",
    width: "100%",
});

const SecondaryBtn = styled("button")({
    height: 42,
    minWidth: 110,
    padding: "0 18px",
    borderRadius: 10,
    border: "1.5px solid var(--dashboard-box-border)",
    background: "var(--dashboard-tab-box)",
    color: "var(--dashboard-text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
});

const Overlay = styled("div")({
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
});

const ModalCard = styled("div")({
    background: "var(--dashboard-tab-box)",
    borderRadius: 18,
    width: "100%",
    maxWidth: 440,
    padding: "28px 24px 22px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
    textAlign: "center",
});

const EmailModalCard = styled("div")({
    background: "var(--dashboard-tab-box)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
});

const ModalIconWrap = styled("div")(({ tone }) => ({
    width: 72,
    height: 72,
    borderRadius: "50%",
    margin: "0 auto 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: tone === "danger" ? "rgba(220, 38, 38, 0.12)" : "rgba(22, 163, 74, 0.12)",
}));

const ModalIcon = styled("div")(({ tone }) => ({
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: tone === "danger" ? "#DC2626" : "#16A34A",
    color: "#fff",
}));

const ModalTitle = styled("h3")({
    margin: "0 0 8px",
    fontSize: 18,
    fontWeight: 700,
    color: "var(--dashboard-text-primary)",
});

const ModalText = styled("p")({
    margin: "0 0 22px",
    fontSize: 14,
    color: "var(--dashboard-text-secondary)",
    lineHeight: 1.5,
});

const ModalActions = styled("div")({
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
});

const ConfirmBtn = styled("button")(({ tone }) => ({
    height: 42,
    borderRadius: 10,
    border: "none",
    background: tone === "danger" ? "#DC2626" : "#16A34A",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
}));

const isRejectedStatus = (status) =>
    ["rejected", "declined-rejected", "cancelled", "suspicious-activity"].includes(
        String(status || "").trim().toLowerCase()
    );

const getStepsForStatus = (status) => {
    const rejected = isRejectedStatus(status);
    return [
        { key: "submitted", label: "Application submitted" },
        { key: "followed-up", label: "Followed up / E-sign" },
        {
            key: rejected ? "rejected" : "approved",
            label: rejected ? "Rejected" : "Approved",
        },
    ];
};

const STATUS_BADGE_STYLES = {
    draft: { color: "var(--dashboard-text-secondary)", bg: "rgba(100, 116, 139, 0.16)", icon: EditOutlinedIcon },
    approved: { color: "#14B8A6", bg: "rgba(20, 184, 166, 0.16)", icon: CheckCircleOutlineIcon },
    pending: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.14)", icon: AccessTimeIcon },
    "followed-up": { color: "#0EA5E9", bg: "rgba(14, 165, 233, 0.12)", icon: MarkEmailReadOutlinedIcon },
    "under-review": { color: "#0EA5E9", bg: "rgba(14, 165, 233, 0.12)", icon: HourglassEmptyOutlinedIcon },
    "verification-required": { color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.12)", icon: VerifiedUserOutlinedIcon },
    incomplete: { color: "#F97316", bg: "rgba(249, 115, 22, 0.12)", icon: RemoveCircleOutlineIcon },
    "on-hold": { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", icon: PauseCircleOutlineIcon },
    "suspicious-activity": { color: "#EC4899", bg: "rgba(236, 72, 153, 0.12)", icon: ReportProblemOutlinedIcon },
    cancelled: { color: "var(--dashboard-text-secondary)", bg: "rgba(71, 85, 105, 0.12)", icon: CancelOutlinedIcon },
    rejected: { color: "#DC2626", bg: "rgba(220, 38, 38, 0.12)", icon: CancelOutlinedIcon },
    "declined-rejected": { color: "#DC2626", bg: "rgba(220, 38, 38, 0.12)", icon: CancelOutlinedIcon },
    completed: { color: "#16A34A", bg: "rgba(22, 163, 74, 0.12)", icon: CheckCircleOutlineIcon },
};

const AGREEMENT_BADGE_STYLES = {
    pending_signature: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.14)" },
    signed: { color: "#16A34A", bg: "rgba(22, 163, 74, 0.12)" },
};

const formatStatusLabel = (status) => {
    if (!status) return "-";
    return String(status)
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

const formatDate = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(date);
};

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const parseApiErrorMessage = (error, fallback) => {
    const raw = error?.message || "";
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed?.message || parsed?.error || fallback;
    } catch {
        return raw.length < 200 ? raw : fallback;
    }
};

const getInitials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "AG";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const getStepIndex = (status) => {
    const key = String(status || "").trim().toLowerCase();
    if (["declined-rejected", "rejected", "cancelled", "suspicious-activity", "approved"].includes(key)) return 2;
    if (["followed-up", "completed", "email-sent", "under-review", "verification-required", "on-hold"].includes(key)) return 1;
    if (["pending", "draft", "incomplete", "submitted"].includes(key)) return 0;
    return 0;
};

const pickAgreementStatus = (record) => {
    const value = record?.agreementStatus;
    if (value == null) return null;
    const key = String(value).trim().toLowerCase();
    return key || null;
};

const pickAgentName = (data) =>
    data?.name
    || data?.agent?.name
    || data?.agent?.username
    || data?.agentName
    || data?.businessName
    || "Agent";

const normalizeAgentRequest = (payload) => {
    if (!payload || typeof payload !== "object") return null;

    let current = payload;
    for (let i = 0; i < 3; i += 1) {
        const nested = current?.data;
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
            if (nested.id != null || nested.name != null || nested.email != null || nested.status != null) {
                current = nested;
                continue;
            }
            if (nested.result && typeof nested.result === "object" && !Array.isArray(nested.result)) {
                current = nested.result;
                continue;
            }
        }
        if (current?.result && typeof current.result === "object" && !Array.isArray(current.result)) {
            current = current.result;
            continue;
        }
        break;
    }
    return current;
};

const pickStatusKey = (record) => {
    if (!record || typeof record !== "object") return null;
    const candidates = [
        record.status,
        record.data?.status,
        record.result?.status,
        record.applicationStatus,
    ];
    for (const value of candidates) {
        if (value == null) continue;
        const key = String(value).trim().toLowerCase();
        if (key) return key;
    }
    return null;
};

const buildFormFromData = (data = {}) => ({
    name: pickAgentName(data),
    email: data?.email || "",
    jobTitle: data?.jobTitle || "",
    phone: data?.phoneNumber || data?.phone || "",
    address: data?.address || "",
    website: data?.businessWebsite || data?.website || "",
});

const messageToHtml = (message = "") => {
    const text = String(message || "").trim();
    if (!text) return "<p></p>";
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
};

const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });

const AgentManagementDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const tenantName =
        userData?.tenant?.name || "Dolphin Merchant Services";

    usePageTitle("Agent Management Detail", location);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [application, setApplication] = useState(() => {
        const raw = normalizeAgentRequest(location.state?.itemData) || location.state?.itemData || null;
        if (!raw) return null;
        const status = pickStatusKey(raw);
        return status ? { ...raw, status } : raw;
    });
    const [form, setForm] = useState(() => {
        const raw = normalizeAgentRequest(location.state?.itemData) || location.state?.itemData || {};
        const status = pickStatusKey(raw);
        return buildFormFromData(status ? { ...raw, status } : raw);
    });
    const [confirmModal, setConfirmModal] = useState(null);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailAttachments, setEmailAttachments] = useState([]);
    const [emailForm, setEmailForm] = useState({
        to: "",
        cc: "",
        subject: "",
        message: "",
    });

    const fetchDetail = useCallback(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        getRequestWithOutBody(`${baseURl}agent-request/${id}`, accessToken)
            .then((result) => {
                const data = normalizeAgentRequest(result) || result?.data || result;
                const status = pickStatusKey(data) || pickStatusKey(result);
                const next = status ? { ...(data || {}), status } : data;
                setApplication(next);
                setForm(buildFormFromData(next));
            })
            .catch(() => {
                if (!location.state?.itemData) {
                    toast.error("Failed to load agent request details");
                }
            })
            .finally(() => setLoading(false));
    }, [accessToken, id, location.state?.itemData]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const displayName = form.name || pickAgentName(application);
    const resolvedStatus = pickStatusKey(application);
    const statusKey = resolvedStatus || "pending";
    const agreementStatus = pickAgreementStatus(application);
    const isAgreementSigned = agreementStatus === "signed";
    const isFinalStatus = ["approved", "rejected", "declined-rejected", "completed", "cancelled"].includes(statusKey);
    const isPending = resolvedStatus === "pending";
    const isFollowedUp = resolvedStatus === "followed-up";
    const canEditActions = isPending || isFollowedUp;
    const canAcknowledge = isPending && !isAgreementSigned;
    const canResendAgreement = isFollowedUp && !isAgreementSigned;
    const canApprove = isFollowedUp && isAgreementSigned;
    const canReject = isPending || isFollowedUp;
    const statusStyle = STATUS_BADGE_STYLES[statusKey] || {
        color: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.14)",
        icon: PendingOutlinedIcon,
    };
    const StatusIcon = statusStyle.icon || AccessTimeIcon;
    const agreementStyle = AGREEMENT_BADGE_STYLES[agreementStatus] || {
        color: "#64748B",
        bg: "rgba(148, 163, 184, 0.12)",
    };
    const activeStep = getStepIndex(statusKey);
    const submittedLabel = `Submitted ${formatDate(application?.createdAt || application?.submittedAt)}`;
    const partnershipTitle =
        application?.partnershipAgreement?.title || "Agent Partnership Agreement";

    useEffect(() => {
        if (isFinalStatus && isEditing) {
            setIsEditing(false);
            setForm(buildFormFromData(application || {}));
        }
    }, [isFinalStatus, isEditing, application]);

    const openEmailModal = () => {
        setEmailForm({
            to: form.email || application?.email || "",
            cc: "",
            subject: `Application #${application?.id || id || ""} from ${tenantName}`,
            message: "",
        });
        setEmailAttachments([]);
        setEmailModalOpen(true);
    };

    const handleAttachmentChange = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        try {
            const next = await Promise.all(
                files.map(async (file) => ({
                    filename: file.name,
                    content: await readFileAsBase64(file),
                    contentType: file.type || "application/pdf",
                }))
            );
            setEmailAttachments((prev) => [...prev, ...next]);
        } catch {
            toast.error("Failed to read attachment");
        } finally {
            event.target.value = "";
        }
    };

    const removeAttachment = (index) => {
        setEmailAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFieldChange = (key) => (event) => {
        setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setForm(buildFormFromData(application || {}));
    };

    const handleBack = () => {
        if (location.state?.returnTo) {
            navigate(location.state.returnTo);
            return;
        }
        navigate("/home/agentManagement");
    };

    const handleSave = () => {
        if (!id) return;
        setSaving(true);
        const payload = {
            name: form.name,
            email: form.email,
            jobTitle: form.jobTitle,
            phoneNumber: form.phone,
            address: form.address,
            businessWebsite: form.website,
        };
        putRequestWithBodyAndToken(`${baseURl}agent-request/${id}`, accessToken, payload)
            .then((result) => {
                const data = normalizeAgentRequest(result) || result?.data || payload;
                setApplication((prev) => ({
                    ...(prev || {}),
                    ...data,
                    name: data?.name ?? form.name,
                    email: data?.email ?? form.email,
                    jobTitle: data?.jobTitle ?? form.jobTitle,
                    phoneNumber: data?.phoneNumber ?? form.phone,
                    address: data?.address ?? form.address,
                    businessWebsite: data?.businessWebsite ?? form.website,
                }));
                setForm(buildFormFromData({
                    ...(application || {}),
                    ...data,
                    name: data?.name ?? form.name,
                    email: data?.email ?? form.email,
                    jobTitle: data?.jobTitle ?? form.jobTitle,
                    phoneNumber: data?.phoneNumber ?? form.phone,
                    address: data?.address ?? form.address,
                    businessWebsite: data?.businessWebsite ?? form.website,
                }));
                setIsEditing(false);
                toast.success("Details saved");
            })
            .catch(() => {
                toast.error("Failed to save agent request details");
            })
            .finally(() => setSaving(false));
    };

    const updateStatus = (nextStatus) => {
        if (!id) return;
        setSaving(true);
        putRequestWithBodyAndToken(`${baseURl}agent-request/${id}`, accessToken, { status: nextStatus })
            .then((result) => {
                const data = normalizeAgentRequest(result) || result?.data || {};
                const status = pickStatusKey(data) || nextStatus;
                setApplication((prev) => ({ ...(prev || {}), ...data, status }));
                toast.success(
                    nextStatus === "approved"
                        ? "Request approved. Welcome email with credentials will be sent."
                        : nextStatus === "rejected"
                            ? "Request rejected. Rejection email will be sent."
                            : `Request ${formatStatusLabel(nextStatus).toLowerCase()}`
                );
                setConfirmModal(null);
            })
            .catch((error) => {
                toast.error(parseApiErrorMessage(error, "Failed to update request status"));
            })
            .finally(() => setSaving(false));
    };

    const handleAcknowledge = () => {
        if (!id) return;
        setSaving(true);
        postRequestWithBodyAndToken(`${baseURl}agent-request/${id}/acknowledge`, accessToken, {})
            .then((result) => {
                const data = normalizeAgentRequest(result) || result?.data || {};
                const status = pickStatusKey(data) || "followed-up";
                setApplication((prev) => ({
                    ...(prev || {}),
                    ...data,
                    status,
                    agreementStatus: data?.agreementStatus || "pending_signature",
                }));
                toast.success("Acknowledged. E-sign agreement email sent to the agent.");
                setConfirmModal(null);
            })
            .catch((error) => {
                toast.error(parseApiErrorMessage(error, "Failed to acknowledge request"));
            })
            .finally(() => setSaving(false));
    };

    const handleResendAgreement = () => {
        if (!id) return;
        setSaving(true);
        postRequestWithBodyAndToken(`${baseURl}agent-request/${id}/resend-agreement`, accessToken, {})
            .then((result) => {
                const data = normalizeAgentRequest(result) || result?.data || {};
                setApplication((prev) => ({
                    ...(prev || {}),
                    ...data,
                    agreementStatus: data?.agreementStatus || "pending_signature",
                }));
                toast.success("Agreement e-sign email resent successfully.");
                setConfirmModal(null);
            })
            .catch((error) => {
                toast.error(parseApiErrorMessage(error, "Failed to resend agreement email"));
            })
            .finally(() => setSaving(false));
    };

    const handleConfirm = () => {
        if (confirmModal === "approve") updateStatus("approved");
        if (confirmModal === "reject") updateStatus("rejected");
        if (confirmModal === "acknowledge") handleAcknowledge();
        if (confirmModal === "resend") handleResendAgreement();
    };

    const confirmCopy = useMemo(() => {
        if (confirmModal === "acknowledge") {
            return {
                tone: "success",
                title: `Acknowledge ${displayName}'s application?`,
                text: "This moves the request to Followed Up and emails the agent an e-sign link for the Agent Partnership Agreement.",
                confirmLabel: "Acknowledge & Send",
            };
        }
        if (confirmModal === "resend") {
            return {
                tone: "success",
                title: "Resend agreement email?",
                text: "A new e-sign link will be emailed to the agent. The previous unsigned link will stop working.",
                confirmLabel: "Resend Email",
            };
        }
        if (confirmModal === "approve") {
            return {
                tone: "success",
                title: `Approve ${displayName}'s application?`,
                text: "This creates the agent account and sends a welcome email with DERP credentials, DMS video, and demo calendar link.",
                confirmLabel: "Approve",
            };
        }
        if (confirmModal === "reject") {
            return {
                tone: "danger",
                title: `Reject ${displayName}'s application?`,
                text: "This updates the status and sends a rejection email to the agent.",
                confirmLabel: "Reject",
            };
        }
        return {
            tone: "success",
            title: `${displayName}'s application?`,
            text: "This updates the application status and can trigger a notification email.",
            confirmLabel: "Confirm",
        };
    }, [confirmModal, displayName]);

    const handleSendEmail = () => {
        const agentRequestId = Number(application?.id || id);
        if (!Number.isFinite(agentRequestId) || agentRequestId <= 0) {
            toast.error("Invalid agent request id");
            return;
        }
        if (!String(emailForm.message || "").trim()) {
            toast.error("Please enter a message");
            return;
        }

        const payload = {
            agentRequestId,
            html: messageToHtml(emailForm.message),
        };
        if (String(emailForm.cc || "").trim()) {
            payload.cc = String(emailForm.cc).trim();
        }
        if (emailAttachments.length > 0) {
            payload.attachments = emailAttachments;
        }

        setSendingEmail(true);
        postRequestWithBodyAndToken(`${baseURl}agent-request/send`, accessToken, payload)
            .then(() => {
                setEmailModalOpen(false);
                setEmailAttachments([]);
                toast.success("Email sent successfully");
                setApplication((prev) => ({
                    ...(prev || {}),
                    status: prev?.status === "approved" ? "completed" : prev?.status,
                    emailSent: true,
                }));
            })
            .catch(() => {
                toast.error("Failed to send email");
            })
            .finally(() => setSendingEmail(false));
    };

    if (loading && !application) {
        return (
            <Page>
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            </Page>
        );
    }

    return (
        <Page>
            <HeaderRow>
                <TitleGroup>
                    <BackBtn type="button" onClick={handleBack} aria-label="Go back">
                        <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                    </BackBtn>
                    <PageTitle>{isEditing ? displayName : displayName}</PageTitle>
                    <StatusBadge color={statusStyle.color} bg={statusStyle.bg}>
                        <StatusIcon sx={{ fontSize: 15 }} />
                        {formatStatusLabel(statusKey)}
                    </StatusBadge>
                </TitleGroup>

                {canEditActions && (
                    isEditing ? (
                        <PrimaryBtn type="button" onClick={() => setIsEditing(false)}>
                            <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
                            View Details
                        </PrimaryBtn>
                    ) : (
                        <PrimaryBtn type="button" onClick={() => setIsEditing(true)}>
                            <EditOutlinedIcon sx={{ fontSize: 18 }} />
                            Edit Details
                        </PrimaryBtn>
                    )
                )}
            </HeaderRow>

            {!isEditing && canEditActions && (
                <ActionRow>
                    {canAcknowledge && (
                        <OutlineBtn type="button" tone="success" onClick={() => setConfirmModal("acknowledge")}>
                            <MarkEmailReadOutlinedIcon sx={{ fontSize: 18 }} />
                            Acknowledge &amp; Send Agreement
                        </OutlineBtn>
                    )}
                    {canApprove && (
                        <OutlineBtn type="button" tone="success" onClick={() => setConfirmModal("approve")}>
                            <CheckIcon sx={{ fontSize: 18 }} />
                            Approve Request
                        </OutlineBtn>
                    )}
                    {canReject && (
                        <OutlineBtn type="button" tone="danger" onClick={() => setConfirmModal("reject")}>
                            <CloseIcon sx={{ fontSize: 18 }} />
                            Reject Request
                        </OutlineBtn>
                    )}
                    {canResendAgreement && (
                        <OutlineBtn type="button" tone="neutral" onClick={() => setConfirmModal("resend")}>
                            <ReplayOutlinedIcon sx={{ fontSize: 18 }} />
                            Resend Agreement
                        </OutlineBtn>
                    )}
                    <OutlineBtn type="button" tone="neutral" onClick={openEmailModal}>
                        <MailOutlineIcon sx={{ fontSize: 18 }} />
                        Send Mail
                    </OutlineBtn>
                </ActionRow>
            )}

            {!isEditing && isFollowedUp && !isAgreementSigned && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        color: "#B45309",
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    Waiting for the agent to e-sign the partnership agreement. Approve becomes available after signing.
                </div>
            )}

            {!isEditing || isFinalStatus ? (
                <>
                    <Card>
                        <StepperWrap>
                            {getStepsForStatus(statusKey).map((step, index, steps) => {
                                const rejectedFlow = isRejectedStatus(statusKey);
                                const isErrorStep = rejectedFlow && step.key === "rejected";
                                const isLast = index === steps.length - 1;
                                // Rejected: submitted done, email skipped, final rejected
                                const done = rejectedFlow
                                    ? index === 0
                                    : index < activeStep || index === 0;
                                const active = rejectedFlow
                                    ? index === 0 || isErrorStep
                                    : index <= activeStep;
                                const lineDone = !rejectedFlow && index < activeStep;
                                const lineError = rejectedFlow && index === steps.length - 2;

                                return (
                                    <StepItem key={step.key}>
                                        {!isLast && <StepLine done={lineDone} error={lineError} />}
                                        <StepCircle
                                            active={active && !isErrorStep}
                                            done={done && !isErrorStep}
                                            error={isErrorStep}
                                        >
                                            {isErrorStep ? (
                                                <CloseIcon sx={{ fontSize: 18 }} />
                                            ) : done ? (
                                                <CheckIcon sx={{ fontSize: 18 }} />
                                            ) : active && !isErrorStep ? (
                                                <CheckIcon sx={{ fontSize: 18 }} />
                                            ) : (
                                                String(index + 1).padStart(2, "0")
                                            )}
                                        </StepCircle>
                                        <StepLabel
                                            active={active && !isErrorStep}
                                            error={isErrorStep}
                                        >
                                            {step.label}
                                        </StepLabel>
                                    </StepItem>
                                );
                            })}
                        </StepperWrap>
                    </Card>

                    <Card>
                        <ProfileHeader>
                            <Avatar>{getInitials(displayName)}</Avatar>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>{displayName}</div>
                                <div style={{ fontSize: 13, color: "var(--dashboard-text-secondary)", marginTop: 4 }}>
                                    {form.jobTitle || "Agent"} · {submittedLabel}
                                </div>
                            </div>
                        </ProfileHeader>

                        <InfoGrid>
                            <InfoItem>
                                <InfoIcon><MailOutlineIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Email</InfoLabel>
                                    <InfoValue>{form.email || "-"}</InfoValue>
                                </div>
                            </InfoItem>
                            <InfoItem>
                                <InfoIcon><PhoneOutlinedIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Phone</InfoLabel>
                                    <InfoValue>{form.phone || "-"}</InfoValue>
                                </div>
                            </InfoItem>
                            <InfoItem>
                                <InfoIcon><PlaceOutlinedIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Address</InfoLabel>
                                    <InfoValue>{form.address || "-"}</InfoValue>
                                </div>
                            </InfoItem>
                            <InfoItem>
                                <InfoIcon><LanguageOutlinedIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Website</InfoLabel>
                                    <InfoValue>{form.website || "-"}</InfoValue>
                                </div>
                            </InfoItem>
                        </InfoGrid>
                    </Card>

                    <Card>
                        <ProfileHeader style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 16 }}>
                            <Avatar style={{ background: "#E0F2FE", color: "#0369A1" }}>
                                <DrawOutlinedIcon sx={{ fontSize: 26 }} />
                            </Avatar>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>
                                    {partnershipTitle}
                                </div>
                                <div style={{ fontSize: 13, color: "var(--dashboard-text-secondary)", marginTop: 4 }}>
                                    Agreement &amp; e-sign status
                                </div>
                            </div>
                            <StatusBadge color={agreementStyle.color} bg={agreementStyle.bg}>
                                {formatStatusLabel(agreementStatus || "pending_signature")}
                            </StatusBadge>
                        </ProfileHeader>
                        <InfoGrid>
                            <InfoItem>
                                <InfoIcon><AccessTimeIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Signed At</InfoLabel>
                                    <InfoValue>{formatDateTime(application?.signedAt)}</InfoValue>
                                </div>
                            </InfoItem>
                            <InfoItem>
                                <InfoIcon><DescriptionOutlinedIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Sign Link Expires</InfoLabel>
                                    <InfoValue>{formatDateTime(application?.signTokenExpiresAt)}</InfoValue>
                                </div>
                            </InfoItem>
                            <InfoItem>
                                <InfoIcon><VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Signed IP</InfoLabel>
                                    <InfoValue>{application?.signedIpAddress || "-"}</InfoValue>
                                </div>
                            </InfoItem>
                            <InfoItem>
                                <InfoIcon><FileDownloadOutlinedIcon sx={{ fontSize: 18 }} /></InfoIcon>
                                <div>
                                    <InfoLabel>Signature File</InfoLabel>
                                    <InfoValue>
                                        {application?.signatureFileUrl ? (
                                            <a
                                                href={application.signatureFileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: "#0C79F7", fontWeight: 600 }}
                                            >
                                                View signature
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </InfoValue>
                                </div>
                            </InfoItem>
                        </InfoGrid>
                    </Card>
                </>
            ) : (
                <Card>
                    <DetailsHeading>Details:</DetailsHeading>
                    {[
                        { key: "name", label: "Name" },
                        { key: "email", label: "Email" },
                        { key: "jobTitle", label: "Job Title" },
                        { key: "phone", label: "Phone Number" },
                        { key: "address", label: "Address" },
                        { key: "website", label: "Business Website" },
                    ].map((field) => (
                        <FormRow key={field.key}>
                            <FormLabel htmlFor={field.key}>{field.label}</FormLabel>
                            <FormInput
                                id={field.key}
                                value={form[field.key] || ""}
                                onChange={handleFieldChange(field.key)}
                            />
                        </FormRow>
                    ))}

                    <FormFooter>
                        <SecondaryBtn type="button" onClick={handleCancelEdit}>
                            Cancel
                        </SecondaryBtn>
                        <PrimaryBtn type="button" onClick={handleSave} disabled={saving} style={{ height: 42, minWidth: 150 }}>
                            {saving ? "Saving..." : "Save & Continue"}
                        </PrimaryBtn>
                    </FormFooter>
                </Card>
            )}

            {confirmModal && (
                <Overlay onClick={() => !saving && setConfirmModal(null)}>
                    <ModalCard onClick={(e) => e.stopPropagation()}>
                        <ModalIconWrap tone={confirmCopy.tone === "danger" ? "danger" : "success"}>
                            <ModalIcon tone={confirmCopy.tone === "danger" ? "danger" : "success"}>
                                {confirmCopy.tone === "danger" ? (
                                    <CloseIcon sx={{ fontSize: 26 }} />
                                ) : confirmModal === "acknowledge" || confirmModal === "resend" ? (
                                    <MarkEmailReadOutlinedIcon sx={{ fontSize: 26 }} />
                                ) : (
                                    <CheckIcon sx={{ fontSize: 26 }} />
                                )}
                            </ModalIcon>
                        </ModalIconWrap>
                        <ModalTitle>{confirmCopy.title}</ModalTitle>
                        <ModalText>{confirmCopy.text}</ModalText>
                        <ModalActions>
                            <SecondaryBtn type="button" disabled={saving} onClick={() => setConfirmModal(null)}>
                                Cancel
                            </SecondaryBtn>
                            <ConfirmBtn
                                type="button"
                                tone={confirmCopy.tone === "danger" ? "danger" : "success"}
                                disabled={saving}
                                onClick={handleConfirm}
                            >
                                {saving ? "Saving..." : confirmCopy.confirmLabel}
                            </ConfirmBtn>
                        </ModalActions>
                    </ModalCard>
                </Overlay>
            )}

            {emailModalOpen && (
                <Overlay onClick={() => !sendingEmail && setEmailModalOpen(false)}>
                    <EmailModalCard onClick={(e) => e.stopPropagation()}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "18px 20px",
                                borderBottom: "1px solid var(--dashboard-box-border)",
                            }}
                        >
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>Send Email</div>
                            <button
                                type="button"
                                onClick={() => !sendingEmail && setEmailModalOpen(false)}
                                disabled={sendingEmail}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: sendingEmail ? "not-allowed" : "pointer",
                                    color: "var(--dashboard-text-secondary)",
                                    display: "inline-flex",
                                }}
                                aria-label="Close"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div style={{ padding: 20 }}>
                            {[
                                { key: "to", label: "To", placeholder: "Recipient email" },
                                {
                                    key: "cc",
                                    label: "CC / BCC (Optional)",
                                    placeholder: "Additional email addresses separated by commas",
                                },
                                { key: "subject", label: "Subject", placeholder: "Email subject" },
                            ].map((field) => (
                                <div key={field.key} style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fieldsTitle)", marginBottom: 6 }}>
                                        {field.label}
                                    </div>
                                    <FormInput
                                        value={emailForm[field.key]}
                                        placeholder={field.placeholder}
                                        onChange={(e) =>
                                            setEmailForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                                        }
                                    />
                                </div>
                            ))}

                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fieldsTitle)", marginBottom: 6 }}>
                                    Message
                                </div>
                                <textarea
                                    value={emailForm.message}
                                    onChange={(e) =>
                                        setEmailForm((prev) => ({ ...prev, message: e.target.value }))
                                    }
                                    placeholder="Write your message here..."
                                    rows={6}
                                    style={{
                                        width: "100%",
                                        borderRadius: 10,
                                        border: "1px solid var(--dashboard-box-border)",
                                        background: "var(--dashboard-tab-box)",
                                        padding: 12,
                                        fontSize: 14,
                                        color: "var(--dashboard-text-primary)",
                                        resize: "vertical",
                                        outline: "none",
                                        lineHeight: 1.5,
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10,
                                    padding: 12,
                                    borderRadius: 12,
                                    background: "rgba(0, 89, 245, 0.08)",
                                    border: "1px solid rgba(0, 89, 245, 0.25)",
                                    marginBottom: 18,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 10,
                                                background: "#DBEAFE",
                                                color: "#2563EB",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <FileDownloadOutlinedIcon sx={{ fontSize: 20 }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>
                                                Attachments
                                            </div>
                                            <div style={{ fontSize: 12, color: "var(--dashboard-text-secondary)", marginTop: 2 }}>
                                                Optional PDF or files (sent as base64)
                                            </div>
                                        </div>
                                    </div>
                                    <label
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            height: 34,
                                            padding: "0 12px",
                                            borderRadius: 8,
                                            border: "1px solid #93C5FD",
                                            background: "var(--dashboard-tab-box)",
                                            color: "#1D4ED8",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Add file
                                        <input
                                            type="file"
                                            accept=".pdf,image/*,.doc,.docx"
                                            multiple
                                            onChange={handleAttachmentChange}
                                            style={{ display: "none" }}
                                        />
                                    </label>
                                </div>

                                {emailAttachments.length > 0 ? (
                                    emailAttachments.map((file, index) => (
                                        <div
                                            key={`${file.filename}-${index}`}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 8,
                                                padding: "8px 10px",
                                                borderRadius: 8,
                                                background: "var(--dashboard-tab-box)",
                                                border: "1px solid rgba(0, 89, 245, 0.25)",
                                            }}
                                        >
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dashboard-text-primary)" }}>
                                                {file.filename}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                style={{
                                                    border: "none",
                                                    background: "transparent",
                                                    color: "#DC2626",
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontSize: 12, color: "var(--dashboard-text-secondary)" }}>No attachments selected</div>
                                )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                <SecondaryBtn type="button" disabled={sendingEmail} onClick={() => setEmailModalOpen(false)}>
                                    Cancel
                                </SecondaryBtn>
                                <PrimaryBtn type="button" disabled={sendingEmail} onClick={handleSendEmail} style={{ height: 42 }}>
                                    <SendIcon sx={{ fontSize: 16 }} />
                                    {sendingEmail ? "Sending..." : "Send Email"}
                                </PrimaryBtn>
                            </div>
                        </div>
                    </EmailModalCard>
                </Overlay>
            )}
        </Page>
    );
};

export default AgentManagementDetail;
