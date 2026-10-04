import { useState, useMemo } from "react";
import Heading from "../../Components/Heading";
import { useLocation, useNavigate } from "react-router-dom";
import { styled } from "@mui/material";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import { downloadFileWithToken } from "../../Api/fetch";
import { toast } from "react-toastify";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import AgentTable from "../../Components/AgentTable";
import { IoIosArrowBack } from 'react-icons/io';
import {
    Button
} from '@mui/material';
const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const ReportDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const payoutData = location.state?.payoutData || [];
    const selectedMonth = location.state?.selectedMonth || '';
    const selectedYear = location.state?.selectedYear || '';
    const selectedAgentId = location.state?.selectedAgentId || '';

    const handleAgentClick = (row) => {
        const agentId = row?.agentId ?? row?.id ?? row?.agent?.id;
        if (!agentId) {
            return;
        }
        navigate('/home/agentPayoutReportDetail', {
            state: {
                agentId,
                agentName: row?.agentName || row?.agent?.name || 'Agent',
                selectedMonth,
                selectedYear,
                payoutData,
            },
        });
    };

    const columns = [
        { id: 'agentCode', label: 'AGENT CODE', align: 'center' },
        {
            id: 'agentName',
            label: 'AGENT NAME',
            align: 'center',
            renderCell: (row) => (
                <span
                    onClick={() => handleAgentClick(row)}
                    style={{ color: '#0C79F7', cursor: 'pointer', fontWeight: 600 }}
                >
                    {row.agentName}
                </span>
            ),
        },
        { id: 'totalPayout', label: 'TOTAL PAYOUT ($)', align: 'center' },
    ];

    const getMonthDisplayName = (monthValue) => {
        const months = {
            'january': 'January',
            'february': 'February',
            'march': 'March',
            'april': 'April',
            'may': 'May',
            'june': 'June',
            'july': 'July',
            'august': 'August',
            'september': 'September',
            'october': 'October',
            'november': 'November',
            'december': 'December'
        };
        return months[monthValue] || monthValue;
    };

    const handleExport = async () => {
        if (!selectedMonth || !selectedYear) return;
        setExportLoading(true);
        try {
            let url = `${baseURl}payouts/report/export?month=${selectedMonth}&year=${selectedYear}`;
            if (selectedAgentId && selectedAgentId !== 'all') {
                url += `&agentId=${selectedAgentId}`;
            }
            await downloadFileWithToken(
                url,
                accessToken,
                `payout_report_${selectedMonth}_${selectedYear}.xlsx`
            );
            toast.success('Report exported successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to export report');
        } finally {
            setExportLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/home/reports', {
            state: {
                selectedMonth,
                selectedYear
            }
        });
    };

    const totalCount = payoutData.length;
    const paginatedData = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return payoutData.slice(startIndex, startIndex + rowsPerPage);
    }, [payoutData, page, rowsPerPage]);

    // 👇 Handlers for AgentTable
    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (newRows) => {
        setRowsPerPage(newRows);
        setPage(1); // reset to first page
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <Button
                    onClick={handleBack}
                    style={{
                        minWidth: 40,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'var(--dashboard-card-bg)',
                        border: '1px solid var(--sidebar-selected-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-primary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Agent Payout Commission Report - ${selectedMonth && selectedYear ? `${getMonthDisplayName(selectedMonth)} ${selectedYear}` : ''}`}
                    Fontsize={30}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    variant="contained"
                    onClick={handleExport}
                    disabled={exportLoading}
                    style={{
                        backgroundColor: '#0C79F7',
                        color: '#FFFFFF',
                        textTransform: 'none',
                        height: 40,
                        borderRadius: 8,
                        fontWeight: 500,
                    }}
                >
                    {exportLoading ? 'Exporting...' : 'Export to Excel'}
                </Button>
            </div>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : payoutData?.length === 0 ? (
                <NoDataFound title="No Data Found" description="No report data found." />
            ) : (
                <div className="mt-2">
                    <AgentTable
                        columns={columns}
                        data={paginatedData}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        footerBackground="var(--dashboard-card-bg)"
                        paginationColor="var(--dashboard-text-primary)"
                    />
                </div>
            )}
        </div>
    );
};

export default ReportDetails;
