import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { styled } from '@mui/material/styles';
import { Alert, Button } from '@mui/material';
import { toast } from 'react-toastify';
import Heading from '../../Components/Heading';
import LabeledInput from '../../Components/LabeledInput';
import BottonCustom from '../../Components/ButtonCustom';
import GoBack from '../../Components/GoBack';
import Loader from '../../Components/Loader';
import { usePageTitle } from '../../Hooks/usePageTitle';
import {
    calculateShippingRates,
    createShipment,
    findShippingLocations,
    getShippingTenantId,
    validateShippingAddress,
} from '../../Api/shippingApi';
import { getFedexConnection, getFedexErrorToast } from '../../Api/FedExApi';
import { fetchMerchantNames } from '../../Api/customerApi';
import {
    CREATE_SHIPMENT_SERVICE_TYPES,
    createEmptyAddress,
    createEmptyContact,
    createEmptyPackage,
    DIMENSION_UNITS,
    DEFAULT_SHIPMENT_TYPE,
    DROPOFF_LOCATION_PREFS,
    buildCreateShipmentPayload,
    getLocationTypeLabel,
    getMerchantDisplayName,
    getPackagingLabel,
    getServiceLabel,
    isOneRatePackaging,
    mapDraftShipmentToForm,
    mapMerchantToRecipient,
    mapShipmentToRepeatForm,
    PACKAGING_TYPES,
    packagingNeedsDimensions,
    PICKUP_INSTRUCTION_OPTIONS,
    PICKUP_TIME_OPTIONS,
    PICKUP_TYPES,
    SIGNATURE_OPTIONS,
    US_STATES,
    WEIGHT_UNITS,
} from '../../Utils/shippingConstants';
import { getDefaultShipperFromFedexConnection, getDefaultShipperFromTenant } from '../../Utils/helper';

const PageWrapper = styled('div')(({ theme }) => ({
    marginTop: -65,
    backgroundColor: 'var(--dashboard-bg)',
    padding: 10,
    minHeight: '100vh',
    minWidth: 0,
    [theme.breakpoints.down('sm')]: {
        padding: 8,
    },
}));

const HeaderWrapper = styled('div')(({ theme }) => ({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10,
    zIndex: 2,
    [theme.breakpoints.down('sm')]: {
        alignItems: 'stretch',
        marginBottom: 12,
    },
}));

const HeaderTitle = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    [theme.breakpoints.down('sm')]: {
        width: '100%',
        gap: 8,
        '& p': {
            fontSize: '24px !important',
            lineHeight: 1.2,
        },
    },
}));

const HeaderActions = styled('div')(({ theme }) => ({
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    [theme.breakpoints.down('sm')]: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        width: '100%',
        gap: 8,
        '& > button': {
            width: '100% !important',
            minWidth: 0,
        },
    },
}));

const SectionCard = styled('div')(({ theme }) => ({
    backgroundColor: 'var(--dashboard-tab-box)',
    border: '1px solid var(--dashboard-box-border)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    minWidth: 0,
    [theme.breakpoints.down('sm')]: {
        padding: 12,
        marginBottom: 12,
    },
}));

const SectionHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '1px solid var(--dashboard-box-border)',
    gap: 8,
    [theme.breakpoints.down('sm')]: {
        flexWrap: 'wrap',
    },
}));

const Grid2 = styled('div')({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
    gap: 12,
    minWidth: 0,
});

const ContentGrid = styled('div')(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
    gap: 16,
    '& > div': {
        minWidth: 0,
    },
    [theme.breakpoints.down('md')]: {
        gridTemplateColumns: 'minmax(0, 1fr)',
    },
    [theme.breakpoints.down('sm')]: {
        gap: 0,
    },
}));

const WeightRow = styled('div')({
    display: 'flex',
    gap: 8,
    minWidth: 0,
    '& > input': {
        minWidth: 0,
    },
});

const DimensionsRow = styled('div')(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(90px, 1fr)) 70px',
    gap: 8,
    marginTop: 4,
    [theme.breakpoints.down('sm')]: {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        '& > div': {
            minWidth: 0,
            width: 'auto !important',
        },
    },
}));

const LocationHeading = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    '& > span:nth-of-type(1)': {
        minWidth: 0,
        overflowWrap: 'anywhere',
    },
    [theme.breakpoints.down('sm')]: {
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        '& > span:last-child': {
            marginLeft: 22,
        },
    },
}));

const SummaryBox = styled('div')({
    border: '1px dashed var(--dashboard-box-border)',
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 89, 245, 0.04)',
    fontSize: 13,
    color: 'var(--dashboard-text-primary)',
});

const RateOption = styled('label')(({ selected }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: selected ? '2px solid #0C79F7' : '1px solid var(--dashboard-box-border)',
    backgroundColor: selected ? 'rgba(0, 89, 245, 0.06)' : 'var(--dashboard-tab-box)',
    cursor: 'pointer',
    marginBottom: 8,
}));

const RadioRow = styled('label')({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginRight: 20,
    marginTop: 10,
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--dashboard-text-primary)',
});

const LocationOption = styled('label')(({ selected }) => ({
    display: 'block',
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 8,
    border: selected ? '2px solid #0C79F7' : '1px solid var(--dashboard-box-border)',
    backgroundColor: selected ? 'rgba(0, 89, 245, 0.06)' : 'rgba(0, 0, 0, 0.02)',
    fontSize: 13,
    color: 'var(--dashboard-text-primary)',
    lineHeight: 1.45,
    cursor: 'pointer',
}));

const FieldLabel = styled('div')({
    marginTop: 12,
    marginBottom: 4,
});

const selectStyle = {
    width: '100%',
    height: 40,
    border: '1px solid #D1D5DC',
    borderRadius: 8,
    padding: '0 10px',
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--dashboard-text-primary)',
    fontSize: 14,
};

const MerchantResultsBox = styled('div')({
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 220,
    overflowY: 'auto',
    backgroundColor: 'var(--dashboard-tab-box)',
    border: '1px solid var(--dashboard-box-border)',
    borderRadius: 8,
    zIndex: 20,
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
});

const MerchantResultItem = styled('button')({
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    border: 'none',
    borderBottom: '1px solid var(--dashboard-box-border)',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--dashboard-text-primary)',
    fontSize: 13,
    '&:hover': {
        backgroundColor: 'rgba(0, 89, 245, 0.06)',
    },
    '&:last-child': {
        borderBottom: 'none',
    },
});

const formatStoreTime = (time) => {
    if (!time) return '';
    const [hourStr, minuteStr = '00'] = String(time).split(':');
    const hour = Number(hourStr);
    if (Number.isNaN(hour)) return time;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minuteStr} ${period}`;
};

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * FedEx drop boxes report CLOSED_ALL_DAY for every day even though they
 * accept drop-offs 24/7, so hours are only shown when the location has
 * real staffed hours (at least one OPEN_BY_HOURS day).
 */
const getTodayStoreHoursLabel = (storeHours) => {
    if (!Array.isArray(storeHours) || !storeHours.length) return '';
    const hasStaffedHours = storeHours.some((entry) => entry?.operationalHoursType === 'OPEN_BY_HOURS');
    if (!hasStaffedHours) return '';

    const todayName = DAY_NAMES[new Date().getDay()];
    const today = storeHours.find((entry) => entry?.dayOfWeek === todayName);
    if (!today) return '';

    if (today.operationalHoursType === 'OPEN_BY_HOURS' && today.operationalHours) {
        const begins = formatStoreTime(today.operationalHours.begins);
        const ends = formatStoreTime(today.operationalHours.ends);
        if (begins && ends) return `Open today: ${begins} – ${ends}`;
    }
    return 'Closed today';
};

const formatLocationDistance = (distance) => {
    if (distance?.value == null) return '';
    const units = (distance.units || 'MI').toLowerCase();
    return `${Number(distance.value).toFixed(2)} ${units}`;
};

const buildParty = (contact, address) => ({
    contact: {
        personName: contact.personName.trim(),
        phoneNumber: contact.phoneNumber.replace(/\D/g, ''),
        ...(contact.email?.trim() ? { email: contact.email.trim() } : {}),
        ...(contact.company?.trim() ? { company: contact.company.trim() } : {}),
    },
    address: {
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        postalCode: address.postalCode.trim(),
        countryCode: address.countryCode || 'US',
        residential: Boolean(address.residential),
    },
});

const CreateShipment = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userDetails = useSelector((state) => state.userData?.userDetails);
    const tenantId = getShippingTenantId(userDetails);

    const repeatFrom = location.state?.repeatFrom;
    const editDraft = location.state?.editDraft;
    const isEditingDraft = Boolean(editDraft?.id);

    usePageTitle(isEditingDraft ? 'Edit Shipment' : 'Create Shipment', location);

    const [shipperContact, setShipperContact] = useState(createEmptyContact());
    const [shipperAddress, setShipperAddress] = useState(createEmptyAddress());
    const [recipientContact, setRecipientContact] = useState(createEmptyContact());
    const [recipientAddress, setRecipientAddress] = useState(createEmptyAddress());
    const [packagingType, setPackagingType] = useState('YOUR_PACKAGING');
    const [oneRate, setOneRate] = useState(false);
    const [pickupType, setPickupType] = useState('DROPOFF_AT_FEDEX_LOCATION');
    const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [earliestPickupTime, setEarliestPickupTime] = useState('08:00');
    const [latestPickupTime, setLatestPickupTime] = useState('13:30');
    const [pickupInstructions, setPickupInstructions] = useState('');
    const [useAlternatePickupAddress, setUseAlternatePickupAddress] = useState(false);
    const [alternatePickupAddress, setAlternatePickupAddress] = useState(createEmptyAddress());
    const [dropoffPreference, setDropoffPreference] = useState('NEAREST');
    const [dropoffLocations, setDropoffLocations] = useState([]);
    const [dropoffLocationsLoading, setDropoffLocationsLoading] = useState(false);
    const [selectedDropoffLocation, setSelectedDropoffLocation] = useState(null);
    const [packages, setPackages] = useState([createEmptyPackage()]);
    const [signatureOption, setSignatureOption] = useState('NO_SIGNATURE_REQUIRED');
    const [reference, setReference] = useState('');
    const [shipmentType, setShipmentType] = useState(DEFAULT_SHIPMENT_TYPE);
    const [shipDate, setShipDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [serviceType, setServiceType] = useState('');
    const [rateOptions, setRateOptions] = useState([]);
    const [selectedRate, setSelectedRate] = useState(null);
    const [deliverySummary, setDeliverySummary] = useState(null);
    const [shipmentDraft, setShipmentDraft] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validatingAddress, setValidatingAddress] = useState(false);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
    const [merchantResults, setMerchantResults] = useState([]);
    const [merchantSearchLoading, setMerchantSearchLoading] = useState(false);
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const merchantSearchRef = useRef(null);
    const rateCalcRequestRef = useRef(0);
    const lastRatesPayloadRef = useRef('');
    const preferredServiceTypeRef = useRef('');
    const shipperDefaultsAppliedRef = useRef(false);
    const draftAppliedRef = useRef(false);
    const [linkedApplicationId, setLinkedApplicationId] = useState(
        editDraft?.applicationId || editDraft?.application?.id || null
    );
    const [fedexConfigured, setFedexConfigured] = useState(null);

    useEffect(() => {
        if (!accessToken) return undefined;
        let cancelled = false;
        getFedexConnection(accessToken)
            .then((data) => {
                if (!cancelled) setFedexConfigured(Boolean(data?.configured));
            })
            .catch(() => {
                if (!cancelled) setFedexConfigured(null);
            });
        return () => {
            cancelled = true;
        };
    }, [accessToken]);

    useEffect(() => {
        if (editDraft && !draftAppliedRef.current) {
            const form = mapDraftShipmentToForm(editDraft);
            preferredServiceTypeRef.current = form.serviceType || '';
            lastRatesPayloadRef.current = '';
            setRecipientContact(form.recipientContact);
            setRecipientAddress(form.recipientAddress);
            setMerchantSearchQuery(form.merchantSearchQuery);
            if (form.shipmentType && form.shipmentType !== 'shipping') {
                setShipmentType(form.shipmentType);
            }
            setLinkedApplicationId(form.applicationId);
            if (editDraft.packages) {
                setPackages(form.packages);
                setSignatureOption(form.signatureOption);
            }
            if (editDraft.packagingType) setPackagingType(form.packagingType);
            if (editDraft.pickupType) setPickupType(form.pickupType);
            if (form.oneRate) setOneRate(form.oneRate);
            if (form.serviceType) setServiceType(form.serviceType);
            if (form.reference) setReference(form.reference);
            if (form.dropoffLocation) setSelectedDropoffLocation(form.dropoffLocation);
            if (form.hasShipper) {
                setShipperContact(form.shipperContact);
                setShipperAddress(form.shipperAddress);
                shipperDefaultsAppliedRef.current = true;
            }
            draftAppliedRef.current = true;
            if (form.hasShipper) return;
        }

        if (repeatFrom) {
            const form = mapShipmentToRepeatForm(repeatFrom);
            preferredServiceTypeRef.current = form.serviceType || '';
            lastRatesPayloadRef.current = '';
            shipperDefaultsAppliedRef.current = true;

            setShipperContact(form.shipperContact);
            setShipperAddress(form.shipperAddress);
            setRecipientContact(form.recipientContact);
            setRecipientAddress(form.recipientAddress);
            setPackagingType(form.packagingType);
            setOneRate(form.oneRate);
            setPickupType(form.pickupType);
            setSelectedDropoffLocation(form.dropoffLocation || null);
            setReference(form.reference);
            setShipmentType(form.shipmentType);
            setPackages(form.packages);
            setSignatureOption(form.signatureOption);
            setMerchantSearchQuery(form.merchantSearchQuery);
            setServiceType(form.serviceType);
            setSelectedMerchant(null);
            return;
        }

        if (shipperDefaultsAppliedRef.current) return;

        const tenantShipper = getDefaultShipperFromTenant(userDetails);
        setShipperContact({ ...createEmptyContact(), ...tenantShipper.contact });
        setShipperAddress({ ...createEmptyAddress(), ...tenantShipper.address });

        // userDetails starts as {} before Sidebar hydrate — wait for tenant.
        const tenant = userDetails?.tenant;
        const hydrated = Boolean(
            userDetails?.tenantId
            || tenant?.id
            || tenant?.name
            || tenant?.address
            || tenant?.phone
        );
        if (!hydrated) return;

        let cancelled = false;
        const overlayFedexShipper = async () => {
            if (!accessToken) {
                shipperDefaultsAppliedRef.current = true;
                return;
            }
            try {
                const data = await getFedexConnection(accessToken);
                if (cancelled) return;
                if (data?.configured != null) setFedexConfigured(Boolean(data.configured));
                const fromFedex = getDefaultShipperFromFedexConnection(data);
                if (fromFedex) {
                    setShipperContact({ ...createEmptyContact(), ...fromFedex.contact });
                    setShipperAddress({ ...createEmptyAddress(), ...fromFedex.address });
                }
            } catch {
                // Connection status is loaded separately; keep tenant shipper defaults.
            } finally {
                if (!cancelled) shipperDefaultsAppliedRef.current = true;
            }
        };

        overlayFedexShipper();
        return () => {
            cancelled = true;
        };
    }, [repeatFrom, editDraft, userDetails, accessToken]);

    useEffect(() => {
        const term = merchantSearchQuery.trim();
        if (term.length < 2) {
            setMerchantResults([]);
            setMerchantSearchLoading(false);
            return undefined;
        }

        setMerchantSearchLoading(true);
        const timer = setTimeout(() => {
            fetchMerchantNames(accessToken, term)
                .then((results) => setMerchantResults(results))
                .catch(() => setMerchantResults([]))
                .finally(() => setMerchantSearchLoading(false));
        }, 350);

        return () => clearTimeout(timer);
    }, [merchantSearchQuery, accessToken]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (merchantSearchRef.current && !merchantSearchRef.current.contains(event.target)) {
                setMerchantResults([]);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMerchantSelect = (merchant) => {
        const mapped = mapMerchantToRecipient(merchant);
        setSelectedMerchant(merchant);
        setRecipientContact(mapped.contact);
        setRecipientAddress(mapped.address);
        setMerchantSearchQuery(getMerchantDisplayName(merchant));
        setMerchantResults([]);
        setValidationErrors((prev) => {
            const next = { ...prev };
            const populatedFields = {
                'recipient.personName': mapped.contact.personName,
                'recipient.phoneNumber': mapped.contact.phoneNumber,
                'recipient.street': mapped.address.street,
                'recipient.state': mapped.address.state,
                'recipient.city': mapped.address.city,
                'recipient.postalCode': mapped.address.postalCode,
            };
            Object.entries(populatedFields).forEach(([key, value]) => {
                if (String(value || '').trim()) delete next[key];
            });
            return next;
        });
    };

    const clearValidationError = (field) => {
        setValidationErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));
    };

    const availablePackaging = useMemo(() => {
        if (oneRate) return PACKAGING_TYPES.filter((p) => p.oneRate);
        return PACKAGING_TYPES;
    }, [oneRate]);

    useEffect(() => {
        if (oneRate && !isOneRatePackaging(packagingType)) {
            setPackagingType('FEDEX_SMALL_BOX');
        }
        if (!oneRate && packagingType !== 'YOUR_PACKAGING' && isOneRatePackaging(packagingType)) {
            // keep selection valid
        }
    }, [oneRate, packagingType]);

    useEffect(() => {
        if (oneRate && packages.length > 1) {
            setPackages((prev) => [prev[0] || createEmptyPackage()]);
        }
    }, [oneRate, packages.length]);

    useEffect(() => {
        if (packages.length > 1) {
            setOneRate(false);
            setPackagingType('YOUR_PACKAGING');
        }
    }, [packages.length]);

    const needsDimensions = packagingNeedsDimensions(packagingType);

    const handleServiceTypeChange = (value) => {
        setServiceType(value);
        if (value) clearValidationError('serviceType');
        preferredServiceTypeRef.current = value;
        const selected = CREATE_SHIPMENT_SERVICE_TYPES.find((s) => s.value === value);
        if (selected && !selected.oneRate) {
            setOneRate(false);
            setPackagingType('YOUR_PACKAGING');
        }
    };

    const removePackage = (index) => {
        setValidationErrors((prev) => {
            const next = {};
            Object.entries(prev).forEach(([key, value]) => {
                const match = key.match(/^packages\.(\d+)\.(.+)$/);
                if (!match) {
                    next[key] = value;
                    return;
                }

                const packageIndex = Number(match[1]);
                if (packageIndex < index) next[key] = value;
                if (packageIndex > index) next[`packages.${packageIndex - 1}.${match[2]}`] = value;
            });
            return next;
        });
        setPackages((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    const hasCompleteAddress = useCallback((contact, address) => (
        Boolean(
            contact.personName?.trim()
            && contact.phoneNumber?.trim()
            && address.street?.trim()
            && address.city?.trim()
            && address.state?.trim()
            && address.postalCode?.trim()
        )
    ), []);

    const formatAddressLine = useCallback((address) => {
        if (!address) return '';
        return [
            address.street,
            address.city,
            address.postalCode,
            address.state,
            address.countryCode || 'US',
        ].filter(Boolean).join(', ');
    }, []);

    const activePickupAddress = useAlternatePickupAddress ? alternatePickupAddress : shipperAddress;

    const canSuggestDropoffLocations = useMemo(() => (
        pickupType === 'DROPOFF_AT_FEDEX_LOCATION'
        && hasCompleteAddress(shipperContact, shipperAddress)
        && packages.some((pkg) => Number(pkg.weight?.value) > 0)
        && Boolean(serviceType)
    ), [pickupType, shipperContact, shipperAddress, packages, serviceType, hasCompleteAddress]);

    useEffect(() => {
        if (pickupType !== 'DROPOFF_AT_FEDEX_LOCATION') {
            setDropoffLocations([]);
            setSelectedDropoffLocation(null);
            return undefined;
        }

        // Keep the selected location here: canSuggestDropoffLocations flips false
        // transiently while the user edits weight/address/service, and wiping the
        // selection would silently drop dropoffLocation from the payload.
        if (!canSuggestDropoffLocations || !accessToken) {
            setDropoffLocations([]);
            return undefined;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            setDropoffLocationsLoading(true);
            try {
                const result = await findShippingLocations(accessToken, tenantId, {
                    address: {
                        streetLines: [shipperAddress.street.trim()],
                        city: shipperAddress.city.trim(),
                        stateOrProvinceCode: shipperAddress.state.trim(),
                        postalCode: shipperAddress.postalCode.trim(),
                        countryCode: shipperAddress.countryCode || 'US',
                    },
                    sortBy: dropoffPreference === 'LATEST_OPENING_HOURS' ? 'LATEST_OPENING_HOURS' : 'NEAREST',
                    maxResults: 20,
                });
                if (cancelled) return;
                const list = Array.isArray(result?.data)
                    ? result.data
                    : Array.isArray(result?.data?.locations)
                        ? result.data.locations
                        : Array.isArray(result?.locations)
                            ? result.locations
                            : [];
                setDropoffLocations(list);
                setSelectedDropoffLocation((prev) => {
                    if (prev) {
                        const prevKey = prev.locationId || prev.id;
                        const match = list.find((loc) => (loc.locationId || loc.id) === prevKey);
                        if (match) return match;
                    }
                    return list[0] || null;
                });
            } catch {
                if (!cancelled) setDropoffLocations([]);
            } finally {
                if (!cancelled) setDropoffLocationsLoading(false);
            }
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        pickupType,
        canSuggestDropoffLocations,
        accessToken,
        tenantId,
        shipperAddress,
        dropoffPreference,
    ]);

    const isRatesReady = useMemo(() => {
        if (!hasCompleteAddress(shipperContact, shipperAddress)) return false;
        if (!hasCompleteAddress(recipientContact, recipientAddress)) return false;

        for (const pkg of packages) {
            if (!pkg.weight.value || Number(pkg.weight.value) <= 0) return false;
            if (needsDimensions) {
                const { length, width, height } = pkg.dimensions;
                if (!length || !width || !height) return false;
                if (Number(length) <= 0 || Number(width) <= 0 || Number(height) <= 0) return false;
            }
        }

        if (oneRate && packages.length > 1) return false;
        if (!serviceType) return false;
        return true;
    }, [
        shipperContact,
        shipperAddress,
        recipientContact,
        recipientAddress,
        packages,
        needsDimensions,
        oneRate,
        serviceType,
        hasCompleteAddress,
    ]);

    const updatePackage = (index, patch) => {
        setPackages((prev) => prev.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)));
    };

    const buildPayloadBase = useCallback(() => {
        const normalizedPackages = packages.map((pkg) => {
            const entry = {
                weight: {
                    units: pkg.weight.units || 'LB',
                    value: Number(pkg.weight.value),
                },
            };
            if (needsDimensions) {
                entry.dimensions = {
                    units: pkg.dimensions.units || 'IN',
                    length: Number(pkg.dimensions.length),
                    width: Number(pkg.dimensions.width),
                    height: Number(pkg.dimensions.height),
                };
            }
            if (!oneRate && Number(pkg.groupPackageCount) > 1) {
                entry.groupPackageCount = Number(pkg.groupPackageCount);
            }
            return entry;
        });

        const payload = {
            shipper: buildParty(shipperContact, shipperAddress),
            recipient: buildParty(recipientContact, recipientAddress),
            packagingType,
            pickupType,
            packages: normalizedPackages,
        };

        payload.oneRate = Boolean(oneRate);
        payload.signatureOption = signatureOption || 'SERVICE_DEFAULT';

        if (serviceType) payload.serviceType = serviceType;
        if (reference.trim()) payload.shipmentReference = reference.trim();

        if (pickupType === 'DROPOFF_AT_FEDEX_LOCATION' && selectedDropoffLocation) {
            const locAddress = selectedDropoffLocation.address || {};
            payload.dropoffLocation = {
                locationId: selectedDropoffLocation.locationId || selectedDropoffLocation.id || '',
                locationType: selectedDropoffLocation.locationType || '',
                address: {
                    streetLines: Array.isArray(locAddress.streetLines)
                        ? locAddress.streetLines.filter(Boolean)
                        : [locAddress.street].filter(Boolean),
                    city: locAddress.city || '',
                    stateOrProvinceCode: locAddress.stateOrProvinceCode || locAddress.state || '',
                    postalCode: locAddress.postalCode || '',
                    countryCode: locAddress.countryCode || 'US',
                },
            };
        }

        return payload;
    }, [
        packages,
        needsDimensions,
        oneRate,
        serviceType,
        shipperContact,
        shipperAddress,
        recipientContact,
        recipientAddress,
        packagingType,
        pickupType,
        reference,
        signatureOption,
        selectedDropoffLocation,
    ]);

    const applyRatesResult = useCallback((data) => {
        const draft = data.shipmentDraft && typeof data.shipmentDraft === 'object'
            ? data.shipmentDraft
            : null;
        setShipmentDraft(draft);

        const options = Array.isArray(data.options) && data.options.length
            ? data.options
            : data.serviceType
                ? [data]
                : [];

        setRateOptions(options);

        if (options.length) {
            const preferred = preferredServiceTypeRef.current;
            const preferredOption = preferred
                ? options.find((opt) => opt.serviceType === preferred)
                : null;
            const selected = preferredOption || options[0];

            setSelectedRate((prev) => {
                if (preferredOption) return preferredOption;
                const stillValid = prev && options.some((opt) => opt.serviceType === prev.serviceType);
                return stillValid ? prev : selected;
            });
            setServiceType((prev) => {
                if (preferredOption) return preferredOption.serviceType;
                const stillValid = prev && options.some((opt) => opt.serviceType === prev);
                return stillValid ? prev : selected.serviceType;
            });

            if (preferredOption) {
                preferredServiceTypeRef.current = '';
            }
        } else {
            setSelectedRate(null);
        }

        setDeliverySummary({
            deliveryFee: data.deliveryFee,
            currency: data.currency || 'USD',
            serviceName: data.serviceName,
        });
    }, []);

    const clearRates = useCallback(() => {
        setRateOptions([]);
        setSelectedRate(null);
        setDeliverySummary(null);
        setShipmentDraft(null);
        lastRatesPayloadRef.current = '';
    }, []);

    const fetchRates = useCallback(async ({ silent = false, force = false } = {}) => {
        if (!isRatesReady || !accessToken) return false;

        const payload = buildPayloadBase();
        const payloadKey = JSON.stringify(payload);

        if (!force && payloadKey === lastRatesPayloadRef.current) return true;

        const requestId = ++rateCalcRequestRef.current;
        setRatesLoading(true);

        if (!silent) {
            setRateOptions([]);
            setSelectedRate(null);
            setDeliverySummary(null);
            setShipmentDraft(null);
        }

        try {
            const result = await calculateShippingRates(accessToken, tenantId, payload);
            if (requestId !== rateCalcRequestRef.current) return false;

            const data = result?.data || {};
            applyRatesResult(data);
            lastRatesPayloadRef.current = payloadKey;

            if (!silent) {
                toast.success('Rates calculated successfully');
            }
            return true;
        } catch (err) {
            if (requestId !== rateCalcRequestRef.current) return false;
            lastRatesPayloadRef.current = '';
            toast.error(getFedexErrorToast(err, 'Failed to calculate rates'));
            return false;
        } finally {
            if (requestId === rateCalcRequestRef.current) {
                setRatesLoading(false);
            }
        }
    }, [accessToken, tenantId, isRatesReady, applyRatesResult, buildPayloadBase]);

    useEffect(() => {
        if (!isRatesReady || !accessToken) {
            clearRates();
            return undefined;
        }

        const timer = setTimeout(() => {
            fetchRates({ silent: true });
        }, 700);

        return () => clearTimeout(timer);
    }, [isRatesReady, accessToken, fetchRates, clearRates]);

    const validateContacts = () => {
        const errors = {};
        const validateParty = (prefix, contact, address) => {
            if (!contact.personName.trim()) errors[`${prefix}.personName`] = true;
            if (!contact.phoneNumber.trim()) errors[`${prefix}.phoneNumber`] = true;
            if (!address.street.trim()) errors[`${prefix}.street`] = true;
            if (!address.state.trim()) errors[`${prefix}.state`] = true;
            if (!address.city.trim()) errors[`${prefix}.city`] = true;
            if (!address.postalCode.trim()) errors[`${prefix}.postalCode`] = true;
        };

        validateParty('shipper', shipperContact, shipperAddress);
        validateParty('recipient', recipientContact, recipientAddress);

        packages.forEach((pkg, index) => {
            if (!pkg.weight.value || Number(pkg.weight.value) <= 0) {
                errors[`packages.${index}.weight`] = true;
            }
            if (needsDimensions) {
                const { length, width, height } = pkg.dimensions;
                if (!length || Number(length) <= 0) errors[`packages.${index}.length`] = true;
                if (!width || Number(width) <= 0) errors[`packages.${index}.width`] = true;
                if (!height || Number(height) <= 0) errors[`packages.${index}.height`] = true;
            }
        });
        if (!serviceType) errors.serviceType = true;

        setValidationErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.error('Please fill all required fields');
            return false;
        }
        if (oneRate && packages.length > 1) {
            toast.error('FedEx One Rate supports only one package');
            return false;
        }
        return true;
    };

    const handleValidateRecipient = async () => {
        if (!recipientAddress.street.trim()) {
            toast.error('Enter recipient address first');
            return;
        }
        setValidatingAddress(true);
        try {
            await validateShippingAddress(accessToken, tenantId, {
                street: recipientAddress.street.trim(),
                city: recipientAddress.city.trim(),
                state: recipientAddress.state.trim(),
                postalCode: recipientAddress.postalCode.trim(),
                countryCode: recipientAddress.countryCode || 'US',
            });
            toast.success('Address validated successfully');
        } catch (err) {
            toast.error(getFedexErrorToast(err, 'Address validation failed'));
        } finally {
            setValidatingAddress(false);
        }
    };

    const handleCalculateRates = async () => {
        if (!validateContacts()) return;
        await fetchRates({ silent: false, force: true });
    };

    const handleFinalize = async () => {
        if (!validateContacts()) return;
        if (!serviceType && !selectedRate?.serviceType) {
            toast.error('Please calculate rates and select a service');
            return;
        }
        if (!shipmentDraft) {
            toast.error('Please calculate rates before finalizing the shipment');
            return;
        }
        setLoading(true);
        try {
            const payload = buildCreateShipmentPayload({
                shipmentDraft,
                formPayload: buildPayloadBase(),
                serviceType: serviceType || selectedRate?.serviceType,
                shipmentType,
            });
            if (linkedApplicationId) payload.applicationId = linkedApplicationId;
            if (editDraft?.id) payload.id = editDraft.id;
            const result = await createShipment(accessToken, tenantId, payload);
            const data = result?.data || {};
            toast.success(result?.message || 'Shipment created successfully');
            navigate(`/home/shipmentDetail/${data.id}`, {
                state: { shipment: data, justCreated: true },
            });
        } catch (err) {
            toast.error(getFedexErrorToast(err, 'Failed to create shipment'));
        } finally {
            setLoading(false);
        }
    };

    const renderAddressFields = (prefix, address, setAddress, contact, setContact) => (
        <Grid2>
            <LabeledInput
                label="Contact Name"
                required
                inputValue={contact.personName}
                onInputChange={(e) => {
                    setContact({ ...contact, personName: e.target.value });
                    if (e.target.value.trim()) clearValidationError(`${prefix}.personName`);
                }}
                error={validationErrors[`${prefix}.personName`]}
            />
            <LabeledInput label="Company" inputValue={contact.company} onInputChange={(e) => setContact({ ...contact, company: e.target.value })} />
            <LabeledInput
                label="Phone Number"
                required
                inputValue={contact.phoneNumber}
                onInputChange={(e) => {
                    setContact({ ...contact, phoneNumber: e.target.value });
                    if (e.target.value.trim()) clearValidationError(`${prefix}.phoneNumber`);
                }}
                error={validationErrors[`${prefix}.phoneNumber`]}
            />
            <LabeledInput label="Email" inputType="email" inputValue={contact.email} onInputChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <LabeledInput
                label="Address Line 1"
                required
                inputValue={address.street}
                onInputChange={(e) => {
                    setAddress({ ...address, street: e.target.value });
                    if (e.target.value.trim()) clearValidationError(`${prefix}.street`);
                }}
                error={validationErrors[`${prefix}.street`]}
            />
            <div>
                <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="State" Fontsize={16} required />
                <select
                    style={{ ...selectStyle, border: validationErrors[`${prefix}.state`] ? '1px solid #ef4444' : selectStyle.border }}
                    value={address.state}
                    onChange={(e) => {
                        setAddress({ ...address, state: e.target.value });
                        if (e.target.value) clearValidationError(`${prefix}.state`);
                    }}
                >
                    <option value="">Select state</option>
                    {US_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                    ))}
                </select>
            </div>
            <LabeledInput
                label="City"
                required
                inputValue={address.city}
                onInputChange={(e) => {
                    setAddress({ ...address, city: e.target.value });
                    if (e.target.value.trim()) clearValidationError(`${prefix}.city`);
                }}
                error={validationErrors[`${prefix}.city`]}
            />
            <LabeledInput
                label="Postal Code"
                required
                inputValue={address.postalCode}
                onInputChange={(e) => {
                    setAddress({ ...address, postalCode: e.target.value });
                    if (e.target.value.trim()) clearValidationError(`${prefix}.postalCode`);
                }}
                error={validationErrors[`${prefix}.postalCode`]}
            />
            <div className="flex items-center gap-2 mt-6">
                <input
                    type="checkbox"
                    checked={address.residential}
                    onChange={(e) => setAddress({ ...address, residential: e.target.checked })}
                />
                <span style={{ fontSize: 13, color: 'var(--dashboard-text-primary)' }}>This is a residential address</span>
            </div>
        </Grid2>
    );

    if (loading && !ratesLoading) {
        return (
            <PageWrapper>
                <Loader message={isEditingDraft ? 'Updating shipment...' : 'Creating shipment...'} subMessage="Please wait" />
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <HeaderWrapper>
                <HeaderTitle>
                    <GoBack />
                    <Heading Fontweight={700} color="var(--sidebar-text-primary)" Heading={isEditingDraft ? 'Edit Shipment' : 'Create Shipment'} Fontsize={30} />
                </HeaderTitle>
                <HeaderActions>
                    <BottonCustom
                        title="Refresh Rates"
                        height={40}
                        width={150}
                        backgroundColor="transparent"
                        color="#0C79F7"
                        border="1px solid #0C79F7"
                        fontSize={14}
                        fontWeight={500}
                        onClick={handleCalculateRates}
                        disabled={ratesLoading || !isRatesReady}
                    />
                    <BottonCustom
                        title="Finalize"
                        height={40}
                        width={130}
                        backgroundColor="#0C79F7"
                        color="#fff"
                        fontSize={14}
                        fontWeight={600}
                        onClick={handleFinalize}
                    />
                </HeaderActions>
            </HeaderWrapper>

            {fedexConfigured === false ? (
                <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => navigate('/home/fedexSettings')}>
                            Open FedEx settings
                        </Button>
                    }
                >
                    FedEx is not configured for this tenant. Save Client ID, Client Secret, and Account
                    Number before calculating rates or creating labels.
                </Alert>
            ) : null}

            <ContentGrid>
                <div>
                    <SectionCard>
                        <SectionHeader>
                            <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading="Ship from" Fontsize={18} />
                        </SectionHeader>
                        {renderAddressFields('shipper', shipperAddress, setShipperAddress, shipperContact, setShipperContact)}
                    </SectionCard>

                    <SectionCard style={{ position: 'relative' }}>
                        <SectionHeader>
                            <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading="Deliver to" Fontsize={18} />
                            <button
                                type="button"
                                style={{ color: '#0C79F7', fontSize: 13, opacity: validatingAddress ? 0.6 : 1 }}
                                onClick={handleValidateRecipient}
                                disabled={validatingAddress}
                            >
                                Validate Address
                            </button>
                        </SectionHeader>

                        {validatingAddress && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                                    borderRadius: 10,
                                }}
                            >
                                <Loader message="Validating address..." subMessage="Please wait" />
                            </div>
                        )}

                        <div ref={merchantSearchRef} style={{ position: 'relative', marginBottom: 16 }}>
                            <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Search Merchant" Fontsize={14} />
                            <input
                                type="text"
                                value={merchantSearchQuery}
                                onChange={(e) => {
                                    setMerchantSearchQuery(e.target.value);
                                    if (selectedMerchant && e.target.value !== getMerchantDisplayName(selectedMerchant)) {
                                        setSelectedMerchant(null);
                                    }
                                }}
                                placeholder="Search by merchant name..."
                                style={{ ...selectStyle, marginTop: 4 }}
                                disabled={validatingAddress}
                            />
                            {merchantSearchLoading && (
                                <div style={{ fontSize: 12, color: 'var(--Gray)', marginTop: 6 }}>Searching merchants...</div>
                            )}
                            {!merchantSearchLoading && merchantSearchQuery.trim().length >= 2 && merchantResults.length === 0 && (
                                <div style={{ fontSize: 12, color: 'var(--Gray)', marginTop: 6 }}>No merchants found</div>
                            )}
                            {merchantResults.length > 0 && (
                                <MerchantResultsBox>
                                    {merchantResults.map((merchant, index) => {
                                        const name = getMerchantDisplayName(merchant);
                                        const city = merchant?.businessCity || merchant?.dbaCity || merchant?.city || '';
                                        const state = merchant?.businessState || merchant?.dbaState || merchant?.state || '';
                                        return (
                                            <MerchantResultItem
                                                key={merchant?.id || merchant?.merchantId || `${name}-${index}`}
                                                type="button"
                                                onClick={() => handleMerchantSelect(merchant)}
                                            >
                                                <div style={{ fontWeight: 600 }}>{name}</div>
                                                {(city || state) && (
                                                    <div style={{ fontSize: 12, color: 'var(--Gray)', marginTop: 2 }}>
                                                        {[city, state].filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                            </MerchantResultItem>
                                        );
                                    })}
                                </MerchantResultsBox>
                            )}
                        </div>

                        {renderAddressFields('recipient', recipientAddress, setRecipientAddress, recipientContact, setRecipientContact)}
                    </SectionCard>

                    <SectionCard>
                        <SectionHeader>
                            <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading="Package details" Fontsize={18} />
                        </SectionHeader>

                        <div className="mb-3">
                            <label className="flex items-center gap-2 mb-3">
                                <input
                                    type="checkbox"
                                    checked={oneRate}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setOneRate(checked);
                                        if (checked) {
                                            setPackages((prev) => [prev[0] || createEmptyPackage()]);
                                            if (!isOneRatePackaging(packagingType)) {
                                                setPackagingType('FEDEX_SMALL_BOX');
                                            }
                                        } else {
                                            setPackagingType('YOUR_PACKAGING');
                                        }
                                    }}
                                />
                                <span style={{ fontSize: 13 }}>FedEx One Rate (flat-rate Express shipping)</span>
                            </label>
                            <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Service type" Fontsize={14} required />
                            <select
                                style={{ ...selectStyle, border: validationErrors.serviceType ? '1px solid #ef4444' : selectStyle.border }}
                                value={serviceType}
                                onChange={(e) => handleServiceTypeChange(e.target.value)}
                            >
                                <option value="">Select service type</option>
                                {CREATE_SHIPMENT_SERVICE_TYPES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <div className="mt-3">
                                <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Packaging" Fontsize={14} required />
                                <select style={selectStyle} value={packagingType} onChange={(e) => setPackagingType(e.target.value)}>
                                    {availablePackaging.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {packages.map((pkg, index) => (
                            <div
                                key={index}
                                style={{
                                    borderTop: index ? '1px solid var(--dashboard-box-border)' : 'none',
                                    paddingTop: index ? 12 : 0,
                                    marginTop: index ? 12 : 0,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Heading
                                        Fontweight={600}
                                        color="var(--sidebar-text-primary)"
                                        Heading={`Package ${index + 1}`}
                                        Fontsize={14}
                                    />
                                    {packages.length > 1 && (
                                        <button
                                            type="button"
                                            style={{ color: '#DC2626', fontSize: 13 }}
                                            onClick={() => removePackage(index)}
                                        >
                                            Remove package
                                        </button>
                                    )}
                                </div>
                                <Grid2>
                                    <div>
                                        <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Weight" Fontsize={14} required />
                                        <WeightRow>
                                            <input
                                                type="number"
                                                value={pkg.weight.value}
                                                onChange={(e) => {
                                                    updatePackage(index, { weight: { ...pkg.weight, value: e.target.value } });
                                                    if (Number(e.target.value) > 0) clearValidationError(`packages.${index}.weight`);
                                                }}
                                                style={{
                                                    ...selectStyle,
                                                    flex: 1,
                                                    border: validationErrors[`packages.${index}.weight`] ? '1px solid #ef4444' : selectStyle.border,
                                                }}
                                                placeholder="Weight"
                                            />
                                            <select
                                                style={{ ...selectStyle, width: 70 }}
                                                value={pkg.weight.units}
                                                onChange={(e) => updatePackage(index, { weight: { ...pkg.weight, units: e.target.value } })}
                                            >
                                                {WEIGHT_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                                            </select>
                                        </WeightRow>
                                    </div>
                                    {needsDimensions && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Dimensions" Fontsize={14} required />
                                            <DimensionsRow>
                                                <div>
                                                    <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Length" Fontsize={12} />
                                                    <input
                                                        type="number"
                                                        placeholder="Length"
                                                        value={pkg.dimensions.length}
                                                        onChange={(e) => {
                                                            updatePackage(index, { dimensions: { ...pkg.dimensions, length: e.target.value } });
                                                            if (Number(e.target.value) > 0) clearValidationError(`packages.${index}.length`);
                                                        }}
                                                        style={{ ...selectStyle, border: validationErrors[`packages.${index}.length`] ? '1px solid #ef4444' : selectStyle.border }}
                                                    />
                                                </div>
                                                <div>
                                                    <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Width" Fontsize={12} />
                                                    <input
                                                        type="number"
                                                        placeholder="Width"
                                                        value={pkg.dimensions.width}
                                                        onChange={(e) => {
                                                            updatePackage(index, { dimensions: { ...pkg.dimensions, width: e.target.value } });
                                                            if (Number(e.target.value) > 0) clearValidationError(`packages.${index}.width`);
                                                        }}
                                                        style={{ ...selectStyle, border: validationErrors[`packages.${index}.width`] ? '1px solid #ef4444' : selectStyle.border }}
                                                    />
                                                </div>
                                                <div>
                                                    <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Height" Fontsize={12} />
                                                    <input
                                                        type="number"
                                                        placeholder="Height"
                                                        value={pkg.dimensions.height}
                                                        onChange={(e) => {
                                                            updatePackage(index, { dimensions: { ...pkg.dimensions, height: e.target.value } });
                                                            if (Number(e.target.value) > 0) clearValidationError(`packages.${index}.height`);
                                                        }}
                                                        style={{ ...selectStyle, border: validationErrors[`packages.${index}.height`] ? '1px solid #ef4444' : selectStyle.border }}
                                                    />
                                                </div>
                                                <div style={{ width: 70, alignSelf: 'end' }}>
                                                    <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Unit" Fontsize={12} />
                                                    <select
                                                        style={selectStyle}
                                                        value={pkg.dimensions.units}
                                                        onChange={(e) => updatePackage(index, { dimensions: { ...pkg.dimensions, units: e.target.value } })}
                                                    >
                                                        {DIMENSION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                                                    </select>
                                                </div>
                                            </DimensionsRow>
                                        </div>
                                    )}
                                </Grid2>
                            </div>
                        ))}

                        {!oneRate && (
                            <button
                                type="button"
                                style={{ color: '#0C79F7', fontSize: 13, marginTop: 10 }}
                                onClick={() => setPackages((prev) => [...prev, createEmptyPackage()])}
                            >
                                + Add new package
                            </button>
                        )}
                    </SectionCard>
                </div>

                <div>
                    <SectionCard>
                        <SectionHeader>
                            <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading="Service details" Fontsize={18} />
                        </SectionHeader>
                        <LabeledInput label="Ship date" inputType="date" inputValue={shipDate} onInputChange={(e) => setShipDate(e.target.value)} />
                        <div className="mt-3">
                            <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Signature option" Fontsize={14} />
                            <select style={selectStyle} value={signatureOption} onChange={(e) => setSignatureOption(e.target.value)}>
                                {SIGNATURE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-3">
                            <LabeledInput label="Shipment reference" inputValue={reference} onInputChange={(e) => setReference(e.target.value)} />
                        </div>

                        {ratesLoading && <div className="mt-4"><Loader message="Calculating rates..." /></div>}

                        {rateOptions.length > 0 && (
                            <div className="mt-4">
                                <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading="Select service" Fontsize={14} />
                                {rateOptions.map((opt) => (
                                    <RateOption
                                        key={opt.serviceType}
                                        selected={serviceType === opt.serviceType}
                                        onClick={() => {
                                            setServiceType(opt.serviceType);
                                            setSelectedRate(opt);
                                        }}
                                    >
                                        <span>
                                            <input
                                                type="radio"
                                                checked={serviceType === opt.serviceType}
                                                onChange={() => {
                                                    setServiceType(opt.serviceType);
                                                    setSelectedRate(opt);
                                                }}
                                                style={{ marginRight: 8 }}
                                            />
                                            {getServiceLabel(opt.serviceType)}
                                            {opt.oneRate ? ' (One Rate)' : ''}
                                        </span>
                                        <strong>${Number(opt.deliveryFee ?? 0).toFixed(2)}</strong>
                                    </RateOption>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard>
                        <SectionHeader>
                            <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading="Pickup / drop-off" Fontsize={18} />
                        </SectionHeader>

                        <FieldLabel>
                            <Heading Fontweight={500} color="var(--fieldsTitle)" Heading="Pickup / drop-off" Fontsize={14} required />
                        </FieldLabel>
                        <select
                            style={selectStyle}
                            value={pickupType}
                            onChange={(e) => setPickupType(e.target.value)}
                        >
                            {PICKUP_TYPES.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>

                        {pickupType === 'DROPOFF_AT_FEDEX_LOCATION' && (
                            <div style={{ marginTop: 8 }}>
                                <div>
                                    {DROPOFF_LOCATION_PREFS.map((pref) => (
                                        <RadioRow key={pref.value}>
                                            <input
                                                type="radio"
                                                name="dropoffPreference"
                                                checked={dropoffPreference === pref.value}
                                                onChange={() => setDropoffPreference(pref.value)}
                                            />
                                            {pref.label}
                                        </RadioRow>
                                    ))}
                                </div>

                                {!canSuggestDropoffLocations ? (
                                    <SummaryBox style={{ marginTop: 12 }}>
                                        To show drop-off location suggestions, please enter your sender details, package weight and select a service.
                                    </SummaryBox>
                                ) : dropoffLocationsLoading ? (
                                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--Gray)' }}>
                                        Finding nearby drop-off locations...
                                    </div>
                                ) : dropoffLocations.length > 0 ? (
                                    <div style={{ marginTop: 12 }}>
                                        <div style={{ fontSize: 12, color: 'var(--Gray)' }}>
                                            Select the FedEx location where you&apos;ll drop off your shipment.
                                        </div>
                                        {dropoffLocations.slice(0, 5).map((loc, index) => {
                                            const key = loc.locationId || loc.id || `location-${index}`;
                                            const selectedKey = selectedDropoffLocation
                                                ? selectedDropoffLocation.locationId || selectedDropoffLocation.id
                                                : null;
                                            const isSelected = selectedKey != null && selectedKey === (loc.locationId || loc.id);
                                            const typeLabel = getLocationTypeLabel(loc.locationType);
                                            const companyName = loc.contact?.companyName || loc.contact?.personName || '';
                                            const name = companyName || typeLabel || `Location ${index + 1}`;
                                            const address = loc.address
                                                ? formatAddressLine({
                                                    street: Array.isArray(loc.address.streetLines)
                                                        ? loc.address.streetLines.filter(Boolean).join(', ')
                                                        : loc.address.street || '',
                                                    city: loc.address.city || '',
                                                    state: loc.address.stateOrProvinceCode || loc.address.state || '',
                                                    postalCode: loc.address.postalCode || '',
                                                    countryCode: loc.address.countryCode || 'US',
                                                })
                                                : '';
                                            const distance = formatLocationDistance(loc.distance);
                                            const storeHours = getTodayStoreHoursLabel(loc.storeHours);
                                            return (
                                                <LocationOption key={key} selected={isSelected}>
                                                    <LocationHeading>
                                                        <input
                                                            type="radio"
                                                            name="dropoffLocation"
                                                            checked={isSelected}
                                                            onChange={() => setSelectedDropoffLocation(loc)}
                                                        />
                                                        <span style={{ fontWeight: 600 }}>{name}</span>
                                                        {distance && (
                                                            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--Gray)', whiteSpace: 'nowrap' }}>
                                                                {distance}
                                                            </span>
                                                        )}
                                                    </LocationHeading>
                                                    {companyName && typeLabel && (
                                                        <div style={{ marginTop: 2, paddingLeft: 22, fontSize: 12, color: 'var(--Gray)' }}>
                                                            {typeLabel}
                                                        </div>
                                                    )}
                                                    {address && <div style={{ marginTop: 2, paddingLeft: 22 }}>{address}</div>}
                                                    {storeHours && (
                                                        <div style={{ marginTop: 2, paddingLeft: 22, fontSize: 12, color: 'var(--Gray)' }}>
                                                            {storeHours}
                                                        </div>
                                                    )}
                                                </LocationOption>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <SummaryBox style={{ marginTop: 12 }}>
                                        No drop-off locations found near the sender address.
                                    </SummaryBox>
                                )}

                                {/* <a
                                    href="https://www.fedex.com/locate/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginTop: 12,
                                        color: '#0C79F7',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                    }}
                                >
                                    FIND OTHER LOCATIONS ↗
                                </a> */}
                            </div>
                        )}

                        {pickupType === 'USE_SCHEDULED_PICKUP' && (
                            <SummaryBox style={{ marginTop: 12 }}>
                                We&apos;ll use your existing FedEx scheduled pickup at the ship-from location. No additional pickup details are required.
                            </SummaryBox>
                        )}
                    </SectionCard>

                    <SectionCard>
                        <SectionHeader>
                            <Heading Fontweight={600} color="var(--sidebar-text-primary)" Heading="Summary" Fontsize={18} />
                        </SectionHeader>
                        {selectedRate || deliverySummary ? (
                            <SummaryBox>
                                <div><strong>Packaging:</strong> {getPackagingLabel(packagingType)}</div>
                                <div><strong>Service:</strong> {getServiceLabel(serviceType || selectedRate?.serviceType)}</div>
                                <div style={{ marginTop: 8, fontSize: 16 }}>
                                    <strong>Estimated total:</strong>{' '}
                                    ${Number(selectedRate?.deliveryFee ?? deliverySummary?.deliveryFee ?? 0).toFixed(2)}{' '}
                                    {deliverySummary?.currency || 'USD'}
                                </div>
                            </SummaryBox>
                        ) : (
                            <SummaryBox>
                                {isRatesReady
                                    ? ratesLoading
                                        ? 'Calculating rates automatically...'
                                        : 'Rates will update automatically when recipient and package details are complete.'
                                    : 'Please provide sender and recipient addresses and package details to see estimated delivery and total cost.'}
                            </SummaryBox>
                        )}
                    </SectionCard>

                    <div style={{ fontSize: 11, color: 'var(--Gray)', marginBottom: 12 }}>
                        By clicking Finalize, you accept the Terms of Use and FedEx Service Guide.
                    </div>
                    <BottonCustom
                        title="Finalize Shipment"
                        height={44}
                        backgroundColor="#0C79F7"
                        color="#fff"
                        fontSize={15}
                        fontWeight={600}
                        onClick={handleFinalize}
                    />
                </div>
            </ContentGrid>
        </PageWrapper>
    );
};

export default CreateShipment;
