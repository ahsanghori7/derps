import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton } from "@mui/material";
import { IoIosArrowBack } from "react-icons/io";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

const BillOutstandingTransactions = () => {
  const navigate = useNavigate();
  const { billId } = useParams();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!billId || !accessToken) return;
    setLoading(true);
    const url = `${baseURl}purchase-order/outstanding-transactions/${billId}`;
    getRequestWithOutBody(url, accessToken)
      .then((result) => {
        const data = result?.data || [];
        const mapped = data.map((t) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          reference: t.reference,
          vendor: t.vendor,
          category: t.category,
          dueDate: t.dueDate,
          pretax: Number(t.amountBeforeTax || 0),
          tax: Number(t.taxAmount || 0),
          total: Number(t.totalAmount || 0),
          status: t.status,
          action: "View/Edit",
        }));
        setRows(mapped);
      })
      .catch((e) => {
      })
      .finally(() => setLoading(false));
  }, [billId, accessToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const columns = [
    { id: "date", label: "DATE", align: "left" },
    { id: "type", label: "TYPE", align: "left" },
    { id: "reference", label: "REFERENCE", align: "left" },
    { id: "vendor", label: "VENDOR", align: "left" },
    { id: "category", label: "CATEGORY", align: "left" },
    { id: "dueDate", label: "DUE DATE", align: "left" },
    { id: "pretax", label: "PRE-TAX TOTAL", align: "right" },
    { id: "tax", label: "SALES TAX", align: "right" },
    { id: "total", label: "TOTAL", align: "right" },
    { id: "status", label: "STATUS", align: "left" },
    { id: "action", label: "ACTION", align: "right" },
  ];

  const data = filtered.map((r) => ({
    id: r.id,
    date: r.date,
    type: r.type,
    reference: r.reference,
    vendor: r.vendor,
    category: r.category,
    dueDate: r.dueDate,
    pretax: `$${Number(r.pretax).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    tax: `$${Number(r.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    total: `$${Number(r.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    status: r.status,
    action: r.action,
  }));

  const totals = {
    pretax: rows.reduce((s, r) => s + (r.pretax || 0), 0),
    tax: rows.reduce((s, r) => s + (r.tax || 0), 0),
    total: rows.reduce((s, r) => s + (r.total || 0), 0),
  };

  return (
    <div
      className="min-h-screen"
      style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 20 }}
    >
      <div
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{ marginBottom: 8 }}
      >
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => navigate(-1)}
            size="small"
            sx={{ color: "var(--sidebar-text-primary)" }}
          >
            <IoIosArrowBack size={22} />
          </IconButton>
          <Heading
            Fontweight={700}
            color={"var(--sidebar-text-primary)"}
            Heading={`Bill #${billId} Outstanding Transactions`}
            Fontsize={24}
          />
        </div>
      </div>

      <Box sx={{ mb: 1 }}>
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              background: "var(--chrome-filter-bar-bg)",
              border: "1px solid var(--dashboard-border)",
              borderRadius: 12,
              padding: "8px 12px",
              width: 360,
              display: "flex",
              gap: 8,
              alignItems: "center",
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
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: 14,
                border: "none",
                color: "var(--dashboard-text-primary)",
              }}
            />
          </div>
        </div>

        {loading ? (
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--dashboard-card-bg)",
              border: "1px solid var(--dashboard-box-border)",
              boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(59, 130, 246, 0.05)",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid #3B82F6",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span
                style={{
                  color: "#3B82F6",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Loading outstanding transactions...
              </span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
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
            No outstanding transactions found
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              background: "var(--dashboard-card-bg)",
              border: "1px solid var(--dashboard-box-border)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 12 }}>
              <MemoTable
                data={data}
                columns={columns}
                showCheckbox
                accountingTable
                actionLabel="View/Edit"
                onRowClick={() => {}}
              />
            </div>
            <div
              style={{
                background: "#E5E7EB",
                padding: "10px 14px",
                fontWeight: 800,
                color: "#111827",
                display: "grid",
                gridTemplateColumns:
                  "auto auto auto 1fr auto auto auto auto auto auto auto",
                gap: 10,
              }}
            >
              <div style={{ gridColumn: "1 / span 7" }}>Totals</div>
              <div style={{ textAlign: "right" }}>
                $
                {totals.pretax.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div style={{ textAlign: "right" }}>
                $
                {totals.tax.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div style={{ textAlign: "right" }}>
                $
                {totals.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div></div>
            </div>
          </div>
        )}
      </Box>
    </div>
  );
};

export default BillOutstandingTransactions;
