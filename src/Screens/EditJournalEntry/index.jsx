import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Autocomplete, Backdrop, CircularProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { IoIosArrowBack } from "react-icons/io";
import { styled } from '@mui/material/styles';
import { toast } from "react-toastify";
import Heading from "../../Components/Heading";
import { baseURl } from "../../Config/systemConfig";
import { getRequestWithOutBody, postRequestWithFormData, postRequestWithBodyAndToken, putRequestWithBodyAndToken, deleteRequest } from "../../Api/fetch";
import AddAccountModal from "../../Components/AddAccountModal";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// Loading skeleton component for journal entry
const LoadingJournalEntry = () => {
  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--dashboard-card-bg)',
        border: '1px solid var(--dashboard-box-border)',
        marginBottom: 24
      }}>
        {/* Loading Header */}
        <div style={{
          padding: 20,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'rgba(59, 130, 246, 0.05)'
        }}>
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid #3B82F6',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '14px' }}>
            Loading journal entry details...
          </span>
        </div>

        {/* Journal Form Skeleton */}
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              height: '24px',
              width: '200px',
              backgroundColor: '#E5E7EB',
              borderRadius: '6px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{
              height: '12px',
              width: '80px',
              backgroundColor: '#F3F4F6',
              borderRadius: '3px',
              marginBottom: 8,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              height: '36px',
              width: '200px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </div>

          {/* Table skeleton */}
          <div style={{ border: '1px solid rgba(224,224,224,1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: 16, backgroundColor: '#F9FAFB' }}>
              <div style={{
                height: '16px',
                width: '100%',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
            </div>
            {[1, 2].map((item) => (
              <div key={item} style={{ padding: 16, borderTop: '1px solid rgba(224,224,224,1)' }}>
                <div style={{
                  height: '14px',
                  width: '100%',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '3px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const HeaderWrapper2 = styled('div')({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
  flexWrap: 'wrap',
  gap: 10,
  cursor: 'default'
});

export default function EditJournalEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [journalDate, setJournalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]); // from server
  const [newFiles, setNewFiles] = useState([]); // to upload
  const [addOpen, setAddOpen] = useState(false);
  const [pendingRowIndex, setPendingRowIndex] = useState(null);
  const [reference, setReference] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [createdAt, setCreatedAt] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  // Map of original entry IDs to detect deletions
  const [originalEntryIds, setOriginalEntryIds] = useState([]);

  const fileAccept = ".pdf,.xls,.xlsx,image/*";

  const fetchAccounts = async () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "200");
    const url = `${baseURl}account/?${params.toString()}`;
    try {
      const json = await getRequestWithOutBody(url, accessToken);
      const list = json?.data?.data || json?.data || [];
      const flat = Array.isArray(list) ? list : [];
      setAccounts(
        flat.map((a) => ({
          id: a.id,
          name: a.name || a.accountName || "",
          code: a.code || a.accountCode || "",
          type: a.type || a.accountType || "",
        }))
      );
    } catch (e) {
      setAccounts([]);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [accessToken]);

  useEffect(() => {
    if (!id) return;
    // Load journal details
    const url = `${baseURl}journal/${id}`;
    setLoading(true);
    setLoadingMessage("Loading Journal Entry...");
    getRequestWithOutBody(url, accessToken)
      .then((json) => {
        const data = json?.data || json || {};
        setJournalDate(data.date || "");
        setNotes(data.notes || "");
        setDescription(data.description || "");
        setReference(data.reference || data.ref || data.journalNo || data.number || data.code || "");
        setCreatedAt(
          data?.createdAt
            ? new Date(data.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
            : "",
        );
        setCreatedBy(data?.creator?.name || data?.postedInfo?.postedByName || "-");
        setExistingFiles(Array.isArray(data.files) ? data.files : []);
        const entries = Array.isArray(data.entries) ? data.entries : [];
        setOriginalEntryIds(entries.map((e) => e.id).filter(Boolean));
        setRows(
          entries.map((e, idx) => ({
            id: e.id || idx + 1,
            entryId: e.id, // keep original id if present
            accountId: e.accountId || "",
            account: "",
            debit: e.debit ? String(e.debit) : "",
            credit: e.credit ? String(e.credit) : "",
            description: e.description || "",
          }))
        );
        // Ensure at least 2 rows
        if (entries.length < 2) {
          setRows((prev) => {
            const copy = [...prev];
            while (copy.length < 2) {
              copy.push({ id: Date.now() + copy.length, accountId: "", account: "", debit: "", credit: "", description: "" });
            }
            return copy;
          });
        }
      })
      .catch((e) => toast.error("Failed to load journal:", e))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    rows.forEach((r) => {
      if (r.accountId) {
        debit += parseFloat(r.debit || 0);
        credit += parseFloat(r.credit || 0);
      }
    });
    // Round to 2 decimal places to fix floating-point precision issues
    return { 
      debit: Math.round(debit * 100) / 100, 
      credit: Math.round(credit * 100) / 100 
    };
  }, [rows]);
  const balanced = totals.debit === totals.credit && totals.debit > 0;

  const currency = (n) => (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const updateRow = (index, key, value) => {
    setRows((prev) => {
      const next = [...prev];
      if (key === "debit" || key === "credit") {
        value = (value || "").toString().replace(/[^0-9.\-]/g, "");
        if (key === "debit") {
          next[index] = { ...next[index], debit: value, credit: value ? "" : next[index].credit };
          return next;
        }
        if (key === "credit") {
          next[index] = { ...next[index], credit: value, debit: value ? "" : next[index].debit };
          return next;
        }
      }
      if (key === "accountId") {
        const found = accounts.find((a) => String(a.id) === String(value));
        next[index] = { ...next[index], accountId: value, account: found?.name || "" };
        return next;
      }
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addRowBelow = (index) => {
    setRows((prev) => {
      const next = [...prev];
      const newId = Math.max(0, ...next.map((r) => r.id || 0)) + 1;
      next.splice(index + 1, 0, { id: newId, accountId: "", account: "", debit: "", credit: "", description: "" });
      return next;
    });
  };

  const removeRow = (index) => {
    setRows((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  };

  const onGlobalAttach = (filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    setNewFiles((prev) => [...prev, ...files]);
  };

  const removeExistingFile = (i) => {
    setExistingFiles((prev) => prev.filter((_, idx) => idx !== i));
  };
  const removeNewFile = (i) => {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Navigation state for Prev/Next journal
  const navIds = useMemo(() => {
    const ids = location.state?.ids;
    return Array.isArray(ids) && ids.length > 0 ? ids : null;
  }, [location.state]);

  const navIndex = useMemo(() => {
    if (!navIds) return -1;
    const idxFromState = Number.isInteger(location.state?.index) ? location.state.index : -1;
    if (idxFromState >= 0 && idxFromState < navIds.length) return idxFromState;
    const found = navIds.findIndex((jid) => String(jid) === String(id));
    return found;
  }, [navIds, location.state, id]);

  const goPrev = () => {
    if (!navIds || navIndex <= 0) return;
    const targetId = navIds[navIndex - 1];
    navigate(`/home/editJournalEntry/${targetId}`, { state: { ids: navIds, index: navIndex - 1 }, replace: true });
  };

  const goNext = () => {
    if (!navIds || navIndex === -1 || navIndex >= navIds.length - 1) return;
    const targetId = navIds[navIndex + 1];
    navigate(`/home/editJournalEntry/${targetId}`, { state: { ids: navIds, index: navIndex + 1 }, replace: true });
  };

  const handleSave = async () => {
    if (!journalDate) {
      toast.error("Please select a journal date.");
      return;
    }
    const validEntries = rows.filter((r) => r.accountId && (parseFloat(r.debit || 0) > 0 || parseFloat(r.credit || 0) > 0));
    if (validEntries.length === 0) {
      toast.error("Please add at least one journal entry with account and amount.");
      return;
    }
    // Round to 2 decimal places to fix floating-point precision issues
    const totalDebits = Math.round(validEntries.reduce((sum, r) => sum + parseFloat(r.debit || 0), 0) * 100) / 100;
    const totalCredits = Math.round(validEntries.reduce((sum, r) => sum + parseFloat(r.credit || 0), 0) * 100) / 100;
    if (totalDebits !== totalCredits) {
      toast.error(`Debits (${totalDebits.toFixed(2)}) and Credits (${totalCredits.toFixed(2)}) must be exactly equal.`);
      return;
    }

    setLoading(true);
    setLoadingMessage("Saving Journal Entry...");
    try {
      // Upload new files
      const uploaded = [];
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "journal");
        const res = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
        uploaded.push({
          url: res?.data?.fileUrl?.url,
          mimetype: res?.data?.fileUrl?.mimetype,
          originalname: res?.data?.fileUrl?.originalname,
        });
      }

      // Build entries array with deletes

      const kept = validEntries.map((r, idx) => ({
        ...(r.entryId ? { id: r.entryId } : {}),
        accountId: parseInt(r.accountId),
        debit: parseFloat(r.debit || 0),
        credit: parseFloat(r.credit || 0),
        description: r.description || "",
        lineOrder: idx + 1,
      }));
      const deleted = originalEntryIds
        .filter((eid) => eid && !validEntries.find((r) => r.entryId === eid))
        .map((eid) => ({ id: eid, _delete: true }));

      const payload = {
        date: journalDate, // Should be in YYYY-MM-DD format from date input
        source: "manual",
        status: "posted",
        currency: "USD",
        // tenantId: 1,
        description: description || "",
        notes: notes || "",
        reference: reference || "",
        files: [...existingFiles, ...uploaded],
        entries: [...kept, ...deleted],
      };

      // Validate payload before sending
      if (!payload.date) {
        toast.error("Journal date is required");
        return;
      }
      if (!payload.entries || payload.entries.length === 0) {
        toast.error("At least one journal entry is required");
        return;
      }

      const result = await putRequestWithBodyAndToken(`${baseURl}journal/${id}`, accessToken, payload);

      if (result && (result.success || result.data || result.id)) {
        toast.success("Journal updated successfully!");
        navigate(-1);
      } else {
        toast.success("Journal updated successfully!"); // Still show success if no error thrown
        navigate(-1);
      }
    } catch (e) {
      toast.error(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setLoadingMessage("Deleting Journal Entry...");
    try {
      await deleteRequest(`${baseURl}journal/${id}`, accessToken);
      toast.success("Journal deleted successfully!");
      // Rebuild nav list without the deleted id so we can't navigate back to it
      if (navIds && navIndex !== -1) {
        const newIds = navIds.filter((jid) => String(jid) !== String(id));
        if (newIds.length > 0) {
          const targetIndex = Math.min(navIndex, newIds.length - 1);
          const targetId = newIds[targetIndex];
          navigate(`/home/editJournalEntry/${targetId}`, { state: { ids: newIds, index: targetIndex }, replace: true });
        } else {
          navigate(-1);
        }
      } else {
        navigate(-1);
      }
    } catch (e) {
      toast.error(e.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading component for initial data fetch
  if (loading && !journalDate) {
    return (
      <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
        <LoadingJournalEntry />
      </div>
    );
  }

  return (
    <>
      {/* Loading Backdrop for save/delete operations */}
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading && journalDate}>
        <div className="flex flex-col items-center gap-3">
          <CircularProgress color="inherit" size={60} />
          <div className="text-lg font-medium">{loadingMessage || "Processing..."}</div>
          <div className="text-sm opacity-80">Please wait while we process your request</div>
        </div>
      </Backdrop>

      <div className="p-4 min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)' }}>
        <div className="w-full max-w-[1600px] mx-auto">
          <HeaderWrapper2>
            <button
              onClick={() => window.history.back()}
              style={{
                minWidth: 40,
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'var(--dashboard-card-bg)',
                border: '1px solid var(--dashboard-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
            </button>
            <Heading
              Fontweight={700}
              color={'var(--sidebar-text-primary)'}
              Heading={'Edit Journal Entry'}
              Fontsize={30}
            />
            {reference && (
              <div style={{
                backgroundColor: '#10B981',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                Reference: {reference}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!navIds || navIndex <= 0}
                className={`h-8 rounded px-3 text-[12px] font-semibold border ${(!navIds || navIndex <= 0) ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] border-[var(--sidebar-selected-bg)] hover:opacity-90'}`}
              >
                Previous
              </button>
              <button
                onClick={goNext}
                disabled={!navIds || navIndex === -1 || navIndex >= (navIds?.length || 0) - 1}
                className={`h-8 rounded px-3 text-[12px] font-semibold border ${(!navIds || navIndex === -1 || navIndex >= (navIds?.length || 0) - 1) ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] border-[var(--sidebar-selected-bg)] hover:opacity-90'}`}
              >
                Next
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
                className={`h-8 rounded px-3 text-[12px] font-semibold border ${loading ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'}`}
              >
                Delete
              </button>
            </div>
          </HeaderWrapper2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3 ">
            <div>
              {/* <label className="block text-sm text-[var(--fieldsTitle)] mb-1">Journal Date</label> */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Journal Date"
                    format="MM/DD/YYYY"
                    value={journalDate ? dayjs(journalDate) : null}
                    onChange={(value) => {
                      setJournalDate(value ? dayjs(value).format("YYYY-MM-DD") : "");
                    }}
                    slotProps={{
                      textField: {
                        size: "small",
                        InputLabelProps: { shrink: true },
                        sx: {
                          width: '200px',
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: 'var(--dashboard-tab-box)'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
                <TextField
                  type="text"
                  value={reference}
                  label="Reference"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    width: '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: 'var(--dashboard-tab-box)'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                  }}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  placeholder="Enter reference number"
                />
                <TextField
                  type="text"
                  value={createdAt}
                  label="Created At"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    width: '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: 'var(--dashboard-tab-box)'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                  }}
                  disabled
                />
                <TextField
                  type="text"
                  value={createdBy}
                  label="Created By"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    width: '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: 'var(--dashboard-tab-box)'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                  }}
                  disabled
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--fieldsTitle)] mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
                className="w-full rounded-lg border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] px-2 py-2 text-[13px] resize-none"
              />
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-[rgba(224,224,224,1)] bg-[var(--dashboard-card-bg)] shadow-sm">
            <div className="grid grid-cols-12 items-center gap-x-3 bg-[var(--navbar-dropdown-hover)] text-[var(--sidebar-text-selected)] font-semibold text-[12px] px-3 py-3">
              <div className="col-span-1"></div>
              <div className="col-span-1">NO</div>
              <div className="col-span-3">ACCOUNT</div>
              <div className="col-span-1 text-center">DEBITS</div>
              <div className="col-span-1 text-center">CREDITS</div>
              <div className="col-span-4">DESCRIPTION</div>
              <div className="col-span-1 text-center pr-2">ACTION</div>
            </div>

            <div className="divide-y divide-[rgba(224,224,224,1)]">
              {rows.map((r, idx) => (
                <div key={r.id} className={`grid grid-cols-12 items-center gap-x-3 px-3 py-2 ${idx % 2 === 0 ? 'bg-[rgba(249,249,251,1)]' : ''}`}>
                  {/* + column (separate) */}
                  <div className="col-span-1 flex items-center justify-center">
                    {idx === rows.length - 1 ? (
                      <button
                        onClick={() => addRowBelow(idx)}
                        className="w-7 h-7 rounded-full bg-[var(--navbar-dropdown-hover)] text-white flex items-center justify-center text-sm shadow-sm hover:opacity-90"
                      >
                        +
                      </button>
                    ) : (
                      <div className="w-7 h-7" />  // placeholder
                    )}
                  </div>

                  {/* NO column (straight alignment) */}
                  <div className="col-span-1">
                    <span className="text-sm text-[var(--dashboard-text-primary)]">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="col-span-3 flex items-center gap-2">
                    <Autocomplete
                      size="small"
                      options={[{ id: "__add__", name: "Add new account" }, ...accounts]}
                      getOptionLabel={(o) => `${o.code ? o.code + ' - ' : ''}${o.name || ''}`}
                      value={accounts.find((a) => String(a.id) === String(r.accountId)) || null}
                      onChange={(_, val) => {
                        if (val && val.id === "__add__") {
                          setPendingRowIndex(idx);
                          setAddOpen(true);
                          return;
                        }
                        updateRow(idx, 'accountId', val ? val.id : '');
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Account" placeholder="Search account" size="small" sx={{ '& .MuiInputBase-input': { fontSize: 13, height: 20 }, '& .MuiInputLabel-root': { fontSize: 13 } }} />
                      )}
                      sx={{
                        width: '100%', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0C79F7' },
                        '& .MuiSelect-select': { backgroundColor: 'var(--dashboard-tab-box)', borderRadius: '8px' },
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <input type="number" step="0.01" value={r.debit || ""} onChange={(e) => updateRow(idx, 'debit', e.target.value)} placeholder="0.00" className="h-9 w-full rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] text-[13px] text-right" />
                  </div>
                  <div className="col-span-1">
                    <input type="number" step="0.01" value={r.credit || ""} onChange={(e) => updateRow(idx, 'credit', e.target.value)} placeholder="0.00" className="h-9 w-full rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] text-[13px] text-right" />
                  </div>
                  <div className="col-span-4">
                    <input type="text" placeholder="enter description" value={r.description} onChange={(e) => updateRow(idx, 'description', e.target.value)} className="h-9 w-full rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] px-2 text-[13px]" />
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-2">
                    {rows.length > 2 && (
                      <button onClick={() => removeRow(idx)} className="text-red-500 text-sm hover:text-red-700" title="Delete row">🗑️</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* File Upload Section */}
            <div className="border-t border-[rgba(224,224,224,1)] bg-[var(--dashboard-card-bg)] px-3 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--dashboard-text-primary)]">Attachments</h3>
                <label className="cursor-pointer h-9 rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] px-3 text-[12px] flex items-center hover:opacity-90">
                  📎 Upload Files
                  <input type="file" accept={fileAccept} multiple onChange={(e) => onGlobalAttach(e.target.files)} className="hidden" />
                </label>
              </div>
              {(existingFiles.length > 0 || newFiles.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {existingFiles.map((f, fi) => (
                    <div key={`e-${fi}`} className="flex items-center gap-2 border rounded px-2 py-1 bg-[var(--dashboard-tab-box)] text-[12px]">
                      <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 underline max-w-[220px] truncate" title={f.originalname || f.url}>{f.originalname || f.url}</a>
                      <button onClick={() => removeExistingFile(fi)} className="text-red-500 text-xs hover:text-red-700">×</button>
                    </div>
                  ))}
                  {newFiles.map((f, fi) => (
                    <div key={`n-${fi}`} className="flex items-center gap-2 border rounded px-2 py-1 bg-[var(--dashboard-tab-box)] text-[12px]">
                      <span className="max-w-[220px] truncate" title={f.name}>{f.name}</span>
                      <button onClick={() => removeNewFile(fi)} className="text-red-500 text-xs hover:text-red-700">×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">No files attached</div>
              )}
            </div>

            <div className="bg-[var(--dashboard-card-bg2)] px-3 py-3 text-[13px] font-semibold border-t border-[var(--dashboard-border)]">
              <div className="grid grid-cols-12 items-center gap-x-3">
                {/* NO(1)+ACCOUNT(4) block with label and combined total */}
                <div className="col-span-5 flex items-center justify-between pr-3">
                  <span className="text-[var(--dashboard-text-primary)]">Total:</span>
                  <span>${currency(totals.debit)}</span>
                </div>
                {/* DEBITS(2) */}
                <div className="col-span-2 text-right">${currency(totals.debit)}</div>
                {/* CREDITS(2) */}
                <div className="col-span-2 text-right">${currency(totals.credit)}</div>
                {/* DESCRIPTION(2) + ACTION(1) as blanks */}
                <div className="col-span-3" />
              </div>
              {!balanced && (
                <div className="pt-1 text-xs text-red-500">
                  {totals.debit === 0 && totals.credit === 0
                    ? "Add journal entries to see balance"
                    : `Debits ($${currency(totals.debit)}) and Credits ($${currency(totals.credit)}) must be exactly equal`}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            {/* <div className="flex gap-2">
              <button onClick={() => navigate(-1)} className="h-9 rounded border border-[var(--sidebar-selected-bg)] px-4 text-[13px]">Cancel</button>
              <button onClick={handleDelete} className="h-9 rounded border border-red-300 text-red-600 px-4 text-[13px] hover:bg-red-50">Delete Journal</button>
            </div> */}
            <button onClick={handleSave} disabled={!balanced || loading} className={`h-9 rounded px-6 font-semibold text-[13px] flex items-center gap-2 ${balanced && !loading ? 'bg-[var(--navbar-dropdown-hover)] text-[var(--sidebar-text-selected)] hover:opacity-90' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>
              {loading && <CircularProgress size={14} color="inherit" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        accessToken={accessToken}
        onCreated={async (created) => {
          await fetchAccounts();
          if (created?.id && Number.isInteger(pendingRowIndex)) {
            updateRow(pendingRowIndex, 'accountId', created.id);
          }
          setPendingRowIndex(null);
          setAddOpen(false);
        }}
      />

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => !loading && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 0.5, fontWeight: 600 }}>Delete Journal</DialogTitle>
        <DialogContent sx={{ pt: 0.5, pb: 1 }}>
          <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>
            Are you sure you want to delete this journal entry? This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={loading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setConfirmOpen(false); handleDelete(); }} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
