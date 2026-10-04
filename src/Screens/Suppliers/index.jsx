import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Checkbox,
  FormControl,
  ListItemText,
  ListSubheader,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
} from "@mui/material";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import ListSearchField from "../../Components/ListSearchField";
import MemoTable from "../../Components/MemoTable";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import addIcon from "../../assets/addIcon.png";
import { usePageTitle } from "../../Hooks/usePageTitle";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import CloseIcon from "@mui/icons-material/Close";

const ICON_STYLES = {
  purchaseOrders: { bg: "rgba(67, 121, 238, 0.12)", color: "#0C79F7" },
  billsPaid: { bg: "rgba(74, 196, 17, 0.15)", color: "#4AC411" },
  openBills: { bg: "rgba(254, 105, 1, 0.15)", color: "#FE6901" },
  overdueBills: { bg: "rgba(239, 56, 38, 0.12)", color: "#EF3826" },
};

const SupplierStatCard = ({ title, amount, subtitle, icon, loading }) => {
  const iconStyles = ICON_STYLES[icon] || ICON_STYLES.purchaseOrders;
  const IconComponent = {
    purchaseOrders: DescriptionOutlinedIcon,
    billsPaid: CheckCircleOutlineIcon,
    openBills: AccessTimeOutlinedIcon,
    overdueBills: HighlightOffOutlinedIcon,
  }[icon] || DescriptionOutlinedIcon;

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

export default function Suppliers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);

  usePageTitle("Suppliers", location);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get("rowsPerPage")) || 25);
  const [totalCount, setTotalCount] = useState(0);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");

  const formatDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  const formatMoney = (value) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "$0.00";
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const allColumns = useMemo(
    () => [
      { id: "supplier", label: "SUPPLIER", align: "left" },
      { id: "company", label: "COMPANY NAME", align: "left" },
      { id: "phone", label: "PHONE NUMBER", align: "right" },
      { id: "email", label: "EMAIL", align: "right" },
      { id: "directorName", label: "DIRECTOR NAME", align: "left" },
      { id: "directorEmail", label: "DIRECTOR EMAIL", align: "right" },
      { id: "address", label: "ADDRESS", align: "left" },
      { id: "city", label: "CITY", align: "left" },
      { id: "state", label: "STATE", align: "left" },
      { id: "zipCode", label: "ZIP CODE", align: "right" },
      { id: "website", label: "WEBSITE", align: "left" },
      { id: "establishmentYear", label: "EST. YEAR", align: "right" },
      { id: "accountId", label: "ACCOUNT ID", align: "right" },
      { id: "createdAt", label: "CREATED AT", align: "left" },
      { id: "updatedAt", label: "UPDATED AT", align: "left" },
      { id: "description", label: "DESCRIPTION", align: "left" },
    ],
    []
  );

  const defaultVisibleColumnIds = useMemo(
    () => ["supplier", "company", "phone", "email"],
    []
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState(defaultVisibleColumnIds);

  useEffect(() => {
    setLoading(true);
    setStatsLoading(true);

    const params = new URLSearchParams();
    params.append("paginate", "true");
    params.append("page", String(page));
    params.append("limit", String(rowsPerPage));

    Promise.allSettled([
      getRequestWithOutBody(`${baseURl}vendor?${params.toString()}`, accessToken),
      getRequestWithOutBody(`${baseURl}vendor/financial-summary`, accessToken),
    ])
      .then(([vendorsRes, summaryRes]) => {
        if (vendorsRes.status === "fulfilled") {
          const result = vendorsRes.value;
          const apiData = result?.data;
          const apiRows = (apiData?.results || apiData?.data?.results || []).map((v) => ({
            ...v,
            id: v.id,
            supplier: v.companyName || "",
            company: v.address || "",
            phone: v.directorContactNo || "",
            email: v.email || "",
            openBalance: 0,
            actionType: "View",
          }));
          const count =
            apiData?.totalRecords ??
            apiData?.data?.totalRecords ??
            0;
          setRows(apiRows);
          setTotalCount(Number(count) || 0);
        }

        if (summaryRes.status === "fulfilled") {
          const s = summaryRes.value?.data ?? summaryRes.value;
          setFinancialSummary(s);
        } else {
          setFinancialSummary(null);
        }
      })
      .finally(() => {
        setLoading(false);
        setStatsLoading(false);
      });
  }, [accessToken, page, rowsPerPage]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.supplier, r.company, r.phone, r.email].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    return financialSummary &&
      typeof financialSummary === "object" &&
      financialSummary.data &&
      typeof financialSummary.data === "object"
      ? financialSummary.data
      : financialSummary;
  }, [financialSummary]);

  const filteredColumns = useMemo(() => {
    if (!columnSearchQuery.trim()) return allColumns;
    const query = columnSearchQuery.trim().toLowerCase();
    return allColumns.filter(
      (col) =>
        col.label.toLowerCase().includes(query) ||
        col.id.toLowerCase().includes(query)
    );
  }, [allColumns, columnSearchQuery]);

  const columns = useMemo(
    () => allColumns.filter((c) => visibleColumnIds.includes(c.id)),
    [allColumns, visibleColumnIds]
  );

  const statCards = useMemo(
    () => [
      {
        key: "purchaseOrders",
        title: "Purchase Orders",
        amount: formatMoney(summary?.purchaseOrdersTotal),
        subtitle: "Purchase Orders",
        icon: "purchaseOrders",
      },
      {
        key: "billsPaid",
        title: "Bills Paid",
        amount: formatMoney(summary?.billsPaidTotal),
        subtitle: "Bills Paid",
        icon: "billsPaid",
      },
      {
        key: "openBills",
        title: "Open Bills Balance",
        amount: formatMoney(summary?.openBillsBalance),
        subtitle: "Open Bills Balance",
        icon: "openBills",
      },
      {
        key: "overdueBills",
        title: "Overdue Bills Balance",
        amount: formatMoney(summary?.overdueBillsBalance),
        subtitle: "Overdue Bills Balance",
        icon: "overdueBills",
      },
    ],
    [summary]
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

  const data = filtered.map((r) => ({
    id: r.id,
    supplier: r.supplier,
    company: r.company,
    phone: r.phone,
    email: r.email,
    directorName: r.directorName || "",
    directorEmail: r.directorEmail || "",
    address: r.address || "",
    city: r.city || "",
    state: r.state || "",
    zipCode: r.zipCode || "",
    website: r.website || "",
    establishmentYear: r.establishmentYear ?? "",
    accountId: r.accountId ?? "",
    createdAt: formatDateTime(r.createdAt),
    updatedAt: formatDateTime(r.updatedAt),
    description: r.description || "",
    openBalance: `$${r.openBalance.toFixed(2)}`,
    action: (
      <button
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "transparent",
          border: "none",
          color: "#0C79F7",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {r.actionType}
      </button>
    ),
  }));

  return (
    <div
      className="min-h-screen"
      style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 20 }}
    >
      <PageHeader
        title="Suppliers"
        actions={(
          <AppButton
            icon={addIcon}
            title="New Supplier"
            onClick={() => navigate("/home/addSupplier")}
          />
        )}
      />

      <div className="flex gap-3 flex-wrap mt-4">
        {statCards.map((card) => (
          <SupplierStatCard
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
        <ListSearchField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onEnter={handleApplyFilters}
          placeholder="Search suppliers..."
        />

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
          ) : (data?.length || 0) === 0 ? (
            <NoDataFound title="No Data Found" description="No suppliers found." />
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
              onRowClick={(_event, row) => {
                if (!row?.id) return;
                const vendor = rows.find((v) => v.id === row.id);
                navigate(`/home/supplier/${row.id}`, { state: { vendor } });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
