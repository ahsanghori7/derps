import React, { useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo4k.png";
import { useDispatch, useSelector } from "react-redux";
import ThemeToggle from "../ThemeToggle";
import { SVG } from "../../assets/svg";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import BottonWithIcon from "../ButtonWithIcon";
import { signin } from "../../Store/Reducers/signinSlice";
import { HiSearch } from "react-icons/hi";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Dialog, useMediaQuery, useTheme } from "@mui/material";
import { useNotifications } from "../../Contexts/NotificationContext";
import { canAccessNotifications } from "../../Utils/moduleAccess";
import CompanySwitcher from "../CompanySwitcher";
import CompanySwitchBanner from "../CompanySwitchBanner";
import { getActiveCompany } from "../../Utils/tenantGroup";

dayjs.extend(utc);

const NotificationBellIcon = () => (
  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

function NavbarNotificationButton({ onNavigate }) {
  const { newNotificationCount: notificationUnreadCount = 0 } = useNotifications() ?? {};
  const showNotificationBadge = (notificationUnreadCount ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={() => onNavigate("/home/notifications/")}
      aria-label="Notifications"
      title="Notifications"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        padding: 0,
        border: "none",
        borderRadius: 8,
        backgroundColor: "transparent",
        color: "var(--navbar-text)",
        cursor: "pointer",
      }}
      className="md:!w-10 md:!h-10"
    >
      <NotificationBellIcon />
      {showNotificationBadge && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            width: 8,
            height: 8,
            backgroundColor: "#ef4444",
            borderRadius: "50%",
            border: "2px solid var(--navbar-bg)",
            zIndex: 1,
          }}
        />
      )}
    </button>
  );
}

const searchFieldStyle = {
  marginTop: 8,
  height: 42,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)",
  backgroundColor: "rgba(0,0,0,0.03)",
  padding: "0 12px",
  color: "var(--dashboard-text-primary)",
  outline: "none",
};

const datePickerSlotProps = {
  textField: {
    fullWidth: true,
    size: "small",
    placeholder: "MM/DD/YYYY",
    sx: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 2,
        backgroundColor: "rgba(0,0,0,0.03)",
        height: 42,
      },
    },
  },
  popper: {
    sx: { zIndex: 5000 },
  },
};

function FieldLabel({ icon, children }) {
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: "var(--dashboard-text-primary)", opacity: 0.9 }}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

function AdvancedSearchFilters({
  filters,
  setFilters,
  accounts,
  accountsHasMore,
  fetchAccounts,
  accountsLimit,
  accountsLoadingMore,
  onClear,
  onApply,
  stacked = false,
}) {
  return (
    <div className={stacked ? "grid grid-cols-1 gap-3" : "grid grid-cols-3 gap-3"}>
      <div>
        <FieldLabel
          icon={(
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        >
          Transaction Type
        </FieldLabel>
        <select
          value={filters?.transactionType ?? ""}
          onChange={(e) => setFilters((p) => ({ ...p, transactionType: e.target.value }))}
          className="w-full"
          style={searchFieldStyle}
        >
          <option value="">All Types</option>
          <option value="invoice">Invoice</option>
          <option value="bill">Bill</option>
          <option value="purchase-order">Purchase Order</option>
        </select>
      </div>

      <div>
        <FieldLabel
          icon={(
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2 2 7l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          )}
        >
          Status
        </FieldLabel>
        <select
          value={filters?.status ?? ""}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          className="w-full"
          style={searchFieldStyle}
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="active">Active</option>
          <option value="un-paid">Un-paid</option>
        </select>
      </div>

      <div>
        <FieldLabel
          icon={(
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        >
          Account
        </FieldLabel>
        <select
          value={filters?.account ?? ""}
          onChange={(e) => setFilters((p) => ({ ...p, account: e.target.value }))}
          className="w-full"
          style={{ ...searchFieldStyle, height: 34 }}
        >
          <option value="">All Accounts</option>
          {(accounts ?? []).map((a, idx) => (
            <option key={a?.id ?? idx} value={a?.id ?? ""}>
              {a?.code ? `${a.code} - ` : ""}{a?.name ?? ""}
            </option>
          ))}
        </select>
        {accountsHasMore && (
          <button
            type="button"
            onClick={() => fetchAccounts(accountsLimit + 50)}
            disabled={accountsLoadingMore}
            className="mt-2"
            style={{
              ...searchFieldStyle,
              width: "100%",
              height: 34,
              opacity: accountsLoadingMore ? 0.6 : 1,
              cursor: accountsLoadingMore ? "not-allowed" : "pointer",
            }}
          >
            {accountsLoadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </div>

      <div>
        <FieldLabel
          icon={(
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        >
          Date From
        </FieldLabel>
        <div className="mt-2" style={{ width: "100%" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              format="MM/DD/YYYY"
              value={filters?.dateFrom ? dayjs.utc(filters.dateFrom) : null}
              onChange={(value) => {
                const dateStr = value ? dayjs(value).format("YYYY-MM-DD") : "";
                setFilters((p) => ({ ...p, dateFrom: dateStr }));
              }}
              slotProps={datePickerSlotProps}
            />
          </LocalizationProvider>
        </div>
      </div>

      <div>
        <FieldLabel
          icon={(
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        >
          Date To
        </FieldLabel>
        <div className="mt-2" style={{ width: "100%" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              format="MM/DD/YYYY"
              value={filters?.dateTo ? dayjs.utc(filters.dateTo) : null}
              onChange={(value) => {
                const dateStr = value ? dayjs(value).format("YYYY-MM-DD") : "";
                setFilters((p) => ({ ...p, dateTo: dateStr }));
              }}
              slotProps={datePickerSlotProps}
            />
          </LocalizationProvider>
        </div>
      </div>

      <div className={stacked ? "flex items-end justify-end gap-3" : "flex items-end justify-end gap-3"} style={stacked ? undefined : { gridColumn: "span 3" }}>
        <button
          type="button"
          onClick={onClear}
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 10,
            border: "1px solid var(--dashboard-border)",
            backgroundColor: "transparent",
            color: "var(--dashboard-text-primary)",
            fontWeight: 700,
          }}
        >
          Clear Filters
        </button>
        <button
          type="button"
          onClick={onApply}
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 10,
            border: "1px solid var(--dashboard-border)",
            backgroundColor: "#24282E",
            color: "#fff",
            fontWeight: 800,
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

function MasterSearchResults({
  listRef,
  maxHeight,
  showMasterSearch,
  masterSearchLoading,
  filteredMasterResults,
  searchText,
  masterSearchLoadingMore,
  onResultClick,
}) {
  return (
    <div ref={listRef} style={{ maxHeight, height: maxHeight === "100%" ? "100%" : undefined, overflowY: "auto" }}>
      <div key={searchText}>
        {showMasterSearch ? (
          <>
            {masterSearchLoading && (
              <div style={{ padding: "14px", color: "var(--dashboard-text-primary)", opacity: 0.8 }}>
                Loading...
              </div>
            )}

            {!masterSearchLoading && (filteredMasterResults ?? []).map((r, idx) => (
              <div
                key={r?.id || idx}
                className="flex items-center justify-between"
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  color: "var(--dashboard-text-primary)",
                }}
                onClick={() => onResultClick(r)}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold truncate">
                    {String(r?.transactionNo || r?.id || "Result")}
                  </div>
                  <div className="text-[12px] opacity-80 truncate">
                    {String(r?.transactionType || "")}
                    {r?.partyName ? ` | ${String(r?.partyName)}` : ""}
                    {r?.transactionDate ? ` | ${String(r?.transactionDate).split("T")[0]}` : ""}
                  </div>
                </div>
                <div className="text-[14px] font-semibold" style={{ marginLeft: 12 }}>
                  {r?.amount ?? ""}
                </div>
              </div>
            ))}

            {!masterSearchLoading && (filteredMasterResults?.length ?? 0) === 0 && (
              <div style={{ padding: "14px", color: "var(--dashboard-text-primary)", opacity: 0.8 }}>
                No results
              </div>
            )}

            {!masterSearchLoading && masterSearchLoadingMore && (
              <div style={{ padding: "14px", color: "var(--dashboard-text-primary)", opacity: 0.8 }}>
                Loading more...
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: "14px", color: "var(--dashboard-text-primary)", opacity: 0.8 }}>
            Apply filters to search
          </div>
        )}
      </div>
    </div>
  );
}

function Navbar() {
  const accessToken = useSelector((state) => state?.auth?.accessToken);
  const userData = useSelector((state) => state?.userData?.userDetails);
  const tenantLogo = useSelector((state) => state?.auth?.tenantLogo);
  const tenantFeatures = useSelector((state) => state?.auth?.tenantFeatures ?? []);
  const scopes = useSelector((state) => state?.auth?.scopes ?? []);
  const tenantGroup = useSelector((state) => state?.auth?.tenantGroup);
  const dispatch = useDispatch();
  const navigation = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isWideNavbar = useMediaQuery(theme.breakpoints.up('lg'));
  const isCompactNavbar = useMediaQuery('(max-width:767px)');

  // Use tenant logo from Redux state, fallback to default logo
  const logoSrc = tenantLogo || logo;
  const activeCompany = getActiveCompany(tenantGroup);
  const canSwitchCompanies = Boolean(tenantGroup?.canSwitch) && (tenantGroup?.companies?.length || 0) > 1;
  const tenantName = activeCompany?.name || userData?.tenant?.name || "Company";
  const [logoError, setLogoError] = useState(false);
  const showCompanyName = !tenantLogo || logoError;
  const showBrand = !canSwitchCompanies || !showCompanyName;
  const showNavbarBrand = showBrand && !(isCompactNavbar && canSwitchCompanies);

  useEffect(() => {
    setLogoError(false);
  }, [tenantLogo]);

  const [signInStatus, setSignInStatus] = useState(false);
  const [loader, setLoader] = useState(true);
  const apiCalledRef = useRef(false);

  const [accounts, setAccounts] = useState([]);
  const [accountsHasMore, setAccountsHasMore] = useState(false);
  const [accountsLimit, setAccountsLimit] = useState(50);
  const [accountsLoadingMore, setAccountsLoadingMore] = useState(false);
  const accountsCountRef = useRef(0);

  const [searchText, setSearchText] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchDropdownRef = useRef(null);

  const [masterSearchResults, setMasterSearchResults] = useState([]);
  const [masterSearchLoading, setMasterSearchLoading] = useState(false);
  const [masterSearchHasMore, setMasterSearchHasMore] = useState(false);
  const [masterSearchLimit, setMasterSearchLimit] = useState(50);
  const [masterSearchLoadingMore, setMasterSearchLoadingMore] = useState(false);
  const masterSearchReqIdRef = useRef(0);
  const masterSearchListRef = useRef(null);
  const masterSearchCountRef = useRef(0);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef(null);
  const [filters, setFilters] = useState({
    transactionType: "",
    status: "",
    account: "",
    dateFrom: "",
    dateTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    transactionType: "",
    status: "",
    account: "",
    dateFrom: "",
    dateTo: "",
  });

  // ✅ NEW: button loading + action lock
  const [buttonLoading, setButtonLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "signin" | "signout" | null

  const roleTitle = (userData?.roleTitle || '').toLowerCase();
  const hideSignInOutButton = roleTitle === 'admin' || roleTitle === 'super admin' || roleTitle === 'client' || roleTitle === 'agent' || !userData?.id;

  const hasNotificationsAccess = useMemo(
    () =>
      canAccessNotifications({
        tenantFeatures,
        scopes,
        roleTitle: userData?.roleTitle,
      }),
    [tenantFeatures, scopes, userData?.roleTitle]
  );

  const hasAccountingFeatureAccess = useMemo(() => {
    if (roleTitle === 'admin') {
      if (!Array.isArray(tenantFeatures) || !tenantFeatures.length) return false;
      return tenantFeatures.some((tf) => {
        const enabled =
          tf?.isEnabled === true || tf?.isEnabled === 1 || tf?.isEnabled === '1';
        if (!enabled) return false;
        const moduleCode = String(
          tf?.feature?.moduleCode ?? tf?.feature?.category ?? ''
        )
          .trim()
          .toLowerCase();
        return moduleCode === 'accounting';
      });
    }
    // Non-admin: any accounting-related scope
    const accountingScopes = new Set([
      'invoices', 'chartofaccounts', 'suppliers', 'vendors', 'journalentry',
      'accountsreports', 'reports', 'salescustomers', 'payroll', 'agentpayout',
      'accounts', 'account-reports', 'sales-customers', 'journal', 'expenses',
      'bills', 'reconciliation', 'sales',
    ]);
    return (Array.isArray(scopes) ? scopes : []).some((s) =>
      accountingScopes.has(String(s || '').trim().toLowerCase())
    );
  }, [roleTitle, tenantFeatures, scopes]);

  const hideNotificationButton = roleTitle === 'agent' || !hasNotificationsAccess;
  const masterSearchAllowedRoles = new Set([
    "admin",
    "support",
    "tech support",
    "technical support",
    "human resource",
    "accountant",
  ]);
  const canUseMasterSearch =
    masterSearchAllowedRoles.has(roleTitle) && hasAccountingFeatureAccess;

  // ✅ make fetchData3 return a promise so we can await it safely
  const fetchData3 = async () => {
    if (!accessToken || !userData?.id) return;

    setLoader(true);

    try {
      const result = await getRequestWithOutBody(
        `${baseURl}attendance/check-signin-status/${userData?.id}`,
        accessToken
      );

      // ✅ strict boolean
      const isSignedIn = result?.data?.isSignedIn === true;
      setSignInStatus(isSignedIn);
    } catch (error) {
      setSignInStatus(false);
    } finally {
      setLoader(false);
    }
  };

  useEffect(() => {
    masterSearchCountRef.current = masterSearchResults.length;
  }, [masterSearchResults]);

  useEffect(() => {
    accountsCountRef.current = accounts.length;
  }, [accounts]);

  const fetchMasterSearch = async (filtersToUse, query = "", limit = 50) => {
    if (!accessToken) return;

    const LIMIT_STEP = 50;
    const params = new URLSearchParams();
    params.set("transactionType", filtersToUse?.transactionType || "");
    params.set("accountId", filtersToUse?.account || "");
    params.set("dateFrom", filtersToUse?.dateFrom || "");
    params.set("dateTo", filtersToUse?.dateTo || "");
    params.set("status", filtersToUse?.status || "");
    if (query) params.set("keyword", query);
    params.set("limit", String(limit));

    const url = `${baseURl}master-search?${params.toString()}`;

    const reqId = ++masterSearchReqIdRef.current;
    if (limit === LIMIT_STEP) {
      setMasterSearchLoading(true);
      setMasterSearchLoadingMore(false);
    } else {
      setMasterSearchLoadingMore(true);
    }
    try {
      const json = await getRequestWithOutBody(url, accessToken);
      if (reqId !== masterSearchReqIdRef.current) return;
      // Response: { data: { results: [...] } }
      const raw = json?.data?.results ?? json?.data ?? json ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setMasterSearchLimit(limit);
      const alreadyHave = limit === LIMIT_STEP ? 0 : masterSearchCountRef.current;
      const nextChunk = limit === LIMIT_STEP ? list : list.slice(alreadyHave);

      setMasterSearchResults((prev) => {
        if (limit === LIMIT_STEP) return list;
        return nextChunk.length ? [...prev, ...nextChunk] : prev;
      });

      if (limit !== LIMIT_STEP && list.length <= alreadyHave) {
        setMasterSearchHasMore(false);
      } else {
        setMasterSearchHasMore(list.length === limit);
      }
    } catch (e) {
      if (reqId !== masterSearchReqIdRef.current) return;
      if (limit === LIMIT_STEP) {
        setMasterSearchResults([]);
      }
      setMasterSearchHasMore(false);
    } finally {
      if (reqId === masterSearchReqIdRef.current) {
        setMasterSearchLoading(false);
        setMasterSearchLoadingMore(false);
      }
    }
  };

  const fetchAccounts = async (limit = 50) => {
    if (!accessToken) return;
    const LIMIT_STEP = 50;
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", String(limit));
    const url = `${baseURl}account/?${params.toString()}`;
    try {
      if (limit !== LIMIT_STEP) setAccountsLoadingMore(true);
      const json = await getRequestWithOutBody(url, accessToken);
      const list = json?.data?.data ?? json?.data ?? [];
      const flat = Array.isArray(list) ? list : [];
      const alreadyHave = limit === LIMIT_STEP ? 0 : accountsCountRef.current;
      const nextChunk = limit === LIMIT_STEP ? flat : flat.slice(alreadyHave);
      const mappedNext = nextChunk.map((a) => ({
        id: a?.id ?? "",
        name: a?.name || a?.accountName || "",
        code: a?.code || a?.accountCode || "",
        type: a?.type || a?.accountType || "",
      }));

      setAccountsLimit(limit);
      setAccounts((prev) => (limit === LIMIT_STEP ? mappedNext : [...prev, ...mappedNext]));
      setAccountsHasMore(flat.length === limit);
    } catch (e) {
      setAccounts([]);
      setAccountsHasMore(false);
    } finally {
      setAccountsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!userData || !accessToken) return;

    if (!apiCalledRef.current && userData?.id) {
      fetchData3();
      apiCalledRef.current = true;
    }
  }, [userData, accessToken]);

  useEffect(() => {
    if (!canUseMasterSearch) return;
    setAccountsLimit(50);
    // fetchMasterSearch(appliedFilters, "", 150);
    fetchAccounts(50);
  }, [accessToken, canUseMasterSearch]);

  // Debounced master-search when typing in search input

  useEffect(() => {
    if (!canUseMasterSearch) return;
    if (!accessToken) return;
    if (!searchDropdownOpen && !mobileSearchOpen) return;
    const q = String(searchText || "").trim();

    const hasAnyAppliedFilter = Boolean(
      appliedFilters?.transactionType ||
        appliedFilters?.status ||
        appliedFilters?.account ||
        appliedFilters?.dateFrom ||
        appliedFilters?.dateTo
    );

    if (!q && !hasAnyAppliedFilter) {
      masterSearchReqIdRef.current += 1;
      setMasterSearchResults([]);
      setMasterSearchHasMore(false);
      setMasterSearchLimit(50);
      setMasterSearchLoading(false);
      setMasterSearchLoadingMore(false);
      return;
    }

    setMasterSearchResults([]);
    setMasterSearchHasMore(false);
    setMasterSearchLimit(50);

    const t = setTimeout(() => {
      fetchMasterSearch(appliedFilters, q, 50);
    }, 350);

    return () => clearTimeout(t);
  }, [searchText, searchDropdownOpen, mobileSearchOpen, accessToken, appliedFilters, canUseMasterSearch]);

  useEffect(() => {
    if (!canUseMasterSearch) return;
    if (!searchDropdownOpen && !mobileSearchOpen) return;
    const listEl = masterSearchListRef.current;
    if (!listEl) return;

    const handleScroll = () => {
      const nearBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 24;
      if (!nearBottom || masterSearchLoading || masterSearchLoadingMore || !masterSearchHasMore) return;
      fetchMasterSearch(appliedFilters, String(searchText || "").trim(), masterSearchCountRef.current + 50);
    };

    listEl.addEventListener("scroll", handleScroll);
    return () => {
      listEl.removeEventListener("scroll", handleScroll);
    };
  }, [
    searchDropdownOpen,
    mobileSearchOpen,
    masterSearchLoading,
    masterSearchLoadingMore,
    masterSearchHasMore,
    masterSearchLimit,
    appliedFilters,
    searchText,
    canUseMasterSearch,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileSearchOpen) return;
      // Don't close if clicking on MUI DatePicker elements (calendar popup)
      const target = event.target;
      const isMuiDatePicker =
        target?.closest?.(".MuiPickersPopper-root") ||
        target?.closest?.("[role='dialog']") ||
        target?.closest?.(".MuiDateCalendar-root") ||
        target?.closest?.(".MuiDayCalendar-monthContainer");
      if (isMuiDatePicker) return;

      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
        setAdvancedOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileSearchOpen]);

  const handleLogoClick = () => {
    const pathname = location?.pathname ?? "";
    if (pathname.startsWith('/home')) {
      navigation('/home/dashboardScreen');
    } else if (pathname.startsWith('/userDashboard')) {
      navigation('/userDashboard/userMemo');
    }
  };

  const handleButtonClick = async () => {
    // ✅ HARD BLOCK double click (even if UI disable doesn’t work)
    if (buttonLoading) return;

    if (!accessToken || !userData?.id) {
      toast.error("User / token missing");
      return;
    }

    const payload = { userId: userData?.id };

    // ✅ LOCK action based on current status at click time
    const action = signInStatus ? "signout" : "signin";
    setPendingAction(action);
    setButtonLoading(true);

    apiCalledRef.current = false;

    try {
      if (action === "signout") {
        const result = await postRequestWithBodyAndToken(`${baseURl}attendance/signout`, accessToken, payload);
        dispatch(signin(false));
        toast.success(result?.message || "Signed out");
      } else {
        const result = await postRequestWithBodyAndToken(`${baseURl}attendance/signin`, accessToken, payload);
        dispatch(signin(true));
        toast.success(result?.message || "Signed in");
      }

      // ✅ refresh status AFTER API
      await fetchData3();
    } catch (error) {
      toast.error(error?.message || "Something went wrong");
    } finally {
      setButtonLoading(false);
      setPendingAction(null);
    }
  };

  const buttonTitle = buttonLoading
    ? (pendingAction === "signout" ? "Signing Out..." : "Signing In...")
    : (signInStatus ? "Sign Out" : "Sign In");

  const buttonColor = buttonLoading
    ? (pendingAction === "signout" ? "#FF0000" : "var(--sidebar-text-selected)")
    : (signInStatus ? "#FF0000" : "var(--sidebar-text-selected)");

  const buttonBorder = signInStatus ? "1px solid #FF0000" : "1px solid #0C79F7";

  // Use master search results directly (API already filters by query)
  const filteredMasterResults = useMemo(() => {
    const list = Array.isArray(masterSearchResults) ? masterSearchResults : [];
    const q = String(searchText || "").trim().toLowerCase();
    if (!q) return list;

    return list.filter((item) => {
      if (!item) return false;
      const haystacks = [
        item?.transactionType,
        item?.transactionNo,
        item?.amount,
        item?.status,
        item?.partyName,
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((v) => String(v).toLowerCase());

      for (const h of haystacks) {
        if (h.includes(q)) return true;
      }
      return false;
    });
  }, [masterSearchResults, searchText]);

  const hasAnyAppliedFilter = Boolean(
    appliedFilters?.transactionType ||
    appliedFilters?.status ||
    appliedFilters?.account ||
    appliedFilters?.dateFrom ||
    appliedFilters?.dateTo
  );

  // Show master search results when filters are applied OR when we have results
  const showMasterSearch = hasAnyAppliedFilter || (masterSearchResults?.length ?? 0) > 0 || masterSearchLoading || Boolean(String(searchText ?? "").trim());

  const activeFilterChips = [
    appliedFilters?.transactionType ? { key: "transactionType", label: `Type: ${appliedFilters.transactionType}` } : null,
    appliedFilters?.status ? { key: "status", label: `Status: ${appliedFilters.status}` } : null,
    appliedFilters?.account ? { key: "account", label: `Account: ${appliedFilters.account}` } : null,
    appliedFilters?.dateFrom ? { key: "dateFrom", label: `From: ${appliedFilters.dateFrom}` } : null,
    appliedFilters?.dateTo ? { key: "dateTo", label: `To: ${appliedFilters.dateTo}` } : null,
  ].filter(Boolean);

  const activeFiltersCount = activeFilterChips?.length ?? 0;

  const getMasterSearchDetailPath = (item) => {
    if (!item) return "";

    const itemId = item?.id || item?.transactionId || item?.invoiceId || "";
    const transactionType = String(item?.transactionType || "").toLowerCase().trim();
    const transactionNo = item?.transactionNo ? String(item?.transactionNo) : "";
    const supplierId = item?.supplierId || item?.partyId || "";
    const partyType = String(item?.partyType || "").toLowerCase().trim();

    // If API starts sending direct path in future, use it first.
    if (typeof item?.route === "string" && item?.route?.trim()) return item.route.trim();
    if (typeof item?.path === "string" && item?.path?.trim()) return item.path.trim();

    const homePrefix = "/home";

    if (transactionType === "invoice" && itemId) {
      // editInvoice page hydrates full invoice via `?id=...`, so it reliably opens detail.
      return `${homePrefix}/editInvoice/?id=${encodeURIComponent(String(itemId))}`;
    }

    if (transactionType.includes("ticket") && itemId) {
      return `${homePrefix}/singleTicket/?id=${encodeURIComponent(String(itemId))}`;
    }

    if (transactionType === "purchase-order" || transactionType === "bill") {
      if (itemId) return `${homePrefix}/editPurchase/?id=${encodeURIComponent(String(itemId))}`;
      return `${homePrefix}/editPurchase/`;
    }

    if (transactionType.includes("journal")) {
      if (itemId) return `${homePrefix}/editJournalEntry/${encodeURIComponent(String(itemId))}`;
      return `${homePrefix}/journalEntry/`;
    }

    if (transactionType.includes("payroll")) {
      return `${homePrefix}/payroll/`;
    }

    if (transactionType.includes("tax")) {
      return `${homePrefix}/taxReports/`;
    }

    if (partyType === "customer") {
      return `${homePrefix}/salesCustomers/`;
    }

    const queryValue = transactionNo || String(itemId || "");
    if (queryValue) {
      return `${homePrefix}/transactions/?keyword=${encodeURIComponent(queryValue)}`;
    }

    return `${homePrefix}/transactions/`;
  };

  const handleMasterResultClick = (item) => {
    const detailPath = getMasterSearchDetailPath(item);
    const label = item?.transactionNo || item?.id;
    const transactionType = String(item?.transactionType || "").toLowerCase().trim();
    if (label) setSearchText(String(label));
    setSearchDropdownOpen(false);
    setMobileSearchOpen(false);
    setAdvancedOpen(false);
    if (detailPath) {
      const navState =
        transactionType === "purchase-order" || transactionType === "bill"
          ? { masterSearchItem: item, itemData: { id: item?.id || item?.transactionId || item?.invoiceId } }
          : { masterSearchItem: item };
      navigation(detailPath, { state: navState });
    }
  };

  const handleRemoveChip = (key) => {
    setAppliedFilters((prev) => ({ ...prev, [key]: "" }));
    setFilters((prev) => ({ ...prev, [key]: "" }));
  };

  const handleClearAll = () => {
    const empty = { transactionType: "", status: "", account: "", dateFrom: "", dateTo: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setMasterSearchResults([]);
    setMasterSearchHasMore(false);
    setMasterSearchLimit(50);
  };

  const handleApplyFilters = () => {
    const nextFilters = filters ?? {};
    setAppliedFilters(nextFilters);
    setAdvancedOpen(false);
    setSearchDropdownOpen(true); // auto-open dropdown to show results
    setMasterSearchLimit(50);
    fetchMasterSearch(nextFilters, String(searchText ?? "").trim(), 50);
  };

  const openMobileSearch = () => {
    setAdvancedOpen(false);
    setSearchDropdownOpen(true);
    setMobileSearchOpen(true);
  };

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setSearchDropdownOpen(false);
    setAdvancedOpen(false);
  };

  useEffect(() => {
    if (!isCompactNavbar && mobileSearchOpen) {
      closeMobileSearch();
    }
  }, [isCompactNavbar, mobileSearchOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const t = setTimeout(() => mobileSearchInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [mobileSearchOpen]);

  return (
    <>
    <div
      className="sticky top-0 z-10"
      style={{ zIndex: 1800, flexShrink: 0 }}
    >
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: isCompactNavbar ? 4 : 8,
        backgroundColor: 'var(--navbar-bg)',
        minHeight: 64,
        height: 64,
        paddingTop: 0,
        paddingRight: isCompactNavbar ? 4 : 8,
        paddingBottom: 0,
        paddingLeft: isDesktop ? 64 : isCompactNavbar ? 44 : 52,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: isCompactNavbar ? 'hidden' : 'visible',
      }}
    >
      <div
        className="flex items-center min-w-0"
        style={{
          flex: isCompactNavbar ? '1 1 auto' : '0 0 auto',
          height: 40,
          gap: isCompactNavbar ? 4 : 8,
        }}
      >
        {showNavbarBrand && (
          showCompanyName ? (
          <a
            href="https://derps.gotmsolutions.com/home/dashboardScreen"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              handleLogoClick();
            }}
            style={{
              color: 'var(--navbar-text)',
              maxWidth: 120,
              lineHeight: 1.1,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexShrink: 0,
              height: 40,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {String(tenantName ?? "").split(' ').slice(0, 2).join(' ')}
            </span>
            {String(tenantName ?? "").split(' ').length > 2 && (
              <div style={{ fontSize: 12, fontWeight: 500 }}>
                {String(tenantName ?? "").split(' ').slice(2).join(' ')}
              </div>
            )}
          </a>
        ) : (
          <a
            href="https://derps.gotmsolutions.com/home/dashboardScreen"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              handleLogoClick();
            }}
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              height: 40,
            }}
          >
            <img
              src={logoSrc}
              alt="logo"
              className="block cursor-pointer object-contain"
              style={{ width: 'auto', maxWidth: isWideNavbar ? 128 : isDesktop ? 110 : 72, height: 36, objectFit: 'contain' }}
              onError={() => setLogoError(true)}
            />
          </a>
        )
        )}
        <CompanySwitcher />
      </div>

      {canUseMasterSearch && (
      <div
        className="hidden md:flex flex-1 min-w-0 px-2 lg:px-3"
        style={{ maxWidth: "min(760px, 100%)" }}
      >
        <div ref={searchDropdownRef} className="relative w-full min-w-0">
          <div className="flex items-center gap-2 w-full min-w-0">
            <div
              className="flex items-center gap-2 min-w-0"
              style={{
                flex: "1 1 auto",
                backgroundColor: "var(--dashboard-tab-box)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                height: 42,
                paddingLeft: 12,
                paddingRight: 12,
                overflow: "hidden",
              }}
              onClick={() => {
                setAdvancedOpen(false);
                setSearchDropdownOpen(true);
              }}
            >
              <HiSearch style={{ fontSize: 20, color: "var(--dashboard-text-primary)" }} />
              <input
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setAdvancedOpen(false);
                  setSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  setAdvancedOpen(false);
                  setSearchDropdownOpen(true);
                }}
                placeholder={isWideNavbar ? "Find Transactions, Customer, vendor and more......" : "Search..."}
                className="bg-transparent outline-none text-[14px] flex-1 min-w-0"
                style={{ color: "var(--dashboard-text-primary)" }}
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
              title="Advanced Search"
              aria-label="Advanced Search"
              style={{
                height: 42,
                borderRadius: 10,
                padding: isWideNavbar ? "0 14px" : "0 10px",
                backgroundColor: "transparent",
                border: "1px solid var(--navbar-border)",
                color: "var(--dashboard-text-primary)",
                fontWeight: 600,
                position: "relative",
              }}
              onClick={() => {
                setSearchDropdownOpen(false);
                setAdvancedOpen(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="hidden lg:inline">Advanced Search</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    backgroundColor: "#2563EB",
                    color: "#fff",
                    fontSize: 12,
                    height: 20,
                    minWidth: 20,
                    padding: "0 6px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {searchDropdownOpen && (
            <div
              className="absolute left-0 right-0"
              style={{
                marginTop: 10,
                backgroundColor: "var(--dashboard-tab-box)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 2500,
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  color: "var(--dashboard-text-primary)",
                  fontWeight: 700,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 8V12L14 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span>{showMasterSearch ? "Search results" : "Search"}</span>
              </div>

              <MasterSearchResults
                listRef={!mobileSearchOpen ? masterSearchListRef : undefined}
                maxHeight={320}
                showMasterSearch={showMasterSearch}
                masterSearchLoading={masterSearchLoading}
                filteredMasterResults={filteredMasterResults}
                searchText={searchText}
                masterSearchLoadingMore={masterSearchLoadingMore}
                onResultClick={handleMasterResultClick}
              />
            </div>
          )}

          {advancedOpen && (
            <div
              className="absolute left-0 right-0"
              style={{
                marginTop: 10,
                backgroundColor: "var(--dashboard-tab-box)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 2500,
              }}
            >
              <div
                className="flex items-center gap-3"
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  color: "var(--dashboard-text-primary)",
                  fontWeight: 600,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ opacity: 0.8, fontWeight: 700 }}>Active Filters:</span>
                {(activeFilterChips ?? []).map((chip) => (
                  <span
                    key={chip?.key}
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.06)",
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>{chip?.label ?? ""}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChip(chip?.key)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "transparent",
                        border: "none",
                        color: "var(--dashboard-text-primary)",
                        opacity: 0.8,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    marginLeft: 6,
                    backgroundColor: "transparent",
                    border: "none",
                    color: "var(--dashboard-text-primary)",
                    fontSize: 12,
                    fontWeight: 700,
                    opacity: 0.85,
                  }}
                >
                  Clear All
                </button>
              </div>

              <div style={{ padding: "14px" }}>
                <AdvancedSearchFilters
                  filters={filters}
                  setFilters={setFilters}
                  accounts={accounts}
                  accountsHasMore={accountsHasMore}
                  fetchAccounts={fetchAccounts}
                  accountsLimit={accountsLimit}
                  accountsLoadingMore={accountsLoadingMore}
                  onClear={handleClearAll}
                  onApply={handleApplyFilters}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      <div className={`flex items-center flex-shrink-0 ml-auto ${isCompactNavbar ? 'gap-0.5' : 'gap-2'}`}>
        {canUseMasterSearch && (
          <button
            type="button"
            className="md:hidden flex items-center justify-center flex-shrink-0"
            onClick={openMobileSearch}
            aria-label="Search"
            title="Search"
            style={{
              position: "relative",
              width: isCompactNavbar ? 36 : 40,
              height: isCompactNavbar ? 36 : 40,
              padding: 0,
              border: "none",
              borderRadius: 8,
              backgroundColor: "transparent",
              color: "var(--navbar-text)",
              cursor: "pointer",
            }}
          >
            <HiSearch style={{ fontSize: 22 }} />
            {activeFiltersCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  backgroundColor: "#2563EB",
                  borderRadius: "50%",
                }}
              />
            )}
          </button>
        )}

        {accessToken && !hideNotificationButton && (
          <NavbarNotificationButton onNavigate={navigation} />
        )}

        <ThemeToggle />

        {!hideSignInOutButton && (
          // ✅ This wrapper ensures click is blocked visually + logically
          <div
            onClick={(e) => {
              if (buttonLoading) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            style={{
              opacity: buttonLoading ? 0.6 : 1,
              cursor: buttonLoading ? "not-allowed" : "pointer",
              userSelect: "none",
              marginRight: "8px",
              marginTop: "4px",
            }}
          >
            <BottonWithIcon
              backgroundColor={signInStatus ? 'transparent' : '#0C79F7'}
              svg={
                <SVG.SignInOut
                  style={{
                    width: 20,
                    height: 20,
                    color: signInStatus ? '#FF0000' : 'var(--sidebar-text-selected)'
                  }}
                />
              }
              title={buttonTitle}
              height={36}
              color={buttonColor}
              fontSize={14}
              border={buttonBorder}
              fontWeight={500}
              className="whitespace-nowrap justify-center flex-shrink-0 min-w-[80px] md:min-w-[100px]"
              onClick={handleButtonClick}
            />
          </div>
        )}
      </div>

      <Dialog
        open={mobileSearchOpen}
        onClose={closeMobileSearch}
        fullScreen
        sx={{ zIndex: 2200 }}
        PaperProps={{
          sx: {
            backgroundColor: "var(--navbar-bg)",
            backgroundImage: "none",
            color: "var(--dashboard-text-primary)",
          },
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              height: 56,
              padding: "0 8px 0 12px",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Search</span>
            <button
              type="button"
              onClick={() => setAdvancedOpen((open) => !open)}
              aria-label="Advanced Search"
              title="Advanced Search"
              style={{
                position: "relative",
                width: 40,
                height: 40,
                borderRadius: 8,
                border: advancedOpen ? "1px solid rgba(12,121,247,0.35)" : "1px solid var(--navbar-border)",
                backgroundColor: advancedOpen ? "rgba(12,121,247,0.08)" : "transparent",
                color: "var(--navbar-text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    backgroundColor: "#2563EB",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={closeMobileSearch}
              aria-label="Close search"
              title="Close"
              style={{
                width: 40,
                height: 40,
                border: "none",
                borderRadius: 8,
                backgroundColor: "transparent",
                color: "var(--navbar-text)",
                fontSize: 24,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: 12, flexShrink: 0 }}>
            <div
              className="flex items-center gap-2"
              style={{
                backgroundColor: "var(--dashboard-tab-box)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                height: 42,
                paddingLeft: 12,
                paddingRight: 12,
              }}
            >
              <HiSearch style={{ fontSize: 20, color: "var(--dashboard-text-primary)" }} />
              <input
                ref={mobileSearchInputRef}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setAdvancedOpen(false);
                }}
                placeholder="Search transactions, customer, vendor..."
                className="bg-transparent outline-none text-[14px] flex-1 min-w-0"
                style={{ color: "var(--dashboard-text-primary)" }}
              />
            </div>
          </div>

          {advancedOpen && (
            <div
              style={{
                padding: "0 12px 12px",
                flexShrink: 0,
                maxHeight: "46%",
                overflowY: "auto",
              }}
            >
              <AdvancedSearchFilters
                filters={filters}
                setFilters={setFilters}
                accounts={accounts}
                accountsHasMore={accountsHasMore}
                fetchAccounts={fetchAccounts}
                accountsLimit={accountsLimit}
                accountsLoadingMore={accountsLoadingMore}
                onClear={handleClearAll}
                onApply={handleApplyFilters}
                stacked
              />
            </div>
          )}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              borderTop: "1px solid rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <MasterSearchResults
              listRef={mobileSearchOpen ? masterSearchListRef : undefined}
              maxHeight="100%"
              showMasterSearch={showMasterSearch}
              masterSearchLoading={masterSearchLoading}
              filteredMasterResults={filteredMasterResults}
              searchText={searchText}
              masterSearchLoadingMore={masterSearchLoadingMore}
              onResultClick={handleMasterResultClick}
            />
          </div>
        </div>
      </Dialog>
    </div>
    <CompanySwitchBanner />
    </div>
    </>
  );
}

export default Navbar;