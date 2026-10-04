import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import { Button, Checkbox, ListItemText, OutlinedInput, Select, MenuItem, InputLabel, FormControl, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import { toast } from 'react-toastify';
import { getRequestWithOutBody, putRequestWithBodyAndToken, deleteRequest } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import AddAccountModal from "../../Components/AddAccountModal";
import { styled } from "@mui/material";
import SearchTicket from "../../Components/SearchTicket";
import { usePageTitle } from "../../Hooks/usePageTitle";

const HeaderWrapper = styled('div')({
  position: 'relative',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  // marginBottom: '10px',
  flexWrap: 'wrap',
  gap: 10
});

const CHART_OF_ACCOUNTS_STORAGE_KEY = 'coa_list_state';
const CHART_OF_ACCOUNTS_LAST_ID_KEY = 'coa_list_last_id';
const CHART_OF_ACCOUNTS_SCROLL_KEY = 'coa_list_scroll';

const defaultChartOfAccountsFilters = {
  type: "",
  isActive: "",
  subType: "",
  parentId: "",
  normalBalance: "",
  isSystemAccount: "",
  createdBy: "",
  tenantId: "",
};

const readSavedChartOfAccountsState = () => {
  const fallback = {
    search: "",
    filters: defaultChartOfAccountsFilters,
    pageNum: 1,
    rowsPerPage: 10,
  };

  try {
    const raw = sessionStorage.getItem(CHART_OF_ACCOUNTS_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const allowedRows = new Set([5, 10, 25, 50]);

    return {
      search: typeof parsed?.search === 'string' ? parsed.search : fallback.search,
      filters: parsed?.filters && typeof parsed.filters === 'object'
        ? { ...defaultChartOfAccountsFilters, ...parsed.filters }
        : fallback.filters,
      pageNum: Number.isFinite(Number(parsed?.pageNum)) && Number(parsed.pageNum) > 0 ? Number(parsed.pageNum) : fallback.pageNum,
      rowsPerPage: allowedRows.has(Number(parsed?.rowsPerPage)) ? Number(parsed.rowsPerPage) : fallback.rowsPerPage,
    };
  } catch (_) {
    return fallback;
  }
};

const readInitialCoaState = () => {
  const saved = readSavedChartOfAccountsState();
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.toString()) return saved;

  const allowedRows = new Set([5, 10, 25, 50]);
  const pageFromUrl = Number.parseInt(urlParams.get('page'), 10);
  const limitFromUrl = Number.parseInt(urlParams.get('limit'), 10);

  return {
    search: urlParams.get('search') || '',
    pageNum: Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1,
    rowsPerPage: allowedRows.has(limitFromUrl) ? limitFromUrl : 10,
    filters: {
      ...defaultChartOfAccountsFilters,
      type: urlParams.get('type') || '',
      isActive: urlParams.get('isActive') || '',
      subType: urlParams.get('subType') || '',
      parentId: urlParams.get('parentId') || '',
      normalBalance: urlParams.get('normalBalance') || '',
      isSystemAccount: urlParams.get('isSystemAccount') || '',
      createdBy: urlParams.get('createdBy') || '',
      tenantId: urlParams.get('tenantId') || '',
    },
  };
};

const buildCoaUrlParams = (search, filters, pageNum, rowsPerPage) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filters.type) params.set('type', filters.type);
  if (filters.isActive) params.set('isActive', filters.isActive);
  if (filters.subType) params.set('subType', filters.subType);
  if (filters.parentId) params.set('parentId', filters.parentId);
  if (filters.normalBalance) params.set('normalBalance', filters.normalBalance);
  if (filters.isSystemAccount) params.set('isSystemAccount', filters.isSystemAccount);
  if (filters.createdBy) params.set('createdBy', filters.createdBy);
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (pageNum > 1) params.set('page', String(pageNum));
  if (rowsPerPage !== 10) params.set('limit', String(rowsPerPage));
  return params;
};

const formatDateMDY = (value) => {
  if (!value) return '-';
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
// Loading skeleton component for accounts
const LoadingAccountsView = () => {
  const SkeletonRow = ({ level = 0, hasExpander = false }) => (
    <div
      style={{
        paddingLeft: level * 20 + 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        backgroundColor: level > 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
      }}
    >
      {/* Expand/Collapse Button Skeleton */}
      <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
        {hasExpander ? (
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '4px',
              backgroundColor: '#E5E7EB',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        ) : (
          <div style={{ width: 20 }} />
        )}
      </div>

      {/* Account Info Skeleton */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Account Name Skeleton */}
          <div
            style={{
              height: '16px',
              width: `${120 + Math.random() * 80}px`,
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          {/* Account Code Skeleton */}
          <div
            style={{
              height: '14px',
              width: '60px',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          {/* Type Badge Skeleton */}
          <div
            style={{
              height: '18px',
              width: '70px',
              backgroundColor: '#E5E7EB',
              borderRadius: '12px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        </div>

        {/* Account Details Skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              height: '12px',
              width: '80px',
              backgroundColor: '#F3F4F6',
              borderRadius: '3px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          <div
            style={{
              height: '12px',
              width: '60px',
              backgroundColor: '#F3F4F6',
              borderRadius: '3px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          <div
            style={{
              height: '12px',
              width: `${100 + Math.random() * 50}px`,
              backgroundColor: '#F3F4F6',
              borderRadius: '3px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        </div>
      </div>

      {/* Balance Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px', gap: 4 }}>
        <div
          style={{
            height: '16px',
            width: '90px',
            backgroundColor: '#E5E7EB',
            borderRadius: '4px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
        <div
          style={{
            height: '11px',
            width: '70px',
            backgroundColor: '#F3F4F6',
            borderRadius: '3px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
      </div>

      {/* Status Indicator Skeleton */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#E5E7EB',
          marginLeft: '8px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}
      />
    </div>
  );

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
        `}
      </style>
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--dashboard-card-bg)',
        border: '1px solid var(--dashboard-box-border)'
      }}>
        {/* Loading Header */}
        <div style={{
          padding: 16,
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
            Loading accounts...
          </span>
        </div>

        {/* Skeleton Rows */}
        <SkeletonRow hasExpander={true} />
        <SkeletonRow level={1} />
        <SkeletonRow level={1} />
        <SkeletonRow hasExpander={true} />
        <SkeletonRow level={1} />
        <SkeletonRow level={2} />
        <SkeletonRow />
        <SkeletonRow hasExpander={true} />
        <SkeletonRow level={1} />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow hasExpander={true} />
        <SkeletonRow level={1} />
        <SkeletonRow level={1} />
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default function ChartOfAccounts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const searchDebounceRef = useRef(null);
  
  // Update browser tab title
  usePageTitle("Chart of Accounts", location);
  const initialState = readInitialCoaState();
  const [search, setSearch] = useState(() => initialState.search);
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(() => initialState.pageNum);
  const [rowsPerPage, setRowsPerPage] = useState(() => initialState.rowsPerPage);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState(() => initialState.filters);
  const [expanded, setExpanded] = useState({}); // { [id]: boolean }
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // { id, name }
  const [subAccountDeleteOpen, setSubAccountDeleteOpen] = useState(false);
  const [subAccountDeleteInfo, setSubAccountDeleteInfo] = useState(null); // { id, name, subAccountCount }
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [deleting, setDeleting] = useState(false);


  // Sync state -> URL (one direction only; avoids read/write ping-pong loop)
  useEffect(() => {
    const nextParams = buildCoaUrlParams(search, filters, pageNum, rowsPerPage);
    if (nextParams.toString() === searchParams.toString()) return;
    setSearchParams(nextParams, { replace: true });
  }, [search, filters, pageNum, rowsPerPage, setSearchParams]);

  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHART_OF_ACCOUNTS_STORAGE_KEY, JSON.stringify({
        search,
        filters,
        pageNum,
        rowsPerPage,
      }));
    } catch (_) {}
  }, [search, filters, pageNum, rowsPerPage]);

  useEffect(() => {
    try {
      const savedScroll = sessionStorage.getItem(CHART_OF_ACCOUNTS_SCROLL_KEY);
      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo({ top: parseInt(savedScroll) || 0, behavior: 'instant' });
          sessionStorage.removeItem(CHART_OF_ACCOUNTS_SCROLL_KEY);
        }, 0);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    let isActiveRequest = true;
    const timeout = setTimeout(() => {
      setLoading(true);
      setError("");

      // Build query parameters exactly like ChartOfAccountsDetail
      const queryParams = new URLSearchParams({
        paginate: 'true',
        limit: rowsPerPage.toString(),
        page: pageNum.toString()
      });

      // Add search parameter
      if (search) queryParams.append('keyword', search);

      // Add filters if they have values
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.subType) queryParams.append('subType', filters.subType);
      if (filters.isActive !== "") queryParams.append('isActive', filters.isActive);
      if (filters.parentId !== "") queryParams.append('parentId', filters.parentId);
      if (filters.normalBalance) queryParams.append('normalBalance', filters.normalBalance);
      if (filters.isSystemAccount !== "") queryParams.append('isSystemAccount', filters.isSystemAccount);
      if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
      if (filters.tenantId) queryParams.append('tenantId', filters.tenantId);

      const url = `${baseURl}account/?${queryParams.toString()}`;
      getRequestWithOutBody(url, accessToken)
        .then((json) => {
          if (!isActiveRequest) return;
          const list = json?.data?.data || [];

          setData(Array.isArray(list) ? list : []);
          setTotalCount(Number(json?.data?.totalRecords) || 0);
        })
        .catch((err) => {
          if (!isActiveRequest) return;
          setError("Failed to load accounts. Please try again.");
        })
        .finally(() => { if (isActiveRequest) setLoading(false); });
    }, 300); // debounce rapid changes

    return () => {
      clearTimeout(timeout);
      isActiveRequest = false;
    };
  }, [accessToken, search, filters.type, filters.subType, filters.isActive, filters.parentId, filters.normalBalance, filters.isSystemAccount, filters.createdBy, filters.tenantId, pageNum, rowsPerPage]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const findAccountById = (list, id) => {
    for (const item of list || []) {
      if (item.id === id) return item;
      if (Array.isArray(item.children) && item.children.length) {
        const found = findAccountById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const openEdit = (row) => {
    const full = findAccountById(data, row.id) || row;
    setEditingId(row.id);
    setSelectedAccount(full);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingId(null);
    setSelectedAccount(null);
  };

  const submitEdit = async (payload) => {
    if (!editingId) return;
    await putRequestWithBodyAndToken(`${baseURl}account/${editingId}`, accessToken, payload);
    const queryParams = new URLSearchParams({
      paginate: 'true',
      limit: rowsPerPage.toString(),
      page: pageNum.toString()
    });
    if (search) queryParams.append('keyword', search);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.subType) queryParams.append('subType', filters.subType);
    if (filters.isActive !== "") queryParams.append('isActive', filters.isActive);
    if (filters.parentId !== "") queryParams.append('parentId', filters.parentId);
    if (filters.normalBalance) queryParams.append('normalBalance', filters.normalBalance);
    if (filters.isSystemAccount !== "") queryParams.append('isSystemAccount', filters.isSystemAccount);
    if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
    if (filters.tenantId) queryParams.append('tenantId', filters.tenantId);
    const url = `${baseURl}account/?${queryParams.toString()}`;
    const refreshed = await getRequestWithOutBody(url, accessToken);
    const list = refreshed?.data?.data || [];
    setData(Array.isArray(list) ? list : []);
    setTotalCount(Number(refreshed?.data?.totalRecords) || 0);
    closeEdit();
  };



  // Helper function to format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Helper function to get balance color
  const getBalanceColor = (balance, normalBalance) => {
    const amount = parseFloat(balance || 0);
    if (amount === 0) return '#748092';

    // For accounting: 
    // Assets & Expenses: positive balance is good (green), negative is bad (red)
    // Liabilities, Equity & Income: negative balance is good (green), positive is bad (red)
    const isAssetOrExpense = normalBalance === 'debit';

    if (isAssetOrExpense) {
      return amount > 0 ? '#10B981' : '#EF4444';
    } else {
      return amount > 0 ? '#EF4444' : '#10B981';
    }
  };

  // Helper function to get account type badge color
  const getTypeColor = (type) => {
    const colors = {
      'assets': '#3B82F6',
      'liability': '#F59E0B',
      'capital': '#8B5CF6',
      'expenses': '#EF4444',
      'income': '#10B981',
      'other': '#6B7280'
    };
    return colors[type?.toLowerCase()] || '#6B7280';
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = Array.isArray(node?.children) && node.children.length > 0;
    const isOpen = !!expanded[node.id];
    const balance = parseFloat(node.currentBalance || 0);
    const balanceColor = getBalanceColor(node.currentBalance, node.normalBalance);
    const typeColor = getTypeColor(node.type);

    return (
      <React.Fragment key={node.id}>
        <div
          style={{
            paddingLeft: level * 20 + 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingTop: 12,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            backgroundColor: level > 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(59, 130, 246, 0.05)'
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              toggleExpand(node.id);
            } else {
              try {
                const snapshot = {
                  search,
                  filters,
                  pageNum,
                  rowsPerPage,
                };
                sessionStorage.setItem(CHART_OF_ACCOUNTS_STORAGE_KEY, JSON.stringify(snapshot));
                sessionStorage.setItem(CHART_OF_ACCOUNTS_LAST_ID_KEY, String(node?.id || ''));
                sessionStorage.setItem(CHART_OF_ACCOUNTS_SCROLL_KEY, String(window.scrollY || 0));
              } catch (_) {}
              navigate(`/home/chart-of-accounts/${node.id}`);
            }
          }}
        >
          {/* Expand/Collapse Button */}
          <div style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
            {hasChildren ? (
              <div
                style={{
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: '4px',
                  backgroundColor: 'var(--sidebar-selected-bg)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  transition: 'transform 0.2s ease'
                }}
              >
                {isOpen ? "−" : "+"}
              </div>
            ) : (
              <div style={{ width: 20 }} />
            )}
          </div>

          {/* Account Info */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap'
            }}>
              <span style={{
                fontWeight: level === 0 ? 700 : 600,
                color: "var(--sidebar-text-primary)",
                fontSize: level === 0 ? '16px' : '14px'
              }}>
                {node.name}
              </span>
              {node.code && (
                <span style={{
                  color: "#748092",
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(116, 128, 146, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {node.code}
                </span>
              )}
              {/* Account Type Badge */}
              <span style={{
                backgroundColor: typeColor,
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {node.type || 'Other'}
              </span>
              {node.isSystemAccount && (
                <span style={{
                  backgroundColor: '#6B7280',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '500',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  textTransform: 'uppercase'
                }}>
                  System
                </span>
              )}
            </div>

            {/* Account Details */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: '12px',
              color: '#748092',
              flexWrap: 'wrap'
            }}>
              {node.subType && (
                <span>
                  <strong>Type:</strong> {node.subType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              )}
              <span>
                <strong>Normal:</strong> {node.normalBalance || 'N/A'}
              </span>
              {node.description && (
                <span title={node.description}>
                  <strong>Desc:</strong> {node.description.length > 30 ? node.description.substring(0, 30) + '...' : node.description}
                </span>
              )}
            </div>
          </div>

          {/* Balance Display */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            minWidth: '120px',
            marginRight: '16px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: balanceColor,
              fontFamily: 'monospace'
            }}>
              {formatCurrency(node.currentBalance)}
            </div>
            {node.openingBalance && parseFloat(node.openingBalance) !== balance && (
              <div style={{
                fontSize: '11px',
                color: '#748092',
                fontFamily: 'monospace'
              }}>
                Opening: {formatCurrency(node.openingBalance)}
              </div>
            )}
          </div>
        </div>
        {isOpen && hasChildren ? node.children.map((c) => renderNode(c, level + 1)) : null}
      </React.Fragment>
    );
  };

  // Build MemoTable data (flatten children if present)
  const flattenAccounts = (list, level = 0, acc = []) => {
    (list || []).forEach((n) => {
      acc.push({
        id: n.id,
        // ACCOUNT Name with indentation; include code inline after name
        accountName: `${'\u00A0'.repeat(level * 2)}${n.name || '-'}`,
        code: n.code || '-',
        accountCategory: n.type || 'Other',
        accountClass: n.accountClass ? n.accountClass : '-',
        subType: n.subType || '-',
        detailType: n.subType ? n.subType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : '-',
        normalBalance: n.normalBalance || '-',
        currency: n.currency || '-',
        currentBalance: formatCurrency(n.currentBalance || 0),
        openingBalance: n.openingBalance != null ? formatCurrency(n.openingBalance) : '-',
        openingBalanceDate: n.openingBalanceDate || '-',
        createdAt: formatDateMDY(n.createdAt),
        updatedAt: formatDateMDY(n.updatedAt),
        isActive: typeof n.isActive === 'boolean' ? (n.isActive ? 'Active' : 'Inactive') : '-',
        isSystemAccount: typeof n.isSystemAccount === 'boolean' ? (n.isSystemAccount ? 'Yes' : 'No') : '-',
        taxCode: n.taxCode ?? '-',
        description: n.description || '-',
        parentName: n?.parent?.name || '-',
        parentCode: n?.parent?.code || '-',
        creatorName: n?.creator?.name || '-',
        creatorEmail: n?.creator?.email || '-',
        journalEntriesCount: typeof n.journalEntriesCount === 'number' ? n.journalEntriesCount : (typeof n.count === 'number' ? n.count : 0),
      });
      if (Array.isArray(n.children) && n.children.length) {
        flattenAccounts(n.children, level + 1, acc);
      }
    });
    return acc;
  };

  const allColumns = useMemo(
    () => [
      { id: 'accountName', label: 'Account Name', align: 'left' },
      { id: 'code', label: 'Code', align: 'left' },
      { id: 'accountCategory', label: 'Account Category', align: 'left' },
      { id: 'accountClass', label: 'Account Class', align: 'left' },
      { id: 'subType', label: 'Sub Type', align: 'left' },
      { id: 'createdAt', label: 'Opening Date', align: 'left' },
      { id: 'openingBalanceDate', label: 'Opening Balance Date', align: 'left' },
      { id: 'detailType', label: 'Detail Type', align: 'left' },
      { id: 'normalBalance', label: 'Normal Balance', align: 'left' },
      { id: 'currency', label: 'Currency', align: 'left' },
      { id: 'currentBalance', label: 'Current Balance', align: 'right' },
      { id: 'openingBalance', label: 'Opening Balance', align: 'right' },
      { id: 'journalEntriesCount', label: 'Journal Entries', align: 'right' },
      { id: 'isActive', label: 'Active', align: 'left' },
      { id: 'isSystemAccount', label: 'System Account', align: 'left' },
      { id: 'taxCode', label: 'Tax Code', align: 'left' },
      { id: 'description', label: 'Description', align: 'left' },
      { id: 'parentName', label: 'Parent Name', align: 'left' },
      { id: 'parentCode', label: 'Parent Code', align: 'left' },
      { id: 'creatorName', label: 'Created By', align: 'left' },
      { id: 'creatorEmail', label: 'Creator Email', align: 'left' },
      { id: 'updatedAt', label: 'Updated At', align: 'left' },
      { id: 'action', label: 'Action', align: 'center' },
    ],
    []
  );

  const defaultVisibleColumnIds = useMemo(
    () => allColumns.map((c) => c.id),
    [allColumns]
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState(defaultVisibleColumnIds);

  const tableColumns = useMemo(
    () => allColumns.filter((c) => visibleColumnIds.includes(c.id)),
    [allColumns, visibleColumnIds]
  );

  const tableRows = useMemo(() => flattenAccounts(data), [data]);

  const handleRowClick = (_event, row) => {
    if (!row?.id) return;

    try {
      // persist state and last clicked id
      const snapshot = {
        search,
        filters,
        pageNum,
        rowsPerPage,
      };
      sessionStorage.setItem(CHART_OF_ACCOUNTS_STORAGE_KEY, JSON.stringify(snapshot));
      sessionStorage.setItem(CHART_OF_ACCOUNTS_LAST_ID_KEY, String(row.id));
      sessionStorage.setItem(CHART_OF_ACCOUNTS_SCROLL_KEY, String(window.scrollY || 0));
    } catch (_) {}
    navigate(`/home/chart-of-accounts/${row.id}`);
  };

  useEffect(() => {
    try {
      const lastId = sessionStorage.getItem(CHART_OF_ACCOUNTS_LAST_ID_KEY);
      if (!lastId) return;
      const id = String(lastId);
      const tryScroll = () => {
        const candidates = [
          document.querySelector(`[data-entry-id="${id}"]`),
          document.querySelector(`[data-row-id="${id}"]`),
          document.querySelector(`[data-id="${id}"]`)
        ].filter(Boolean);
        const el = candidates[0];
        if (el && typeof el.scrollIntoView === 'function') {
          try { el.scrollIntoView({ block: 'center' }); } catch (_) {}
          const prev = el.style.background;
          el.style.background = 'rgba(67, 121, 238, 0.12)';
          setTimeout(() => { el.style.background = prev; }, 1500);
          sessionStorage.removeItem(CHART_OF_ACCOUNTS_LAST_ID_KEY);
        }
      };
      setTimeout(tryScroll, 0);
    } catch (_) {}
  }, [tableRows.length]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalExpenses: 0,
      totalIncome: 0,
      totalAccounts: data.length
    };

    data.forEach(account => {
      const balance = parseFloat(account.currentBalance || 0);
      switch (account.type?.toLowerCase()) {
        case 'assets':
          stats.totalAssets += balance;
          break;
        case 'liability':
          stats.totalLiabilities += balance;
          break;
        case 'expenses':
          stats.totalExpenses += balance;
          break;
        case 'income':
          stats.totalIncome += balance;
          break;
      }
    });

    return stats;
  }, [data]);

  const handleSearchChange = (text) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(text);
      setPageNum(1);
    }, 300);
  };

  const handleDeleteClick = (row) => {
    const cnt = Number(row?.journalEntriesCount || 0);
    if (cnt > 0) {
      setInfoTitle('Cannot Delete Account');
      setInfoMessage('This account cannot be deleted because it has recorded transactions or activities.');
      setInfoOpen(true);
      return;
    }
    setPendingDelete({ id: row.id, name: row.accountName || '' });
    setConfirmOpen(true);
  };

  const proceedDelete = async ({ deleteConfirm = false, id, name } = {}) => {
    const targetId = id ?? pendingDelete?.id;
    const targetName = name ?? pendingDelete?.name;
    if (!targetId) { setConfirmOpen(false); return; }
    try {
      setDeleting(true);
      const url = deleteConfirm
        ? `${baseURl}account/${targetId}?deleteConfirm=true`
        : `${baseURl}account/${targetId}`;
      await deleteRequest(url, accessToken);
      // refresh current page
      const queryParams = new URLSearchParams({
        paginate: 'true',
        limit: rowsPerPage.toString(),
        page: pageNum.toString()
      });
      if (search) queryParams.append('keyword', search);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.subType) queryParams.append('subType', filters.subType);
      if (filters.isActive !== "") queryParams.append('isActive', filters.isActive);
      if (filters.parentId !== "") queryParams.append('parentId', filters.parentId);
      if (filters.normalBalance) queryParams.append('normalBalance', filters.normalBalance);
      if (filters.isSystemAccount !== "") queryParams.append('isSystemAccount', filters.isSystemAccount);
      if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
      if (filters.tenantId) queryParams.append('tenantId', filters.tenantId);
      const listUrl = `${baseURl}account/?${queryParams.toString()}`;
      const refreshed = await getRequestWithOutBody(listUrl, accessToken);
      const list = refreshed?.data?.data || [];
      setData(Array.isArray(list) ? list : []);
      setTotalCount(Number(refreshed?.data?.totalRecords) || 0);
      toast.success('Account deleted successfully.');
    } catch (e) {
      const errData = e?.response?.data || e?.data;
      const code = errData?.code;
      if (code === 'HAS_SUB_ACCOUNTS') {
        const subAccountCount = Number(errData?.subAccountCount || 0);
        setSubAccountDeleteInfo({
          id: targetId,
          name: targetName || '',
          subAccountCount,
        });
        setSubAccountDeleteOpen(true);
      } else {
        const msg =
          (typeof errData === 'string' && errData.trim())
            ? errData
            : (errData?.message || errData?.error || 'The account could not be deleted at this time. Please try again later.');
        toast.error(msg);
      }
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10, }}>
      {/* Header Section */}
      <div style={{ marginBottom: 8 }}>
        <HeaderWrapper>
          <Heading
            Fontweight={700}
            color={'var(--sidebar-text-primary)'}
            Heading={'Chart of Accounts'}
            Fontsize={30}
          />
          <BottonWithIcon
            backgroundColor={'#0C79F7'}
            icon={addIcon}
            title={'Add Account'}
            height={40}
            color={'var(--sidebar-text-selected)'}
            fontSize={16}
            fontWeight={500}
            onClick={() => setOpen(true)}
          />
        </HeaderWrapper>
        <p style={{ color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : 'black', fontSize: '14px', }}>
          Manage your company's financial accounts and track balances
        </p>
      </div>

      {/* Summary Cards */}
      {/* <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
      gap: 16, 
      marginBottom: 24 
    }}> */}
      {/* Total Assets Card (two-tone with inner header, curved body top) */}
      {/* <div style={{ borderRadius: 16, boxShadow: '0 6px 10px rgba(0,0,0,0.10)' }}>
          <div style={{
            background: '#E8F5E9',
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative'
          }}>
            <div style={{
              background: '#A5D6A7',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '10px 16px',
              margin: '-18px -20px 12px -20px'
            }}>
              <div style={{ fontSize: 14, color: '#1F2937', fontWeight: 700, letterSpacing: '0.3px' }}>Total Assets</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#374151', lineHeight: 1.1 }}>
              {formatCurrency(summaryStats.totalAssets)}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginTop: 4 }}>
              Company Resources Value
            </div>
          </div>
        </div> */}

      {/* Total Liabilities Card (two-tone with inner header, curved body top) */}
      {/* <div style={{ borderRadius: 16, boxShadow: '0 6px 10px rgba(0,0,0,0.10)' }}>
          <div style={{
            background: '#FFF3E0',
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative'
          }}>
            <div style={{
              background: '#FFCC80',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '10px 16px',
              margin: '-18px -20px 12px -20px'
            }}>
              <div style={{ fontSize: 14, color: '#1F2937', fontWeight: 700, letterSpacing: '0.3px' }}>Total Liabilities</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#374151', lineHeight: 1.1 }}>
              {formatCurrency(summaryStats.totalLiabilities)}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginTop: 4 }}>
              Company Resources Value
            </div>
          </div>
        </div> */}

      {/* Net Worth Card (two-tone with inner header, curved body top) */}
      {/* <div style={{ borderRadius: 16, boxShadow: '0 6px 10px rgba(0,0,0,0.10)' }}>
          <div style={{
            background: '#E3F2FD',
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative'
          }}>
            <div style={{
              background: '#90CAF9',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '10px 16px',
              margin: '-18px -20px 12px -20px'
            }}>
              <div style={{ fontSize: 14, color: '#1F2937', fontWeight: 700, letterSpacing: '0.3px' }}>Net Worth</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#374151', lineHeight: 1.1 }}>
              {formatCurrency(summaryStats.totalAssets - summaryStats.totalLiabilities)}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginTop: 4 }}>
              Overall Financial Standing
            </div>
          </div>
        </div> */}

      {/* Total Accounts Card (two-tone with inner header, curved body top) */}
      {/* <div style={{ borderRadius: 16, boxShadow: '0 6px 10px rgba(0,0,0,0.10)' }}>
          <div style={{
            background: '#F3E5F5',
            borderRadius: 16,
            padding: '18px 20px',
            position: 'relative'
          }}>
            <div style={{
              background: '#CE93D8',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '10px 16px',
              margin: '-18px -20px 12px -20px'
            }}>
              <div style={{ fontSize: 14, color: '#1F2937', fontWeight: 700, letterSpacing: '0.3px' }}>Total Accounts</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#374151', lineHeight: 1.1 }}>
              {summaryStats.totalAccounts}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginTop: 4 }}>
              Registered Accounts
            </div>
          </div>
        </div> */}
      {/* </div> */}

      <div className="flex items-center gap-3 flex-wrap mt-2" style={{
        // background: 'var(--dashboard-card-bg)',
        // border: '1px solid var(--dashboard-box-border)',
        // borderRadius: 16,
        // padding: '12px 12px',
        // boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
        position: 'relative',
        zIndex: 20
      }}>
        {/* Search */}
        {/* <div className="flex items-center" style={{
          background: '#7878801F',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '8px 12px',
          minWidth: 140,
          width: 520,
          flex: '0 0 520px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}> */}
        {/* <input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ outline: 'none', background: 'transparent', width: '100%', fontSize: 14, color: '#111827' }}
          /> */}
        <div className="flex-grow min-w-0">
          <SearchTicket handleInputChangeParent={handleSearchChange} ChartOfAccounts={true} value={search} defaultValue={search} />
        </div>
        {/* </div> */}

        {/* Filters on right */}
        <div className="flex gap-2 sm:gap-3 items-center flex-wrap">
          {/* Type Filter */}
          <FormControl size="small" sx={{ 
            minWidth: { xs: 120, sm: 160, md: 180 },
            maxWidth: { xs: 120, sm: 160, md: 180 }
          }}>
            <InputLabel id="filter-type-label">Type</InputLabel>
            <Select
              labelId="filter-type-label"
              label="Type"
              value={filters.type}
              onChange={(e) => { setPageNum(1); setFilters((f) => ({ ...f, type: e.target.value })); }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0C79F7' },
                '& .MuiSelect-select': { backgroundColor: 'var(--dashboard-tab-box)', borderRadius: '8px' },
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="assets">Assets</MenuItem>
              <MenuItem value="liability">Liability</MenuItem>
              <MenuItem value="capital">Capital</MenuItem>
              <MenuItem value="expenses">Expenses</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          {/* Active Filter */}
          <FormControl size="small" sx={{ 
            minWidth: { xs: 100, sm: 140, md: 160 },
            maxWidth: { xs: 100, sm: 140, md: 160 }
          }}>
            <InputLabel id="filter-active-label">Active</InputLabel>
            <Select
              labelId="filter-active-label"
              label="Active"
              value={filters.isActive}
              onChange={(e) => { setPageNum(1); setFilters((f) => ({ ...f, isActive: e.target.value })); }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0C79F7' },
                '& .MuiSelect-select': { backgroundColor: 'var(--dashboard-tab-box)', borderRadius: '8px' },
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
        </div>

        {/* Add Account button moved to header */}
      </div>

      <div className="mt-3">
        {loading ? (
          <LoadingAccountsView />
        ) : error ? (
          <div style={{ padding: 16, color: '#d32f2f' }}>{error}</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <Select
                  multiple
                  displayEmpty
                  value={visibleColumnIds}
                  onChange={(e) => {
                    const next = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    setVisibleColumnIds(next);
                  }}
                  input={<OutlinedInput />}
                  renderValue={() => "Select columns"}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 360,
                      },
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

            {tableColumns.length === 0 ? (
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
                data={tableRows}
                columns={tableColumns}
                accountingTable
                actionLabel={"Edit"}
                onActionClick={(row) => openEdit(row)}
                onRowClick={handleRowClick}
                onDeleteClick={handleDeleteClick}
                deleteLabel={"Delete"}
                // Server-side pagination props like ChartOfAccountsDetail
                page={pageNum}
                rowsPerPage={rowsPerPage}
                totalCount={totalCount}
                onPageChange={(newPage) => setPageNum(newPage)}
                onRowsPerPageChange={(newRowsPerPage) => {
                  setRowsPerPage(newRowsPerPage);
                  setPageNum(1);
                }}
              />
            )}
          </>
          // <AgentTable
          //   columns={tableColumns}
          //   data={tableRows}
          //   page={pageNum}
          //   rowsPerPage={rowsPerPage}
          //   totalCount={totalCount}
          //   onPageChange={(newPage) => setPageNum(newPage)}
          //   onRowsPerPageChange={(newRowsPerPage) => {
          //     setRowsPerPage(newRowsPerPage);
          //     setPageNum(1);
          //   }}
          //   accountingTable
          //   actionLabel={"Edit"}
          //   onActionClick={(row) => openEdit(row)}
          //   onRowClick={(row) => navigate(`/home/chart-of-accounts/${row.id}`)}
          // />
        )}
      </div>

      <AddAccountModal
        open={editOpen}
        onClose={closeEdit}
        accessToken={accessToken}
        mode={'edit'}
        initialAccount={selectedAccount}
        editableFields={['accountName', 'description', 'openingBalance', 'accountType', 'parentId', 'accountClass']}
        onSubmit={submitEdit}
      />

      <AddAccountModal
        open={open}
        onClose={() => setOpen(false)}
        accessToken={accessToken}
        onCreated={async () => {
          setPageNum(1);
          const queryParams = new URLSearchParams({
            paginate: 'true',
            limit: rowsPerPage.toString(),
            page: '1'
          });
          if (search) queryParams.append('keyword', search);
          if (filters.type) queryParams.append('type', filters.type);
          if (filters.subType) queryParams.append('subType', filters.subType);
          if (filters.isActive !== "") queryParams.append('isActive', filters.isActive);
          if (filters.parentId !== "") queryParams.append('parentId', filters.parentId);
          if (filters.normalBalance) queryParams.append('normalBalance', filters.normalBalance);
          if (filters.isSystemAccount !== "") queryParams.append('isSystemAccount', filters.isSystemAccount);
          if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
          if (filters.tenantId) queryParams.append('tenantId', filters.tenantId);
          const url = `${baseURl}account/?${queryParams.toString()}`;
          const refreshResponse = await getRequestWithOutBody(url, accessToken);
          const list = refreshResponse?.data?.data || [];
          setData(Array.isArray(list) ? list : []);
          setTotalCount(Number(refreshResponse?.data?.totalRecords) || 0);
          setOpen(false);
        }}
      />

      {/* Info Dialog */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)}>
        <DialogTitle>{infoTitle || 'Information'}</DialogTitle>
        <DialogContent>
          <div style={{ maxWidth: 420, color: 'var(--sidebar-text-primary)', marginTop: 4 }}>{infoMessage}</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={deleting ? undefined : () => setConfirmOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <div style={{ maxWidth: 420, color: 'var(--sidebar-text-primary)', marginTop: 4 }}>
            Are you sure you want to delete this account{pendingDelete?.name ? ` "${String(pendingDelete.name).replace(/\u00A0/g, '').trim()}"` : ''}? This action cannot be undone.
          </div>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleting} onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={() => proceedDelete()} disabled={deleting} startIcon={deleting ? <CircularProgress size={16} /> : null}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sub-Accounts Warning Dialog */}
      <Dialog open={subAccountDeleteOpen} onClose={deleting ? undefined : () => { setSubAccountDeleteOpen(false); setSubAccountDeleteInfo(null); }}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <div style={{ maxWidth: 460, color: 'var(--sidebar-text-primary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>
            {`This account has active ${Number(subAccountDeleteInfo?.subAccountCount || 0)} sub-accounts.

If you delete it, the sub-accounts and all related data will also be deleted.

Are you sure you want to delete it?`}
          </div>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleting} onClick={() => { setSubAccountDeleteOpen(false); setSubAccountDeleteInfo(null); }}>Close</Button>
          <Button
            color="warning"
            disabled={deleting}
            onClick={() => {
              if (!subAccountDeleteInfo?.id) return;
              setSubAccountDeleteOpen(false);
              setSubAccountDeleteInfo(null);
              proceedDelete({ deleteConfirm: true, id: subAccountDeleteInfo.id, name: subAccountDeleteInfo.name || '' });
            }}
            startIcon={deleting ? <CircularProgress size={16} /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
