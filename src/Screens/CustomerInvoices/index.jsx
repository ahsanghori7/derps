import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Heading from "../../Components/Heading";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import MemoTable from "../../Components/MemoTable";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import { useRef, useEffect as useEffectReact } from "react";
import { Dialog, DialogTitle, DialogContent, Button, Checkbox, FormControl, ListItemText, MenuItem, OutlinedInput, Select, DialogActions, Grid, Menu, TextField } from "@mui/material";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function CustomerInvoices() {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const initialQueryParams = new URLSearchParams(location.search);
  const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const [loading, setLoading] = useState(false); // invoices loading (table + overlay)
  const [loadingCustomer, setLoadingCustomer] = useState(false); // customer header loading
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(() => parsePositiveInt(initialQueryParams.get('page'), 1));
  const [rowsPerPage, setRowsPerPage] = useState(() => parsePositiveInt(initialQueryParams.get('limit'), 10));
  const [totalCount, setTotalCount] = useState(undefined);
  const [search, setSearch] = useState(() => initialQueryParams.get('search') || "");
  const [selectedType, setSelectedType] = useState(() => initialQueryParams.get('type') || "");
  const [sortOrder, setSortOrder] = useState(() => {
    const qsOrder = (initialQueryParams.get('order') || '').toLowerCase();
    return qsOrder === 'asc' ? 'asc' : 'desc';
  });
  const [startDate, setStartDate] = useState(() => {
    const qsStartDate = initialQueryParams.get('startDate');
    if (qsStartDate) return qsStartDate;
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => initialQueryParams.get('endDate') || new Date().toISOString().slice(0, 10));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [poStats, setPoStats] = useState(null);
  const [poStatsLoading, setPoStatsLoading] = useState(false);
  const [viewPaymentOpen, setViewPaymentOpen] = useState(false);
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  
  // Default columns definition
  const defaultVisibleColumnIds = useMemo(
    () => ["date", "type", "no", "customer", "amount", "status", "action"],
    []
  );
  
  // Filter modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftSelectedType, setDraftSelectedType] = useState(selectedType);
  const [draftVisibleColumnIds, setDraftVisibleColumnIds] = useState(defaultVisibleColumnIds);
  const [draftPreset, setDraftPreset] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [exportPdfUrl, setExportPdfUrl] = useState('');

  useEffect(() => {
    return () => {
      if (exportPdfUrl) URL.revokeObjectURL(exportPdfUrl);
    };
  }, [exportPdfUrl]);

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const resolvePresetRange = (preset) => {
    const today = new Date();
    const end = new Date(today);
    let start = null;

    switch (preset) {
      case 'week': {
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      }
      case 'this-month': {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      }
      case 'last-month': {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end.setFullYear(today.getFullYear(), today.getMonth(), 0);
        break;
      }
      case 'this-year': {
        start = new Date(today.getFullYear(), 0, 1);
        break;
      }
      default:
        return null;
    }

    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
    };
  };

  const toolbarButtonSx = {
    borderRadius: '10px',
    textTransform: 'none',
    borderColor: 'var(--dashboard-border)',
    background: 'var(--dashboard-card-bg2)',
    color: 'var(--dashboard-text-primary)',
    fontWeight: 600,
    minHeight: 36,
    paddingY: '6px',
    paddingX: '12px',
    minWidth: 120,
  };

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const normalizeIdParam = (value) => {
    if (value == null || value === '' || value === 'undefined' || value === 'null') return null;
    return value;
  };

  const params = new URLSearchParams(location.search);
  const incomingCustomerId = normalizeIdParam(params.get('customerId') || location.state?.customerId);
  const incomingAgentId = normalizeIdParam(params.get('agentId') || location.state?.agentId);
  const effectiveCustomerId = incomingCustomerId || incomingAgentId || null;
  const isTransactionsView = Boolean(effectiveCustomerId);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let res;
      if (effectiveCustomerId) {
        // Use transactions API scoped to the provided customer number/id
        const qp = new URLSearchParams({
          paginate: 'true',
          page: String(page),
          limit: String(rowsPerPage),
          orderBy: 'createdAt',
          order: sortOrder || 'desc',
        });

        const allowedTypes = new Set(["Journal Entry", "Invoice", "Invoice Payment"]);
        if (selectedType && allowedTypes.has(selectedType)) {
          qp.set('type', selectedType);
        }

        if (startDate) qp.set('startDate', startDate);
        if (endDate) qp.set('endDate', endDate);

        res = await getRequestWithOutBody(
          `${baseURl}invoice/transactions/${effectiveCustomerId}?${qp.toString()}`,
          accessToken,
        );
      } else {
        // Fallback: original invoices list
        const query = new URLSearchParams({ orderBy: 'createdAt', order: sortOrder || 'desc' });
        res = await getRequestWithOutBody(`${baseURl}invoice?${query.toString()}`, accessToken);
      }
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];

      setInvoices(list);

      if (effectiveCustomerId) {
        const pagination = res?.pagination || res?.data?.pagination;
        const tc =
          Number(pagination?.total) ||
          Number(pagination?.totalRecords) ||
          Number(res?.totalRecords) ||
          Number(res?.data?.totalRecords);
        setTotalCount(Number.isFinite(tc) && tc > 0 ? tc : 0);
      } else {
        setTotalCount(undefined);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const openInvoicePaymentView = async (row) => {
    try {
      const inv = row?.original || (invoices || []).find((i) => String(i?.id) === String(row?.id)) || row;
      const typeText = String(inv?.type || row?.type || '').toLowerCase();
      const sourceText = String(inv?.sourceType || row?.sourceType || '').toLowerCase();
      const resolvedPaymentId =
        inv?.paymentId ||
        inv?.invoicePaymentId ||
        inv?.receiptId ||
        inv?.sourceId ||
        row?.paymentId ||
        row?.invoicePaymentId ||
        row?.sourceId ||
        inv?.id ||
        row?.id;
      if (!resolvedPaymentId) return;
      setViewLoading(true);
      setViewPaymentOpen(true);

      const tryGet = async (url) => {
        const res = await getRequestWithOutBody(url, accessToken);
        return res?.data ?? res;
      };

      const idEnc = encodeURIComponent(resolvedPaymentId);
      const candidates = [];

      // Per requirement:
      // - purchase-order/transactions => payment view for purchase-side transactions
      // - invoicer/transaction => payment view for sales-side/invoice transactions
      const isPurchaseSide = sourceText.includes('purchase') || sourceText.includes('po') || typeText.includes('purchase') || typeText.includes('bill');
      if (isPurchaseSide) {
        candidates.push({ label: 'Purchase Transaction', url: `${baseURl}purchase-order/transactions/${idEnc}` });
        candidates.push({ label: 'Purchase Transaction', url: `${baseURl}purchase-order/transactions/${idEnc}/` });
      }

      candidates.push({ label: 'Invoice Transaction', url: `${baseURl}invoicer/transaction/${idEnc}` });
      candidates.push({ label: 'Invoice Payment', url: `${baseURl}invoice-payment/${idEnc}` });

      let lastErr = null;
      for (const c of candidates) {
        try {
          const detail = await tryGet(c.url);
          setPaymentDetail({ source: c.label, data: detail });
          return;
        } catch (e) {
          lastErr = e;
        }
      }

      throw lastErr || new Error('Failed to load payment');
    } catch (e) {
      setPaymentDetail({ error: e?.message || 'Failed to load payment' });
    } finally {
      setViewLoading(false);
    }
  };

  const openInvoiceForEdit = async (row) => {
    try {
      const inv = row?.original || (invoices || []).find((i) => String(i?.id) === String(row?.id)) || row;
      const rawInvoiceId = inv?.id || row?.id;
      if (!rawInvoiceId) return;

      const normalizeInvoiceId = (value) => {
        if (value === null || value === undefined) return null;
        const str = String(value);
        // backend expects numeric id; sometimes we receive invoice_209
        const match = str.match(/(\d+)/);
        return match ? match[1] : str;
      };

      const invoiceId = normalizeInvoiceId(rawInvoiceId);
      if (!invoiceId) return;

      // If this row already contains the full invoice object, navigate directly
      const hasLineItems = Array.isArray(inv?.items) || Array.isArray(inv?.invoiceItems) || Array.isArray(inv?.lineItems);
      const hasMerchant = Boolean(inv?.merchant?.id || inv?.merchantId);
      if (hasLineItems && hasMerchant) {
        navigate('/home/editInvoice', { state: { invoiceData: inv } });
        return;
      }

      setLoading(true);
      const res = await getRequestWithOutBody(`${baseURl}invoice/${invoiceId}`, accessToken);
      const fullInvoice = res?.data || res;
      navigate('/home/editInvoice', { state: { invoiceData: fullInvoice } });
    } catch (e) {
      // Fallback: navigate with whatever we have
      const payload = row?.original || (invoices || []).find((i) => String(i?.id) === String(row?.id)) || row;
      navigate('/home/editInvoice', { state: { invoiceData: payload } });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFilterModal = () => {
    // Sync draft values with current filters
    setDraftSelectedType(selectedType);
    setDraftVisibleColumnIds(visibleColumnIds);
    setDraftPreset('');
    setDraftStartDate(startDate || '');
    setDraftEndDate(endDate || '');
    setFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    // Apply draft values to actual filters
    setSelectedType(draftSelectedType);
    setVisibleColumnIds(draftVisibleColumnIds);
    setStartDate(draftStartDate || '');
    setEndDate(draftEndDate || '');
    setPage(1); // Reset to first page
    setFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setDraftSelectedType('');
    setDraftVisibleColumnIds(defaultVisibleColumnIds);
    setDraftPreset('');
    setDraftStartDate('');
    setDraftEndDate('');
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchInvoices();
  }, [accessToken, effectiveCustomerId, page, rowsPerPage, selectedType, startDate, endDate, sortOrder]);

  useEffect(() => {
    // Reset pagination when switching customer context
    setPage(1);
  }, [effectiveCustomerId]);

  // Load purchase order stats for summary cards
  useEffect(() => {
    const loadStats = async () => {
      try {
        setPoStatsLoading(true);
        if (!effectiveCustomerId) {
          setPoStats(null);
          return;
        }
        const res = await getRequestWithOutBody(`${baseURl}invoice/stats/?merchantId=${effectiveCustomerId}`, accessToken);
        const stats = res?.data ?? res;
        setPoStats(stats || null);
      } catch (e) {
        setPoStats(null);
      } finally {
        setPoStatsLoading(false);
      }
    };
    loadStats();
  }, [accessToken, effectiveCustomerId]);

  // Fetch the selected customer detail to display header info and map merchantIds→invoices
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!effectiveCustomerId) return;
      try {
        setLoadingCustomer(true);
        const res = await getRequestWithOutBody(`${baseURl}customer/${effectiveCustomerId}`, accessToken);
        setCustomerDetail(res?.data || null);
      } catch (e) {
      } finally {
        setLoadingCustomer(false);
      }
    };
    fetchCustomer();
  }, [effectiveCustomerId, accessToken]);

  // Close dropdown on outside click
  useEffectReact(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const filteredByCustomer = useMemo(() => {
    if (!effectiveCustomerId) return invoices;
    const idsFromCustomer = Array.isArray(customerDetail?.merchantIds)
      ? customerDetail.merchantIds
          .map(m => parseInt(m?.merchantId, 10))
          .filter(n => !Number.isNaN(n))
      : [];
    return invoices.filter(inv => {
      const invMerchantId = parseInt(inv?.merchantId, 10);
      if (!Number.isNaN(invMerchantId) && idsFromCustomer.length > 0) {
        return idsFromCustomer.includes(invMerchantId);
      }
      // Fallbacks if mapping not available
      const byId = String(inv?.merchantId || '') === String(effectiveCustomerId) || String(inv?.merchant?.id || '') === String(effectiveCustomerId);
      if (byId) return true;
      const cname = (customerDetail?.dbaName || customerDetail?.legalBusinessName || '').toLowerCase();
      const mname = (inv?.merchant?.dbaName || inv?.merchant?.legalBusinessName || '').toLowerCase();
      return cname && mname && cname === mname;
    });
  }, [invoices, effectiveCustomerId, customerDetail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = (filteredByCustomer && filteredByCustomer.length > 0) ? filteredByCustomer : invoices;
    if (!q) return base;
    return base.filter((inv) => {
      const haystack = [
        inv?.id,
        inv?.invoiceNo,
        inv?.status,
        inv?.merchant?.dbaName,
        (inv?.billingAddress || '').split('\n')[0],
        inv?.agent?.name,
        inv?.billingAddress,
        inv?.shippingAddress,
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((v) => String(v).toLowerCase());
      return haystack.some((v) => v.includes(q));
    });
  }, [filteredByCustomer, invoices, search]);

  const formatDate = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString();
  };

  const openBalance = useMemo(() => {
    return filtered.reduce((sum, inv) => {
      const isUnpaid = (inv?.status || '').toLowerCase() !== 'paid';
      return isUnpaid ? sum + Number(inv?.totalAmount || 0) : sum;
    }, 0);
  }, [filtered]);

  const overdueAmount = useMemo(() => {
    const now = new Date();
    return filtered.reduce((sum, inv) => {
      const isUnpaid = (inv?.status || '').toLowerCase() !== 'paid';
      const due = inv?.dueDate ? new Date(inv.dueDate) : null;
      const isOverdue = isUnpaid && due && due < now;
      return isOverdue ? sum + Number(inv?.totalAmount || 0) : sum;
    }, 0);
  }, [filtered]);

  const allColumns = useMemo(
    () => [
      { id: "date", label: "DATE", align: "left" },
      // { id: "invoiceDate", label: "INVOICE DATE", align: "left" },
      { id: "type", label: "TYPE", align: "left" },
      { id: "no", label: "NO", align: "left" },
      { id: "reference", label: "REFERENCE", align: "left" },
      { id: "customer", label: "CUSTOMER", align: "left" },
      { id: "customerEmail", label: "CUSTOMER EMAIL", align: "left" },
      { id: "customerPhone", label: "CUSTOMER PHONE", align: "left" },
      { id: "customerStatus", label: "CUSTOMER STATUS", align: "left" },
      { id: "legalBusinessName", label: "LEGAL BUSINESS NAME", align: "left" },
      { id: "dbaName", label: "DBA NAME", align: "left" },
      { id: "state", label: "STATE", align: "left" },
      { id: "businessCity", label: "BUSINESS CITY", align: "left" },
      { id: "businessState", label: "BUSINESS STATE", align: "left" },
      { id: "businessZipCode", label: "BUSINESS ZIP", align: "left" },
      { id: "legalCity", label: "LEGAL CITY", align: "left" },
      { id: "legalZipCode", label: "LEGAL ZIP", align: "left" },
      { id: "website", label: "WEBSITE", align: "left" },
      { id: "category", label: "CATEGORY", align: "left" },
      { id: "description", label: "DESCRIPTION", align: "left" },
      { id: "dueDate", label: "DUE DATE", align: "left" },
      { id: "entryType", label: "ENTRY TYPE", align: "left" },
      { id: "amountBeforeTax", label: "AMOUNT BEFORE TAX", align: "right" },
      { id: "taxAmount", label: "TAX AMOUNT", align: "right" },
      { id: "totalAmount", label: "TOTAL AMOUNT", align: "right" },
      { id: "paidAmount", label: "PAID AMOUNT", align: "right" },
      { id: "balanceDue", label: "BALANCE DUE", align: "right" },
      { id: "amount", label: "AMOUNT", align: "right" },
      { id: "status", label: "STATUS", align: "center" },
      { id: "paymentId", label: "PAYMENT ID", align: "left" },
      { id: "sourceType", label: "SOURCE TYPE", align: "left" },
      { id: "journalId", label: "JOURNAL ID", align: "left" },
      { id: "action", label: "ACTION", align: "right" },
    ],
    []
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
    const colsParam = initialQueryParams.get('cols');
    if (!colsParam) return defaultVisibleColumnIds;

    const cols = colsParam
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return cols.length > 0 ? cols : defaultVisibleColumnIds;
  });

  useEffect(() => {
    const next = new URLSearchParams(location.search);

    if (search) next.set('search', search);
    else next.delete('search');

    if (selectedType) next.set('type', selectedType);
    else next.delete('type');

    if (startDate) next.set('startDate', startDate);
    else next.delete('startDate');

    if (endDate) next.set('endDate', endDate);
    else next.delete('endDate');

    if (sortOrder && sortOrder !== 'desc') next.set('order', sortOrder);
    else next.delete('order');

    if (page > 1) next.set('page', String(page));
    else next.delete('page');

    if (rowsPerPage !== 10) next.set('limit', String(rowsPerPage));
    else next.delete('limit');

    if (Array.isArray(visibleColumnIds) && visibleColumnIds.length > 0) {
      next.set('cols', visibleColumnIds.join(','));
    } else {
      next.delete('cols');
    }

    if (effectiveCustomerId) next.set('customerId', String(effectiveCustomerId));
    else next.delete('customerId');

    if (next.toString() !== location.search.replace(/^\?/, '')) {
      setSearchParams(next, { replace: true });
    }
  }, [location.search, page, rowsPerPage, search, selectedType, startDate, endDate, sortOrder, visibleColumnIds, effectiveCustomerId, setSearchParams]);

  const columns = useMemo(
    () => allColumns.filter((c) => visibleColumnIds.includes(c.id)),
    [allColumns, visibleColumnIds]
  );

  const data = (filtered || []).map((inv) => ({
    id: inv?.id,
    date: formatDate(inv?.issueDate || inv?.date || inv?.createdAt || inv?.dueDate),
    // invoiceDate: formatDate(inv?.invoiceDate),
    type: (() => {
      const st = String(inv?.sourceType || '').toLowerCase();
      const t = inv?.type;
      if (t) return t;
      if (st.includes('journal')) return 'Journal Entry';
      if (st.includes('invoice')) return 'Invoice';
      return 'Invoice';
    })(),
    no: inv?.invoiceNo || inv?.reference || inv?.id || "-",
    reference: inv?.reference || inv?.invoiceNo || inv?.id || "-",
    customer:
      inv?.customer ||
      inv?.merchant?.dbaName ||
      inv?.merchant?.legalBusinessName ||
      ((inv?.billingAddress || '').split('\n')[0] || "-"),
    customerEmail: customerDetail?.email || customerDetail?.ownerEmail || inv?.merchant?.email || '-',
    customerPhone: customerDetail?.phoneNumber || customerDetail?.dbaPhoneNumber || customerDetail?.ownerPhoneNumber || inv?.merchant?.phone || '-',
    customerStatus: customerDetail?.status || '-',
    legalBusinessName: customerDetail?.legalBusinessName || inv?.merchant?.legalBusinessName || '-',
    dbaName: customerDetail?.dbaName || inv?.merchant?.dbaName || '-',
    state: customerDetail?.state || '-',
    businessCity: customerDetail?.businessCity || '-',
    businessState: customerDetail?.businessState || '-',
    businessZipCode: customerDetail?.businessZipCode || '-',
    legalCity: customerDetail?.legalCity || '-',
    legalZipCode: customerDetail?.legalZipCode || '-',
    website: customerDetail?.website || '-',
    category: inv?.category || '-',
    description: inv?.description || '-',
    dueDate: formatDate(inv?.dueDate),
    entryType: inv?.entryType || '-',
    amountBeforeTax: formatMoney(inv?.amountBeforeTax),
    taxAmount: formatMoney(inv?.taxAmount),
    totalAmount: formatMoney(inv?.totalAmount),
    paidAmount: formatMoney(inv?.paidAmount),
    balanceDue: formatMoney(inv?.balanceDue),
    amount: formatMoney(inv?.totalAmount),
    status: (() => {
      // Prefer explicit invoice status coming from API; support common alternate keys
      const raw = inv?.status || inv?.paymentStatus || inv?.invoiceStatus || inv?.state || inv?.payment_state;
      if (!raw) return '-';
      const norm = String(raw).replace(/_/g, ' ').trim().toLowerCase();
      // Title-case for display
      return norm.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    })(),
    action: inv?.action || 'View',
    sourceType: inv?.sourceType,
    journalId: inv?.journalId,
    paymentId:
      inv?.paymentId ||
      inv?.invoicePaymentId ||
      inv?.receiptId ||
      inv?.sourceId ||
      null,
    original: inv,
  }));

  const buildInvoicesPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const colDefs = (columns || []).filter((c) => c?.id !== 'action');
    const orientation = colDefs.length > 6 ? 'landscape' : 'portrait';
    const format = colDefs.length > 18 ? 'a2' : colDefs.length > 10 ? 'a3' : 'a4';
    const doc = new jsPDF({ orientation, unit: 'pt', format });

    const marginX = 32;
    const marginTop = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginX * 2;

    const title = isTransactionsView ? 'Customer Transactions' : 'Invoices';
    const customerName = customerTitle ? String(customerTitle) : '';
    const range = `${startDate || ''}${endDate ? ` to ${endDate}` : ''}`.trim();

    const drawMetaHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(title, marginX, marginTop);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let metaY = marginTop + 18;
      if (customerName) {
        doc.text(`Customer: ${customerName}`, marginX, metaY);
        metaY += 14;
      }
      if (range) {
        doc.text(`Date Range: ${range}`, marginX, metaY);
        metaY += 14;
      }
      if (selectedType) {
        doc.text(`Type: ${selectedType}`, marginX, metaY);
        metaY += 14;
      }
      return metaY;
    };

    const headerBg = [241, 245, 249];
    const border = [203, 213, 225];

    const metaY = drawMetaHeader();

    const colCount = Math.max(colDefs.length, 1);
    const paddingX = 3;
    const paddingY = 3;
    const minRowHeight = 18;

    const calcFontSize = () => {
      // Start bigger; shrink until columns become reasonably readable.
      let fs = orientation === 'landscape' ? 10 : 11;
      const minFs = 6;
      const desiredMinColWidth = orientation === 'landscape' ? 60 : 70;
      while (fs > minFs) {
        const colWidth = contentWidth / colCount;
        if (colWidth >= desiredMinColWidth) break;
        fs -= 1;
      }

      // Extra shrink for very wide tables.
      if (colCount > 14) fs = Math.min(fs, 8);
      if (colCount > 18) fs = Math.min(fs, 7);
      return Math.max(fs, minFs);
    };

    const fontSize = calcFontSize();
    doc.setFontSize(fontSize);

    const colWidth = contentWidth / colCount;
    let y = metaY + 14;

    const drawRow = ({ values, isHeader }) => {
      const lineHeights = values.map((v) => {
        const text = String(v ?? '');
        const wrapped = doc.splitTextToSize(text, colWidth - paddingX * 2);
        return Math.max(wrapped.length * (fontSize + 2) + paddingY * 2, minRowHeight);
      });
      const rowHeight = Math.max(...lineHeights, minRowHeight);

      if (y + rowHeight > pageHeight - 32) {
        doc.addPage();
        const nextMetaY = drawMetaHeader();
        y = nextMetaY + 14;
        drawRow({ values: colDefs.map((c) => c.label || c.id), isHeader: true });
      }

      if (isHeader) {
        doc.setFillColor(...headerBg);
        doc.rect(marginX, y, contentWidth, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      doc.setDrawColor(...border);
      doc.rect(marginX, y, contentWidth, rowHeight);

      let x = marginX;
      values.forEach((v) => {
        doc.rect(x, y, colWidth, rowHeight);
        const text = String(v ?? '');
        const wrapped = doc.splitTextToSize(text, colWidth - paddingX * 2);
        doc.text(wrapped, x + paddingX, y + paddingY + fontSize);
        x += colWidth;
      });

      y += rowHeight;
    };

    drawRow({ values: colDefs.map((c) => c.label || c.id), isHeader: true });

    const rowsForPdf = (data || []).map((row) => colDefs.map((c) => row?.[c.id] ?? ''));
    rowsForPdf.forEach((values) => drawRow({ values, isHeader: false }));

    const safeCustomer = customerName ? customerName.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') : 'customer';
    const fileName = `${isTransactionsView ? 'transactions' : 'invoices'}-${safeCustomer}.pdf`;
    return { doc, fileName };
  };

  const printPdfUrl = (url) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(`<!doctype html><html><head><title>Print</title></head><body style="margin:0"><iframe src="${url}" style="border:0; width:100%; height:100vh" onload="this.contentWindow.focus(); this.contentWindow.print();"></iframe></body></html>`);
    win.document.close();
  };

  const handleExportPdf = async ({ print = false } = {}) => {
    try {
      const { doc, fileName } = await buildInvoicesPdf();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (exportPdfUrl) URL.revokeObjectURL(exportPdfUrl);
      setExportPdfUrl(url);

      if (print) {
        printPdfUrl(url);
        return;
      }

      doc.save(fileName);
    } catch (e) {
      toast.error(e?.message || 'Failed to export PDF');
    }
  };

  const customerTitle = (
    customerDetail?.dbaName ||
    customerDetail?.legalBusinessName ||
    filtered[0]?.merchant?.dbaName ||
    filtered[0]?.merchant?.legalBusinessName ||
    'Invoices'
  );

  // Compose header fields with robust fallbacks
  const firstInvoice = filteredByCustomer[0] || invoices[0] || {};
  const headerEmail = customerDetail?.email || customerDetail?.ownerEmail || firstInvoice?.merchant?.email || '-';
  const headerPhone =
    customerDetail?.phoneNumber ||
    customerDetail?.dbaPhoneNumber ||
    customerDetail?.ownerPhoneNumber ||
    firstInvoice?.merchant?.phone ||
    '-';
  const addressFromParts = (addr, city, state, zip) => {
    const parts = [addr, city && `${city},`, state, zip].filter(Boolean);
    return parts.length ? parts.join(' ') : null;
  };
  const customerBilling = addressFromParts(customerDetail?.legalAddress, customerDetail?.legalCity, customerDetail?.state, customerDetail?.legalZipCode);
  const customerShipping = addressFromParts(customerDetail?.dbaAddress, customerDetail?.businessCity, customerDetail?.businessState, customerDetail?.businessZipCode);
  const billingAddressVal = firstInvoice?.billingAddress || customerBilling || '-';
  const shippingAddressVal = firstInvoice?.shippingAddress || customerShipping || '-';
  const headerNotes = customerDetail?.comment || customerDetail?.notes || firstInvoice?.merchant?.notes || '-';

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "#F8FAFC", padding: 20, position: 'relative' }}>
      {(loading || loadingCustomer) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Loader message="Loading..." subMessage="Please wait" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              background: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <Heading Fontweight={800} color={'var(--sidebar-text-primary)'} Heading={customerTitle} Fontsize={28} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            // type="button"
            variant="contained"
            // className="px-3 py-2 rounded-lg"
            // style={{ background: '#111827', color: '#fff' }}
            onClick={() => {
              if (customerDetail) {
            navigate('/home/editCustomer', { state: { itemData: customerDetail } });
                return;
              }
            navigate('/home/editCustomer', { state: { itemData: customerDetail } });
            }}
          >
            Edit Customer
          </Button>

          <div className="relative" style={{ position: 'relative' }} ref={menuRef}>
            <button
              className="px-3 py-2 rounded-lg text-white"
              style={{ background: '#0C79F7', minWidth: 150, textAlign: 'left' }}
              onClick={() => setMenuOpen((v) => !v)}
            >
              New Transaction ▾
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 8,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                  minWidth: 180,
                  zIndex: 50,
                  overflow: 'hidden'
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 14, color: '#111827', cursor: 'pointer' }}
                  onClick={() => {
                    setMenuOpen(false);
                    const target = `/home/createInvoice${incomingCustomerId ? `?customerId=${encodeURIComponent(incomingCustomerId)}` : ''}`;
                    navigate(target, { state: incomingCustomerId ? { customerId: incomingCustomerId } : undefined });
                  }}
                >
                  Create Bill
                </button>
                <button
                  type="button"
                  role="menuitem"
                  style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 14, color: '#111827', cursor: 'pointer' }}
                  onClick={() => {
                    setMenuOpen(false);
                    const id = effectiveCustomerId || incomingCustomerId || incomingAgentId;
                    if (!id) return;
                    navigate(`/home/invoice-receive-payment/${encodeURIComponent(id)}`);
                  }}
                >
                  Mark Payment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 10 }} />
      <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 6, marginBottom: 12 }} />

      {/* Info Row (no cards, inline icons) */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontWeight: 800, fontSize: 13 }}>
            <span style={{ display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z" fill="none"/><path d="M22 6l-10 7L2 6"/></svg>
            </span>
            Email
          </div>
          <div style={{ marginTop: 4, color: '#111827', fontWeight: 600 }}>{headerEmail}</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontWeight: 800, fontSize: 13 }}>
            <span style={{ display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 5.18 2 2 0 0 1 4.06 3h3a2 2 0 0 1 2 1.72c.12.86.37 1.69.72 2.47a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.61-1.22a2 2 0 0 1 2.11-.45c.78.35 1.61.6 2.47.72A2 2 0 0 1 22 16.92z"/></svg>
            </span>
            Phone
          </div>
          <div style={{ marginTop: 4, color: '#111827', fontWeight: 600 }}>{headerPhone}</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontWeight: 800, fontSize: 13 }}>
            <span style={{ display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4h16v13H4z"/></svg>
            </span>
            Billing Address
          </div>
          <div style={{ marginTop: 4, color: '#111827', whiteSpace: 'pre-line' }}>{billingAddressVal}</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontWeight: 800, fontSize: 13 }}>
            <span style={{ display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            Shipping Address
          </div>
          <div style={{ marginTop: 4, color: '#111827', whiteSpace: 'pre-line' }}>{shippingAddressVal}</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontWeight: 800, fontSize: 13 }}>
            <span style={{ display: 'inline-flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z"/></svg>
            </span>
            Notes
          </div>
          <div style={{ marginTop: 4, color: '#111827' }}>{headerNotes}</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 flex-wrap" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 12 }}>
        {poStatsLoading ? (
          <>
            <TaxDashboardBox title="Open Balance" amount="$0.00" subtitle="Open Balance" />
            <TaxDashboardBox title="Overdue Payment" amount="$0.00" subtitle="Overdue Payment" />
          </>
        ) : (
          <>
            {[
              { title: 'Open Balance', amount: formatMoney(poStats?.openBalance), subtitle: 'Open Balance' },
              { title: 'Overdue Payment', amount: formatMoney(poStats?.overduePayment), subtitle: 'Overdue Payment' },
            ].map((c) => (
              <TaxDashboardBox key={c.title} title={c.title} amount={c.amount} subtitle={c.subtitle} />
            ))}
          </>
        )}
      </div>

      <div style={{ marginTop: 6, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--chrome-filter-bar-bg)', borderRadius: 12, padding: '10px 12px', minWidth: 340, display: 'flex', gap: 8, alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--chrome-search-icon)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
            <input
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ outline: 'none', background: 'transparent', width: '100%', fontSize: 14, border: 'none', color: 'var(--dashboard-text-primary)' }}
            />
          </div>

          {selectedType ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Type: {selectedType}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleOpenFilterModal}
            sx={toolbarButtonSx}
            startIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/></svg>
            }
          >
            Filters
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setSortAnchorEl(e.currentTarget)}
            sx={toolbarButtonSx}
            startIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 11h10"/><path d="M11 7h7"/><path d="M11 15h10"/><path d="M3 17V7"/><path d="M7 13l-4 4"/><path d="M7 11L3 7"/></svg>
            }
          >
            {sortOrder === 'asc' ? 'Sort By: Oldest' : 'Sort By: Newest'}
          </Button>

          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={() => setSortAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { borderRadius: 2 } }}
          >
            <MenuItem
              onClick={() => {
                setSortOrder('desc');
                setPage(1);
                setSortAnchorEl(null);
              }}
            >
              Sort By: Newest
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSortOrder('asc');
                setPage(1);
                setSortAnchorEl(null);
              }}
            >
              Sort By: Oldest
            </MenuItem>
          </Menu>

          <Button
            variant="outlined"
            size="small"
            sx={toolbarButtonSx}
            startIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            }
            onClick={() => handleExportPdf({ print: false })}
          >
            Export
          </Button>

          <Button
            variant="outlined"
            size="small"
            sx={toolbarButtonSx}
            startIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            }
            onClick={() => {
              if (exportPdfUrl) {
                printPdfUrl(exportPdfUrl);
              } else {
                handleExportPdf({ print: true });
              }
            }}
          >
            Print
          </Button>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              multiple
              displayEmpty
              value={visibleColumnIds}
              onChange={(e) => {
                const next = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                setVisibleColumnIds(next);
              }}
              input={<OutlinedInput />}
              renderValue={() => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>Columns</span>
                </span>
              )}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 360,
                  },
                },
              }}
              sx={{
                background: '#fff',
                borderRadius: '10px',
                '& fieldset': { borderColor: '#E5E7EB' },
                fontWeight: 600,
                minHeight: 36,
                '& .MuiSelect-select': {
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                  paddingTop: 0,
                  paddingBottom: 0,
                },
              }}
            >
              {allColumns.map((col) => (
                <MenuItem key={col.id} value={col.id}>
                  <Checkbox checked={visibleColumnIds.indexOf(col.id) > -1} />
                  <ListItemText primary={col.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 12, background: 'var(--dashboard-card-bg)', border: '1px solid var(--dashboard-box-border)', overflow: 'hidden', marginTop: 12 }}>
        <div style={{ padding: 12 }}>
          {loading ? (
            <div className="text-center w-full mx-auto">
              <Loader message="Loading..." subMessage="Please wait" />
            </div>
          ) : (
            <>
              {columns.length === 0 ? (
                <div
                  style={{
                    borderRadius: 12,
                    background: 'var(--dashboard-card-bg)',
                    border: '1px solid var(--dashboard-box-border)',
                    padding: 24,
                    textAlign: 'center',
                    color: '#6B7280',
                    fontWeight: 600,
                  }}
                >
                  Please select column
                </div>
              ) : (data?.length || 0) === 0 ? (
                <NoDataFound
                  title="No Data Found"
                  description={isTransactionsView ? "No transactions found." : "No invoices found."}
                />
              ) : (
                <MemoTable
                  data={data}
                  columns={columns}
                  accountingTable
                  page={isTransactionsView ? page : undefined}
                  rowsPerPage={isTransactionsView ? rowsPerPage : undefined}
                  totalCount={isTransactionsView ? totalCount : undefined}
                  onPageChange={isTransactionsView ? (newPage) => setPage(newPage) : undefined}
                  onRowsPerPageChange={
                    isTransactionsView
                      ? (newRows) => {
                          setRowsPerPage(newRows);
                          setPage(1);
                        }
                      : undefined
                  }
                  onRowClick={() => {}}
                  actionOptions={(row) => {
                    const st = String(row?.sourceType || row?.original?.sourceType || '').toLowerCase();
                    const typeText = String(row?.type || row?.original?.type || '').toLowerCase();
                    const isPayment = typeText.includes('invoice payment') || st.includes('payment');
                    const isJournal = st.includes('journal') || typeText.includes('journal');
                    if (isPayment) return [{ key: 'view_payment', label: 'View' }];
                    if (isJournal) return [{ key: 'view_journal', label: 'View' }];
                    return [
                      { key: 'view_edit', label: 'View/Edit' },
                      { key: 'receive_payment', label: 'Receive payment' },
                    ];
                  }}
                  onActionOptionClick={(row, opt) => {
                    const key = opt?.key || opt?.value || opt;
                    if (key === 'view_journal') {
                      const inv = row?.original || (invoices || []).find((i) => String(i?.id) === String(row?.id)) || row;
                      const jid = inv?.journalId || row?.journalId;
                      if (!jid) return;
                      navigate(`/home/editJournalEntry/${encodeURIComponent(jid)}`);
                      return;
                    }
                    if (key === 'view_payment') {
                      openInvoicePaymentView(row);
                      return;
                    }
                    if (key === 'receive_payment') {
                      const inv = row?.original || (invoices || []).find((i) => String(i?.id) === String(row?.id)) || row;
                      const merchantId = inv?.merchantId || inv?.merchant?.id || effectiveCustomerId;
                      if (!merchantId) return;
                      navigate(`/home/invoice-receive-payment/${encodeURIComponent(merchantId)}`);
                      return;
                    }
                    openInvoiceForEdit(row);
                  }}
                  statusPills
                />
              )}
            </>
          )}
        </div>
      </div>
      <Dialog open={viewPaymentOpen} onClose={() => setViewPaymentOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {paymentDetail?.source || 'Payment View'}
        </DialogTitle>
        <DialogContent dividers>
          {viewLoading ? (
            <div className="text-center w-full mx-auto">
              <Loader message="Loading..." subMessage="Please wait" />
            </div>
          ) : (
            (() => {
              const raw = paymentDetail?.data ?? paymentDetail;
              const detail = raw?.data ?? raw;
              const errMsg = detail?.error || raw?.error;
              if (errMsg) {
                return (
                  <div style={{ color: '#DC2626', fontWeight: 700 }}>{String(errMsg)}</div>
                );
              }

              const paymentSources = Array.isArray(detail?.paymentSources) ? detail.paymentSources : [];
              const allocations = Array.isArray(detail?.allocations) ? detail.allocations : [];
              const customerName = [detail?.customer?.legalBusinessName, detail?.customer?.firstName, detail?.customer?.lastName]
                .filter(Boolean)
                .join(' ');

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>Payment Number</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{detail?.paymentNumber || detail?.referenceNo || '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>Payment Date</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{formatDate(detail?.paymentDate || detail?.postedAt || detail?.createdAt)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>Method</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{detail?.paymentMethod || '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>Status</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{detail?.status || '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>Total Amount</div>
                      <div style={{ fontWeight: 800, color: '#111827' }}>{formatMoney(detail?.totalAmount)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>Customer</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{customerName || '-'}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>Notes</div>
                      <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'pre-wrap' }}>{detail?.notes || '-'}</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #E5E7EB' }} />

                  <div>
                    <div style={{ fontWeight: 900, color: '#111827', marginBottom: 8 }}>Payment Sources</div>
                    {paymentSources.length === 0 ? (
                      <div style={{ color: '#6B7280', fontSize: 13 }}>No payment sources</div>
                    ) : (
                      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 120px 120px', background: '#F8FAFC', padding: '10px 12px', fontWeight: 900, fontSize: 12, color: '#334155' }}>
                          <div>Amount</div>
                          <div>Account</div>
                          <div>Type</div>
                          <div style={{ textAlign: 'right' }}>Journal</div>
                        </div>
                        {paymentSources.map((ps, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 120px 120px', padding: '10px 12px', borderTop: '1px solid #E5E7EB', fontSize: 13, color: '#111827' }}>
                            <div>{formatMoney(ps?.amount)}</div>
                            <div style={{ fontWeight: 700 }}>
                              {(ps?.paymentAccountCode ? `${ps.paymentAccountCode} - ` : '') + (ps?.paymentAccountName || '-')}
                            </div>
                            <div>{ps?.paymentAccountType || '-'}</div>
                            <div style={{ textAlign: 'right' }}>{ps?.journalEntryId ?? '-'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, color: '#111827', marginBottom: 8 }}>Allocations</div>
                    {allocations.length === 0 ? (
                      <div style={{ color: '#6B7280', fontSize: 13 }}>No allocations</div>
                    ) : (
                      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 110px 110px 110px 1fr', background: '#F8FAFC', padding: '10px 12px', fontWeight: 900, fontSize: 12, color: '#334155' }}>
                          <div>Invoice</div>
                          <div>Allocated</div>
                          <div>Discount</div>
                          <div>Write Off</div>
                          <div>Status</div>
                        </div>
                        {allocations.map((al, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 110px 110px 110px 1fr', padding: '10px 12px', borderTop: '1px solid #E5E7EB', fontSize: 13, color: '#111827' }}>
                            <div style={{ fontWeight: 800 }}>{al?.invoice?.invoiceNo || al?.invoiceId || '-'}</div>
                            <div>{formatMoney(al?.allocatedAmount)}</div>
                            <div>{formatMoney(al?.discountAmount)}</div>
                            <div>{formatMoney(al?.writeOffAmount)}</div>
                            <div>{al?.invoice?.status || '-'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#111827' }}>Raw Response</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 8 }}>
{JSON.stringify(detail, null, 2)}
                    </pre>
                  </details>
                </div>
              );
            })()
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button onClick={() => setViewPaymentOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <Dialog
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 520 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--dashboard-text-primary)' }}>
          Filters
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Type</div>
              <FormControl size="small" fullWidth>
                <Select
                  displayEmpty
                  value={draftSelectedType}
                  onChange={(e) => setDraftSelectedType(e.target.value)}
                  renderValue={(v) => (v ? v : '--select type--')}
                >
                  <MenuItem value="">--select type--</MenuItem>
                  <MenuItem value="Journal Entry">Journal Entry</MenuItem>
                  <MenuItem value="Invoice">Invoice</MenuItem>
                  <MenuItem value="Invoice Payment">Invoice Payment</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Date</div>
              <FormControl size="small" fullWidth>
                <Select
                  displayEmpty
                  value={draftPreset}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDraftPreset(next);
                    const rangeResolved = resolvePresetRange(next);
                    if (rangeResolved) {
                      setDraftStartDate(rangeResolved.startDate);
                      setDraftEndDate(rangeResolved.endDate);
                    }
                  }}
                  renderValue={(v) => {
                    if (!v) return '--select date--';
                    if (v === 'week') return 'This Week';
                    if (v === 'this-month') return 'This Month';
                    if (v === 'last-month') return 'Last Month';
                    if (v === 'this-year') return 'This Year';
                    return v;
                  }}
                >
                  <MenuItem value="">--select date--</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="this-month">This Month</MenuItem>
                  <MenuItem value="last-month">Last Month</MenuItem>
                  <MenuItem value="this-year">This Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>From Date</div>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="MM/DD/YYYY"
                  value={draftStartDate ? dayjs(draftStartDate) : null}
                  onChange={(value) => {
                    setDraftStartDate(value ? dayjs(value).format('YYYY-MM-DD') : '');
                    setDraftPreset('');
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      InputLabelProps: { shrink: true },
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>To Date</div>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  format="MM/DD/YYYY"
                  value={draftEndDate ? dayjs(draftEndDate) : null}
                  onChange={(value) => {
                    setDraftEndDate(value ? dayjs(value).format('YYYY-MM-DD') : '');
                    setDraftPreset('');
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      InputLabelProps: { shrink: true },
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ padding: 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              handleClearFilters();
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyFilters}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
