import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import ListSearchField from "../../Components/ListSearchField";
import addIcon from "../../assets/addIcon.png";
import AgentTable from "../../Components/AgentTable";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteRequest, getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { styled } from '@mui/material/styles';
import {
    Box,
    Chip,
    Collapse,
    IconButton,
    Stack,
    Tooltip,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import { toast } from "react-toastify";
import FilterDropdown from "../../Components/FilterDropdown";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import DeleteConfirmationModal from "../../Components/DeleteModal";
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

const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '$0.00';
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ITEM_FILTER_TABS = [
    { id: 'all', label: 'All Items' },
    { id: 'item', label: 'Items' },
    { id: 'service', label: 'Services' },
];

const extractItemStats = (payload) => {
    if (!payload || typeof payload !== 'object') return null;

    const totalTypeItemCount = Number(payload.totalTypeItemCount) || 0;
    const totalTypeServiceCount = Number(payload.totalTypeServiceCount) || 0;

    return {
        totalItems: totalTypeItemCount + totalTypeServiceCount,
        totalTypeItemCount,
        totalTypeServiceCount,
        sumCostPrice: Number(payload.sumCostPrice) || 0,
        sumSellingPrice: Number(payload.sumSellingPrice) || 0,
    };
};

const normalizeItemCategories = (result) => {
    const list = result?.data?.data || result?.data?.results || result?.data || [];
    const flat = Array.isArray(list) ? list : [];
    return flat
        .map((category) => ({
            id: category.id,
            name: category.name || category.title || '',
        }))
        .filter((category) => category.id != null && category.name)
        .reverse();
};

const ItemsAndServices = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Items & Services", location);

    const [loading, setLoading] = useState(false);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [itemStats, setItemStats] = useState(null);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '');
    const [selectedFilter, setSelectedFilter] = useState(() => {
        const filter = searchParams.get('filter') || 'all';
        return ['all', 'item', 'service'].includes(filter) ? filter : 'all';
    });
    const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
    const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoryId') || '');
    const [itemCategories, setItemCategories] = useState([]);
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);
    const [totalCount, setTotalCount] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const resolveFilterParams = useCallback((filterKey) => {
        switch (filterKey) {
            case 'item':
                return { type: 'item', status: '' };
            case 'service':
                return { type: 'service', status: '' };
            default:
                return { type: '', status: '' };
        }
    }, []);

    const fetchData = useCallback(() => {
        setLoading(true);

        const params = new URLSearchParams();
        params.set('paginate', 'true');
        params.set('page', String(page));
        params.set('limit', String(rowsPerPage));

        const q = search.trim();
        if (q) params.set('keyword', q);

        const typeParam = selectedType || (selectedFilter === 'item' || selectedFilter === 'service' ? selectedFilter : '');
        if (typeParam) params.set('type', typeParam);
        if (selectedStatus) params.set('status', selectedStatus);
        if (selectedCategory) params.set('categoryId', selectedCategory);

        const api = `${baseURl}item-services?${params.toString()}`;
        getRequestWithOutBody(api, accessToken)
            .then(result => {
                const payload = result;
                const list = Array.isArray(payload?.data) ? payload.data : [];

                const sortedData = [...list].sort((a, b) => {
                    const idA = Number(a.id);
                    const idB = Number(b.id);

                    if (idA === 0) return 1;
                    if (idB === 0) return -1;

                    return idB - idA;
                });

                setItemServicesList(sortedData);
                setItemStats(extractItemStats(payload));
                setTotalCount(Number(payload?.totalItems ?? list.length) || 0);
                setLoading(false);
            })
            .catch(() => {
                setItemServicesList([]);
                setItemStats(null);
                setTotalCount(0);
                setLoading(false);
            });
    }, [accessToken, page, rowsPerPage, search, selectedFilter, selectedType, selectedStatus, selectedCategory]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!accessToken) return;

        getRequestWithOutBody(`${baseURl}item-category/`, accessToken)
            .then((result) => {
                setItemCategories(normalizeItemCategories(result));
            })
            .catch(() => {
                setItemCategories([]);
                toast.error('Failed to fetch item categories');
            });
    }, [accessToken]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (selectedFilter && selectedFilter !== 'all') params.set('filter', selectedFilter);
        if (selectedType) params.set('type', selectedType);
        if (selectedStatus) params.set('status', selectedStatus);
        if (selectedCategory) params.set('categoryId', selectedCategory);
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());

        setSearchParams(params);
    }, [search, selectedFilter, selectedType, selectedStatus, selectedCategory, page, rowsPerPage, setSearchParams]);

    useEffect(() => {
        setPage(1);
    }, [search, selectedFilter, selectedType, selectedStatus, selectedCategory]);

    const handleCardFilter = useCallback((filterKey) => {
        const next = filterKey || 'all';
        setSelectedFilter(next);
        const resolved = resolveFilterParams(next);
        setSelectedType(resolved.type);
        setSelectedStatus(resolved.status);
        setPage(1);
    }, [resolveFilterParams]);

    const handleClearFilters = useCallback(() => {
        setSearch('');
        setSearchDraft('');
        setSelectedFilter('all');
        setSelectedType('');
        setSelectedStatus('');
        setSelectedCategory('');
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setSearch(String(searchDraft || '').trim());
        setPage(1);
    }, [searchDraft]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (search) chips.push({ key: 'search', label: `Search: ${search}` });
        if (selectedType) {
            chips.push({
                key: 'type',
                label: `Type: ${selectedType === 'service' ? 'Service' : 'Item'}`,
            });
        }
        if (selectedStatus) {
            chips.push({
                key: 'status',
                label: `Status: ${selectedStatus.charAt(0).toUpperCase()}${selectedStatus.slice(1)}`,
            });
        }
        if (selectedCategory) {
            const categoryLabel =
                itemCategories.find((c) => String(c.id) === String(selectedCategory))?.name ||
                selectedCategory;
            chips.push({ key: 'category', label: `Category: ${categoryLabel}` });
        }
        return chips;
    }, [search, selectedType, selectedStatus, selectedCategory, itemCategories]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') {
            setSearch('');
            setSearchDraft('');
        }
        if (key === 'type') {
            setSelectedType('');
            if (selectedFilter === 'item' || selectedFilter === 'service') {
                setSelectedFilter('all');
            }
        }
        if (key === 'status') setSelectedStatus('');
        if (key === 'category') setSelectedCategory('');
        setPage(1);
    }, [selectedFilter]);

    const categoryOptions = useMemo(() => [
        { label: 'All Categories', value: '' },
        ...itemCategories.map((category) => ({
            label: category.name,
            value: String(category.id),
        })),
    ], [itemCategories]);

    const summaryCards = useMemo(() => {
        const stats = itemStats || {
            totalItems: 0,
            totalTypeItemCount: 0,
            totalTypeServiceCount: 0,
            sumCostPrice: 0,
            sumSellingPrice: 0,
        };

        return [
            {
                key: 'all',
                title: 'Total Items',
                amount: Number(stats.totalItems).toLocaleString(),
                subtitle: 'Items + services total',
                filterKey: 'all',
                clickable: true,
            },
            {
                key: 'item',
                title: 'Items',
                amount: Number(stats.totalTypeItemCount).toLocaleString(),
                subtitle: 'Total item type count',
                filterKey: 'item',
                clickable: true,
            },
            {
                key: 'service',
                title: 'Services',
                amount: Number(stats.totalTypeServiceCount).toLocaleString(),
                subtitle: 'Total service type count',
                filterKey: 'service',
                clickable: true,
            },
            {
                key: 'selling',
                title: 'Selling Price',
                amount: formatMoney(stats.sumSellingPrice),
                subtitle: 'Total selling price',
                clickable: false,
            },
            {
                key: 'cost',
                title: 'Cost Price',
                amount: formatMoney(stats.sumCostPrice),
                subtitle: 'Total cost price',
                clickable: false,
            },
        ];
    }, [itemStats]);

    const activeTabLabel = useMemo(
        () => ITEM_FILTER_TABS.find((tab) => tab.id === selectedFilter)?.label || 'All Items',
        [selectedFilter]
    );

    const columns = [
        {
            id: 'checkbox',
            label: '',
            align: 'center',
            renderCell: (row) => {
                const checked = selectedInvoiceIds.includes(row.id);
                return (
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                            const nextChecked = e.target.checked;
                            setSelectedInvoiceIds((prev) => {
                                const next = nextChecked
                                    ? Array.from(new Set([...prev, row.id]))
                                    : prev.filter((x) => x !== row.id);
                                return next;
                            });
                        }}
                    />
                );
            },
        },
        { id: 'name', label: 'ITEM NAME', align: 'center' },
        {
            id: 'type',
            label: 'TYPE',
            align: 'center',
            renderCell: (row) => {
                const type = (row?.type || '').toLowerCase();
                if (type === 'service') return 'Service';
                if (type === 'item') return 'Item';
                return row?.type || '-';
            },
        },
        {
            id: 'category',
            label: 'CATEGORY',
            align: 'center',
            renderCell: (row) => row?.category?.title || '-',
        },
        { id: 'barcode', label: 'BARCODE', align: 'center' },
        { id: 'sku', label: 'SKU', align: 'center' },
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        { id: 'sellingPrice', label: 'SELLING PRICE', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
        { id: 'edit', label: 'EDIT', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/home/addItem');
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (newRowsPerPage) => {
        setRowsPerPage(newRowsPerPage);
        setPage(1);
    };

    const handleDeleteLead = async () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        try {
            for (const id of selectedInvoiceIds) {
                await deleteRequest(`${baseURl}item-services/${id}`, accessToken);
                toast.success(`Item ${id} deleted successfully.`);
            }
            setSelectedInvoiceIds([]);
            setShowDeleteModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <PageHeader
                title="Item List"
                actions={(
                    <AppButton
                        icon={addIcon}
                        title="Add Item"
                        onClick={handleButtonClick}
                    />
                )}
            />

            <StageCardsWrapper>
                {summaryCards.map((card) => {
                    const isSelected = card.clickable
                        ? selectedFilter === card.filterKey
                        : false;

                    return (
                        <StageCardItem
                            key={card.key}
                            clickable={card.clickable}
                            role={card.clickable ? 'button' : undefined}
                            tabIndex={card.clickable ? 0 : undefined}
                            onClick={() => {
                                if (card.clickable) handleCardFilter(card.filterKey);
                            }}
                            onKeyDown={(event) => {
                                if (!card.clickable) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleCardFilter(card.filterKey);
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
                {ITEM_FILTER_TABS.map((tab) => {
                    const isActive = selectedFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleCardFilter(tab.id)}
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
                                {selectedFilter && selectedFilter !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={ITEM_FILTER_TABS.find((tab) => tab.id === selectedFilter)?.label || selectedFilter}
                                        variant="outlined"
                                    />
                                )}
                                {search && <Chip size="small" label={`Search: ${search}`} variant="outlined" />}
                                {selectedType && (
                                    <Chip
                                        size="small"
                                        label={`Type: ${selectedType === 'service' ? 'Service' : 'Item'}`}
                                        variant="outlined"
                                    />
                                )}
                                {selectedStatus && (
                                    <Chip
                                        size="small"
                                        label={`Status: ${selectedStatus.charAt(0).toUpperCase()}${selectedStatus.slice(1)}`}
                                        variant="outlined"
                                    />
                                )}
                                {selectedCategory && (
                                    <Chip
                                        size="small"
                                        label={`Category: ${
                                            itemCategories.find((c) => String(c.id) === String(selectedCategory))?.name ||
                                            selectedCategory
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
                            <ListSearchField
                                layout="inline"
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                                onEnter={handleApplyFilters}
                                placeholder="Search by name, barcode, or SKU..."
                            />

                            <FilterDropdown
                                value={selectedType}
                                onChange={(value) => {
                                    setSelectedType(value || '');
                                    if (value === 'item' || value === 'service') {
                                        setSelectedFilter(value);
                                        setSelectedStatus('');
                                    } else if (!value && (selectedFilter === 'item' || selectedFilter === 'service')) {
                                        setSelectedFilter('all');
                                    }
                                    setPage(1);
                                }}
                                options={[
                                    { label: 'All Types', value: '' },
                                    { label: 'Item', value: 'item' },
                                    { label: 'Service', value: 'service' },
                                ]}
                                placeholder="All Types"
                                minWidth={140}
                                placeholderValues={[""]}
                            />

                            <FilterDropdown
                                value={selectedStatus}
                                onChange={(value) => {
                                    setSelectedStatus(value || '');
                                    setPage(1);
                                }}
                                options={[
                                    { label: 'All Statuses', value: '' },
                                    { label: 'Active', value: 'active' },
                                    { label: 'Inactive', value: 'inactive' },
                                ]}
                                placeholder="All Statuses"
                                minWidth={150}
                                placeholderValues={[""]}
                            />

                            <FilterDropdown
                                value={selectedCategory}
                                onChange={(value) => {
                                    setSelectedCategory(value || '');
                                    setPage(1);
                                }}
                                options={categoryOptions}
                                placeholder="All Categories"
                                minWidth={170}
                                placeholderValues={[""]}
                                searchable
                                searchPlaceholder="Search category..."
                            />

                            <div className="flex gap-2 items-center ml-auto">
                                {selectedInvoiceIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteLead}
                                        style={{
                                            height: 36,
                                            padding: '0 14px',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: '#EF4444',
                                            color: '#fff',
                                            fontWeight: 600,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
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
                ) : Array.isArray(itemServicesList) && itemServicesList.length === 0 ? (
                    <NoDataFound
                        title="No Data Found"
                        description={search.trim()
                            ? 'No items found matching your search'
                            : `No ${activeTabLabel.toLowerCase()} found.`}
                    />
                ) : (
                    <AgentTable
                        columns={columns}
                        data={itemServicesList}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        onRowClick={(row) => navigate('/home/editItem', { state: { itemData: row } })}
                        containerMaxHeight="calc(100vh - 300px)"
                    />
                )}
            </div>

            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Items"
                subtitle="Are you sure you want to delete the selected"
                entityName={`${selectedInvoiceIds.length} item${selectedInvoiceIds.length > 1 ? 's' : ''}`}
                warningMessage="This action cannot be undone. The selected items will be permanently removed from the system."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={loading}
            />
        </div>
    );
};

export default ItemsAndServices;
