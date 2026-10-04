import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";
import {
    getPublicRequest,
    postPublicFormData,
    postPublicRequest,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";

const SIGNATURE_REQUIRED_MESSAGE = "Please provide your signature";

const extractSignatureFileUrl = (result) => {
    const data = result?.data ?? result;
    const candidates = [
        data?.signatureFileUrl,
        data?.merchantSignatureFileUrl,
        data?.fileUrl,
        data?.uploadedFiles,
        data?.file,
        data?.url,
        data,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
        if (candidate && typeof candidate === "object") {
            if (typeof candidate.url === "string" && candidate.url.trim()) {
                if (candidate.mimetype || candidate.originalname) return candidate;
                return candidate.url.trim();
            }
        }
    }
    return null;
};

const fileToUrl = (file) => {
    if (!file) return null;
    if (typeof file === "string" && file.trim()) return file.trim();
    if (typeof file?.url === "string" && file.url.trim()) return file.url.trim();
    return null;
};

const resolvePublicFileUrl = (file) => {
    const raw = fileToUrl(file);
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const origin = String(baseURl || "")
        .replace(/\/api\/?$/i, "")
        .replace(/\/$/, "");
    if (!origin) return raw;
    return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
};

const isPdfFile = (mimetype, url, name) => {
    if (mimetype && /pdf/i.test(mimetype)) return true;
    return /\.pdf($|\?|#)/i.test(`${name || ""} ${url || ""}`);
};

const formatDateTime = (value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const parseApiError = (error) => {
    const raw = error?.message || error || "Something went wrong";
    if (typeof raw !== "string") return "Something went wrong";
    try {
        const parsed = JSON.parse(raw);
        return parsed?.message || parsed?.error || raw;
    } catch {
        return raw.slice(0, 240);
    }
};

const isSignatureBlank = (pad) => {
    if (!pad) return true;
    try {
        if (typeof pad.isEmpty === "function" && pad.isEmpty()) return true;
        if (typeof pad.toData === "function") {
            const strokes = pad.toData();
            return !Array.isArray(strokes) || strokes.length === 0;
        }
    } catch {
        return true;
    }
    return true;
};

const getFileMeta = (file) => {
    if (!file) return { url: null, mimetype: "", name: "" };
    if (typeof file === "object") {
        const url = resolvePublicFileUrl(file);
        return {
            url,
            mimetype: file.mimetype || file.mimeType || "",
            name: file.originalname || file.name || file.originalName || "",
        };
    }
    const url = resolvePublicFileUrl(file);
    return {
        url,
        mimetype: "",
        name: url ? url.split("/").pop()?.split("?")[0] || "" : "",
    };
};

const normalizeAgreement = (doc, index = 0) => {
    if (!doc || typeof doc !== "object") return null;
    const unsigned = doc.unsignedFileUrl || doc.fileUrl || doc.file || null;
    const signedFile = doc.signedFileUrl || doc.signedFile || null;
    const unsignedMeta = getFileMeta(unsigned || (typeof doc.url === "string" ? doc.url : null));
    const signedMeta = getFileMeta(signedFile);
    const signed =
        Boolean(signedMeta.url)
        || Boolean(doc.signed)
        || String(doc.status || "").toLowerCase() === "signed"
        || Boolean(doc.signedAt);
    const title =
        doc.title
        || unsigned?.originalname
        || signedFile?.originalname
        || `Agreement ${index + 1}`;

    return {
        agreementId: doc.agreementId ?? doc.documentId ?? null,
        title,
        status: doc.status || (signed ? "signed" : "pending"),
        signed,
        canSign: doc.canSign !== false && !signed,
        url: signedMeta.url || unsignedMeta.url,
        unsignedFileUrl: unsigned,
        signedFileUrl: signedFile,
        signatureFileUrl: doc.signatureFileUrl || doc.merchantSignatureFileUrl || null,
        signedAt: doc.signedAt || null,
        mimetype:
            signedFile?.mimetype
            || unsigned?.mimetype
            || unsignedMeta.mimetype
            || "application/pdf",
        originalname:
            signedFile?.originalname
            || unsigned?.originalname
            || unsignedMeta.name
            || `${title}.pdf`,
    };
};

const collectAgreements = (data) => {
    const lists = [
        data?.agreements,
        data?.agreementDocuments,
        data?.agreementFileUrls,
        data?.documents,
        data?.files,
    ];

    for (const list of lists) {
        if (Array.isArray(list) && list.length) {
            return list.map((doc, index) => normalizeAgreement(doc, index)).filter(Boolean);
        }
    }

    if (data?.agreement && typeof data.agreement === "object") {
        const single = normalizeAgreement(data.agreement, 0);
        return single ? [single] : [];
    }

    const hasFile = data?.unsignedFileUrl || data?.signedFileUrl || data?.fileUrl || data?.url;
    if (hasFile) {
        const fallback = normalizeAgreement(data, 0);
        if (fallback) return [fallback];
    }
    return [];
};

const agreementKey = (doc, index = 0) =>
    doc?.agreementId != null && String(doc.agreementId) !== ""
        ? String(doc.agreementId)
        : `idx-${index}`;

const pageShellStyle = {
    position: "fixed",
    inset: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    background: "#F8FAFC",
    zIndex: 1,
};

const cardStyle = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E2E8F0",
    padding: 24,
    marginBottom: 16,
};

const ApplicationAgreementSign = () => {
    const [searchParams] = useSearchParams();
    const token = String(searchParams.get("token") || "").trim();
    const requestedAgreementId = String(searchParams.get("agreementId") || "").trim();
    const signatureRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState(null);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState("");
    const [signatureError, setSignatureError] = useState("");

    const loadView = useCallback(async ({ silent = false } = {}) => {
        if (!token) {
            setError("Missing or invalid signing link.");
            setLoading(false);
            return;
        }

        if (!silent) setLoading(true);
        setError("");
        try {
            const result = await getPublicRequest(
                `${baseURl}application/public/agreement/view?token=${encodeURIComponent(token)}`
            );
            setView(result?.data ?? result);
        } catch (err) {
            setError(parseApiError(err) || "Unable to load agreements for signing.");
            setView(null);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadView();
    }, [loadView]);

    const agreements = useMemo(() => collectAgreements(view || {}), [view]);
    const unsignedAgreements = useMemo(
        () => agreements.filter((doc) => doc.canSign && !doc.signed),
        [agreements]
    );

    const selectedAgreement = useMemo(() => {
        if (!agreements.length) return null;
        const match = agreements.find((doc, index) => agreementKey(doc, index) === String(selectedId));
        return match || unsignedAgreements[0] || agreements[0];
    }, [agreements, selectedId, unsignedAgreements]);

    useEffect(() => {
        if (!agreements.length) {
            setSelectedId("");
            return;
        }

        setSelectedId((prev) => {
            const prevDoc = agreements.find((doc, index) => agreementKey(doc, index) === String(prev));
            if (prevDoc && !prevDoc.signed) return prev;

            const requested = requestedAgreementId
                ? agreements.find((doc) => String(doc.agreementId ?? "") === requestedAgreementId)
                : null;
            if (requested && !requested.signed) {
                return agreementKey(requested, agreements.indexOf(requested));
            }

            const firstUnsigned = unsignedAgreements[0];
            if (firstUnsigned) {
                return agreementKey(firstUnsigned, agreements.indexOf(firstUnsigned));
            }
            if (prevDoc) return prev;
            return agreementKey(agreements[0], 0);
        });
    }, [agreements, requestedAgreementId, unsignedAgreements]);

    const merchantLabel =
        view?.dbaName
        || view?.businessName
        || view?.legalName
        || view?.merchant?.dbaName
        || view?.merchant?.businessName
        || view?.customer?.dbaName
        || view?.name
        || "";
    const merchantEmail = view?.email || view?.merchant?.email || view?.customer?.email || "";
    const ownerName = [view?.ownerFirstName, view?.ownerLastName].filter(Boolean).join(" ").trim();
    const viewCanSign = view?.canSign !== false;
    const selectedCanSign = Boolean(viewCanSign && selectedAgreement?.canSign && !selectedAgreement?.signed);
    const allSigned = agreements.length > 0 && agreements.every((doc) => doc.signed);
    const selectedMeta = getFileMeta(
        selectedAgreement?.signed
            ? selectedAgreement.signedFileUrl || selectedAgreement.url
            : selectedAgreement?.unsignedFileUrl || selectedAgreement?.url
    );
    const showPdf = isPdfFile(
        selectedMeta.mimetype || selectedAgreement?.mimetype,
        selectedMeta.url,
        selectedMeta.name || selectedAgreement?.originalname
    );

    const handleClear = () => {
        signatureRef.current?.clear?.();
        setSignatureError("");
    };

    const handleSign = async () => {
        if (!token || !selectedCanSign || submitting) return;
        if (isSignatureBlank(signatureRef.current)) {
            setSignatureError(SIGNATURE_REQUIRED_MESSAGE);
            toast.error(SIGNATURE_REQUIRED_MESSAGE);
            return;
        }
        setSignatureError("");
        setSubmitting(true);

        try {
            const dataUrl = signatureRef.current.toDataURL("image/png");
            const blob = await fetch(dataUrl).then((res) => res.blob());
            const file = new File([blob], "signature.png", { type: "image/png" });
            const formData = new FormData();
            formData.append("file", file);

            const uploadResult = await postPublicFormData(
                `${baseURl}application/public/agreement/upload-signature?token=${encodeURIComponent(token)}`,
                formData
            );
            const signatureFileUrl = extractSignatureFileUrl(uploadResult);
            if (!signatureFileUrl) {
                throw new Error("Failed to upload signature");
            }

            const body = { token, signatureFileUrl };
            if (agreements.length > 1 && selectedAgreement?.agreementId != null) {
                body.agreementId = selectedAgreement.agreementId;
            }

            await postPublicRequest(`${baseURl}application/public/agreement/sign`, body);
            toast.success(
                agreements.length > 1
                    ? `${selectedAgreement?.title || "Agreement"} signed successfully`
                    : "Agreement signed successfully"
            );

            signatureRef.current?.clear?.();
            await loadView({ silent: true });
        } catch (err) {
            toast.error(parseApiError(err) || "Failed to sign agreement");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ ...pageShellStyle, display: "grid", placeItems: "center" }}>
                <Loader message="Loading agreements..." subMessage="Please wait" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ ...pageShellStyle, display: "grid", placeItems: "center", padding: 24 }}>
                <div style={{ ...cardStyle, maxWidth: 480, width: "100%", textAlign: "center", marginBottom: 0 }}>
                    <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#0F172A" }}>
                        Unable to open agreement
                    </h1>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 14, lineHeight: 1.5 }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...pageShellStyle, padding: "24px 16px 48px" }}>
            <div style={{ maxWidth: 920, margin: "0 auto" }}>
                <div style={cardStyle}>
                    <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: "#0F172A" }}>
                        Review & sign agreements
                    </h1>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 14 }}>
                        {[merchantLabel || "Merchant", merchantEmail, ownerName].filter(Boolean).join(" · ")}
                    </p>
                    {view?.signTokenExpiresAt && viewCanSign && !allSigned && (
                        <p style={{ margin: "10px 0 0", color: "#64748B", fontSize: 13 }}>
                            Link expires {formatDateTime(view.signTokenExpiresAt)}
                        </p>
                    )}
                    {allSigned && (
                        <p style={{ margin: "12px 0 0", color: "#16A34A", fontSize: 14, fontWeight: 600 }}>
                            {agreements.length > 1
                                ? "All agreements in this email have been signed."
                                : `This agreement has already been signed${selectedAgreement?.signedAt ? ` on ${formatDateTime(selectedAgreement.signedAt)}` : ""}.`}
                        </p>
                    )}
                </div>

                {agreements.length > 1 && (
                    <div style={cardStyle}>
                        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                            Agreements in this email
                        </h2>
                        <div style={{ display: "grid", gap: 10 }}>
                            {agreements.map((doc, index) => {
                                const id = agreementKey(doc, index);
                                const active = agreementKey(selectedAgreement, agreements.indexOf(selectedAgreement)) === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setSelectedId(id)}
                                        style={{
                                            textAlign: "left",
                                            border: active ? "2px solid #0C79F7" : "1px solid #E2E8F0",
                                            background: active ? "rgba(12, 121, 247, 0.06)" : "#fff",
                                            borderRadius: 12,
                                            padding: "12px 14px",
                                            cursor: "pointer",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            alignItems: "center",
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>
                                                {index + 1}. {doc.title}
                                            </div>
                                            {doc.signedAt && doc.signed && (
                                                <div style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>
                                                    Signed {formatDateTime(doc.signedAt)}
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                borderRadius: 999,
                                                padding: "4px 10px",
                                                color: doc.signed ? "#059669" : "#0C79F7",
                                                background: doc.signed
                                                    ? "rgba(16, 185, 129, 0.12)"
                                                    : "rgba(12, 121, 247, 0.12)",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {doc.signed ? "Signed" : "Needs signature"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {selectedAgreement && (
                    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                        <div
                            style={{
                                padding: "14px 20px",
                                borderBottom: "1px solid #E2E8F0",
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                                {selectedAgreement.title}
                            </div>
                            {selectedMeta.url && (
                                <a
                                    href={selectedMeta.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        color: "#0C79F7",
                                        fontWeight: 600,
                                        fontSize: 13,
                                        textDecoration: "none",
                                    }}
                                >
                                    Open / download
                                </a>
                            )}
                        </div>
                        {selectedMeta.url && showPdf ? (
                            <iframe
                                title={selectedAgreement.title}
                                src={`${selectedMeta.url}#toolbar=1&navpanes=0&view=FitH`}
                                style={{
                                    width: "100%",
                                    height: "62vh",
                                    maxHeight: 640,
                                    minHeight: 320,
                                    border: "none",
                                    display: "block",
                                    background: "#F1F5F9",
                                }}
                            />
                        ) : (
                            <div style={{ padding: 24, color: "#64748B", fontSize: 14 }}>
                                {selectedMeta.url
                                    ? "Preview is not available for this file. Use Open / download to review it before signing."
                                    : "Agreement PDF could not be loaded."}
                            </div>
                        )}
                    </div>
                )}

                {selectedAgreement?.signatureFileUrl && selectedAgreement.signed && (
                    <div style={cardStyle}>
                        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                            Signature
                        </h2>
                        <img
                            src={resolvePublicFileUrl(selectedAgreement.signatureFileUrl)}
                            alt="Signature"
                            style={{
                                maxHeight: 120,
                                border: "1px solid #E2E8F0",
                                borderRadius: 8,
                                padding: 8,
                                background: "#fff",
                            }}
                        />
                    </div>
                )}

                {selectedCanSign && (
                    <div style={cardStyle}>
                        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                            Sign agreement
                        </h2>
                        <p style={{ margin: "0 0 16px", color: "#64748B", fontSize: 14 }}>
                            {agreements.length > 1
                                ? `Review ${selectedAgreement?.title || "this agreement"}, then draw your signature and submit.`
                                : "Draw your signature below, then submit to complete e-sign."}
                        </p>
                        <div
                            style={{
                                border: signatureError ? "1.5px solid #DC2626" : "1px solid #CBD5E1",
                                borderRadius: 12,
                                overflow: "hidden",
                                background: "#fff",
                                maxWidth: 480,
                            }}
                        >
                            <SignatureCanvas
                                ref={signatureRef}
                                onBegin={() => setSignatureError("")}
                                penColor="#0F172A"
                                canvasProps={{
                                    width: 460,
                                    height: 160,
                                    className: "bg-white",
                                    style: { width: "100%", height: 160, touchAction: "none" },
                                }}
                            />
                        </div>
                        {signatureError ? (
                            <div style={{ marginTop: 8, color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
                                {signatureError}
                            </div>
                        ) : null}
                        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={submitting}
                                style={{
                                    height: 42,
                                    padding: "0 16px",
                                    borderRadius: 10,
                                    border: "1.5px solid #CBD5E1",
                                    background: "#fff",
                                    color: "#0F172A",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={handleSign}
                                disabled={submitting}
                                style={{
                                    height: 42,
                                    padding: "0 18px",
                                    borderRadius: 10,
                                    border: "none",
                                    background: "#0C79F7",
                                    color: "#fff",
                                    fontWeight: 700,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    opacity: submitting ? 0.7 : 1,
                                }}
                            >
                                {submitting ? "Submitting..." : "Sign & Submit"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplicationAgreementSign;
