import { useEffect, useState } from "react";
import { Button, Chip, TextField } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import RichEditor from "../RichEditor";
import { resolveInvoiceImageToDataURL } from "../../Utils/invoiceImageResolve";
import {
  DEFAULT_TENANT_ADDRESS,
  DEFAULT_TENANT_PHONE,
  getTenantAddress,
  getTenantPhone,
  getTenantWebsite,
} from "../../Utils/helper";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildEmailSignature = (
  signatureLogoSrc,
  includeTermsAndConditions = true,
  companyName = "Dolphin Merchant Services",
  showLogo = false,
  phone = DEFAULT_TENANT_PHONE,
  website = "",
  address = DEFAULT_TENANT_ADDRESS
) => {
  const safeCompanyName = escapeHtml(companyName);
  const safePhone = escapeHtml(phone || DEFAULT_TENANT_PHONE);
  const safeWebsite = escapeHtml(website || "");
  const safeAddress = escapeHtml(address || DEFAULT_TENANT_ADDRESS);
  const websiteBlock = safeWebsite
    ? `<div style="font-size: 13px; line-height: 1.6; margin-bottom: 4px;">${safeWebsite}</div>`
    : "";
  const logoBlock =
    showLogo && signatureLogoSrc
      ? `<div style="margin-top: 8px;"><img data-email-logo="true" src="${signatureLogoSrc}" alt="${safeCompanyName}" style="max-width: 180px; max-height: 64px; width: auto; height: auto; object-fit: contain; display: block;" /></div>`
      : "";

  return `
      <div data-email-signature="true" class="email-signature" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #111827; font-family: Arial, sans-serif;">
        ${
          includeTermsAndConditions
            ? `        <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">Terms & Conditions:</div>
        <div style="font-size: 12px; line-height: 1.7; margin-bottom: 18px; color: #374151;">
          Payment has been received in full for this invoice. Any shortages or damages must be reported within 3 days of delivery. Returns require a valid invoice. Thank you for your business.
        </div>`
            : ""
        }
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">${safeCompanyName}</div>
        <div style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
          ${safeAddress}
        </div>
        ${websiteBlock}
        <div style="font-size: 13px; line-height: 1.6; margin-bottom: 16px;">Direct: ${safePhone}</div>
        ${logoBlock}
      </div>`;
};

const buildSimpleEmailSignature = (
  companyName = "Dolphin Merchant Services",
  includeTermsAndConditions = true,
  phone = DEFAULT_TENANT_PHONE,
  website = "",
  address = DEFAULT_TENANT_ADDRESS
) => {
  const safeCompanyName = escapeHtml(companyName);
  const safePhone = escapeHtml(phone || DEFAULT_TENANT_PHONE);
  const safeWebsite = escapeHtml(website || "");
  const safeAddress = escapeHtml(address || DEFAULT_TENANT_ADDRESS);
  const websiteBlock = safeWebsite ? `<p>${safeWebsite}</p>` : "";
  const termsBlock = includeTermsAndConditions
    ? `<p><strong>Terms &amp; Conditions:</strong></p><p>Payment has been received in full for this invoice. Any shortages or damages must be reported within 3 days of delivery. Returns require a valid invoice. Thank you for your business.</p>`
    : "";

  return `${termsBlock}<p><br></p><p><strong>${safeCompanyName}</strong></p><p>${safeAddress}</p>${websiteBlock}<p>Direct: ${safePhone}</p>`;
};

const stripEmailSignature = (html) => {
  try {
    if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
      return String(html || "")
        .replace(
          /\s*<div[^>]*(data-email-signature\s*=\s*"true"|class\s*=\s*"[^"]*email-signature[^"]*")[\s\S]*/i,
          ""
        )
        .trim();
    }

    const parser = new window.DOMParser();
    const doc = parser.parseFromString(String(html || ""), "text/html");
    const nodes = doc.querySelectorAll(
      '[data-email-signature="true"], .email-signature'
    );
    nodes.forEach((n) => n.remove());

    const paragraphs = Array.from(doc.body?.querySelectorAll("p") || []);
    for (let i = paragraphs.length - 1; i >= 0; i -= 1) {
      const text = String(paragraphs[i].textContent || "").trim();
      if (
        text === DEFAULT_TENANT_ADDRESS ||
        text === "850 Lee Street, Elk Grove Village, IL 60007" ||
        text === "www.goDMS.com" ||
        text === "www.godms.com" ||
        /^(www\.|https?:\/\/)/i.test(text) ||
        text.startsWith("Direct:")
      ) {
        while (i >= 0) {
          paragraphs[i]?.remove();
          i -= 1;
        }
        break;
      }
    }

    return (doc.body?.innerHTML || "").trim();
  } catch {
    return String(html || "")
      .replace(
        /\s*<div[^>]*(data-email-signature\s*=\s*"true"|class\s*=\s*"[^"]*email-signature[^"]*")[\s\S]*/i,
        ""
      )
      .replace(
        /<p><br><\/p>\s*(<p><strong>[\s\S]*?<\/strong><\/p>\s*<p>[\s\S]*?<\/p>\s*(?:<p>[\s\S]*?<\/p>\s*)*<p>Direct:[\s\S]*?<\/p>\s*)+$/i,
        ""
      )
      .trim();
  }
};

export const composeEmailContent = (
  content,
  signatureLogoSrc,
  defaultBody,
  includeTermsAndConditions = true,
  companyName = "Dolphin Merchant Services",
  showLogo = false,
  useSimpleSignature = false,
  phone = DEFAULT_TENANT_PHONE,
  website = "",
  address = DEFAULT_TENANT_ADDRESS
) => {
  const baseContent =
    content && String(content).trim()
      ? String(content).trim()
      : defaultBody;
  const strippedContent = stripEmailSignature(baseContent);
  const signature = useSimpleSignature
    ? buildSimpleEmailSignature(
        companyName,
        includeTermsAndConditions,
        phone,
        website,
        address
      )
    : buildEmailSignature(
        signatureLogoSrc,
        includeTermsAndConditions,
        companyName,
        showLogo,
        phone,
        website,
        address
      );
  return `${strippedContent}${signature}`;
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = String(reader.result || "").split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const convertFileToAttachment = async (file) => {
  const content = await fileToBase64(file);
  return {
    filename: file.name || "attachment",
    content,
    encoding: "base64",
    contentType: file.type || "application/octet-stream",
  };
};

const SendEmailModal = ({
  isOpen,
  onClose,
  onSend,
  title = "Send Email",
  defaultToEmail = "",
  defaultEmailBody = "<p>Hello — please find the attached file.</p>",
  showTrackingNumber = false,
  includeTermsAndConditions = true,
  showSubject = false,
  defaultSubject = "",
  resolveLogo = true,
  signatureCompanyName = "",
  showSignatureLogo = true,
  useSimpleSignature = false,
  allowAttachments = false,
}) => {
  const tenantLogo = useSelector((state) => state.auth.tenantLogo);
  const userData = useSelector((state) => state.userData.userDetails);
  const logoSrc = tenantLogo || "";
  const companyName =
    signatureCompanyName ||
    userData?.tenant?.name ||
    "Dolphin Merchant Services";
  const tenantPhone = getTenantPhone(userData);
  const tenantWebsite = getTenantWebsite(userData);
  const tenantAddress = getTenantAddress(userData);

  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailContentInitialized, setEmailContentInitialized] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [ccEmails, setCcEmails] = useState([]);
  const [ccInputValue, setCcInputValue] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [logoError, setLogoError] = useState(false);
  const [validatedLogoSrc, setValidatedLogoSrc] = useState("");

  const showLogo =
    showSignatureLogo && Boolean(tenantLogo) && !logoError && Boolean(validatedLogoSrc);

  useEffect(() => {
    if (!isOpen) return;
    setToEmail(defaultToEmail || "");
    setSubject(defaultSubject || "");
    setEmailContent(defaultEmailBody);
    setEmailContentInitialized(true);
    setTrackingNo("");
    setCcEmails([]);
    setCcInputValue("");
    setAttachmentFiles([]);
  }, [isOpen, defaultToEmail, defaultEmailBody, defaultSubject]);

  useEffect(() => {
    if (!isOpen || !showSignatureLogo || !tenantLogo) {
      setLogoError(false);
      setValidatedLogoSrc("");
      return;
    }

    let cancelled = false;

    const canLoadImage = (src) =>
      new Promise((resolve) => {
        if (!src) {
          resolve(false);
          return;
        }
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0);
        img.onerror = () => resolve(false);
        img.src = src;
      });

    (async () => {
      setLogoError(false);
      setValidatedLogoSrc("");

      const resolved = resolveLogo
        ? (await resolveInvoiceImageToDataURL(tenantLogo)) || tenantLogo
        : tenantLogo;

      if (cancelled) return;

      const ok = await canLoadImage(resolved);
      if (cancelled) return;

      if (ok) {
        setValidatedLogoSrc(resolved);
        setLogoError(false);
      } else {
        setValidatedLogoSrc("");
        setLogoError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantLogo, showSignatureLogo, resolveLogo]);

  const handleClose = () => {
    setEmailContentInitialized(false);
    setAttachmentFiles([]);
    onClose?.();
  };

  const handleAttachmentChange = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 0) {
      setAttachmentFiles((prev) => [...prev, ...selected]);
    }
    event.target.value = "";
  };

  const handleRemoveAttachment = (index) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCcEmail = (email) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !ccEmails.includes(trimmedEmail)) {
      setCcEmails([...ccEmails, trimmedEmail]);
    }
    setCcInputValue("");
  };

  const handleRemoveCcEmail = (emailToRemove) => {
    setCcEmails(ccEmails.filter((email) => email !== emailToRemove));
  };

  const handleCcInputKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddCcEmail(ccInputValue);
    } else if (e.key === "Backspace" && !ccInputValue && ccEmails.length > 0) {
      setCcEmails(ccEmails.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (isSending) return;

    const recipientEmail = String(toEmail || "").trim();
    if (!recipientEmail) {
      toast.error("Please enter a recipient email");
      return;
    }

    setIsSending(true);
    try {
      const resolvedEmailLogo = showLogo
        ? validatedLogoSrc ||
          (resolveLogo
            ? (await resolveInvoiceImageToDataURL(logoSrc)) || logoSrc
            : logoSrc)
        : "";
      const html = composeEmailContent(
        emailContent,
        resolvedEmailLogo,
        defaultEmailBody,
        includeTermsAndConditions,
        companyName,
        showLogo && Boolean(resolvedEmailLogo),
        useSimpleSignature,
        tenantPhone,
        tenantWebsite,
        tenantAddress
      );
      const attachments = allowAttachments
        ? await Promise.all(attachmentFiles.map(convertFileToAttachment))
        : [];
      const success = await onSend({
        to: recipientEmail,
        cc: ccEmails,
        html,
        subject: subject?.trim() || defaultSubject || undefined,
        trackingNo: trackingNo?.trim() || undefined,
        attachments,
      });
      if (success) {
        handleClose();
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          width: "620px",
          maxWidth: "92vw",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            color: "#333",
            fontSize: "18px",
            fontWeight: "600",
          }}
        >
          {title}
        </h3>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              color: "#555",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            To Email:
          </label>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="Enter recipient email"
            style={{ backgroundColor: "#fff" }}
          />
        </div>
        {showSubject && (
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                color: "#555",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Subject:
            </label>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              style={{ backgroundColor: "#fff" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              color: "#555",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            CC:
          </label>
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "#f5f5f5",
              padding: "8px",
              minHeight: "48px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "4px",
              cursor: "text",
            }}
            onClick={() => document.getElementById("send-email-cc-input")?.focus()}
          >
            {ccEmails.map((email, index) => (
              <Chip
                key={index}
                label={email}
                onDelete={() => handleRemoveCcEmail(email)}
                deleteIcon={<Close style={{ fontSize: "16px" }} />}
                style={{
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  fontSize: "12px",
                  height: "28px",
                }}
              />
            ))}
            <input
              id="send-email-cc-input"
              type="text"
              value={ccInputValue}
              onChange={(e) => setCcInputValue(e.target.value)}
              onKeyDown={handleCcInputKeyDown}
              onBlur={() => {
                if (ccInputValue.trim()) {
                  handleAddCcEmail(ccInputValue);
                }
              }}
              placeholder={
                ccEmails.length === 0 ? "Enter CC email addresses..." : ""
              }
              style={{
                border: "none",
                outline: "none",
                flex: 1,
                minWidth: "120px",
                fontSize: "14px",
                backgroundColor: "transparent",
                padding: "4px",
              }}
            />
          </div>
        </div>

        {showTrackingNumber && (
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                color: "#555",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Tracking Number:
            </label>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="Enter tracking number (optional)"
              style={{ backgroundColor: "#f5f5f5" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              color: "#555",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Email Content:
          </label>
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "#fff",
              minHeight: "120px",
            }}
          >
            {emailContentInitialized && (
              <RichEditor
                key={isOpen ? "email-editor-open" : "email-editor-closed"}
                initialContent={emailContent}
                onGetContent={(html) => setEmailContent(html)}
              />
            )}
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              backgroundColor: "#f9fafb",
              marginTop: 10,
              padding: 12,
              maxHeight: 220,
              overflowY: "auto",
            }}
            dangerouslySetInnerHTML={{
              __html: useSimpleSignature
                ? buildSimpleEmailSignature(
                    companyName,
                    includeTermsAndConditions,
                    tenantPhone,
                    tenantWebsite,
                    tenantAddress
                  )
                : buildEmailSignature(
                    validatedLogoSrc || logoSrc,
                    includeTermsAndConditions,
                    companyName,
                    showLogo,
                    tenantPhone,
                    tenantWebsite,
                    tenantAddress
                  ),
            }}
          />
        </div>

        {allowAttachments && (
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                color: "#555",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Attachments:
            </label>
            <div
              style={{
                border: "1px dashed #ccc",
                borderRadius: "4px",
                backgroundColor: "#f9fafb",
                padding: "12px",
              }}
            >
              <input
                type="file"
                multiple
                onChange={handleAttachmentChange}
                style={{ fontSize: "13px", width: "100%" }}
              />
              {attachmentFiles.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  {attachmentFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        fontSize: "13px",
                        padding: "4px 0",
                        color: "#333",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.name}
                      </span>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveAttachment(index)}
                        style={{ minWidth: "auto", padding: "2px 8px" }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            style={{
              borderColor: "#6c757d",
              color: "#6c757d",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={isSending}
            style={{
              backgroundColor: "#0C79F7",
              color: "white",
              opacity: isSending ? 0.7 : 1,
            }}
          >
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SendEmailModal;
