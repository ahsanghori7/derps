import { useState } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import MenuItem from '@mui/material/MenuItem'
import TableInput from '../TableInput';
import DropdownMenu from '../dropdownMenu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// Styled components for table cells and rows
const CustomTableCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'isFirstColumn' && prop !== 'payoutdetailsList' && prop !== 'invoiceTable' && prop !== 'createInvoice' && prop !== 'invoiceTableUser' && prop !== 'adminCustomerTable' && prop !== 'formTable' && prop !== 'leadsTable' && prop !== 'vendorTable' && prop !== 'policyTable' && prop !== 'adminMemo' && prop !== 'trainingTable' && prop !== 'customerTable' && prop !== 'editTicketType' && prop !== 'adminFormTable' && prop !== 'inventoryTable' && prop !== 'adminApplication' && prop !== 'userApplication' && prop !== 'itemAndServicesTable' && prop !== 'adminTrainingTable' && prop !== 'adminPolicyTable' && prop !== 'roles' && prop !== 'categoryadd'
})(({ theme, isFirstColumn, invoiceTable, invoiceTableUser, payoutdetailsList, formTable, policyTable, trainingTable, customerTable, createInvoice, inventoryTable, adminMemo, itemAndServicesTable, leadsTable, vendorTable, UserLeadsList, adminTrainingTable, adminPolicyTable, adminFormTable, roles, adminApplication, userApplication, adminCustomerTable, categoryadd, editTicketType }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: 'var(--sidebar-selected-bg)',
        color: 'var(--sidebar-text-selected)',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        padding: '6px',
        border: 'none',
        textAlign: 'center',
        // fontSize: createInvoice ? 10 : 16,
        // flex: 1,

        // padding: '16px', // Add padding to header cells

        // borderRight: '1px solid rgba(224, 224, 224, 1)', // Add right border to header cells
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 12,
        fontWeight: 600,
        height: 47,
        // flex: 1,
        textAlign: 'center',
        borderRight: 'none', // Remove right border
        ...(isFirstColumn && {
            whiteSpace: 'nowrap',
        }),
        borderBottom: 'none', // Remove default bottom border
        '&:first-of-type': {
            // borderTopLeftRadius: '8px',
            // borderBottomLeftRadius: '8px',
        },
        '&:last-of-type': {
            // borderTopRightRadius: '8px',
            // borderBottomRightRadius: '8px',
        },
        '&:[3]': {
            textAlign: 'center',

        },
        color: 'var(--sidebar-text-primary)',

        padding: invoiceTable || invoiceTableUser ? '16px 10px' : formTable || policyTable || trainingTable || itemAndServicesTable ? 0 : adminPolicyTable ? '0 40px' : customerTable || adminFormTable || adminCustomerTable || leadsTable || vendorTable || UserLeadsList ? '10px 40px' : adminMemo ? '12px 70px' : inventoryTable ? '1px 4px' : adminTrainingTable || adminApplication || userApplication ? '10px 40px' : '0px 0px', // Add padding to cells for better spacing

    },
}));

const CustomTableRow = styled(TableRow)(({ theme, customerTable }) => ({
    '& td': {
        backgroundColor: 'var(--dashboard-tab-box)',
    },
    '&:not(:last-child)': {
        marginBottom: '12px', // Add margin between rows
    },
    boxShadow: '0 0 0 1px var(--dashboard-bg)',
    // borderRadius: '8px',
    cursor: 'pointer'
}));

const CustomTableHeader = styled(TableHead)(({ theme, roles, categoryadd, editTicketType }) => ({
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
    borderRadius: '14px', // Border radius for the entire table
    backgroundColor: 'var(--sidebar-divider)',
    '& thead': {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: theme.palette.background.paper,
    },
    ...(roles || categoryadd || editTicketType ? { maxWidth: 800, } : {})
}));

const FooterWrapper = styled(Box)(({ theme }) => ({
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--dashboard-bg)',
    borderTop: '1px solid var(--sidebar-divider)',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '0 0 14px 14px', // Rounded corners only at the bottom
}));
// Main reusable table component
const ItemTable = ({ data, columns, products, onSelectItem, onAddItem, PreviewPurchase, newCreateInvoicetable, editPurchase, createInvoice, invoiceTable, onRemoveItem, onDiscountItem, onToggleTaxExempt, totalAmount, restrictExistingEdits, allowExistingQuantityEdit, allowItemDelete = true, brandOptions, modelOptions }) => {
    const [selectedRow, setSelectedRow] = useState(null);
    const navigate = useNavigate();

    const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
    const [actionsRowIndex, setActionsRowIndex] = useState(null);
    const isActionsMenuOpen = Boolean(actionsAnchorEl);

    const openActionsMenu = (event, index) => {
        setActionsAnchorEl(event.currentTarget);
        setActionsRowIndex(index);
    };

    const closeActionsMenu = () => {
        setActionsAnchorEl(null);
        setActionsRowIndex(null);
    };

    const hasBarcodeColumn = Array.isArray(columns) && columns.some((c) => c?.id === 'barcode');
    const hasSerialNoColumn = Array.isArray(columns) && columns.some((c) => c?.id === 'serialNo');
    const normalizedColumns = (() => {
        if (!Array.isArray(columns)) return [];
        const shouldHaveBarcode = Boolean(invoiceTable || (PreviewPurchase && !invoiceTable));
        if (!shouldHaveBarcode || hasBarcodeColumn) return columns;
        const itemIndex = columns.findIndex((c) => c?.id === 'item' || c?.id === 'name');
        const insertAt = itemIndex >= 0 ? itemIndex + 1 : 1;
        const next = [...columns];
        next.splice(insertAt, 0, { id: 'barcode', label: 'BARCODE', align: 'center' });
        return next;
    })();

    const shouldShowInvoiceSerialNo = Boolean(invoiceTable) && (hasSerialNoColumn || normalizedColumns.some((c) => c?.id === 'serialNo'));

    return (
        <>
            <StyledTableContainer component={Paper} align="center">
                <Table sx={{ minWidth: 700 }} stickyHeader aria-label="customized table">
                    <CustomTableHeader createInvoice={createInvoice}>
                        <TableRow>
                            {normalizedColumns.map((column) => (
                                <CustomTableCell key={column.id} align={column.align}>
                                    {column.label}
                                </CustomTableCell>
                            ))}
                        </TableRow>
                    </CustomTableHeader>
                    <TableBody>
                        {products.map((product, index) => {
                            const selectedItem = invoiceTable
                                ? data.find(item => item.id === product.inventoryItemId)
                                : data.find(item => item.id === product.itemServiceId);
                            const isTaxExempt = !!product?.taxExempt || !!selectedItem?.taxExempt;
                            const isExistingRow = Number(product?.id) > 0;
                            const disableRowEdits = Boolean(restrictExistingEdits && isExistingRow);
                            const disableQuantity = Boolean(disableRowEdits && !allowExistingQuantityEdit);
                            const showPurchaseBrandModel =
                                Boolean(PreviewPurchase && !invoiceTable) &&
                                Array.isArray(brandOptions) &&
                                Array.isArray(modelOptions) &&
                                columns?.some((c) => c?.id === 'brand' || c?.id === 'model');

                            const showPurchaseBarcode = Boolean(PreviewPurchase && !invoiceTable);

                            const showInvoiceBarcode = Boolean(invoiceTable);

                            return (
                                <CustomTableRow key={index}>
                                    <CustomTableCell align="center">
                                        <div className='' style={{ display: 'flex', justifyContent: 'center' }}>
                                            <DropdownMenu
                                                customWidth={true}
                                                newCreateInvoicetable={createInvoice || newCreateInvoicetable || PreviewPurchase}
                                                backgroundColor={'var(--dashboard-bg)'}
                                                border={'1px solid var(--sidebar-selected-bg)'}
                                                menuItems={data.map(item => ({ id: item.id, name: item.name }))}
                                                defaultText="Select Item"
                                                searchable={true}
                                                onSelect={(value) => {
                                                    if (invoiceTable) {
                                                        onSelectItem(index, "inventoryItemId", value)
                                                    } else {
                                                        onSelectItem(index, "itemServiceId", value)
                                                    }
                                                }}
                                                selectedValue={(selectedItem?.name || product.name) ? (selectedItem?.name || product.name) : undefined}
                                                idSet={invoiceTable ? true : true}
                                                disabled={disableRowEdits}
                                            />
                                        </div>
                                    </CustomTableCell>

                                    {showInvoiceBarcode && (
                                        <CustomTableCell align="center">
                                            <TableInput
                                                quantityWidth={true}
                                                inputValue={product?.barcode || selectedItem?.barcode || ''}
                                                onInputChange={(e) => onSelectItem(index, 'barcode', e.target.value)}
                                                inputType={'text'}
                                                disabled={disableRowEdits}
                                            />
                                        </CustomTableCell>
                                    )}

                                    {shouldShowInvoiceSerialNo && (
                                        <CustomTableCell align="center">
                                            <div className='' style={{ gap: 8, flexWrap: 'wrap' }}>
                                                {Array.from({ length: Math.max(1, parseInt(product?.quantity, 10) || 1) }).map((_, serialIndex) => {
                                                    const selectedSerial = Array.isArray(product?.serialNos)
                                                        ? product.serialNos?.[serialIndex]
                                                        : undefined;

                                                    const alreadySelected = Array.isArray(product?.serialNos)
                                                        ? product.serialNos
                                                            .map((s) => String(s || '').trim())
                                                            .filter((s, i) => Boolean(s) && i !== serialIndex)
                                                        : [];

                                                    const serialMenuItems = (selectedItem?.serials || [])
                                                        .map((s) => ({
                                                            id: s?.serialNumber,
                                                            name: s?.serialNumber,
                                                        }))
                                                        .filter((opt) => {
                                                            const val = String(opt?.id || '').trim();
                                                            if (!val) return false;
                                                            if (selectedSerial && String(selectedSerial).trim() === val) return true;
                                                            return !alreadySelected.includes(val);
                                                        });

                                                    return (
                                                        <div className='mt-1 mb-1'>
                                                        <DropdownMenu
                                                            key={serialIndex}
                                                            customWidth={true}
                                                            newCreateInvoicetable={true}
                                                            backgroundColor={'var(--dashboard-bg)'}
                                                            border={'1px solid var(--sidebar-selected-bg)'}
                                                            menuItems={serialMenuItems}
                                                            defaultText={`Serial #${serialIndex + 1}`}
                                                            onSelect={(value) => onSelectItem(index, 'serialNos', { serialIndex, serialNo: value })}
                                                            selectedValue={selectedSerial || undefined}
                                                            disabled={disableRowEdits}
                                                        />
                                            </div>
                                                    );
                                                })}
                                            </div>
                                        </CustomTableCell>
                                    )}

                                    {showPurchaseBarcode && (
                                        <CustomTableCell align="center">
                                            <TableInput
                                                quantityWidth={true}
                                                inputValue={product?.barcode || ''}
                                                onInputChange={(e) => onSelectItem(index, 'barcode', e.target.value)}
                                                inputType={'text'}
                                                disabled={disableRowEdits}
                                            />
                                        </CustomTableCell>
                                    )}

                                    {showPurchaseBrandModel && (
                                        <CustomTableCell align="center">
                                            <div className='' style={{ display: 'flex', justifyContent: 'center' }}>
                                                <DropdownMenu
                                                    customWidth={true}
                                                    newCreateInvoicetable={createInvoice || newCreateInvoicetable || PreviewPurchase}
                                                    backgroundColor={'var(--dashboard-bg)'}
                                                    border={'1px solid var(--sidebar-selected-bg)'}
                                                    menuItems={brandOptions}
                                                    defaultText="Select Brand"
                                                    onSelect={(value) => onSelectItem(index, 'brand', value)}
                                                    selectedValue={product?.brand || undefined}
                                                    disabled={disableRowEdits}
                                                />
                                            </div>
                                        </CustomTableCell>
                                    )}

                                    {showPurchaseBrandModel && (
                                        <CustomTableCell align="center">
                                            <div className='' style={{ display: 'flex', justifyContent: 'center' }}>
                                                <DropdownMenu
                                                    customWidth={true}
                                                    newCreateInvoicetable={createInvoice || newCreateInvoicetable || PreviewPurchase}
                                                    backgroundColor={'var(--dashboard-bg)'}
                                                    border={'1px solid var(--sidebar-selected-bg)'}
                                                    menuItems={modelOptions}
                                                    defaultText="Select Model"
                                                    onSelect={(value) => onSelectItem(index, 'model', value)}
                                                    selectedValue={product?.model || undefined}
                                                    disabled={disableRowEdits}
                                                />
                                            </div>
                                        </CustomTableCell>
                                    )}
                                    {/* {!invoiceTable && (
                                        <CustomTableCell align="center">
                                            <TableInput
                                                // label="Description"
                                                inputValue={product.itemServiceId ? data.find(item => item.id === product.itemServiceId)?.description : ''} // Display description based on selected item
                                                inputType={'text'}
                                                disabled={true} // Disable the input
                                                customWidth={true}
                                            />
                                        </CustomTableCell>
                                    )} */}
                                    <CustomTableCell align="center">
                                        <TableInput
                                            quantityWidth={true}
                                            // label="Quantity"
                                            inputValue={product.quantity}
                                            onInputChange={(e) => {
                                                const raw = e.target.value;
                                                const parsed = parseInt(raw, 10);
                                                const safeQty = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
                                                onSelectItem(index, "quantity", safeQty);
                                            }}
                                            inputType={'number'}
                                            min={1} // Ensure quantity is greater than 0
                                            disabled={disableQuantity}
                                        />
                                    </CustomTableCell>
                                    {invoiceTable && (
                                        <CustomTableCell align="center">
                                            <TableInput
                                                quantityWidth={true}
                                                inputValue={product?.rate ?? ''}
                                                onInputChange={(e) => {
                                                    const raw = e.target.value;
                                                    const parsed = parseFloat(raw);
                                                    const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                                    onSelectItem(index, 'rate', safe);
                                                }}
                                                inputType={'number'}
                                                isDecimal={true}
                                                min={0}
                                                disabled={disableRowEdits}
                                            />
                                        </CustomTableCell>
                                    )}
                                    {!invoiceTable && (
                                        <CustomTableCell align="center">
                                            {/* {product.unitPrice}  */}
                                            <TableInput
                                                quantityWidth={true}
                                                inputValue={product?.unitPrice ?? ''}
                                                onInputChange={(e) => {
                                                    const raw = e.target.value;
                                                    const parsed = parseFloat(raw);
                                                    const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                                    onSelectItem(index, 'unitPrice', safe);
                                                }}
                                                inputType={'number'}
                                                isDecimal={true}
                                                min={0} // Ensure unitPrice is not negative
                                                disabled={disableRowEdits}
                                            />
                                        </CustomTableCell>
                                    )}
                                    <CustomTableCell align="center">
                                        {(() => {
                                            const qty = Math.max(1, Number(product?.quantity) || 1);
                                            const rate = Math.max(0, Number(product?.rate) || 0);
                                            const baseAmount = qty * rate;
                                            const hasDiscount =
                                                (product?.discountType === 'percent' || product?.discountType === 'amount') &&
                                                Number(product?.discount) > 0;
                                            const discountVal = Number(product?.discount) || 0;
                                            const discountedAmount =
                                                product?.discountType === 'percent'
                                                    ? baseAmount * (1 - discountVal / 100)
                                                    : product?.discountType === 'amount'
                                                        ? baseAmount - discountVal
                                                        : baseAmount;
                                            const safeDiscounted = Math.max(0, Number(discountedAmount.toFixed(2)));

                                            if (!hasDiscount) {
                                                return (
                                                    <TableInput
                                                        amountWidth={true}
                                                        inputValue={Number(product.amount).toFixed(2)}
                                                        inputType={'number'}
                                                        min={0}
                                                        showTaxExempt={!PreviewPurchase && !isTaxExempt && Number(product.amount) > 0}
                                                    />
                                                );
                                            }

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                    <span style={{ textDecoration: 'line-through', opacity: 0.7, fontSize: 11 }}>
                                                        {baseAmount.toFixed(2)}
                                                    </span>
                                                    <span style={{ fontWeight: 700, fontSize: 12 }}>
                                                        {safeDiscounted.toFixed(2)}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </CustomTableCell>
                                    <CustomTableCell align="center">
                                        {PreviewPurchase && !invoiceTable ? (
                                            allowItemDelete ? (
                                            <IconButton
                                                onClick={() => {
                                                    if (typeof onRemoveItem === 'function') onRemoveItem(index);
                                                }}
                                                size="small"
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                            ) : null
                                        ) : (
                                            <IconButton onClick={(e) => openActionsMenu(e, index)} size="small">
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </CustomTableCell>
                                </CustomTableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {!PreviewPurchase && (
                    <Menu
                        anchorEl={actionsAnchorEl}
                        open={isActionsMenuOpen}
                        onClose={closeActionsMenu}
                    >
                        <MenuItem
                            disabled={typeof onDiscountItem !== 'function'}
                            onClick={() => {
                                if (typeof onDiscountItem === 'function' && actionsRowIndex != null) {
                                    onDiscountItem(actionsRowIndex);
                                }
                                closeActionsMenu();
                            }}
                        >
                            Discount
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                if (typeof onToggleTaxExempt === 'function' && actionsRowIndex != null) {
                                    onToggleTaxExempt(actionsRowIndex);
                                }
                                closeActionsMenu();
                            }}
                        >
                            Tax Exempt
                        </MenuItem>
                        {allowItemDelete && (
                        <MenuItem
                            onClick={() => {
                                if (typeof onRemoveItem === 'function' && actionsRowIndex != null) {
                                    onRemoveItem(actionsRowIndex);
                                }
                                closeActionsMenu();
                            }}
                        >
                            Delete
                        </MenuItem>
                        )}
                    </Menu>
                )}

                <FooterWrapper>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{

                            fontSize: 12,
                            padding: '4px 16px'
                        }}
                        onClick={onAddItem} // Call the function to add a new item
                    >
                        Add Item
                    </Button>
                    {PreviewPurchase && (
                        <div style={{ fontWeight: 'bold' }}>Total Amount: ${Number(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div> 
                )}
                </FooterWrapper>
            </StyledTableContainer>

        </>
    )
};

export default ItemTable;
