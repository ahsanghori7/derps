import React, { useState } from 'react';
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
import { useSelector } from 'react-redux';
import { openApplicationFromList } from '../../Utils/applicationNavigation';
import edit from "../../assets/edit.png";
import MemoPopup from '../../Screens/MemoPopup';
import { Box, IconButton, TableFooter } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// Styled button component
const StatusButton = styled(Button)(({ theme, status }) => ({
    color: status === 'active' || status === 'completed' ? '#4AC411' : status === "pending" ? '#FE6901' : '#EF3826', // Green for Active, Orange for Pending, Red for Inactive
    backgroundColor: status === 'active' || status === 'completed' ? 'rgba(74, 196, 17, 0.2)' : status === "pending" ? 'rgba(254, 105, 1, 0.2)' : 'rgba(239, 56, 38, 0.2)',
    fontWeight: 500, // Optional: makes the text bold
    width: '120px', // Fixed width
    border: 0,
    // marginLeft: 20
    '&:hover': {
        backgroundColor: status === 'active' ? 'rgba(74, 196, 17, 0.2)' : 'rgba(239, 56, 38, 0.2)', // Prevent background change
        cursor: 'default', // Prevent cursor change
        border: 'none'
    },
}));

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
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

// Status cell component
const StatusTableCell = ({ status }) => (
    <TableCell align="center" style={{ border: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <StatusButton variant="outlined" status={status} className='mx-auto'>
            {status}
        </StatusButton>
    </TableCell>
);
// Status cell component
const EditTableCell = ({ status, onClick, adminFormTable, inventoryTable, itemAndServicesTable, roles, categoryadd, editTicketType, adminTrainingTable, adminPolicyTable, leadsTable, adminApplication, userApplication }) => (
    <TableCell align="center" style={{ border: 0, backgroundColor: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className=''>
        <EditButton variant="outlined" status={status} onClick={onClick}>
            <img src={edit} className={`${adminFormTable ? 'w-6 h-4' : adminTrainingTable || adminPolicyTable || adminApplication || userApplication || inventoryTable || leadsTable ? 'w-5 h-4' : itemAndServicesTable ? 'w-5 h-4' : roles || categoryadd || editTicketType ? 'w-5 h-4' : 'w-8 h-4 '}`} />
        </EditButton>
    </TableCell>
);

// Styled components for table cells and rows
const CustomTableCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'isFirstColumn' && prop !== 'payoutdetailsList' && prop !== 'invoiceTable' && prop !== 'shipmentDetails' && prop !== 'invoiceTableUser' && prop !== 'adminCustomerTable' && prop !== 'formTable' && prop !== 'leadsTable' && prop !== 'policyTable' && prop !== 'adminMemo' && prop !== 'trainingTable' && prop !== 'customerTable' && prop !== 'editTicketType' && prop !== 'adminFormTable' && prop !== 'inventoryTable' && prop !== 'adminApplication' && prop !== 'userApplication' && prop !== 'itemAndServicesTable' && prop !== 'adminTrainingTable' && prop !== 'adminPolicyTable' && prop !== 'roles' && prop !== 'categoryadd'
})(({ theme, isFirstColumn, invoiceTable, invoiceTableUser, payoutdetailsList, formTable, policyTable, trainingTable, customerTable, inventoryTable, shipmentDetails, adminMemo, itemAndServicesTable, leadsTable, adminTrainingTable, adminPolicyTable, adminFormTable, roles, adminApplication, userApplication, adminCustomerTable, categoryadd, editTicketType }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: 'var(--sidebar-selected-bg)',
        color: 'var(--sidebar-text-selected)',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        padding: '8px 40px', // Add padding to cells for better spacing
        border: 'none',
        fontSize: 10,
        height: 15,
        textAlign: 'center',

        // flex: 1,

        // padding: '16px', // Add padding to header cells

        // borderRight: '1px solid rgba(224, 224, 224, 1)', // Add right border to header cells
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 10,
        fontWeight: 600,
        height: 38,
        // flex: 1,
        textAlign: 'center',
        borderRight: 'none', // Remove right border
        ...(isFirstColumn && {
            whiteSpace: 'nowrap',
        }),
        borderBottom: 'none', // Remove default bottom border
        '&:first-of-type': {
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
        },
        '&:last-of-type': {
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
        },
        '&:[3]': {
            textAlign: 'center',

        },
        padding: '16px 40px', // Add padding to cells for better spacing
        color: 'var(--dashboard-text-primary)'
    },
}));

const CustomTableRow = styled(TableRow)(({ theme, customerTable }) => ({
    '& td': {
        backgroundColor: 'var(--dashboard-tab-box)',
    },
    '&:not(:last-child)': {
        marginBottom: '12px', // Add margin between rows
    },
    boxShadow: '0 0 0 1px var(--dashboard-border)',
    // borderRadius: '8px',
    cursor: 'pointer'
}));

const CustomTableContainer = styled(TableContainer)(({ theme }) => ({
    backgroundColor: 'var(--dashboard-card-bg)',
    borderRadius: '14px', // Border radius for the entire table
    overflow: 'hidden',
}));

const CustomTable = styled(Table)(({ theme, isFirstColumn }) => ({
    borderCollapse: 'separate',
    borderSpacing: '0 12px',
    marginTop: '-12px',
    '& .MuiTableBody-root': {
        '& .MuiTableRow-root': {
            margin: '0 8px 12px 8px', // Horizontal and bottom margin for body rows
        },
        '& .MuiTableRow-root:first-of-type': {
            marginTop: '12px', // Add top margin to the first body row
        },
    }, // Compensate for the first row's spacing
}));

const CustomTableBody = styled(TableBody)(({ theme }) => ({
    '& .MuiTableRow-root': {
        marginBottom: '12px', // Add margin to bottom of each row
    },
}));

const CustomTableHeader = styled(TableHead)(({ theme, roles, categoryadd, editTicketType }) => ({
    position: 'sticky',
    top: 0,
    zIndex: 1,
    '& .MuiTableRow-root': {
        backgroundColor: 'var(--dashboard-tab-box)',
        margin: 0, // Ensure no margin for header row
        // ...(roles ? {
        //     display: 'flex',
        //     justifyContent: 'space-between',
        // } : {}),
    },
    '& .MuiTableCell-root': {
        borderBottom: 'none',
        padding: roles || categoryadd || editTicketType ? '16px 50px' : '16px 8px',
        ...(roles || categoryadd || editTicketType ? {
            textAlign: 'center'
        } : {}),
        // ...(roles ? {
        //     flex: 1,
        // } : {}),

    },
}));

const StyledTableContainer = styled(TableContainer)(({ theme, roles, categoryadd, editTicketType }) => ({
    maxHeight: '100vh', // Adjust this value as needed
    overflow: 'auto',
    borderRadius: '14px',
    backgroundColor: 'var(--sidebar-divider)',
    // Border radius for the entire table
    '& thead': {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: 'var(--dashboard-tab-box)',
    },
    ...(roles || categoryadd || editTicketType ? { maxWidth: 800, } : {})
}));

const FooterRow2 = styled(TableRow)(({ theme }) => ({
    backgroundColor: 'var(--dashboard-tab-box)',
}));

const FooterCell2 = styled(TableCell)(({ theme }) => ({
    borderBottom: 'none',
    borderTop: '1px solid var(--dashboard-border)',
    color: 'var(--dashboard-text-primary)',
    // padding: '16px',
}));

const FooterLeftSection = styled('div')(({ theme }) => ({
    // backgroundColor: '#2B4BF2',
    // padding: '16px',
    borderRadius: '8px 0 0 8px',
    display: 'flex',
    alignItems: 'center',
    // height: '100%',
}));

const FooterRightSection = styled('div')(({ theme }) => ({
    marginTop: -20,
}));

const TruncatedText = styled('div')({
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '200px', // Adjust this value as needed
});
// Main reusable table component
const SmallTable = ({ data, columns, invoiceTable, editTicketType, invoiceTableUser, shipmentDetails, subtotal, deliveryFee, totalAmount, taxes, isMerchantTaxExempt, onDeleteItem, memoUserList, payoutdetailsList, adminCustomerTable, leadsTable, userApplication, categoryadd, adminApplication, formTable, policyTable, trainingTable, customerTable, inventoryTable, itemAndServicesTable, adminTrainingTable, roles, adminPolicyTable, adminFormTable, adminMemo }) => {
    const [selectedRow, setSelectedRow] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    const handleRowClick = (row) => {
        if (invoiceTableUser || shipmentDetails) {
            return;
        }
        if (customerTable) {
            return;
        }
        if (roles) {
            // Do nothing if roles is true
            navigate('/home/singleInvoice', { state: { invoiceData: row } });
        }
        if (invoiceTable) {
            // Navigate to SingleInvoice page with the row data
            navigate('/home/singleInvoice', { state: { invoiceData: row } });
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
            navigate('/home/editCustomer', { state: { itemData: row } });
        }
        else if (leadsTable) {
            navigate('/home/editLead', { state: { itemData: row } });
        }
        else if (adminMemo) {
            navigate('/home/maintainMemo', { state: { itemData: row } });
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
        else {
            setSelectedRow(row);
            setShowDialog(true);
        }
    };

    const handleCloseDialog = () => {
        setShowDialog(false);
    };

    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(1);
    };

    const pageCount = Math.ceil(data.length / rowsPerPage);

    return (
        <>
            <StyledTableContainer component={Paper} roles={roles} categoryadd={categoryadd} editTicketType={editTicketType}>
                <Table sx={{ minWidth: 350 }} stickyHeader aria-label="customized table">
                    {/* <TableHead> */}
                    <CustomTableHeader roles={roles} categoryadd={categoryadd} editTicketType={editTicketType}>
                        <TableRow>
                            {columns.map((column) => (
                                <CustomTableCell key={column.id} align={column.align} invoiceTable={invoiceTable} invoiceTableUser={invoiceTableUser} shipmentDetails={shipmentDetails} >
                                    {column.label}
                                </CustomTableCell>
                            ))}
                        </TableRow>
                    </CustomTableHeader>
                    {/* </TableHead> */}
                    <TableBody>
                        {data.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((row) => (
                            <CustomTableRow key={row.id} onClick={() => handleRowClick(row)} customerTable={customerTable} adminCustomerTable={adminCustomerTable} leadsTable={leadsTable}>
                                {columns.map((column, index) => (
                                    <CustomTableCell key={column.id} align={column.align} isFirstColumn={index === 0} invoiceTable={invoiceTable} invoiceTableUser={invoiceTableUser} shipmentDetails={shipmentDetails} payoutdetailsList={payoutdetailsList} formTable={formTable} adminMemo={adminMemo} adminFormTable={adminFormTable} userApplication={userApplication} adminApplication={adminApplication} adminPolicyTable={adminPolicyTable} policyTable={policyTable} trainingTable={trainingTable} customerTable={customerTable} adminCustomerTable={adminCustomerTable} leadsTable={leadsTable} inventoryTable={inventoryTable} roles={roles} categoryadd={categoryadd} editTicketType={editTicketType} itemAndServicesTable={itemAndServicesTable} adminTrainingTable={adminTrainingTable}>
                                        {!formTable && !policyTable && column.id === 'memo' ? (
                                            <div>
                                                {row[column.id].split('\n').map((line, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            fontWeight: index === 0 ? 'bold' : 'normal',
                                                            color: index === 0 ? 'var(--sidebar-selected-bg)' : 'var(--dashboard-text-primary)',
                                                        }}
                                                    >
                                                        {line}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : column.id === 'subject' ? (
                                            <TruncatedText title={row[column.id]}>
                                                {truncateText(row[column.id], 30)}
                                            </TruncatedText>
                                        ) : column.id === 'status' ? (
                                            <StatusTableCell key={column.id} status={row[column.id]} />
                                        ) :
                                            column.id === 'edit' ? (
                                                <EditTableCell key={column.id} status={row[column.id]} adminFormTable={adminFormTable} leadsTable={leadsTable} roles={roles} categoryadd={categoryadd} editTicketType={editTicketType} itemAndServicesTable={itemAndServicesTable} userApplication={userApplication} adminApplication={adminApplication} adminTrainingTable={adminTrainingTable} inventoryTable={inventoryTable} adminPolicyTable={adminPolicyTable} onClick={() => handleRowClick(row)}
                                                />
                                            ) : column.id === 'delete' ? (
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (typeof onDeleteItem === 'function') onDeleteItem(row);
                                                    }}
                                                >
                                                    <DeleteOutlineIcon fontSize="small" sx={{ color: '#EF3826' }} />
                                                </IconButton>
                                            ) : column.id === 'date' || column.id === 'createdAt' || column.id === 'issueDate' || column.id === 'dueDate' ? (
                                                formatDate(row[column.id])
                                            ) : column.id === 'merchantIds' ? (
                                                Array.isArray(row[column.id]) && row[column.id].length > 0 ?
                                                    row[column.id].map(item => item.merchantId).join(', ') :
                                                    '-' // Handle null case
                                            ) : column.id === 'agent.id' ?
                                                row.agent.id
                                                : column.id === 'category.title' ?
                                                    row.category.title
                                                    : column.id === 'agent.username' ?
                                                        row.agent.username
                                                        : column.id === 'merchant.dbaName' ?
                                                            row.merchant.dbaName
                                                            : column.id === 'agent?.name' ?
                                                                row.agent?.name :
                                                                column.id === 'solution' || column.id === 'services' ? (
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
                                                                                                    'ACH Processing' : null
                                                                ) : (
                                                                    row[column.id]
                                                                )}
                                    </CustomTableCell>
                                ))}
                            </CustomTableRow>
                        ))}
                    </TableBody>
                    {shipmentDetails ? (
                        <>
                            <TableFooter>
                                <FooterRow2>
                                    <FooterCell2 colSpan={columns.length} style={{ border: '1px solid var(--dashboard-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <FooterLeftSection>
                                                <span style={{ color: 'var(--navbar-dropdown-hover)', fontWeight: 800, fontSize: 10 }}>
                                                </span>
                                            </FooterLeftSection>
                                            <FooterRightSection>
                                                <div className="flex justify-end">
                                                    <div className="">
                                                        <div className="flex justify-between mt-2  gap-x-6">
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10 }}>Subtotal</span>
                                                            <span className=" text-right" style={{ fontSize: 10 }}>${subtotal ? subtotal.toFixed(2) : '0.00'}</span>
                                                        </div >
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10 }}>Shipping Fee</span>
                                                            <span className=" text-right" style={{ fontSize: 10 }}>${deliveryFee ? deliveryFee.toFixed(2) : '0.00'}</span>
                                                        </div>
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10 }}>Taxes</span>
                                                            <span className=" text-right" style={{ fontSize: 10 }}>{isMerchantTaxExempt ? 'Exempt Reseller' : `$${taxes ? taxes.toFixed(2) : '0.00'}`}</span>
                                                        </div>
                                                        <div className="flex justify-between  gap-x-6" style={{ marginTop: 0 }}>
                                                            <span className="font-semibold  text-left" style={{ fontSize: 10 }}>Total</span>
                                                            <span className=" text-right" style={{ fontSize: 10 }}>${totalAmount ? totalAmount.toFixed(2) : '0.00'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </FooterRightSection>
                                        </div>
                                    </FooterCell2>
                                </FooterRow2>
                            </TableFooter>
                        </>
                    ) : null}
                </Table>
            </StyledTableContainer>

            <MemoPopup trigger={showDialog} onClose={handleCloseDialog} rowData={selectedRow} memoUserList={memoUserList} payoutdetailsList={payoutdetailsList} customerTable={customerTable} formTable={formTable} policyTable={policyTable} trainingTable={trainingTable} inventoryTable={inventoryTable} />
        </>
    )
};

export default SmallTable;
