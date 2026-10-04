import React, { useEffect, useMemo, useState } from "react";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useNavigate, useLocation } from "react-router-dom";
import { IoIosArrowBack } from "react-icons/io";
import Heading from "../../Components/Heading";
import Spinner from "../../Components/Spinner";
import { useSelector } from "react-redux";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

export default function PayrollSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkDate, setCheckDate] = useState(null);
  const [approving, setApproving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const stateRows = location.state?.rows;
    const request = location.state?.request;
    if (Array.isArray(stateRows) && stateRows.length) {
      setRows(stateRows);
      setCheckDate(request?.payrollDate || stateRows[0]?.payrollDate || null);
      return; // show passed-in data without fetching
    }
    const load = async () => {
      try {
        setLoading(true);
        const res = await getRequestWithOutBody(`${baseURl}payroll`, accessToken);
        const list = Array.isArray(res?.data) ? res.data : [];
        const mapped = list.map((p) => ({
          id: p.id,
          name: p?.employee?.name || "-",
          type: p?.employee?.employeeType || p?.employee?.roleTitle || '-',
          hours: Number(p?.totalHours || 0),
          gross: Number(p?.grossPay || 0),
          taxes: 0,
          deductions: 0,
          payrollDate: p?.payrollDate || null,
        }));
        setRows(mapped);
        const d = mapped.find((m) => m.payrollDate)?.payrollDate;
        setCheckDate(d || null);
      } catch (e) {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, location.state]);

  const handleApprove = async () => {
    const request = location.state?.request;
    if (!request) {
      navigate(-1);
      return;
    }
    try {
      setApproving(true);
      // Merge per-employee tax details from current rows into the request payload
      const rowsIndex = new Map((rows || []).map(r => [String(r.id), r]));
      const enrichedEmployees = (request.employees || []).map((e) => {
        const r = rowsIndex.get(String(e.employeeId));
        const taxes = Array.isArray(r?.taxDetails)
          ? r.taxDetails
              .filter(t => t && (Number(t.amount) || 0) > 0)
              .map(t => ({ accountId: t.accountId, amount: Number(t.amount) }))
          : undefined;
        return taxes && taxes.length ? { ...e, taxes } : e;
      });
      const payload = { ...request, employees: enrichedEmployees };
      // Simple retry loop for transient failures
      const tryPost = async (attempt = 1) => {
        try {
          return await postRequestWithBodyAndToken(`${baseURl}payroll`, accessToken, payload);
        } catch (err) {
          if (attempt >= 3) throw err;
          await new Promise(r => setTimeout(r, 400 * attempt));
          return tryPost(attempt + 1);
        }
      };
      const res = await tryPost();
      setSuccessMsg(res?.message || "Payroll has been generated successfully.");
      setSuccessOpen(true);
    } catch (e) {
      // no toast util here; simple alert
      alert(e?.message || 'Failed to approve payroll');
    } finally {
      setApproving(false);
    }
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.hours += r.hours || 0;
        acc.gross += r.gross || 0;
        acc.taxes += r.taxes || 0;
        acc.deductions += r.deductions || 0;
        return acc;
      },
      { hours: 0, gross: 0, taxes: 0, deductions: 0 }
    );
  }, [rows]);

  const netTotals = useMemo(() => {
    return totals.gross - totals.taxes - totals.deductions;
  }, [totals]);

  const cashRequired = useMemo(() => totals.gross, [totals]);

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 20 }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Button
          onClick={() => navigate(-1)}
          style={{
            minWidth: 40,
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "var(--dashboard-card-bg)",
            border: "1px solid var(--dashboard-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginTop: 4,
          }}
        >
          <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
        </Button>
        <div>
          <Heading
            Fontweight={700}
            color={"var(--sidebar-text-primary)"}
            Heading={"Payroll Summary"}
            Fontsize={30}
          />
          <p style={{ color: "#00000099", fontSize: 14, marginTop: 4 }}>
            Review cash requirements and payroll details before approval
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Cash Required card - two tone, no white bottom */}
        <div
          style={{
            borderRadius: 14,
            boxShadow: "0 6px 10px rgba(0,0,0,0.10)",
            overflow: "hidden",
            background: "#E0F2FE",
          }}
        >
          <div
            style={{
              background: "#7DD3FC",
              padding: "6px 12px",
            }}
          >
            <div style={{ fontSize: 16, color: "#202224", fontWeight: 600 }}>Cash Required</div>
          </div>
          <div style={{ padding: "18px 14px 16px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#202224" }}>
              ${cashRequired.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: "#202224B1", fontWeight: 600, marginTop: 4 }}>Total Cash</div>
          </div>
        </div>

        {/* Payroll Dates card - two tone, no white bottom */}
        <div
          style={{
            borderRadius: 14,
            boxShadow: "0 6px 10px rgba(0,0,0,0.10)",
            overflow: "hidden",
            background: "#FFE4D5",
          }}
        >
          <div
            style={{
              background: "#FDAE8B",
              padding: "6px 12px",
            }}
          >
            <div style={{ fontSize: 16, color: "#202224", fontWeight: 600 }}>Payroll Dates</div>
          </div>
          <div style={{ padding: "18px 14px 16px 14px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#202224" }}>
              {checkDate ? new Date(checkDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }) : '-'}
            </div>
            <div style={{ fontSize: 12, color: "#202224B1", fontWeight: 600, marginTop: 4 }}>Check Date</div>
          </div>
        </div>
      </div>

      {/* Summary table */}
      <TableContainer component={Paper} elevation={0} style={{ borderRadius: 12, overflow: "hidden", overflowX: 'auto' }}>
        {loading ? (
          <div className="text-center w-full mx-auto" style={{ padding: 24 }}>
            <Spinner size="w-10 h-10" />
          </div>
        ) : (
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow style={{ backgroundColor: "#0C79F7" }}>
              <TableCell style={{ color: "white", fontWeight: 600 }}>EMPLOYEE NAME</TableCell>
              <TableCell style={{ color: "white", fontWeight: 600 }}>TYPE</TableCell>
              <TableCell style={{ color: "white", fontWeight: 600 }}>PAYROLL DATE</TableCell>
              <TableCell align="right" style={{ color: "white", fontWeight: 600 }}>
                TOTAL HOURS
              </TableCell>
              <TableCell align="right" style={{ color: "white", fontWeight: 600 }}>
                GROSS PAY
              </TableCell>
              <TableCell align="right" style={{ color: "white", fontWeight: 600 }}>
                TAXES
              </TableCell>
              <TableCell align="right" style={{ color: "white", fontWeight: 600 }}>
                DEDUCTIONS
              </TableCell>
              <TableCell align="right" style={{ color: "white", fontWeight: 600 }}>
                NET PAY
              </TableCell>
              <TableCell align="right" style={{ color: "white", fontWeight: 600 }}>
                ACTION
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const net = r.gross - r.taxes - r.deductions;
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell>{r.payrollDate ? new Date(r.payrollDate).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: '2-digit' }) : '-'}</TableCell>
                  <TableCell align="right">{r.hours}h</TableCell>
                  <TableCell align="right">${r.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">${r.taxes.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">${r.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">${net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => navigate('/home/payroll-tax-details/', { state: { row: r, request: location.state?.request, rows } })}>
                      Tax Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow style={{ backgroundColor: "#E5E7EB", fontWeight: 700 }}>
              <TableCell style={{ fontWeight: 700 }}>Totals</TableCell>
              <TableCell />
              <TableCell />
              <TableCell align="right" style={{ fontWeight: 700 }}>
                {totals.hours}h
              </TableCell>
              <TableCell align="right" style={{ fontWeight: 700 }}>
                ${totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell align="right" style={{ fontWeight: 700 }}>
                ${totals.taxes.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell align="right" style={{ fontWeight: 700 }}>
                ${totals.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell align="right" style={{ fontWeight: 700 }}>
                ${netTotals.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
        )}
      </TableContainer>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ fontSize: 14, color: "#4B5563" }}>Showing 1 to {rows.length} of {rows.length} entries</div>
        <Button variant="contained" color="success" onClick={handleApprove} disabled={approving || rows.length===0 || !location.state?.request}>
          {approving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Approve'}
        </Button>
      </div>

      {/* Success Modal */}
      <Dialog
        open={successOpen}
        onClose={() => { setSuccessOpen(false); navigate('/home/payroll/'); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleRoundedIcon color="success" /> Payroll Created
        </DialogTitle>
        <DialogContent dividers>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 15, color: '#111827' }}>{successMsg || 'Payroll has been generated successfully.'}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ background: '#E0F2FE', borderRadius: 10, padding: '10px 12px', minWidth: 140 }}>
                <div style={{ fontSize: 12, color: '#0F172A99', fontWeight: 600, marginBottom: 4 }}>Cash Required</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                  ${cashRequired.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ background: '#FFE4D5', borderRadius: 10, padding: '10px 12px', minWidth: 180 }}>
                <div style={{ fontSize: 12, color: '#0F172A99', fontWeight: 600, marginBottom: 4 }}>Check Date</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  {checkDate ? new Date(checkDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }) : '-'}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'flex-end' }}>
          <Button onClick={() => { setSuccessOpen(false); navigate('/home/payroll/'); }} variant="contained" color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
