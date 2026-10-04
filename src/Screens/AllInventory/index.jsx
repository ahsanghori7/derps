import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import ListSearchField from "../../Components/ListSearchField";
import Heading from "../../Components/Heading";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { styled } from "@mui/material";
import addIcon from "../../assets/addIcon.png";
import EditInTable from "../../assets/EditInTable.png";
import downloadPdf from "../../assets/downloadPdf.png";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { downloadFileWithToken, getRequestWithOutBody, patchRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import FilterDropdown from "../../Components/FilterDropdown";
import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,
    Pagination,
    Select,
    MenuItem,
    Collapse,
    IconButton,
    Chip,
    Stack,
    Tooltip,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import LabeledInput from "../../Components/LabeledInput";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import CustomDatePicker from "../../Components/CustomDatePicker";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { toast } from "react-toastify";
import AssignedByCell from "../../Components/AssignedByCell";
import {
    getSerialAssignedByName,
    getSerialAssignedDate,
    getSerialReceivedByName,
} from "../../Utils/inventorySerialHelpers";
import { formatUsDate } from "../../Utils/dateFormat";

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
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
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

const TableShell = styled('div')({
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'var(--dashboard-card-bg)',
});

const TableScroll = styled('div')({
    overflow: 'auto',
    maxHeight: 'calc(100vh - 300px)',
});

const FooterWrapper = styled(Box)({
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--dashboard-card-bg)',
    color: 'var(--table-cell-text)',
    borderTop: '1px solid var(--dashboard-box-border)',
    padding: '4px 6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '0 0 14px 14px',
});

const StatusPill = styled('span', {
    shouldForwardProp: (prop) => prop !== 'status',
})(({ status }) => {
    const normalized = String(status || '').toLowerCase();
    const assigned = normalized === 'assigned';
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 84,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: assigned ? '#1D4ED8' : '#B45309',
        backgroundColor: assigned ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 193, 7, 0.35)',
    };
});

const formatDate = (value) => formatUsDate(value);

const formatStatusLabel = (status) => {
    const normalized = String(status ?? "").trim().toLowerCase();
    if (normalized === "assigned") return "Assigned";
    if (normalized === "available") return "Available";
    if (!normalized) return "—";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCount = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString();
};

const getSerials = (row) => (Array.isArray(row?.serials) ? row.serials : []);

const getPurchaseOrderId = (serial) => (
    serial?.purchaseOrderId
    ?? serial?.poId
    ?? serial?.purchaseId
    ?? serial?.purchase_order_id
    ?? null
);

const getUnitsInStock = (row) => {
    const fromSerials = getSerials(row).length;
    const fromQty = Number(row?.totalQty);
    if (Number.isFinite(fromQty) && fromQty > 0) return fromQty;
    const available = Number(row?.available) || 0;
    const assigned = Number(row?.assigned) || 0;
    const sum = available + assigned;
    return sum > 0 ? sum : fromSerials;
};

const mapDeviceRow = (row) => {
    const unitCost = Number(row?.unitCost);
    const total = getUnitsInStock(row);
    const value = Number.isFinite(unitCost) ? unitCost * total : null;
    return {
        ...row,
        itemName: row?.itemName || row?.item_service?.name || row?.name || "—",
        total,
        available: Number(row?.available) || 0,
        assigned: Number(row?.assigned) || 0,
        unitCost: Number.isFinite(unitCost) ? unitCost : null,
        value,
        serials: getSerials(row),
    };
};

const INVENTORY_STATUS_TABS = [
    { id: '', label: 'All Inventory' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'available', label: 'Available' },
];

const AllInventory = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const navigate = useNavigate();

    usePageTitle("Inventory", location);
    const [loading, setLoading] = useState(false);
    const [inventoryList, setInventoryList] = useState([]);
    const [search, setSearch] = useState(searchParams.get('search') || "");
    const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || "");
    const [selectedItem, setSelectedItem] = useState(searchParams.get('item') || "");
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);

    const [qtyModalOpen, setQtyModalOpen] = useState(false);
    const [qtyModalRow, setQtyModalRow] = useState(null);
    const [qtyModalValue, setQtyModalValue] = useState("");
    const [qtyModalSaving, setQtyModalSaving] = useState(false);
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    const [selectedVendor, setSelectedVendor] = useState("");
    const [selectedDeviceModel, setSelectedDeviceModel] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [inventoryApiData, setInventoryApiData] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [vendorList, setVendorList] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const buildInventoryQueryParams = useCallback((overrides = {}) => {
        const params = new URLSearchParams();
        params.set("paginate", "true");
        params.set("page", String(overrides.page ?? page));
        params.set("limit", String(overrides.limit ?? rowsPerPage));
        params.set("orderBy", "createdAt");
        params.set("order", "desc");

        const q = search.trim();
        if (q) params.set("keyword", q);
        if (selectedVendor) params.set("vendorName", selectedVendor);
        if (selectedDeviceModel) params.set("itemName", selectedDeviceModel);
        if (selectedStatus) params.set("status", selectedStatus);
        if (dateFrom) params.set("startDate", dateFrom);
        if (dateTo) params.set("endDate", dateTo);

        return params;
    }, [search, selectedVendor, selectedDeviceModel, selectedStatus, dateFrom, dateTo, page, rowsPerPage]);

    const fetchData = () => {
        setLoading(true);
        const url = `${baseURl}inventory?${buildInventoryQueryParams().toString()}`;

        getRequestWithOutBody(url, accessToken)
            .then((result) => {
                const apiData = result?.data ?? result;
                setInventoryApiData(apiData);
                setInventoryList(apiData?.results || []);
                setTotalCount(Number(apiData?.totalRecords ?? apiData?.totalSerialCount) || 0);
                setLoading(false);
            })
            .catch(() => {
                setInventoryApiData(null);
                setInventoryList([]);
                setTotalCount(0);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (!accessToken) return;
        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then((result) => {
                const list = result?.data;
                setItemServicesList(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                setItemServicesList([]);
            });

        getRequestWithOutBody(`${baseURl}vendor`, accessToken)
            .then((result) => {
                setVendorList(Array.isArray(result?.data?.results) ? result.data.results : []);
            })
            .catch(() => {
                setVendorList([]);
            });
    }, [accessToken]);

    const searchFromUrl = searchParams.get('search') || '';
    useEffect(() => {
        setSearch(searchFromUrl);
        setSearchDraft(searchFromUrl);
    }, [searchFromUrl]);

    useEffect(() => {
        if (!accessToken) return;
        const handle = setTimeout(() => {
            fetchData();
        }, 400);
        return () => clearTimeout(handle);
    }, [accessToken, search, selectedVendor, selectedDeviceModel, selectedStatus, dateFrom, dateTo, page, rowsPerPage]);

    useEffect(() => {
        if (loading || totalCount === 0) return;
        const maxPage = Math.max(1, Math.ceil(totalCount / rowsPerPage));
        if (page > maxPage) setPage(maxPage);
    }, [loading, totalCount, page, rowsPerPage]);

    const vendorOptions = useMemo(() => {
        if (!Array.isArray(vendorList)) return [];
        const vendors = vendorList
            .map((v) => v?.companyName)
            .filter((name) => typeof name === "string" && name.trim().length > 0);
        return Array.from(new Set(vendors)).sort((a, b) => a.localeCompare(b));
    }, [vendorList]);

    const deviceModelOptions = useMemo(() => {
        if (!Array.isArray(itemServicesList)) return [];
        const models = itemServicesList
            .map((item) => item?.name)
            .filter((name) => typeof name === "string" && name.trim().length > 0);
        return Array.from(new Set(models)).sort((a, b) => a.localeCompare(b));
    }, [itemServicesList]);

    const statusOptions = [
        { label: 'Assigned', value: 'assigned' },
        { label: 'Available', value: 'available' },
    ];

    const updateLocalSerialNumber = useCallback((serialId, nextSerialNo) => {
        setInventoryList((prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((item) => ({
                ...item,
                serials: getSerials(item).map((serial) => (
                    serial?.serialId === serialId
                        ? { ...serial, serial: nextSerialNo }
                        : serial
                )),
            }));
        });
    }, []);

    const openQtyModal = useCallback((serialRow) => {
        setQtyModalRow(serialRow);
        setQtyModalValue(String(serialRow?.serial ?? ""));
        setQtyModalOpen(true);
    }, []);

    const openPurchaseFromSerial = useCallback(async (serial, event) => {
        event?.stopPropagation?.();
        const poNo = String(serial?.poNo || "").trim();
        if (!poNo) return;

        const directId = getPurchaseOrderId(serial);
        if (directId) {
            navigate(`/home/editPurchase/?id=${encodeURIComponent(String(directId))}`, {
                state: { itemData: { id: directId }, returnTo: location.pathname },
            });
            return;
        }

        if (!accessToken) {
            toast.error("Unable to open purchase order");
            return;
        }

        try {
            const params = new URLSearchParams({
                paginate: "true",
                page: "1",
                limit: "10",
                keyword: poNo,
            });
            const result = await getRequestWithOutBody(
                `${baseURl}purchase-order?${params.toString()}`,
                accessToken,
            );
            const apiData = result?.data ?? result;
            const rows = Array.isArray(apiData)
                ? apiData
                : (apiData?.results || apiData?.data || []);
            const match = (Array.isArray(rows) ? rows : []).find(
                (row) => String(row?.poNo || "").trim().toLowerCase() === poNo.toLowerCase(),
            ) || (Array.isArray(rows) ? rows[0] : null);

            if (!match?.id) {
                toast.error("Purchase order not found");
                return;
            }

            navigate(`/home/editPurchase/?id=${encodeURIComponent(String(match.id))}`, {
                state: { itemData: { id: match.id }, returnTo: location.pathname },
            });
        } catch (e) {
            toast.error(e?.message || "Failed to open purchase order");
        }
    }, [accessToken, navigate, location.pathname]);

    const closeQtyModal = useCallback(() => {
        if (qtyModalSaving) return;
        setQtyModalOpen(false);
        setQtyModalRow(null);
        setQtyModalValue("");
    }, [qtyModalSaving]);

    const handleQtyUpdate = useCallback(async () => {
        if (!qtyModalRow?.serialId || !accessToken) return;

        const serialNumber = qtyModalValue.trim();
        if (!serialNumber) {
            toast.error("Serial number is required");
            return;
        }

        const rowId = qtyModalRow.serialId;
        const previousSerialNo = qtyModalRow?.serial;
        setQtyModalSaving(true);
        updateLocalSerialNumber(rowId, serialNumber);
        try {
            await patchRequestWithBodyAndToken(`${baseURl}inventory/serial/${rowId}`, accessToken, {
                serialNumber: serialNumber,
            });
            toast.success("Serial number updated");
            setQtyModalOpen(false);
            setQtyModalRow(null);
            setQtyModalValue("");
        } catch (e) {
            updateLocalSerialNumber(rowId, previousSerialNo);
            toast.error(e?.message || "Failed to update serial number");
        } finally {
            setQtyModalSaving(false);
            fetchData();
        }
    }, [accessToken, qtyModalRow, qtyModalValue, updateLocalSerialNumber]);

    const stats = useMemo(() => {
        const list = Array.isArray(inventoryList) ? inventoryList : [];
        const totalItems = inventoryApiData?.totalSerialCount
            ?? list.reduce((sum, row) => sum + getSerials(row).length, 0);

        const totalInventoryPrice = inventoryApiData?.sumSellingPrice
            ?? list.reduce((sum, r) => {
                const price = Number(r?.salePrice ?? 0);
                return sum + (Number.isFinite(price) ? price : 0);
            }, 0);

        const totalInventoryCostBase = inventoryApiData?.sumCostPrice
            ?? list.reduce((sum, r) => {
                const cost = Number(r?.unitCost ?? 0);
                return sum + (Number.isFinite(cost) ? cost : 0);
            }, 0);

        const assignedDevices = inventoryApiData?.assignedSerialCount
            ?? list.reduce((sum, row) => (
                sum + getSerials(row).filter((s) => String(s?.status || '').toLowerCase() === 'assigned').length
            ), 0);

        const unassignedDevices = inventoryApiData?.unassignedSerialCount
            ?? list.reduce((sum, row) => (
                sum + getSerials(row).filter((s) => String(s?.status || '').toLowerCase() !== 'assigned').length
            ), 0);

        const profitMargin = inventoryApiData?.profitMarginPercent
            ?? (totalInventoryCostBase > 0
                ? ((totalInventoryPrice - totalInventoryCostBase) / totalInventoryCostBase) * 100
                : 0);

        return {
            totalItems,
            totalInventoryPrice,
            totalInventoryCostBase,
            assignedDevices,
            unassignedDevices,
            profitMargin,
            devices: inventoryApiData?.totalRecords ?? list.length,
        };
    }, [inventoryList, inventoryApiData]);

    const handleStatusFilter = useCallback((statusKey) => {
        setSelectedStatus(statusKey || '');
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setSearch(String(searchDraft || '').trim());
        setPage(1);
    }, [searchDraft]);

    const handleClearFilters = useCallback(() => {
        setSearch('');
        setSearchDraft('');
        setSelectedItem('');
        setSelectedVendor('');
        setSelectedDeviceModel('');
        setSelectedStatus('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    }, []);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (search) chips.push({ key: 'search', label: `Search: ${search}` });
        if (selectedVendor) chips.push({ key: 'vendor', label: `Vendor: ${selectedVendor}` });
        if (selectedDeviceModel) chips.push({ key: 'device', label: `Device: ${selectedDeviceModel}` });
        if (selectedStatus) {
            chips.push({
                key: 'status',
                label: `Status: ${formatStatusLabel(selectedStatus)}`,
            });
        }
        if (dateFrom) chips.push({ key: 'dateFrom', label: `From: ${formatDate(dateFrom)}` });
        if (dateTo) chips.push({ key: 'dateTo', label: `To: ${formatDate(dateTo)}` });
        return chips;
    }, [search, selectedVendor, selectedDeviceModel, selectedStatus, dateFrom, dateTo]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') {
            setSearch('');
            setSearchDraft('');
        }
        if (key === 'vendor') setSelectedVendor('');
        if (key === 'device') setSelectedDeviceModel('');
        if (key === 'status') setSelectedStatus('');
        if (key === 'dateFrom') setDateFrom('');
        if (key === 'dateTo') setDateTo('');
        setPage(1);
    }, []);

    const summaryCards = useMemo(() => [
        {
            key: 'all',
            title: 'Inventory Item',
            amount: Number(stats.totalItems).toLocaleString(),
            subtitle: 'Total Inventory Items',
            filterKey: '',
            clickable: true,
        },
        {
            key: 'price',
            title: 'Inventory Price',
            amount: formatMoney(stats.totalInventoryPrice),
            subtitle: 'Total inventory price',
            clickable: false,
        },
        {
            key: 'cost',
            title: 'Inventory Cost Base',
            amount: formatMoney(stats.totalInventoryCostBase),
            subtitle: 'Total Inventory cost base',
            clickable: false,
        },
        {
            key: 'assigned',
            title: 'Assigned Device',
            amount: Number(stats.assignedDevices).toLocaleString(),
            subtitle: 'Total Assigned Device',
            filterKey: 'assigned',
            clickable: true,
        },
        {
            key: 'available',
            title: 'Unassigned Device',
            amount: Number(stats.unassignedDevices).toLocaleString(),
            subtitle: 'Total UnAssigned Device',
            filterKey: 'available',
            clickable: true,
        },
        {
            key: 'profit',
            title: 'Profit Margin',
            amount: `${Number(stats.profitMargin).toFixed(2)}%`,
            subtitle: 'Total Profit margin',
            clickable: false,
        },
    ], [stats]);

    const activeTabLabel = useMemo(
        () => INVENTORY_STATUS_TABS.find((tab) => tab.id === selectedStatus)?.label || 'All Inventory',
        [selectedStatus]
    );

    const tableRows = useMemo(() => {
        const list = Array.isArray(inventoryList) ? inventoryList : [];
        return list.map(mapDeviceRow);
    }, [inventoryList]);

    const toggleExpanded = useCallback((rowId) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowId)) next.delete(rowId);
            else next.add(rowId);
            return next;
        });
    }, []);

    const buildExportQueryParams = useCallback(() => {
        const params = new URLSearchParams();
        params.set("orderBy", "createdAt");
        params.set("order", "desc");

        const q = search.trim();
        if (q) params.set("keyword", q);
        if (selectedStatus) params.set("status", selectedStatus);
        if (dateFrom) params.set("startDate", dateFrom);
        if (dateTo) params.set("endDate", dateTo);
        if (selectedVendor) {
            params.set("vendorName", selectedVendor);
            const vendor = (Array.isArray(vendorList) ? vendorList : []).find(
                (item) => item?.companyName === selectedVendor,
            );
            const vendorId = vendor?.id ?? vendor?._id;
            if (vendorId != null && vendorId !== "") params.set("vendorId", String(vendorId));
        }

        return params;
    }, [search, selectedStatus, dateFrom, dateTo, selectedVendor, vendorList]);

    useEffect(() => {
        setPage(1);
    }, [search, selectedItem, selectedVendor, selectedDeviceModel, selectedStatus, dateFrom, dateTo]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (selectedItem) params.set('item', selectedItem);
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());
        setSearchParams(params);
    }, [search, selectedItem, page, rowsPerPage, setSearchParams]);

    const handleButtonClick = () => {
        navigate('/home/addInventory');
    };

    const handleExport = async () => {
        if (exporting || !accessToken) return;

        setExporting(true);
        try {
            const query = buildExportQueryParams().toString();
            const url = `${baseURl}inventory/export${query ? `?${query}` : ""}`;
            await downloadFileWithToken(url, accessToken);
            toast.success("Export downloaded successfully");
        } catch (e) {
            let message = e?.message || "Failed to export inventory";
            try {
                const parsed = JSON.parse(message);
                message = parsed?.message || parsed?.error || message;
            } catch {
                // response body was not JSON
            }
            toast.error(message);
        } finally {
            setExporting(false);
        }
    };

    const pageCount = totalCount > 0
        ? Math.max(1, Math.ceil(totalCount / rowsPerPage))
        : 1;

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <PageHeader
                title="Inventory"
                actions={(
                    <AppButton
                        icon={addIcon}
                        title="Add Inventory"
                        onClick={handleButtonClick}
                    />
                )}
            />

            <StageCardsWrapper>
                {summaryCards.map((card) => {
                    const isSelected = card.clickable
                        ? (card.filterKey || '') === (selectedStatus || '')
                        : false;

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
                {INVENTORY_STATUS_TABS.map((tab) => {
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
                                color: isActive ? '#0C79F7' : 'var(--dashboard-text-secondary)',
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
                                {selectedStatus && (
                                    <Chip
                                        size="small"
                                        label={INVENTORY_STATUS_TABS.find((tab) => tab.id === selectedStatus)?.label || selectedStatus}
                                        variant="outlined"
                                    />
                                )}
                                {search && <Chip size="small" label={`Search: ${search}`} variant="outlined" />}
                                {selectedVendor && <Chip size="small" label={`Vendor: ${selectedVendor}`} variant="outlined" />}
                                {selectedDeviceModel && <Chip size="small" label={`Device: ${selectedDeviceModel}`} variant="outlined" />}
                                {dateFrom && <Chip size="small" label={`From: ${formatDate(dateFrom)}`} variant="outlined" />}
                                {dateTo && <Chip size="small" label={`To: ${formatDate(dateTo)}`} variant="outlined" />}
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
                                placeholder="Search device, serial number, PO, or merchant..."
                            />

                            <FilterDropdown
                                value={selectedVendor}
                                onChange={setSelectedVendor}
                                options={[
                                    { label: 'All Vendors', value: '' },
                                    ...vendorOptions.map((vendor) => ({ label: vendor, value: vendor })),
                                ]}
                                placeholder="All Vendors"
                                minWidth={160}
                                placeholderValues={[""]}
                                searchable
                                searchPlaceholder="Search vendor..."
                            />

                            <FilterDropdown
                                value={selectedDeviceModel}
                                onChange={setSelectedDeviceModel}
                                options={[
                                    { label: 'All Devices', value: '' },
                                    ...deviceModelOptions.map((model) => ({ label: model, value: model })),
                                ]}
                                placeholder="All Devices"
                                minWidth={180}
                                placeholderValues={[""]}
                                searchable
                                searchPlaceholder="Search device..."
                            />

                            <FilterDropdown
                                value={selectedStatus}
                                onChange={(value) => handleStatusFilter(value || '')}
                                options={[
                                    { label: 'All Statuses', value: '' },
                                    ...statusOptions.map((status) => ({ label: status.label, value: status.value })),
                                ]}
                                placeholder="All Statuses"
                                minWidth={150}
                                placeholderValues={[""]}
                            />

                            <CustomDatePicker
                                value={dateFrom}
                                onChange={setDateFrom}
                                inventory
                                placeholder="From Date"
                            />

                            <CustomDatePicker
                                value={dateTo}
                                onChange={setDateTo}
                                inventory
                                placeholder="To Date"
                            />

                            <div className="flex gap-2 items-center ml-auto">
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    disabled={exporting}
                                    style={{
                                        height: 36,
                                        padding: '0 14px',
                                        borderRadius: 8,
                                        border: '1px solid var(--dashboard-box-border)',
                                        background: 'var(--dashboard-card-bg2)',
                                        color: 'var(--dashboard-text-primary)',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: exporting ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap',
                                        opacity: exporting ? 0.6 : 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <img src={downloadPdf} alt="export" style={{ width: 16, height: 16 }} />
                                    {exporting ? 'Exporting...' : 'Export'}
                                </button>
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
                ) : tableRows.length === 0 ? (
                    <NoDataFound
                        title="No Data Found"
                        description={`No ${activeTabLabel.toLowerCase()} found.`}
                    />
                ) : (
                    <TableShell>
                            <TableScroll>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                        <tr style={{ backgroundColor: 'var(--sidebar-selected-bg)' }}>
                                            {['DEVICE', 'TOTAL', 'AVAILABLE', 'ASSIGNED', 'UNIT COST', 'VALUE'].map((label) => (
                                                <th
                                                    key={label}
                                                    style={{
                                                        padding: '10px 12px',
                                                        textAlign: label === 'DEVICE' ? 'left' : 'center',
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        color: 'var(--sidebar-text-selected)',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row) => {
                                            const rowId = row.id ?? row.itemServiceId;
                                            const isExpanded = expandedIds.has(rowId);
                                            const serials = row.serials || [];
                                            return (
                                                <Fragment key={rowId}>
                                                    <tr
                                                        onClick={() => toggleExpanded(rowId)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid rgba(226, 232, 240, 1)',
                                                            backgroundColor: 'var(--dashboard-card-bg)',
                                                        }}
                                                    >
                                                        <td style={{ padding: '12px', textAlign: 'left' }}>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleExpanded(rowId);
                                                                    }}
                                                                    sx={{ mt: '-2px', color: 'var(--dashboard-text-secondary)' }}
                                                                >
                                                                    {isExpanded
                                                                        ? <KeyboardArrowDownIcon fontSize="small" />
                                                                        : <KeyboardArrowRightIcon fontSize="small" />}
                                                                </IconButton>
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                                                        {row.itemName}
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)', marginTop: 2 }}>
                                                                        {row.total} in stock
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                                            {formatCount(row.total)}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                                            {formatCount(row.available)}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontSize: 13 }}>
                                                            {row.assigned > 0 ? (
                                                                <span style={{ color: '#0C79F7', fontWeight: 600 }}>{formatCount(row.assigned)}</span>
                                                            ) : (
                                                                formatCount(row.assigned)
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                                            {row.unitCost == null ? '—' : formatMoney(row.unitCost)}
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                                            {row.value == null ? '—' : formatMoney(row.value)}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: 0, borderBottom: isExpanded ? '1px solid var(--dashboard-border)' : 'none' }}>
                                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                <div style={{ padding: '12px 16px 16px 48px', backgroundColor: 'var(--dashboard-card-bg2)' }}>
                                                                    <div style={{
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                        letterSpacing: '0.04em',
                                                                        color: 'var(--dashboard-text-secondary)',
                                                                        marginBottom: 10,
                                                                    }}>
                                                                        UNITS · {serials.length} SHOWN
                                                                    </div>
                                                                    {serials.length === 0 ? (
                                                                        <div style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)' }}>No serials for this device.</div>
                                                                    ) : (
                                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                            <thead>
                                                                                <tr>
                                                                                    {['SERIAL NUMBER', 'FROM PO', 'RECEIVED BY', 'ASSIGNED TO', 'STATUS', 'ASSIGNED BY', ''].map((label) => (
                                                                                        <th
                                                                                            key={label || 'edit'}
                                                                                            style={{
                                                                                                padding: '8px 10px',
                                                                                                textAlign: label === 'SERIAL NUMBER' || label === 'FROM PO' || label === 'RECEIVED BY' || label === 'ASSIGNED TO' || label === 'ASSIGNED BY' ? 'left' : 'center',
                                                                                                fontSize: 11,
                                                                                                fontWeight: 700,
                                                                                                color: 'var(--dashboard-text-secondary)',
                                                                                                borderBottom: '1px solid var(--dashboard-border)',
                                                                                                whiteSpace: 'nowrap',
                                                                                            }}
                                                                                        >
                                                                                            {label}
                                                                                        </th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {serials.map((serial) => (
                                                                                    <tr key={serial.serialId}>
                                                                                        <td style={{ padding: '10px', fontSize: 12, color: 'var(--sidebar-text-primary)', textAlign: 'left' }}>
                                                                                            {serial.serial || '—'}
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', fontSize: 12, textAlign: 'left' }}>
                                                                                            {serial.poNo ? (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={(e) => openPurchaseFromSerial(serial, e)}
                                                                                                    style={{
                                                                                                        background: 'transparent',
                                                                                                        border: 'none',
                                                                                                        padding: 0,
                                                                                                        color: '#0C79F7',
                                                                                                        fontWeight: 600,
                                                                                                        fontSize: 12,
                                                                                                        cursor: 'pointer',
                                                                                                        textDecoration: 'underline',
                                                                                                        textUnderlineOffset: 2,
                                                                                                    }}
                                                                                                >
                                                                                                    {serial.poNo}
                                                                                                </button>
                                                                                            ) : '—'}
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', fontSize: 12, color: 'var(--dashboard-text-secondary)', textAlign: 'left' }}>
                                                                                            {getSerialReceivedByName(serial)}
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', fontSize: 12, color: 'var(--sidebar-text-primary)', textAlign: 'left' }}>
                                                                                            {serial.customerAssigned || '—'}
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                                            <StatusPill status={serial.status}>
                                                                                                {formatStatusLabel(serial.status)}
                                                                                            </StatusPill>
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', textAlign: 'left' }}>
                                                                                            <AssignedByCell
                                                                                                name={getSerialAssignedByName(serial)}
                                                                                                date={getSerialAssignedDate(serial)}
                                                                                            />
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    openQtyModal(serial);
                                                                                                }}
                                                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                                                                                            >
                                                                                                <img src={EditInTable} alt="edit" style={{ width: 16, height: 16 }} />
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    )}
                                                                </div>
                                                            </Collapse>
                                                        </td>
                                                    </tr>
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </TableScroll>
                            <FooterWrapper>
                                <Select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(parseInt(e.target.value, 10));
                                        setPage(1);
                                    }}
                                    size="small"
                                    style={{ borderRadius: 10, fontSize: 12 }}
                                >
                                    <MenuItem value={5}>5</MenuItem>
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                </Select>
                                <Pagination
                                    count={pageCount}
                                    page={page}
                                    onChange={(e, value) => setPage(value)}
                                    variant="outlined"
                                    size="small"
                                />
                            </FooterWrapper>
                        </TableShell>
                )}
            </div>

            <Dialog open={qtyModalOpen} onClose={closeQtyModal} fullWidth maxWidth="xs">
                <DialogTitle>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Update Serial Number'}
                        Fontsize={18}
                    />
                </DialogTitle>
                <DialogContent style={{ paddingTop: 10 }}>
                    <LabeledInput
                        label="Serial No"
                        inputPlaceholder="Enter Serial No"
                        inputValue={qtyModalValue}
                        onInputChange={(e) => setQtyModalValue(e.target.value)}
                        StatusWidth
                        disabled={qtyModalSaving}
                    />
                </DialogContent>
                <DialogActions style={{ padding: 16 }}>
                    <Button onClick={closeQtyModal} disabled={qtyModalSaving}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleQtyUpdate} disabled={qtyModalSaving}>
                        {qtyModalSaving ? 'Updating...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default AllInventory;
