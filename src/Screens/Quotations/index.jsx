import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import PageHeader from "../../Components/PageHeader";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { toast } from "react-toastify";
import {
    convertCrmQuotationToSalesOrder,
    getPipelineStageIndex,
} from "../SalesFormBuilder/formDefinitionApi";

const StageCardsWrapper = styled('div')({
    marginTop: 16,
    marginBottom: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gap: 8,
    '@media (max-width: 1100px)': {
        display: 'flex',
        flexWrap: 'wrap',
    },
});

const StageCardItem = styled('div')({
    cursor: 'pointer',
    minWidth: 0,
    width: '100%',
    '@media (max-width: 1100px)': {
        flex: '1 1 140px',
        width: 'auto',
        maxWidth: 'calc(33.333% - 6px)',
    },
    '@media (max-width: 768px)': {
        flex: '1 1 calc(50% - 4px)',
        maxWidth: 'calc(50% - 4px)',
    },
    '@media (max-width: 480px)': {
        flex: '1 1 100%',
        maxWidth: '100%',
    },
});

const QUOTATION_STATUS_FILTERS = [
    { key: 'all', title: 'All Quotations', subtitle: 'Total quotations value' },
    { key: 'draft', title: 'Draft', subtitle: 'Draft quotations value' },
    { key: 'sent', title: 'Sent', subtitle: 'Sent quotations value' },
    { key: 'accepted', title: 'Accepted', subtitle: 'Accepted quotations value' },
    { key: 'rejected', title: 'Rejected', subtitle: 'Rejected quotations value' },
    { key: 'expired', title: 'Expired', subtitle: 'Expired quotations value' },
    { key: 'cancelled', title: 'Cancelled', subtitle: 'Cancelled quotations value' },
];

const QUOTATION_TABS = QUOTATION_STATUS_FILTERS.map(({ key, title }) => ({
    id: key,
    label: title,
}));

const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const extractQuotationStats = (result) => {
    const payload = result?.data ?? result;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload;
};

const getQuotationStatCount = (stats, statusKey) => {
    if (!stats) return 0;
    if (statusKey === 'all') return Number(stats.total) || 0;
    return Number(stats.byStatus?.[statusKey]) || 0;
};

const getQuotationStatAmount = (stats, statusKey) => {
    if (!stats) return 0;
    if (statusKey === 'all') return Number(stats.totalAmount) || 0;
    return Number(stats.amountByStatus?.[statusKey]) || 0;
};

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const getOpportunityIdFromQuotation = (row) =>
    row?.crmOpportunityId ?? row?.opportunity?.id ?? row?.crmOpportunity?.id ?? null;

const transformQuotationRow = (item) => ({
    ...item,
    fullName: item.opportunity?.name || item.crmAccount?.name || "-",
    email: item.contact?.email || "-",
    services:
        Array.isArray(item.lineItems) && item.lineItems.length > 0
            ? item.lineItems.map((line) => line.description).filter(Boolean).join(", ")
            : "-",
});

const Quotations = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Quotations", location);
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [quotationStats, setQuotationStats] = useState(null);
    const [quotationsList, setQuotationsList] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);
    const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');
    const [convertingQuotationId, setConvertingQuotationId] = useState(null);

    const fetchStats = useCallback(() => {
        if (!accessToken) return;

        setStatsLoading(true);
        getRequestWithOutBody(`${baseURl}crm-quotation/stats`, accessToken)
            .then((result) => {
                setQuotationStats(extractQuotationStats(result));
            })
            .catch(() => {
                setQuotationStats(null);
            })
            .finally(() => {
                setStatsLoading(false);
            });
    }, [accessToken]);

    const fetchData = useCallback(() => {
        setLoading(true);

        const params = new URLSearchParams();
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));
        if (selectedStatus && selectedStatus !== 'all') {
            params.append('status', selectedStatus);
        }

        const apiUrl = `${baseURl}crm-quotation?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then((result) => {
                const payload = result?.data ?? result;
                const rows = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                      ? payload.data
                      : payload?.results || payload?.data?.results || [];
                const count =
                    result?.totalRecords ??
                    payload?.totalRecords ??
                    payload?.data?.totalRecords ??
                    0;

                const transformed = (Array.isArray(rows) ? rows : []).map(transformQuotationRow);
                setQuotationsList(transformed);
                setTotalCount(Number(count) || 0);
            })
            .catch(() => {
                setQuotationsList([]);
                setTotalCount(0);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [accessToken, page, rowsPerPage, selectedStatus]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Update URL parameters when pagination changes
    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());
        if (selectedStatus !== 'all') params.set('status', selectedStatus);

        setSearchParams(params);
    }, [page, rowsPerPage, selectedStatus, setSearchParams]);

    const handleStatusFilter = useCallback((statusKey) => {
        setSelectedStatus(statusKey);
        setPage(1);
    }, []);

    const getStatusCount = useCallback((statusKey) => {
        if (statsLoading && !quotationStats) return '�';
        return String(getQuotationStatCount(quotationStats, statusKey));
    }, [quotationStats, statsLoading]);

    const getStatusAmount = useCallback((statusKey) => {
        if (statsLoading && !quotationStats) return '�';
        return formatMoney(getQuotationStatAmount(quotationStats, statusKey));
    }, [quotationStats, statsLoading]);
    const handleConvertToSalesOrder = useCallback(async (row) => {
        const quotationId = row?.id;
        if (!quotationId || !accessToken || convertingQuotationId) return;

        setConvertingQuotationId(quotationId);
        try {
            const result = await convertCrmQuotationToSalesOrder(quotationId, accessToken);
            toast.success("Converted to sale order successfully.");

            const salesOrderId =
                result?.data?.id
                ?? result?.data?.salesOrderId
                ?? result?.id
                ?? result?.salesOrderId
                ?? null;

            if (salesOrderId) {
                navigate(`/home/salesOrder/${salesOrderId}`, {
                    state: { salesOrder: result?.data ?? result },
                });
            } else {
                fetchData();
                fetchStats();
            }
        } catch (err) {
            toast.error(err.message || "Failed to convert to sale order");
        } finally {
            setConvertingQuotationId(null);
        }
    }, [accessToken, convertingQuotationId, fetchData, fetchStats, navigate]);

    const columns = [
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            format: (_, row) => formatDateTime(row?.createdAt),
        },
        { id: 'quotationNumber', label: 'QUOTATION NO', align: 'center' },
        { id: 'fullName', label: 'OPPORTUNITY', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
        // { id: 'services', label: 'SERVICE', align: 'center' },
        // {
        //     id: 'convertToSalesOrder',
        //     label: 'ACTION',
        //     align: 'center',
        //     format: (_, row) => {
        //         const opportunityStage =
        //             row?.opportunity?.stage ?? row?.crmOpportunity?.stage ?? null;

        //         if (row.convertedToSalesOrder || opportunityStage !== "closed_won") {
        //             return "-";
        //         }

        //         const isConverting = convertingQuotationId === row.id;

        //         return (
        //             <button
        //                 type="button"
        //                 onClick={(e) => {
        //                     e.stopPropagation();
        //                     handleConvertToSalesOrder(row);
        //                 }}
        //                 disabled={isConverting}
        //                 style={{
        //                     background: "transparent",
        //                     border: "none",
        //                     color: "#0C79F7",
        //                     cursor: isConverting ? "wait" : "pointer",
        //                     fontWeight: 600,
        //                     fontSize: 12,
        //                     whiteSpace: "nowrap",
        //                 }}
        //             >
        //                 {isConverting ? "Converting..." : "Convert to Sale Order"}
        //             </button>
        //         );
        //     },
        // },
    ];

    const activeTabLabel = useMemo(
        () => QUOTATION_TABS.find((tab) => tab.id === selectedStatus)?.label || 'All Quotations',
        [selectedStatus]
    );

    const handleActionClick = useCallback((row) => {
        const opportunityId = getOpportunityIdFromQuotation(row);

        if (!opportunityId) {
            toast.error("No linked opportunity found for this quotation.");
            return;
        }

        navigate(`/home/opportunities/${opportunityId}`, {
            state: {
                opportunity: row.opportunity ?? row.crmOpportunity ?? row,
                initialStage: getPipelineStageIndex("quotation"),
                fromRoute: "quotations",
            },
        });
    }, [navigate]);

    const handleRowClick = useCallback((event, row) => {
        if (event && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.stopPropagation();

            const opportunityId = getOpportunityIdFromQuotation(row);

            if (!opportunityId) {
                toast.error("No linked opportunity found for this quotation.");
                return;
            }

            window.open(`/home/opportunities/${opportunityId}`, "_blank");
            return;
        }

        handleActionClick(row);
    }, [handleActionClick]);
    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <PageHeader title="Quotations" />

            <StageCardsWrapper>
                {QUOTATION_STATUS_FILTERS.map((status) => {
                    const isSelected = selectedStatus === status.key;
                    return (
                        <StageCardItem
                            key={status.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleStatusFilter(status.key)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleStatusFilter(status.key);
                                }
                            }}
                        >
                            <TaxDashboardBox
                                compact
                                selected={isSelected}
                                title={status.title}
                                amount={getStatusCount(status.key)}
                                subtitle={getStatusAmount(status.key)}
                            />
                        </StageCardItem>
                    );
                })}
            </StageCardsWrapper>

            <div
                className="flex gap-6 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {QUOTATION_TABS.map((tab) => {
                    const isActive = selectedStatus === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleStatusFilter(tab.id)}
                            className="pb-3 px-1"
                            style={{
                                fontSize: 14,
                                fontWeight: isActive ? 700 : 600,
                                color: isActive ? '#0C79F7' : '#64748B',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isActive ? '3px solid #0C79F7' : '3px solid transparent',
                                marginBottom: -1,
                                cursor: 'pointer',
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(quotationsList) && quotationsList.length > 0 ? (
                        <MemoTable
                            columns={columns}
                            data={quotationsList}
                            onActionClick={handleActionClick}
                            onRowClick={handleRowClick}
                            disableRowClick={false}
                            quotationsTable={true}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            onRowsPerPageChange={(newRows) => {
                                setRowsPerPage(newRows);
                                setPage(1);
                            }}
                        />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description={`No ${activeTabLabel.toLowerCase()} found.`}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default Quotations;
