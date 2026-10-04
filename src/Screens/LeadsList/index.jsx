import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import AgentTable from "../../Components/AgentTable";
import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import addIcon from "../../assets/addIcon.png";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { normalizeLeadStatusKey } from "../LeadInfo/LeadPath";

const StageCardsWrapper = styled('div')({
    marginTop: 16,
    marginBottom: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 8,
    '@media (max-width: 1200px)': {
        display: 'flex',
        flexWrap: 'wrap',
    },
});

const StageCardItem = styled('div', {
    shouldForwardProp: (prop) => prop !== 'clickable',
})(({ clickable }) => ({
    cursor: clickable ? 'pointer' : 'default',
    minWidth: 0,
    width: '100%',
    '@media (max-width: 1200px)': {
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
}));

const LEAD_STATUS_FILTERS = [
    { key: 'all', title: 'All Leads', subtitle: 'All status total', countKey: 'total', apiStatus: null },
    { key: 'open', title: 'Open', subtitle: 'Open leads', countKey: 'open', apiStatus: 'open' },
    { key: 'not_contacted', title: 'Not Contacted', subtitle: 'Not contacted leads', countKey: 'notContacted', apiStatus: 'not_contacted' },
    { key: 'working', title: 'Working', subtitle: 'Working leads', countKey: 'working', apiStatus: 'working' },
    { key: 'converted', title: 'Converted', subtitle: 'Converted leads', countKey: 'converted', apiStatus: 'converted' },
];

const LEAD_STATUS_TABS = LEAD_STATUS_FILTERS.map(({ key, title }) => ({
    id: key === 'all' ? '' : key,
    label: title,
}));

const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const extractLeadStats = (result) => {
    if (!result || typeof result !== 'object') {
        return {
            total: 0,
            open: 0,
            notContacted: 0,
            working: 0,
            converted: 0,
        };
    }

    // Counts live at response root; list lives in result.data
    const payload = result?.data && typeof result.data === 'object' && !Array.isArray(result.data)
        ? result.data
        : {};
    const source = { ...payload, ...result };

    const open = toCount(source.totalOpenStatusCount);
    const notContacted = toCount(source.totalNotContactedStatusCount);
    const working = toCount(source.totalWorkingStatusCount);
    const converted = toCount(source.totalConvertedStatusCount);
    const summed = open + notContacted + working + converted;
    const total = toCount(source.totalRecords) || summed;

    return {
        total,
        open,
        notContacted,
        working,
        converted,
    };
};

const getLeadStatusBadgeStyle = (statusKey, rawStatus) => {
    const normalized = String(rawStatus ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");

    if (normalized.includes("converted")) {
        return { color: "#7C3AED", backgroundColor: "#EDE9FE" };
    }
    if (normalized.includes("not_contacted") || normalized === "notcontacted") {
        return { color: "#D97706", backgroundColor: "#FEF3C7" };
    }
    if (normalized === "contact" || (normalized.includes("contact") && !normalized.includes("not"))) {
        return { color: "#0891B2", backgroundColor: "#CFFAFE" };
    }

    switch (statusKey) {
        case "open":
            return { color: "#6B7280", backgroundColor: "#F3F4F6" };
        case "working":
            return { color: "#3B82F6", backgroundColor: "#DBEAFE" };
        case "qualified":
            return { color: "#10B981", backgroundColor: "#D1FAE5" };
        case "lost":
            return { color: "#EF4444", backgroundColor: "#FEE2E2" };
        default:
            return { color: "#6B7280", backgroundColor: "#F3F4F6" };
    }
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

const formatStatusLabel = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "Open";

    return raw
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const SERVICE_LABELS = {
    atm: "ATM Solutions",
    "credit-card": "Credit Card Processing",
    "cash-advance": "Cash Advance",
    pos: "Point-Of-Sale Solutions",
    ebt: "EBT Processing",
    airvac: "AIRVAC Systems",
    website: "Website Services",
    "ach-processing": "ACH Processing",
};

const formatServiceLabel = (value) => {
    if (value == null || value === "") return "-";
    const key = String(value).trim().toLowerCase();
    return SERVICE_LABELS[key] || formatStatusLabel(value);
};

const formatLeadStatusBadge = (value) => {
    const rawStatus = String(value ?? "").trim() || "open";
    const statusKey = normalizeLeadStatusKey(rawStatus);
    const { color, backgroundColor } = getLeadStatusBadgeStyle(statusKey, rawStatus);
    const label = formatStatusLabel(rawStatus);

    return (
        <span
            style={{
                color,
                backgroundColor,
                padding: "6px 12px",
                borderRadius: "14px",
                fontSize: "13px",
                fontWeight: "600",
                display: "inline-block",
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </span>
    );
};

const displayValue = (value) => {
    if (value == null || value === "") return "-";
    return String(value);
};

const mapLeadToTableRow = (row) => ({
    ...row,
    fullName: displayValue(row?.fullName),
    businessName: displayValue(row?.businessName),
    email: displayValue(row?.email),
    services: formatServiceLabel(row?.services),
    status: row?.status ?? row?.leadStatus ?? "open",
});

const LeadsList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Leads", location);

    const [loading, setLoading] = useState(false);
    const [leadsList, setLeadsList] = useState([]);
    const [leadsApiData, setLeadsApiData] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);
    const statusFromUrl = searchParams.get('status');
    const [selectedStatus, setSelectedStatus] = useState(
        !statusFromUrl || statusFromUrl === 'all' ? '' : statusFromUrl
    );

    const handleStatusFilter = useCallback((statusKey) => {
        setSelectedStatus(statusKey || '');
        setPage(1);
    }, []);

    const fetchData = useCallback(() => {
        if (!accessToken) return;

        setLoading(true);

        const params = new URLSearchParams();
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        const selected = LEAD_STATUS_FILTERS.find((item) => {
            if (!selectedStatus) return item.key === 'all';
            return item.key === selectedStatus;
        });
        if (selected?.apiStatus) {
            params.append('status', selected.apiStatus);
        }

        const apiUrl = `${baseURl}lead?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then(result => {
                // Keep full response so root-level status counts are available
                setLeadsApiData(result);

                const apiData = result?.data ?? result;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    result?.totalRecords ??
                    0;

                setLeadsList(
                    Array.isArray(rows)
                        ? rows.map(mapLeadToTableRow)
                        : []
                );
                setTotalCount(toCount(count));
                setLoading(false);
            })
            .catch(() => {
                setLeadsList([]);
                setLeadsApiData(null);
                setTotalCount(0);
                setLoading(false);
            });
    }, [accessToken, page, rowsPerPage, selectedStatus]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());
        if (selectedStatus) params.set('status', selectedStatus);

        setSearchParams(params);
    }, [page, rowsPerPage, selectedStatus, setSearchParams]);

    const stats = useMemo(() => extractLeadStats(leadsApiData), [leadsApiData]);

    const summaryCards = useMemo(() => (
        LEAD_STATUS_FILTERS.map((status) => ({
            key: status.key,
            title: status.title,
            amount: Number(stats[status.countKey] || 0).toLocaleString(),
            subtitle: status.subtitle,
            filterKey: status.key === 'all' ? '' : status.key,
            clickable: true,
        }))
    ), [stats]);

    const activeTabLabel = useMemo(
        () => LEAD_STATUS_TABS.find((tab) => tab.id === (selectedStatus || ''))?.label || 'All Leads',
        [selectedStatus]
    );

    const handleButtonClick = () => {
        navigate('/home/addLeads');
    };

    const openLead = (row, event) => {
        const leadUrl = `/home/leadInfo/lead/${row.id}`;
        if (event?.ctrlKey || event?.metaKey) {
            window.open(leadUrl, '_blank');
            return;
        }

        navigate(leadUrl, {
            state: {
                itemData: row,
                fromRoute: 'leadsList',
                returnTo: `${location.pathname}${location.search}`,
            },
        });
    };

    const columns = [
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        { id: 'fullName', label: 'LEAD NAME', align: 'center' },
        { id: 'businessName', label: 'BUSINESS NAME', align: 'center' },
        { id: 'email', label: 'EMAIL', align: 'center' },
        { id: 'services', label: 'SERVICE', align: 'center' },
        {
            id: 'statusBadge',
            label: 'STATUS',
            align: 'center',
            renderCell: (row) => formatLeadStatusBadge(row?.status),
        },
        {
            id: 'action',
            label: 'ACTION',
            align: 'center',
            renderCell: (row) => (
                <button
                    type="button"
                    onClick={(event) => openLead(row, event)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#3B82F6',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: 14,
                    }}
                >
                    View
                </button>
            ),
        },
    ];

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 16 }}>
            <PageHeader
                title="Leads"
                actions={(
                    <AppButton
                        icon={addIcon}
                        title="Add Lead"
                        onClick={handleButtonClick}
                    />
                )}
            />

            {/* Summary cards — same pattern as Inventory */}
            <StageCardsWrapper>
                {summaryCards.map((card) => {
                    const isSelected = (card.filterKey || '') === (selectedStatus || '');

                    return (
                        <StageCardItem
                            key={card.key}
                            clickable={card.clickable}
                            role={card.clickable ? 'button' : undefined}
                            tabIndex={card.clickable ? 0 : undefined}
                            onClick={() => {
                                if (card.clickable) handleStatusFilter(card.filterKey || '');
                            }}
                            onKeyDown={(event) => {
                                if (!card.clickable) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleStatusFilter(card.filterKey || '');
                                }
                            }}
                        >
                            <TaxDashboardBox
                                compact
                                selected={isSelected}
                                title={card.title}
                                amount={card.amount}
                                subtitle={card.subtitle}
                            />
                        </StageCardItem>
                    );
                })}
            </StageCardsWrapper>

            <div
                className="flex gap-6 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {LEAD_STATUS_TABS.map((tab) => {
                    const isActive = (selectedStatus || '') === tab.id;
                    return (
                        <button
                            key={tab.id || 'all'}
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
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-2" style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    border: '1px solid var(--sidebar-divider)',
                    borderRadius: 16,
                    padding: 12,
                }}>
                    {Array.isArray(leadsList) && leadsList.length > 0 ? (
                        <AgentTable
                            columns={columns}
                            data={leadsList}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            onRowsPerPageChange={(newRows) => {
                                setRowsPerPage(newRows);
                                setPage(1);
                            }}
                            onRowClick={openLead}
                            containerMaxHeight="calc(100vh - 300px)"
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

export default LeadsList;
