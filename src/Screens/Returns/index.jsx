import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import MemoTable from "../../Components/MemoTable";
import ReturnItemModal from "./ReturnModal";
import ReturnRequestModal from "./ReturnRequestModal";
import { useSelector } from "react-redux";
import { getRequestWithOutBody, postRequestWithBodyAndToken, buildAuthHeaders } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import FilterDropdown from "../../Components/FilterDropdown";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import addIcon from "../../assets/addIcon.png";
import {
    Box,
    Button,
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
    marginBottom: 5,
    flexWrap: 'wrap',
    gap: 10
});

const StageCardsWrapper = styled('div')({
    marginTop: 16,
    marginBottom: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
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

const RETURN_STATUS_FILTERS = [
    { key: 'all', title: 'All Returns', subtitle: 'Total return requests' },
    { key: 'pending', title: 'Pending', subtitle: 'Returns awaiting review' },
    { key: 'approved', title: 'Approved', subtitle: 'Approved return requests' },
    { key: 'rejected', title: 'Rejected', subtitle: 'Rejected return requests' },
    { key: 'completed', title: 'Complete', subtitle: 'Completed return requests' },
];

const RETURN_TABS = RETURN_STATUS_FILTERS.map(({ key, title }) => ({
    id: key,
    label: title,
}));

const extractReturnStats = (result) => {
    if (!result || typeof result !== 'object') return null;

    const pending = Number(result.totalPendingStatusCount) || 0;
    const approved = Number(result.totalApprovedStatusCount) || 0;
    const rejected = Number(result.totalRejectedStatusCount) || 0;
    const completed =
        Number(result.totalCompletedStatusCount ?? result.totalCompleteStatusCount) || 0;

    return {
        pending,
        approved,
        rejected,
        completed,
        total: pending + approved + rejected + completed,
    };
};

const getReturnStatCount = (stats, statusKey) => {
    if (!stats) return 0;
    if (statusKey === 'all') return Number(stats.total) || 0;
    return Number(stats[statusKey]) || 0;
};

const Returns = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const authData = useSelector((state) => state.auth);
    
    // Update browser tab title
    usePageTitle("Returns", location);
    let accessToken = authData?.accessToken || localStorage.getItem("accessToken") || authData?.token;

    // Ensure token is a plain string, not JSON
    if (typeof accessToken === 'string') {
        try {
            // If it's a JSON string, parse it
            const parsed = JSON.parse(accessToken);
            accessToken = parsed.token || parsed.accessToken || accessToken;
        } catch (e) {
            // It's already a plain string, use as-is
            accessToken = accessToken;
        }
    }
    const [selectedItem, setSelectedItem] = useState('');
    const [selectedMerchant, setSelectedMerchant] = useState(searchParams.get('merchant') || '');
    const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedReturnData, setSelectedReturnData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [returnData, setReturnData] = useState([]);
    const [returnStats, setReturnStats] = useState(null);
    const [returnDataLoaded, setReturnDataLoaded] = useState(false);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [merchantList, setMerchantList] = useState([]);
    const [merchantsLoading, setMerchantsLoading] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const merchantOptions = useMemo(() => {
        if (!Array.isArray(merchantList)) return [];
        return merchantList.map((merchant, index) => {
            const value = merchant.id?.toString() || merchant.merchantId?.toString() || `merchant_${index + 1}`;
            const label = `${merchant.firstName || ''} ${merchant.lastName || ''}`.trim() || `Merchant ${index + 1}`;
            return { label, value };
        });
    }, [merchantList]);

    const statusFilterOptions = [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Completed', value: 'completed' },
    ];

    const handleStatusFilter = useCallback((statusKey) => {
        setSelectedStatus(statusKey || 'all');
        setPage(1);
    }, []);

    const handleClearFilters = useCallback(() => {
        setSelectedItem('');
        setSelectedMerchant('');
        setSelectedStatus('all');
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setPage(1);
    }, []);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (selectedMerchant) {
            const merchantLabel =
                merchantOptions.find((m) => m.value === selectedMerchant)?.label ||
                selectedMerchant;
            chips.push({ key: 'merchant', label: `Merchant: ${merchantLabel}` });
        }
        if (selectedStatus && selectedStatus !== 'all') {
            chips.push({
                key: 'status',
                label: `Status: ${
                    statusFilterOptions.find((s) => s.value === selectedStatus)?.label ||
                    selectedStatus
                }`,
            });
        }
        return chips;
    }, [selectedMerchant, selectedStatus, merchantOptions]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'merchant') setSelectedMerchant('');
        if (key === 'status') setSelectedStatus('all');
        setPage(1);
    }, []);

    const getStatusCount = useCallback((statusKey) => {
        if (!returnStats) return '—';
        return String(getReturnStatCount(returnStats, statusKey));
    }, [returnStats]);

    // Fetch return items from API
    const fetchReturnItems = useCallback(() => {
        setLoading(true);

        // Build query parameters
        const params = new URLSearchParams();
        const statusParam = selectedStatus && selectedStatus !== 'all' ? selectedStatus : null;
        if (statusParam) params.append('status', statusParam);
        if (selectedMerchant) params.append('merchantId', selectedMerchant);
        params.append('page', page.toString());
        params.append('limit', rowsPerPage.toString());

        const url = `${baseURl}inventory/return-item${params.toString() ? '?' + params.toString() : ''}`;

        getRequestWithOutBody(url, accessToken)
            .then(result => {
                setReturnStats(extractReturnStats(result));

                // Transform API data to match our table structure
                const transformedData = result?.data?.map((item, index) => ({
                    id: item.id || index + 1,
                    returnId: item.returnId || `RET-${String(index + 1).padStart(3, '0')}`,
                    date: item.date || item.createdAt ? new Date(item.date || item.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric"
                    }) : new Date().toLocaleString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric"
                    }),
                    itemName: item.itemName || item.name || 'Unknown Item',
                    serialNumber: item.serialNumber || item.serial || 'N/A',
                    merchant: item.merchantName || item.merchant || 'Unknown Merchant',
                    reason: item.reason || item.returnReason || 'N/A',
                    status: item.status || 'pending',
                    action: 'View',
                    // Keep original data for modal
                    ...item
                })) || [];

                setReturnData(transformedData);
                setLoading(false);
                setReturnDataLoaded(true);
            })
            .catch(error => {
                setReturnData([]);
                setReturnStats(null);
                setLoading(false);
                setReturnDataLoaded(true);
            });
    }, [accessToken, selectedStatus, selectedMerchant, page, rowsPerPage]);

    // Fetch item services for dropdown
    const fetchItemServices = useCallback(() => {
        setItemsLoading(true);
        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then(result => {
                setItemServicesList(result?.data || []);
                setItemsLoading(false);
            })
            .catch(err => {
                setItemServicesList([]);
                setItemsLoading(false);
            });
    }, [accessToken]);

    // Fetch merchants for dropdown
    const fetchMerchants = useCallback(() => {
        setMerchantsLoading(true);
        getRequestWithOutBody(`${baseURl}customer`, accessToken)
            .then(result => {
                setMerchantList(Array.isArray(result?.data?.data) ? result.data.data : []);
                setMerchantsLoading(false);
            })
            .catch(err => {
                setMerchantList([]);
                setMerchantsLoading(false);
            });
    }, [accessToken]);

    // Fetch data on component mount and when filters change
    useEffect(() => {
        fetchReturnItems();
        fetchItemServices();
        fetchMerchants();
    }, [fetchReturnItems, fetchItemServices, fetchMerchants]);

    // Update URL parameters when filters or pagination change
    useEffect(() => {
        const params = new URLSearchParams();

        if (selectedItem) params.set('item', selectedItem);
        if (selectedMerchant) params.set('merchant', selectedMerchant);
        if (selectedStatus && selectedStatus !== 'all') params.set('status', selectedStatus);
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());

        setSearchParams(params, { replace: true });
    }, [selectedItem, selectedMerchant, selectedStatus, page, rowsPerPage, setSearchParams]);

    // Reset page when merchant/item filters change
    useEffect(() => {
        setPage(1);
    }, [selectedItem, selectedMerchant]);

    // Table columns configuration
    const columns = [
        { id: 'returnId', label: 'Return ID', align: 'center' },
        { id: 'date', label: 'Date', align: 'center' },
        { id: 'itemName', label: 'Item Name', align: 'center' },
        { id: 'serialNumber', label: 'Serial Number', align: 'center' },
        { id: 'merchant', label: 'Merchant', align: 'center' },
        { id: 'reason', label: 'Reason', align: 'center' },
        {
            id: 'status',
            label: 'Status',
            align: 'center',
            format: (value) => {
                let color = '#000000'; // Default black
                let backgroundColor = '#FFFFFF'; // Default white
                let fontWeight = 'normal';

                switch (value?.toLowerCase()) {
                    case 'pending':
                        color = '#F59E0B'; // Yellow/amber
                        backgroundColor = '#FEF3C7';
                        fontWeight = '600';
                        break;
                    case 'approved':
                        color = '#10B981'; // Green
                        backgroundColor = '#D1FAE5';
                        fontWeight = '600';
                        break;
                    case 'processing':
                        color = '#3B82F6'; // Blue
                        backgroundColor = '#DBEAFE';
                        fontWeight = '600';
                        break;
                    case 'rejected':
                        color = '#EF4444'; // Red
                        backgroundColor = '#FEE2E2';
                        fontWeight = '600';
                        break;
                    case 'completed':
                    case 'complete':
                        color = '#6366F1'; // Indigo
                        backgroundColor = '#E0E7FF';
                        fontWeight = '600';
                        break;
                    default:
                        color = '#6B7280'; // Gray for unknown
                        backgroundColor = '#F3F4F6';
                }

                return (
                    <span
                        style={{
                            color: color,
                            backgroundColor: backgroundColor,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: fontWeight,
                            display: 'inline-block',
                            textTransform: 'capitalize',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {value}
                    </span>
                );
            }
        },
        {
            id: 'action',
            label: 'Action',
            align: 'center',
            format: (value) => {
                return (
                    <span
                        style={{
                            color: '#3B82F6', // Blue color
                            fontWeight: '500',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '14px'
                        }}
                    >
                        View details
                    </span>
                );
            }
        },
    ];

    const handleBack = () => {
        navigate(location.state?.from || '/home/snReport');
    };

    const handleFillReturnForm = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handleModalSubmit = (formData) => {

        // Prepare API payload
        const apiPayload = {
            merchantId: formData.merchantDbId,
            merchantName: formData.merchantName,
            itemServiceId: formData.itemServiceId,
            itemSerialId: formData.itemSerialId,
            serialNumber: formData.serialNo,
            itemCondition: formData.itemCondition,
            returnReason: formData.returnReason,
            status: 'pending'
        };

        // Call API to submit return request
        postRequestWithBodyAndToken(`${baseURl}inventory/return-item`, accessToken, apiPayload)
            .then(result => {
                // Close modal
                handleModalClose();
                // Refresh the return items list
                fetchReturnItems();
            })
            .catch(error => {
            });
    };

    const handleDetailsModalClose = () => {
        setIsDetailsModalOpen(false);
        setSelectedReturnData(null);
    };

    const handleApproveReturn = () => {

        if (!selectedReturnData?.id && !selectedReturnData?.returnId) {
            handleDetailsModalClose();
            return;
        }

        const returnId = selectedReturnData.id || selectedReturnData.returnId;
        const url = `${baseURl}inventory/return-item/${returnId}/status`;
        const payload = { status: 'approved' };

        // Use PUT method for status update
        fetch(url, {
            method: 'PUT',
            headers: buildAuthHeaders(accessToken, {
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(payload),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                handleDetailsModalClose();
                // Refresh the return items list to show updated status
                fetchReturnItems();
            })
            .catch(error => {
                // Still close modal even if API fails
                handleDetailsModalClose();
            });
    };

    const handleRejectReturn = () => {

        if (!selectedReturnData?.id && !selectedReturnData?.returnId) {
            handleDetailsModalClose();
            return;
        }

        const returnId = selectedReturnData.id || selectedReturnData.returnId;
        const url = `${baseURl}inventory/return-item/${returnId}/status`;
        const payload = { status: 'rejected' };

        // Use PUT method for status update
        fetch(url, {
            method: 'PUT',
            headers: buildAuthHeaders(accessToken, {
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(payload),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                handleDetailsModalClose();
                // Refresh the return items list to show updated status
                fetchReturnItems();
            })
            .catch(error => {
                // Still close modal even if API fails
                handleDetailsModalClose();
            });
    };

    const handleActionClick = (row) => {

        // Fetch detailed return data using the return ID
        const returnId = row.returnId || row.id;
        if (!returnId) {
            setSelectedReturnData(row);
            setIsDetailsModalOpen(true);
            return;
        }

        // Build query parameters
        const params = new URLSearchParams();
        if (row.status) params.append('status', row.status);
        if (row.serialNumber) params.append('serialNumber', row.serialNumber);

        const url = `${baseURl}inventory/return-item/${returnId}${params.toString() ? '?' + params.toString() : ''}`;

        getRequestWithOutBody(url, accessToken)
            .then(result => {
                const detailedData = result?.data || result || row;
                setSelectedReturnData(detailedData);
                setIsDetailsModalOpen(true);
            })
            .catch(error => {
                // Fallback to using row data if API fails
                setSelectedReturnData(row);
                setIsDetailsModalOpen(true);
            });
    };

    const activeTabLabel = useMemo(
        () => RETURN_TABS.find((tab) => tab.id === selectedStatus)?.label || 'All Returns',
        [selectedStatus]
    );

    const totalReturnCount = returnStats
        ? getReturnStatCount(returnStats, 'all')
        : returnData.length;

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button
                        onClick={handleBack}
                        style={{
                            minWidth: 40,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: 'var(--dashboard-card-bg)',
                            border: '1px solid var(--dashboard-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                    </Button>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={`Return Requests`}
                        Fontsize={30}
                    />
                </div>
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Fill Return Form'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    className="!mb-0 !mx-0"
                    onClick={handleFillReturnForm}
                />
            </HeaderWrapper>

            <StageCardsWrapper>
                {RETURN_STATUS_FILTERS.map((status) => {
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
                                subtitle={status.subtitle}
                            />
                        </StageCardItem>
                    );
                })}
            </StageCardsWrapper>

            <div
                className="flex gap-6 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {RETURN_TABS.map((tab) => {
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
                                            RETURN_TABS.find((tab) => tab.id === selectedStatus)?.label ||
                                            selectedStatus
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {selectedMerchant && (
                                    <Chip
                                        size="small"
                                        label={`Merchant: ${
                                            merchantOptions.find((m) => m.value === selectedMerchant)?.label ||
                                            selectedMerchant
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
                            <FilterDropdown
                                value={selectedMerchant}
                                onChange={setSelectedMerchant}
                                options={[
                                    { label: 'All Merchants', value: '' },
                                    ...merchantOptions,
                                ]}
                                placeholder="All Merchants"
                                minWidth={180}
                                placeholderValues={[""]}
                                searchable
                                searchPlaceholder="Search merchant..."
                            />

                            <FilterDropdown
                                value={selectedStatus === 'all' ? '' : selectedStatus}
                                onChange={(value) => handleStatusFilter(value || 'all')}
                                options={[
                                    { label: 'All Statuses', value: '' },
                                    ...statusFilterOptions,
                                ]}
                                placeholder="All Statuses"
                                minWidth={160}
                                placeholderValues={[""]}
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
                {loading ? (
                    <div className="text-center w-full mx-auto py-8">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : returnData?.length === 0 ? (
                    <NoDataFound
                        title="No Data Found"
                        description={`No ${activeTabLabel.toLowerCase()} found.`}
                    />
                ) : (
                    <MemoTable
                        data={returnData}
                        columns={columns}
                        onActionClick={handleActionClick}
                        disableRowClick={true}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={(newRows) => {
                            setRowsPerPage(newRows);
                            setPage(1);
                        }}
                    />
                )}
            </div>

            <ReturnItemModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
            />

            <ReturnRequestModal
                open={isDetailsModalOpen}
                onClose={handleDetailsModalClose}
                data={selectedReturnData}
                onApprove={handleApproveReturn}
                onReject={handleRejectReturn}
            />
        </div>
    );
};

export default Returns;
