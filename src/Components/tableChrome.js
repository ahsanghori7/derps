export const STATUS_CHIP_TONES = {
    success: { color: '#4AC411', backgroundColor: 'rgba(74, 196, 17, 0.2)' },
    warning: { color: '#FE6901', backgroundColor: 'rgba(254, 105, 1, 0.2)' },
    info: { color: '#17A2B8', backgroundColor: 'rgba(23, 162, 184, 0.2)' },
    amber: { color: '#FFB300', backgroundColor: 'rgba(255, 179, 0, 0.2)' },
    purple: { color: '#7E57C2', backgroundColor: 'rgba(126, 87, 194, 0.2)' },
    neutral: { color: '#64748B', backgroundColor: 'rgba(100, 116, 139, 0.16)' },
    danger: { color: '#EF3826', backgroundColor: 'rgba(239, 56, 38, 0.2)' },
};

const TONE_BY_STATUS = {
    active: 'success',
    completed: 'success',
    paid: 'success',
    approved: 'success',
    accepted: 'success',
    complete: 'success',
    received: 'success',
    assigned: 'success',
    'deployment-completed': 'success',

    pending: 'warning',
    'un-paid': 'warning',
    unpaid: 'warning',
    live: 'warning',
    'verification-required': 'warning',
    incomplete: 'warning',
    working: 'warning',
    available: 'warning',

    uw: 'amber',
    posted: 'amber',
    'under-review': 'amber',
    'in-progress': 'amber',

    signed: 'purple',
    partial: 'purple',
    'on-hold': 'purple',
    'ready-for-qa': 'purple',
    'ready-for-approval': 'purple',
    'ui-completed': 'purple',
    'api-completed': 'purple',

    submitted: 'info',
    'ready-for-deployment': 'info',
    'qa-in-progress': 'info',

    draft: 'neutral',
    save: 'neutral',

    'declined-rejected': 'danger',
    declined: 'danger',
    rejected: 'danger',
    cancelled: 'danger',
    canceled: 'danger',
    'in-active': 'danger',
    inactive: 'danger',
    'suspicious-activity': 'danger',
    'not-received': 'danger',
    'not-completed': 'danger',
    'failed-qa': 'danger',
};

export const normalizeStatusKey = (status) => (
    String(status ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-')
);

export const getStatusChipTone = (status) => {
    const key = normalizeStatusKey(status);
    if (!key) return STATUS_CHIP_TONES.neutral;
    const tone = TONE_BY_STATUS[key] || 'danger';
    return STATUS_CHIP_TONES[tone];
};

export const tableHeadCellStyle = {
    backgroundColor: 'var(--navbar-dropdown-hover)',
    color: 'var(--sidebar-text-selected)',
    fontWeight: 700,
    lineHeight: '1.2',
    fontSize: 12,
};

export const tableBodyFontSize = 12;
