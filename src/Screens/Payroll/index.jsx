import React, { useEffect, useMemo, useState } from "react";
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useNavigate, useLocation } from "react-router-dom";
import Heading from "../../Components/Heading";
import { useSelector } from "react-redux";
import {
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import { usePageTitle } from "../../Hooks/usePageTitle";

const dummyRows = [];

export default function Payroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);
  
  // Update browser tab title
  usePageTitle("Payroll", location);
  
  const [selected, setSelected] = useState([]);
  const [payDate, setPayDate] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 50; // show 50 per page as requested
  const fetchLimit = 1000; // fetch up to 1000 records from API
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankOptions, setBankOptions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [rows, setRows] = useState(dummyRows);
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [editableRowId, setEditableRowId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchUsersThenPayroll = async (q = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        paginate: "true",
        limit: String(fetchLimit),
        page: String(page),
      });
      if (q) params.set("query", q);
      params.set("orderBy", "createdAt");
      params.set("order", "desc");
      const url = `${baseURl}user?${params.toString()}`;
      const usersRes = await getRequestWithOutBody(url, accessToken);
      const list = Array.isArray(usersRes?.data?.data)
        ? usersRes.data.data
        : Array.isArray(usersRes?.data)
          ? usersRes.data
          : [];
      const initialRows = list.map((u) => ({
        id: u.id,
        name: u.name || "-",
        location: u.workLocations || "-",
        commission: Number(u.commission) || 0,
        bonus: 0,
        hours: Number(u.totalHours) || 0,
        gross: Number(u.grossPay) || 0,
      }));
      setRows(initialRows);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersThenPayroll(search);
  }, [accessToken]);

  // Debounced page reset on search input (client-side filtering only)
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleToggleAll = (event) => {
    if (event.target.checked) {
      setSelected(rows.map((r) => r.id));
    } else {
      setSelected([]);
    }
  };

  const handleToggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleMainSave = () => {
    setEditingEnabled(false);
    setEditableRowId(null);
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.commission += row.commission || 0;
        acc.bonus += row.bonus || 0;
        acc.gross += row.gross || 0;
        return acc;
      },
      { commission: 0, bonus: 0, gross: 0 },
    );
  }, [rows]);

  const handleChangePage = (event, value) => {
    setPage(value);
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) => {
      const hay = [u?.name, u?.workLocations, u?.email, u?.role]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return hay.some((v) => v.includes(q));
    });
  }, [rows, search]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, filteredRows]);

  const openBankModal = async () => {
    // Preliminary validation before opening modal
    if (!payDate) {
      toast.error("Please select Pay Date");
      return;
    }
    if (selected.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    const selectedRows = rows.filter((r) => selected.includes(r.id));
    const invalidRows = selectedRows.filter((r) => {
      const commissionVal = Number(r.commission);
      const hoursVal = Number(r.hours);
      const grossVal = Number(r.gross);
      const commissionOk = Number.isFinite(commissionVal) && commissionVal >= 0;
      const hoursOk = Number.isFinite(hoursVal) && hoursVal >= 0;
      const grossOk = Number.isFinite(grossVal) && grossVal >= 0;
      return !(commissionOk && hoursOk && grossOk);
    });
    if (invalidRows.length) {
      const names = invalidRows
        .map((r) => r.name || r.id)
        .slice(0, 5)
        .join(", ");
      toast.error(
        `Please ensure Commission, Total Hours, and Gross Pay are valid numbers (zero or more) for: ${names}${invalidRows.length > 5 ? "…" : ""}`,
      );
      return;
    }
    try {
      setBankLoading(true);
      const url = `${baseURl}account/categories/?type=assets&subType=bank`;
      const res = await getRequestWithOutBody(url, accessToken);
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
      setBankOptions(list);
    } catch (e) {
      setBankOptions([]);
    } finally {
      setBankLoading(false);
      setBankModalOpen(true);
    }
  };

  const closeBankModal = () => {
    if (saving) return;
    setBankModalOpen(false);
  };

  const handleSaveBank = async () => {
    if (!payDate) {
      toast.error("Please select Pay Date");
      return;
    }
    if (!bankAccountId) {
      toast.error("Please enter Bank Account ID");
      return;
    }
    if (selected.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    // Validate selected employees have numeric values (allow zero)
    const selectedRows = rows.filter((r) => selected.includes(r.id));
    const invalidRows = selectedRows.filter((r) => {
      const commissionVal = Number(r.commission);
      const hoursVal = Number(r.hours);
      const grossVal = Number(r.gross);
      const commissionOk = Number.isFinite(commissionVal) && commissionVal >= 0;
      const hoursOk = Number.isFinite(hoursVal) && hoursVal >= 0;
      const grossOk = Number.isFinite(grossVal) && grossVal >= 0;
      return !(commissionOk && hoursOk && grossOk);
    });
    if (invalidRows.length) {
      const names = invalidRows
        .map((r) => r.name || r.id)
        .slice(0, 5)
        .join(", ");
      toast.error(
        `Please ensure Commission, Total Hours, and Gross Pay are valid numbers (zero or more) for: ${names}${invalidRows.length > 5 ? "…" : ""}`,
      );
      return;
    }
    try {
      // Build employees payload from selected rows (using edited values)
      const selectedRows = rows.filter((r) => selected.includes(r.id));
      const employees = selectedRows.map((r) => ({
        employeeId: r.id,
        commission: Number(r.commission) || 0,
        totalHours: Number(r.hours) || 0,
        grossPay: Number(r.gross) || 0,
      }));

      const body = {
        payrollDate: payDate, // YYYY-MM-DD
        bankAccountId: Number(bankAccountId),
        employees,
      };

      // Navigate to summary screen with the data to review before hitting API
      navigate("/home/payroll-summary/", {
        state: {
          request: body,
          rows: selectedRows.map((r) => ({
            id: r.id,
            name: r.name,
            type: r?.type || "-",
            hours: Number(r.hours) || 0,
            gross: Number(r.gross) || 0,
            taxes: 0,
            deductions: 0,
            payrollDate: payDate,
          })),
        },
      });
      setBankModalOpen(false);
    } catch (e) {
      toast.error(e?.message || "Failed to proceed to summary");
    }
  };

  const handleRowFieldChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "commission" ||
                field === "bonus" ||
                field === "hours" ||
                field === "gross"
                  ? Number(value) || 0
                  : value,
            }
          : row,
      ),
    );
  };

  return (
    <div
      className="min-h-screen"
      style={{
        marginTop: -65,
        backgroundColor: "var(--dashboard-bg)",
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Heading
          Fontweight={700}
          color={"var(--sidebar-text-primary)"}
          Heading={"Payroll"}
          Fontsize={30}
        />
      </div>

      <div
        style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <TextField
          fullWidth
          size="small"
          label="Search"
          placeholder="Search employee, location, etc."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            maxWidth: 320,
            "& .MuiInputBase-input": {
              color: document.documentElement.classList.contains("dark")
                ? "#FFFFFF"
                : "black",
            },
            "& .MuiInputLabel-root": {
              color: document.documentElement.classList.contains("dark")
                ? "#FFFFFF"
                : "black",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: document.documentElement.classList.contains("dark")
                ? "#FFFFFF"
                : "rgba(0, 0, 0, 0.23)",
            },
          }}
        />
        <TextField
          fullWidth
          size="small"
          label="Pay Date"
          type="date"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            maxWidth: 320,
            "& .MuiInputBase-input": {
              color: document.documentElement.classList.contains("dark")
                ? "#FFFFFF"
                : "black",
            },
            "& .MuiInputLabel-root": {
              color: document.documentElement.classList.contains("dark")
                ? "#FFFFFF"
                : "black",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: document.documentElement.classList.contains("dark")
                ? "#FFFFFF"
                : "rgba(0, 0, 0, 0.23)",
            },
          }}
        />
      </div>

      <div>
        <TableContainer
          component={Paper}
          elevation={0}
          style={{ borderRadius: 12, overflow: "hidden" }}
          aria-busy={loading}
        >
          <Table size="small">
            <TableHead>
              <TableRow style={{ backgroundColor: "#0C79F7" }}>
                <TableCell
                  padding="checkbox"
                  style={{ color: "white", fontWeight: 600 }}
                >
                  <Checkbox
                    size="small"
                    checked={rows.length > 0 && selected.length === rows.length}
                    indeterminate={
                      selected.length > 0 && selected.length < rows.length
                    }
                    onChange={handleToggleAll}
                    sx={{ color: "white", "&.Mui-checked": { color: "white" } }}
                  />
                </TableCell>
                <TableCell style={{ color: "white", fontWeight: 600 }}>
                  EMPLOYEE NAME
                </TableCell>
                <TableCell style={{ color: "white", fontWeight: 600 }}>
                  WORK LOCATION
                </TableCell>
                <TableCell
                  align="right"
                  style={{ color: "white", fontWeight: 600 }}
                >
                  COMMISSION
                </TableCell>
                <TableCell
                  align="right"
                  style={{ color: "white", fontWeight: 600 }}
                >
                  BONUS
                </TableCell>
                <TableCell
                  align="right"
                  style={{ color: "white", fontWeight: 600 }}
                >
                  TOTAL HOURS
                </TableCell>
                <TableCell
                  align="right"
                  style={{ color: "white", fontWeight: 600 }}
                >
                  GROSS PAY
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell padding="checkbox">
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          backgroundColor: "#E5E7EB",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div
                        style={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#E5E7EB",
                          width: "60%",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div
                        style={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#E5E7EB",
                          width: "50%",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <div
                        style={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#E5E7EB",
                          width: 80,
                          float: "right",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <div
                        style={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#E5E7EB",
                          width: 80,
                          float: "right",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <div
                        style={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#E5E7EB",
                          width: 60,
                          float: "right",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <div
                        style={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#E5E7EB",
                          width: 100,
                          float: "right",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    style={{ padding: 24, color: "#6B7280" }}
                  >
                    No payroll data found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => {
                  const isEditing = editingEnabled && editableRowId === row.id;
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => {
                        // Enable editing for clicked row
                        setEditingEnabled(true);
                        setEditableRowId(row.id);
                      }}
                      style={{
                        backgroundColor: isEditing
                          ? "#E8F0FF"
                          : document.documentElement.classList.contains("dark")
                            ? "#000000"
                            : "var(--sidebar-text-selected)",
                        color: document.documentElement.classList.contains(
                          "dark",
                        )
                          ? "#F9FAFB"
                          : "var(--sidebar-text-primary)",
                      }}
                    >
                      <TableCell padding="checkbox" >
                        <Checkbox
                        style={{
                          color: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? "#F9FAFB"
                            : "var(--sidebar-text-primary)",
                        }}
                          size="small"
                          checked={selected.includes(row.id)}
                          onChange={() => handleToggle(row.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell
                        style={{
                          color: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? "#F9FAFB"
                            : "var(--sidebar-text-primary)",
                        }}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell style={{
                          color: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? "#F9FAFB"
                            : "var(--sidebar-text-primary)",
                        }}>
                        {isEditing ? (
                          <FormControl size="small" fullWidth>
                            <Select
                              value={row.location}
                              onChange={(e) =>
                                handleRowFieldChange(
                                  row.id,
                                  "location",
                                  e.target.value,
                                )
                              }
                            >
                              <MenuItem value="Pakistan">Pakistan</MenuItem>
                              <MenuItem value="India">India</MenuItem>
                              <MenuItem value="Saudi Arabia">
                                Saudi Arabia
                              </MenuItem>
                              <MenuItem value="Qatar">Qatar</MenuItem>
                              <MenuItem value="UAE">UAE</MenuItem>
                              <MenuItem value="USA">USA</MenuItem>
                            </Select>
                          </FormControl>
                        ) : (
                          row.location
                        )}
                      </TableCell>
                      <TableCell align="right" style={{
                          color: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? "#F9FAFB"
                            : "var(--sidebar-text-primary)",
                        }}>
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={row.commission}
                            onChange={(e) =>
                              handleRowFieldChange(
                                row.id,
                                "commission",
                                e.target.value,
                              )
                            }
                            inputProps={{ style: { textAlign: "right" } }}
                          />
                        ) : (
                          `$${row.commission.toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell align="right" style={{
                          color: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? "#F9FAFB"
                            : "var(--sidebar-text-primary)",
                        }}>
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={row.bonus}
                            onChange={(e) =>
                              handleRowFieldChange(
                                row.id,
                                "bonus",
                                e.target.value,
                              )
                            }
                            inputProps={{ style: { textAlign: "right" } }}
                          />
                        ) : (
                          `$${row.bonus.toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell align="right" style={{
                          color: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? "#F9FAFB"
                            : "var(--sidebar-text-primary)",
                        }}>
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={row.hours}
                            onChange={(e) =>
                              handleRowFieldChange(
                                row.id,
                                "hours",
                                e.target.value,
                              )
                            }
                            inputProps={{ style: { textAlign: "right" } }}
                          />
                        ) : (
                          `${row.hours}h`
                        )}
                      </TableCell>
                      <TableCell align="right" style={{
                          color: document.documentElement.classList.contains(
                            "dark",
                          )
                            ? "#F9FAFB"
                            : "var(--sidebar-text-primary)",
                        }}>
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={row.gross}
                            onChange={(e) =>
                              handleRowFieldChange(
                                row.id,
                                "gross",
                                e.target.value,
                              )
                            }
                            inputProps={{ style: { textAlign: "right" } }}
                          />
                        ) : (
                          `$${row.gross.toLocaleString()}`
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {!loading && (
                <TableRow
                  style={{ backgroundColor: "#E5E7EB", fontWeight: 700 }}
                >
                  <TableCell colSpan={3} style={{ fontWeight: 700 }}>
                    Totals
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>
                    ${totals.commission.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>
                    ${totals.bonus.toFixed(2)}
                  </TableCell>
                  <TableCell />
                  <TableCell align="right" style={{ fontWeight: 700 }}>
                    ${totals.gross.toLocaleString()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .45 } }`}</style>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <div style={{ fontSize: 14, color: "#4B5563" }}>
          Showing 1 to {paginatedRows.length} of {rows.length} entries
        </div>
        <Pagination
          count={Math.ceil(rows.length / rowsPerPage)}
          page={page}
          onChange={handleChangePage}
          color="primary"
          size="small"
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 16,
        }}
      >
        <Button
          variant="contained"
          color="inherit"
          size="small"
          style={{ backgroundColor: "#111827", color: "white" }}
          onClick={handleMainSave}
        >
          Save
        </Button>
        <Button
          variant="contained"
          color="success"
          size="small"
          onClick={openBankModal}
        >
          Run Payroll
        </Button>
      </div>

      <Dialog
        open={bankModalOpen}
        onClose={closeBankModal}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown={saving}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          Bank Selection
          <IconButton size="small" onClick={closeBankModal}>
            <span style={{ fontSize: 18 }}>×</span>
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Choose Bank</div>
          <FormControl fullWidth size="small">
            <InputLabel id="bank-select-label">--select Bank--</InputLabel>
            <Select
              labelId="bank-select-label"
              label="--select Bank--"
              value={bankAccountId}
              onChange={(e) => {
                setBankAccountId(e.target.value);
                setSelectedBank(e.target.value);
              }}
              disabled={bankLoading}
            >
              <MenuItem value="">--select Bank--</MenuItem>
              {bankOptions.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                  {b.code ? ` (${b.code})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Button
            onClick={closeBankModal}
            variant="outlined"
            color="inherit"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveBank}
            variant="contained"
            color="primary"
            disabled={
              saving || !payDate || !bankAccountId || selected.length === 0
            }
          >
            {saving ? (
              <CircularProgress size={18} sx={{ color: "white" }} />
            ) : (
              "Save"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bank fetch loader */}
      <Backdrop
        open={bankLoading}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.modal + 3,
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(17,24,39,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CircularProgress color="inherit" />
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
            Loading bank accounts…
          </div>
        </div>
      </Backdrop>

      <Dialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <CheckCircleRoundedIcon color="success" /> Payroll Created
        </DialogTitle>
        <DialogContent dividers>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{ fontSize: 15, color: "#111827", textAlign: "center" }}
            >
              Payroll has been created successfully.
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "center" }}>
          <Button
            onClick={() => setSuccessOpen(false)}
            variant="contained"
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Backdrop
        open={saving}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.modal + 2,
          backdropFilter: "blur(3px)",
          backgroundColor: "rgba(17,24,39,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CircularProgress color="inherit" />
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
            Processing…
          </div>
        </div>
      </Backdrop>
    </div>
  );
}
