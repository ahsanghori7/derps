import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Autocomplete, TextField, CircularProgress, Backdrop } from "@mui/material";
import { getRequestWithOutBody, postRequestWithFormData, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import AddAccountModal from "../../Components/AddAccountModal";
import Heading from "../../Components/Heading";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { useLocation } from "react-router-dom";

export default function JournalEntry() {
  const location = useLocation();
  const [journalDate, setJournalDate] = useState("");
  const [reference, setReference] = useState("");
  const [rows, setRows] = useState([
    { id: 1, accountId: "", account: "", debit: "", credit: "", description: "", attachments: [] },
    { id: 2, accountId: "", account: "", debit: "", credit: "", description: "", attachments: [] },
  ]);
  const accessToken = useSelector((state) => state.auth.accessToken);
  
  // Update browser tab title
  usePageTitle("Journal Entry", location);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsHasMore, setAccountsHasMore] = useState(true);
  const accountsLoadingRef = useRef(false);
  const accountsPageRef = useRef(1);
  const accountsHasMoreRef = useRef(true);
  const accountsInFlightPagesRef = useRef(new Set());
  const [notes, setNotes] = useState("");
  const [globalFiles, setGlobalFiles] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingRowIndex, setPendingRowIndex] = useState(null);
  const accountLimit = 200;

  console.log("accounts", accounts);

  const fetchAccounts = async (page = 1, append = false) => {
    if (!accessToken || accountsLoadingRef.current) return;
    if (accountsInFlightPagesRef.current.has(page)) return;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(accountLimit));
    const url = `${baseURl}account/?${params.toString()}`;
    accountsInFlightPagesRef.current.add(page);
    accountsLoadingRef.current = true;
    setAccountsLoading(true);
    try {
      const json = await getRequestWithOutBody(url, accessToken);
      const list = json?.data?.data || json?.data || [];
      const flat = Array.isArray(list) ? list : [];

      const mapped = flat.map((a) => ({
          id: a.id,
          name: a.name || a.accountName || "",
          code: a.code || a.accountCode || "",
          type: a.type || a.accountType || "",
        }));

      setAccounts((prev) => {
        if (!append) return mapped;
        const byId = new Map();
        [...prev, ...mapped].forEach((item) => byId.set(String(item.id), item));
        return Array.from(byId.values());
      });

      const totalPages = Number(
        json?.data?.totalPages ??
        json?.data?.meta?.totalPages ??
        json?.data?.pagination?.totalPages ??
        json?.meta?.totalPages ??
        0
      );
      setAccountsPage(page);
      accountsPageRef.current = page;
      const nextHasMore = totalPages > 0 ? page < totalPages : mapped.length === accountLimit;
      setAccountsHasMore(nextHasMore);
      accountsHasMoreRef.current = nextHasMore;
    } catch (e) {
      if (!append) setAccounts([]);
      setAccountsHasMore(false);
      accountsHasMoreRef.current = false;
    } finally {
      accountsInFlightPagesRef.current.delete(page);
      accountsLoadingRef.current = false;
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    setAccounts([]);
    setAccountsPage(1);
    setAccountsHasMore(true);
    accountsPageRef.current = 1;
    accountsHasMoreRef.current = true;
    accountsInFlightPagesRef.current.clear();
    fetchAccounts(1, false);
  }, [accessToken]);

  useEffect(() => {
    accountsLoadingRef.current = accountsLoading;
  }, [accountsLoading]);

  useEffect(() => {
    accountsPageRef.current = accountsPage;
  }, [accountsPage]);

  useEffect(() => {
    accountsHasMoreRef.current = accountsHasMore;
  }, [accountsHasMore]);

  const fileAccept = ".pdf,.xls,.xlsx,image/*";

  const currency = (n) => (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    rows.forEach((r) => {
      // Only include rows that have an account selected
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

  // Strict balance check - must be exactly equal (using rounded values)
  const balanced = totals.debit === totals.credit && totals.debit > 0;


  const updateRow = (index, key, value) => {
    setRows((prev) => {
      const next = [...prev];
      if (key === "debit" || key === "credit") {
        value = (value || "").toString().replace(/[^0-9.\-]/g, "");
        // Clear the other field when entering a value
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
      const id = Math.max(0, ...next.map((r) => r.id)) + 1;
      next.splice(index + 1, 0, { id, accountId: "", account: "", debit: "", credit: "", description: "", attachments: [] });
      return next;
    });
  };

  const removeRow = (index) => {
    setRows((prev) => prev.length > 2 ? prev.filter((_, i) => i !== index) : prev);
  };

  const clearForm = () => {
    setJournalDate("");
    setReference("");
    setNotes("");
    setGlobalFiles([]);
    setRows([
      { id: 1, accountId: "", account: "", debit: "", credit: "", description: "", attachments: [] },
      { id: 2, accountId: "", account: "", debit: "", credit: "", description: "", attachments: [] },
    ]);
  };

  const onGlobalAttach = (filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    setGlobalFiles((prev) => [...prev, ...files]);
  };

  const removeGlobalAttachment = (fileIndex) => {
    setGlobalFiles((prev) => {
      const list = [...prev];
      list.splice(fileIndex, 1);
      return list;
    });
  };

  const onAttach = (index, filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    setRows((prev) => {
      const next = [...prev];
      const current = next[index];
      next[index] = { ...current, attachments: [...(current.attachments || []), ...files] };
      return next;
    });
  };

  const removeAttachment = (rowIndex, fileIndex) => {
    setRows((prev) => {
      const next = [...prev];
      const current = next[rowIndex];
      const list = [...(current.attachments || [])];
      list.splice(fileIndex, 1);
      next[rowIndex] = { ...current, attachments: list };
      return next;
    });
  };

  const handleAccountsScroll = (event) => {
    if (!accountsHasMoreRef.current || accountsLoadingRef.current) return;
    const listboxNode = event?.currentTarget || event?.target;
    if (!listboxNode) return;
    const nearBottom =
      listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 24;
    if (!nearBottom) return;
    fetchAccounts(accountsPageRef.current + 1, true);
  };

  const handleSave = async () => {
    // Validate journal date
    if (!journalDate) {
      alert("Please select a journal date.");
      return;
    }

    // Validate entries exist
    const validEntries = rows.filter(r => r.accountId && (parseFloat(r.debit || 0) > 0 || parseFloat(r.credit || 0) > 0));
    if (validEntries.length === 0) {
      alert("Please add at least one journal entry with account and amount.");
      return;
    }

    // Strict balance validation (round to 2 decimal places to fix floating-point precision)
    const totalDebits = Math.round(validEntries.reduce((sum, r) => sum + parseFloat(r.debit || 0), 0) * 100) / 100;
    const totalCredits = Math.round(validEntries.reduce((sum, r) => sum + parseFloat(r.credit || 0), 0) * 100) / 100;

    if (totalDebits !== totalCredits) {
      alert(`Debits (${totalDebits.toFixed(2)}) and Credits (${totalCredits.toFixed(2)}) must be exactly equal.\n\nPlease adjust your entries to balance the journal.`);
      return;
    }

    if (totalDebits === 0) {
      alert("Journal entry must have amounts greater than zero.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload all files first
      const uploadedFileResults = [];

      // Collect all files from global file upload
      const allFiles = [...globalFiles];

      // Upload each file
      if (allFiles.length > 0) {
        for (const file of allFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", 'journal');

          const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

          uploadedFileResults.push({
            url: result1?.data?.fileUrl?.url,
            mimetype: result1?.data?.fileUrl?.mimetype,
            originalname: result1?.data?.fileUrl?.originalname,
          });
        }
      }

      // Step 2: Prepare journal entry data
      const journalData = {
        date: journalDate,
        description: notes || "",
        source: "manual",
        status: "posted",
        currency: "USD",
        // tenantId: 1,
        files: uploadedFileResults,
        notes: notes || "",
        entries: rows
          .filter(r => r.accountId && (r.debit || r.credit))
          .map((r, index) => ({
            accountId: parseInt(r.accountId),
            debit: parseFloat(r.debit || 0),
            credit: parseFloat(r.credit || 0),
            lineOrder: index + 1,
            description: r.description || ""
          }))
      };

      // Only add reference if it has a value (backend will auto-generate if not provided)
      if (reference && reference.trim()) {
        journalData.reference = reference.trim();
      }


      // Step 3: Save journal entry
      const result = await postRequestWithBodyAndToken(
        `${baseURl}journal`,
        accessToken,
        journalData
      );

      alert("Journal entry saved successfully!");

      // Clear form after successful save
      clearForm();

    } catch (error) {
      alert(`Error saving journal entry: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <div className="flex flex-col items-center gap-3">
          <CircularProgress color="inherit" size={60} />
          <div className="text-lg font-medium">Saving Journal Entry...</div>
          <div className="text-sm opacity-80">Please wait while we process your request</div>
        </div>
      </Backdrop>

      <div className="p-4 min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)' }}>
        <div className="w-full max-w-[1600px] mx-auto">
          <div className="flex items-baseline justify-between mb-3">
            {/* <h1 className="text-2xl font-bold text-[var(--sidebar-text-primary)]">Journal Entry</h1> */}
            <Heading
              Fontweight={700}
              color={'var(--sidebar-text-primary)'}
              Heading={'Journal Entry'}
              Fontsize={30}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3">
            <div>
              {/* <label className="block text-sm text-[var(--fieldsTitle)] mb-1">Journal Date</label> */}
              <div className="flex items-center gap-2 ">
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
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
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
                  placeholder="Enter reference number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--fieldsTitle)] mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter additional notes (optional)"
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

            <div className="divide-y divide-[var(--sidebar-selected-bg)]">
              {rows.map((r, idx) => (
                <div key={r.id} className={`grid grid-cols-12 items-center gap-x-3 px-3 py-2 ${idx % 2 === 0 ? 'bg-[var(--dashboard-card-bg)]' : 'bg-[var(--dashboard-bg)]'}`}>
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
                      loading={accountsLoading}
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
                      ListboxProps={{
                        onScroll: handleAccountsScroll,
                        onScrollCapture: handleAccountsScroll,
                        onWheel: handleAccountsScroll,
                        onTouchMove: handleAccountsScroll,
                      }}
                      slotProps={{
                        listbox: {
                          onScroll: handleAccountsScroll,
                          onScrollCapture: handleAccountsScroll,
                          onWheel: handleAccountsScroll,
                          onTouchMove: handleAccountsScroll,
                        },
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Account" placeholder="Search account" size="small" sx={{ 
                          '& .MuiInputBase-input': { fontSize: 13, height: 20, color: 'var(--dashboard-text-primary)' }, 
                          '& .MuiInputLabel-root': { fontSize: 13, color: 'var(--dashboard-text-secondary)' },
                          '& .MuiInputLabel-root.Mui-focused': { color: 'var(--sidebar-selected-bg)' }
                        }} />
                      )}
                      sx={{
                        width: '100%', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--sidebar-selected-bg)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--dashboard-text-secondary)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--navbar-dropdown-hover)' },
                        '& .MuiSelect-select': { backgroundColor: 'var(--dashboard-tab-box)', borderRadius: '8px', color: 'var(--dashboard-text-primary)' },
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="0.01"
                      value={r.debit || ""}
                      onChange={(e) => updateRow(idx, "debit", e.target.value)}
                      placeholder="0.00"
                      className="h-9 w-full rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] px-2 text-[13px] text-right"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="0.01"
                      value={r.credit || ""}
                      onChange={(e) => updateRow(idx, "credit", e.target.value)}
                      placeholder="0.00"
                      className="h-9 w-full rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] px-2 text-[13px] text-right"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="enter description"
                      value={r.description}
                      onChange={(e) => updateRow(idx, "description", e.target.value)}
                      className="h-9 w-full rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] px-2 text-[13px]"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-2">
                    <button onClick={() => removeRow(idx)} className="text-red-500 text-sm">🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            {/* File Upload Section */}
            <div className="border-t border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-card-bg)] px-3 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--dashboard-text-primary)]">Attachments</h3>
                <label className="cursor-pointer h-9 rounded border border-[var(--sidebar-selected-bg)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-text-primary)] px-3 text-[12px] flex items-center hover:opacity-90">
                  📎 Upload Files
                  <input type="file" accept={fileAccept} multiple onChange={(e) => onGlobalAttach(e.target.files)} className="hidden" />
                </label>
              </div>
              {globalFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {globalFiles.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2 border rounded px-2 py-1 bg-[var(--dashboard-tab-box)] text-[12px]">
                      <span className="max-w-[200px] truncate" title={f.name}>{f.name}</span>
                      <button onClick={() => removeGlobalAttachment(fi)} className="text-red-500 text-xs hover:text-red-700">×</button>
                    </div>
                  ))}
                </div>
              )}
              {globalFiles.length === 0 && (
                <div className="text-xs text-[var(--dashboard-text-secondary)] italic">No files attached</div>
              )}
            </div>

            <div className="bg-[var(--dashboard-card-bg)] px-3 py-3 text-[13px] font-semibold border-t border-[var(--sidebar-selected-bg)]">
              <div className="grid grid-cols-12 items-center gap-x-3">
                {/* NO(1)+ACCOUNT(4) block with label and combined total */}
                <div className="col-span-6 flex items-center justify-between pr-3">
                  <span className="text-[var(--dashboard-text-primary)]">Total:</span>
                  <span className="text-[var(--dashboard-text-primary)]">${currency(totals.debit)}</span>
                </div>
                {/* DEBITS(2) */}
                <div className="col-span-1 text-right text-[var(--dashboard-text-primary)]">${currency(totals.debit)}</div>
                {/* CREDITS(2) */}
                <div className="col-span-1 text-right text-[var(--dashboard-text-primary)]">${currency(totals.credit)}</div>
                {/* DESCRIPTION(2) + ATTACH(1) as blanks */}
                <div className="col-span-4" />
              </div>
              {!balanced && (
                <div className="pt-1 text-xs text-red-400">
                  {totals.debit === 0 && totals.credit === 0
                    ? "Add journal entries to see balance"
                    : `Debits ($${currency(totals.debit)}) and Credits ($${currency(totals.credit)}) must be exactly equal`
                  }
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={clearForm} className="h-9 rounded border border-[var(--sidebar-selected-bg)] px-4 text-[13px] text-[var(--dashboard-text-primary)]">Clear</button>
            </div>
            <button
              onClick={handleSave}
              disabled={!balanced || loading}
              className={`h-9 rounded px-6 font-semibold text-[13px] flex items-center gap-2 ${balanced && !loading ? 'bg-[var(--navbar-dropdown-hover)] text-[var(--sidebar-text-selected)] hover:opacity-90' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            >
              {loading && <CircularProgress size={14} color="inherit" />}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        accessToken={accessToken}
        onCreated={async (created) => {
          setAccounts((prev) => {
            const createdItem = {
              id: created?.id,
              name: created?.name || created?.accountName || "",
              code: created?.code || created?.accountCode || "",
              type: created?.type || created?.accountType || "",
            };
            if (!createdItem.id) return prev;
            const exists = prev.some((a) => String(a.id) === String(createdItem.id));
            return exists ? prev : [createdItem, ...prev];
          });
          if (created?.id && Number.isInteger(pendingRowIndex)) {
            updateRow(pendingRowIndex, 'accountId', created.id);
          }
          setPendingRowIndex(null);
          setAddOpen(false);
        }}
      />
    </>
  );
}
