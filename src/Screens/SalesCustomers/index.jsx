import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Heading from "../../Components/Heading";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import MemoTable from "../../Components/MemoTable";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import {
  Checkbox,
  FormControl,
  ListSubheader,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import addIcon from "../../assets/addIcon.png";
import { usePageTitle } from "../../Hooks/usePageTitle";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import CloseIcon from "@mui/icons-material/Close";

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  flexWrap: "wrap",
  gap: 10,
});

const ICON_STYLES = {
  openBalance: { bg: "rgba(67, 121, 238, 0.12)", color: "#0C79F7" },
  overduePayment: { bg: "rgba(239, 56, 38, 0.12)", color: "#EF3826" },
};

const CustomerStatCard = ({ title, amount, subtitle, icon, loading }) => {
  const iconStyles = ICON_STYLES[icon] || ICON_STYLES.openBalance;
  const IconComponent =
    icon === "overduePayment" ? HighlightOffOutlinedIcon : AccessTimeOutlinedIcon;

  return (
    <div
      className="text-left flex-1 min-w-[200px] max-w-[280px]"
      style={{
        background: "var(--dashboard-card-bg)",
        borderRadius: 12,
        border: "1px solid var(--dashboard-box-border)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        padding: "16px 18px",
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>{title}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--sidebar-text-primary)",
              marginTop: 4,
            }}
          >
            {loading ? "—" : amount}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#64748B",
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 10,
            background: iconStyles.bg,
            color: iconStyles.color,
          }}
        >
          <IconComponent sx={{ fontSize: 22 }} />
        </span>
      </div>
    </div>
  );
};

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

export default function SalesCustomers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);

  usePageTitle("Sales Customers", location);

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get("rowsPerPage")) || 25);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const formatDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  const formatMoney = (value) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "$0.00";
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("paginate", "true");
      params.set("page", String(page));
      params.set("limit", String(rowsPerPage));
      params.set("orderBy", "createdAt");
      params.set("order", "desc");
      if (search.trim()) params.set("keyword", search.trim());

      const res = await getRequestWithOutBody(`${baseURl}customer?${params.toString()}`, accessToken);

      const apiData = res?.data ?? res;
      const rows = apiData?.results || apiData?.data?.results || apiData?.data || [];
      const count =
        apiData?.totalRecords ??
        apiData?.data?.totalRecords ??
        apiData?.pagination?.total ??
        apiData?.pagination?.totalRecords ??
        0;

      setCustomers(Array.isArray(rows) ? rows : []);
      setTotalCount(Number(count) || 0);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [accessToken, page, rowsPerPage, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (page > 1) params.set("page", page.toString());
    if (rowsPerPage !== 25) params.set("rowsPerPage", rowsPerPage.toString());

    setSearchParams(params);
  }, [search, page, rowsPerPage, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const res = await getRequestWithOutBody(`${baseURl}invoice/stats`, accessToken);
        const payload = (res?.data && (res?.data?.data ?? res?.data)) ?? res ?? null;
        setStats(payload || null);
      } catch (e) {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [accessToken]);

  useEffect(() => {
    const onFocus = () => {
      fetchCustomers();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filtered = customers;

  const pageCount = useMemo(() => {
    const total = Number(totalCount) || 0;
    return Math.max(1, Math.ceil(total / (rowsPerPage || 25)));
  }, [totalCount, rowsPerPage]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const allColumns = useMemo(
    () => [
      { id: "customerName", label: "CUSTOMER NAME", align: "left" },
      { id: "dbaName", label: "COMPANY NAME", align: "left" },
      { id: "legalName", label: "LEGAL NAME", align: "left" },
      { id: "phone", label: "PHONE NUMBER", align: "left" },
      { id: "email", label: "EMAIL", align: "left" },
      { id: "status", label: "STATUS", align: "left" },
      { id: "openBalance", label: "OPENING BALANCE", align: "right" },
      { id: "accountCode", label: "ACCOUNT CODE", align: "left" },
      { id: "currentBalance", label: "CURRENT BALANCE", align: "right" },
      { id: "agentName", label: "AGENT", align: "left" },
      { id: "website", label: "WEBSITE", align: "left" },
      { id: "legalAddress", label: "LEGAL ADDRESS", align: "left" },
      { id: "legalCity", label: "LEGAL CITY", align: "left" },
      { id: "businessCity", label: "BUSINESS CITY", align: "left" },
      { id: "state", label: "STATE", align: "left" },
      { id: "businessState", label: "BUSINESS STATE", align: "left" },
      { id: "businessZipCode", label: "BUSINESS ZIP", align: "left" },
      { id: "legalZipCode", label: "LEGAL ZIP", align: "left" },
      { id: "comment", label: "COMMENT", align: "left" },
      { id: "createdAt", label: "CREATED AT", align: "left" },
      { id: "updatedAt", label: "UPDATED AT", align: "left" },
      { id: "action", label: "ACTION", align: "right" },
    ],
    []
  );

  const defaultVisibleColumnIds = useMemo(
    () => ["legalName", "dbaName", "phone", "openBalance", "action"],
    []
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState(defaultVisibleColumnIds);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");

  const columns = useMemo(
    () => visibleColumnIds.map((id) => allColumns.find((c) => c.id === id)).filter(Boolean),
    [allColumns, visibleColumnIds]
  );

  const filteredColumns = useMemo(() => {
    if (!columnSearchQuery.trim()) return allColumns;
    const query = columnSearchQuery.trim().toLowerCase();
    return allColumns.filter(
      (col) =>
        col.label.toLowerCase().includes(query) || col.id.toLowerCase().includes(query)
    );
  }, [allColumns, columnSearchQuery]);

  const statCards = useMemo(
    () => [
      {
        key: "openBalance",
        title: "Open Balance",
        amount: formatMoney(stats?.openBalance),
        subtitle: "Open Balance",
        icon: "openBalance",
      },
      {
        key: "overduePayment",
        title: "Overdue Payment",
        amount: formatMoney(stats?.overduePayment),
        subtitle: "Overdue Payment",
        icon: "overduePayment",
      },
    ],
    [stats]
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (search.trim()) chips.push({ key: "search", label: `Search: ${search.trim()}` });
    const defaultColsKey = defaultVisibleColumnIds.join(",");
    const currentColsKey = visibleColumnIds.join(",");
    if (currentColsKey && currentColsKey !== defaultColsKey) {
      const colLabels = visibleColumnIds
        .map((id) => allColumns.find((c) => c.id === id)?.label || id)
        .filter(Boolean)
        .join(", ");
      chips.push({ key: "cols", label: `Column: ${colLabels}` });
    }
    return chips;
  }, [search, visibleColumnIds, defaultVisibleColumnIds, allColumns]);

  const removeFilterChip = useCallback(
    (key) => {
      if (key === "search") setSearch("");
      if (key === "cols") setVisibleColumnIds(defaultVisibleColumnIds);
      setPage(1);
    },
    [defaultVisibleColumnIds]
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setVisibleColumnIds(defaultVisibleColumnIds);
    setPage(1);
  }, [defaultVisibleColumnIds]);

  const handleApplyFilters = useCallback(() => {
    setPage(1);
  }, []);

  const data = (filtered || []).map((c) => ({
    id: c?.id,
    customerName:
      c?.dbaName ||
      [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim() ||
      c?.legalBusinessName ||
      "-",
    dbaName: c?.dbaName || "-",
    legalName: c?.legalBusinessName || "-",
    phone: c?.phoneNumber || c?.dbaPhoneNumber || c?.ownerPhoneNumber || "-",
    email: c?.email || c?.ownerEmail || "-",
    status: c?.status || "-",
    openBalance: formatMoney(c?.openingBalance ?? c?.openBalance ?? c?.account?.openingBalance),
    accountCode: c?.account?.code || "-",
    currentBalance: formatMoney(c?.account?.currentBalance),
    agentName: c?.agent?.name || c?.agent?.username || "-",
    website: c?.website || "-",
    legalAddress: c?.legalAddress || "-",
    legalCity: c?.legalCity || "-",
    businessCity: c?.businessCity || "-",
    state: c?.state || "-",
    businessState: c?.businessState || "-",
    businessZipCode: c?.businessZipCode || "-",
    legalZipCode: c?.legalZipCode || "-",
    comment: c?.comment || "-",
    createdAt: formatDateTime(c?.createdAt),
    updatedAt: formatDateTime(c?.updatedAt),
    action: "Create Invoice",
  }));

  return (
    <div
      className="min-h-screen"
      style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 20 }}
    >
      <HeaderWrapper>
        <Heading
          Fontweight={700}
          color={"var(--sidebar-text-primary)"}
          Heading={"Customers"}
          Fontsize={30}
        />
        <BottonWithIcon
          backgroundColor={"#0C79F7"}
          icon={addIcon}
          title={"Add Customers"}
          height={40}
          color={"var(--sidebar-text-selected)"}
          fontSize={16}
          fontWeight={500}
          className="!mb-0 !mx-0"
          onClick={() => navigate("/home/customerInfo")}
        />
      </HeaderWrapper>

      <div className="flex gap-3 flex-wrap mt-4">
        {statCards.map((card) => (
          <CustomerStatCard
            key={card.key}
            title={card.title}
            amount={card.amount}
            subtitle={card.subtitle}
            icon={card.icon}
            loading={statsLoading}
          />
        ))}
      </div>

      <div
        className="mt-4"
        style={{
          background: "var(--dashboard-card-bg)",
          border: "1px solid var(--dashboard-box-border)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          style={{
            background: "var(--chrome-filter-bar-bg)",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--chrome-search-icon)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyFilters();
            }}
            placeholder="Search customers..."
            style={{
              outline: "none",
              background: "transparent",
              width: "100%",
              fontSize: 14,
              border: "none",
              color: "var(--sidebar-text-primary)",
            }}
          />
        </div>

        <div className="flex justify-between items-end gap-3 flex-wrap">
          <div className="flex justify-start items-end gap-3 flex-wrap flex-1">
            <div style={{ minWidth: 180 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dashboard-text-primary)" }}>
                Column
              </label>
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  displayEmpty
                  value={visibleColumnIds}
                  onChange={(e) => {
                    const next =
                      typeof e.target.value === "string"
                        ? e.target.value.split(",")
                        : e.target.value;
                    setVisibleColumnIds(next);
                  }}
                  onClose={() => setColumnSearchQuery("")}
                  input={<OutlinedInput />}
                  renderValue={() => "Column"}
                  MenuProps={{
                    PaperProps: { sx: { maxHeight: 360 } },
                    autoFocus: false,
                    MenuListProps: { autoFocusItem: false },
                  }}
                  sx={{
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: "var(--dashboard-tab-box)",
                  }}
                >
                  <ListSubheader
                    sx={{ backgroundColor: "var(--dashboard-tab-box)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TextField
                      size="small"
                      placeholder="Search columns..."
                      fullWidth
                      value={columnSearchQuery}
                      onChange={(e) => setColumnSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </ListSubheader>
                  {filteredColumns.map((col) => (
                    <MenuItem key={col.id} value={col.id}>
                      <Checkbox checked={visibleColumnIds.indexOf(col.id) > -1} />
                      <ListItemText primary={col.label} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                height: 40,
                padding: "0 18px",
                borderRadius: 8,
                border: "1px solid var(--dashboard-box-border)",
                background: 'var(--dashboard-card-bg2)',
                color: 'var(--dashboard-text-primary)',
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              style={{
                height: 40,
                padding: "0 18px",
                borderRadius: 8,
                border: "none",
                background: "#24282E",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>

        {activeFilterChips.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3 items-center">
            {activeFilterChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => removeFilterChip(chip.key)}
              />
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center w-full mx-auto mt-10">
          <Loader message="Loading..." subMessage="Please wait" />
        </div>
      ) : (
        <div className="mt-4">
          {columns.length === 0 ? (
            <div
              style={{
                borderRadius: 12,
                background: "var(--dashboard-card-bg)",
                border: "1px solid var(--dashboard-box-border)",
                padding: 24,
                textAlign: "center",
                color: "#6B7280",
                fontWeight: 600,
              }}
            >
              Please select column
            </div>
          ) : data?.length === 0 ? (
            <NoDataFound title="No Data Found" description="No customers found." />
          ) : (
            <MemoTable
              data={data}
              columns={columns}
              accountingTable
              page={page}
              rowsPerPage={rowsPerPage}
              totalCount={totalCount}
              onPageChange={setPage}
              onRowsPerPageChange={(newRows) => {
                setRowsPerPage(newRows);
                setPage(1);
              }}
              onActionClick={(row) => {
                if ((row.action || "").toLowerCase().includes("invoice")) {
                  const url = `/home/createInvoice?customerId=${encodeURIComponent(row.id)}`;
                  navigate(url, { state: { customerId: row.id } });
                }
              }}
              onRowClick={(_event, row) => {
                if (!row?.id) return;
                const url = `/home/customerInvoices?customerId=${encodeURIComponent(row.id)}`;
                navigate(url, { state: { customerId: row.id } });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
