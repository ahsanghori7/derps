import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { styled } from "@mui/material/styles";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import MemoTable from "../../Components/MemoTable";
import FilterDropdown from "../../Components/FilterDropdown";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import { toast } from "react-toastify";
import Heading from "../../Components/Heading";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import SearchInput from "../../Components/SearchInput";
import addIcon from "../../assets/addIcon.png";
import { usePageTitle } from "../../Hooks/usePageTitle";
import {
  deleteRequest,
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  postRequestWithFormData,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import SetupTypesModal from "./SetupTypesModal";
import SignaturePlacementPicker from "./SignaturePlacementPicker";
import {
  STATUS,
  STATUS_FILTERS,
  extractChangeRequestStats,
  extractFileUrl,
  formatDateTime,
  getMerchantId,
  getMerchantLabel,
  getMerchantEmail,
  getStatusMeta,
  getUploadedFileDeleteName,
  isChangeRequestPdf,
  isLocalFileUrl,
  normalizeList,
  parseApiError,
  requestNumber,
  serializeSignaturePlacements,
} from "./utils";

const CHANGE_REQUEST_TABS = STATUS_FILTERS.map(({ key, label }) => ({
  id: key,
  label,
}));

const FilterChip = ({ label, onRemove }) => (
  <span
    className="inline-flex items-center gap-1"
    style={{
      background: "#0C79F7",
      color: "#fff",
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label}`}
      style={{
        display: "inline-flex",
        background: "transparent",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <CloseIcon sx={{ fontSize: 14 }} />
    </button>
  </span>
);

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 5,
  flexWrap: "wrap",
  gap: 10,
});

const StageCardsWrapper = styled("div")({
  marginTop: 16,
  marginBottom: 16,
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 8,
  "@media (max-width: 1100px)": {
    display: "flex",
    flexWrap: "wrap",
  },
});

const StageCardItem = styled("div")({
  cursor: "pointer",
  minWidth: 0,
  width: "100%",
  "@media (max-width: 1100px)": {
    flex: "1 1 140px",
    width: "auto",
    maxWidth: "calc(33.333% - 6px)",
  },
  "@media (max-width: 768px)": {
    flex: "1 1 calc(50% - 4px)",
    maxWidth: "calc(50% - 4px)",
  },
  "@media (max-width: 480px)": {
    flex: "1 1 100%",
    maxWidth: "100%",
  },
});

const FormSection = styled("div")({
  marginBottom: 18,
});

const FieldLabel = styled("p")({
  margin: "0 0 6px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--sidebar-text-primary)",
});

const FormRow = styled("div")({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  marginBottom: 18,
  "@media (max-width: 600px)": {
    gridTemplateColumns: "1fr",
  },
});

const MerchantSearchWrap = styled("div")({
  width: "100%",
  position: "relative",
  zIndex: 20,
  "& .MuiFormControl-root": {
    width: "100%",
  },
  "& .MuiInputBase-root": {
    width: "100% !important",
  },
});

const UploadZone = styled("div")(({ dragOver }) => ({
  borderRadius: 10,
  border: `1.5px dashed ${dragOver ? "#0C79F7" : "#CBD5E1"}`,
  background: dragOver ? "#F0F7FF" : "#F8FAFC",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 16px",
  textAlign: "center",
  transition: "border-color 0.15s ease, background 0.15s ease",
}));

const ModalActionBtn = styled("button")(({ variant }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 38,
  padding: "0 16px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  ...(variant === "primary"
    ? {
        border: "none",
        background: "#0C79F7",
        color: "#fff",
      }
    : variant === "outline"
      ? {
          border: "1px solid #0C79F7",
          background: "#fff",
          color: "#0C79F7",
        }
      : {
          border: "none",
          background: "transparent",
          color: "#64748B",
        }),
}));

const emptyForm = {
  customerId: "",
  processTypeId: "",
  requestTypeId: "",
  email: "",
  notes: "",
  fileUrl: null,
  fileName: "",
  signaturePlacements: [],
};

const MerchantChangeRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state) => state?.auth?.accessToken);
  usePageTitle("Merchant Change Request", location);

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState("all");
  const [listApiData, setListApiData] = useState(null);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [processTypeFilter, setProcessTypeFilter] = useState("");
  const [draftProcessTypeFilter, setDraftProcessTypeFilter] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [placementPickerOpen, setPlacementPickerOpen] = useState(false);

  const [processTypes, setProcessTypes] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [localPdfFile, setLocalPdfFile] = useState(null);

  const fileInputRef = useRef(null);
  const merchantSearchTimerRef = useRef(null);
  const merchantSearchRequestRef = useRef(0);
  const localPreviewUrlRef = useRef(null);
  const uploadedFileRef = useRef(null);
  const uploadGenerationRef = useRef(0);

  const filteredRequestTypes = useMemo(() => {
    if (!form.processTypeId) return [];
    return requestTypes.filter(
      (rt) =>
        String(rt.processTypeId ?? rt?.processType?.id) ===
        String(form.processTypeId)
    );
  }, [requestTypes, form.processTypeId]);

  const merchantSuggestions = useMemo(
    () =>
      (Array.isArray(customerList) ? customerList : [])
        .map((customer) => ({
          name: getMerchantLabel(customer),
          id: getMerchantId(customer),
        }))
        .filter((m) => m.name && m.id),
    [customerList]
  );

  const loadLookups = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [ptRes, rtRes] = await Promise.all([
        getRequestWithOutBody(
          `${baseURl}process-type?paginate=true&page=1&limit=100`,
          accessToken
        ),
        getRequestWithOutBody(
          `${baseURl}request-type?paginate=true&page=1&limit=200`,
          accessToken
        ),
      ]);
      setProcessTypes(normalizeList(ptRes).rows);
      setRequestTypes(normalizeList(rtRes).rows);
    } catch (error) {
      toast.error(parseApiError(error));
    }
  }, [accessToken]);

  const loadCustomers = useCallback(
    async (keyword = "") => {
      if (!accessToken) return;
      const requestId = ++merchantSearchRequestRef.current;
      try {
        const params = new URLSearchParams({
          paginate: "true",
          page: "1",
          limit: keyword ? "30" : "100",
          orderBy: "createdAt",
          order: "desc",
        });
        if (keyword) params.set("keyword", keyword);
        const result = await getRequestWithOutBody(
          `${baseURl}customer?${params.toString()}`,
          accessToken
        );
        if (requestId !== merchantSearchRequestRef.current) return;
        setCustomerList(normalizeList(result).rows);
      } catch {
        if (requestId !== merchantSearchRequestRef.current) return;
        setCustomerList([]);
      }
    },
    [accessToken]
  );

  const fetchList = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        paginate: "true",
        page: String(page),
        limit: String(rowsPerPage),
        orderBy: "createdAt",
        order: "desc",
      });
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (search.trim()) {
        params.set("keyword", search.trim());
      }
      if (processTypeFilter) {
        params.set("processTypeId", processTypeFilter);
      }
      const result = await getRequestWithOutBody(
        `${baseURl}change-request?${params.toString()}`,
        accessToken
      );
      setListApiData(result);
      const { rows, total } = normalizeList(result);
      setList(rows);
      setTotalCount(total);
    } catch (error) {
      setListApiData(null);
      setList([]);
      setTotalCount(0);
      toast.error(parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, rowsPerPage, statusFilter, search, processTypeFilter]);

  useEffect(() => {
    loadLookups();
    loadCustomers();
  }, [loadLookups, loadCustomers]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const statusCounts = useMemo(
    () => extractChangeRequestStats(listApiData),
    [listApiData]
  );

  useEffect(() => {
    return () => {
      if (merchantSearchTimerRef.current) {
        clearTimeout(merchantSearchTimerRef.current);
      }
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
    };
  }, []);

  const handleMerchantSearch = (text) => {
    if (merchantSearchTimerRef.current) {
      clearTimeout(merchantSearchTimerRef.current);
    }
    const term = String(text || "").trim();
    if (!term) {
      merchantSearchRequestRef.current += 1;
      loadCustomers();
      return;
    }
    merchantSearchTimerRef.current = setTimeout(() => {
      loadCustomers(term);
    }, 300);
  };

  const handleMerchantSelect = (value) => {
    const selected = (Array.isArray(customerList) ? customerList : []).find(
      (m) => String(getMerchantId(m)) === String(value)
    );
    setSelectedMerchant(getMerchantLabel(selected) || "");
    setForm((prev) => ({
      ...prev,
      customerId: selected ? String(getMerchantId(selected)) : "",
      email: selected ? getMerchantEmail(selected) : "",
    }));
  };

  const revokeLocalPreview = () => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
  };

  const resetCreateForm = () => {
    uploadGenerationRef.current += 1;
    revokeLocalPreview();
    uploadedFileRef.current = null;
    setLocalPdfFile(null);
    setUploading(false);
    setForm(emptyForm);
    setSelectedMerchant("");
  };

  const openCreate = () => {
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setPlacementPickerOpen(false);
    resetCreateForm();
  };

  const deleteUploadedFile = async (fileUrl) => {
    if (!fileUrl || !accessToken || isLocalFileUrl(fileUrl)) return;
    const name = getUploadedFileDeleteName(fileUrl);
    if (!name) return;
    const queryName = /%[0-9A-Fa-f]{2}/.test(name)
      ? name
      : encodeURIComponent(name);
    await deleteRequest(
      `${baseURl}files/by-name?name=${queryName}`,
      accessToken
    );
  };

  const clearSelectedFile = () => {
    revokeLocalPreview();
    uploadedFileRef.current = null;
    setLocalPdfFile(null);
    setForm((prev) => ({
      ...prev,
      fileUrl: null,
      fileName: "",
      signaturePlacements: [],
    }));
    setPlacementPickerOpen(false);
  };

  const uploadDocument = async (file) => {
    if (!file) return;
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

    const generation = ++uploadGenerationRef.current;
    const previousUploaded = uploadedFileRef.current;
    uploadedFileRef.current = null;

    revokeLocalPreview();

    const previewMeta = {
      url: file.name,
      mimetype: file.type,
      originalname: file.name,
    };
    const isPdf = isChangeRequestPdf(previewMeta, file.name);
    const previewUrl = isPdf ? URL.createObjectURL(file) : null;
    localPreviewUrlRef.current = previewUrl;

    setLocalPdfFile(isPdf ? file : null);
    setForm((prev) => ({
      ...prev,
      fileUrl: previewUrl
        ? {
            url: previewUrl,
            mimetype: file.type || "application/pdf",
            originalname: file.name,
          }
        : {
            url: "",
            mimetype: file.type,
            originalname: file.name,
          },
      fileName: file.name,
      signaturePlacements: [],
    }));
    if (isPdf) setPlacementPickerOpen(true);

    if (previousUploaded) {
      deleteUploadedFile(previousUploaded).catch(() => {});
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
      if (!uploaded?.url) {
        throw new Error("Upload failed — no file URL returned.");
      }
      if (generation !== uploadGenerationRef.current) {
        deleteUploadedFile(uploaded).catch(() => {});
        return;
      }
      uploadedFileRef.current = uploaded;
      setForm((prev) => ({
        ...prev,
        fileUrl: uploaded,
        fileName: uploaded.originalname || file.name,
      }));
      toast.success("Document uploaded.");
    } catch (error) {
      if (generation !== uploadGenerationRef.current) return;
      toast.error(parseApiError(error) || "Document upload failed.");
      clearSelectedFile();
    } finally {
      if (generation === uploadGenerationRef.current) {
        setUploading(false);
      }
    }
  };

  const handleRemoveFile = async () => {
    const generation = ++uploadGenerationRef.current;
    const uploaded = uploadedFileRef.current;
    setPlacementPickerOpen(false);
    if (uploaded && !isLocalFileUrl(uploaded)) {
      setUploading(true);
      try {
        await deleteUploadedFile(uploaded);
        clearSelectedFile();
        toast.success("File removed.");
      } catch (error) {
        toast.error(parseApiError(error) || "Could not remove file.");
      } finally {
        if (generation === uploadGenerationRef.current) {
          setUploading(false);
        }
      }
      return;
    }
    clearSelectedFile();
  };

  const validateForm = (forSend) => {
    if (!form.customerId) {
      toast.error("Select a merchant.");
      return false;
    }
    if (!form.processTypeId) {
      toast.error("Select a process type.");
      return false;
    }
    if (!form.requestTypeId) {
      toast.error("Select a request type.");
      return false;
    }
    if (forSend && (uploading || !form.fileUrl?.url || isLocalFileUrl(form.fileUrl))) {
      toast.error(
        uploading
          ? "Please wait for the document to finish uploading."
          : "Upload a document before sending for e-sign."
      );
      return false;
    }
    if (
      forSend &&
      isChangeRequestPdf(form.fileUrl, form.fileName) &&
      serializeSignaturePlacements(form.signaturePlacements).length === 0
    ) {
      toast.error("Place at least one signature location on the PDF.");
      setPlacementPickerOpen(true);
      return false;
    }
    if (forSend) {
      const email = String(form.email || "").trim();
      if (!email) {
        toast.error("Enter an email to send the sign link.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Enter a valid email address.");
        return false;
      }
    }
    if (form.notes && form.notes.length > 5000) {
      toast.error("Notes must be 5000 characters or fewer.");
      return false;
    }
    return true;
  };

  const buildPayload = (asDraft) => {
    const payload = {
      customerId: Number(form.customerId),
      processTypeId: Number(form.processTypeId),
      requestTypeId: Number(form.requestTypeId),
    };
    if (form.notes?.trim()) payload.notes = form.notes.trim();
    if (form.fileUrl?.url && !isLocalFileUrl(form.fileUrl)) payload.fileUrl = form.fileUrl;
    const placements = serializeSignaturePlacements(form.signaturePlacements);
    if (placements.length) payload.signaturePlacements = placements;
    if (asDraft) {
      payload.status = "draft";
    } else {
      const email = String(form.email || "").trim();
      if (email) payload.email = email;
    }
    return payload;
  };

  const handleCreate = async (asDraft) => {
    if (!validateForm(!asDraft)) return;
    setSubmitting(true);
    try {
      const result = await postRequestWithBodyAndToken(
        `${baseURl}change-request`,
        accessToken,
        buildPayload(asDraft)
      );
      toast.success(
        result?.message ||
          (asDraft
            ? "Draft saved successfully."
            : "Sign link sent successfully.")
      );
      closeCreate();
      setPage(1);
      await fetchList();
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusFilter = (key) => {
    setStatusFilter(key);
    setPage(1);
  };

  const handleApplyFilters = () => {
    setSearch(String(searchDraft || "").trim());
    setProcessTypeFilter(draftProcessTypeFilter);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft("");
    setSearch("");
    setDraftProcessTypeFilter("");
    setProcessTypeFilter("");
    setPage(1);
  };

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (search) chips.push({ key: "search", label: `Search: ${search}` });
    if (processTypeFilter) {
      const title =
        processTypes.find((p) => String(p.id) === String(processTypeFilter))
          ?.title || processTypeFilter;
      chips.push({ key: "processType", label: `Process: ${title}` });
    }
    return chips;
  }, [search, processTypeFilter, processTypes]);

  const removeFilterChip = (key) => {
    if (key === "search") {
      setSearch("");
      setSearchDraft("");
    }
    if (key === "processType") {
      setProcessTypeFilter("");
      setDraftProcessTypeFilter("");
    }
    setPage(1);
  };

  const processTypeOptions = useMemo(
    () => [
      { label: "All Process Types", value: "" },
      ...processTypes.map((pt) => ({
        label: pt.title,
        value: String(pt.id),
      })),
    ],
    [processTypes]
  );

  const tableData = useMemo(
    () =>
      list.map((row, index) => ({
        ...row,
        id: row.id ?? index + 1,
        requestNo: requestNumber(row),
        processType: row?.processType?.title || "-",
        requestType: row?.requestType?.title || "-",
        merchant: getMerchantLabel(row?.customer) || "-",
        status: row.status,
        createdAt: formatDateTime(row.createdAt),
        updatedAt: formatDateTime(row.updatedAt),
        action: "View",
      })),
    [list]
  );

  const columns = useMemo(
    () => [
      { id: "requestNo", label: "Request No", align: "center" },
      { id: "processType", label: "Process Type", align: "center" },
      { id: "requestType", label: "Request Type", align: "center" },
      { id: "merchant", label: "Merchant", align: "center" },
      {
        id: "status",
        label: "Status",
        align: "center",
        format: (value) => {
          const meta = getStatusMeta(value);
          return (
            <span
              style={{
                color: meta.color,
                backgroundColor: meta.bg,
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}
            >
              {meta.label}
            </span>
          );
        },
      },
      { id: "createdAt", label: "Created At", align: "center" },
      { id: "updatedAt", label: "Updated", align: "center" },
      {
        id: "action",
        label: "Action",
        align: "center",
        format: () => (
          <span
            style={{
              color: "#3B82F6",
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 14,
            }}
          >
            View
          </span>
        ),
      },
    ],
    []
  );

  const handleActionClick = (row) => {
    navigate(`/home/merchantChangeRequest/${row.id}`);
  };

  const handleRowClick = (event, row) => {
    if (event && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      window.open(`/home/merchantChangeRequest/${row.id}`, "_blank");
    } else {
      navigate(`/home/merchantChangeRequest/${row.id}`);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}
    >
      <HeaderWrapper>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Heading
            Fontweight={700}
            color={"var(--sidebar-text-primary)"}
            Heading={`Merchant Change Requests`}
            Fontsize={30}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              padding: "0 16px",
              borderRadius: 8,
              border: "1px solid #0C79F7",
              color: "#0C79F7",
              background: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Setup Types
          </button>
          <BottonWithIcon
            backgroundColor={"#0C79F7"}
            icon={addIcon}
            title={"New Change Request"}
            height={40}
            color={"var(--sidebar-text-selected)"}
            fontSize={16}
            fontWeight={500}
            className="!mb-0 !mx-0"
            onClick={openCreate}
          />
        </div>
      </HeaderWrapper>

      <StageCardsWrapper>
        {STATUS_FILTERS.map((stage) => {
          const isSelected = statusFilter === stage.key;
          return (
            <StageCardItem
              key={stage.key}
              role="button"
              tabIndex={0}
              onClick={() => handleStatusFilter(stage.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleStatusFilter(stage.key);
                }
              }}
            >
              <TaxDashboardBox
                compact
                selected={isSelected}
                title={stage.label}
                amount={String(statusCounts[stage.key] ?? 0)}
                subtitle={stage.subtitle}
              />
            </StageCardItem>
          );
        })}
      </StageCardsWrapper>

      <div
        className="flex gap-6 flex-wrap mt-2"
        style={{ borderBottom: "1px solid var(--dashboard-box-border)" }}
      >
        {CHANGE_REQUEST_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleStatusFilter(tab.id)}
              className="pb-3 px-1"
              style={{
                fontSize: 14,
                fontWeight: isActive ? 700 : 600,
                color: isActive ? "#0C79F7" : "#64748B",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "3px solid #0C79F7" : "3px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="mt-4"
        style={{
          background: "var(--dashboard-card-bg)",
          border: "1px solid var(--dashboard-box-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFiltersExpanded((prev) => !prev);
            }
          }}
          onClick={() => setFiltersExpanded((prev) => !prev)}
          sx={{
            px: 2,
            py: 1,
            borderBottom: filtersExpanded ? "1px solid var(--dashboard-box-border)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            cursor: "pointer",
            userSelect: "none",
            background:
              "linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)",
            "&:hover": {
              background:
                "linear-gradient(180deg, rgba(241,245,249,0.95) 0%, rgba(248,250,252,0.95) 100%)",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            <TuneIcon fontSize="small" />
            <Box sx={{ fontWeight: 700, fontSize: 14 }}>Filters</Box>
            {!filtersExpanded && (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                {statusFilter !== "all" && (
                  <Chip
                    size="small"
                    label={
                      STATUS_FILTERS.find((s) => s.key === statusFilter)?.label ||
                      statusFilter
                    }
                    variant="outlined"
                  />
                )}
                {search && <Chip size="small" label={`Search: ${search}`} variant="outlined" />}
                {processTypeFilter && (
                  <Chip
                    size="small"
                    label={`Process: ${
                      processTypes.find((p) => String(p.id) === String(processTypeFilter))
                        ?.title || processTypeFilter
                    }`}
                    variant="outlined"
                  />
                )}
              </Stack>
            )}
          </Box>
          <Tooltip title={filtersExpanded ? "Hide filters" : "Show filters"}>
            <IconButton
              size="small"
              aria-label={filtersExpanded ? "Hide filters" : "Show filters"}
              onClick={(e) => {
                e.stopPropagation();
                setFiltersExpanded((prev) => !prev);
              }}
            >
              {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Collapse in={filtersExpanded}>
          <Box sx={{ px: 2, py: 1.25 }}>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div
                style={{
                  background: "var(--chrome-filter-bar-bg)",
                  borderRadius: 8,
                  padding: "0 12px",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flex: "1 1 240px",
                  maxWidth: 420,
                  minWidth: 200,
                  height: 40,
                  boxSizing: "border-box",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--chrome-search-icon)"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApplyFilters();
                  }}
                  placeholder="Search by request no, merchant, type..."
                  style={{
                    outline: "none",
                    background: "transparent",
                    width: "100%",
                    fontSize: 13,
                    border: "none",
                    color: "var(--sidebar-text-primary)",
                  }}
                />
              </div>

              <FilterDropdown
                value={draftProcessTypeFilter}
                onChange={setDraftProcessTypeFilter}
                options={processTypeOptions}
                placeholder="All Process Types"
                minWidth={180}
                placeholderValues={[""]}
                searchable
                searchPlaceholder="Search process types..."
              />

              <div className="flex gap-2 items-center ml-auto">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "1px solid var(--dashboard-box-border)",
                    background: 'var(--dashboard-card-bg2)',
                    color: 'var(--dashboard-text-primary)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#24282E",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {activeFilterChips.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2 items-center">
                {activeFilterChips.map((chip) => (
                  <FilterChip
                    key={chip.key}
                    label={chip.label}
                    onRemove={() => removeFilterChip(chip.key)}
                  />
                ))}
              </div>
            )}
          </Box>
        </Collapse>
      </div>

      <div className="w-[100%]" style={{ borderRadius: 14, padding: 20 }}>
        {loading ? (
          <div className="text-center w-full mx-auto py-8">
            <Loader message="Loading..." subMessage="Please wait" />
          </div>
        ) : tableData.length === 0 ? (
          <NoDataFound
            title="No Data Found"
            description={
              search || processTypeFilter
                ? "No change requests match your filters."
                : statusFilter === "all"
                  ? "No change requests found."
                  : `No change requests found in ${
                      STATUS_FILTERS.find((s) => s.key === statusFilter)?.label ||
                      statusFilter
                    }.`
            }
          />
        ) : (
          <MemoTable
            data={tableData}
            columns={columns}
            onActionClick={handleActionClick}
            onRowClick={handleRowClick}
            disableRowClick={false}
            opportunitiesTable={true}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={setPage}
            onRowsPerPageChange={(newRows) => {
              setRowsPerPage(newRows);
              setPage(1);
            }}
          />
        )}
      </div>

      <Dialog
        open={showCreate}
        onClose={closeCreate}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        disableEnforceFocus={placementPickerOpen}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            overflow: "hidden",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 1.75,
            fontWeight: 700,
            fontSize: 18,
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          Create New Request
          <IconButton onClick={closeCreate} size="small" aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, py: 2.5 }}>
          <FormSection>
            <FieldLabel>
              Merchant <span style={{ color: "#EF3826" }}>*</span>
            </FieldLabel>
            <MerchantSearchWrap>
              <SearchInput
                selectedValue={selectedMerchant}
                suggestions={merchantSuggestions}
                onSelect={handleMerchantSelect}
                onSearchTextChange={handleMerchantSearch}
                asyncSuggestions
                idSet={true}
                addTicket={true}
              />
            </MerchantSearchWrap>
          </FormSection>

          <FormRow>
            <div>
              <FieldLabel>
                Process Type <span style={{ color: "#EF3826" }}>*</span>
              </FieldLabel>
              <TextField
                select
                size="small"
                fullWidth
                value={form.processTypeId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    processTypeId: e.target.value,
                    requestTypeId: "",
                  }))
                }
              >
                {processTypes.length === 0 ? (
                  <MenuItem value="" disabled>
                    No process types — use Setup Types
                  </MenuItem>
                ) : (
                  [
                    <MenuItem key="__empty" value="" disabled>
                      Select process type
                    </MenuItem>,
                    ...processTypes.map((pt) => (
                      <MenuItem key={pt.id} value={String(pt.id)}>
                        {pt.title}
                      </MenuItem>
                    )),
                  ]
                )}
              </TextField>
            </div>

            <div>
              <FieldLabel>
                Request Type <span style={{ color: "#EF3826" }}>*</span>
              </FieldLabel>
              <TextField
                select
                size="small"
                fullWidth
                value={form.requestTypeId}
                disabled={!form.processTypeId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    requestTypeId: e.target.value,
                  }))
                }
              >
                {!form.processTypeId ? (
                  <MenuItem value="" disabled>
                    Select process type first
                  </MenuItem>
                ) : filteredRequestTypes.length === 0 ? (
                  <MenuItem value="" disabled>
                    No request types — use Setup Types
                  </MenuItem>
                ) : (
                  [
                    <MenuItem key="__empty" value="" disabled>
                      Select request type
                    </MenuItem>,
                    ...filteredRequestTypes.map((rt) => (
                      <MenuItem key={rt.id} value={String(rt.id)}>
                        {rt.title}
                      </MenuItem>
                    )),
                  ]
                )}
              </TextField>
            </div>
          </FormRow>

          <FormSection>
            <FieldLabel>
              Email for E-Sign Link <span style={{ color: "#EF3826" }}>*</span>
            </FieldLabel>
            <TextField
              size="small"
              fullWidth
              type="email"
              placeholder="merchant@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              helperText="Auto-filled from merchant. Edit if you want to send the link elsewhere."
            />
          </FormSection>

          <FormSection>
            <FieldLabel>Document</FieldLabel>
            <UploadZone
              dragOver={dragOver}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                uploadDocument(e.dataTransfer.files?.[0]);
              }}
            >
              <CloudUploadOutlinedIcon sx={{ fontSize: 28, color: "#94A3B8", mb: 0.75 }} />
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--sidebar-text-primary)",
                }}
              >
                {form.fileName || "Drag & drop file here"}
              </p>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 12,
                  color: "var(--dashboard-text-secondary)",
                }}
              >
                {uploading && form.fileName
                  ? "Uploading in the background…"
                  : "PDF, DOC, DOCX — max 10MB"}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0C79F7",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Browse File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                hidden
                onChange={(e) => {
                  uploadDocument(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {form.fileName && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  style={{
                    marginTop: 8,
                    border: "none",
                    background: "transparent",
                    color: "#EF3826",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove file
                </button>
              )}
            </UploadZone>
            {isChangeRequestPdf(form.fileUrl, form.fileName) && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--dashboard-text-secondary)",
                  }}
                >
                  {form.signaturePlacements.length
                    ? `${form.signaturePlacements.length} signature location${
                        form.signaturePlacements.length === 1 ? "" : "s"
                      } selected`
                    : "Click the PDF to mark where the merchant should sign."}
                </p>
                <button
                  type="button"
                  onClick={() => setPlacementPickerOpen(true)}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid #0C79F7",
                    background: "#fff",
                    color: "#0C79F7",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {form.signaturePlacements.length
                    ? "Edit signature locations"
                    : "Place signature locations"}
                </button>
              </div>
            )}
          </FormSection>

          <FormSection style={{ marginBottom: 0 }}>
            <FieldLabel>Notes (optional)</FieldLabel>
            <TextField
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              size="small"
              placeholder="Add any additional notes…"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              inputProps={{ maxLength: 5000 }}
            />
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                textAlign: "right",
                color: "var(--dashboard-text-secondary)",
              }}
            >
              {form.notes.length}/5000
            </p>
          </FormSection>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 1.75,
            gap: 1,
            borderTop: "1px solid #E2E8F0",
            justifyContent: "flex-end",
          }}
        >
          <ModalActionBtn
            type="button"
            variant="ghost"
            onClick={closeCreate}
            disabled={submitting}
          >
            Cancel
          </ModalActionBtn>
          <ModalActionBtn
            type="button"
            variant="outline"
            onClick={() => handleCreate(true)}
            disabled={submitting || uploading}
            style={{ opacity: submitting || uploading ? 0.7 : 1 }}
          >
            Save Draft
          </ModalActionBtn>
          <ModalActionBtn
            type="button"
            variant="primary"
            onClick={() => handleCreate(false)}
            disabled={submitting || uploading}
            style={{ opacity: submitting || uploading ? 0.7 : 1 }}
          >
            {submitting ? "Sending…" : "Send for E-Sign"}
          </ModalActionBtn>
        </DialogActions>
      </Dialog>

      <SignaturePlacementPicker
        open={placementPickerOpen}
        onClose={() => setPlacementPickerOpen(false)}
        fileUrl={form.fileUrl}
        pdfFile={localPdfFile}
        placements={form.signaturePlacements}
        accessToken={accessToken}
        isUploading={uploading}
        onSave={(next) =>
          setForm((prev) => ({
            ...prev,
            signaturePlacements: next,
          }))
        }
      />

      <SetupTypesModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        accessToken={accessToken}
        onChanged={loadLookups}
      />
    </div>
  );
};

export default MerchantChangeRequest;
