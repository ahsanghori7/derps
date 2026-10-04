import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { useLocation, useNavigate } from 'react-router-dom';
import { setSupportTicketDetailSidebarRoute } from '../../Utils/supportTicketDetailSidebarRoute';
import { openApplicationFromList } from '../../Utils/applicationNavigation';
import edit from "../../assets/edit.png";
import { useSelector, useDispatch } from "react-redux";
import MemoPopup from '../../Screens/MemoPopup';
import Pagination from '@mui/material/Pagination';
import { Box } from '@mui/material';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem'
import DropdownMenu from '../dropdownMenu';
import { putRequestWithBodyAndToken } from '../../Api/fetch';
import { toast } from "react-toastify";
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Menu from '@mui/material/Menu';
import { getStatusChipTone, tableBodyFontSize, tableHeadCellStyle } from '../tableChrome';

const capitalizeFirst = (str) => {
    if (str === null || str === undefined || str === '') return '-';
    if (typeof str !== 'string') {
        // Convert objects and arrays to string representation to prevent React errors
        if (typeof str === 'object') {
            if (Array.isArray(str)) {
                return str.length > 0 ? `Array (${str.length} items)` : 'Array (empty)';
            } else {
                return '[Object]';
            }
        }
        return String(str);
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// Styled button component
const StatusButton = styled(Button)(({ status }) => {
    const { color, backgroundColor } = getStatusChipTone(status);

    return {
        color,
        backgroundColor,
        fontWeight: 500,
        width: '92px',
        border: 0,
        fontSize: 10,
        padding: '2px 0px',
        '&:hover': {
            backgroundColor,
            cursor: 'default',
            border: 'none'
        },
    };
});

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit", 
        year: "numeric"
    });
};

const EditButton = styled(Button)(({ theme, status }) => ({
    border: 0,

    // padding: 10,
    '&:hover': {
        border: 0,
        backgroundColor: 'none',
        cursor: 'pointer'
    },
}));

// Status cell content (parent CustomTableCell provides the <td>)
const StatusTableCell = ({ status }) => {
    if (status === null || status === undefined || status === '') {
        return '-';
    }

    const normalized = String(status).trim().toLowerCase();
    const label = normalized === 'un-paid' || normalized === 'unpaid'
        ? 'UNPAID'
        : normalized === 'draft'
            ? 'SAVE'
            : normalized === 'not-received' || normalized === 'not_received'
                ? 'Not received'
                : normalized === 'received'
                    ? 'Received'
                    : normalized === 'partial'
                        ? 'Partial'
                        : status;

    return (
        <StatusButton variant="outlined" status={status} className='mx-auto'>
            {label}
        </StatusButton>
    );
};
// Status cell component
const EditTableCell = ({ status, onClick, adminFormTable, inventoryTable, itemAndServicesTable, roles, categoryadd, editTicketType, adminTrainingTable, adminPolicyTable, leadsTable, purchaseTable, vendorTable, UserLeadsList, adminApplication, userApplication }) => (
    <TableCell align="center" style={{ border: 0, backgroundColor: 'none', display: 'flex', justifyContent: roles || categoryadd || editTicketType ? 'right' : 'center', alignItems: 'center', padding: adminApplication || adminTrainingTable || vendorTable || adminPolicyTable ? 10 : 0 }} className=''>
        <EditButton variant="outlined" status={status} onClick={onClick}>
            <img src={edit} className={`${adminFormTable ? 'w-3 h-3' : adminTrainingTable || adminPolicyTable || adminApplication || userApplication || inventoryTable || leadsTable || purchaseTable || vendorTable || UserLeadsList ? 'w-4 h-4' : itemAndServicesTable ? 'w-5 h-4' : roles || categoryadd || editTicketType ? 'w-4 h-4' : 'w-8 h-4 '}`} />
        </EditButton>
    </TableCell>
);

// Styled components for table cells and rows
const CustomTableCell = styled(TableCell, {
    shouldForwardProp: (prop) => !['isFirstColumn', 'payoutdetailsList', 'invoiceTable', 'memoUserList', 'invoiceTableUser', 'adminCustomerTable', 'formTable', 'leadsTable', 'purchaseTable', 'vendorTable', 'policyTable', 'maintainanceTicket', 'deployment', 'followup', 'terminalProgramming', 'adminMemo', 'trainingTable', 'customerTable', 'editTicketType', 'adminFormTable', 'inventoryTable', 'adminApplication', 'userApplication', 'itemAndServicesTable', 'adminTrainingTable', 'adminPolicyTable', 'roles', 'categoryadd', 'accountingTable', 'UserLeadsList'].includes(prop)
})(({ theme, isFirstColumn, align, invoiceTable, invoiceTableUser, payoutdetailsList, memoUserList, formTable, policyTable, trainingTable, customerTable, inventoryTable, adminMemo, itemAndServicesTable, leadsTable, purchaseTable, vendorTable, UserLeadsList, adminTrainingTable, adminPolicyTable, adminFormTable, roles, adminApplication, userApplication, maintainanceTicket, deployment, followup, terminalProgramming, adminCustomerTable, categoryadd, editTicketType, accountingTable }) => ({
    [`&.${tableCellClasses.head}`]: {
        ...tableHeadCellStyle,
        whiteSpace: 'nowrap',
        // padding: '10px',
        border: 'none',
        lineHeight: '1.2',

        // flex: 1,

        // padding: '16px', // Add padding to header cells

        // borderRight: '1px solid rgba(224, 224, 224, 1)', // Add right border to header cells
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: leadsTable ? 14 : tableBodyFontSize,
        fontWeight: 500,
        ...(leadsTable && {
            lineHeight: 1.5,
        }),
        // height: 67,
        // flex: 1,
        // Respect per-column `align`; fall back to legacy table-type centering.
        ...(accountingTable ? {} : {
            textAlign: align === 'center'
                ? 'center'
                : align === 'right'
                    ? 'right'
                    : align === 'left'
                        ? 'left'
                        : (invoiceTable || invoiceTableUser || formTable || policyTable || trainingTable || customerTable || inventoryTable || adminPolicyTable || itemAndServicesTable || adminMemo || maintainanceTicket || terminalProgramming || adminTrainingTable || deployment || followup || adminApplication || adminCustomerTable || leadsTable || purchaseTable || vendorTable || UserLeadsList || userApplication || payoutdetailsList || adminFormTable || memoUserList) ? 'center' : 'left'
        }),
        borderRight: 'none', // Remove right border
        ...(isFirstColumn && {
            whiteSpace: 'nowrap',
        }),
        borderBottom: 'none', // Remove default bottom border
        '&:first-of-type': {
            // borderTopLeftRadius: '10px',
            // borderBottomLeftRadius: '10px',
        },
        '&:last-of-type': {
            // borderTopRightRadius: '8px',
            // borderBottomRightRadius: '8px',
        },
        '&:[3]': {
            textAlign: 'center',
        },
        ...(roles || categoryadd || editTicketType && {
            '&:first-of-type': { textAlign: 'left' },
            '&:last-of-type': { textAlign: 'right' },
        }),
        color: 'var(--table-cell-text)',
        padding: accountingTable
            ? '4px 22px'
            : (invoiceTable || invoiceTableUser ? '0px 6px'
                : itemAndServicesTable ? 0
                    : leadsTable ? '14px 20px'
                        : adminPolicyTable || vendorTable ? '0 40px'
                        : policyTable || trainingTable || formTable || customerTable || adminFormTable || adminCustomerTable || purchaseTable || UserLeadsList ? '10px 40px'
                            : adminMemo || maintainanceTicket || terminalProgramming || deployment || followup ? '12px 70px'
                                : inventoryTable ? 0
                                    : adminTrainingTable || adminApplication || userApplication ? '0px 0px'
                                        : roles || categoryadd || editTicketType ? '12px 32px'
                                            : '12px 12px'), // Add padding to cells for better spacing

    },
}));

const CustomTableRow = styled(TableRow, {
    shouldForwardProp: (prop) => !['customerTable', 'adminCustomerTable', 'leadsTable', 'purchaseTable', 'vendorTable', 'UserLeadsList', 'opportunitiesTable', 'quotationsTable'].includes(prop),
})(({ theme, customerTable, leadsTable, purchaseTable, vendorTable, UserLeadsList, adminCustomerTable, opportunitiesTable, quotationsTable }) => ({
    ...(leadsTable && {
        '& td': {
            borderBottom: '1px solid var(--sidebar-divider, #E5E7EB)',
        },
    }),
    '& td': {
        backgroundColor: 'var(--table-cell-bg)',
        color: 'var(--table-cell-text)',
    },
    '&:nth-of-type(odd) td': {
        backgroundColor: 'var(--table-cell-alt-bg)',
    },
    '&:hover td': {
        backgroundColor: 'var(--table-cell-hover)',
    },
    '&:not(:last-child)': {
        marginBottom: '12px', // Add margin between rows
    },
    backgroundColor: 'var(--table-cell-bg)',
    boxShadow: '0 0 0 1px var(--dashboard-bg)',
    // borderRadius: '8px',
    cursor: 'pointer',

}));

const CustomTableHeader = styled(TableHead, {
    shouldForwardProp: (prop) => !['roles', 'categoryadd', 'editTicketType', 'accountingTable', 'leadsTable'].includes(prop),
})(({ theme, roles, categoryadd, editTicketType, accountingTable, leadsTable }) => ({
    position: 'sticky',
    top: 0,
    zIndex: 1,
    '& .MuiTableRow-root': {
        backgroundColor: 'var(--sidebar-selected-bg)',
        margin: 0, // Ensure no margin for header row
        // ...(roles ? {
        //     display: 'flex',
        //     justifyContent: 'space-between',
        // } : {}),
    },
    '& .MuiTableCell-root.checkbox-cell': {
        width: 44,
        minWidth: 44,
        maxWidth: 44,
        padding: '6px 8px !important',
        textAlign: 'center',
    },
    '& .MuiTableCell-root': {
        borderBottom: 'none',
        fontSize: leadsTable ? 14 : tableBodyFontSize,
        padding: leadsTable ? '14px 20px' : roles || categoryadd || editTicketType ? '10px 32px' : accountingTable ? '10px 26px' : '10px 32px',
        ...(roles || categoryadd || editTicketType ? {
            textAlign: 'left'
        } : {}),
        '&:last-of-type': roles || categoryadd || editTicketType ? { textAlign: 'right', padding: '10px 52px' } : {}, // Right-align only the edit column
        // ...(roles ? {
        //     flex: 1,
        // } : {}),

    },
}));

const StyledTableContainer = styled(TableContainer, {
    shouldForwardProp: (prop) => !['roles', 'categoryadd', 'editTicketType'].includes(prop),
})(({ theme, roles, categoryadd, editTicketType }) => ({
    overflow: 'auto',
    borderRadius: '14px', // Border radius for the entire table
    '& thead': {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: theme.palette.background.paper,
    },
    // maxHeight: '100vh', // Adjust this value as needed
    // overflow: 'auto',
    // borderRadius: '14px', // Border radius for the entire table
    // backgroundColor: 'var(--sidebar-divider)',
    // scrollbarWidth: 'none', // Firefox
    // msOverflowStyle: 'none',
    // '& thead': {
    //     position: 'sticky',
    //     top: 0,
    //     zIndex: 1,
    //     backgroundColor: theme.palette.background.paper,
    // },
    // ...(roles || categoryadd || editTicketType ? { maxWidth: 800, } : {})
}));

const FooterWrapper = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'leadsTable',
})(({ leadsTable }) => ({
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--dashboard-tab-box)',
    borderTop: '1px solid var(--sidebar-divider)',
    padding: leadsTable ? '12px 20px' : '3px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '0 0 14px 14px',
}));

const TruncatedText = styled('div')({
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '200px', // Adjust this value as needed
});

const CHECKBOX_CELL_SX = {
    width: 44,
    minWidth: 44,
    maxWidth: 44,
    padding: '4px 6px !important',
    boxSizing: 'border-box',
};

const TableCheckbox = ({ checked, onChange, disabled, compact = false }) => (
    <label
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: compact ? 24 : 40,
            minHeight: compact ? 24 : 40,
            cursor: disabled ? 'default' : 'pointer',
        }}
    >
        <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            style={{
                width: compact ? 16 : 18,
                height: compact ? 16 : 18,
                margin: 0,
                cursor: disabled ? 'default' : 'pointer',
                accentColor: 'var(--dashboard-text-primary, #2B4BF2)',
            }}
        />
    </label>
);

// Main reusable table component
const MemoTable = ({ data, columns, invoiceTable, editTicketType, maintainanceTicket, deployment, followup, terminalProgramming, invoiceTableUser, memoUserList, payoutdetailsList, adminCustomerTable, leadsTable, purchaseTable, vendorTable, UserLeadsList, userApplication, categoryadd, adminApplication, formTable, policyTable, trainingTable, customerTable, inventoryTable, itemAndServicesTable, adminTrainingTable, roles, adminPolicyTable, adminFormTable, adminMemo, opportunitiesTable, quotationsTable, showCheckbox, selectedRowIds, onSelectionChange, onStatusChange, accountingTable, onActionClick, onRowClick, actionOptions, onActionOptionClick, registerTable, editableRowId, renderEditableCell, renderEditActions, page: externalPage, rowsPerPage: externalRowsPerPage, totalCount, onPageChange, onRowsPerPageChange, actionLabel, disableFooter, onDeleteClick, deleteLabel, taxReportsTable, disableRowClick = false, isRowSelectable }) => {
    const [selectedRow, setSelectedRow] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    // Use external pagination props if provided, otherwise use internal state
    const [internalPage, setInternalPage] = useState(1);
    const [internalRowsPerPage, setInternalRowsPerPage] = useState(25);

    const page = externalPage !== undefined ? externalPage : internalPage;
    const rowsPerPage = externalRowsPerPage !== undefined ? externalRowsPerPage : internalRowsPerPage;
    const [internalSelectedIds, setInternalSelectedIds] = useState([]);
    const isSelectionControlled = selectedRowIds !== undefined;
    const selectedIds = isSelectionControlled ? selectedRowIds : internalSelectedIds;

    const updateSelection = (updated) => {
        if (!isSelectionControlled) {
            setInternalSelectedIds(updated);
        }
        if (onSelectionChange) {
            onSelectionChange(updated);
        }
    };

    useEffect(() => {
        if (!showCheckbox) return;

        const dataIdSet = new Set(
            data
                .filter((r) => String(r.id) !== '__total__')
                .filter((r) => (typeof isRowSelectable === 'function' ? isRowSelectable(r) : true))
                .map((r) => r.id)
        );
        const pruned = selectedIds.filter((id) => dataIdSet.has(id));

        if (pruned.length !== selectedIds.length) {
            updateSelection(pruned);
        }
    }, [data, showCheckbox, isRowSelectable]);

    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [showOptions, setShowOptions] = useState(false);
    const [visibleOptionsRowId, setVisibleOptionsRowId] = useState(null); // State to track which row's options are visible
    const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
    const [actionMenuRowId, setActionMenuRowId] = useState(null);

    const moneyColumnIds = ['totalAmount', 'subTotal', 'tax', 'discount', 'deliveryFee', 'paidAmount', 'balanceDue', 
    'currentBalance',
    'openingBalance', 'sellingPrice',
'salesTax', 'balanceDue', 'paidAmount', 'total', 'pretax', 'openBalance', 'amount', 'amountBeforeTax', 'taxAmount'];

    const openActionMenu = (event, rowId) => {
        event.stopPropagation();
        setActionMenuAnchorEl(event.currentTarget);
        setActionMenuRowId(rowId);
    };

    const closeActionMenu = () => {
        setActionMenuAnchorEl(null);
        setActionMenuRowId(null);
    };

    const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined || value === '') return 0;

    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
};

    // Conditionally add a new column for checkboxes
    const columnsWithCheckbox = showCheckbox ? [{ id: 'checkbox', label: '', align: 'right' }, ...columns] : columns;

    const selectableRowIds = data
        .filter((r) => String(r.id) !== '__total__')
        .filter((r) => (typeof isRowSelectable === 'function' ? isRowSelectable(r) : true))
        .map((r) => r.id);
    const allSelected = showCheckbox && selectableRowIds.length > 0 && selectedIds.length === selectableRowIds.length;

    const handleSelectAllChange = (event) => {
        event.stopPropagation();
        const checked = event.target.checked;
        const updated = checked ? selectableRowIds : [];
        updateSelection(updated);
    };
    const handleRowClick = (event, row) => {
        if (String(row?.id) === '__total__') return;
        if (disableRowClick) return; // Disable row click if prop is true
        
        // Check for CTRL/CMD+click for new tab functionality
        if (event && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.stopPropagation();

            if (onRowClick) {
                onRowClick(event, row);
                return;
            }
            
            // Handle different table types for new tab navigation
            if (leadsTable) {
                const leadUrl = `/home/leadInfo/lead/${row.id}`;
                window.open(leadUrl, '_blank');
            } else if (opportunitiesTable) {
                const opportunityUrl = `/home/opportunities/${row.id}`;
                window.open(opportunityUrl, '_blank');
            } else if (quotationsTable) {
                // For quotations, the logic is handled in the quotations component
                if (onRowClick) {
                    onRowClick(event, row);
                }
                return;
            } else if (roles) {
                const invoiceUrl = '/home/singleInvoice';
                window.open(invoiceUrl, '_blank');
            } else if (invoiceTable) {
                const invoiceUrl = '/home/editInvoice';
                window.open(invoiceUrl, '_blank');
            } else if (itemAndServicesTable) {
                const itemUrl = '/home/editItem';
                window.open(itemUrl, '_blank');
            } else if (adminFormTable) {
                const formUrl = '/home/maintainForm';
                window.open(formUrl, '_blank');
            } else if (adminTrainingTable) {
                const trainingUrl = '/home/maintainTraining';
                window.open(trainingUrl, '_blank');
            } else if (adminPolicyTable) {
                const policyUrl = '/home/maintainPolicy';
                window.open(policyUrl, '_blank');
            } else if (adminCustomerTable) {
                const customerUrl = `/home/editCustomer/?id=${encodeURIComponent(String(row?.id ?? ''))}`;
                window.open(customerUrl, '_blank');
            } else if (purchaseTable) {
                const purchaseUrl = `/home/editPurchase/?id=${encodeURIComponent(String(row?.id ?? ''))}`;
                window.open(purchaseUrl, '_blank');
            } else if (vendorTable) {
                const vendorUrl = '/home/editVendor';
                window.open(vendorUrl, '_blank');
            } else if (UserLeadsList) {
                const userLeadUrl = '/userdashboard/editLead';
                window.open(userLeadUrl, '_blank');
            } else if (adminMemo) {
                const memoUrl = '/home/maintainMemo';
                window.open(memoUrl, '_blank');
            } else if (adminApplication) {
                openApplicationFromList(navigate, row, {
                    isAgent: false,
                    returnTo: location.pathname,
                    event,
                    accessToken,
                });
            } else if (userApplication) {
                openApplicationFromList(navigate, row, {
                    isAgent: true,
                    returnTo: location.pathname,
                    event,
                    accessToken,
                });
            } else if (categoryadd || editTicketType) {
                return;
            } else if (inventoryTable) {
                const inventoryUrl = '/home/editInventory';
                window.open(inventoryUrl, '_blank');
            }
            return;
        }
        
        if (onRowClick) {
            onRowClick(event, row);
            return;
        }
        if (invoiceTableUser) {
            // Do nothing if it's a customer table
            return;
        }
        if (customerTable) {
            // Do nothing if it's a customer table
            return;
        }
        if (roles) {
            // Do nothing if roles is true
            navigate('/home/singleInvoice', { state: { invoiceData: row } });
        }
        if (invoiceTable) {
            // Navigate to SingleInvoice page with the row data
            navigate('/home/editInvoice', { state: { invoiceData: row } });
        } else if (itemAndServicesTable) {
            navigate('/home/editItem', { state: { itemData: row } });
        } else if (adminFormTable) {
            navigate('/home/maintainForm', { state: { itemData: row } });
        } else if (adminTrainingTable) {
            navigate('/home/maintainTraining', { state: { itemData: row } });
        } else if (adminPolicyTable) {
            navigate('/home/maintainPolicy', { state: { itemData: row } });
        } else if (adminFormTable) {
            navigate('/home/maintainForm', { state: { itemData: row } });
        } else if (adminCustomerTable) {
            navigate(`/home/editCustomer/?id=${encodeURIComponent(String(row?.id ?? ''))}`, { state: { itemData: row } });
        }
        else if (purchaseTable) {
            navigate(`/home/editPurchase/?id=${encodeURIComponent(String(row?.id ?? ''))}`, { state: { itemData: row, returnTo: location.pathname } });
        }
        else if (leadsTable) {
            navigate(`/home/leadInfo/lead/${row.id}`, { state: { itemData: row, fromRoute: 'leadsList' } });
        }
        else if (vendorTable) {
            navigate('/home/editVendor', { state: { itemData: row } });
        }
        else if (UserLeadsList) {
            navigate('/userdashboard/editLead', { state: { itemData: row } });
        }
        else if (adminMemo) {
            navigate('/home/maintainMemo', { state: { itemData: row } });
        }
        else if (maintainanceTicket) {
            setSupportTicketDetailSidebarRoute('maintananceTicket');
            navigate('/home/supportTicketDetail', { state: { itemData: row, status: 'maintainance', fromRoute: 'maintananceTicket' } });
        }
        else if (deployment) {
            setSupportTicketDetailSidebarRoute('maintananceTicket');
            navigate('/home/supportTicketDetail', { state: { itemData: row, status: 'deployment', fromRoute: 'maintananceTicket' } });
        }
        else if (followup) {
            setSupportTicketDetailSidebarRoute('maintananceTicket');
            navigate('/home/supportTicketDetail', { state: { itemData: row, status: 'followup', fromRoute: 'maintananceTicket' } });
        }
        else if (terminalProgramming) {
            setSupportTicketDetailSidebarRoute('maintananceTicket');
            navigate('/home/supportTicketDetail', { state: { itemData: row, status: 'terminal', fromRoute: 'maintananceTicket' } });
        }
        else if (adminApplication) {
            openApplicationFromList(navigate, row, {
                isAgent: false,
                returnTo: location.pathname,
                accessToken,
            });
        }
        else if (userApplication) {
            openApplicationFromList(navigate, row, {
                isAgent: true,
                returnTo: location.pathname,
                accessToken,
            });
        } else if (roles) {
            // Do nothing if roles is true
            navigate('/home/editRoles', { state: { invoiceData: row } });
        } else if (categoryadd || editTicketType) {
            return;
        } else if (inventoryTable) {
            // Do nothing if roles is true
            navigate('/home/editInventory', { state: { invoiceData: row } });
        }
        else if (taxReportsTable) {
            // Do nothing for tax reports table - read only
            return;
        }
        else {
            setSelectedRow(row);
            setShowDialog(true);
        }
    };

    const handleCheckboxChange = (event, id) => {
        event.stopPropagation(); // Prevent row click event
        if (typeof isRowSelectable === 'function') {
            const row = data.find((r) => r.id === id);
            if (row && !isRowSelectable(row)) return;
        }
        const updatedSelectedIds = selectedIds.includes(id)
            ? selectedIds.filter(selectedId => selectedId !== id)
            : [...selectedIds, id];

        updateSelection(updatedSelectedIds);
    };

    const handleCloseDialog = () => {
        setShowDialog(false);
    };

    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    const stripHtmlAndTruncate = (htmlString, maxLength = 50) => {
        if (!htmlString) return '';
        // Create a temporary div to extract text content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        return truncateText(textContent.trim(), maxLength);
    };

    const handleChangePage = (event, newPage) => {
        // console.log('handleChangePage', newPage);
        if (onPageChange) {
            onPageChange(newPage);
        } else {
            setInternalPage(newPage);
        }
    };

    const handleChangeRowsPerPage = (event) => {
        const newRowsPerPage = parseInt(event.target.value, 10);
        if (onRowsPerPageChange) {
            onRowsPerPageChange(newRowsPerPage);
        } else {
            setInternalRowsPerPage(newRowsPerPage);
            setInternalPage(1);
        }
    };

    // Use totalCount for external pagination, otherwise calculate from data length
    const pageCount = totalCount !== undefined
        ? Math.max(1, Math.ceil((Number(totalCount) || 0) / rowsPerPage))
        : Math.max(1, Math.ceil(data.length / rowsPerPage));

    const pageRows = useMemo(() => {
        return totalCount !== undefined ? data : data.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    }, [data, page, rowsPerPage, totalCount]);

    const displayRows = useMemo(() => {
    if ((!invoiceTable && !accountingTable && !itemAndServicesTable && !purchaseTable) || !pageRows.length) return pageRows;

    const totalRow = columns.reduce((acc, column, index) => {
        const colId = column.id;

        if (moneyColumnIds.includes(colId)) {
            acc[colId] = pageRows.reduce((sum, row) => sum + parseAmount(row?.[colId]), 0);
        } else if (index === 0 || colId === 'invoiceNo' || colId === 'accountName') {
            acc[colId] = 'Total';
        } else {
            acc[colId] = '';
        }

        return acc;
    }, { id: '__total__' });

    return [...pageRows, totalRow];
}, [invoiceTable, accountingTable, pageRows, columns, itemAndServicesTable, purchaseTable]);

    return (
        <>
            <StyledTableContainer component={Paper} roles={roles} categoryadd={categoryadd} editTicketType={editTicketType}>
                <Table sx={{ minWidth: 700 }} stickyHeader aria-label="customized table">
                    {/* <TableHead> */}
                    <CustomTableHeader roles={roles} categoryadd={categoryadd} editTicketType={editTicketType} accountingTable={accountingTable} leadsTable={leadsTable}>
                        <TableRow>
                            {columnsWithCheckbox.map((column) => (
                                <CustomTableCell
                                    key={column.id}
                                    align={column.align}
                                    invoiceTable={invoiceTable}
                                    invoiceTableUser={invoiceTableUser}
                                    accountingTable={accountingTable}
                                    className={column.id === 'checkbox' ? 'checkbox-cell' : undefined}
                                    sx={column.id === 'checkbox' ? CHECKBOX_CELL_SX : undefined}
                                >
                                    {column.id === 'checkbox' ? (
                                        <TableCheckbox
                                            checked={allSelected}
                                            disabled={selectableRowIds.length === 0}
                                            onChange={handleSelectAllChange}
                                            compact
                                        />
                                    ) : (
                                        column.label
                                    )}
                                </CustomTableCell>
                            ))}
                        </TableRow>
                    </CustomTableHeader>
                    <TableBody>
                        {/* Use external pagination if totalCount is provided, otherwise use client-side pagination */}
                        {displayRows.map((row) => (
                            <React.Fragment key={row.id}>
                                <CustomTableRow
                                    data-row-id={row.id}
                                    onClick={String(row.id) === '__total__' ? undefined : (event) => handleRowClick(event, row)}
                                    customerTable={customerTable}
                                    adminCustomerTable={adminCustomerTable}
                                    leadsTable={leadsTable}
                                    purchaseTable={purchaseTable}
                                    vendorTable={vendorTable}
                                    UserLeadsList={UserLeadsList}
                                    opportunitiesTable={opportunitiesTable}
                                    quotationsTable={quotationsTable}
                                    style={String(row.id) === '__total__' ? { backgroundColor: 'rgba(43,75,242,0.12)', cursor: 'default' } : undefined}
                                >
                                    {columnsWithCheckbox.map((column, index) => (
                                        <CustomTableCell
                                            key={column.id}
                                            align={column.align}
                                            isFirstColumn={index === 0}
                                            className={column.id === 'checkbox' ? 'checkbox-cell' : undefined}
                                            sx={column.id === 'checkbox' ? CHECKBOX_CELL_SX : undefined}
                                            invoiceTable={invoiceTable}
                                            invoiceTableUser={invoiceTableUser}
                                            payoutdetailsList={payoutdetailsList}
                                            formTable={formTable}
                                            adminMemo={adminMemo}
                                            memoUserList={memoUserList}
                                            maintainanceTicket={maintainanceTicket}
                                            deployment={deployment}
                                            followup={followup}
                                            terminalProgramming={terminalProgramming}
                                            adminFormTable={adminFormTable}
                                            userApplication={userApplication}
                                            adminApplication={adminApplication}
                                            adminPolicyTable={adminPolicyTable}
                                            policyTable={policyTable}
                                            trainingTable={trainingTable}
                                            customerTable={customerTable}
                                            adminCustomerTable={adminCustomerTable}
                                            leadsTable={leadsTable}
                                            purchaseTable={purchaseTable}
                                            vendorTable={vendorTable}
                                            UserLeadsList={UserLeadsList}
                                            inventoryTable={inventoryTable}
                                            roles={roles}
                                            categoryadd={categoryadd}
                                            editTicketType={editTicketType}
                                            itemAndServicesTable={itemAndServicesTable}
                                            adminTrainingTable={adminTrainingTable}
                                            accountingTable={accountingTable}
                                            onClick={column.id === 'checkbox' ? (e) => e.stopPropagation() : undefined}
                                            style={String(row.id) === '__total__' ? { fontWeight: 800 } : undefined}
                                        >
                                            {column.id === 'checkbox' ? (
                                                String(row.id) === '__total__' ? null : (
                                                    <TableCheckbox
                                                        checked={selectedIds.includes(row.id)}
                                                        disabled={typeof isRowSelectable === 'function' && !isRowSelectable(row)}
                                                        onChange={(event) => handleCheckboxChange(event, row.id)}
                                                        compact
                                                    />
                                                )
                                            ) : registerTable && editableRowId === row.id ? (
                                                renderEditableCell ? renderEditableCell(column.id, row) : null
                                            ) : column.id === 'status' && invoiceTable ? (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                                    <StatusTableCell status={row[column.id]} />
                                                </div>
                                            ) : accountingTable && column.id === 'action' ? (
                                                (row.action || actionLabel || onDeleteClick || actionOptions) ? (
                                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
                                                        {(() => {
                                                            const opts = typeof actionOptions === 'function' ? (actionOptions(row) || []) : [];
                                                            const hasMulti = Array.isArray(opts) && opts.length > 1;
                                                            const hasSingle = Array.isArray(opts) && opts.length === 1;

                                                            if (hasMulti) {
                                                                return (
                                                                    <>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={(e) => openActionMenu(e, row.id)}
                                                                            sx={{ color: '#0C79F7' }}
                                                                        >
                                                                            <MoreVertIcon fontSize="small" />
                                                                        </IconButton>
                                                                        <Menu
                                                                            anchorEl={actionMenuAnchorEl}
                                                                            open={Boolean(actionMenuAnchorEl) && actionMenuRowId === row.id}
                                                                            onClose={closeActionMenu}
                                                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                                        >
                                                                            {opts.map((opt, idx) => (
                                                                                <MenuItem
                                                                                    key={idx}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        closeActionMenu();
                                                                                        if (onActionOptionClick) onActionOptionClick(row, opt);
                                                                                    }}
                                                                                >
                                                                                    {opt?.label || opt?.text || String(opt)}
                                                                                </MenuItem>
                                                                            ))}
                                                                        </Menu>
                                                                    </>
                                                                );
                                                            }

                                                            if (hasSingle) {
                                                                const opt = opts[0];
                                                                return (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); if (onActionOptionClick) onActionOptionClick(row, opt); }}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: '#0C79F7',
                                                                            cursor: 'pointer',
                                                                            fontWeight: 600,
                                                                            fontSize: 12,
                                                                        }}
                                                                    >
                                                                        {opt?.label || opt?.text || row.action || actionLabel}
                                                                    </button>
                                                                );
                                                            }

                                                            if (column.format) {
                                                                return (
                                                                    <div onClick={(e) => { e.stopPropagation(); if (onActionClick) onActionClick(row); }}>
                                                                        {column.format(row.action || actionLabel)}
                                                                    </div>
                                                                );
                                                            } else if (row.action || actionLabel) {
                                                                return (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); if (onActionClick) onActionClick(row); }}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: '#0C79F7',
                                                                            cursor: 'pointer',
                                                                            fontWeight: 600,
                                                                            fontSize: 12,
                                                                        }}
                                                                    >
                                                                        {row.action || actionLabel}
                                                                    </button>
                                                                );
                                                            }

                                                            return null;
                                                        })()}
                                                        {onDeleteClick && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onDeleteClick(row); }}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#EF4444',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 600,
                                                                    fontSize: 12,
                                                                }}
                                                            >
                                                                {deleteLabel || 'Delete'}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    '-'
                                                )
                                            ) : column.id === 'itemDescription' ? (
                                                (row[column.id] === null || row[column.id] === undefined || row[column.id] === '') ? (
                                                    '-'
                                                ) : (
                                                    <TruncatedText title={row[column.id]}>
                                                        {capitalizeFirst(truncateText(String(row[column.id]), 20))}
                                                    </TruncatedText>
                                                )
                                            ) : column.id === 'title' && adminMemo ? (
                                                <div
                                                    title={row[column.id] ? stripHtmlAndTruncate(row[column.id], 100) : ''}
                                                    style={{
                                                        maxWidth: '400px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {stripHtmlAndTruncate(row[column.id] || '', 100)}
                                                </div>
                                            ) : column.id === 'status' || column.id === 'stage' || column.id === 'merchantStatus' ? (
                                                column.format ? (
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                                        {column.format(row[column.id])}
                                                    </div>
                                                ) : (
                                                    <StatusTableCell key={column.id} status={row[column.id]} />
                                                )
                                            ) : moneyColumnIds.includes(column.id) ? (
    (row[column.id] === null || row[column.id] === undefined || row[column.id] === '' || Number.isNaN(parseAmount(row[column.id]))) ? (
        '-'
    ) : (
        <div style={{ textAlign: 'center' }}>
            ${parseAmount(row[column.id]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
    )
                                            ) : column.id === 'edit' ? (
                                                <EditTableCell key={column.id} status={row[column.id]} adminFormTable={adminFormTable} leadsTable={leadsTable} purchaseTable={purchaseTable} vendorTable={vendorTable} UserLeadsList={UserLeadsList} roles={roles} categoryadd={categoryadd} editTicketType={editTicketType} itemAndServicesTable={itemAndServicesTable} userApplication={userApplication} adminApplication={adminApplication} adminTrainingTable={adminTrainingTable} inventoryTable={inventoryTable} adminPolicyTable={adminPolicyTable} onClick={(event) => handleRowClick(event, row)}
                                                />
                                            ) : column.id === 'date' || column.id === 'createdAt' || column.id === 'issueDate' || column.id === 'dueDate' || column.id === 'orderDate' || column.id === 'poDate' ? (
    String(row.id) === '__total__' ? '' : formatDate(row[column.id])
                                            ) : column.id === 'merchantIds' ? (
                                                Array.isArray(row[column.id]) && row[column.id].length > 0 ?
                                                    (() => {
                                                        const validIds = row[column.id]
                                                            .map(item => item.merchantId)
                                                            .filter(id => id && id.trim() !== '');
                                                        return validIds.length === 1
                                                            ? validIds[0]
                                                            : validIds.join(', ');
                                                    })() :
                                                    '-' // Handle null case
                                            ) : column.id === 'agent.id' ?
                                                (row.agent?.id ?? '-')
                                                : column.id === 'vendor?.companyName' ?
                                                    capitalizeFirst(row.vendor?.companyName)
                                                    : column.id === 'category.title' ?
                                                        capitalizeFirst(row.category?.title)
                                                        : column.id === 'agent.username' ?
                                                            capitalizeFirst(row.agent?.username)
                                                            : column.id === 'merchant.dbaName' ?
                                                                capitalizeFirst(row.merchant?.dbaName)
                                                                : column.id === 'agent?.name' ?
                                                                    capitalizeFirst(row.agent?.name)
                                                                    : column.id === 'merchant?.dbaName' ?
                                                                        capitalizeFirst(row.merchant?.dbaName)
                                                                        : column.id === 'solution' || column.id === 'services' ? (
                                                                            row[column.id] === "atm" ?
                                                                                'ATM Solutions'
                                                                                : row[column.id] === "credit-card" ?
                                                                                    "Credit Card Processing"
                                                                                    : row[column.id] === "cash-advance" ?
                                                                                        'Cash Advance'
                                                                                        : row[column.id] === "pos" ?
                                                                                            'Point-Of-Sale Solutions'
                                                                                            : row[column.id] === "ebt" ?
                                                                                                'EBT Processing'
                                                                                                : row[column.id] === "airvac" ?
                                                                                                    'AIRVAC Systems'
                                                                                                    : row[column.id] === "website" ?
                                                                                                        'Website Services'
                                                                                                        : row[column.id] === "ach-processing" ?
                                                                                                            'ACH Processing' : '-'
                                                                        ) : column.id === 'action' ? (
                                                                            column.format ? (
                                                                                <div
                                                                                    onClick={(e) => { e.stopPropagation(); if (onActionClick) onActionClick(row); }}
                                                                                    style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
                                                                                >
                                                                                    {column.format(row[column.id])}
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); if (onActionClick) onActionClick(row); }}
                                                                                    style={{
                                                                                        background: 'transparent',
                                                                                        border: 'none',
                                                                                        color: '#0C79F7',
                                                                                        cursor: 'pointer',
                                                                                        fontWeight: 600,
                                                                                        fontSize: 12,
                                                                                    }}
                                                                                >
                                                                                    {row[column.id] || actionLabel}
                                                                                </button>
                                                                            )
                                                                        ) : column.format ? (
                                                                            column.format(row[column.id], row)
                                                                        ) : (
                                                                            capitalizeFirst(row[column.id])
                                                                        )}
                                        </CustomTableCell>
                                    ))}
                                </CustomTableRow>
                                {registerTable && editableRowId === row.id && renderEditActions && (
                                    <TableRow>
                                        <CustomTableCell
                                            align={'right'}
                                            colSpan={columnsWithCheckbox.length}
                                            style={{
                                                background: 'var(--table-cell-bg)',
                                                borderBottom: 'none',
                                                paddingTop: 8,
                                                paddingBottom: 8,
                                            }}
                                        >
                                            {renderEditActions(row)}
                                        </CustomTableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
                {!disableFooter && !categoryadd && !editTicketType && !roles && (
                    <FooterWrapper leadsTable={leadsTable}>
                        <Select
                            value={rowsPerPage}
                            onChange={handleChangeRowsPerPage}
                            displayEmpty
                            inputProps={{ 'aria-label': 'rows per page' }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        color: 'var(--dashboard-text-primary)',
                                    },
                                },
                            }}
                            sx={{
                                borderRadius: 2,
                                color: 'var(--dashboard-text-primary)',
                                border: '1px solid var(--dashboard-box-border)',
                                height: leadsTable ? 36 : 30,
                                fontSize: leadsTable ? 13 : 12,
                                '.MuiSelect-icon': {
                                    color: 'var(--dashboard-text-primary)',
                                },
                            }}
                        >
                            <MenuItem value={5}>5 per page</MenuItem>
                            <MenuItem value={10}>10 per page</MenuItem>
                            <MenuItem value={25}>25 per page</MenuItem>
                            <MenuItem value={50}>50 per page</MenuItem>
                        </Select>
                        <Pagination
                            count={pageCount}
                            page={page}
                            onChange={handleChangePage}
                            variant="outlined"
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    color: document.documentElement.classList.contains('dark')
                                        ? '#FFFFFF'
                                        : 'var(--dashboard-text-primary)',
                                    borderColor: 'var(--dashboard-box-border)',
                                },
                                '& .MuiPaginationItem-root.Mui-selected': {
                                    backgroundColor: 'rgba(0, 89, 245, 0.14)',
                                    borderColor: '#0C79F7',
                                    color: document.documentElement.classList.contains('dark')
                                        ? '#FFFFFF'
                                        : '#0C79F7',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 89, 245, 0.22)',
                                    },
                                },
                            }}
                        />
                    </FooterWrapper>
                )}
            </StyledTableContainer>

            <MemoPopup trigger={showDialog} onClose={handleCloseDialog} rowData={selectedRow} memoUserList={memoUserList} payoutdetailsList={payoutdetailsList} customerTable={customerTable} formTable={formTable} policyTable={policyTable} trainingTable={trainingTable} inventoryTable={inventoryTable} />
        </>
    )
};

export default MemoTable;
