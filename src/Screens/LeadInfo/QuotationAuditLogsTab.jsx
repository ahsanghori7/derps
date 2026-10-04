import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Loader from '../../Components/Loader';
import { fetchCrmQuotationAuditLogs } from '../SalesFormBuilder/formDefinitionApi';

const formatTimelineDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatAuditLogAction = (log) => {
    if (log?.actionLabel) return log.actionLabel;
    const action = log?.action ?? log?.event ?? log?.type ?? log?.activity ?? 'Updated';
    return String(action)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getAuditLogDescription = (log) =>
    log?.summary
    || log?.description
    || log?.message
    || '';

const getAuditLogActor = (log) =>
    log?.performer?.name
    || log?.userName
    || log?.user?.name
    || log?.performedBy?.name
    || log?.createdBy?.name
    || log?.actor
    || log?.userEmail
    || 'System';

const getAuditLogDate = (log) =>
    log?.performedAtLabel
    || formatTimelineDate(log?.performedAt)
    || formatTimelineDate(log?.createdAt)
    || formatTimelineDate(log?.updatedAt)
    || formatTimelineDate(log?.timestamp)
    || '';

const getChangeSummary = (log) => {
    if (Array.isArray(log?.changeSummary) && log.changeSummary.length > 0) {
        return log.changeSummary;
    }

    const changes = log?.changes;
    if (!changes || typeof changes !== 'object') return [];

    const next = changes.new ?? changes.after ?? {};
    const prev = changes.old ?? changes.before ?? {};
    const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])];

    return keys.map((field) => ({
        field,
        label: field
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim(),
        from: prev[field] ?? '—',
        to: next[field] ?? '—',
    }));
};

const formatChangeValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const QuotationAuditLogsTab = ({ quotationId, active }) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!active || !quotationId || !accessToken) return;

        setLoading(true);
        fetchCrmQuotationAuditLogs(quotationId, accessToken)
            .then((result) => {
                setAuditLogs(Array.isArray(result) ? result : []);
            })
            .catch(() => {
                setAuditLogs([]);
                toast.error('Failed to load quotation logs');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [active, quotationId, accessToken]);

    if (!quotationId) {
        return (
            <Typography sx={{ color: '#666', fontSize: 14 }}>
                No quotation found to show logs.
            </Typography>
        );
    }

    if (loading) {
        return <Loader message="Loading logs..." subMessage="Please wait" />;
    }

    if (auditLogs.length === 0) {
        return (
            <Typography sx={{ color: '#666', fontSize: 14 }}>
                No logs found for this quotation.
            </Typography>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {auditLogs.map((log, index) => {
                const description = getAuditLogDescription(log);
                const changeSummary = getChangeSummary(log);
                const dateLabel = getAuditLogDate(log);

                return (
                    <Box
                        key={log?.id || `audit-log-${index}`}
                        sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: 'var(--dashboard-tab-box)',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 2,
                                flexWrap: 'wrap',
                                mb: description || changeSummary.length ? 0.75 : 0,
                            }}
                        >
                            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                                {formatAuditLogAction(log)}
                                {log?.moduleLabel ? (
                                    <Typography
                                        component="span"
                                        sx={{ color: '#64748B', fontWeight: 400, fontSize: 12, ml: 1 }}
                                    >
                                        · {log.moduleLabel}
                                    </Typography>
                                ) : null}
                            </Typography>
                            {dateLabel ? (
                                <Typography sx={{ color: '#666', fontSize: 12 }}>
                                    {dateLabel}
                                </Typography>
                            ) : null}
                        </Box>
                        <Typography sx={{ color: '#64748B', fontSize: 12, mb: description || changeSummary.length ? 0.5 : 0 }}>
                            By {getAuditLogActor(log)}
                        </Typography>
                        {description ? (
                            <Typography sx={{ color: '#374151', fontSize: 13, whiteSpace: 'pre-wrap', mb: changeSummary.length ? 1 : 0 }}>
                                {description}
                            </Typography>
                        ) : null}
                        {changeSummary.length > 0 ? (
                            <Box
                                sx={{
                                    mt: 0.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                    p: 1.25,
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(148, 163, 184, 0.12)',
                                }}
                            >
                                {changeSummary.map((change, changeIndex) => (
                                    <Box
                                        key={`${log?.id || index}-change-${change?.field || changeIndex}`}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
                                            gap: { xs: 0.25, sm: 1 },
                                            alignItems: 'start',
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                                            {change?.label || change?.field || 'Field'}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, color: '#334155', wordBreak: 'break-word' }}>
                                            <Box component="span" sx={{ color: '#94A3B8' }}>
                                                {formatChangeValue(change?.from)}
                                            </Box>
                                            {' → '}
                                            <Box component="span" sx={{ fontWeight: 600, color: '#0F172A' }}>
                                                {formatChangeValue(change?.to)}
                                            </Box>
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        ) : null}
                    </Box>
                );
            })}
        </Box>
    );
};

export default QuotationAuditLogsTab;
