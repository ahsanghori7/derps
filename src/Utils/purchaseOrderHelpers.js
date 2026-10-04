import { getUserDisplayName } from './profile';
import { formatUsDate } from './dateFormat';

const PO_SERIAL_KEYS = [
  'poSerialNo',
  'derpsSerialNo',
  'poSerialNumber',
  'derpsSerialNumber',
];

export const getPoSerialNo = (po) => {
  if (!po) return null;

  for (const key of PO_SERIAL_KEYS) {
    const value = po?.[key];
    if (value !== undefined && value !== null && value !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
  }

  // API may not yet expose a dedicated DERPS serial — use PO id as fallback.
  const id = po?.id;
  if (id !== undefined && id !== null && id !== '') {
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : id;
  }

  return null;
};

export const formatPoSerialDisplay = (po) => {
  const serial = getPoSerialNo(po);
  if (serial === null || serial === undefined || serial === '') return '—';
  return `#${serial}`;
};

export const formatPoDropdownLabel = (po) => {
  const serial = getPoSerialNo(po);
  const poNo = String(po?.poNo || '').trim();
  if (serial !== null && serial !== undefined && serial !== '') {
    return poNo ? `#${serial} — PO: ${poNo}` : `#${serial}`;
  }
  return poNo || '—';
};

export const getDerpsEntryDate = (po) => (
  po?.derpsEntryDate
  ?? po?.enteredAt
  ?? po?.entryDate
  ?? po?.createdAt
  ?? null
);

export const sortPurchaseOrdersBySerialDesc = (list) => {
  const rows = Array.isArray(list) ? [...list] : [];
  return rows.sort((a, b) => {
    const serialA = Number(getPoSerialNo(a));
    const serialB = Number(getPoSerialNo(b));
    if (Number.isFinite(serialA) && Number.isFinite(serialB) && serialA !== serialB) {
      return serialB - serialA;
    }
    const dateA = new Date(getDerpsEntryDate(a) || 0).getTime();
    const dateB = new Date(getDerpsEntryDate(b) || 0).getTime();
    return dateB - dateA;
  });
};

export const getReceivedByName = (user) => getUserDisplayName(user);

export const getTodayDateString = () => formatUsDate(new Date(), { empty: '' });

export const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

export const buildReceiveInventoryMetadata = (user) => {
  const receivedBy = user?.id;
  if (!receivedBy) return {};
  return {
    receivedBy,
    receivedByName: getUserDisplayName(user),
    receivedDate: getTodayIsoDate(),
  };
};

export const buildAssignmentMetadata = (user) => {
  const assignedBy = user?.id;
  if (!assignedBy) return {};
  return {
    assignedBy,
    assignedByName: getUserDisplayName(user),
    assignedDate: new Date().toISOString(),
  };
};

export const invoiceHasSerialAssignment = (lineItems = []) => (
  (Array.isArray(lineItems) ? lineItems : []).some((item) => {
    const ids = item?.itemSerialIds;
    return Array.isArray(ids) && ids.length > 0;
  })
);

export const applyAssignmentMetadataIfNeeded = (apiData, lineItems, user) => {
  if (!invoiceHasSerialAssignment(lineItems)) return apiData;
  return { ...apiData, ...buildAssignmentMetadata(user) };
};
