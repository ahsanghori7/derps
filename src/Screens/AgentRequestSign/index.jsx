import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";
import { getPublicRequest, postPublicFormData, postPublicRequest } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";

/** Accepts string URL or file object returned by public upload-signature. */
const extractSignatureFileUrl = (result) => {
    const data = result?.data ?? result;
    const candidates = [
        data?.signatureFileUrl,
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
                // Prefer full file object when metadata is present (API accepts either).
                if (candidate.mimetype || candidate.originalname) return candidate;
                return candidate.url.trim();
            }
        }
    }
    return null;
};

const SIGNATURE_REQUIRED_MESSAGE = "Please provide your signature";

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

/** Fixed shell so page scrolls even when global body has overflow:hidden */
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

const AgentRequestSign = () => {
    const [searchParams] = useSearchParams();
    const token = String(searchParams.get("token") || "").trim();
    const signatureRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState(null);
    const [error, setError] = useState("");
    const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
    const [pdfError, setPdfError] = useState("");
    const [pdfLoading, setPdfLoading] = useState(false);
    const [signatureError, setSignatureError] = useState("");

    const loadPdf = useCallback(async (signToken) => {
        if (!signToken) {
            setPdfObjectUrl(null);
            setPdfError("");
            return;
        }

        setPdfLoading(true);
        setPdfError("");
        setPdfObjectUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });

        try {
            const response = await fetch(
                `${baseURl}agent-request/public/agreement.pdf?token=${encodeURIComponent(signToken)}`,
                { method: "GET", cache: "no-store" }
            );

            const contentType = String(response.headers.get("content-type") || "").toLowerCase();

            if (!response.ok) {
                let message = "Agreement PDF could not be loaded.";
                try {
                    if (contentType.includes("application/json")) {
                        const payload = await response.json();
                        message = payload?.message || payload?.error || message;
                    } else {
                        const text = await response.text();
                        if (text) {
                            try {
                                const payload = JSON.parse(text);
                                message = payload?.message || payload?.error || message;
                            } catch {
                                message = text.slice(0, 180);
                            }
                        }
                    }
                } catch {
                    // keep default
                }
                setPdfError(message);
                return;
            }

            if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
                // Some APIs return JSON error with 200; still guard against non-PDF bodies.
                const probe = await response.clone().text();
                try {
                    const payload = JSON.parse(probe);
                    setPdfError(payload?.message || payload?.error || "Agreement PDF template file not found.");
                    return;
                } catch {
                    setPdfError("Agreement PDF template file not found.");
                    return;
                }
            }

            const blob = await response.blob();
            if (!blob || blob.size === 0) {
                setPdfError("Agreement PDF template file not found.");
                return;
            }

            // Reject accidental JSON blobs served as octet-stream
            if (blob.type && blob.type.includes("json")) {
                setPdfError("Agreement PDF template file not found.");
                return;
            }

            setPdfObjectUrl(URL.createObjectURL(blob));
        } catch {
            setPdfError("Agreement PDF could not be loaded.");
        } finally {
            setPdfLoading(false);
        }
    }, []);

    const loadView = useCallback(async () => {
        if (!token) {
            setError("Missing or invalid signing link.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const result = await getPublicRequest(
                `${baseURl}agent-request/public/view?token=${encodeURIComponent(token)}`
            );
            setView(result?.data || result);
            await loadPdf(token);
        } catch (err) {
            setError(err?.message || "Unable to load agreement for signing.");
            setView(null);
        } finally {
            setLoading(false);
        }
    }, [token, loadPdf]);

    useEffect(() => {
        loadView();
    }, [loadView]);

    useEffect(() => () => {
        if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    }, [pdfObjectUrl]);

    const canSign = Boolean(view?.agreement?.canSign);
    const alreadySigned = String(view?.agreementStatus || "").toLowerCase() === "signed";

    const handleClear = () => {
        signatureRef.current?.clear?.();
        setSignatureError("");
    };

    const handleSign = async () => {
        if (!token || !canSign || submitting) return;
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

            const uploadUrl = `${baseURl}agent-request/public/upload-signature?token=${encodeURIComponent(token)}`;
            const uploadResult = await postPublicFormData(uploadUrl, formData);
            const signatureFileUrl = extractSignatureFileUrl(uploadResult);
            if (!signatureFileUrl) {
                throw new Error("Failed to upload signature");
            }

            await postPublicRequest(`${baseURl}agent-request/public/sign`, {
                token,
                signatureFileUrl,
            });

            toast.success("Agreement signed successfully");
            await loadView();
        } catch (err) {
            toast.error(err?.message || "Failed to sign agreement");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ ...pageShellStyle, display: "grid", placeItems: "center" }}>
                <Loader message="Loading agreement..." subMessage="Please wait" />
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
                        {view?.agreement?.title || "Agent Partnership Agreement"}
                    </h1>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 14 }}>
                        {view?.name || "Applicant"}
                        {view?.email ? ` · ${view.email}` : ""}
                    </p>
                    {alreadySigned && (
                        <p style={{ margin: "12px 0 0", color: "#16A34A", fontSize: 14, fontWeight: 600 }}>
                            This agreement has already been signed
                            {view?.signedAt ? ` on ${new Date(view.signedAt).toLocaleString()}` : ""}.
                        </p>
                    )}
                </div>

                <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                    <div
                        style={{
                            padding: "14px 20px",
                            borderBottom: "1px solid #E2E8F0",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#0F172A",
                        }}
                    >
                        Agreement document
                    </div>

                    {pdfLoading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 14 }}>
                            Loading PDF...
                        </div>
                    ) : pdfObjectUrl ? (
                        <iframe
                            title="Agent Partnership Agreement"
                            src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=FitH`}
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
                        <div
                            style={{
                                margin: 20,
                                padding: "18px 16px",
                                borderRadius: 12,
                                background: "rgba(220, 38, 38, 0.08)",
                                border: "1px solid rgba(220, 38, 38, 0.25)",
                                color: "#B91C1C",
                                fontSize: 14,
                                lineHeight: 1.5,
                                fontWeight: 600,
                            }}
                        >
                            {pdfError || "Agreement PDF template file not found."}
                            <div style={{ marginTop: 8, color: "#64748B", fontWeight: 500 }}>
                                The partnership agreement PDF still needs to be uploaded in Agreements
                                (template key: agent-partnership-agreement). Scroll down to continue
                                {canSign ? " with e-sign" : ""}.
                            </div>
                        </div>
                    )}
                </div>

                {canSign ? (
                    <div style={cardStyle}>
                        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                            Sign agreement
                        </h2>
                        <p style={{ margin: "0 0 16px", color: "#64748B", fontSize: 14 }}>
                            Draw your signature below, then submit to complete e-sign.
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
                ) : null}
            </div>
        </div>
    );
};

export default AgentRequestSign;
