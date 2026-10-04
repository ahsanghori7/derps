import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { useNavigate } from 'react-router-dom';
import ViewTicketButtonBackground from "../../assets/ViewTicketButtonBackground.png";
import edit from "../../assets/edit.png";
import TableFooter from '@mui/material/TableFooter';
import { Box } from '@mui/material';
import TablePagination from '@mui/material/TablePagination';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem'
// Styled button component
const StatusButton = styled(Button)(({ theme, status }) => ({
    color: 'var(--sidebar-text-selected)', // Using theme variable for text color
    fontWeight: 600,
    width: '88px',
    height: 32,
    border: 0,
    fontSize: 10,
    backgroundImage: `url(${ViewTicketButtonBackground})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    textTransform: 'none',
    '&:hover': {
        borderRadius: 11
    },
}));
const EditButton = styled('div')(({ theme, status }) => ({
    border: 0,
    '&:hover': {
        border: 0,
        backgroundColor: 'none',
        cursor: 'pointer'
    },
}));

// Styled button component
const TicketStatusButton = styled('div')(({ theme, status }) => ({
    color: status === 'complete' ? '#4AC411' : status === 'in-progress' ? (document.documentElement.classList.contains('dark') ? '#5B9BD5' : 'var(--sidebar-selected-bg)') : '#EF3826',
    backgroundColor: status === 'complete' ? 'rgba(74, 196, 17, 0.2)' : status === 'in-progress' ? (document.documentElement.classList.contains('dark') ? 'rgba(91, 155, 213, 0.2)' : 'var(--sidebar-hover-bg)') : 'rgba(239, 56, 38, 0.2)',
    fontWeight: 500,
    width: '92px',
    border: 0,
    padding: '7px 0',
    fontSize: 10,
    borderRadius: 7,
    margin: 'auto',
    borderBottom: '0',
    '&:hover': {
        backgroundColor: status === 'complete' ? 'rgba(74, 196, 17, 0.2)' : 'rgba(239, 56, 38, 0.2)',
        cursor: 'default',
        border: 'none'
    },
}));

// Status cell component
const StatusTableCell = ({ status, onClick }) => (
    <TableCell align="center" style={{ border: 0, borderBottom: '1px solid #E0E0E0', }} className='mx-auto'>
        <StatusButton variant="outlined" className='mx-auto' status={status} onClick={onClick}>
            View Ticket
        </StatusButton>
    </TableCell>
);

// Status cell component
const EditTableCell = ({ status, onClick }) => (
    <TableCell align="center" style={{ border: 0, backgroundColor: 'none', }}>
        <EditButton variant="outlined" status={status} onClick={onClick}>
            <img src={edit} className="w-5 h-5 mx-auto" />
        </EditButton>
    </TableCell>
);

// Status cell component
const TicketStatusTableCell = ({ status }) => (
    <TableCell align="center" style={{ border: 0, textTransform: 'uppercase', borderBottom: '1px solid #E0E0E0' }}>
        <TicketStatusButton variant="outlined" status={status}>
            {status}
        </TicketStatusButton>
    </TableCell>
);

const FooterRow = styled(TableRow)(({ theme }) => ({
    backgroundColor: 'rgba(43, 75, 242, 0.1)',
}));
const FooterRow2 = styled(TableRow)(({ theme }) => ({
    backgroundColor: 'rgba(251, 252, 255, 1)',
}));

const FooterCell = styled(TableCell)(({ theme }) => ({
    borderBottom: 'none',
}));

const FooterCell2 = styled(TableCell)(({ theme }) => ({
    borderBottom: 'none',
    borderTop: '1px solid rgba(224, 224, 224, 1)',
}));

const FooterLeftSection = styled('div')(({ theme }) => ({
    borderRadius: '8px 0 0 8px',
    display: 'flex',
    alignItems: 'center',
}));

const FooterRightSection = styled('div')(({ theme }) => ({
    marginTop: -20,
}));
const FooterRightSection2 = styled('div')(({ theme }) => ({
}));

const FooterWrapper = styled(Box)(({ theme }) => ({
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--dashboard-card-bg)',
    borderTop: '1px solid var(--sidebar-divider)',
    padding: '4px 10px',
    display: 'flex',
    overflow: 'hidden',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '0 0 14px 14px',
}));

// Styled components for table cells and rows
const CustomTableCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'singleInvoice' && prop !== 'PreviewInvoice' && prop !== 'invoiceBottom' && prop !== 'PreviewPurchase' && prop !== 'singleInvoiceQuantity' && prop !== 'invoiceBottomMore' && prop !== 'PreviewPurchase' && prop !== 'PreviewPurchaseFooter'
})(({ theme, singleInvoice, PreviewInvoice, singleInvoiceQuantity, invoiceBottom, invoiceBottomMore, PreviewPurchase, PreviewPurchaseFooter }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: '#0C79F7',
        color: 'var(--sidebar-text-selected)',
        fontWeight: PreviewInvoice || invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? 500 : 700,
        whiteSpace: 'nowrap',
        lineHeight: '1.2',
        borderRight: !PreviewInvoice && !singleInvoice && !invoiceBottom && !invoiceBottomMore && !PreviewPurchase && !PreviewPurchaseFooter ? 'none' : '1px solid #E0E0E0',
        '&:last-child': {
            borderRight: 'none',
        },
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? 10 : PreviewInvoice ? 10 : 12,
        fontWeight: PreviewInvoice || invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? 400 : 600,
        height: PreviewInvoice || PreviewPurchase || PreviewPurchaseFooter ? 55 : 0,
        textAlign: 'center',
        borderRight: !PreviewInvoice && !singleInvoice && !invoiceBottom && !invoiceBottomMore && !PreviewPurchase && !PreviewPurchaseFooter ? 'none' : '0.5px solid #E0E0E0',
        color: 'var(--table-cell-text)',
        '&:last-child': {
            borderRight: 'none',
        },
        borderBottom: '1px solid #E0E0E0',
        // verticalAlign: 'top',
        padding: PreviewInvoice || invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? '4px 7px 7px 7px' : singleInvoice ? '30px 50px' : singleInvoiceQuantity ? '30px 50px' : '12px 12px',
    },
}));


const calculatePaddingBottom = (rowCount) => {
    switch (rowCount) {
        case 1:
            return 300;
        case 2:
            return 250; // Define your padding for 3 rows
        case 3:
            return 200; // Define your padding for 3 rows
        case 4:
            return 200; // Define your padding for 3 rows
        case 5:
            return 150; // Define your padding for 3 rows
        case 6:
            return 50; // Define your padding for 3 rows
        default:
            return 10; // Default padding
    }
};

const CustomTableRow = styled(TableRow)(({ theme, PreviewInvoice, singleInvoice, invoiceBottom, rowCount, invoiceBottomMore, PreviewPurchase, PreviewPurchaseFooter, allTickets, PreviewInvoiceQuantity }) => ({
    '& td': {
        backgroundColor: PreviewInvoiceQuantity ? '#FFFFFF' : 'var(--table-cell-bg)',
        color: PreviewInvoiceQuantity ? '#000000' : 'var(--table-cell-text)',
    },
    '&:nth-of-type(odd) td': {
        backgroundColor: PreviewInvoiceQuantity ? '#FFFFFF' : 'var(--table-cell-alt-bg)',
    },
    '&:hover td': {
        backgroundColor: PreviewInvoiceQuantity ? '#FFFFFF' : 'var(--table-cell-hover)',
    },
    '&:nth-of-type': {
        paddingBottom: invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter && 10,
    },
    '&:last-child td, &:last-child th': {
        borderBottom: 0,
        paddingBottom: PreviewInvoice || invoiceBottom || PreviewPurchase || PreviewPurchaseFooter ? calculatePaddingBottom(rowCount) : allTickets ? 15 : 100,
    },
}));
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    overflow: 'auto',
    borderRadius: '0px',
    border: '1px solid rgba(224, 224, 224, 1)',
    '& thead': {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: 'var(--dashboard-bg)',
    },
}));
const CustomTableContainer = styled(TableContainer)(({ theme }) => ({
    borderRadius: '14px', // Border radius for the entire table
    overflow: 'hidden', // Ensure that content does not overflow the rounded corners
}));

// Table header component
const CustomTableHeader = ({ columns, PreviewInvoice, invoiceBottom, PreviewInvoiceQuantity, invoiceBottomMore, PreviewPurchase, PreviewPurchaseFooter }) => (
    <TableRow>
        {columns.map((column) => (
            <CustomTableCell key={column.id} align={column.align} sx={{ fontSize: invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? 12 : PreviewInvoice ? 12 : 12, padding: PreviewInvoiceQuantity ? '0px 15px 15px 15px' : invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? '0px 15px 15px 15px' : PreviewInvoice ? '7px 15px 10px 15px' : '8px 17px' }}>
                {column.label}
            </CustomTableCell>
        ))}
    </TableRow>
);

const StyledTablePagination = styled(TablePagination)({
    position: 'sticky',
    bottom: 0,
    backgroundColor: 'var(--dashboard-card-bg)',
    color: 'var(--table-cell-text)',
    borderTop: '1px solid var(--dashboard-box-border)',
});

const PaginationWrapper = styled('div')({
    position: 'sticky',
    bottom: 0,
    backgroundColor: 'var(--dashboard-card-bg)',
    color: 'var(--table-cell-text)',
    borderTop: '1px solid var(--dashboard-box-border)',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
});

// Main reusable table component
const AgentTicketListTable = ({ data, columns, ticketList, subtotal, discountAmount, PreviewPurchase, PreviewPurchaseFooter, allTickets, invoiceData, deliveryFee, taxes, PreviewInvoiceQuantity, singleInvoice, PreviewInvoice, singleInvoiceQuantity, invoiceBottom, invoiceBottomMore, isMerchantTaxExempt, notes, status, paidAmount, balanceDue, page: externalPage, rowsPerPage: externalRowsPerPage, totalCount, onPageChange, onRowsPerPageChange }) => {
    const rowCount = data.length; // Get the number of rows

    const [selectedRow, setSelectedRow] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const navigate = useNavigate();
    const [internalPage, setInternalPage] = useState(1);
    const [internalRowsPerPage, setInternalRowsPerPage] = useState(25);

    const page = externalPage !== undefined ? externalPage : internalPage;
    const rowsPerPage = externalRowsPerPage !== undefined ? externalRowsPerPage : internalRowsPerPage;

    const handleChangePage = (event, newPage) => {
        if (onPageChange) {
            onPageChange(newPage);
        } else {
            setInternalPage(newPage);
        }
    };

    const handleChangeRowsPerPage = (event) => {
        const next = parseInt(event.target.value, 10);
        if (onRowsPerPageChange) {
            onRowsPerPageChange(next);
        } else {
            setInternalRowsPerPage(next);
            setInternalPage(1);
        }
    };

    const pageCount = totalCount !== undefined ? Math.ceil(totalCount / rowsPerPage) : Math.ceil(data.length / rowsPerPage);

    useEffect(() => {
        if (page > pageCount) {
            if (onPageChange) {
                onPageChange(1);
            } else {
                setInternalPage(1);
            }
        }
    }, [data, page, pageCount]);

    const handleRowClick = (row) => {
        navigate('/userdashboard/maintainTickets', { state: { rowData: row } });
    };

    const handleStatusButtonClick = (row) => {
        window.open(
            `/home/singleTicket?id=${row.id}`,
            "_blank"
        );
    };

    const handleCloseDialog = () => {
        setShowDialog(false);
    };

    return (
        <>
            {/* <Box sx={{ overflow: "auto" }}> */}
            <StyledTableContainer component={Paper} >
                <Table sx={{ minWidth: PreviewInvoice || invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? 300 : 1000, }} stickyHeader aria-label="sticky table" >
                    <TableHead sx={{ fontSize: invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? 15 : PreviewInvoice ? 12 : 16, }}>
                        <CustomTableHeader columns={columns} sx={{ fontSize: invoiceBottom || invoiceBottomMore || PreviewPurchase || PreviewPurchaseFooter ? 15 : PreviewInvoice ? 12 : 16 }}
                            singleInvoice={singleInvoice}
                            PreviewInvoiceQuantity={PreviewInvoiceQuantity}
                            PreviewInvoice={PreviewInvoice}
                            invoiceBottom={invoiceBottom}
                            PreviewPurchase={PreviewPurchase}
                            invoiceBottomMore={invoiceBottomMore}
                            PreviewPurchaseFooter={PreviewPurchaseFooter} />
                    </TableHead>
                    <TableBody sx={{}}>
                        {(totalCount !== undefined ? data : data.slice((page - 1) * rowsPerPage, page * rowsPerPage)).map((row) => {
                            const isTaxExempt = PreviewPurchaseFooter || PreviewPurchase
                                ? true
                                : !!row?.taxExempt || !!row?.inventory?.taxExempt;
                            return (
                                <CustomTableRow key={row.id} PreviewInvoice={PreviewInvoice} PreviewInvoiceQuantity={PreviewInvoiceQuantity} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter} rowCount={rowCount} singleInvoice={singleInvoice} allTickets={allTickets} >
                                    {columns.map((column) => (
                                        column.id === 'details' && !ticketList ? (
                                            <StatusTableCell key={column.id} status={row[column.id]} onClick={() => handleStatusButtonClick(row)}
                                            />
                                        ) : column.id === 'status' && ticketList ? (
                                            <TicketStatusTableCell key={column.id} status={row[column.id]}
                                            />
                                        ) : column.id === 'status' && allTickets ? (
                                            <TicketStatusTableCell key={column.id} status={row[column.id]}
                                            />
                                        ) : column.id === 'edit' ? (
                                            <EditTableCell key={column.id} status={row[column.id]} onClick={() => handleRowClick(row)}
                                            />
                                        ) : column.id === 'priority' || column.id === 'ticketNo' || column.id === 'category' || column.id === 'item' || column.id === 'site' || column.id === 'quantity' ? (
                                            <CustomTableCell key={column.id} align={column.align} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} PreviewPurchase={PreviewPurchase} invoiceBottomMore={invoiceBottomMore} PreviewPurchaseFooter={PreviewPurchaseFooter} singleInvoiceQuantity={singleInvoiceQuantity} style={{ textAlign: 'center', fontWeight: PreviewInvoice ? 400 : invoiceBottom || PreviewPurchase || PreviewPurchaseFooter ? 400 : 400, fontSize: invoiceBottom || PreviewPurchase || invoiceBottomMore || PreviewPurchaseFooter ? 10 : PreviewInvoiceQuantity ? 14 : PreviewInvoice ? 10 : 12 }}>
                                                {row[column.id]}
                                            </CustomTableCell>
                                        ) : column.id === 'category.title' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter} >
                                                {row.category?.title || '-'}
                                            </CustomTableCell>
                                        ) : column.id === 'assignee?.name' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {row.assignee?.name || '-'}
                                            </CustomTableCell>
                                        ) : column.id === 'inventory.name' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {row.inventory.name}
                                            </CustomTableCell>
                                        ) : column.id === 'inventory.description' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {row.inventory.description}
                                            </CustomTableCell>
                                        ) : column.id === 'barcode' || column.id === 'inventory.barcode' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {row?.barcode ? row.barcode : '-'}
                                            </CustomTableCell>
                                        ) : column.id === 'serialNo' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {(() => {
                                                    const serials = Array.isArray(row?.serialNos)
                                                        ? row.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
                                                        : [];
                                                    if (serials.length > 0) return serials.join(', ');
                                                    const one = String(row?.serialNo || '').trim();
                                                    return one || '-';
                                                })()}
                                            </CustomTableCell>
                                        ) : column.id === 'brand' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {row?.brand ? row.brand : '-'}
                                            </CustomTableCell>
                                        ) : column.id === 'model' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {row?.model ? row.model : '-'}
                                            </CustomTableCell>
                                        ) : column.id === 'amount' ? (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {(() => {
                                                    const qty = Math.max(1, Number(row?.quantity) || 1);
                                                    const rate = Math.max(0, Number(row?.rate) || 0);
                                                    const baseAmount = qty * rate;
                                                    const hasDiscount =
                                                        (row?.discountType === 'percent' || row?.discountType === 'amount') &&
                                                        Number(row?.discount) > 0;
                                                    const discountVal = Number(row?.discount) || 0;
                                                    const discountedAmount =
                                                        row?.discountType === 'percent'
                                                            ? baseAmount * (1 - discountVal / 100)
                                                            : row?.discountType === 'amount'
                                                                ? baseAmount - discountVal
                                                                : baseAmount;
                                                    const safeDiscounted = Math.max(0, Number(discountedAmount.toFixed(2)));
                                                    const shownAmount = Number(row?.amount);
                                                    const finalAmount = Number.isFinite(shownAmount) ? shownAmount : safeDiscounted;

                                                    if (!hasDiscount) {
                                                        return (
                                                            <span>
                                                                {parseFloat(finalAmount).toFixed(2)}{!isTaxExempt ? '(T)' : ''}
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                            <div style={{ position: 'relative', display: 'inline-block', opacity: 0.7, fontSize: 11, lineHeight: 1.1 }}>
                                                                <span>{baseAmount.toFixed(2)}</span>
                                                                <div
                                                                    style={{
                                                                        position: 'absolute',
                                                                        left: -2,
                                                                        right: -2,
                                                                        top: '100%',
                                                                        height: 1,
                                                                        backgroundColor: 'currentColor',
                                                                        transform: 'translateY(-50%)',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span style={{ fontWeight: 700, fontSize: 12 }}>
                                                                {safeDiscounted.toFixed(2)}{!isTaxExempt ? '(T)' : ''}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </CustomTableCell>
                                        ) : (
                                            <CustomTableCell key={column.id} align={column.align} singleInvoice={singleInvoice} PreviewInvoice={PreviewInvoice} invoiceBottom={invoiceBottom} invoiceBottomMore={invoiceBottomMore} PreviewPurchase={PreviewPurchase} PreviewPurchaseFooter={PreviewPurchaseFooter}>
                                                {row[column.id]}
                                            </CustomTableCell>
                                        )
                                    ))}
                                </CustomTableRow>
                            );
                        })}
                    </TableBody>
                    {invoiceBottom ? (
                        <>
                            <TableFooter>
                                <FooterRow2>
                                    <FooterCell2 colSpan={columns.length} style={{ border: '1px solid rgba(224, 224, 224, 1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <FooterLeftSection>
                                                {notes ? (
                                                    <div style={{ color: 'var(--dashboard-text-primary)', fontWeight: 400, fontSize: 12, maxWidth: 420, whiteSpace: 'pre-wrap' }}>{notes}</div>
                                                ) : (
                                                    <span style={{ color: 'var(--navbar-dropdown-hover)', fontWeight: invoiceBottom ? 600 : 800, fontSize: invoiceBottom ? 10 : 15 }}>
                                                    </span>
                                                )}
                                            </FooterLeftSection>
                                            <FooterRightSection>
                                                <div className="flex justify-end">
                                                    <div className="">
                                                        <div className="flex justify-between mt-2  gap-x-6">
                                                            <span className="font-semibold  text-left" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>Subtotal</span>
                                                            <span className=" text-right" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>${subtotal ? subtotal.toFixed(2) : '0.00'}</span>
                                                        </div >
                                                        <div className="flex justify-between gap-x-6">
                                                            <span className="font-semibold  text-left" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>Discount</span>
                                                            <span className=" text-right" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>-${discountAmount ? Number(discountAmount).toFixed(2) : '0.00'}</span>
                                                        </div >
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>Shipping Fee</span>
                                                            <span className=" text-right" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>${deliveryFee ? deliveryFee.toFixed(2) : '0.00'}</span>
                                                        </div>
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>Taxes</span>
                                                            <span className=" text-right" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>{isMerchantTaxExempt ? 'Exempt Reseller' : `$${taxes ? taxes.toFixed(2) : '0.00'}`}</span>
                                                        </div>
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>Total</span>
                                                            <span className=" text-right" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>${invoiceData ? invoiceData.toFixed(2) : '0.00'}</span>
                                                        </div>

                                                        {status === 'partial' && (
                                                            <>
                                                                <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                                    <span className="font-semibold  text-left" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>Amount Paid</span>
                                                                    <span className=" text-right" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>${(Number(paidAmount) || 0).toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                                    <span className="font-semibold  text-left" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>Balance Due</span>
                                                                    <span className=" text-right" style={{ fontSize: 14, color: 'var(--dashboard-text-primary)' }}>${(Number(balanceDue) || 0).toFixed(2)}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </FooterRightSection>
                                        </div>
                                    </FooterCell2>
                                </FooterRow2>
                                <FooterRow style={{ alignItems: 'center' }}>
                                    <FooterCell colSpan={columns.length}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <FooterLeftSection>
                                                <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: PreviewInvoice ? 500 : 800, fontSize: PreviewInvoice ? 8 : 12, marginBottom: 10, marginTop: -10, }}>
                                                    Thank you for your business
                                                </span>
                                            </FooterLeftSection>
                                            <FooterRightSection>
                                                {/* <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: 700, fontSize: PreviewInvoice ? 13 : 15 }}>
                                            Total: ${invoiceData?.totalAmount ? invoiceData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : invoiceData ? invoiceData.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null}
                                        </span> */}
                                            </FooterRightSection>
                                        </div>
                                    </FooterCell>
                                </FooterRow>
                            </TableFooter>
                        </>
                    ) : null}
                    {invoiceBottomMore ? (
                        <>
                            <TableFooter>
                                <FooterRow style={{ alignItems: 'center' }}>
                                    <FooterCell colSpan={columns.length}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <FooterLeftSection>
                                                {notes ? (
                                                    <div style={{ color: 'var(--dashboard-text-primary)', fontWeight: 400, fontSize: 12, maxWidth: 420, whiteSpace: 'pre-wrap' }}>{notes}</div>
                                                ) : null}
                                            </FooterLeftSection>
                                            <FooterRightSection>
                                            </FooterRightSection>
                                        </div>
                                    </FooterCell>
                                </FooterRow>
                            </TableFooter>
                        </>
                    ) : null}
                    {PreviewPurchase ? (
                        <>
                            <TableFooter>
                                <FooterRow style={{ alignItems: 'center' }}>
                                    <FooterCell colSpan={columns.length}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <FooterLeftSection>
                                                {notes ? (
                                                    <div style={{ maxWidth: 420 }}>
                                                        {/* <div style={{ color: 'var(--dashboard-text-primary)', fontWeight: 600, fontSize: 12, marginBottom: 2 }}>Notes</div> */}
                                                        <div style={{ color: 'var(--dashboard-text-primary)', fontWeight: 400, fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 2 }}>{notes}</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: PreviewInvoice ? 500 : 800, fontSize: PreviewInvoice ? 8 : 12, marginBottom: 10, marginTop: -10, }}>
                                                        {/* Thank you for your business */}
                                                    </span>
                                                )}
                                            </FooterLeftSection>
                                            {invoiceData && (
                                                <FooterRightSection>
                                                    <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: 700, fontSize: PreviewInvoice ? 13 : 15 }}>
                                                        Total: ${invoiceData ? invoiceData.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : invoiceData ? invoiceData.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null}
                                                    </span>
                                                </FooterRightSection>
                                            )}
                                        </div>
                                    </FooterCell>
                                </FooterRow>
                            </TableFooter>
                        </>
                    ) : null}
                    {PreviewPurchaseFooter ? (
                        <>
                            <TableFooter>
                                <FooterRow style={{ alignItems: 'center' }}>
                                    <FooterCell colSpan={columns.length}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <FooterLeftSection>
                                                {notes ? (
                                                    <div style={{ maxWidth: 420 }}>
                                                        <div style={{ color: 'var(--dashboard-text-primary)', fontWeight: 600, fontSize: 12, marginBottom: 2 }}>Notes</div>
                                                        <div style={{ color: 'var(--dashboard-text-primary)', fontWeight: 400, fontSize: 12, whiteSpace: 'pre-wrap' }}>{notes}</div>
                                                    </div>
                                                ) : null}
                                            </FooterLeftSection>
                                        </div>
                                    </FooterCell>
                                </FooterRow>
                            </TableFooter>
                        </>
                    ) : null}
                    {PreviewInvoice ? (
                        <>
                            <TableFooter>
                                <FooterRow2>
                                    <FooterCell2 colSpan={columns.length} style={{ border: '1px solid rgba(224, 224, 224, 1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <FooterLeftSection>
                                                {notes ? (
                                                    <div style={{ color: 'var(--dashboard-text-primary)', fontWeight: 400, fontSize: 10, maxWidth: 420, whiteSpace: 'pre-wrap' }}>{notes}</div>
                                                ) : (
                                                    <span style={{ color: 'var(--navbar-dropdown-hover)', fontWeight: PreviewInvoice ? 600 : 800, fontSize: PreviewInvoice ? 10 : 15 }}>
                                                    </span>
                                                )}
                                            </FooterLeftSection>
                                            <FooterRightSection>
                                                <div className="flex justify-end">
                                                    <div className="">
                                                        <div className="flex justify-between mt-2  gap-x-6">
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>Subtotal</span>
                                                            <span className=" text-right" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>${subtotal ? subtotal.toFixed(2) : '0.00'}</span>
                                                        </div >
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>Shipping Fee</span>
                                                            <span className=" text-right" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>${deliveryFee ? deliveryFee.toFixed(2) : '0.00'}</span>
                                                        </div>
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>Taxes</span>
                                                            <span className=" text-right" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>{isMerchantTaxExempt ? 'Exempt Reseller' : `$${taxes ? taxes.toFixed(2) : '0.00'}`}</span>
                                                        </div>
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>Total</span>
                                                            <span className=" text-right" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>${invoiceData ? invoiceData.toFixed(2) : '0.00'}</span>
                                                        </div>

                                                        {status === 'partial' && (
                                                            <>
                                                                <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                                    <span className="font-semibold  text-left" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>Amount Paid</span>
                                                                    <span className=" text-right" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>${(Number(paidAmount) || 0).toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                                    <span className="font-semibold  text-left" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>Balance Due</span>
                                                                    <span className=" text-right" style={{ fontSize: 10, color: 'var(--dashboard-text-primary)' }}>${(Number(balanceDue) || 0).toFixed(2)}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </FooterRightSection>
                                        </div>
                                    </FooterCell2>
                                </FooterRow2>
                                <FooterRow style={{ alignItems: 'center' }}>
                                    <FooterCell colSpan={columns.length}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <FooterLeftSection>
                                                <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: PreviewInvoice ? 500 : 800, fontSize: PreviewInvoice ? 10 : 12, marginTop: -10, }}>
                                                    Thank you for your business
                                                </span>
                                            </FooterLeftSection>
                                            <FooterRightSection>
                                                {/* <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: 700, fontSize: PreviewInvoice ? 13 : 15 }}>
                                            Total: ${invoiceData?.totalAmount ? invoiceData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : invoiceData ? invoiceData.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null}
                                        </span> */}
                                            </FooterRightSection>
                                        </div>
                                    </FooterCell>
                                </FooterRow>
                            </TableFooter>
                        </>
                    ) : null}
                    {singleInvoice ? (
                        <TableFooter>
                            <FooterRow>
                                <FooterCell colSpan={columns.length}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, marginTop: -5 }}>
                                        <FooterLeftSection>
                                            <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: PreviewInvoice ? 700 : 800, fontSize: PreviewInvoice ? 13 : 12, }}>
                                                Thank you for your business
                                            </span>
                                        </FooterLeftSection>
                                        <FooterRightSection2>
                                            <span style={{ color: 'var(--dashboard-text-primary)', fontWeight: 700, fontSize: PreviewInvoice ? 13 : 15 }}>
                                                Total: ${invoiceData?.totalAmount ? invoiceData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : invoiceData ? invoiceData.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null}
                                            </span>
                                        </FooterRightSection2>
                                    </div>
                                </FooterCell>
                            </FooterRow>
                        </TableFooter>
                    ) : null}
                </Table>
                {!PreviewInvoice && !singleInvoice && !invoiceBottom && !invoiceBottomMore && !PreviewPurchase && !PreviewPurchaseFooter && <FooterWrapper>
                    <Select
                        value={rowsPerPage}
                        onChange={handleChangeRowsPerPage}
                        displayEmpty
                        inputProps={{ 'aria-label': 'rows per page' }}
                        sx={{
                            borderRadius: 2,
                            color: 'var(--dashboard-text-primary)',
                            border: '1px solid var(--dashboard-box-border)',
                            height: 30,
                            fontSize: 12,
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
                                color: 'var(--dashboard-text-primary)',
                                borderColor: 'var(--dashboard-box-border)',
                            },
                            '& .Mui-selected': {
                                backgroundColor: 'var(--chrome-primary)',
                                color: '#FFFFFF',
                                '&:hover': {
                                    backgroundColor: 'var(--chrome-primary-hover)',
                                    color: '#FFFFFF',
                                },
                            },
                        }}
                    // shape="rounded"
                    />
                </FooterWrapper>}
            </StyledTableContainer>
            {/* </Box> */}

        </>
    )
};

export default AgentTicketListTable;
