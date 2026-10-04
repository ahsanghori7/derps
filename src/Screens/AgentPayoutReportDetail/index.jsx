import { useEffect, useMemo, useState } from "react";
import Heading from "../../Components/Heading";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { IoIosArrowBack } from "react-icons/io";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import { getRequestWithOutBody } from "../../Api/fetch";
import { toast } from "react-toastify";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import AgentTable from "../../Components/AgentTable";
import { downloadExcelWorkbook } from "../../Utils/excelExport";
import { loadExcelJS } from "../../Utils/cdnLibs";

const getMonthDisplayName = (monthValue) => {
    const months = {
        january: "January",
        february: "February",
        march: "March",
        april: "April",
        may: "May",
        june: "June",
        july: "July",
        august: "August",
        september: "September",
        october: "October",
        november: "November",
        december: "December",
    };
    return months[monthValue] || monthValue;
};

const formatCurrency = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return "-";
    return `$${amount.toFixed(2)}`;
};

const getMerchantName = (item) =>
    item?.merchant?.dbaName ||
    item?.merchantName ||
    item?.dbaName ||
    "-";

const getLocation = (item) => {
    const merchant = item?.merchant;
    if (!merchant) return "-";

    const parts = [
        merchant.dbaAddress,
        merchant.businessCity,
        merchant.businessState,
        merchant.businessZipCode,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "-";
};

const parseReportDetail = (result) => {
    const payload = result?.data;
    if (!payload || typeof payload !== "object") {
        return { agent: null, merchants: [] };
    }

    return {
        agent: payload.agent || null,
        merchants: Array.isArray(payload.merchants) ? payload.merchants : [],
        month: payload.month,
        year: payload.year,
    };
};

const getCommission = (item) =>
    item?.agentPayout ?? item?.commission ?? item?.commissionAmount ?? item?.payout ?? 0;

const AgentPayoutReportDetail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth.accessToken);

    const agentId = location.state?.agentId;
    const agentName = location.state?.agentName || "";
    const selectedMonth = location.state?.selectedMonth || "";
    const selectedYear = location.state?.selectedYear || "";
    const payoutData = location.state?.payoutData || [];

    const [loading, setLoading] = useState(true);
    const [agentInfo, setAgentInfo] = useState(null);
    const [merchantData, setMerchantData] = useState([]);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        if (!agentId) {
            toast.error("Agent not found");
            navigate("/home/reportDetails", {
                state: { payoutData, selectedMonth, selectedYear },
            });
            return;
        }

        let url = `${baseURl}payouts/report/detail?agentId=${agentId}`;
        if (selectedMonth) url += `&month=${selectedMonth}`;
        if (selectedYear) url += `&year=${selectedYear}`;

        setLoading(true);
        getRequestWithOutBody(url, accessToken)
            .then((result) => {
                const { agent, merchants } = parseReportDetail(result);
                setAgentInfo(agent);
                setMerchantData(merchants);
            })
            .catch(() => {
                toast.error("Failed to load merchant commission details");
                setMerchantData([]);
            })
            .finally(() => setLoading(false));
    }, [agentId, selectedMonth, selectedYear, accessToken]);

    const tableData = useMemo(
        () =>
            merchantData.map((item, index) => ({
                id: item?.id ?? item?.merchant?.id ?? index,
                merchantName: getMerchantName(item),
                location: getLocation(item),
                commission: getCommission(item),
            })),
        [merchantData],
    );

    const totalCommission = useMemo(() => {
        if (agentInfo?.totalPayout != null) {
            return Number(agentInfo.totalPayout);
        }
        return tableData.reduce((acc, item) => acc + (Number(item.commission) || 0), 0);
    }, [agentInfo, tableData]);

    const displayAgentName = agentInfo?.name || agentName;

    const paginatedData = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return tableData.slice(startIndex, startIndex + rowsPerPage);
    }, [tableData, page, rowsPerPage]);

    const columns = [
        { id: "merchantName", label: "MERCHANT", align: "center" },
        { id: "location", label: "LOCATION", align: "center" },
        {
            id: "commission",
            label: "COMMISSION ($)",
            align: "center",
            renderCell: (row) => formatCurrency(row.commission),
        },
    ];

    const periodLabel =
        selectedMonth && selectedYear
            ? `${getMonthDisplayName(selectedMonth)} ${selectedYear}`
            : "All Periods";

    const handleBack = () => {
        navigate("/home/reportDetails", {
            state: { payoutData, selectedMonth, selectedYear },
        });
    };

    const handleExport = async () => {
        if (!tableData.length) {
            toast.error("No data to export");
            return;
        }
        setExportLoading(true);
        try {
            const ExcelJS = await loadExcelJS();
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Agent Payout Detail");

            worksheet.addRow([`${displayAgentName} - Merchant Commissions (${periodLabel})`]);
            worksheet.addRow([]);
            worksheet.addRow(["MERCHANT", "LOCATION", "COMMISSION ($)"]);

            tableData.forEach((item) => {
                worksheet.addRow([item.merchantName, item.location, formatCurrency(item.commission)]);
            });

            worksheet.addRow([]);
            worksheet.addRow(["Commission Summary"]);
            worksheet.addRow(["Total Commission:", "", formatCurrency(totalCommission)]);

            const safeName = displayAgentName.replace(/[^a-zA-Z0-9]/g, "_");
            const fileName = `payout_report_${safeName}_${selectedMonth || "all"}_${selectedYear || "all"}.xlsx`;
            await downloadExcelWorkbook(workbook, fileName);
            toast.success("Report exported successfully");
        } catch (error) {
            toast.error(error.message || "Failed to export report");
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <Button
                    onClick={handleBack}
                    style={{
                        minWidth: 40,
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: "var(--dashboard-card-bg)",
                        border: "1px solid var(--sidebar-selected-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-primary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={"var(--sidebar-text-primary)"}
                    Heading={`${displayAgentName} - Merchant Commissions (${periodLabel})`}
                    Fontsize={30}
                />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <Button
                    variant="contained"
                    onClick={handleExport}
                    disabled={exportLoading}
                    style={{
                        backgroundColor: "#0C79F7",
                        color: "#FFFFFF",
                        textTransform: "none",
                        height: 40,
                        borderRadius: 8,
                        fontWeight: 500,
                    }}
                >
                    {exportLoading ? "Exporting..." : "Export to Excel"}
                </Button>
            </div>

            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : tableData.length === 0 ? (
                <NoDataFound
                    title="No Data Found"
                    description="No merchant commission details found for this agent."
                />
            ) : (
                <>
                    <div className="mt-2">
                        <AgentTable
                            columns={columns}
                            data={paginatedData}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={tableData.length}
                            onPageChange={setPage}
                            onRowsPerPageChange={(newRows) => {
                                setRowsPerPage(newRows);
                                setPage(1);
                            }}
                            containerMaxHeight={false}
                            footerBackground="var(--dashboard-card-bg)"
                            paginationColor="var(--dashboard-text-primary)"
                        />
                    </div>
                    <div
                        style={{
                            backgroundColor: "var(--dashboard-tab-box)",
                            border: "1px solid var(--dashboard-box-border)",
                            borderRadius: 20,
                            padding: 20,
                            marginTop: 20,
                            textAlign: "left",
                        }}
                        className="w-80 ml-auto"
                    >
                        <h2
                            style={{
                                fontSize: 18,
                                fontWeight: 700,
                                color: "var(--sidebar-text-primary)",
                            }}
                        >
                            Commission Summary
                        </h2>
                        <p
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: "var(--sidebar-text-primary)",
                            }}
                            className="mt-6"
                        >
                            Total Commission:{" "}
                            <span style={{ color: "var(--Gray)", fontSize: 15, marginLeft: 10 }}>
                                {formatCurrency(totalCommission)}
                            </span>
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default AgentPayoutReportDetail;
