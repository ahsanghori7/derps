import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import { styled } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import addIcon from "../../assets/addIcon.png";
import { Link2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useState, useCallback } from "react";
import { deleteRequest, getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import FilterDropdown from "../../Components/FilterDropdown";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import {
    Box,
    Chip,
    Collapse,
    IconButton,
    Stack,
    Tooltip,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { usePageTitle } from "../../Hooks/usePageTitle";

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

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
    flexWrap: 'wrap',
    gap: 10
});

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

const StageCardItem = styled('div', {
    shouldForwardProp: (prop) => prop !== 'clickable',
})(({ clickable }) => ({
    cursor: clickable ? 'pointer' : 'default',
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
}));

const APPLICATION_STATUS_FILTERS = [
    { key: 'all', title: 'All', subtitle: 'All applications', countKey: 'total', apiStatus: null },
    { key: 'draft', title: 'Draft', subtitle: 'Draft applications', countKey: 'draft', apiStatus: 'draft' },
    { key: 'pending', title: 'Pending', subtitle: 'Pending applications', countKey: 'pending', apiStatus: 'pending' },
    { key: 'completed', title: 'Completed', subtitle: 'Completed applications', countKey: 'completed', apiStatus: 'completed' },
    { key: 'in-active', title: 'In-Active', subtitle: 'Inactive applications', countKey: 'inactive', apiStatus: 'in-active' },
    { key: 'approved', title: 'Approved', subtitle: 'Approved applications', countKey: 'approved', apiStatus: 'approved' },
    { key: 'declined-rejected', title: 'Declined', subtitle: 'Declined / rejected', countKey: 'declined', apiStatus: 'declined-rejected' },
    { key: 'under-review', title: 'Under Review', subtitle: 'Under review', countKey: 'underReview', apiStatus: 'under-review' },
    { key: 'on-hold', title: 'On Hold', subtitle: 'On hold applications', countKey: 'onHold', apiStatus: 'on-hold' },
    { key: 'suspicious-activity', title: 'Suspicious', subtitle: 'Suspicious activity', countKey: 'suspicious', apiStatus: 'suspicious-activity' },
    { key: 'verification-required', title: 'Verification', subtitle: 'Verification required', countKey: 'verification', apiStatus: 'verification-required' },
    { key: 'incomplete', title: 'Incomplete', subtitle: 'Incomplete applications', countKey: 'incomplete', apiStatus: 'incomplete' },
    { key: 'cancelled', title: 'Cancelled', subtitle: 'Cancelled applications', countKey: 'cancelled', apiStatus: 'cancelled' },
];

const APPLICATION_STATUS_TABS = APPLICATION_STATUS_FILTERS.map(({ key, title }) => ({
    id: key === 'all' ? '' : key,
    label: title,
}));

const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const extractApplicationStats = (result) => {
    if (!result || typeof result !== 'object') {
        return {
            total: 0,
            draft: 0,
            pending: 0,
            completed: 0,
            inactive: 0,
            approved: 0,
            declined: 0,
            underReview: 0,
            onHold: 0,
            suspicious: 0,
            verification: 0,
            incomplete: 0,
            cancelled: 0,
        };
    }

    const payload = result?.data && typeof result.data === 'object' && !Array.isArray(result.data)
        ? result.data
        : {};
    const source = { ...payload, ...result };

    const draft = toCount(source.totalDraftStatusCount);
    const pending = toCount(source.totalPendingStatusCount);
    const completed = toCount(source.totalCompletedStatusCount);
    const inactive = toCount(source.totalInactiveStatusCount);
    const approved = toCount(source.totalApprovedStatusCount);
    const declined = toCount(source.totalDeclinedStatusCount);
    const underReview = toCount(source.totalUnderReviewStatusCount);
    const onHold = toCount(source.totalOnHoldStatusCount);
    const suspicious = toCount(source.totalSuspiciousStatusCount);
    const verification = toCount(source.totalVerificationStatusCount);
    const incomplete = toCount(source.totalIncompleteStatusCount);
    const cancelled = toCount(source.totalCancelledStatusCount);
    const total =
        draft + pending + completed + inactive + approved + declined +
        underReview + onHold + suspicious + verification + incomplete + cancelled;

    return {
        total,
        draft,
        pending,
        completed,
        inactive,
        approved,
        declined,
        underReview,
        onHold,
        suspicious,
        verification,
        incomplete,
        cancelled,
    };
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

const STATUS_BADGE_STYLES = {
    draft: { color: '#64748B', bg: 'rgba(100, 116, 139, 0.16)', icon: EditOutlinedIcon },
    approved: { color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.16)', icon: CheckCircleOutlineIcon },
    pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)', icon: PendingOutlinedIcon },
    'under-review': { color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)', icon: HourglassEmptyOutlinedIcon },
    'verification-required': { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', icon: VerifiedUserOutlinedIcon },
    incomplete: { color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)', icon: RemoveCircleOutlineIcon },
    'on-hold': { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: PauseCircleOutlineIcon },
    'suspicious-activity': { color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)', icon: ReportProblemOutlinedIcon },
    cancelled: { color: '#475569', bg: 'rgba(71, 85, 105, 0.12)', icon: CancelOutlinedIcon },
    rejected: { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)', icon: CancelOutlinedIcon },
    'declined-rejected': { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)', icon: CancelOutlinedIcon },
    completed: { color: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)', icon: CheckCircleOutlineIcon },
};

const formatStatusLabel = (status) => {
    if (!status) return '-';
    return String(status)
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const isDraftApplication = (row) => String(row?.status || '').trim().toLowerCase() === 'draft';

const renderStatusBadge = (status) => {
    const key = String(status || '').trim().toLowerCase();
    const styles = STATUS_BADGE_STYLES[key] || {
        color: '#334155',
        bg: 'rgba(148, 163, 184, 0.12)',
        icon: PendingOutlinedIcon,
    };
    const Icon = styles.icon;

    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 12px',
                    borderRadius: 999,
                    backgroundColor: styles.bg,
                    color: styles.color,
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: 110,
                    textTransform: 'none',
                    letterSpacing: 0.2,
                    gap: 6,
                }}
            >
                {Icon && <Icon sx={{ fontSize: 14 }} />}
                {formatStatusLabel(status)}
            </span>
        </div>
    );
};

const AdminApplication = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Application", location);
    const pathFilters = useMemo(() => {
        const segments = location.pathname.replace('/home/adminApplication', '').split('/').filter(Boolean);
        const result = {
            tab: '',
            status: '',
            solution: 'all',
            keyword: '',
            page: '1',
            rows: '25',
        };

        for (let i = 0; i < segments.length; i += 1) {
            const key = segments[i];
            const value = segments[i + 1];
            if (!key || !value) continue;

            if (key === 'tab') result.tab = value;
            if (key === 'status') result.status = value;
            if (key === 'solution') result.solution = value;
            if (key === 'keyword') result.keyword = decodeURIComponent(value);
            if (key === 'page') result.page = value;
            if (key === 'rows') result.rows = value;
        }

        return result;
    }, [location.pathname]);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [trainingList, setTrainingList] = useState([]);
    const [applicationApiData, setApplicationApiData] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const selectedStatus = pathFilters.status || (pathFilters.tab === 'pending' ? 'pending' : pathFilters.tab === 'completed' ? 'completed' : 'all');
    const selectedSolution = pathFilters.solution || 'all';
    const searchText = pathFilters.keyword || '';
    const [keywordDraft, setKeywordDraft] = useState(searchText);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [idsToDelete, setIdsToDelete] = useState([]);
    const [selectedApplicationIds, setSelectedApplicationIds] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const page = Math.max(1, Number(pathFilters.page) || 1);
    const rowsPerPage = [5, 10, 25, 50].includes(Number(pathFilters.rows)) ? Number(pathFilters.rows) : 25;

    const solutionFilterOptions = [
        { label: 'All', value: 'all' },
        { label: 'ATM Solutions', value: 'atm' },
        { label: 'Credit Card Processing', value: 'credit-card' },
        { label: 'Cash Advance', value: 'cash-advance' },
        { label: 'Point-Of-Sale Solutions', value: 'pos' },
        { label: 'EBT Processing', value: 'ebt' },
        { label: 'AIRVAC Systems', value: 'airvac' },
        { label: 'Website Services', value: 'website' },
        { label: 'ACH Processing', value: 'ach-processing' },
    ];

    const statusFilterOptions = APPLICATION_STATUS_FILTERS.map((status) => ({
        label: status.title === 'All' ? 'All' : status.title,
        value: status.key,
    }));

    useEffect(() => {
        setKeywordDraft(searchText);
    }, [searchText, location.pathname]);

    const fetchData = useCallback(() => {
        setLoading(true);

        const params = new URLSearchParams();
        if (!selectedStatus || selectedStatus === 'all') {
            params.append('allStatus', 'true');
        }
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        if (selectedStatus && selectedStatus !== 'all') {
            params.append('status', selectedStatus);
        }
        if (selectedSolution && selectedSolution !== 'all') {
            params.append('solution', selectedSolution);
        }
        if (searchText && searchText.trim()) {
            params.append('keyword', searchText.trim());
        }

        const apiUrl = `${baseURl}application?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then(result => {
                setApplicationApiData(result);

                const apiData = result?.data;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    0;

                setTrainingList(Array.isArray(rows) ? rows : []);
                setTotalCount(Number(count) || 0);
                setLoading(false);
                setHasFetched(true);
            })
            .catch(error => {
                setApplicationApiData(null);
                setTrainingList([]);
                setTotalCount(0);
                setLoading(false);
                setHasFetched(true);
            });
    }, [accessToken, page, rowsPerPage, selectedStatus, selectedSolution, searchText]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setSelectedApplicationIds([]);
    }, [selectedStatus, selectedSolution, searchText, page, rowsPerPage]);

    // Backend handles filtering and pagination; use data directly from API
    const filteredTrainingList = trainingList;

    const navigateWithFilters = (updates = {}) => {
        const next = {
            status: selectedStatus,
            solution: selectedSolution,
            keyword: searchText,
            page,
            rows: rowsPerPage,
            ...updates,
        };

        const normalizedStatus = String(next.status || 'all');
        const normalizedSolution = String(next.solution || 'all');
        const normalizedSearch = String(next.keyword || '').trim();
        const normalizedPage = Math.max(1, Number(next.page) || 1);
        const normalizedRows = [5, 10, 25, 50].includes(Number(next.rows)) ? Number(next.rows) : 25;

        const segments = [];
        if (normalizedStatus && normalizedStatus !== 'all') segments.push('status', normalizedStatus);
        if (normalizedSolution && normalizedSolution !== 'all') segments.push('solution', normalizedSolution);
        if (normalizedSearch) segments.push('keyword', encodeURIComponent(normalizedSearch));
        if (normalizedPage > 1) segments.push('page', String(normalizedPage));
        if (normalizedRows !== 25) segments.push('rows', String(normalizedRows));

        const nextPath = segments.length > 0 ? `/home/adminApplication/${segments.join('/')}` : '/home/adminApplication';
        if (nextPath !== location.pathname) {
            navigate(nextPath, { replace: true });
        }
    };

    const handleStatusFilter = (statusKey) => {
        navigateWithFilters({ status: statusKey || 'all', page: 1 });
    };

    const handleClearFilters = useCallback(() => {
        navigateWithFilters({ status: 'all', solution: 'all', keyword: '', page: 1 });
    }, [navigateWithFilters]);

    const handleApplyFilters = useCallback(() => {
        navigateWithFilters({ keyword: keywordDraft, page: 1 });
    }, [navigateWithFilters, keywordDraft]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (searchText.trim()) chips.push({ key: 'search', label: `Search: ${searchText.trim()}` });
        if (selectedStatus && selectedStatus !== 'all') {
            chips.push({
                key: 'status',
                label: `Status: ${
                    APPLICATION_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title ||
                    selectedStatus
                }`,
            });
        }
        if (selectedSolution && selectedSolution !== 'all') {
            chips.push({
                key: 'solution',
                label: `Type: ${
                    solutionFilterOptions.find((s) => s.value === selectedSolution)?.label ||
                    selectedSolution
                }`,
            });
        }
        return chips;
    }, [searchText, selectedStatus, selectedSolution, solutionFilterOptions]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') navigateWithFilters({ keyword: '', page: 1 });
        if (key === 'status') navigateWithFilters({ status: 'all', page: 1 });
        if (key === 'solution') navigateWithFilters({ solution: 'all', page: 1 });
    }, [navigateWithFilters]);

    const stats = useMemo(() => extractApplicationStats(applicationApiData), [applicationApiData]);

    const summaryCards = useMemo(() => (
        APPLICATION_STATUS_FILTERS.map((status) => ({
            key: status.key,
            title: status.title,
            amount: Number(stats[status.countKey] || 0).toLocaleString(),
            subtitle: status.subtitle,
            filterKey: status.key === 'all' ? '' : status.key,
            clickable: true,
        }))
    ), [stats]);

    // Backend pagination: max page validation handled by backend
    useEffect(() => {
        if (!hasFetched || loading || totalCount === 0) return;
        const maxPage = Math.max(1, Math.ceil(totalCount / rowsPerPage));
        if (page > maxPage) {
            navigateWithFilters({ page: maxPage });
        }
    }, [hasFetched, loading, totalCount, page, rowsPerPage]);

    const handleButtonClick = () => {
        navigate('/home/userActivations');
    };

    const handleSelectionChange = (selectedIds) => {
        setSelectedApplicationIds(selectedIds);
    };

    const handleDeleteApplication = (row, event) => {
        event?.stopPropagation?.();
        if (!isDraftApplication(row) || !row?.id) return;
        setIdsToDelete([row.id]);
        setShowDeleteModal(true);
    };

    const handleBulkDelete = () => {
        const draftIds = selectedApplicationIds.filter((id) => {
            const row = trainingList.find((item) => item.id === id);
            return isDraftApplication(row);
        });
        if (!draftIds.length) return;
        setIdsToDelete(draftIds);
        setShowDeleteModal(true);
    };

    const cancelDelete = () => {
        if (deleting) return;
        setShowDeleteModal(false);
        setIdsToDelete([]);
    };

    const proceedWithDelete = async () => {
        const ids = [...idsToDelete];
        if (!ids.length || deleting) return;

        setDeleting(true);
        let successCount = 0;

        for (const id of ids) {
            try {
                await deleteRequest(`${baseURl}application/${id}`, accessToken);
                successCount += 1;
            } catch (error) {
                toast.error(error?.message || `Failed to delete application ${id}`);
            }
        }

        if (successCount > 0) {
            toast.success(
                successCount === 1
                    ? 'Application deleted successfully'
                    : `${successCount} applications deleted successfully`
            );
        }

        setShowDeleteModal(false);
        setIdsToDelete([]);
        if (successCount > 0) {
            setSelectedApplicationIds((prev) => prev.filter((id) => !ids.includes(id)));
            fetchData();
        }
        setDeleting(false);
    };

    const columns = [
        { id: 'id', label: 'Application No', align: 'center' },
        { id: 'solution', label: 'Application Type', align: 'center' },
        { id: 'businessName', label: 'Business Name', align: 'center' },
        { id: 'agent.username', label: 'Agent', align: 'center' },
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        { id: 'status', label: 'Status', align: 'center', format: renderStatusBadge },
        { id: 'edit', label: 'Edit', align: 'center' },
        {
            id: 'delete',
            label: 'Delete',
            align: 'center',
            format: (_, row) => {
                if (!isDraftApplication(row)) return '-';
                return (
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
                    >
                        <button
                            type="button"
                            title="Delete draft application"
                            onClick={(event) => handleDeleteApplication(row, event)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                            }}
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 20, color: '#DC3545' }} />
                        </button>
                    </div>
                );
            },
        },
    ];

    const selectedStatusKey = selectedStatus === 'all' ? '' : selectedStatus;
    const hasDraftRows = trainingList.some(isDraftApplication);

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Application`}
                    Fontsize={30}
                />
                <div className="flex items-center gap-2">
                    <BottonWithIcon
                        backgroundColor={'#fff'}
                        svg={<Link2 size={16} style={{ marginRight: 6 }} />}
                        title={'Public Application Link'}
                        height={40}
                        color={'#0C79F7'}
                        fontSize={16}
                        fontWeight={500}
                        border={'1px solid #0C79F7'}
                        className="!mb-0 !mx-0"
                        onClick={() => navigate('/home/applicationLinkSettings')}
                    />
                    <BottonWithIcon
                        backgroundColor={'#0C79F7'}
                        icon={addIcon}
                        title={'Add Application'}
                        height={40}
                        color={'var(--sidebar-text-selected)'}
                        fontSize={16}
                        fontWeight={500}
                        className="!mb-0 !mx-0"
                        onClick={handleButtonClick}
                    />
                </div>
            </HeaderWrapper>

            <StageCardsWrapper>
                {summaryCards.map((card) => {
                    const isSelected = (card.filterKey || '') === (selectedStatusKey || '');

                    return (
                        <StageCardItem
                            key={card.key}
                            clickable={card.clickable}
                            role={card.clickable ? 'button' : undefined}
                            tabIndex={card.clickable ? 0 : undefined}
                            onClick={() => {
                                if (card.clickable) handleStatusFilter(card.filterKey || 'all');
                            }}
                            onKeyDown={(event) => {
                                if (!card.clickable) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleStatusFilter(card.filterKey || 'all');
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
                className="flex gap-4 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {APPLICATION_STATUS_TABS.map((tab) => {
                    const isActive = (selectedStatusKey || '') === tab.id;
                    return (
                        <button
                            key={tab.id || 'all'}
                            type="button"
                            onClick={() => handleStatusFilter(tab.id || 'all')}
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

            <div
                className="mt-4"
                style={{
                    background: 'var(--dashboard-card-bg)',
                    border: '1px solid var(--dashboard-box-border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}
            >
                <Box
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setFiltersExpanded((prev) => !prev);
                        }
                    }}
                    onClick={() => setFiltersExpanded((prev) => !prev)}
                    sx={{
                        px: 2,
                        py: 1,
                        borderBottom: filtersExpanded ? '1px solid var(--dashboard-box-border)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        cursor: 'pointer',
                        userSelect: 'none',
                        background:
                            'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)',
                        '&:hover': {
                            background:
                                'linear-gradient(180deg, rgba(241,245,249,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                        },
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        <TuneIcon fontSize="small" />
                        <Box sx={{ fontWeight: 700, fontSize: 14 }}>Filters</Box>
                        {!filtersExpanded && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                {selectedStatus && selectedStatus !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={
                                            APPLICATION_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title ||
                                            selectedStatus
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {searchText.trim() && (
                                    <Chip size="small" label={`Search: ${searchText.trim()}`} variant="outlined" />
                                )}
                                {selectedSolution && selectedSolution !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={`Type: ${
                                            solutionFilterOptions.find((s) => s.value === selectedSolution)?.label ||
                                            selectedSolution
                                        }`}
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        )}
                    </Box>
                    <Tooltip title={filtersExpanded ? 'Hide filters' : 'Show filters'}>
                        <IconButton
                            size="small"
                            aria-label={filtersExpanded ? 'Hide filters' : 'Show filters'}
                            onClick={(e) => {
                                e.stopPropagation();
                                setFiltersExpanded((prev) => !prev);
                            }}
                        >
                            {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>

                <Collapse in={filtersExpanded}>
                    <Box sx={{ px: 2, py: 1.25 }}>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div
                                style={{
                                    background: 'var(--chrome-filter-bar-bg)',
                                    borderRadius: 8,
                                    padding: '0 12px',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'center',
                                    flex: '1 1 240px',
                                    maxWidth: 420,
                                    minWidth: 200,
                                    height: 40,
                                    boxSizing: 'border-box',
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
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by business name or agent..."
                                    value={keywordDraft}
                                    onChange={(e) => setKeywordDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        handleApplyFilters();
                                    }}
                                    style={{
                                        outline: 'none',
                                        background: 'transparent',
                                        width: '100%',
                                        fontSize: 13,
                                        border: 'none',
                                        color: 'var(--sidebar-text-primary)',
                                    }}
                                />
                            </div>

                            <FilterDropdown
                                value={selectedSolution}
                                onChange={(next) => navigateWithFilters({ solution: next, page: 1 })}
                                options={solutionFilterOptions.map((opt) =>
                                    opt.value === 'all'
                                        ? { ...opt, label: 'All Application Types' }
                                        : opt
                                )}
                                placeholder="All Application Types"
                                minWidth={200}
                                placeholderValues={["all"]}
                            />

                            <FilterDropdown
                                value={selectedStatus}
                                onChange={(next) => {
                                    navigateWithFilters({ status: next, page: 1 });
                                }}
                                options={statusFilterOptions.map((opt) =>
                                    opt.value === 'all'
                                        ? { ...opt, label: 'All Statuses' }
                                        : opt
                                )}
                                placeholder="All Statuses"
                                minWidth={180}
                                placeholderValues={["all"]}
                                searchable
                                searchPlaceholder="Search status..."
                            />

                            <div className="flex gap-2 items-center ml-auto">
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    style={{
                                        height: 36,
                                        padding: '0 14px',
                                        borderRadius: 8,
                                        border: '1px solid var(--dashboard-box-border)',
                                        background: 'var(--dashboard-card-bg2)',
                                        color: 'var(--dashboard-text-primary)',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Clear Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    style={{
                                        height: 36,
                                        padding: '0 14px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#24282E',
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>

                        {activeFilterChips.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2 items-center">
                                {activeFilterChips.map((chip) => (
                                    <FilterChip
                                        key={chip.key}
                                        label={chip.label}
                                        onRemove={() => removeFilterChip(chip.key)}
                                    />
                                ))}
                            </div>
                        )}
                    </Box>
                </Collapse>
            </div>

            <div className="w-[100%]" style={{ borderRadius: 14, padding: 20 }}>
                {selectedApplicationIds.length > 0 && (
                    <div className="flex justify-end mb-3">
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            disabled={deleting}
                            style={{
                                height: 36,
                                padding: '0 14px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#dc3545',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: deleting ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Delete Selected ({selectedApplicationIds.length})
                        </button>
                    </div>
                )}
                {loading ? (
                    <div className="text-center w-full mx-auto py-8">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : Array.isArray(filteredTrainingList) && filteredTrainingList.length > 0 ? (
                    <MemoTable
                        columns={columns}
                        data={filteredTrainingList}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={(nextPage) => navigateWithFilters({ page: nextPage })}
                        onRowsPerPageChange={(next) => {
                            navigateWithFilters({ rows: next, page: 1 });
                        }}
                        adminApplication={true}
                        showCheckbox={hasDraftRows}
                        selectedRowIds={selectedApplicationIds}
                        onSelectionChange={handleSelectionChange}
                        isRowSelectable={isDraftApplication}
                    />
                ) : (
                    <NoDataFound
                        title="No Data Found"
                        description="No applications found for the selected filters."
                    />
                )}
            </div>
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                    }}>
                        <h3 style={{
                            margin: '0 0 15px 0',
                            color: '#333',
                            fontSize: '18px',
                            fontWeight: '600'
                        }}>
                            Confirm Delete
                        </h3>
                        <p style={{
                            margin: '0 0 20px 0',
                            color: '#666',
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}>
                            Are you sure you want to delete {idsToDelete.length === 1 ? 'this draft application' : `these ${idsToDelete.length} draft applications`}? This action cannot be undone.
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                type="button"
                                onClick={cancelDelete}
                                disabled={deleting}
                                style={{
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={proceedWithDelete}
                                disabled={deleting}
                                style={{
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminApplication;
