import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  MenuItem,
  TextField,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { toast } from "react-toastify";
import Heading from "../../Components/Heading";
import GoBack from "../../Components/GoBack";
import Loader from "../../Components/Loader";
import { usePageTitle } from "../../Hooks/usePageTitle";
import {
  deleteRequest,
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  postRequestWithFormData,
  putRequestWithBodyAndToken,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import SignaturePlacementPicker from "../MerchantChangeRequest/SignaturePlacementPicker";
import SignedDocumentPreview from "../MerchantChangeRequest/SignedDocumentPreview";
import {
  STATUS,
  buildTimeline,
  extractFileUrl,
  fileUrlToDisplay,
  formatDateTime,
  getMerchantLabel,
  getMerchantEmail,
  getStatusMeta,
  isChangeRequestPdf,
  normalizeList,
  normalizeSignaturePlacements,
  parseApiError,
  requestNumber,
  serializeSignaturePlacements,
} from "../MerchantChangeRequest/utils";

const PageShell = styled("div")({
  minHeight: "100vh",
  marginTop: -65,
  backgroundColor: "var(--dashboard-bg)",
  padding: 10,
  position: "relative",
});

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
  flexWrap: "wrap",
  gap: 12,
  zIndex: 100,
});

const HeaderLeft = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  flex: "1 1 auto",
  zIndex: 101,
});

const HeaderActions = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 10,
  marginLeft: "auto",
  position: "relative",
  zIndex: 101,
  pointerEvents: "auto",
});

const actionBtnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const DetailGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 16,
  "@media (min-width: 1200px)": {
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
    alignItems: "start",
  },
});

const ContentCard = styled("div")({
  background: "var(--dashboard-card-bg, #fff)",
  borderRadius: 14,
  border: "1px solid var(--dashboard-border, rgba(0,0,0,0.08))",
  padding: 20,
  display: "grid",
  gap: 20,
});

const FieldBlock = styled("div")({
  display: "grid",
  gap: 6,
});

const FieldLabel = styled("p")({
  margin: 0,
  fontSize: 12,
  color: "var(--dashboard-text-secondary)",
});

const FieldValue = styled("p")({
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--sidebar-text-primary)",
});

const SectionTitle = styled("p")({
  margin: "0 0 8px",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--sidebar-text-primary)",
});

const MerchantChangeRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state) => state?.auth?.accessToken);
  usePageTitle("Change Request Detail", location);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [row, setRow] = useState(null);
  const [processTypes, setProcessTypes] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState("");
  const [processTypeId, setProcessTypeId] = useState("");
  const [requestTypeId, setRequestTypeId] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [signaturePlacements, setSignaturePlacements] = useState([]);
  const [placementPickerOpen, setPlacementPickerOpen] = useState(false);
  const fileInputRef = useRef(null);

  const canEditFields =
    row?.status === STATUS.DRAFT || row?.status === STATUS.WAITING;

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    try {
      const [detailRes, ptRes, rtRes] = await Promise.all([
        getRequestWithOutBody(`${baseURl}change-request/${id}`, accessToken),
        getRequestWithOutBody(
          `${baseURl}process-type?paginate=true&page=1&limit=100`,
          accessToken
        ),
        getRequestWithOutBody(
          `${baseURl}request-type?paginate=true&page=1&limit=200`,
          accessToken
        ),
      ]);
      const data = detailRes?.data ?? detailRes;
      setRow(data);
      setNotes(data?.notes || "");
      setSendEmail(getMerchantEmail(data?.customer) || "");
      setProcessTypeId(
        data?.processTypeId != null
          ? String(data.processTypeId)
          : data?.processType?.id != null
            ? String(data.processType.id)
            : ""
      );
      setRequestTypeId(
        data?.requestTypeId != null
          ? String(data.requestTypeId)
          : data?.requestType?.id != null
            ? String(data.requestType.id)
            : ""
      );
      const existing = data?.fileUrl;
      if (typeof existing === "string") {
        setFileUrl({ url: existing });
      } else if (existing?.url) {
        setFileUrl(existing);
      } else {
        setFileUrl(null);
      }
      setSignaturePlacements(
        normalizeSignaturePlacements(
          data?.signaturePlacements || data?.signature_placements
        )
      );
      setProcessTypes(normalizeList(ptRes).rows);
      setRequestTypes(normalizeList(rtRes).rows);
    } catch (error) {
      toast.error(parseApiError(error));
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRequestTypes = requestTypes.filter(
    (rt) =>
      String(rt.processTypeId ?? rt?.processType?.id) === String(processTypeId)
  );

  const uploadDocument = async (file) => {
    if (!file || !canEditFields) return;
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const byExt = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!allowed.includes(file.type) && !byExt) {
      toast.error("Please upload PDF, DOC, or DOCX (max 10MB).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be 10MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "change-request");
      const result = await postRequestWithFormData(
        `${baseURl}files`,
        accessToken,
        formData
      );
      const uploaded = extractFileUrl(result);
      if (!uploaded?.url) throw new Error("Upload failed.");
      setFileUrl(uploaded);
      setSignaturePlacements([]);
      toast.success("Document uploaded.");
      if (isChangeRequestPdf(uploaded, file.name)) {
        setPlacementPickerOpen(true);
      }
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canEditFields) return;
    setSaving(true);
    try {
      const body = {
        processTypeId: Number(processTypeId),
        requestTypeId: Number(requestTypeId),
        notes: notes || "",
      };
      if (fileUrl?.url) body.fileUrl = fileUrl;
      const placements = serializeSignaturePlacements(signaturePlacements);
      if (placements.length) body.signaturePlacements = placements;
      if (row?.customerId) body.customerId = row.customerId;
      else if (row?.customer?.id) body.customerId = row.customer.id;

      const result = await putRequestWithBodyAndToken(
        `${baseURl}change-request/${id}`,
        accessToken,
        body
      );
      toast.success(result?.message || "Updated successfully.");
      await load();
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    const email = String(sendEmail || "").trim();
    if (!email) {
      toast.error("Enter an email to send the sign link.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (
      isChangeRequestPdf(fileUrl || row?.fileUrl, fileUrl?.originalname) &&
      serializeSignaturePlacements(signaturePlacements).length === 0
    ) {
      toast.error("Place at least one signature location on the PDF.");
      setPlacementPickerOpen(true);
      return;
    }

    setSaving(true);
    try {
      const placements = serializeSignaturePlacements(signaturePlacements);
      if (canEditFields && (notes !== (row?.notes || "") || fileUrl)) {
        const body = {
          processTypeId: Number(processTypeId),
          requestTypeId: Number(requestTypeId),
          notes: notes || "",
        };
        if (fileUrl?.url) body.fileUrl = fileUrl;
        if (placements.length) body.signaturePlacements = placements;
        if (row?.customerId) body.customerId = row.customerId;
        else if (row?.customer?.id) body.customerId = row.customer.id;
        await putRequestWithBodyAndToken(
          `${baseURl}change-request/${id}`,
          accessToken,
          body
        );
      }
      const result = await postRequestWithBodyAndToken(
        `${baseURl}change-request/${id}/send`,
        accessToken,
        {
          email,
          ...(placements.length ? { signaturePlacements: placements } : {}),
        }
      );
      toast.success(result?.message || "Sign link sent successfully.");
      await load();
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (nextStatus) => {
    setSaving(true);
    try {
      const result = await putRequestWithBodyAndToken(
        `${baseURl}change-request/${id}`,
        accessToken,
        { status: nextStatus }
      );
      toast.success(result?.message || "Status updated.");
      await load();
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await deleteRequest(
        `${baseURl}change-request/${id}`,
        accessToken
      );
      toast.success(result?.message || "Deleted.");
      navigate("/home/merchantChangeRequest");
    } catch (error) {
      toast.error(parseApiError(error));
    }
  };

  if (loading) {
    return (
      <div style={{ marginTop: -65, padding: 10 }}>
        <Loader />
      </div>
    );
  }

  if (!row) {
    return (
      <div style={{ marginTop: -65, padding: 20 }}>
        <GoBack />
        <p className="mt-4 text-slate-600">Change request not found.</p>
      </div>
    );
  }

  const meta = getStatusMeta(row.status);
  const timeline = buildTimeline(row);
  const docUrl = fileUrlToDisplay(fileUrl || row.fileUrl);
  const sigUrl = fileUrlToDisplay(row.signatureFileUrl);

  const canSend =
    row.status === STATUS.DRAFT || row.status === STATUS.WAITING;
  const canComplete = row.status === STATUS.IN_REVIEW;
  const canCancel =
    row.status === STATUS.DRAFT ||
    row.status === STATUS.WAITING ||
    row.status === STATUS.IN_REVIEW;
  const canDelete =
    row.status === STATUS.DRAFT || row.status === STATUS.CANCELLED;

  const renderActions = () => (
    <>
      {canEditFields && (
        <button
          type="button"
          disabled={saving || uploading}
          onClick={handleSave}
          style={{
            ...actionBtnBase,
            border: "1px solid #0C79F7",
            backgroundColor: "#FFFFFF",
            color: "#0C79F7",
            opacity: saving || uploading ? 0.7 : 1,
            cursor: saving || uploading ? "not-allowed" : "pointer",
          }}
        >
          Save Changes
        </button>
      )}
      {canSend && (
        <button
          type="button"
          disabled={saving || uploading}
          onClick={handleSend}
          style={{
            ...actionBtnBase,
            border: "none",
            backgroundColor: "#0C79F7",
            color: "#FFFFFF",
            opacity: saving || uploading ? 0.7 : 1,
            cursor: saving || uploading ? "not-allowed" : "pointer",
          }}
        >
          {row.status === STATUS.WAITING ? "Resend E-Sign" : "Send for E-Sign"}
        </button>
      )}
      {canComplete && (
        <button
          type="button"
          disabled={saving}
          onClick={() => handleStatus(STATUS.COMPLETED)}
          style={{
            ...actionBtnBase,
            border: "none",
            backgroundColor: "#4AC411",
            color: "#FFFFFF",
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Mark Completed
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          disabled={saving}
          onClick={() => handleStatus(STATUS.CANCELLED)}
          style={{
            ...actionBtnBase,
            border: "1px solid #EF3826",
            backgroundColor: "#FFFFFF",
            color: "#EF3826",
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Cancel Request
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={saving}
          onClick={handleDelete}
          style={{
            ...actionBtnBase,
            border: "none",
            backgroundColor: "#EF3826",
            color: "#FFFFFF",
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Delete
        </button>
      )}
    </>
  );

  return (
    <PageShell>
      <HeaderWrapper>
        <HeaderLeft>
          <GoBack />
          <div style={{ minWidth: 0 }}>
            <Heading
              Fontweight={700}
              color={"var(--sidebar-text-primary)"}
              Heading={requestNumber(row)}
              Fontsize={26}
              mt={0}
              mb={0}
            />
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                fontWeight: 600,
                color: meta.color,
                background: meta.bg,
              }}
            >
              {meta.label}
            </span>
          </div>
        </HeaderLeft>
        <HeaderActions>{renderActions()}</HeaderActions>
      </HeaderWrapper>

      <DetailGrid>
        <ContentCard>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <FieldBlock>
              <FieldLabel>Merchant</FieldLabel>
              <FieldValue>{getMerchantLabel(row.customer)}</FieldValue>
            </FieldBlock>
            <FieldBlock>
              <FieldLabel>Created</FieldLabel>
              <FieldValue>{formatDateTime(row.createdAt)}</FieldValue>
            </FieldBlock>
          </div>

          {canSend && (
            <TextField
              size="small"
              fullWidth
              type="email"
              label="Email for E-Sign Link"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              helperText="Edit if you want to send the sign link to a different email."
            />
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <TextField
              select
              size="small"
              label="Process Type"
              value={processTypeId}
              disabled={!canEditFields}
              onChange={(e) => {
                setProcessTypeId(e.target.value);
                setRequestTypeId("");
              }}
              fullWidth
            >
              {processTypes.map((pt) => (
                <MenuItem key={pt.id} value={String(pt.id)}>
                  {pt.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Request Type"
              value={requestTypeId}
              disabled={!canEditFields}
              onChange={(e) => setRequestTypeId(e.target.value)}
              fullWidth
            >
              {filteredRequestTypes.map((rt) => (
                <MenuItem key={rt.id} value={String(rt.id)}>
                  {rt.title}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div>
            <SectionTitle>Document</SectionTitle>
            {docUrl ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0C79F7",
                  textDecoration: "none",
                }}
              >
                Open document <OpenInNewIcon sx={{ fontSize: 14 }} />
              </a>
            ) : (
              <FieldLabel>No document uploaded</FieldLabel>
            )}
            {canEditFields && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    ...actionBtnBase,
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    color: "var(--sidebar-text-primary)",
                    opacity: uploading ? 0.7 : 1,
                    cursor: uploading ? "not-allowed" : "pointer",
                    gap: 8,
                  }}
                >
                  {uploading ? (
                    <CircularProgress size={14} />
                  ) : (
                    <CloudUploadOutlinedIcon sx={{ fontSize: 18 }} />
                  )}
                  {docUrl ? "Replace document" : "Upload document"}
                </button>
                {isChangeRequestPdf(fileUrl || row?.fileUrl, fileUrl?.originalname) && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setPlacementPickerOpen(true)}
                    style={{
                      ...actionBtnBase,
                      border: "1px solid #0C79F7",
                      backgroundColor: "#FFFFFF",
                      color: "#0C79F7",
                      cursor: "pointer",
                    }}
                  >
                    {signaturePlacements.length
                      ? `Edit signature locations (${signaturePlacements.length})`
                      : "Place signature locations"}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  hidden
                  onChange={(e) => {
                    uploadDocument(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
            {isChangeRequestPdf(fileUrl || row?.fileUrl, fileUrl?.originalname) &&
              signaturePlacements.length > 0 && (
                <FieldLabel style={{ marginTop: 8 }}>
                  {signaturePlacements.length} signature location
                  {signaturePlacements.length === 1 ? "" : "s"} on the PDF
                </FieldLabel>
              )}
            {isChangeRequestPdf(fileUrl || row?.fileUrl, fileUrl?.originalname) && (
              <SignedDocumentPreview
                fileUrl={fileUrl || row?.fileUrl}
                placements={signaturePlacements}
                signatureUrl={sigUrl}
                accessToken={accessToken}
              />
            )}
          </div>

          {fileUrlToDisplay(row?.signedFileUrl) && (
            <div>
              <SectionTitle>Signed Document</SectionTitle>
              <a
                href={fileUrlToDisplay(row.signedFileUrl)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0C79F7",
                  textDecoration: "none",
                }}
              >
                Open signed document <OpenInNewIcon sx={{ fontSize: 14 }} />
              </a>
            </div>
          )}

          {fileUrlToDisplay(row?.summaryFileUrl) && (
            <div>
              <SectionTitle>Summary Document</SectionTitle>
              <a
                href={fileUrlToDisplay(row.summaryFileUrl)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0C79F7",
                  textDecoration: "none",
                }}
              >
                Open summary document <OpenInNewIcon sx={{ fontSize: 14 }} />
              </a>
            </div>
          )}

          {sigUrl && (
            <div>
              <SectionTitle>Signature</SectionTitle>
              <img
                src={sigUrl}
                alt="Signature"
                style={{
                  maxHeight: 120,
                  border: "1px solid var(--dashboard-border, #E5E7EB)",
                  borderRadius: 8,
                  background: "#fff",
                  padding: 8,
                }}
              />
              {row.signedAt && (
                <FieldLabel style={{ marginTop: 6 }}>
                  Signed at {formatDateTime(row.signedAt)}
                </FieldLabel>
              )}
            </div>
          )}

          <div>
            <SectionTitle>Notes</SectionTitle>
            <TextField
              multiline
              minRows={3}
              fullWidth
              value={notes}
              disabled={!canEditFields}
              onChange={(e) => setNotes(e.target.value)}
              inputProps={{ maxLength: 5000 }}
            />
          </div>
        </ContentCard>

        <ContentCard style={{ alignSelf: "start" }}>
          <SectionTitle>Activity Timeline</SectionTitle>
          <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {timeline.map((step, idx) => (
              <li key={step.key} style={{ display: "flex", gap: 12, paddingBottom: idx < timeline.length - 1 ? 16 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      marginTop: 4,
                      background: step.done || step.active ? "#0C79F7" : "#CBD5E1",
                      boxShadow: step.active ? "0 0 0 3px rgba(12,121,247,0.25)" : "none",
                    }}
                  />
                  {idx < timeline.length - 1 && (
                    <span style={{ width: 1, flex: 1, marginTop: 4, minHeight: 20, background: "#E2E8F0" }} />
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: step.done || step.active ? "var(--sidebar-text-primary)" : "var(--dashboard-text-secondary)",
                    fontWeight: step.active ? 600 : 400,
                  }}
                >
                  {step.label}
                </p>
              </li>
            ))}
          </ol>
        </ContentCard>
      </DetailGrid>

      <SignaturePlacementPicker
        open={placementPickerOpen}
        onClose={() => setPlacementPickerOpen(false)}
        fileUrl={fileUrl || row?.fileUrl}
        placements={signaturePlacements}
        accessToken={accessToken}
        onSave={setSignaturePlacements}
      />
    </PageShell>
  );
};

export default MerchantChangeRequestDetail;
