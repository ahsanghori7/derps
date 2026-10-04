import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { toast } from "react-toastify";
import {
  getPublicRequest,
  postPublicFormData,
  postPublicRequest,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import {
  formatDateTime,
  getFileMeta,
  getMerchantLabel,
  getStatusMeta,
  isPdfFile,
  parseApiError,
  resolvePublicFileUrl,
} from "../MerchantChangeRequest/utils";

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
        if (candidate.mimetype || candidate.originalname) return candidate;
        return candidate.url.trim();
      }
    }
  }
  return null;
};

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

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "#0C79F7",
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
};

const FileCard = ({ title, file, subtitle }) => {
  const meta = getFileMeta(file);
  if (!meta.url) return null;

  const showPdf = isPdfFile(meta.mimetype, meta.url, meta.name);

  return (
    <div style={cardStyle}>
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: 16,
          fontWeight: 700,
          color: "#0F172A",
        }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748B" }}>
          {subtitle}
        </p>
      ) : (
        <div style={{ height: 8 }} />
      )}
      <a href={meta.url} target="_blank" rel="noreferrer" style={linkStyle}>
        Open / download {meta.name || "file"}{" "}
        <OpenInNewIcon sx={{ fontSize: 16 }} />
      </a>
      {showPdf && (
        <iframe
          title={title}
          src={`${meta.url}#toolbar=1&navpanes=0&view=FitH`}
          style={{
            width: "100%",
            height: "48vh",
            minHeight: 280,
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            marginTop: 14,
            background: "#F1F5F9",
          }}
        />
      )}
    </div>
  );
};

const ChangeRequestSign = () => {
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get("token") || "").trim();
  const signatureRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState(null);
  const [error, setError] = useState("");

  const loadView = useCallback(async () => {
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      setError("Missing or invalid signing link.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getPublicRequest(
        `${baseURl}change-request/public/view?token=${encodeURIComponent(token)}`
      );
      setView(result?.data || result);
    } catch (err) {
      setError(parseApiError(err) || "Unable to load this change request.");
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadView();
  }, [loadView]);

  const canSign = Boolean(view?.canSign);
  const statusMeta = getStatusMeta(view?.status);
  const docUrl = resolvePublicFileUrl(view?.fileUrl);
  const sigUrl = resolvePublicFileUrl(view?.signatureFileUrl);
  const signedFile = view?.signedFileUrl;
  const summaryFile = view?.summaryFileUrl;
  const hasSignedDocs = Boolean(
    resolvePublicFileUrl(signedFile) || resolvePublicFileUrl(summaryFile)
  );

  const handleClear = () => {
    signatureRef.current?.clear?.();
  };

  const handleSign = async () => {
    if (!token || !canSign || submitting) return;
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error("Please provide your signature");
      return;
    }

    setSubmitting(true);
    try {
      const dataUrl = signatureRef.current.toDataURL("image/png");
      const blob = await fetch(dataUrl).then((res) => res.blob());
      const file = new File([blob], "signature.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("file", file);

      const uploadUrl = `${baseURl}change-request/public/upload-signature?token=${encodeURIComponent(token)}`;
      const uploadResult = await postPublicFormData(uploadUrl, formData);
      const signatureFileUrl = extractSignatureFileUrl(uploadResult);
      if (!signatureFileUrl) {
        throw new Error("Failed to upload signature");
      }

      const signResult = await postPublicRequest(
        `${baseURl}change-request/public/sign`,
        {
          token,
          signatureFileUrl,
        }
      );

      // Prefer immediate response fields if view reload is delayed
      const signedData = signResult?.data ?? signResult;
      if (signedData && typeof signedData === "object") {
        setView((prev) => ({
          ...(prev || {}),
          ...signedData,
          canSign: false,
        }));
      }

      toast.success("Change request signed successfully");
      await loadView();
    } catch (err) {
      toast.error(parseApiError(err) || "Failed to sign");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...pageShellStyle, display: "grid", placeItems: "center" }}>
        <Loader message="Loading request..." subMessage="Please wait" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          ...pageShellStyle,
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            ...cardStyle,
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            marginBottom: 0,
          }}
        >
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 22,
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Unable to open link
          </h1>
          <p style={{ margin: 0, color: "#64748B", fontSize: 14, lineHeight: 1.5 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...pageShellStyle, padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1
                style={{
                  margin: "0 0 6px",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#0F172A",
                }}
              >
                Merchant Change Request
              </h1>
              <p style={{ margin: 0, color: "#64748B", fontSize: 14 }}>
                {getMerchantLabel(view?.customer)}
              </p>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                color: statusMeta.color,
                background: statusMeta.bg,
              }}
            >
              {statusMeta.label}
            </span>
          </div>

          <dl
            style={{
              margin: "16px 0 0",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              fontSize: 14,
            }}
          >
            <div>
              <dt style={{ color: "#94A3B8", fontSize: 12 }}>Process Type</dt>
              <dd style={{ margin: "2px 0 0", fontWeight: 600, color: "#0F172A" }}>
                {view?.processType?.title || "—"}
              </dd>
            </div>
            <div>
              <dt style={{ color: "#94A3B8", fontSize: 12 }}>Request Type</dt>
              <dd style={{ margin: "2px 0 0", fontWeight: 600, color: "#0F172A" }}>
                {view?.requestType?.title || "—"}
              </dd>
            </div>
            {view?.signTokenExpiresAt && canSign && (
              <div style={{ gridColumn: "1 / -1" }}>
                <dt style={{ color: "#94A3B8", fontSize: 12 }}>Link expires</dt>
                <dd style={{ margin: "2px 0 0", color: "#475569" }}>
                  {formatDateTime(view.signTokenExpiresAt)}
                </dd>
              </div>
            )}
          </dl>

          {view?.notes && (
            <p
              style={{
                margin: "16px 0 0",
                padding: 12,
                background: "#F8FAFC",
                borderRadius: 8,
                fontSize: 13,
                color: "#475569",
                lineHeight: 1.5,
              }}
            >
              {view.notes}
            </p>
          )}

          {!canSign && view?.signedAt && (
            <p
              style={{
                margin: "14px 0 0",
                color: "#16A34A",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Signed on {formatDateTime(view.signedAt)}.
            </p>
          )}
        </div>

        {/* Before sign: original document. After sign: prefer signed/summary docs. */}
        {canSign && docUrl && (
          <FileCard
            title="Document"
            file={view?.fileUrl}
            subtitle="Please review this document before signing."
          />
        )}

        {!canSign && (
          <>
            <FileCard
              title="Signed Document"
              file={signedFile}
              subtitle="Your signed change request document."
            />
            <FileCard
              title="Summary Document"
              file={summaryFile}
              subtitle="Summary generated after signing."
            />
            {!hasSignedDocs && docUrl && (
              <FileCard title="Document" file={view?.fileUrl} />
            )}
          </>
        )}

        {sigUrl && !canSign && (
          <div style={cardStyle}>
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 16,
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              Your signature
            </h2>
            <img
              src={sigUrl}
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

        {canSign && (
          <div style={cardStyle}>
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 16,
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              Sign to confirm
            </h2>
            <p style={{ margin: "0 0 12px", color: "#64748B", fontSize: 13 }}>
              Draw your signature below, then submit.
            </p>
            <div
              style={{
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                background: "#fff",
                overflow: "hidden",
              }}
            >
              <SignatureCanvas
                ref={signatureRef}
                penColor="#0F172A"
                canvasProps={{
                  width: 640,
                  height: 180,
                  className: "sigCanvas",
                  style: { width: "100%", height: 180, touchAction: "none" },
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={handleClear}
                disabled={submitting}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  background: "#fff",
                  fontSize: 14,
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
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0C79F7",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Submitting…" : "Submit Signature"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeRequestSign;
