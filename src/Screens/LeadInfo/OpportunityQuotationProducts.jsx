import { useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getRequestWithOutBody } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import {
    QUOTATION_TAX_RATE,
    sendCrmQuotationEmail,
    convertCrmQuotationToInvoice,
} from '../SalesFormBuilder/formDefinitionApi';
import Heading from '../../Components/Heading';
import BottonCustom from '../../Components/ButtonCustom';
import DropdownMenu from '../../Components/dropdownMenu';
import Loader from '../../Components/Loader';

export const createEmptyQuotationLine = () => ({
    id: crypto.randomUUID(),
    itemServiceId: null,
    quantity: 1,
    unitPrice: 0,
    description: '',
});

export const getDefaultQuotationProductsState = () => ({
    lines: [createEmptyQuotationLine()],
});

export const validateQuotationProductsLines = (lines = []) => {
    const errors = [];
    const normalizedLines = Array.isArray(lines) ? lines : [];

    if (normalizedLines.length === 0) {
        errors.push('Please add at least one product or service line');
        return errors;
    }

    normalizedLines.forEach((line, index) => {
        if (line?.itemServiceId == null || line.itemServiceId === '') {
            errors.push(`Line ${index + 1}: Product or service is required`);
        }

        const unitPrice = Number(line?.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            errors.push(`Line ${index + 1}: Unit price must be greater than 0`);
        }
    });

    return errors;
};

export const computeQuotationProductsSummary = (lines = []) => {
    const lineTotals = lines.map((line) => {
        const qty = Math.max(0, Number(line.quantity) || 0);
        const price = Math.max(0, Number(line.unitPrice) || 0);
        const subtotal = qty * price;
        const tax = subtotal * (QUOTATION_TAX_RATE / 100);
        return { subtotal, tax, total: subtotal + tax };
    });

    const subtotal = lineTotals.reduce((sum, line) => sum + line.subtotal, 0);
    const taxTotal = lineTotals.reduce((sum, line) => sum + line.tax, 0);
    const grandTotal = subtotal + taxTotal;

    return {
        lineTotals,
        subtotal,
        taxTotal,
        grandTotal,
    };
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
        Number.isFinite(value) ? value : 0
    );

const formatQuotationStatusLabel = (status) => {
    if (!status) return '';
    return String(status)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getQuotationStatusStyle = (status) => {
    const key = String(status || '').toLowerCase();

    if (['accepted', 'approved', 'completed'].includes(key)) {
        return { color: '#16A34A', backgroundColor: 'rgba(22, 163, 74, 0.12)' };
    }
    if (['sent', 'submitted', 'pending'].includes(key)) {
        return { color: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.12)' };
    }
    if (['draft'].includes(key)) {
        return { color: '#64748B', backgroundColor: 'rgba(100, 116, 139, 0.16)' };
    }
    if (['rejected', 'declined', 'cancelled', 'canceled'].includes(key)) {
        return { color: '#DC2626', backgroundColor: 'rgba(220, 38, 38, 0.12)' };
    }

    return { color: '#7C3AED', backgroundColor: 'rgba(124, 58, 237, 0.12)' };
};

const isLineUnitPriceInvalid = (line) => {
    const unitPrice = Number(line?.unitPrice);
    return !Number.isFinite(unitPrice) || unitPrice <= 0;
};

const isItemServiceUsedInOtherLines = (lines, itemId, currentIndex) =>
    lines.some(
        (line, index) =>
            index !== currentIndex &&
            line.itemServiceId != null &&
            line.itemServiceId !== '' &&
            String(line.itemServiceId) === String(itemId)
    );

const getAvailableItemServicesForLine = (allItems, lines, currentIndex, currentItemId) => {
    const usedInOtherLines = new Set(
        lines
            .filter((_, index) => index !== currentIndex)
            .map((line) => line.itemServiceId)
            .filter((id) => id != null && id !== '')
            .map(String)
    );

    return (allItems || []).filter((item) => {
        const itemId = String(item.id);
        return !usedInOtherLines.has(itemId) || String(currentItemId) === itemId;
    });
};

const ProductsCard = styled('div', {
    shouldForwardProp: (prop) => prop !== 'embedded',
})(({ embedded }) => ({
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: embedded ? 'transparent' : '#fff',
    boxShadow: embedded ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: embedded ? 0 : 24,
}));

const TableScrollWrapper = styled('div')({
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
});

const GRID_WITH_ACTION = '2fr 0.6fr 1fr 0.7fr 1fr 0.5fr';
const GRID_WITHOUT_ACTION = '2fr 0.6fr 1fr 0.7fr 1fr';

const TableHeader = styled('div')({
    display: 'grid',
    gridTemplateColumns: GRID_WITH_ACTION,
    minWidth: 580,
    gap: 8,
    padding: '10px 16px',
    backgroundColor: 'var(--sidebar-selected-bg)',
    color: 'var(--sidebar-text-selected)',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase',
});

const TableRow = styled('div')({
    display: 'grid',
    gridTemplateColumns: GRID_WITH_ACTION,
    minWidth: 580,
    gap: 8,
    padding: '10px 16px',
    alignItems: 'center',
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: 'var(--dashboard-tab-box)',
    '&:last-of-type': {
        borderBottom: 'none',
    },
});

const LineInput = styled('input')({
    width: '100%',
    height: 32,
    padding: '4px 8px',
    fontSize: 12,
    borderRadius: 4,
    border: '1px solid var(--sidebar-selected-bg)',
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--dashboard-text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
});

const OpportunityQuotationProducts = ({
    lines,
    onLinesChange,
    validUntil = '',
    onValidUntilChange,
    readOnly = false,
    embedded = false,
    showItemErrors = false,
    quotationId = null,
    quotationStatus = null,
    terminalOutcome = null,
    onStatusChange,
    onRefresh,
    onSave,
    isSaving = false,
    onEditingChange,
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const [itemServicesList, setItemServicesList] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isConvertingToInvoice, setIsConvertingToInvoice] = useState(false);
    const [confirmConvertInvoiceOpen, setConfirmConvertInvoiceOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const linesSnapshotRef = useRef(null);

    useEffect(() => {
        if (!accessToken) {
            setItemsLoading(false);
            return;
        }

        setItemsLoading(true);
        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then((result) => {
                setItemServicesList(Array.isArray(result?.data) ? result.data : []);
            })
            .catch(() => {
                setItemServicesList([]);
                toast.error('Failed to load products and services');
            })
            .finally(() => {
                setItemsLoading(false);
            });
    }, [accessToken]);

    useEffect(() => {
        setIsEditing(false);
        linesSnapshotRef.current = null;
    }, [quotationId]);

    useEffect(() => {
        onEditingChange?.(isEditing);
    }, [isEditing, onEditingChange]);

    const itemOptions = useMemo(
        () =>
            itemServicesList.map((item) => ({
                id: item.id,
                name: item.name || item.description || `Item #${item.id}`,
            })),
        [itemServicesList]
    );

    const { lineTotals, subtotal, taxTotal, grandTotal } = useMemo(
        () => computeQuotationProductsSummary(lines),
        [lines]
    );

    const updateLine = (index, field, value) => {
        if (
            field === 'itemServiceId' &&
            value != null &&
            value !== '' &&
            isItemServiceUsedInOtherLines(lines, value, index)
        ) {
            toast.error('This product or service is already added in another line');
            return;
        }

        onLinesChange(
            lines.map((line, i) => {
                if (i !== index) return line;

                if (field === 'itemServiceId') {
                    const selectedItem = itemServicesList.find(
                        (item) => String(item.id) === String(value)
                    );
                    return {
                        ...line,
                        itemServiceId: selectedItem?.id ?? value,
                        unitPrice: selectedItem?.sellingPrice ?? line.unitPrice,
                        quantity: line.quantity || 1,
                        description:
                            selectedItem?.name
                            || selectedItem?.description
                            || line.description
                            || '',
                    };
                }

                return { ...line, [field]: value };
            })
        );
    };

    const handleAddLine = () => {
        if (effectiveReadOnly) return;
        onLinesChange([...lines, createEmptyQuotationLine()]);
    };

    const handleRemoveLine = (index) => {
        if (effectiveReadOnly || lines.length <= 1) return;
        onLinesChange?.(lines.filter((_, i) => i !== index));
    };

    const handleSendEmail = async () => {
        if (!quotationId || !accessToken || isSendingEmail) return;

        setIsSendingEmail(true);
        try {
            const result = await sendCrmQuotationEmail(quotationId, accessToken, {
                link: '/home/crmQuotation/view',
            });
            const nextStatus =
                result?.data?.status
                ?? result?.status
                ?? 'sent';
            onStatusChange?.(nextStatus);
            await onRefresh?.();
            toast.success('Quotation email sent successfully');
        } catch (error) {
            toast.error(error?.message || 'Failed to send quotation email');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleConvertToInvoice = async () => {
        if (!quotationId || !accessToken || isConvertingToInvoice) return;

        setConfirmConvertInvoiceOpen(false);
        setIsConvertingToInvoice(true);
        try {
            const result = await convertCrmQuotationToInvoice(quotationId, accessToken);
            toast.success('Converted to invoice successfully');
            const invoiceId =
                result?.data?.id
                ?? result?.data?.invoiceId
                ?? result?.id
                ?? result?.invoiceId
                ?? null;
            const invoiceData = result?.data ?? result;

            if (invoiceId) {
                navigate('/home/editInvoice', {
                    state: { invoiceData: { ...invoiceData, id: invoiceId } },
                });
            }
        } catch (error) {
            toast.error(error?.message || 'Failed to convert to invoice');
        } finally {
            setIsConvertingToInvoice(false);
        }
    };

    const handleStartEdit = () => {
        linesSnapshotRef.current = {
            lines: JSON.parse(JSON.stringify(lines)),
            validUntil: validUntil || '',
        };
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (linesSnapshotRef.current) {
            onLinesChange(linesSnapshotRef.current.lines);
            onValidUntilChange?.(linesSnapshotRef.current.validUntil ?? '');
        }
        setIsEditing(false);
        linesSnapshotRef.current = null;
    };

    const handleSaveEdit = async () => {
        if (!onSave || isSaving) return;

        const saved = await onSave();
        if (saved) {
            setIsEditing(false);
            linesSnapshotRef.current = null;
        }
    };

    const isQuotationAccepted = ['accepted', 'approved'].includes(
        String(quotationStatus || '').toLowerCase()
    );
    const isOpportunityClosedWon =
        String(terminalOutcome || '').toLowerCase() === 'closed_won';
    const canEditQuotation = Boolean(quotationId) && !isQuotationAccepted;
    const effectiveReadOnly = isQuotationAccepted
        || (Boolean(quotationId) ? !isEditing : readOnly);
    const showDeleteActions = !effectiveReadOnly && lines.length > 1;
    const gridColumns = showDeleteActions ? GRID_WITH_ACTION : GRID_WITHOUT_ACTION;
    const showSendEmailButton =
        quotationId && !isQuotationAccepted && !isEditing;
    const showConvertToInvoiceButton =
        quotationId && isQuotationAccepted && isOpportunityClosedWon;
    const showConvertToInvoiceHint =
        quotationId && isQuotationAccepted && !isOpportunityClosedWon;
    const statusStyle = getQuotationStatusStyle(quotationStatus);

    return (
        <ProductsCard embedded={embedded}>
            <div
                className="flex flex-wrap items-center justify-between gap-3"
                style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0' }}
            >
                <div className="flex flex-wrap items-center gap-3">
                    <Heading
                        Fontweight={600}
                        color="var(--sidebar-text-primary)"
                        Heading="Products & Services"
                        Fontsize={16}
                    />
                    {quotationId && quotationStatus ? (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                ...statusStyle,
                            }}
                        >
                            {formatQuotationStatusLabel(quotationStatus)}
                        </span>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canEditQuotation && !isEditing ? (
                        <BottonCustom
                            backgroundColor="rgba(62, 62, 62, 0.12)"
                            width={90}
                            title="Edit"
                            height={36}
                            color="var(--sidebar-text-primary)"
                            fontSize={14}
                            fontWeight={500}
                            onClick={handleStartEdit}
                        />
                    ) : null}
                    {!effectiveReadOnly ? (
                        <BottonCustom
                            backgroundColor="rgba(67, 121, 238, 1)"
                            width={120}
                            title="+ Add Line"
                            height={36}
                            color="#fff"
                            fontSize={14}
                            fontWeight={500}
                            onClick={handleAddLine}
                        />
                    ) : null}
                    {isEditing ? (
                        <>
                            <BottonCustom
                                backgroundColor="rgba(62, 62, 62, 0.12)"
                                width={90}
                                title="Cancel"
                                height={36}
                                color="var(--sidebar-text-primary)"
                                fontSize={14}
                                fontWeight={500}
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                            />
                            <BottonCustom
                                backgroundColor="rgba(67, 121, 238, 1)"
                                width={90}
                                title={isSaving ? 'Saving...' : 'Save'}
                                height={36}
                                color="#fff"
                                fontSize={14}
                                fontWeight={500}
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                            />
                        </>
                    ) : null}
                </div>
            </div>

            <TableScrollWrapper>
                <TableHeader style={{ gridTemplateColumns: gridColumns }}>
                    <span>Product / Service</span>
                    <span>Qty</span>
                    <span>Unit Price</span>
                    <span>Tax %</span>
                    <span>Total</span>
                    {showDeleteActions ? (
                        <span style={{ textAlign: 'center' }}>Action</span>
                    ) : null}
                </TableHeader>

                {showItemErrors ? (
                    <div
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#FEF2F2',
                            color: '#B91C1C',
                            fontSize: 13,
                            fontWeight: 500,
                            borderBottom: '1px solid #FECACA',
                        }}
                    >
                        Each line requires a product or service and a unit price greater than 0.
                    </div>
                ) : null}

                {itemsLoading ? (
                    <div style={{ padding: '24px 16px' }}>
                        <Loader message="Loading products..." subMessage="Please wait" />
                    </div>
                ) : (
                    lines.map((line, index) => (
                        <TableRow key={line.id} style={{ gridTemplateColumns: gridColumns }}>
                            <div>
                                <DropdownMenu
                                    label="Product"
                                    menuItems={getAvailableItemServicesForLine(
                                        itemOptions,
                                        lines,
                                        index,
                                        line.itemServiceId
                                    )}
                                    defaultText="--select--"
                                    selectedValue={
                                        itemOptions.find(
                                            (item) => String(item.id) === String(line.itemServiceId)
                                        )?.name
                                    }
                                    onSelect={(id) => updateLine(index, 'itemServiceId', id)}
                                    addAgent
                                    idSet
                                    newCreateInvoicetable
                                    disabled={effectiveReadOnly}
                                    error={showItemErrors && !line.itemServiceId}
                                />
                                {showItemErrors && !line.itemServiceId ? (
                                    <span
                                        style={{
                                            display: 'block',
                                            marginTop: 4,
                                            fontSize: 11,
                                            color: '#EF4444',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Required
                                    </span>
                                ) : null}
                            </div>
                            <LineInput
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                                readOnly={effectiveReadOnly}
                                disabled={effectiveReadOnly}
                            />
                            <div>
                                <LineInput
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={line.unitPrice}
                                    onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                                    readOnly={effectiveReadOnly}
                                    disabled={effectiveReadOnly}
                                    style={
                                        showItemErrors && isLineUnitPriceInvalid(line)
                                            ? { borderColor: '#EF4444' }
                                            : undefined
                                    }
                                />
                                {showItemErrors && isLineUnitPriceInvalid(line) ? (
                                    <span
                                        style={{
                                            display: 'block',
                                            marginTop: 4,
                                            fontSize: 11,
                                            color: '#EF4444',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Must be greater than 0
                                    </span>
                                ) : null}
                            </div>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: 'var(--sidebar-text-primary)',
                                }}
                            >
                                {QUOTATION_TAX_RATE}%
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--sidebar-text-primary)',
                                }}
                            >
                                {formatCurrency(lineTotals[index]?.total || 0)}
                            </span>
                            {showDeleteActions ? (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLine(index)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 4,
                                        }}
                                        aria-label="Remove line"
                                    >
                                        <DeleteOutlineIcon style={{ color: '#EF4444', fontSize: 20 }} />
                                    </button>
                                </div>
                            ) : null}
                        </TableRow>
                    ))
                )}
            </TableScrollWrapper>

            <div
                style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid #E2E8F0',
                }}
            >
                <div style={{ minWidth: 220 }}>
                    <div
                        className="flex justify-between mb-2"
                        style={{ fontSize: 14, color: '#374151' }}
                    >
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div
                        className="flex justify-between mb-2"
                        style={{ fontSize: 14, color: '#374151' }}
                    >
                        <span>Tax ({QUOTATION_TAX_RATE}%)</span>
                        <span style={{ color: taxTotal > 0 ? '#16A34A' : 'inherit' }}>
                            {taxTotal > 0 ? `+${formatCurrency(taxTotal)}` : formatCurrency(0)}
                        </span>
                    </div>
                    <div
                        className="flex justify-between pt-2"
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--sidebar-text-primary)',
                            borderTop: '1px solid #E2E8F0',
                        }}
                    >
                        <span>Grand Total</span>
                        <span>{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>

            {(showSendEmailButton || showConvertToInvoiceButton || showConvertToInvoiceHint) ? (
                <div
                    style={{
                        padding: '0 20px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 12,
                    }}
                >
                    {showConvertToInvoiceHint ? (
                        <Typography
                            variant="body2"
                            sx={{ color: '#64748B', fontSize: 13, textAlign: 'right' }}
                        >
                            Quotation can be converted to invoice only when the linked opportunity is closed_won
                        </Typography>
                    ) : null}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 12,
                        }}
                    >
                        {showSendEmailButton ? (
                            <BottonCustom
                                backgroundColor="rgba(67, 121, 238, 1)"
                                width={140}
                                title={isSendingEmail ? 'Sending...' : 'Send Email'}
                                height={36}
                                color="#fff"
                                fontSize={14}
                                fontWeight={500}
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                            />
                        ) : null}
                        {showConvertToInvoiceButton ? (
                            <BottonCustom
                                backgroundColor="rgba(67, 121, 238, 1)"
                                width={170}
                                title={isConvertingToInvoice ? 'Converting...' : 'Convert to Invoice'}
                                height={36}
                                color="#fff"
                                fontSize={14}
                                fontWeight={500}
                                onClick={() => setConfirmConvertInvoiceOpen(true)}
                                disabled={isConvertingToInvoice}
                            />
                        ) : null}
                    </div>
                </div>
            ) : null}

            <Dialog
                open={confirmConvertInvoiceOpen}
                onClose={() => !isConvertingToInvoice && setConfirmConvertInvoiceOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 0.5, fontWeight: 600 }}>
                    Convert to Invoice
                </DialogTitle>
                <DialogContent sx={{ pt: 0.5, pb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#334155' }}>
                        Are you sure you want to convert this quotation to an invoice?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
                    <Button
                        onClick={() => setConfirmConvertInvoiceOpen(false)}
                        disabled={isConvertingToInvoice}
                        sx={{ textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConvertToInvoice}
                        disabled={isConvertingToInvoice}
                        sx={{ textTransform: 'none', backgroundColor: '#1976d2' }}
                    >
                        {isConvertingToInvoice ? 'Converting...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </ProductsCard>
    );
};

export default OpportunityQuotationProducts;
