export const SERVICE_TYPES = [
    { value: 'FEDEX_2_DAY', label: 'FedEx 2Day', oneRate: true },
    { value: 'FEDEX_2_DAY_AM', label: 'FedEx 2Day A.M.', oneRate: true },
    { value: 'FEDEX_EXPRESS_SAVER', label: 'FedEx Express Saver', oneRate: true },
    { value: 'STANDARD_OVERNIGHT', label: 'FedEx Standard Overnight', oneRate: true },
    { value: 'PRIORITY_OVERNIGHT', label: 'FedEx Priority Overnight', oneRate: true },
    { value: 'FIRST_OVERNIGHT', label: 'FedEx First Overnight', oneRate: true },
    { value: 'FEDEX_GROUND', label: 'FedEx Ground', oneRate: false },
    { value: 'FEDEX_INTERNATIONAL_PRIORITY', label: 'FedEx International Priority', oneRate: false },
    { value: 'FEDEX_INTERNATIONAL_ECONOMY', label: 'FedEx International Economy', oneRate: false },
];

/** Service types shown on Create Shipment package details */
export const CREATE_SHIPMENT_SERVICE_TYPES = SERVICE_TYPES.filter((s) => [
    'FEDEX_2_DAY',
    'FEDEX_2_DAY_AM',
    'FEDEX_EXPRESS_SAVER',
    'STANDARD_OVERNIGHT',
    'PRIORITY_OVERNIGHT',
    'FIRST_OVERNIGHT',
    'FEDEX_GROUND',
].includes(s.value));

export const PACKAGING_TYPES = [
    { value: 'YOUR_PACKAGING', label: 'Your Packaging', needsDimensions: true, oneRate: false },
    { value: 'FEDEX_ENVELOPE', label: 'FedEx Envelope', needsDimensions: false, oneRate: true },
    { value: 'FEDEX_PAK', label: 'FedEx Pak', needsDimensions: false, oneRate: true },
    { value: 'FEDEX_BOX', label: 'FedEx Box', needsDimensions: false, oneRate: true },
    { value: 'FEDEX_SMALL_BOX', label: 'FedEx Small Box', needsDimensions: false, oneRate: true },
    { value: 'FEDEX_MEDIUM_BOX', label: 'FedEx Medium Box', needsDimensions: false, oneRate: true },
    { value: 'FEDEX_LARGE_BOX', label: 'FedEx Large Box', needsDimensions: false, oneRate: true },
    { value: 'FEDEX_EXTRA_LARGE_BOX', label: 'FedEx Extra Large Box', needsDimensions: false, oneRate: true },
    { value: 'FEDEX_TUBE', label: 'FedEx Tube', needsDimensions: false, oneRate: true },
];

export const PICKUP_TYPES = [
    { value: 'USE_SCHEDULED_PICKUP', label: 'I have already scheduled a pickup at my location' },
    { value: 'DROPOFF_AT_FEDEX_LOCATION', label: "I'll drop off my shipment at a FedEx location" },
];

export const DROPOFF_LOCATION_PREFS = [
    { value: 'NEAREST', label: 'Nearest' },
    { value: 'LATEST_OPENING_HOURS', label: 'Latest opening hours' },
];

export const PICKUP_INSTRUCTION_OPTIONS = [
    { value: '', label: 'No instructions' },
    { value: 'CALL_UPON_ARRIVAL', label: 'Call upon arrival' },
    { value: 'KNOCK_ON_DOOR', label: 'Knock on door / ring bell' },
    { value: 'SEE_RECEPTION', label: 'See receptionist / front desk' },
    { value: 'OTHER', label: 'Other (specify in notes)' },
];

/** Half-hour slots from 8:00 AM – 6:00 PM for FedEx-style pickup windows */
export const PICKUP_TIME_OPTIONS = (() => {
    const options = [];
    for (let hour = 8; hour <= 18; hour += 1) {
        for (const minute of [0, 30]) {
            if (hour === 18 && minute === 30) break;
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const label = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
            options.push({ value, label });
        }
    }
    return options;
})();

export const SHIPMENT_TYPES = [
    { value: 'Outbound', label: 'Outbound' },
    { value: 'Return', label: 'Return' },
];

export const DEFAULT_SHIPMENT_TYPE = 'Outbound';

/**
 * Per FedEx API doc flow:
 * POST /rates → get shipmentDraft
 * POST /shipments → same draft + serviceType (+ oneRate if used)
 */
export const buildCreateShipmentPayload = ({
    shipmentDraft,
    formPayload,
    serviceType,
    shipmentType = DEFAULT_SHIPMENT_TYPE,
}) => {
    const resolvedServiceType = serviceType || shipmentDraft?.serviceType;
    if (!resolvedServiceType) {
        throw new Error('Service type is required. Please calculate rates and select a service.');
    }

    return {
        ...(shipmentDraft && typeof shipmentDraft === 'object' ? shipmentDraft : {}),
        ...formPayload,
        serviceType: resolvedServiceType,
        type: shipmentType,
        shipmentType,
    };
};

export const SIGNATURE_OPTIONS = [
    { value: 'SERVICE_DEFAULT', label: 'Service default' },
    { value: 'NO_SIGNATURE_REQUIRED', label: 'No signature required' },
    { value: 'INDIRECT', label: 'Indirect signature' },
    { value: 'DIRECT', label: 'Direct signature' },
    { value: 'ADULT', label: 'Adult signature' },
];

export const getSignatureOptionLabel = (value) =>
    SIGNATURE_OPTIONS.find((opt) => opt.value === value)?.label
    || (value ? String(value).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '');

export const LOCATION_TYPE_LABELS = {
    FEDEX_SELF_SERVICE_LOCATION: 'FedEx Drop Box',
    FEDEX_ONSITE: 'FedEx OnSite',
    FEDEX_SHIPSITE: 'FedEx Ship Site',
    FEDEX_OFFICE: 'FedEx Office',
    FEDEX_SHIP_CENTER: 'FedEx Ship Center',
    FEDEX_AUTHORIZED_SHIP_CENTER: 'FedEx Authorized ShipCenter',
    FEDEX_STAFFED: 'FedEx Staffed Location',
};

export const getLocationTypeLabel = (locationType) =>
    LOCATION_TYPE_LABELS[locationType]
    || (locationType ? locationType.replace(/^FEDEX_/, 'FedEx ').replace(/_/g, ' ').toLowerCase() : '');

export const formatDropoffLocationAddress = (dropoffLocation) => {
    const address = dropoffLocation?.address;
    if (!address) return '';
    const street = Array.isArray(address.streetLines)
        ? address.streetLines.filter(Boolean).join(', ')
        : address.street || '';
    return [
        street,
        address.city,
        [address.stateOrProvinceCode || address.state, address.postalCode].filter(Boolean).join(' '),
        address.countryCode || 'US',
    ].filter(Boolean).join(', ');
};

export const WEIGHT_UNITS = [
    { value: 'LB', label: 'lb' },
    { value: 'KG', label: 'kg' },
];

export const DIMENSION_UNITS = [
    { value: 'IN', label: 'in' },
    { value: 'CM', label: 'cm' },
];

export const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
    'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
    'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

export const getServiceLabel = (value) =>
    SERVICE_TYPES.find((s) => s.value === value)?.label || value?.replace(/_/g, ' ') || '-';

export const getPackagingLabel = (value) =>
    PACKAGING_TYPES.find((p) => p.value === value)?.label || value?.replace(/_/g, ' ') || '-';

export const packagingNeedsDimensions = (packagingType) =>
    PACKAGING_TYPES.find((p) => p.value === packagingType)?.needsDimensions ?? true;

export const isOneRatePackaging = (packagingType) =>
    PACKAGING_TYPES.find((p) => p.value === packagingType)?.oneRate ?? false;

export const createEmptyAddress = () => ({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: 'US',
    residential: false,
});

export const createEmptyContact = () => ({
    personName: '',
    phoneNumber: '',
    email: '',
    company: '',
});

export const createEmptyPackage = () => ({
    weight: { units: 'LB', value: '' },
    dimensions: { units: 'IN', length: '', width: '', height: '' },
    groupPackageCount: 1,
});

/** @deprecated Prefer getDefaultShipperFromTenant(userDetails) from helper.jsx */
export const DEFAULT_SHIPPER = {
    contact: {
        personName: 'Dolphin Merchant Services',
        company: 'Dolphin Merchant Services',
        phoneNumber: '8886961049',
        email: '',
    },
    address: {
        street: '850 Lee Street',
        city: 'Elk Grove Village',
        state: 'IL',
        postalCode: '60007',
        countryCode: 'US',
        residential: false,
    },
};

export const getMerchantDisplayName = (merchant) =>
    merchant?.merchantName
    || merchant?.dbaName
    || merchant?.legalBusinessName
    || merchant?.companyName
    || merchant?.name
    || 'Unknown Merchant';

export const mapMerchantToRecipient = (merchant) => {
    const personName = [merchant?.firstName, merchant?.lastName].filter(Boolean).join(' ')
        || [merchant?.ownerFirstName, merchant?.ownerLastName].filter(Boolean).join(' ')
        || merchant?.contactName
        || getMerchantDisplayName(merchant);

    return {
        contact: {
            personName,
            company: merchant?.dbaName || merchant?.legalBusinessName || merchant?.merchantName || merchant?.companyName || '',
            phoneNumber: merchant?.phoneNumber || merchant?.dbaPhoneNumber || merchant?.ownerPhoneNumber || '',
            email: merchant?.email || merchant?.ownerEmail || '',
        },
        address: {
            street: merchant?.dbaAddress || merchant?.address || merchant?.legalAddress || '',
            city: merchant?.businessCity || merchant?.dbaCity || merchant?.city || '',
            state: merchant?.businessState || merchant?.dbaState || merchant?.state || '',
            postalCode: merchant?.businessZipCode || merchant?.zipCode || merchant?.dbaZipCode || '',
            countryCode: merchant?.countryCode || 'US',
            residential: Boolean(merchant?.residential),
        },
    };
};

export const parseShipmentListResponse = (response) => {
    const payload = response?.data;

    if (Array.isArray(payload?.results)) {
        return {
            list: payload.results,
            totalCount: Number(payload.totalRecords ?? payload.results.length),
        };
    }

    if (Array.isArray(payload?.data)) {
        return {
            list: payload.data,
            totalCount: Number(payload.totalItems ?? payload.totalRecords ?? payload.data.length),
        };
    }

    if (Array.isArray(payload)) {
        return {
            list: payload,
            totalCount: Number(response?.totalItems ?? payload.length),
        };
    }

    if (Array.isArray(response?.data)) {
        return {
            list: response.data,
            totalCount: Number(response?.totalItems ?? response.data.length),
        };
    }

    return { list: [], totalCount: 0 };
};

export const getShipmentStreet = (address) => {
    if (!address) return '';
    if (address.street) return address.street;
    if (Array.isArray(address.streetLines)) {
        return address.streetLines.filter(Boolean).join(', ');
    }
    return '';
};

export const getShipmentState = (address) =>
    address?.state || address?.stateOrProvinceCode || '';

export const normalizeContactForForm = (contact = {}) => ({
    ...createEmptyContact(),
    personName: contact.personName || contact.contactName || '',
    phoneNumber: contact.phoneNumber || contact.phone || '',
    email: contact.email || '',
    company: contact.company || contact.companyName || '',
});

export const normalizeAddressForForm = (address = {}) => ({
    ...createEmptyAddress(),
    street: getShipmentStreet(address),
    city: address.city || '',
    state: getShipmentState(address),
    postalCode: address.postalCode || '',
    countryCode: address.countryCode || 'US',
    residential: Boolean(address.residential),
});

export const normalizePackageForForm = (pkg = {}) => ({
    ...createEmptyPackage(),
    weight: {
        units: pkg.weight?.units || 'LB',
        value: pkg.weight?.value != null && pkg.weight?.value !== ''
            ? String(pkg.weight.value)
            : '',
    },
    dimensions: {
        units: pkg.dimensions?.units || 'IN',
        length: pkg.dimensions?.length != null && pkg.dimensions?.length !== ''
            ? String(pkg.dimensions.length)
            : '',
        width: pkg.dimensions?.width != null && pkg.dimensions?.width !== ''
            ? String(pkg.dimensions.width)
            : '',
        height: pkg.dimensions?.height != null && pkg.dimensions?.height !== ''
            ? String(pkg.dimensions.height)
            : '',
    },
    groupPackageCount: pkg.groupPackageCount || 1,
});

export const isDraftShipment = (row) => row?.isShipped === false;

export const mapShipmentToRepeatForm = (shipment) => {
    const s = normalizeShipmentDetail(shipment) || shipment || {};
    const details = s.shippingDetails || {};
    const hasShipper = Boolean(s.shipper || details.shipper);
    const shipper = s.shipper || details.shipper || DEFAULT_SHIPPER;
    const recipient = s.recipient || details.recipient || null;
    const recipientContact = recipient?.contact || {};
    const merchantName = recipientContact.company
        || recipientContact.companyName
        || recipientContact.personName
        || s.contactName
        || '';

    return {
        shipperContact: normalizeContactForForm(shipper.contact),
        shipperAddress: normalizeAddressForForm(shipper.address),
        recipientContact: normalizeContactForForm(recipientContact),
        recipientAddress: normalizeAddressForForm(recipient?.address),
        packagingType: s.packagingType || 'YOUR_PACKAGING',
        oneRate: Boolean(s.oneRate),
        pickupType: s.pickupType || 'DROPOFF_AT_FEDEX_LOCATION',
        dropoffLocation: s.dropoffLocation || null,
        reference: s.shipmentReference || s.reference || '',
        shipmentType: s.type || s.shipmentType || DEFAULT_SHIPMENT_TYPE,
        serviceType: s.serviceType || details.serviceType || '',
        signatureOption: s.signatureOption
            || s.packageSpecialServices?.signatureOptionType
            || 'NO_SIGNATURE_REQUIRED',
        packages: Array.isArray(s.packages) && s.packages.length
            ? s.packages.map(normalizePackageForForm)
            : [createEmptyPackage()],
        merchantSearchQuery: merchantName,
        hasShipper,
        hasRecipient: Boolean(recipient),
    };
};

export const mapDraftShipmentToForm = (shipment) => {
    const form = mapShipmentToRepeatForm(shipment);
    const app = shipment?.application || {};
    const company = app.businessName || app.legalName || form.recipientContact.company || '';
    const personName = form.recipientContact.personName
        || shipment?.contactName
        || app.legalName
        || '';

    if (!form.hasRecipient) {
        form.recipientContact = {
            ...createEmptyContact(),
            personName,
            company,
            phoneNumber: shipment?.phoneNumber || app.contactNumber || '',
            email: shipment?.email || app.email || '',
        };
        form.recipientAddress = createEmptyAddress();
        form.merchantSearchQuery = company || personName;
    }

    return {
        ...form,
        applicationId: shipment?.applicationId || app.id || null,
        shipmentId: shipment?.id || null,
    };
};

export const formatShipmentPartyAddress = (party) => {
    if (!party) return '-';
    const address = party.address || {};
    const street = getShipmentStreet(address);
    const state = getShipmentState(address);
    const name = party.contact?.companyName || party.contact?.company || party.contact?.personName || '';
    return [
        name,
        street,
        [address.city, state, address.postalCode].filter(Boolean).join(', '),
        address.countryCode || 'US',
    ].filter(Boolean).join('\n');
};

export const getRecipientLabelFromShipment = (row) => {
    const recipient = row?.recipient || row?.shippingDetails?.recipient;
    const name = row?.contactName
        || recipient?.contact?.personName
        || recipient?.contact?.companyName
        || row?.recipientName
        || '';
    const company = recipient?.contact?.companyName || recipient?.contact?.company || '';
    const city = recipient?.address?.city || row?.recipientCity || '';
    const displayName = company || name;
    const parts = [displayName, city].filter(Boolean);
    return parts.join(', ') || name || '-';
};

export const formatShipmentStatus = (row) => {
    if (row?.cancelled) return 'Cancelled';
    if (row?.status) return String(row.status).replace(/_/g, ' ');
    if (row?.isShipped === true) return 'Shipment created & printed';
    if (row?.isShipped === false) return 'Draft';
    return '-';
};

export const formatShipmentTypeLabel = (row) => {
    const type = row?.type || row?.shipmentType;
    if (!type) return row?.oneRate ? 'One Rate' : 'Outbound';
    const normalized = String(type);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const LABEL_MIME_BY_TYPE = {
    PDF: 'application/pdf',
    PNG: 'image/png',
    GIF: 'image/gif',
    ZPLII: 'application/zpl',
};

export const getShipmentLabelContentType = (raw) => {
    if (!raw || typeof raw !== 'object') return 'PNG';
    const details = raw.shippingDetails || {};
    const contentType = raw.labelContentType
        || details.labelContentType
        || raw.fedExResponse?.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.docType
        || null;
    return String(contentType || 'PNG').toUpperCase();
};

export const isPdfShipmentLabel = (shipment) => getShipmentLabelContentType(shipment) === 'PDF';

export const extractEncodedLabel = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.encodedLabel) return raw.encodedLabel;
    if (raw.labelBase64) return raw.labelBase64;

    const details = raw.shippingDetails || {};
    if (details.labelBase64) return details.labelBase64;
    if (details.encodedLabel) return details.encodedLabel;

    const shipments = raw.fedExResponse?.output?.transactionShipments;
    if (!Array.isArray(shipments)) return null;

    for (const txn of shipments) {
        const pieces = txn?.pieceResponses || [];
        for (const piece of pieces) {
            const docs = piece?.packageDocuments || [];
            for (const doc of docs) {
                if (doc?.encodedLabel) return doc.encodedLabel;
            }
        }
    }

    return null;
};

export const normalizeShipmentDetail = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    const details = raw.shippingDetails || {};
    const fedExTxn = raw.fedExResponse?.output?.transactionShipments?.[0];
    const pieceResponse = fedExTxn?.pieceResponses?.[0];
    const operational = fedExTxn?.completedShipmentDetail?.operationalDetail;
    const encodedLabel = extractEncodedLabel(raw);
    const labelContentType = getShipmentLabelContentType(raw);

    return {
        ...raw,
        shipper: raw.shipper || details.shipper || null,
        recipient: raw.recipient || details.recipient || null,
        packages: Array.isArray(raw.packages) ? raw.packages : (details.packages || []),
        deliveryFee: raw.deliveryFee ?? details.deliveryFee ?? pieceResponse?.baseRateAmount ?? null,
        serviceType: raw.serviceType || details.serviceType || fedExTxn?.serviceType || null,
        serviceName: fedExTxn?.serviceName || getServiceLabel(raw.serviceType || details.serviceType),
        packagingType: raw.packagingType || details.packagingType || null,
        pickupType: raw.pickupType || details.pickupType || null,
        dropoffLocation: raw.dropoffLocation || details.dropoffLocation || null,
        oneRate: raw.oneRate ?? details.oneRate ?? false,
        signatureOption: raw.signatureOption
            || details.signatureOption
            || details.packages?.[0]?.packageSpecialServices?.signatureOptionType
            || null,
        shipmentReference: raw.shipmentReference
            || details.shipmentReference
            || details.packages?.[0]?.customerReferences?.[0]?.value
            || null,
        trackingNumber: raw.trackingNumber || details.trackingNumber || pieceResponse?.trackingNumber || null,
        expectedDeliveryDate: raw.expectedDeliveryDate
            || pieceResponse?.deliveryDatestamp
            || operational?.deliveryDate
            || null,
        shipDate: raw.shipDate || fedExTxn?.shipDatestamp || raw.createdAt || null,
        currency: pieceResponse?.currency || raw.currency || 'USD',
        encodedLabel,
        labelBase64: encodedLabel,
        labelContentType,
        labelUrl: raw.labelUrl || details.labelUrl || null,
        fedExAlerts: Array.isArray(fedExTxn?.alerts) ? fedExTxn.alerts : [],
        publishedDeliveryTime: operational?.publishedDeliveryTime || null,
        contactName: raw.contactName || details.recipient?.contact?.personName || null,
        phoneNumber: raw.phoneNumber || details.recipient?.contact?.phoneNumber || null,
        email: raw.email || details.recipient?.contact?.email || null,
        specialInstructions: raw.specialInstructions || null,
    };
};

export const getShipmentLabelSrc = (shipment) => {
    if (!shipment) return null;
    if (shipment.labelUrl) return shipment.labelUrl;

    const encodedLabel = shipment.encodedLabel || shipment.labelBase64 || extractEncodedLabel(shipment);
    if (!encodedLabel) return null;

    if (String(encodedLabel).startsWith('data:')) return encodedLabel;

    const contentType = getShipmentLabelContentType(shipment);
    const mime = LABEL_MIME_BY_TYPE[contentType] || 'image/png';
    return `data:${mime};base64,${encodedLabel}`;
};

export const downloadShipmentLabel = (shipment) => {
    const src = getShipmentLabelSrc(shipment);
    if (!src) return false;

    try {
        const contentType = getShipmentLabelContentType(shipment);
        const extension = contentType === 'PDF' ? 'pdf' : contentType === 'GIF' ? 'gif' : 'png';
        const link = document.createElement('a');
        link.href = src;
        link.download = `fedex-label-${shipment?.trackingNumber || shipment?.id || 'label'}.${extension}`;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    } catch {
        return false;
    }
};

export const printShipmentLabel = (shipment) => new Promise((resolve) => {
    const src = getShipmentLabelSrc(shipment);
    if (!src) {
        resolve({ ok: false, reason: 'no_label' });
        return;
    }

    const hasEncoded = Boolean(shipment?.encodedLabel || shipment?.labelBase64 || extractEncodedLabel(shipment));
    if (shipment?.labelUrl && !hasEncoded) {
        const opened = window.open(shipment.labelUrl, '_blank');
        resolve({ ok: Boolean(opened), reason: opened ? null : 'popup_blocked' });
        return;
    }

    try {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
        document.body.appendChild(iframe);

        const cleanup = () => {
            setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }, 2000);
        };

        const triggerPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                cleanup();
                resolve({ ok: true });
            } catch {
                cleanup();
                resolve({ ok: false, reason: 'print_failed' });
            }
        };

        if (isPdfShipmentLabel(shipment)) {
            const encodedLabel = shipment?.encodedLabel || shipment?.labelBase64 || extractEncodedLabel(shipment);
            let objectUrl = src;

            try {
                const binary = atob(String(encodedLabel).replace(/^data:application\/pdf;base64,/, ''));
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
                objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
            } catch {
                // Fall back to data URL if blob conversion fails.
            }

            const pdfCleanup = () => {
                if (objectUrl && objectUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(objectUrl);
                }
                cleanup();
            };

            iframe.onload = () => {
                setTimeout(() => {
                    try {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                        pdfCleanup();
                        resolve({ ok: true });
                    } catch {
                        pdfCleanup();
                        resolve({ ok: false, reason: 'print_failed' });
                    }
                }, 400);
            };
            iframe.onerror = () => {
                pdfCleanup();
                resolve({ ok: false, reason: 'load_failed' });
            };
            iframe.src = objectUrl;
            return;
        }

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            cleanup();
            resolve({ ok: false, reason: 'print_failed' });
            return;
        }

        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
  <head>
    <title>FedEx Label</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }

      @page {
        size: 4in 6in;
        margin: 0;
      }

      html, body {
        width: 4in;
        height: 6in;
        overflow: hidden;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      img {
        width: 4in;
        height: 6in;
        max-width: 4in;
        max-height: 6in;
        object-fit: contain;
        display: block;
        page-break-inside: avoid;
        page-break-before: avoid;
        page-break-after: avoid;
      }

      @media print {
        html, body {
          width: 4in;
          height: 6in;
        }

        img {
          width: 4in !important;
          height: 6in !important;
          max-width: 4in !important;
          max-height: 6in !important;
        }
      }
    </style>
  </head>
  <body>
    <img id="shipping-label" src="${src}" alt="Shipping Label" />
  </body>
</html>`);
        doc.close();

        const img = doc.getElementById('shipping-label');
        if (img?.complete) {
            triggerPrint();
        } else if (img) {
            img.onload = triggerPrint;
            img.onerror = () => {
                cleanup();
                resolve({ ok: false, reason: 'load_failed' });
            };
        } else {
            triggerPrint();
        }
    } catch {
        resolve({ ok: false, reason: 'print_failed' });
    }
});

export const formatPackageDimensions = (pkg) => {
    if (!pkg?.dimensions) return null;
    const { length, width, height, units } = pkg.dimensions;
    if (!length && !width && !height) return null;
    return `${length || '-'} × ${width || '-'} × ${height || '-'} ${(units || 'IN').toLowerCase()}`;
};
