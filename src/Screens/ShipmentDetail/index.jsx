import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { styled } from '@mui/material/styles';
import { toast } from 'react-toastify';
import Heading from '../../Components/Heading';
import BottonCustom from '../../Components/ButtonCustom';
import GoBack from '../../Components/GoBack';
import Loader from '../../Components/Loader';
import DeleteConfirmationModal from '../../Components/DeleteModal';
import { usePageTitle } from '../../Hooks/usePageTitle';
import {
    cancelShipment,
    getShipmentById,
    getShippingTenantId,
    trackShipment,
} from '../../Api/shippingApi';
import { getFedexErrorToast } from '../../Api/FedExApi';
import {
    formatDropoffLocationAddress,
    formatPackageDimensions,
    formatShipmentPartyAddress,
    formatShipmentStatus,
    formatShipmentTypeLabel,
    getLocationTypeLabel,
    getPackagingLabel,
    getServiceLabel,
    getSignatureOptionLabel,
    getShipmentLabelSrc,
    isPdfShipmentLabel,
    normalizeShipmentDetail,
    printShipmentLabel,
    downloadShipmentLabel,
} from '../../Utils/shippingConstants';
import { getDefaultShipperFromTenant } from '../../Utils/helper';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const PageWrapper = styled('div')({
    marginTop: -65,
    backgroundColor: 'var(--dashboard-bg)',
    padding: 10,
    minHeight: '100vh',
});

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10,
    zIndex: 2,
});

const StatusCard = styled('div')({
    backgroundColor: 'var(--dashboard-tab-box)',
    border: '1px solid var(--dashboard-box-border)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
});

const SummaryHighlight = styled('div')({
    border: '1px dashed var(--dashboard-box-border)',
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    color: 'var(--dashboard-text-primary)',
    marginBottom: 16,
});

const AlertBox = styled('div')({
    border: '1px solid #FCD34D',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFBEB',
    marginBottom: 16,
    fontSize: 13,
    color: '#92400E',
});

const AccordionSection = styled('div')({
    backgroundColor: 'var(--dashboard-tab-box)',
    borderBottom: '1px solid var(--dashboard-box-border)',
});

const AccordionHeader = styled('button')({
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--sidebar-text-primary)',
});

const AccordionBody = styled('div')({
    padding: '0 16px 16px',
    fontSize: 13,
    color: 'var(--dashboard-text-primary)',
    lineHeight: 1.6,
});

const DetailLine = ({ label, value }) => {
    if (value == null || value === '' || value === '-') return null;
    return (
        <div style={{ marginBottom: 6 }}>
            <strong>{label}:</strong> {value}
        </div>
    );
};

const formatDateLong = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

const formatPickupType = (value) => {
    if (!value) return 'Drop off at FedEx location';
    return String(value).replace(/_/g, ' ');
};

const Accordion = ({ title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <AccordionSection>
            <AccordionHeader type="button" onClick={() => setOpen(!open)}>
                <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading={title} Fontsize={15} />
                {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </AccordionHeader>
            {open && <AccordionBody>{children}</AccordionBody>}
        </AccordionSection>
    );
};

const ShipmentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userDetails = useSelector((state) => state.userData?.userDetails);
    const tenantId = getShippingTenantId(userDetails);

    const justCreated = location.state?.justCreated;
    usePageTitle(justCreated ? 'Shipment Finalized' : 'Shipment Detail', location);

    const [loading, setLoading] = useState(true);
    const [rawShipment, setRawShipment] = useState(location.state?.shipment || null);
    const [trackingInfo, setTrackingInfo] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!id || !accessToken) return;
        setLoading(true);
        getShipmentById(accessToken, tenantId, id)
            .then((result) => {
                setRawShipment(result?.data || result);
            })
            .catch((err) => {
                if (!location.state?.shipment) {
                    toast.error(err.message || 'Failed to load shipment');
                }
            })
            .finally(() => setLoading(false));
    }, [id, accessToken, tenantId]);

    const shipment = useMemo(
        () => normalizeShipmentDetail(rawShipment),
        [rawShipment],
    );

    const labelSrc = useMemo(() => getShipmentLabelSrc(shipment), [shipment]);
    const isPdfLabel = isPdfShipmentLabel(shipment);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

    useEffect(() => {
        if (!isPdfLabel || !shipment) {
            setPdfPreviewUrl(null);
            return undefined;
        }

        const encoded = shipment.encodedLabel || shipment.labelBase64;
        if (!encoded) {
            setPdfPreviewUrl(labelSrc);
            return undefined;
        }

        try {
            const binary = atob(String(encoded).replace(/^data:application\/pdf;base64,/, ''));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
            setPdfPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } catch {
            setPdfPreviewUrl(labelSrc);
            return undefined;
        }
    }, [isPdfLabel, shipment, labelSrc]);

    const handleTrack = async () => {
        if (!shipment?.trackingNumber) return;
        setActionLoading(true);
        try {
            const result = await trackShipment(accessToken, tenantId, shipment.trackingNumber);
            setTrackingInfo(result?.data || result);
            toast.success('Tracking updated');
        } catch (err) {
            toast.error(getFedexErrorToast(err, 'Failed to track shipment'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!shipment?.trackingNumber) return;
        setActionLoading(true);
        try {
            await cancelShipment(accessToken, tenantId, { trackingNumber: shipment.trackingNumber });
            toast.success('Shipment cancelled');
            setShowCancelModal(false);
            navigate('/home/shipping');
        } catch (err) {
            toast.error(getFedexErrorToast(err, 'Failed to cancel'));
        } finally {
            setActionLoading(false);
        }
    };

    const copyTracking = async () => {
        if (!shipment?.trackingNumber) return;
        try {
            await navigator.clipboard.writeText(shipment.trackingNumber);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Copy failed');
        }
    };

    const openLabel = async () => {
        if (!labelSrc) {
            toast.info('Label not available for this shipment');
            return;
        }

        const result = await printShipmentLabel(shipment);
        if (result.ok) return;

        if (result.reason === 'popup_blocked') {
            toast.error('Pop-up blocked. Please allow pop-ups to print the label.');
            return;
        }

        const downloaded = downloadShipmentLabel(shipment);
        if (downloaded) {
            toast.success('Could not open print dialog. Label downloaded instead.');
            return;
        }

        toast.error('Failed to print label');
    };

    const repeatShipment = () => {
        navigate('/home/createShipment', { state: { repeatFrom: shipment } });
    };

    if (loading && !shipment) {
        return (
            <PageWrapper>
                <Loader message="Loading shipment..." />
            </PageWrapper>
        );
    }

    if (!shipment) {
        return (
            <PageWrapper>
                <GoBack />
                <div className="mt-8 text-center" style={{ color: 'var(--Gray)' }}>Shipment not found</div>
            </PageWrapper>
        );
    }

    const statusLabel = formatShipmentStatus(shipment);
    const packages = Array.isArray(shipment.packages) ? shipment.packages : [];
    const firstPkg = packages[0];
    const recipientContact = shipment.recipient?.contact || {};
    const tenantShipper = getDefaultShipperFromTenant(userDetails);
    const shipperParty = shipment.shipper || tenantShipper;
    const shipperContact = shipperParty?.contact || {};
    const expectedDelivery = shipment.expectedDeliveryDate || trackingInfo?.expectedDeliveryDate;
    const deliveryTimeLabel = shipment.publishedDeliveryTime
        ? `${formatDateLong(expectedDelivery)} by ${shipment.publishedDeliveryTime}`
        : formatDateLong(expectedDelivery);

    return (
        <PageWrapper>
            <HeaderWrapper>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <GoBack />
                    <Heading
                        Fontweight={700}
                        color="var(--sidebar-text-primary)"
                        Heading={justCreated ? 'Shipment finalized' : 'Shipment detail'}
                        Fontsize={30}
                    />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <BottonCustom title="Print Label" height={40} width={120} backgroundColor="transparent" color="#0C79F7" border="1px solid #0C79F7" fontSize={13} onClick={openLabel} />
                    <BottonCustom title="Repeat" height={40} width={90} backgroundColor="transparent" color="#0C79F7" border="1px solid #0C79F7" fontSize={13} onClick={repeatShipment} />
                    {/* <BottonCustom title="Track" height={40} width={80} backgroundColor="transparent" color="#0C79F7" border="1px solid #0C79F7" fontSize={13} onClick={handleTrack} disabled={actionLoading} /> */}
                    {!shipment.cancelled && (
                        <BottonCustom title="Cancel" height={40} width={90} backgroundColor="#DC2626" color="#fff" fontSize={13} onClick={() => setShowCancelModal(true)} />
                    )}
                </div>
            </HeaderWrapper>

            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                {shipment.fedExAlerts?.length > 0 && (
                    <AlertBox>
                        <div className="flex items-center gap-2 mb-2">
                            <WarningAmberIcon sx={{ fontSize: 18 }} />
                            <strong>FedEx Alerts</strong>
                        </div>
                        {shipment.fedExAlerts.map((alert) => (
                            <div key={alert.code || alert.message} style={{ marginBottom: 4 }}>
                                {alert.message}
                            </div>
                        ))}
                    </AlertBox>
                )}

                <StatusCard>
                    <div className="flex items-center gap-2 mb-3">
                        <LocalShippingOutlinedIcon sx={{ color: '#0C79F7' }} />
                        <span style={{ fontSize: 14, color: 'var(--Gray)' }}>Shipment status</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>{statusLabel}</div>
                    <DetailLine label="Shipment type" value={formatShipmentTypeLabel(shipment)} />
                    <DetailLine label="Shipment ID" value={shipment.id} />
                    <div style={{ fontSize: 13, color: 'var(--Gray)', marginTop: 8 }}>Tracking ID</div>
                    <div className="flex items-center gap-2">
                        <span style={{ color: '#0C79F7', fontSize: 18, fontWeight: 600 }}>{shipment.trackingNumber || '-'}</span>
                        {shipment.trackingNumber && (
                            <button type="button" onClick={copyTracking} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <ContentCopyIcon sx={{ fontSize: 18, color: '#0C79F7' }} />
                            </button>
                        )}
                    </div>
                </StatusCard>

                <SummaryHighlight>
                    <div className="flex justify-between flex-wrap gap-4">
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--Gray)' }}>Expected delivery</div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{deliveryTimeLabel}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--Gray)' }}>Estimated total cost</div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>
                                ${Number(shipment.deliveryFee ?? 0).toFixed(2)} {shipment.currency || 'USD'}
                            </div>
                        </div>
                    </div>
                    {trackingInfo?.status && (
                        <div style={{ marginTop: 12, fontSize: 13 }}>
                            <strong>Latest tracking:</strong> {trackingInfo.status}
                        </div>
                    )}
                </SummaryHighlight>

                {labelSrc && (
                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                        {isPdfLabel ? (
                            <iframe
                                title="Shipping label preview"
                                src={pdfPreviewUrl || labelSrc}
                                style={{
                                    width: '100%',
                                    minHeight: 520,
                                    border: '1px solid var(--dashboard-box-border)',
                                    borderRadius: 8,
                                    background: '#fff',
                                }}
                            />
                        ) : (
                            <img
                                src={labelSrc}
                                alt="Shipping label preview"
                                style={{ maxWidth: '100%', border: '1px solid var(--dashboard-box-border)', borderRadius: 8 }}
                            />
                        )}
                    </div>
                )}

                <div style={{ border: '1px solid var(--dashboard-box-border)', borderRadius: 10, overflow: 'hidden' }}>
                    <Accordion title="Ship from">
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '0 0 8px' }}>
                            {formatShipmentPartyAddress(shipperParty)}
                        </pre>
                        <DetailLine label="Contact" value={shipperContact.personName} />
                        <DetailLine label="Phone" value={shipperContact.phoneNumber} />
                        <DetailLine label="Company" value={shipperContact.companyName || shipperContact.company} />
                    </Accordion>

                    <Accordion title="Deliver to" defaultOpen>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '0 0 8px' }}>
                            {formatShipmentPartyAddress(shipment.recipient)}
                        </pre>
                        <DetailLine label="Contact" value={shipment.contactName || recipientContact.personName} />
                        <DetailLine label="Phone" value={shipment.phoneNumber || recipientContact.phoneNumber} />
                        <DetailLine label="Email" value={shipment.email || recipientContact.email} />
                        <DetailLine
                            label="Address type"
                            value={shipment.recipient?.address?.residential ? 'Residential' : 'Commercial'}
                        />
                    </Accordion>

                    <Accordion title="Package details" defaultOpen>
                        <DetailLine label="Packaging" value={getPackagingLabel(shipment.packagingType)} />
                        <DetailLine label="Packages" value={packages.length || 1} />
                        {firstPkg?.weight && (
                            <DetailLine
                                label="Weight"
                                value={`${firstPkg.weight.value} ${(firstPkg.weight.units || 'LB').toLowerCase()}`}
                            />
                        )}
                        <DetailLine label="Dimensions" value={formatPackageDimensions(firstPkg)} />
                        <DetailLine label="One Rate" value={shipment.oneRate ? 'Yes' : 'No'} />
                    </Accordion>

                    <Accordion title="Service details" defaultOpen>
                        <DetailLine label="Ship date" value={formatDateLong(shipment.shipDate)} />
                        <DetailLine label="Service" value={shipment.serviceName || getServiceLabel(shipment.serviceType)} />
                        <DetailLine label="Service code" value={shipment.serviceType} />
                        <DetailLine label="Signature option" value={getSignatureOptionLabel(shipment.signatureOption)} />
                        <DetailLine label="Shipment reference" value={shipment.shipmentReference || shipment.reference} />
                        {shipment.specialInstructions && (
                            <DetailLine label="Special instructions" value={shipment.specialInstructions} />
                        )}
                    </Accordion>

                    <Accordion title="Pickup / drop-off">
                        <DetailLine label="Method" value={formatPickupType(shipment.pickupType)} />
                        {shipment.dropoffLocation && (
                            <>
                                <DetailLine
                                    label="Drop-off location"
                                    value={getLocationTypeLabel(shipment.dropoffLocation.locationType)}
                                />
                                <DetailLine
                                    label="Location address"
                                    value={formatDropoffLocationAddress(shipment.dropoffLocation)}
                                />
                                <DetailLine label="Location ID" value={shipment.dropoffLocation.locationId} />
                            </>
                        )}
                    </Accordion>

                    <Accordion title="Billing details">
                        <DetailLine
                            label="Transportation cost"
                            value={`$${Number(shipment.deliveryFee ?? 0).toFixed(2)} ${shipment.currency || 'USD'}`}
                        />
                    </Accordion>
                </div>

                <div className="mt-6">
                    <BottonCustom
                        title="View All Shipments"
                        height={44}
                        backgroundColor="#0C79F7"
                        color="#fff"
                        fontSize={15}
                        fontWeight={600}
                        onClick={() => navigate('/home/shipping')}
                    />
                </div>
            </div>

            <DeleteConfirmationModal
                open={showCancelModal}
                title="Cancel Shipment"
                subtitle="Are you sure you want to cancel shipment"
                entityName={shipment.trackingNumber}
                warningMessage="This will cancel the shipment with FedEx."
                onCancel={() => setShowCancelModal(false)}
                onDelete={handleCancel}
                isLoading={actionLoading}
            />
        </PageWrapper>
    );
};

export default ShipmentDetail;
