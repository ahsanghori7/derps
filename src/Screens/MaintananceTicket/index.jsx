import { useLocation } from "react-router-dom";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import { usePageTitle } from "../../Hooks/usePageTitle";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10,
});

const StageCardsWrapper = styled('div')({
    marginTop: 16,
    marginBottom: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 8,
    '@media (max-width: 1200px)': {
        display: 'flex',
        flexWrap: 'wrap',
    },
});

const StageCardItem = styled('div')({
    cursor: 'pointer',
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
});

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

const STATUS_FILTERS = [
    { key: 'submitted', title: 'Maintenance', subtitle: 'Submitted tickets', countKey: 'submitted', status: 'submitted' },
    { key: 'signed', title: 'Terminal Programming', subtitle: 'Signed tickets', countKey: 'signed', status: 'signed' },
    { key: 'uw', title: 'Deployment', subtitle: 'UW tickets', countKey: 'uw', status: 'uw' },
    { key: 'approved', title: 'Follow-Up', subtitle: 'Approved tickets', countKey: 'approved', status: 'approved' },
];

const DEFAULT_FILTER = 'submitted';

const LEGACY_TAB_MAP = {
    maintainance: 'submitted',
    terminal: 'signed',
    deployment: 'uw',
    'follow-up': 'approved',
    followUp: 'approved',
};

const resolveFilter = (fromState) => {
    if (!fromState) return DEFAULT_FILTER;
    const mapped = LEGACY_TAB_MAP[fromState] || fromState;
    return STATUS_FILTERS.some((item) => item.key === mapped) ? mapped : DEFAULT_FILTER;
};

const extractSupportTicketStats = (result) => {
    const payload = result?.data ?? result;
    const allStats = payload?.allStats && typeof payload.allStats === 'object'
        ? payload.allStats
        : payload;

    if (!allStats || typeof allStats !== 'object') return null;

    const submitted = Number(allStats.totalSubmittedStatusCount) || 0;
    const signed = Number(allStats.totalSignedStatusCount) || 0;
    const uw = Number(allStats.totalUwStatusCount) || 0;
    const approved = Number(allStats.totalApprovedStatusCount) || 0;

    return {
        submitted,
        signed,
        uw,
        approved,
    };
};

const getStatCount = (stats, countKey) => {
    if (!stats) return 0;
    return Number(stats[countKey]) || 0;
};

const MaintananceTicket = () => {
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Support Ticket", location);

    const [loading, setLoading] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState(() => resolveFilter(location.state?.activeTab));
    const [projectList, setProjectList] = useState([]);
    const [ticketStats, setTicketStats] = useState(null);

    useEffect(() => {
        const fromState = location.state?.activeTab;
        if (!fromState) return;
        setSelectedFilter(resolveFilter(fromState));
    }, [location.state]);

    const fetchData = useCallback(() => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}application-ticket`, accessToken)
            .then((result) => {
                setProjectList(result?.data?.results || []);
                setTicketStats(extractSupportTicketStats(result));
                setLoading(false);
            })
            .catch(() => {
                setProjectList([]);
                setTicketStats(null);
                setLoading(false);
            });
    }, [accessToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStatusFilter = useCallback((filterKey) => {
        setSelectedFilter(resolveFilter(filterKey));
    }, []);

    const columnsByFilter = {
        submitted: [
            { id: 'merchantName', label: 'MERCHANT NAME', align: 'center' },
            { id: 'salesRep', label: 'SALES REP', align: 'center' },
            { id: 'assignedAnalyst', label: 'ASSIGNED ANALYST', align: 'center' },
            { id: 'createdAt', label: 'CREATED AT', align: 'center' },
            { id: 'dateApproved', label: 'DATE APPROVED', align: 'center' },
            { id: 'stage', label: 'STAGE', align: 'center' },
        ],
        signed: [
            { id: 'merchantName', label: 'MERCHANT NAME', align: 'center' },
            { id: 'assignedAnalyst', label: 'ASSIGNED ANALYST', align: 'center' },
            { id: 'createdAt', label: 'CREATED AT', align: 'center' },
            { id: 'stage', label: 'STAGE', align: 'center' },
        ],
        uw: [
            { id: 'merchantName', label: 'MERCHANT NAME', align: 'center' },
            { id: 'hardware', label: 'Hardware', align: 'center' },
            { id: 'assignedAnalyst', label: 'ASSIGNED', align: 'center' },
            { id: 'createdAt', label: 'CREATED AT', align: 'center' },
            { id: 'stage', label: 'STAGE', align: 'center' },
        ],
        approved: [
            { id: 'merchantName', label: 'MERCHANT NAME', align: 'center' },
            { id: 'assignedAnalyst', label: 'ANALYST', align: 'center' },
            { id: 'followUpDate', label: 'FOLLOW-UP DATE', align: 'center' },
            { id: 'createdAt', label: 'CREATED AT', align: 'center' },
            { id: 'stage', label: 'STAGE', align: 'center' },
        ],
    };

    const mapTicketToRow = (ticket, filterKey) => {
        const app = ticket.application || {};
        const ticketInfo = ticket.ticket || {};

        const base = {
            merchantName: app.businessName || app.legalName || "-",
            assignedAnalyst: ticketInfo?.assignee?.name || "-",
            salesRep: ticket?.ticket?.agent?.name || "-",
            createdAt: formatDateTime(ticket?.createdAt),
            stage: ticket.status?.charAt(0).toUpperCase() + ticket.status?.slice(1),
            hardware: app?.hardware?.name || "-",
            dateApproved: ticket.updatedAt
                ? new Date(ticket.updatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                })
                : "-",
            followUpDate: ticket.updatedAt
                ? new Date(ticket.updatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                })
                : "-",
            allData: ticket,
        };

        return base;
    };

    const filteredRows = useMemo(() => {
        const selected = STATUS_FILTERS.find((item) => item.key === selectedFilter);
        const statusValue = selected?.status;

        const list = Array.isArray(projectList) ? projectList : [];
        const filtered = statusValue
            ? list.filter((ticket) => ticket.status?.toLowerCase() === statusValue)
            : list;

        return filtered.map((ticket) => mapTicketToRow(ticket, selectedFilter));
    }, [projectList, selectedFilter]);

    const visibleStatusFilters = useMemo(() => {
        return STATUS_FILTERS.filter((status) => {
            if (!ticketStats) return true;
            return getStatCount(ticketStats, status.countKey) > 0;
        });
    }, [ticketStats]);

    const visibleTabs = useMemo(
        () => visibleStatusFilters.map(({ key, title }) => ({ id: key, label: title })),
        [visibleStatusFilters]
    );

    const activeTabLabel = useMemo(
        () => STATUS_FILTERS.find((item) => item.key === selectedFilter)?.title || 'Maintenance',
        [selectedFilter]
    );

    const tableFlags = {
        maintainanceTicket: selectedFilter === 'submitted',
        terminalProgramming: selectedFilter === 'signed',
        deployment: selectedFilter === 'uw',
        followup: selectedFilter === 'approved',
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 16 }}>
            <HeaderWrapper>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Support Tickets'}
                        Fontsize={30}
                    />
                </div>
            </HeaderWrapper>

            <StageCardsWrapper>
                {visibleStatusFilters.map((status) => {
                    const isSelected = selectedFilter === status.key;
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
                                amount={ticketStats ? String(getStatCount(ticketStats, status.countKey)) : '—'}
                                subtitle={status.subtitle}
                            />
                        </StageCardItem>
                    );
                })}
            </StageCardsWrapper>

            <div
                className="flex gap-4 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {visibleTabs.map((tab) => {
                    const isActive = selectedFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleStatusFilter(tab.id)}
                            className="pb-3 px-1"
                            style={{
                                fontSize: 13,
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
                    {filteredRows.length > 0 ? (
                        <MemoTable
                            columns={columnsByFilter[selectedFilter] || columnsByFilter.submitted}
                            data={filteredRows}
                            maintainanceTicket={tableFlags.maintainanceTicket}
                            terminalProgramming={tableFlags.terminalProgramming}
                            deployment={tableFlags.deployment}
                            followup={tableFlags.followup}
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

export default MaintananceTicket;
