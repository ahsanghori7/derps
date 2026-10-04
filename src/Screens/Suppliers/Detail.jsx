import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, FormControl, IconButton, ListItemText, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Select, MenuItem, Backdrop, CircularProgress, OutlinedInput, Menu } from "@mui/material";
import { IoIosArrowBack } from "react-icons/io";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Heading from "../../Components/Heading";
import AmountCard from "../../Components/AmountCard";
import MemoTable from "../../Components/MemoTable";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import BillPaymentModal from "./BillPaymentModal";
import Spinner from "../../Components/Spinner";
import { useSelector } from "react-redux";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
export default function SupplierDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const vendor = location.state?.vendor;
  
  // Parse path segments for filters
  const pathSegments = location.pathname.replace(`/home/supplier/${id}`, '').split('/').filter(Boolean);
  const knownColumnIds = ["date", "poDate", "type", "no", "payee", "dueDate", "status", "pretax", "salesTax", "balanceDue", "paidAmount", "total", "category", "description", "entryType", "paymentId", "action"];
  const isColsSegment = (seg) => seg.includes(',') || knownColumnIds.some(id => seg.split(',').includes(id));
  
  let tabParam = '', searchParam = '', typeParam = '', startDateParam = '', endDateParam = '', orderParam = '', pageParam = '', limitParam = '', colsParam = '';
  
  for (const seg of pathSegments) {
    if (isColsSegment(seg)) colsParam = seg;
    else if (seg === 'asc' || seg === 'desc') orderParam = seg;
    else if (seg.match(/^\d{4}-\d{2}-\d{2}$/)) {
      if (!startDateParam) startDateParam = seg;
      else endDateParam = seg;
    } else if (seg.match(/^\d+$/)) {
      if (!tabParam) tabParam = seg;
      else if (!pageParam) pageParam = seg;
      else if (!limitParam) limitParam = seg;
    } else {
      // Could be search or type
      if (!searchParam && !['Journal Entry', 'Purchase Order', 'PO Payment'].includes(seg)) searchParam = seg;
      else if (!typeParam) typeParam = seg;
    }
  }
  const [vendorState, setVendorState] = useState(vendor || null);
  const accessToken = useSelector((state) => state.auth.accessToken);
  const formatMoney = (value) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "$0.00";
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  const formatDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      const dateOnly = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        const [yyyy, mm, dd] = dateOnly.split('-');
        return `${mm}/${dd}/${yyyy}`;
      }
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };
  const initialTab = Number.parseInt(tabParam, 10);
  const [tab, setTab] = useState(Number.isFinite(initialTab) ? initialTab : 0);
  const [search, setSearch] = useState(searchParam || "");
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billDate, setBillDate] = useState();
  const [dueDate, setDueDate] = useState();
  const [notes, setNotes] = useState("");
  const [lineItemsState, setLineItemsState] = useState([
    { accountId: "", description: "", quantity: "", unitPrice: "" },
  ]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState(() => (orderParam === 'asc' ? 'asc' : 'desc'));
  const [statusFilter, setStatusFilter] = useState(() => typeParam || '');
  const [startDate, setStartDate] = useState(() => startDateParam || '');
  const [endDate, setEndDate] = useState(() => endDateParam || '');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState('');
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

  const allColumns = useMemo(
    () => [
      { id: "date", label: "DATE", align: "left" },
      { id: "poDate", label: "PO DATE", align: "left" },
      { id: "type", label: "TYPE", align: "left" },
      { id: "no", label: "NO", align: "left" },
      { id: "payee", label: "PAYEE", align: "center" },
      { id: "dueDate", label: "DUE DATE", align: "left" },
      { id: "status", label: "STATUS", align: "center" },
      { id: "pretax", label: "PRE-TAX TOTAL", align: "right" },
      { id: "salesTax", label: "SALES TAX", align: "right" },
      { id: "balanceDue", label: "BALANCE DUE", align: "right" },
      { id: "paidAmount", label: "PAID AMOUNT", align: "right" },
      { id: "total", label: "TOTAL", align: "right" },
      { id: "category", label: "CATEGORY", align: "left" },
      { id: "description", label: "DESCRIPTION", align: "left" },
      { id: "entryType", label: "ENTRY TYPE", align: "left" },
      { id: "paymentId", label: "PAYMENT ID", align: "right" },
      { id: "action", label: "ACTION", align: "right" },
    ],
    []
  );

  const defaultVisibleColumnIds = useMemo(
    () => ["date", "poDate", "type", "no", "payee", "dueDate", "status", "pretax", "salesTax", "total", "action"],
    []
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
    if (!colsParam) return defaultVisibleColumnIds;

    const cols = colsParam
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return cols.length > 0 ? cols : defaultVisibleColumnIds;
  });

  useEffect(() => {
    if (!id || id === 'undefined') return;
    if (vendor) setVendorState(vendor);
  }, [vendor, id]);

  useEffect(() => {
    if (!id || id === 'undefined' || !accessToken) return;
    let ignore = false;

    const loadVendor = async () => {
      try {
        const res = await getRequestWithOutBody(`${baseURl}vendor/${id}`, accessToken);
        if (!ignore) setVendorState(res?.data || null);
      } catch (e) {
        // Keep whatever we have from router state; just avoid breaking the page
      }
    };

    loadVendor();
    return () => {
      ignore = true;
    };
  }, [id, accessToken, location.key]);

  const [vendorInfo, setVendorInfo] = useState(null);

  // Supplier headline: prefer real vendor from previous page, fallback to mock
  const supplierVendor = vendorState || vendorInfo || vendor;
  const supplier = supplierVendor
    ? {
        name: supplierVendor.companyName || "",
        email: supplierVendor.email || "",
        phone: supplierVendor.directorContactNo || "",
        address: supplierVendor.address || "",
        website: supplierVendor.website || "",
      }
    : {
        name: "GreenLeaf Stationery",
        email: "greenleaf@supplies.com",
        phone: "+1 604 995 3328",
        address: "1458 Willow Bend Rd",
        website: "www.greenleafstationery .com",
      };

  const stats = supplierVendor?.stats || vendorState?.stats || null;

  const openBillView = async (row) => {
    try {
      setViewBillOpen(true);
      setViewBillLoading(true);
      const typeRaw = String(row?.sourceType || row?.type || '').toLowerCase();
      let endpoint = '';
      // Explicitly handle Invoice Payment to avoid being caught by generic 'payment'
      if (typeRaw.includes('invoice payment')) {
        endpoint = `${baseURl}invoice-payment/${row.id}`;
      } else if (typeRaw.includes('payment') || typeRaw === 'bill payment') {
        endpoint = `${baseURl}purchase-order-payment/${row.id}`;
      } else if (typeRaw.includes('journal')) {
        const jid = row?.journalId || row?.original?.journalId;
        endpoint = `${baseURl}journal/${jid || row.id}`;
      } else {
        endpoint = `${baseURl}bill/${row.id}`;
      }

      const result = await getRequestWithOutBody(endpoint, accessToken);
      setViewBill(result?.data || null);
    } catch (e) {
      let msg = e?.message || 'Failed to load transaction';
      const lower = String(msg).toLowerCase();
      if (lower.includes('404') || lower.includes('not found')) {
        msg = 'Record not found';
      }
      toast.error(msg);
      // Keep modal open and show empty-state message
      setViewBill(null);
    } finally {
      setViewBillLoading(false);
    }
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(() => {
    const parsed = Number.parseInt(pageParam, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const parsed = Number.parseInt(limitParam, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
  });
  const [totalCount, setTotalCount] = useState(0);
  const [outstandingBills, setOutstandingBills] = useState([]);
  const [availableCredits, setAvailableCredits] = useState([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [billSelections, setBillSelections] = useState({});
  const [creditSelections, setCreditSelections] = useState({});
  const [viewBillOpen, setViewBillOpen] = useState(false);
  const [viewBillLoading, setViewBillLoading] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [billSaving, setBillSaving] = useState(false);

  // Build path-based URL when filters change
  const buildPath = () => {
    const segments = [];
    if (tab !== 0) segments.push(String(tab));
    if (search) segments.push(encodeURIComponent(search));
    if (statusFilter) segments.push(encodeURIComponent(statusFilter));
    if (startDate) segments.push(startDate);
    if (endDate) segments.push(endDate);
    if (sortOrder && sortOrder !== 'desc') segments.push(sortOrder);
    if (page !== 1) segments.push(String(page));
    if (rowsPerPage !== 25) segments.push(String(rowsPerPage));
    
    const defaultColsKey = defaultVisibleColumnIds.join(',');
    const currentColsKey = Array.isArray(visibleColumnIds) ? visibleColumnIds.join(',') : '';
    if (currentColsKey && currentColsKey !== defaultColsKey) {
      segments.push(currentColsKey);
    }
    
    return segments.length > 0 ? `/home/supplier/${id}/${segments.join('/')}` : `/home/supplier/${id}`;
  };

  useEffect(() => {
    const newPath = buildPath();
    if (newPath !== location.pathname) {
      navigate(newPath, { replace: true });
    }
  }, [tab, search, startDate, endDate, statusFilter, sortOrder, page, rowsPerPage, visibleColumnIds, id, navigate]);

  // Sync state when URL path changes (e.g., back button)
  useEffect(() => {
    const newPathSegments = location.pathname.replace(`/home/supplier/${id}`, '').split('/').filter(Boolean);
    const isColsSeg = (seg) => seg.includes(',') || knownColumnIds.some(id => seg.split(',').includes(id));
    
    let newTab = '', newSearch = '', newType = '', newStartDate = '', newEndDate = '', newOrder = '', newPage = '', newLimit = '';
    
    for (const seg of newPathSegments) {
      const decoded = decodeURIComponent(seg);
      if (isColsSeg(seg)) continue;
      else if (seg === 'asc' || seg === 'desc') newOrder = seg;
      else if (seg.match(/^\d{4}-\d{2}-\d{2}$/)) {
        if (!newStartDate) newStartDate = seg;
        else newEndDate = seg;
      } else if (seg.match(/^\d+$/)) {
        const num = parseInt(seg, 10);
        if (!newTab && num <= 5) newTab = seg; // Assume tab if small number
        else if (!newPage) newPage = seg;
        else newLimit = seg;
      } else if (['Journal Entry', 'Purchase Order', 'PO Payment'].includes(decoded)) {
        newType = decoded;
      } else {
        if (!newSearch) newSearch = decoded;
      }
    }
    
    if (newTab && parseInt(newTab, 10) !== tab) setTab(parseInt(newTab, 10));
    if (newSearch !== search) setSearch(newSearch);
    if (newType !== statusFilter) setStatusFilter(newType);
    if (newStartDate !== startDate) setStartDate(newStartDate || '');
    if (newEndDate !== endDate) setEndDate(newEndDate || '');
    if (newOrder && newOrder !== sortOrder) setSortOrder(newOrder);
    if (newPage && parseInt(newPage, 10) !== page) setPage(parseInt(newPage, 10));
    if (newLimit && parseInt(newLimit, 10) !== rowsPerPage) setRowsPerPage(parseInt(newLimit, 10));
  }, [location.pathname, id]);

  const loadTransactions = () => {
    if (!id || id === 'undefined') return;
    setLoading(true);

    const params = new URLSearchParams({
      paginate: 'true',
      limit: String(rowsPerPage),
      page: String(page),
      orderBy: 'createdAt',
      order: sortOrder || 'desc',
    });

    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (statusFilter) params.set('type', statusFilter);

    const url = `${baseURl}purchase-order/transactions/${id}/?${params.toString()}`;
    getRequestWithOutBody(url, accessToken)
      .then((result) => {
        const apiRows = (result?.data || []).map((t) => ({
          id: t.id,
          date: t.date,
          poDate: (typeof t.poDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(t.poDate)) ? t.poDate : '',
          type: t.type,
          no: t.reference,
          payee: t.vendor,
          dueDate: t.dueDate,
          status: t.status,
          category: t.category,
          description: t.description,
          entryType: t.entryType,
          paymentId: t.paymentId,
          pretax: Number(t.amountBeforeTax || 0),
          salesTax: Number(t.taxAmount || 0),
          balanceDue: Number(t.balanceDue || 0),
          paidAmount: Number(t.paidAmount || 0),
          total: Number(t.totalAmount || 0),
          action: t.action,
          sourceType: t.sourceType,
          journalId: t.journalId,
        }));
        setRows(apiRows);

        const totalRecords = result?.pagination?.totalRecords ?? result?.pagination?.total ?? result?.pagination?.totalCount;
        if (totalRecords !== undefined && totalRecords !== null && totalRecords !== '') {
          setTotalCount(Number(totalRecords) || 0);
        } else {
          // fallback for non-paginated responses
          setTotalCount(Array.isArray(result?.data) ? result.data.length : apiRows.length);
        }
      })
      .catch((error) => {
      })
      .finally(() => setLoading(false));
  };

  const openPaymentForBill = async (row) => {
    try {
      setPaymentOpen(true);
      setPaymentLoading(true);
      const url = `${baseURl}purchase-order/outstanding-transactions/${id}`;
      const result = await getRequestWithOutBody(url, accessToken);
      const vendorObj = result?.data?.vendor || null;
      const bills = (result?.data?.outstandingPurchaseOrders || []).map((b) => ({
        ...b,
        // Ensure BillPaymentModal can always display a PO date
        poDate: b?.poDate || b?.orderDate || b?.billDate || b?.date || '',
      }));
      const credits = result?.data?.availableJournalEntries || [];
      setVendorInfo(vendorObj);
      setOutstandingBills(bills);
      setAvailableCredits(credits);
      setBillSelections((prev) => ({
        ...prev,
        [row.id]: { checked: true, amount: Number(String(row.total).replace(/[^0-9.-]/g, '')) || 0 },
      }));
      setPaymentLoading(false);
    } catch (e) {
      toast.error(e?.message || 'Failed to load outstanding transactions');
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [id, accessToken, page, rowsPerPage, startDate, endDate, statusFilter, sortOrder]);

  // Load accounts for bill modal (simplified version of ChartOfAccounts fetch)
  useEffect(() => {
    if (!billModalOpen) return;
    setAccountsLoading(true);
    const queryParams = new URLSearchParams({
      paginate: 'true',
      limit: '100',
      page: '1',
    });
    const url = `${baseURl}account/?${queryParams.toString()}`;
    getRequestWithOutBody(url, accessToken)
      .then((json) => {
        const list = json?.data?.data || [];

        const flatten = (nodes, acc = []) => {
          (nodes || []).forEach((n) => {
            acc.push({ id: n.id, name: n.name, code: n.code });
            if (Array.isArray(n.children) && n.children.length) flatten(n.children, acc);
          });
          return acc;
        };

        setAccountOptions(flatten(list));
      })
      .catch((e) => {
      })
      .finally(() => setAccountsLoading(false));
  }, [billModalOpen, accessToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
  }, [rows, search]);

  const billItemsTotal = useMemo(() => {
    return (lineItemsState || []).reduce((sum, li) => {
      const qty = Number(li.quantity) || 0;
      const price = Number(li.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [lineItemsState]);

  const columns = useMemo(
    () => allColumns.filter((c) => visibleColumnIds.includes(c.id)),
    [allColumns, visibleColumnIds]
  );

  const data = filtered.map((r) => ({
    id: r.id,
    date: r.date,
    poDate: r.poDate,
    type: r.type,
    no: r.no,
    payee: r.payee,
    dueDate: r.dueDate,
    status: r.status,
    category: r.category || "",
    description: r.description || "",
    entryType: r.entryType || "",
    paymentId: r.paymentId ?? "",
    pretax: `$${Number(r.pretax).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    salesTax: `$${Number(r.salesTax).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    balanceDue: `$${Number(r.balanceDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    paidAmount: `$${Number(r.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    total: `$${Number(r.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    action: r.action || 'Open',
    sourceType: r.sourceType,
    journalId: r.journalId,
  }));

  const buildTransactionsPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const colDefs = (columns || []).filter((c) => c?.id !== 'action');
    const orientation = colDefs.length > 7 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

    const marginX = 32;
    const marginTop = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginX * 2;

    const title = 'Supplier Transactions';
    const vendorName = supplier?.name ? String(supplier.name) : '';
    const range = `${startDate || ''}${endDate ? ` to ${endDate}` : ''}`.trim();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, marginX, marginTop);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let metaY = marginTop + 18;
    if (vendorName) {
      doc.text(`Vendor: ${vendorName}`, marginX, metaY);
      metaY += 14;
    }
    if (range) {
      doc.text(`Date Range: ${range}`, marginX, metaY);
      metaY += 14;
    }
    if (statusFilter) {
      doc.text(`Type: ${statusFilter}`, marginX, metaY);
      metaY += 14;
    }

    const headerBg = [241, 245, 249];
    const border = [203, 213, 225];

    const fontSize = orientation === 'landscape' ? 8 : 9;
    doc.setFontSize(fontSize);

    const colCount = Math.max(colDefs.length, 1);
    const colWidth = contentWidth / colCount;
    const paddingX = 4;
    const paddingY = 3;
    const minRowHeight = 18;

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
        y = 36;
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

    const fileNameVendor = vendorName ? vendorName.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') : 'supplier';
    const fileName = `transactions-${fileNameVendor}.pdf`;
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
      const { doc, fileName } = await buildTransactionsPdf();
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

  const totals = {
    pretax: rows.reduce((s, r) => s + (r.pretax||0), 0),
    salesTax: rows.reduce((s, r) => s + (r.salesTax||0), 0),
    total: rows.reduce((s, r) => s + (r.total||0), 0),
    balanceDue: rows.reduce((s, r) => s + (r.balanceDue||0), 0),
    paidAmount: rows.reduce((s, r) => s + (r.paidAmount||0), 0),
  };

  const handleCreateBill = async () => {
    try {
      setBillSaving(true);
      const vendorId = Number(id);
      const vendorAccountId = vendor?.accountId || null;
      const today = new Date();
      today.setHours(0,0,0,0);
      const parseDate = (str) => {
        if (!str) return null;
        // Accept YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const d = new Date(str);
          return isNaN(d.getTime()) ? null : d;
        }
        // Accept DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
          const [dd, mm, yyyy] = str.split('/').map(Number);
          const d = new Date(yyyy, mm - 1, dd);
          return isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      const due = parseDate(dueDate);
      if (due) due.setHours(0,0,0,0);
      // Per request: future due dates should be marked as 'overdue'
      const statusComputed = due && due > today ? "overdue" : "open";

      const body = {
        // tenantId: 1,
        vendorId,
        vendorAccountId,
        billDate,
        dueDate,
        notes,
        status: statusComputed,
        lineItems: lineItemsState
          .filter((li) => li.accountId || li.description || li.quantity || li.unitPrice)
          .map((li) => ({
            accountId: Number(li.accountId) || 0,
            description: li.description,
            quantity: Number(li.quantity) || 0,
            unitPrice: Number(li.unitPrice) || 0,
          })),
      };

      const res = await postRequestWithBodyAndToken(`${baseURl}purchase-order-payment`, accessToken, body);
      toast.success(res?.message || "Bill created successfully");
      // reset form after success
      setBillDate("");
      setDueDate("");
      setNotes("");
      setLineItemsState([{ accountId: "", description: "", quantity: "", unitPrice: "" }]);
      setBillModalOpen(false);
      loadTransactions();
      // Optionally: refresh transactions after creating bill
      // or navigate to a Bill detail screen if available.
    } catch (e) {
      toast.error(e?.message || "Failed to create bill");
    } finally {
      setBillSaving(false);
    }
  };
  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "#F8FAFC", padding: 20 }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2">
          <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: 'var(--sidebar-text-primary)' }}>
            <IoIosArrowBack size={22} />
          </IconButton>
          <Heading Fontweight={700} color={'var(--sidebar-text-primary)'} Heading={supplier.name || 'Supplier'} Fontsize={28} />
        </div>
        <div className="flex items-center gap-2">
        <Button variant="contained" onClick={() => navigate('/home/editVendor', { state: { itemData: supplierVendor } })}>Edit Supplier</Button>
        <Button variant="contained" onClick={() => setBillModalOpen(true)}>+ New Transaction</Button>
        </div>
      </div>

      {/* Contact line under back + title */}
      <div style={{ color: '#6B7280', fontWeight: 600, marginTop: -4, fontSize: 13, marginBottom: 10 }}>
        {[supplier.email, supplier.phone, supplier.address].filter(Boolean).join(' | ')}
      </div>

      {/* Notes */}
      <div style={{ color: '#111827', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Notes:</div>
      <div style={{ color: '#4B5563', fontSize: 13, marginBottom: 12 }}>
        Primary packaging and labeling material supplier. Schedule deliveries every 2 weeks. Contact by email for urgent orders.
      </div>

      {/* Bill creation modal */}
      <Dialog open={billModalOpen} onClose={billSaving ? undefined : () => setBillModalOpen(false)} disableEscapeKeyDown={billSaving} maxWidth="md" fullWidth>
        <DialogTitle>New Bill - {supplier.name || 'Supplier'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                label="Bill Date"
                type="date"
                fullWidth
                size="small"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                size="small"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                minRows={2}
                size="small"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>

          <div style={{ marginTop: 16, fontWeight: 700, fontSize: 14 }}>Items</div>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {lineItemsState.map((li, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={3}>       
                  <Select
                    fullWidth
                    size="small"
                    displayEmpty
                    value={li.accountId || ""}
                    disabled={accountsLoading}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLineItemsState((prev) => prev.map((row, i) => i === idx ? { ...row, accountId: v } : row));
                    }}
                  >
                    <MenuItem value="">
                      <em>Select Account</em>
                    </MenuItem>
                    {accountOptions.map((acc) => (
                      <MenuItem key={acc.id} value={acc.id}>
                        {acc.name} {acc.code ? `(${acc.code})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Description"
                    fullWidth
                    size="small"
                    value={li.description}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLineItemsState((prev) => prev.map((row, i) => i === idx ? { ...row, description: v } : row));
                    }}
                  />
                </Grid>
                <Grid item xs={1}>
                  <TextField
                    label="Qty"
                    fullWidth
                    size="small"
                    type="number"
                    value={li.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLineItemsState((prev) => prev.map((row, i) => i === idx ? { ...row, quantity: v } : row));
                    }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    label="Unit Price"
                    fullWidth
                    size="small"
                    type="number"
                    value={li.unitPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLineItemsState((prev) => prev.map((row, i) => i === idx ? { ...row, unitPrice: v } : row));
                    }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TextField
                      label="Total"
                      fullWidth
                      size="small"
                      value={(Number(li.quantity || 0) * Number(li.unitPrice || 0)).toFixed(2)}
                      InputProps={{ readOnly: true }}
                    />
                    <Button
                      color="error"
                      size="small"
                      onClick={() => {
                        setLineItemsState((prev) => {
                          const next = prev.filter((_, i) => i !== idx);
                          return next.length === 0 ? [{ accountId: "", description: "", quantity: "", unitPrice: "" }] : next;
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </Grid>
              </React.Fragment>
            ))}
          </Grid>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, color: '#111827' }}>Grand Total: ${billItemsTotal.toFixed(2)}</div>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                setLineItemsState((prev) => [
                  ...prev,
                  { accountId: "", description: "", quantity: "", unitPrice: "" },
                ])
              }
            >
              + Add Item
            </Button>
          </div>
        </DialogContent>
        <DialogActions>
          <Button disabled={billSaving} onClick={() => setBillModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBill} disabled={billSaving}>
            {billSaving ? 'Saving…' : 'Save Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Bill modal (read-only) */}
      <Dialog open={viewBillOpen} onClose={() => setViewBillOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewBill?.paymentNumber 
            ? `View Payment - ${viewBill.paymentNumber}`
            : Array.isArray(viewBill?.entries)
              ? `View Journal - ${viewBill?.reference || viewBill?.id || ''}`
              : `View Bill ${viewBill?.billNumber ? `- ${viewBill.billNumber}` : ''}`}
        </DialogTitle>
        <DialogContent dividers>
          {viewBillLoading ? (
            <div className="text-center w-full mx-auto"><Spinner size="w-10 h-10" /></div>
          ) : viewBill ? (
            viewBill.paymentNumber ? (
              // Payment View
              <div>
                <Grid container spacing={2} sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <TextField label="Payment Date" fullWidth size="small" value={formatDate(viewBill.paymentDate) || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Payment Method" fullWidth size="small" value={viewBill.paymentMethod || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Reference" fullWidth size="small" value={viewBill.referenceNo || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Total Amount" fullWidth size="small" value={viewBill.totalAmount || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Notes" fullWidth size="small" value={viewBill.notes || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                </Grid>

                {/* Payment Sources */}
                {viewBill.paymentSources?.length > 0 && (
                  <>
                    <div style={{ fontWeight: 700, margin: '16px 0 8px 0' }}>Payment Sources</div>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '8px 10px', background: 'var(--navbar-dropdown-hover)', color: 'var(--sidebar-text-selected)', fontWeight: 700, fontSize: 12 }}>
                        <div>Account</div>
                        <div style={{ textAlign: 'right' }}>Amount</div>
                      </div>
                      {viewBill.paymentSources.map((ps, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '8px 10px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                          <div>{ps.paymentAccountName}</div>
                          <div style={{ textAlign: 'right' }}>${Number(ps.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Allocations */}
                {viewBill.allocations?.length > 0 && (
                  <>
                    <div style={{ fontWeight: 700, margin: '16px 0 8px 0' }}>Purchase Order Allocations</div>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '8px 10px', background: 'var(--navbar-dropdown-hover)', color: 'var(--sidebar-text-selected)', fontWeight: 700, fontSize: 12 }}>
                        <div>PO Number</div>
                        <div style={{ textAlign: 'right' }}>Applied Amount</div>
                      </div>
                      {viewBill.allocations.map((alloc, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', padding: '8px 10px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                          <div>{alloc.purchaseOrder?.poNo || alloc.purchaseOrder?.reference || `PO #${alloc.purchaseOrderId || ''}`}</div>
                          <div style={{ textAlign: 'right' }}>${Number(alloc.allocatedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : Array.isArray(viewBill?.entries) ? (
              <div>
                <Grid container spacing={2} sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <TextField label="Reference" fullWidth size="small" value={viewBill.reference || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Date" fullWidth size="small" value={formatDate(viewBill.date) || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Status" fullWidth size="small" value={viewBill.status || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Source" fullWidth size="small" value={viewBill.source || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Description" fullWidth size="small" value={viewBill.description || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                </Grid>

                <div style={{ fontWeight: 700, margin: '8px 0' }}>Entries</div>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', padding: '8px 10px', background: 'var(--navbar-dropdown-hover)', color: 'var(--sidebar-text-selected)', fontWeight: 700, fontSize: 12 }}>
                    <div>Account</div>
                    <div style={{ textAlign: 'right' }}>Debit</div>
                    <div style={{ textAlign: 'right' }}>Credit</div>
                  </div>
                  {(viewBill.entries || []).map((e) => {
                    const acct = e?.account ? `${e.account.code || ''} ${e.account.name || ''}`.trim() : '';
                    return (
                      <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', padding: '8px 10px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                        <div>{acct || e.accountId || '—'}</div>
                        <div style={{ textAlign: 'right' }}>${Number(e.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div style={{ textAlign: 'right' }}>${Number(e.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', padding: '8px 10px', borderTop: '1px solid #E5E7EB', background: '#F8FAFC', fontWeight: 700 }}>
                    <div style={{ textAlign: 'right' }}>Total</div>
                    <div style={{ textAlign: 'right' }}>${Number(viewBill.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div style={{ textAlign: 'right' }}>${Number(viewBill.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            ) : (
              // Existing Bill View
              <div>
                <Grid container spacing={2} sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <TextField label="Bill Date" fullWidth size="small" value={formatDate(viewBill.billDate) || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Due Date" fullWidth size="small" value={formatDate(viewBill.dueDate) || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Notes" fullWidth size="small" value={viewBill.notes || ''} InputProps={{ readOnly: true }} />
                  </Grid>
                </Grid>
                <div style={{ fontWeight: 700, margin: '8px 0' }}>Items</div>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', padding: '8px 10px', background: 'var(--navbar-dropdown-hover)', color: 'var(--sidebar-text-selected)', fontWeight: 700, fontSize: 12 }}>
                    <div>Item</div>
                    <div style={{ textAlign: 'right' }}>Qty</div>
                    <div style={{ textAlign: 'right' }}>Rate</div>
                    <div style={{ textAlign: 'right' }}>Amount</div>
                  </div>
                  {(viewBill?.lineItems || []).map((li) => {
                    const qty = Number(li.quantity || 0);
                    const rate = Number(li.unitPrice || 0);
                    const amount = Number(
                      li.amount != null ? li.amount : (qty * rate)
                    );
                    const itemName = li.item?.name
                      || li.account?.name
                      || (li.description ? String(li.description) : '—');
                    return (
                      <div key={li.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', padding: '8px 10px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                        <div>{itemName}</div>
                        <div style={{ textAlign: 'right' }}>{qty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div style={{ textAlign: 'right' }}>${rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div style={{ textAlign: 'right' }}>${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    );
                  })}
                  {/* Totals row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', padding: '8px 10px', borderTop: '1px solid #E5E7EB', background: '#F8FAFC', fontWeight: 700 }}>
                    <div style={{ textAlign: 'right', gridColumn: '1 / span 3' }}>Total</div>
                    <div style={{ textAlign: 'right' }}>
                      ${Number(viewBill?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div style={{ color: '#6B7280' }}>No data</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewBillOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Summary Cards */}
      <div className="flex gap-3 flex-wrap" style={{ marginTop: 12, marginBottom: 16 }}>
        {[
          { title: 'Purchase Orders', amount: formatMoney(stats?.purchaseOrdersTotal), subtitle: 'Purchase Orders' },
          { title: 'Bills Paid', amount: formatMoney(stats?.billsPaidTotal), subtitle: 'Bills Paid' },
          { title: 'Open Bills Balance', amount: formatMoney(stats?.openBillsBalance), subtitle: 'Open Bills Balance' },
          { title: 'Overdue Bills Balance', amount: formatMoney(stats?.overdueBillsBalance), subtitle: 'Overdue Bills Balance' },
        ].map((c) => (
          <TaxDashboardBox key={c.title} title={c.title} amount={c.amount} subtitle={c.subtitle} />
        ))}
      </div>

      {/* <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(260px, 360px))', gap: 14, marginBottom: 10 }}>
        <AmountCard
          title="Open Balance"
          value="$5,482.60"
          subtitle="Total Cash"
          bgColor="#E3F2FD"
          barColor="#90CAF9"
          titleColor="#0F172A"
          amountColor="#111827"
          subtitleColor="#6B7280"
          maxWidth={360}
        />
        <AmountCard
          title="Overdue Payment"
          value="Tue, Feb 18, 2025"
          subtitle="Check Date"
          bgColor="#FFF3E0"
          barColor="#F6C27A"
          titleColor="#0F172A"
          amountColor="#111827"
          subtitleColor="#6B7280"
          maxWidth={360}
        />
      </div> */}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Supplier Transaction" />
          <Tab label="Supplier Details" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <>
          <div style={{ marginTop: 6, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--chrome-filter-bar-bg)', borderRadius: 12, padding: '10px 12px', minWidth: 340, display: 'flex', gap: 8, alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--chrome-search-icon)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
                <input placeholder="Search" value={search} onChange={(e)=>setSearch(e.target.value)} style={{ outline: 'none', background: 'transparent', width: '100%', fontSize: 14, border: 'none', color: 'var(--dashboard-text-primary)' }} />
              </div>

              {/* <FormControl size="small" sx={{ minWidth: 210 }}>
                <Select
                  displayEmpty
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  renderValue={(v) => (v ? v : 'All Transactions')}
                  sx={{
                    background: 'var(--chrome-filter-bar-bg)',
                    borderRadius: '12px',
                    '& fieldset': { border: 'none' },
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Journal Entry">Journal Entry</MenuItem>
                  <MenuItem value="Purchase Order">Purchase Order</MenuItem>
                  <MenuItem value="PO Payment">PO Payment</MenuItem>
                </Select>
              </FormControl> */}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setDraftStatusFilter(statusFilter || '');
                  setDraftPreset('');
                  setDraftStartDate(startDate || '');
                  setDraftEndDate(endDate || '');
                  setFilterDialogOpen(true);
                }}
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

          <Dialog
            open={filterDialogOpen}
            onClose={() => setFilterDialogOpen(false)}
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
                      value={draftStatusFilter}
                      onChange={(e) => setDraftStatusFilter(e.target.value)}
                      renderValue={(v) => (v ? v : '--select type--')}
                    >
                      <MenuItem value="">--select type--</MenuItem>
                      <MenuItem value="Journal Entry">Journal Entry</MenuItem>
                      <MenuItem value="Purchase Order">Purchase Order</MenuItem>
                      <MenuItem value="PO Payment">PO Payment</MenuItem>
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
                        const range = resolvePresetRange(next);
                        if (range) {
                          setDraftStartDate(range.startDate);
                          setDraftEndDate(range.endDate);
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
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={draftStartDate}
                    onChange={(e) => {
                      setDraftStartDate(e.target.value);
                      setDraftPreset('');
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>To Date</div>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={draftEndDate}
                    onChange={(e) => {
                      setDraftEndDate(e.target.value);
                      setDraftPreset('');
                    }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ padding: 2, justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setDraftStatusFilter('');
                  setDraftPreset('');
                  setDraftStartDate('');
                  setDraftEndDate('');
                }}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setStatusFilter(draftStatusFilter || '');
                  setStartDate(draftStartDate || '');
                  setEndDate(draftEndDate || '');
                  setPage(1);
                  setFilterDialogOpen(false);
                }}
              >
                Apply
              </Button>
            </DialogActions>
          </Dialog>

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

          {/* Table / Loader / Empty */}
          {loading ? (
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--dashboard-card-bg)',
                border: '1px solid var(--dashboard-box-border)',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)',
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid #3B82F6',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: 14 }}>
                  Loading transactions...
                </span>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    gap: 12,
                    borderBottom: i === 5 ? 'none' : '1px solid rgba(0,0,0,0.04)',
                    backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                  }}
                >
                  <div style={{ flex: 2, height: 14, borderRadius: 6, backgroundColor: '#E5E7EB', animation: 'pulse 1.8s ease-in-out infinite' }} />
                  <div style={{ flex: 3, height: 14, borderRadius: 6, backgroundColor: '#E5E7EB', animation: 'pulse 1.8s ease-in-out infinite' }} />
                  <div style={{ flex: 2, height: 14, borderRadius: 6, backgroundColor: '#E5E7EB', animation: 'pulse 1.8s ease-in-out infinite' }} />
                  <div style={{ flex: 2, height: 14, borderRadius: 6, backgroundColor: '#E5E7EB', animation: 'pulse 1.8s ease-in-out infinite' }} />
                  <div style={{ width: 80, height: 20, borderRadius: 999, backgroundColor: '#E5E7EB', animation: 'pulse 1.8s ease-in-out infinite' }} />
                </div>
              ))}
              <style>
                {`
                  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}
              </style>
            </div>
          ) : filtered.length === 0 ? (
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
              No transactions found
            </div>
          ) : (
            <div style={{ borderRadius: 12, background: 'var(--dashboard-card-bg)', border: '1px solid var(--dashboard-box-border)', overflow: 'hidden' }}>
              <div style={{ padding: 12 }}>
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
                ) : (
                  <MemoTable
                    data={data}
                    columns={columns}
                    accountingTable
                    page={page}
                    rowsPerPage={rowsPerPage}
                    totalCount={totalCount}
                    onPageChange={(next) => setPage(next)}
                    onRowsPerPageChange={(next) => {
                      setRowsPerPage(next);
                      setPage(1);
                    }}
                    actionOptions={(row) => {
                      const sourceType = String(row?.sourceType || '').toLowerCase();
                      const typeText = String(row?.type || '').toLowerCase();
                      const isInvoicePayment = typeText.includes('invoice payment') || sourceType.includes('invoice payment');
                      const isPurchaseOrder =
                        sourceType.includes('purchase_order') ||
                        sourceType.includes('purchase') ||
                        typeText.includes('purchase order');

                      if (isInvoicePayment) {
                        return [
                          { key: 'view_invoice_payment', label: 'View Invoice Payment' },
                        ];
                      }

                      if (isPurchaseOrder) {
                        return [
                          { key: 'view', label: 'View' },
                          { key: 'make_as_paid', label: 'Make as paid' },
                        ];
                      }

                      return [{ key: 'view', label: 'View' }];
                    }}
                    onActionOptionClick={(row, opt) => {
                      const key = opt?.key || opt?.value || opt;
                      if (key === 'make_as_paid') {
                        openPaymentForBill(row);
                        return;
                      }

                      if (key === 'view_invoice_payment') {
                        // Dedicated handler uses the same viewer but ensures invoice-payment endpoint
                        openBillView({ ...row, type: 'Invoice Payment' });
                        return;
                      }

                      if (key === 'view') {
                        const rowId = row?.id;
                        const originalRow = (rows || []).find((r) => String(r?.id) === String(rowId));
                        const sourceType = String(row?.sourceType || originalRow?.sourceType || '').toLowerCase();
                        const typeText = String(row?.type || originalRow?.type || '').toLowerCase();
                        const isPurchaseOrder =
                          sourceType.includes('purchase_order') ||
                          sourceType.includes('purchase') ||
                          typeText.includes('purchase order');

                        if (isPurchaseOrder) {
                          navigate(`/home/editPurchase/?id=${encodeURIComponent(String(row?.id ?? ''))}`, { state: { itemData: { id: row?.id } } });
                          return;
                        }
                        openBillView(row);
                      }
                    }}
                    onRowClick={() => {}}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 1 && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18 }}>
          {/* Header row */}
          {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>Supplier Details</div>
            <Button variant="contained" sx={{ borderRadius: 2 }}>Edit</Button>
          </div> */}

          {/* Details grid */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left column */}
            <div>
              {[
                { label: 'Vendor:', value: supplier.name },
                { label: 'Email:', value: supplier.email },
                { label: 'Phone Number:', value: supplier.phone },
                { label: 'Mobile Number:', value: supplier.phone },
                // { label: 'Fax:', value: '-' },
                { label: 'Billing Address:', value: supplier.address },
              ].map((row, idx, arr) => (
                <div key={row.label}>
                  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', padding: '10px 0' }}>
                    <div style={{ color: '#374151', fontWeight: 700 }}>{row.label}</div>
                    <div style={{ color: '#6B7280', fontWeight: 600 }}>{row.value || '-'}</div>
                  </div>
                  {idx < arr.length - 1 && <div style={{ borderBottom: '1px solid #E5E7EB' }} />}
                </div>
              ))}
            </div>

            {/* Right column */}
            <div>
              {[
                { label: 'Website:', value: supplier.website },
                // { label: 'Terms:', value: '' },
                { label: 'Company:', value: supplier.name },
                // { label: 'Attachments:', value: (
                //     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                //       <div style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#3B82F6', background: '#EFF6FF' }}>
                //         ATM Application Placement
                //       </div>
                //       <div style={{ color: '#64748B', fontSize: 12 }}>Download File</div>
                //     </div>
                //   ) },
                { label: 'Notes:', value: (
                    <div style={{ color: '#6B7280' }}>
                      Primary packaging and labeling material supplier. Schedule deliveries every 2 weeks. Contact by email for urgent orders.
                    </div>
                  ) },
              ].map((row, idx, arr) => (
                <div key={idx}>
                  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', padding: '10px 0' }}>
                    <div style={{ color: '#374151', fontWeight: 700 }}>{row.label}</div>
                    <div style={{ color: '#6B7280', fontWeight: 600 }}>{row.value}</div>
                  </div>
                  {idx < arr.length - 1 && <div style={{ borderBottom: '1px solid #E5E7EB' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bill Payment Modal (separate component) */}
      <BillPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        supplierName={vendorInfo?.companyName || supplier.name}
        vendorId={id}
        bills={outstandingBills}
        credits={availableCredits}
        loading={paymentLoading}
        onPaid={() => {
          setPaymentOpen(false);
          loadTransactions();
        }}
      />
      <Backdrop open={billSaving} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
}
