export const getSerialReceivedByName = (serial) => (
  serial?.receivedByName
  ?? serial?.receivedBy?.name
  ?? serial?.receivedByUser?.name
  ?? (typeof serial?.receivedBy === 'string' ? serial.receivedBy : null)
  ?? '—'
);

export const getSerialAssignedByName = (serial) => (
  serial?.assignedByName
  ?? serial?.assignedBy?.name
  ?? serial?.assignedByUser?.name
  ?? (typeof serial?.assignedBy === 'string' ? serial.assignedBy : null)
  ?? '—'
);

export const getSerialAssignedDate = (serial) => (
  serial?.dateOfAssigned
  ?? serial?.assignedDate
  ?? serial?.assignedAt
  ?? null
);

export { formatUsDate as formatShortDate } from './dateFormat';
