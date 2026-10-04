import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import logo from '../../assets/logo4k.png';
import Loader from '../../Components/Loader';
import {
    fetchPublicCrmQuotationByToken,
    respondToPublicCrmQuotation,
} from '../SalesFormBuilder/formDefinitionApi';
import { DEFAULT_TENANT_ADDRESS, formatTenantAddress } from '../../Utils/helper';

const PRIMARY = '#1A73E8';
const PRIMARY_SOFT = '#E8F1FD';
const PAGE_BG = '#EEF1F6';
const TEXT_DARK = '#1F2937';
const TEXT_MUTED = '#6B7280';

const DEMO_TOKEN = 'demo';

const getDemoQuotationPayload = () => ({
    quotationNumber: 'QT-2026-1048',
    status: 'sent',
    preparedAt: '2026-07-05',
    validUntil: '2026-08-05',
    tokenExpiresAt: dayjs().add(7, 'day').toISOString(),
    company: {
        name: 'DOLPHIN Merchant Services',
        address: DEFAULT_TENANT_ADDRESS,
        phone: '888-696-1049 Ext. 101',
        email: 'support@godms.com',
        website: 'www.godms.com',
    },
    customer: {
        name: 'John Carter',
        company: 'Carter & Associates LLC',
        email: 'john.carter@carterassoc.com',
        phone: '+1 (415) 902-3847',
    },
    salesRep: {
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@derps.io',
        phone: '+1 (628) 555-0192',
    },
    lineItems: [
        {
            id: 1,
            description: 'Enterprise CRM Platform',
            quantity: 50,
            unitPrice: 1800,
            taxAmount: 1480,
            total: 87480,
        },
        {
            id: 2,
            description: 'Mobile App Package',
            quantity: 1,
            unitPrice: 15000,
            taxAmount: 390,
            total: 15390,
        },
        {
            id: 3,
            description: 'Implementation & Training',
            quantity: 1,
            unitPrice: 12000,
            taxAmount: 0,
            total: 12000,
        },
    ],
    subtotal: 117000,
    shippingFee: 0,
    taxTotal: 7620,
    total: 114870,
});

const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatDisplayDate = (value) => {
    if (!value) return '—';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('MMMM D, YYYY') : '—';
};

const pick = (...values) => values.find((value) => value != null && String(value).trim() !== '');

const joinName = (...parts) => parts.filter(Boolean).join(' ').trim();

const normalizeLineItems = (rawItems = []) => {
    const rows = Array.isArray(rawItems) ? rawItems : [];

    return rows.map((item, index) => {
        const quantity = Math.max(0, Number(item?.quantity ?? item?.qty) || 0);
        const unitPrice = Math.max(0, Number(item?.unitPrice ?? item?.price) || 0);
        const taxAmount = Math.max(0, Number(item?.taxAmount ?? item?.tax) || 0);
        const lineSubtotal = quantity * unitPrice;
        const total = Number.isFinite(Number(item?.total ?? item?.lineTotal))
            ? Number(item.total ?? item.lineTotal)
            : lineSubtotal + taxAmount;

        return {
            id: item?.id ?? `line-${index}`,
            name:
                pick(
                    item?.description,
                    item?.name,
                    item?.inventoryItem?.name,
                    item?.itemService?.name,
                    item?.productName
                ) || `Item ${index + 1}`,
            quantity,
            unitPrice,
            total,
        };
    });
};

const mapPublicQuotation = (payload = {}) => {
    const data = payload?.quotation ?? payload?.crmQuotation ?? payload;
    const company =
        data?.company
        ?? data?.organization
        ?? data?.tenant
        ?? data?.business
        ?? {};
    const customer =
        data?.customer
        ?? data?.client
        ?? data?.contact
        ?? data?.lead
        ?? data?.opportunity?.lead
        ?? {};
    const salesRep =
        data?.salesRepresentative
        ?? data?.salesRep
        ?? data?.agent
        ?? data?.owner
        ?? data?.createdBy
        ?? {};

    const lineItems = normalizeLineItems(
        data?.lineItems ?? data?.items ?? data?.products ?? []
    );

    const computedSubtotal = lineItems.reduce(
        (sum, line) => sum + line.quantity * line.unitPrice,
        0
    );
    const computedTotal = lineItems.reduce((sum, line) => sum + line.total, 0);

    const subtotal = Number(data?.subtotal ?? data?.subTotal);
    const shippingFee = Number(data?.shippingFee ?? data?.shipping ?? 0);
    const taxes = Number(data?.taxTotal ?? data?.taxes ?? data?.taxAmount);
    const total = Number(data?.total ?? data?.grandTotal ?? data?.totalAmount);

    const tokenExpiresAt =
        data?.tokenExpiresAt
        ?? data?.linkExpiresAt
        ?? data?.expiresAt
        ?? payload?.tokenExpiresAt
        ?? payload?.expiresAt
        ?? null;

    const validUntil = data?.validUntil ?? data?.valid_until ?? null;
    const status = String(data?.status || payload?.status || '').toLowerCase();
    const isExpiredFlag = Boolean(
        data?.isExpired
        ?? data?.expired
        ?? payload?.isExpired
        ?? payload?.expired
        ?? status === 'expired'
    );
    const tokenExpired =
        tokenExpiresAt && dayjs(tokenExpiresAt).isValid()
            ? dayjs().isAfter(dayjs(tokenExpiresAt))
            : false;
    const validUntilExpired =
        validUntil && dayjs(validUntil).isValid()
            ? dayjs().isAfter(dayjs(validUntil).endOf('day'))
            : false;

    const customerName = pick(
        joinName(customer?.firstName, customer?.lastName),
        customer?.fullName,
        customer?.name,
        data?.customerName,
        data?.contactName
    );

    const salesRepName = pick(
        joinName(salesRep?.firstName, salesRep?.lastName),
        salesRep?.fullName,
        salesRep?.name,
        data?.salesRepName,
        data?.agentName
    );

    return {
        quotationNumber:
            pick(
                data?.quotationNumber,
                data?.number,
                data?.quoteNumber,
                data?.code
            ) || '—',
        preparedAt: data?.preparedAt ?? data?.createdAt ?? data?.sentAt ?? null,
        validUntil,
        tokenExpiresAt,
        status,
        isExpired: isExpiredFlag || tokenExpired || validUntilExpired,
        company: {
            name: pick(company?.name, company?.companyName, company?.dbaName, 'DOLPHIN Merchant Services'),
            logo: pick(company?.logo, company?.logoUrl, company?.imageUrl),
            address:
                formatTenantAddress(company?.address) ||
                pick(typeof company?.address === 'string' ? company.address : '', company?.fullAddress, DEFAULT_TENANT_ADDRESS),
            phone: pick(company?.phone, company?.phoneNumber, company?.contactPhone, '888-696-1049 Ext. 101'),
            email: pick(company?.email, company?.supportEmail, company?.contactEmail, 'support@godms.com'),
            website: pick(company?.website, company?.webSite, company?.url, ''),
        },
        customer: {
            name: customerName || '—',
            company: pick(
                customer?.company,
                customer?.companyName,
                customer?.businessName,
                data?.customerCompany
            ),
            email: pick(customer?.email, data?.customerEmail),
            phone: pick(customer?.phone, customer?.phoneNumber, data?.customerPhone),
        },
        salesRep: {
            name: salesRepName || '—',
            email: pick(salesRep?.email, data?.salesRepEmail),
            phone: pick(salesRep?.phone, salesRep?.phoneNumber, data?.salesRepPhone),
        },
        lineItems,
        subtotal: Number.isFinite(subtotal) ? subtotal : computedSubtotal,
        shippingFee: Number.isFinite(shippingFee) ? shippingFee : 0,
        taxes: Number.isFinite(taxes) ? taxes : Math.max(0, computedTotal - computedSubtotal),
        total: Number.isFinite(total) ? total : computedTotal,
    };
};

const InfoRow = ({ label, value }) => (
    <div style={styles.infoRow}>
        <span style={styles.infoLabel}>{label}</span>
        <span style={styles.infoValue}>{value || '—'}</span>
    </div>
);

const RequestChangeModal = ({
    open,
    quotationNumber,
    total,
    validUntil,
    loading,
    onClose,
    onConfirm,
}) => {
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        setNotes('');
        setFiles([]);
        const timer = window.setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [open]);

    if (!open) return null;

    const handleFilePick = (event) => {
        const selected = Array.from(event.target.files || []);
        if (!selected.length) return;
        setFiles((prev) => [...prev, ...selected]);
        event.target.value = '';
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return createPortal(
        <div
            style={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onClose();
            }}
        >
            <div
                style={styles.requestModalCard}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div style={styles.requestModalHeader}>
                    <div style={styles.requestModalTitleRow}>
                        <div style={styles.requestIconBadge}>
                            <SyncRoundedIcon sx={{ fontSize: 22, color: '#FFFFFF' }} />
                        </div>
                        <div>
                            <div style={styles.requestModalTitle}>Request Change</div>
                            <div style={styles.requestModalSub}>{quotationNumber || '—'}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        style={styles.requestCloseBtn}
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close"
                    >
                        <CloseRoundedIcon sx={{ fontSize: 20 }} />
                    </button>
                </div>

                <div style={styles.requestSummaryBox}>
                    <div>
                        <div style={styles.requestSummaryLabel}>TOTAL</div>
                        <div style={styles.requestSummaryValue}>{formatMoney(total)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={styles.requestSummaryLabel}>VALID UNTIL</div>
                        <div style={styles.requestSummarySmall}>{formatDisplayDate(validUntil)}</div>
                    </div>
                </div>

                <label style={styles.requestFieldLabel}>
                    Describe The Changes You Need <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                    ref={textareaRef}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Tell Us What You Would Like To Change Pricing, Quantities, Scope, Delivery Timeline..."
                    rows={5}
                    disabled={loading}
                    style={styles.requestTextarea}
                />

                {/* <button
                    type="button"
                    style={styles.attachBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                >
                    <AttachFileRoundedIcon sx={{ fontSize: 16 }} />
                    Attach File
                </button> */}
                {/* <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFilePick}
                />

                {files.length > 0 && (
                    <div style={styles.fileList}>
                        {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} style={styles.fileChip}>
                                <DescriptionOutlinedIcon sx={{ fontSize: 18, color: PRIMARY }} />
                                <span style={styles.fileChipName}>{file.name}</span>
                                <button
                                    type="button"
                                    style={styles.fileRemoveBtn}
                                    onClick={() => removeFile(index)}
                                    disabled={loading}
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <CloseRoundedIcon sx={{ fontSize: 14 }} />
                                </button>
                            </div>
                        ))}
                    </div>
                )} */}

                <div style={styles.requestModalActions}>
                    <button
                        type="button"
                        style={styles.requestCancelBtn}
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        style={styles.requestSendBtn}
                        disabled={loading}
                        onClick={() => onConfirm({ notes, files })}
                    >
                        <SendRoundedIcon sx={{ fontSize: 16 }} />
                        {loading ? 'Sending...' : 'Send Request'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const RejectModal = ({ open, loading, onClose, onConfirm }) => {
    const [notes, setNotes] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        setNotes('');
        const timer = window.setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div
            style={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onClose();
            }}
        >
            <div
                style={styles.modalCard}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h3 style={styles.modalTitle}>Reject quotation</h3>
                <textarea
                    ref={textareaRef}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional: tell us why you are rejecting this quotation"
                    rows={4}
                    disabled={loading}
                    style={styles.modalTextarea}
                />
                <div style={styles.modalActions}>
                    <button
                        type="button"
                        style={styles.modalCancel}
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        style={{ ...styles.modalConfirm, background: '#DC2626' }}
                        onClick={() => onConfirm(notes)}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Reject Quotation'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ViewQuotation = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [expired, setExpired] = useState(false);
    const [quotation, setQuotation] = useState(null);
    const [modal, setModal] = useState(null);

    const loadQuotation = useCallback(async () => {
        if (!token) {
            setError('This quotation link is missing a secure token.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        setExpired(false);

        // Local UI preview — no backend token needed
        if (token === DEMO_TOKEN) {
            const mapped = mapPublicQuotation(getDemoQuotationPayload());
            setQuotation(mapped);
            setExpired(false);
            setLoading(false);
            return;
        }

        try {
            const result = await fetchPublicCrmQuotationByToken(token);
            const mapped = mapPublicQuotation(result);
            setQuotation(mapped);
            setExpired(mapped.isExpired);
        } catch (err) {
            const status = err?.status;
            const message = err?.message || 'Unable to load this quotation.';

            if (status === 410 || status === 404 || /expir/i.test(message)) {
                setExpired(true);
                setError(message || 'This quotation link has expired.');
            } else {
                setError(message);
            }
            setQuotation(null);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadQuotation();
    }, [loadQuotation]);

    const canRespond = useMemo(() => {
        if (!quotation || expired || submitting) return false;
        const locked = ['accepted', 'rejected', 'declined', 'cancelled', 'expired'];
        return !locked.includes(quotation.status);
    }, [quotation, expired, submitting]);

    const handleAction = async (action, { notes = '' } = {}) => {
        if (!token || !canRespond) return;

        const apiAction = action === 'request-changes' ? 'negotiate' : action;
        const trimmedNotes = String(notes || '').trim();

        if (apiAction === 'negotiate' && !trimmedNotes) {
            toast.error('Please describe the changes you need');
            return;
        }

        setSubmitting(true);
        try {
            if (token === DEMO_TOKEN) {
                toast.success(
                    apiAction === 'accept'
                        ? 'Quotation accepted successfully'
                        : apiAction === 'reject'
                            ? 'Quotation rejected'
                            : 'Change request sent successfully'
                );
                setModal(null);
                setQuotation((prev) => (
                    prev
                        ? {
                            ...prev,
                            status:
                                apiAction === 'accept'
                                    ? 'accepted'
                                    : apiAction === 'reject'
                                        ? 'rejected'
                                        : prev.status,
                        }
                        : prev
                ));
                return;
            }

            await respondToPublicCrmQuotation({
                shareToken: token,
                action: apiAction,
                notes: trimmedNotes,
            });

            const labels = {
                accept: 'Quotation accepted successfully',
                reject: 'Quotation rejected',
                negotiate: 'Change request sent successfully',
            };
            toast.success(labels[apiAction] || 'Response submitted');
            setModal(null);
            await loadQuotation();
        } catch (err) {
            const status = err?.status;
            const msg = err?.message || 'Failed to submit your response';

            if (status === 410 || /expir/i.test(msg)) {
                setExpired(true);
                setError(msg);
            }
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <Loader fullscreen message="Loading quotation..." subMessage="Please wait" />
            </div>
        );
    }

    if (expired && !quotation) {
        return (
            <div style={styles.page}>
                <div style={styles.brandBar}>
                    <img src={logo} alt="DERPS" style={styles.brandLogo} />
                </div>
                <div style={styles.stateCard}>
                    <h1 style={styles.stateTitle}>Link expired</h1>
                    <p style={styles.stateText}>
                        {error || 'This secure quotation link has expired. Please contact your sales representative for a new link.'}
                    </p>
                </div>
            </div>
        );
    }

    if (error && !quotation) {
        return (
            <div style={styles.page}>
                <div style={styles.brandBar}>
                    <img src={logo} alt="DERPS" style={styles.brandLogo} />
                </div>
                <div style={styles.stateCard}>
                    <h1 style={styles.stateTitle}>Unable to open quotation</h1>
                    <p style={styles.stateText}>{error}</p>
                </div>
            </div>
        );
    }

    const q = quotation;

    return (
        <div style={styles.page} className="view-quotation-page">
            <style>
                {`
                  @media (max-width: 820px) {
                    .view-quotation-page .vq-header-grid,
                    .view-quotation-page .vq-info-grid {
                      grid-template-columns: 1fr !important;
                    }
                    .view-quotation-page .vq-quote-meta {
                      align-items: flex-start !important;
                    }
                    .view-quotation-page .vq-total-bar {
                      flex-direction: column !important;
                      align-items: flex-start !important;
                    }
                    .view-quotation-page .vq-action-bar {
                      flex-direction: column !important;
                      align-items: stretch !important;
                    }
                    .view-quotation-page .vq-action-buttons {
                      justify-content: stretch !important;
                    }
                    .view-quotation-page .vq-action-buttons button {
                      flex: 1 1 auto;
                      justify-content: center;
                    }
                    .view-quotation-page .vq-table-header span:nth-child(3),
                    .view-quotation-page .vq-table-row span:nth-child(3) {
                      display: none;
                    }
                  }
                `}
            </style>

            <div style={styles.brandBar}>
                <img src={logo} alt="DERPS" style={styles.brandLogo} />
            </div>

            <div style={styles.card}>
                <h1 style={styles.pageTitle}>Quote Review</h1>

                {(expired || ['accepted', 'rejected', 'declined'].includes(q.status)) && (
                    <div
                        style={{
                            ...styles.statusBanner,
                            ...(expired
                                ? styles.statusBannerExpired
                                : q.status === 'accepted'
                                    ? styles.statusBannerAccepted
                                    : styles.statusBannerRejected),
                        }}
                    >
                        {expired
                            ? 'This quotation link has expired and can no longer be updated.'
                            : q.status === 'accepted'
                                ? 'This quotation has already been accepted.'
                                : 'This quotation has already been rejected.'}
                    </div>
                )}

                <div className="vq-header-grid" style={styles.headerGrid}>
                    <div style={styles.companyBlock}>
                        {q.company.logo ? (
                            <img
                                src={q.company.logo}
                                alt={q.company.name}
                                style={styles.companyLogo}
                            />
                        ) : (
                            <div style={styles.companyNameFallback}>{q.company.name}</div>
                        )}
                        <div style={styles.companyMeta}>
                            {q.company.address && <div>{q.company.address}</div>}
                            {q.company.phone && <div>{q.company.phone}</div>}
                            {q.company.email && <div>{q.company.email}</div>}
                            {q.company.website && <div>{q.company.website}</div>}
                        </div>
                    </div>

                    <div className="vq-quote-meta" style={styles.quoteMeta}>
                        <div style={styles.quoteBadge}>
                            <div style={styles.quoteBadgeLabel}>QUOTATION</div>
                            <div style={styles.quoteBadgeNumber}>{q.quotationNumber}</div>
                        </div>
                        <div style={styles.metaLine}>
                            <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: TEXT_MUTED }} />
                            <span>Prepared: {formatDisplayDate(q.preparedAt)}</span>
                        </div>
                        <div style={styles.metaLine}>
                            <AccessTimeOutlinedIcon sx={{ fontSize: 16, color: TEXT_MUTED }} />
                            <span>Valid until: {formatDisplayDate(q.validUntil)}</span>
                        </div>
                    </div>
                </div>

                <div className="vq-info-grid" style={styles.infoGrid}>
                    <div style={styles.infoBox}>
                        <div style={styles.infoBoxTitle}>Customer Information :</div>
                        <InfoRow label="Name :" value={q.customer.name} />
                        <InfoRow label="Company :" value={q.customer.company} />
                        <InfoRow label="Email :" value={q.customer.email} />
                        <InfoRow label="Phone Number :" value={q.customer.phone} />
                    </div>
                    <div style={styles.infoBox}>
                        <div style={styles.infoBoxTitle}>Sales Representative :</div>
                        <InfoRow label="Name :" value={q.salesRep.name} />
                        <InfoRow label="Email :" value={q.salesRep.email} />
                        <InfoRow label="Phone Number :" value={q.salesRep.phone} />
                    </div>
                </div>

                <div style={styles.tableWrap}>
                    <div className="vq-table-header" style={styles.tableHeader}>
                        <span style={{ ...styles.th, flex: 2.4, textAlign: 'left' }}>Items</span>
                        <span style={{ ...styles.th, flex: 0.7 }}>Qty</span>
                        <span style={{ ...styles.th, flex: 1 }}>Unit Price</span>
                        <span style={{ ...styles.th, flex: 1 }}>Total</span>
                    </div>
                    {q.lineItems.length === 0 ? (
                        <div style={styles.emptyRows}>No line items available.</div>
                    ) : (
                        q.lineItems.map((line) => (
                            <div key={line.id} className="vq-table-row" style={styles.tableRow}>
                                <span style={{ ...styles.td, flex: 2.4, textAlign: 'left', fontWeight: 500 }}>
                                    {line.name}
                                </span>
                                <span style={{ ...styles.td, flex: 0.7 }}>{line.quantity}</span>
                                <span style={{ ...styles.td, flex: 1 }}>{formatMoney(line.unitPrice)}</span>
                                <span style={{ ...styles.td, flex: 1 }}>{formatMoney(line.total)}</span>
                            </div>
                        ))
                    )}
                </div>

                <div style={styles.summaryBlock}>
                    <div style={styles.summaryRow}>
                        <span>Subtotal:</span>
                        <span>{formatMoney(q.subtotal)}</span>
                    </div>
                    <div style={styles.summaryRow}>
                        <span>Shipping Fee:</span>
                        <span>{formatMoney(q.shippingFee)}</span>
                    </div>
                    <div style={styles.summaryRow}>
                        <span>Taxes:</span>
                        <span>{formatMoney(q.taxes)}</span>
                    </div>
                </div>

                <div className="vq-total-bar" style={styles.totalBar}>
                    <span style={styles.thanks}>Thankyou For Your Business</span>
                    <span style={styles.totalText}>Total: {formatMoney(q.total)}</span>
                </div>
            </div>

            <div style={styles.footerSpacer} />

            <div className="vq-action-bar" style={styles.actionBar}>
                <div style={styles.actionMeta}>
                    <div>
                        Reviewing <strong>{q.quotationNumber}</strong>
                    </div>
                    <div style={styles.actionMetaSub}>
                        Your response is sent to {q.salesRep.name !== '—' ? q.salesRep.name : 'your sales representative'}.
                    </div>
                </div>

                <div className="vq-action-buttons" style={styles.actionButtons}>
                    <button
                        type="button"
                        style={{
                            ...styles.btnBase,
                            ...styles.btnReject,
                            ...(canRespond ? {} : styles.btnDisabled),
                        }}
                        disabled={!canRespond}
                        onClick={() => setModal('reject')}
                    >
                        <CloseRoundedIcon sx={{ fontSize: 18 }} />
                        Reject Quotation
                    </button>
                    <button
                        type="button"
                        style={{
                            ...styles.btnBase,
                            ...styles.btnRequest,
                            ...(canRespond ? {} : styles.btnDisabled),
                        }}
                        disabled={!canRespond}
                        onClick={() => setModal('request-changes')}
                    >
                        <SyncRoundedIcon sx={{ fontSize: 18 }} />
                        Request Changes
                    </button>
                    <button
                        type="button"
                        style={{
                            ...styles.btnBase,
                            ...styles.btnAccept,
                            ...(canRespond ? {} : styles.btnDisabled),
                        }}
                        disabled={!canRespond}
                        onClick={() => handleAction('accept')}
                    >
                        <CheckRoundedIcon sx={{ fontSize: 18 }} />
                        Accept Quotation
                    </button>
                </div>
            </div>

            <RejectModal
                open={modal === 'reject'}
                loading={submitting}
                onClose={() => setModal(null)}
                onConfirm={(notes) => handleAction('reject', { notes })}
            />
            <RequestChangeModal
                open={modal === 'request-changes'}
                quotationNumber={q.quotationNumber}
                total={q.total}
                validUntil={q.validUntil}
                loading={submitting}
                onClose={() => setModal(null)}
                onConfirm={({ notes }) => handleAction('request-changes', { notes })}
            />
        </div>
    );
};

const styles = {
    page: {
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        background: PAGE_BG,
        padding: '20px 16px 110px',
        fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: TEXT_DARK,
        boxSizing: 'border-box',
    },
    brandBar: {
        maxWidth: 980,
        margin: '0 auto 14px',
    },
    brandLogo: {
        height: 36,
        width: 'auto',
        objectFit: 'contain',
    },
    card: {
        maxWidth: 980,
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: 14,
        boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08)',
        padding: '28px 28px 0',
        overflow: 'hidden',
    },
    pageTitle: {
        textAlign: 'center',
        fontSize: 28,
        fontWeight: 700,
        margin: '0 0 24px',
        color: '#374151',
    },
    statusBanner: {
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 18,
        fontSize: 14,
        fontWeight: 500,
    },
    statusBannerExpired: {
        background: '#FEF3C7',
        color: '#92400E',
    },
    statusBannerAccepted: {
        background: '#DCFCE7',
        color: '#166534',
    },
    statusBannerRejected: {
        background: '#FEE2E2',
        color: '#991B1B',
    },
    headerGrid: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.9fr',
        gap: 24,
        marginBottom: 22,
    },
    companyBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    companyLogo: {
        maxWidth: 220,
        maxHeight: 64,
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        objectPosition: 'left center',
    },
    companyNameFallback: {
        fontSize: 18,
        fontWeight: 700,
        color: PRIMARY,
    },
    companyMeta: {
        fontSize: 13,
        lineHeight: 1.55,
        color: TEXT_MUTED,
    },
    quoteMeta: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
    },
    quoteBadge: {
        background: PRIMARY_SOFT,
        borderRadius: 12,
        padding: '12px 18px',
        minWidth: 220,
        textAlign: 'center',
    },
    quoteBadgeLabel: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.6,
        color: PRIMARY,
    },
    quoteBadgeNumber: {
        fontSize: 22,
        fontWeight: 800,
        color: PRIMARY,
        marginTop: 2,
    },
    metaLine: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        color: TEXT_MUTED,
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 22,
    },
    infoBox: {
        background: '#F5F7FA',
        borderRadius: 12,
        padding: '14px 16px',
    },
    infoBoxTitle: {
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 10,
        color: TEXT_DARK,
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 0',
        fontSize: 13,
    },
    infoLabel: {
        color: TEXT_MUTED,
        flexShrink: 0,
    },
    infoValue: {
        color: TEXT_DARK,
        textAlign: 'right',
        wordBreak: 'break-word',
    },
    tableWrap: {
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
    },
    tableHeader: {
        display: 'flex',
        alignItems: 'center',
        background: PRIMARY,
        color: '#FFFFFF',
        padding: '12px 16px',
        fontWeight: 700,
        fontSize: 14,
    },
    th: {
        textAlign: 'right',
    },
    tableRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: '1px solid #E5E7EB',
        fontSize: 14,
        color: TEXT_DARK,
    },
    td: {
        textAlign: 'right',
    },
    emptyRows: {
        padding: '18px 16px',
        color: TEXT_MUTED,
        fontSize: 14,
    },
    summaryBlock: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        padding: '18px 4px 16px',
        fontSize: 14,
        color: TEXT_DARK,
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        minWidth: 220,
        gap: 24,
    },
    totalBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        background: PRIMARY_SOFT,
        margin: '0 -28px',
        padding: '16px 28px',
    },
    thanks: {
        fontWeight: 700,
        fontSize: 15,
        color: '#374151',
    },
    totalText: {
        fontWeight: 800,
        fontSize: 22,
        color: TEXT_DARK,
    },
    footerSpacer: {
        height: 16,
    },
    actionBar: {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        zIndex: 40,
        boxShadow: '0 -4px 18px rgba(15, 23, 42, 0.06)',
    },
    actionMeta: {
        fontSize: 13,
        color: TEXT_MUTED,
    },
    actionMetaSub: {
        marginTop: 2,
        fontSize: 12,
    },
    actionButtons: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'flex-end',
    },
    btnBase: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'opacity 0.15s ease',
    },
    btnReject: {
        background: '#FEE2E2',
        color: '#DC2626',
        borderColor: '#FECACA',
    },
    btnRequest: {
        background: '#F3F4F6',
        color: '#374151',
        borderColor: '#E5E7EB',
    },
    btnAccept: {
        background: PRIMARY,
        color: '#FFFFFF',
        borderColor: PRIMARY,
    },
    btnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    stateCard: {
        maxWidth: 520,
        margin: '80px auto',
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '28px 24px',
        boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08)',
        textAlign: 'center',
    },
    stateTitle: {
        margin: '0 0 10px',
        fontSize: 24,
        color: TEXT_DARK,
    },
    stateText: {
        margin: 0,
        color: TEXT_MUTED,
        lineHeight: 1.5,
        fontSize: 14,
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10050,
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 440,
        background: '#FFFFFF',
        borderRadius: 14,
        padding: 20,
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.2)',
        position: 'relative',
        zIndex: 1,
    },
    modalTitle: {
        margin: '0 0 12px',
        fontSize: 18,
        color: TEXT_DARK,
    },
    modalTextarea: {
        width: '100%',
        borderRadius: 10,
        border: '1px solid #D1D5DB',
        padding: 12,
        fontSize: 14,
        resize: 'vertical',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        outline: 'none',
        color: TEXT_DARK,
        background: '#FFFFFF',
        pointerEvents: 'auto',
        WebkitUserSelect: 'text',
        userSelect: 'text',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 14,
    },
    modalCancel: {
        border: '1px solid #E5E7EB',
        background: '#F9FAFB',
        color: TEXT_DARK,
        borderRadius: 8,
        padding: '8px 14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    modalConfirm: {
        border: 'none',
        color: '#FFFFFF',
        borderRadius: 8,
        padding: '8px 14px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    requestModalCard: {
        width: '100%',
        maxWidth: 520,
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 22,
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.2)',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    requestModalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    requestModalTitleRow: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
    },
    requestIconBadge: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#F59E0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    requestModalTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: TEXT_DARK,
        lineHeight: 1.2,
    },
    requestModalSub: {
        marginTop: 2,
        fontSize: 13,
        color: TEXT_MUTED,
        fontWeight: 500,
    },
    requestCloseBtn: {
        border: 'none',
        background: 'transparent',
        color: TEXT_MUTED,
        cursor: 'pointer',
        padding: 4,
        display: 'inline-flex',
    },
    requestSummaryBox: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        background: '#F3F4F6',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 16,
    },
    requestSummaryLabel: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: TEXT_MUTED,
        marginBottom: 4,
    },
    requestSummaryValue: {
        fontSize: 22,
        fontWeight: 800,
        color: TEXT_DARK,
    },
    requestSummarySmall: {
        fontSize: 15,
        fontWeight: 700,
        color: TEXT_DARK,
    },
    requestFieldLabel: {
        display: 'block',
        fontSize: 13,
        fontWeight: 700,
        color: TEXT_DARK,
        marginBottom: 8,
    },
    requestTextarea: {
        width: '100%',
        borderRadius: 10,
        border: '1px solid #D1D5DB',
        padding: 12,
        fontSize: 14,
        resize: 'vertical',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        outline: 'none',
        minHeight: 110,
        marginBottom: 12,
        color: TEXT_DARK,
        background: '#FFFFFF',
        pointerEvents: 'auto',
        WebkitUserSelect: 'text',
        userSelect: 'text',
    },
    attachBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: '1px solid #D1D5DB',
        background: '#FFFFFF',
        color: TEXT_DARK,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        marginBottom: 10,
    },
    fileList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginBottom: 8,
    },
    fileChip: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#F8FAFC',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '8px 10px',
    },
    fileChipName: {
        flex: 1,
        fontSize: 13,
        color: TEXT_DARK,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    fileRemoveBtn: {
        border: 'none',
        background: 'transparent',
        color: TEXT_MUTED,
        cursor: 'pointer',
        display: 'inline-flex',
        padding: 2,
    },
    requestModalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
    },
    requestCancelBtn: {
        border: 'none',
        background: 'transparent',
        color: TEXT_MUTED,
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        padding: '8px 12px',
    },
    requestSendBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        background: PRIMARY,
        color: '#FFFFFF',
        borderRadius: 10,
        padding: '10px 16px',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
    },
};

export default ViewQuotation;
