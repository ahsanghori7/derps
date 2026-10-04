import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Pagination,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'react-toastify';
import Heading from '../../Components/Heading';
import Loader from '../../Components/Loader';
import NoDataFound from '../../Components/NoDataFound';
import FilterDropdown from '../../Components/FilterDropdown';
import BottonCustom from '../../Components/ButtonCustom';
import { usePageTitle } from '../../Hooks/usePageTitle';
import { fetchAuditLogs } from '../../Api/auditLogApi';
import {
  canAccessAuditLog,
  filterAuditModulesByTenantFeatures,
} from '../../Utils/tenantFeatures';

const ACTION_OPTIONS = [
  { label: 'All Actions', value: 'all' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'View', value: 'view' },
];

const ACTION_COLORS = {
  create: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' },
  update: { bg: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' },
  delete: { bg: 'rgba(239, 68, 68, 0.2)', color: '#F87171' },
  view: { bg: 'rgba(148, 163, 184, 0.25)', color: 'var(--dashboard-text-secondary)' },
};

const parseAuditLogFilters = (pathname) => {
  const segs = pathname.split('/').filter(Boolean);
  const base = segs.indexOf('auditLog');
  const result = {
    modules: [],
    action: null,
    entityId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
  };
  if (base === -1) return result;

  const rest = segs.slice(base + 1);
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (key === 'module' && value && value !== 'all') {
      result.modules = value.split(',').map((m) => decodeURIComponent(m)).filter(Boolean);
    } else if (key === 'action' && value && value !== 'all') {
      result.action = decodeURIComponent(value);
    } else if (key === 'entityId') {
      result.entityId = decodeURIComponent(value);
    } else if (key === 'startDate') {
      result.startDate = value;
    } else if (key === 'endDate') {
      result.endDate = value;
    } else if (key === 'page') {
      result.page = parseInt(value, 10) || 1;
    } else if (key === 'limit') {
      result.limit = parseInt(value, 10) || 20;
    }
  }
  return result;
};

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

const formatActionLabel = (log) => {
  if (log?.actionLabel) return log.actionLabel;
  const action = log?.action ?? log?.event ?? log?.type ?? log?.activity ?? 'Updated';
  return String(action)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getActionKey = (log) =>
  String(log?.action ?? log?.event ?? log?.type ?? '')
    .trim()
    .toLowerCase();

const getDescription = (log) =>
  log?.summary || log?.description || log?.message || '';

const getActor = (log) =>
  log?.performer?.name
  || log?.userName
  || log?.user?.name
  || log?.performedBy?.name
  || log?.createdBy?.name
  || log?.actor
  || log?.userEmail
  || 'System';

const getDateLabel = (log) =>
  log?.performedAtLabel
  || formatTimelineDate(log?.performedAt)
  || formatTimelineDate(log?.createdAt)
  || formatTimelineDate(log?.updatedAt)
  || formatTimelineDate(log?.timestamp)
  || '';

const getModuleLabel = (log) =>
  log?.moduleLabel
  || log?.module
  || log?.entityType
  || log?.entity
  || '';

const getEntityId = (log) =>
  log?.entityId
  ?? log?.recordId
  ?? log?.resourceId
  ?? log?.refId
  ?? null;

const formatChangeValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const getChangeSummary = (log) => {
  if (Array.isArray(log?.changeSummary) && log.changeSummary.length > 0) {
    return log.changeSummary;
  }

  const changes = log?.changes;
  if (!changes || typeof changes !== 'object') return [];

  const next = changes.new ?? changes.after ?? {};
  const prev = changes.old ?? changes.before ?? {};

  if (Array.isArray(changes)) {
    return changes.map((change) => ({
      field: change?.field ?? change?.key,
      label: change?.label
        || String(change?.field ?? change?.key ?? 'Field')
          .replace(/([A-Z])/g, ' $1')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase())
          .trim(),
      from: change?.from ?? change?.old ?? change?.before ?? '—',
      to: change?.to ?? change?.new ?? change?.after ?? '—',
    }));
  }

  const keys = [...new Set([...Object.keys(prev || {}), ...Object.keys(next || {})])];
  return keys.map((field) => ({
    field,
    label: field
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim(),
    from: prev?.[field] ?? '—',
    to: next?.[field] ?? '—',
  }));
};

const datePickerSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--dashboard-text-primary)',
    height: 40,
    '& fieldset': {
      borderColor: 'var(--dashboard-border)',
    },
    '&:hover fieldset': {
      borderColor: 'var(--dashboard-border)',
    },
  },
  '& .MuiInputBase-input': {
    color: 'var(--dashboard-text-primary)',
  },
  '& .MuiSvgIcon-root': {
    color: 'var(--dashboard-text-secondary)',
  },
};

const filterFieldSx = {
  mt: 0.5,
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--dashboard-text-primary)',
    height: 40,
    '& fieldset': {
      borderColor: 'var(--dashboard-border)',
    },
    '&:hover fieldset': {
      borderColor: 'var(--dashboard-border)',
    },
  },
  '& .MuiInputBase-input': {
    color: 'var(--dashboard-text-primary)',
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'var(--dashboard-text-secondary)',
    opacity: 0.8,
  },
};

const AuditLogCard = ({ log, index }) => {
  const [expanded, setExpanded] = useState(false);
  const actionKey = getActionKey(log);
  const actionStyle = ACTION_COLORS[actionKey] || ACTION_COLORS.update;
  const description = getDescription(log);
  const changeSummary = getChangeSummary(log);
  const dateLabel = getDateLabel(log);
  const moduleLabel = getModuleLabel(log);
  const entityId = getEntityId(log);
  const hasDetails = Boolean(description) || changeSummary.length > 0;

  return (
    <Box
      sx={{
        position: 'relative',
        pl: { xs: 0, sm: 3.5 },
        pb: 2,
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', sm: 'block' },
          position: 'absolute',
          left: 10,
          top: 18,
          bottom: 0,
          width: 2,
          backgroundColor: 'rgba(148, 163, 184, 0.35)',
        }}
      />
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          position: 'absolute',
          left: 4,
          top: 18,
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: actionStyle.color,
          border: '2px solid var(--dashboard-bg)',
          boxShadow: `0 0 0 3px ${actionStyle.bg}`,
          zIndex: 1,
        }}
      />

      <Box
        sx={{
          p: 2,
          borderRadius: '12px',
          border: '1px solid var(--dashboard-border)',
          backgroundColor: 'var(--dashboard-tab-box)',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            borderColor: 'var(--dashboard-border)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={formatActionLabel(log)}
              sx={{
                height: 24,
                fontWeight: 600,
                fontSize: 12,
                backgroundColor: actionStyle.bg,
                color: actionStyle.color,
              }}
            />
            {moduleLabel ? (
              <Chip
                size="small"
                label={String(moduleLabel).replace(/[_-]+/g, ' ')}
                sx={{
                  height: 24,
                  fontSize: 12,
                  textTransform: 'capitalize',
                  backgroundColor: 'var(--dashboard-badge-bg)',
                  color: 'var(--dashboard-text-primary)',
                }}
              />
            ) : null}
            {entityId != null && entityId !== '' ? (
              <Typography sx={{ fontSize: 12, color: 'var(--dashboard-text-secondary)' }}>
                ID #{entityId}
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {dateLabel ? (
              <Typography sx={{ fontSize: 12, color: 'var(--dashboard-text-secondary)', whiteSpace: 'nowrap' }}>
                {dateLabel}
              </Typography>
            ) : null}
            {hasDetails ? (
              <IconButton
                size="small"
                onClick={() => setExpanded((prev) => !prev)}
                aria-label="Toggle details"
                sx={{ color: 'var(--dashboard-text-secondary)' }}
              >
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            ) : null}
          </Box>
        </Box>

        <Typography sx={{ mt: 1, fontSize: 13, color: 'var(--dashboard-text-secondary)' }}>
          By <Box component="span" sx={{ fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>{getActor(log)}</Box>
        </Typography>

        {description && !expanded ? (
          <Typography
            sx={{
              mt: 0.75,
              fontSize: 13,
              color: 'var(--dashboard-text-primary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        ) : null}

        <Collapse in={expanded || (!hasDetails && Boolean(description))}>
          {description ? (
            <Typography sx={{ mt: 1, fontSize: 13, color: 'var(--dashboard-text-primary)', whiteSpace: 'pre-wrap' }}>
              {description}
            </Typography>
          ) : null}

          {changeSummary.length > 0 ? (
            <Box
              sx={{
                mt: 1.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                p: 1.5,
                borderRadius: '8px',
                backgroundColor: 'var(--dashboard-bg)',
                border: '1px solid var(--dashboard-border)',
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--dashboard-text-secondary)', mb: 0.25 }}>
                Changes
              </Typography>
              {changeSummary.map((change, changeIndex) => (
                <Box
                  key={`${log?.id || index}-change-${change?.field || changeIndex}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' },
                    gap: { xs: 0.25, sm: 1 },
                    alignItems: 'start',
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-secondary)' }}>
                    {change?.label || change?.field || 'Field'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--dashboard-text-primary)', wordBreak: 'break-word' }}>
                    <Box component="span" sx={{ color: 'var(--dashboard-text-secondary)' }}>
                      {formatChangeValue(change?.from)}
                    </Box>
                    {' → '}
                    <Box component="span" sx={{ fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>
                      {formatChangeValue(change?.to)}
                    </Box>
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : null}
        </Collapse>
      </Box>
    </Box>
  );
};

const AuditLog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const tenantFeatures = useSelector((state) => state.auth.tenantFeatures ?? []);
  const auditLogModules = useSelector((state) => state.auth.auditLogModules ?? []);

  usePageTitle('Audit Log', location);

  const [initFilters] = useState(() => parseAuditLogFilters(location.pathname));
  const [selectedModules, setSelectedModules] = useState(initFilters.modules);
  const [selectedAction, setSelectedAction] = useState(initFilters.action);
  const [entityId, setEntityId] = useState(initFilters.entityId);
  const [entityIdInput, setEntityIdInput] = useState(initFilters.entityId);
  const [startDate, setStartDate] = useState(initFilters.startDate);
  const [endDate, setEndDate] = useState(initFilters.endDate);
  const [page, setPage] = useState(initFilters.page);
  const [rowsPerPage, setRowsPerPage] = useState(initFilters.limit);
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const accessibleModules = useMemo(
    () => filterAuditModulesByTenantFeatures(auditLogModules, tenantFeatures),
    [auditLogModules, tenantFeatures]
  );

  const hasAuditAccess = useMemo(
    () => canAccessAuditLog(auditLogModules, tenantFeatures),
    [auditLogModules, tenantFeatures]
  );

  const allowedModuleValues = useMemo(
    () => new Set(accessibleModules.map((m) => String(m.value))),
    [accessibleModules]
  );

  const moduleOptions = useMemo(
    () => accessibleModules.map((m) => ({ label: m.label, value: m.value })),
    [accessibleModules]
  );

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / (rowsPerPage || 20)));

  // Drop selected modules that the tenant no longer has access to
  useEffect(() => {
    setSelectedModules((prev) => {
      const next = (Array.isArray(prev) ? prev : []).filter((value) =>
        allowedModuleValues.has(String(value))
      );
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) {
        return prev;
      }
      return next;
    });
  }, [allowedModuleValues]);

  const loadLogs = useCallback(() => {
    if (!accessToken || !hasAuditAccess) return;
    setLoading(true);

    const modulesForQuery =
      selectedModules.length > 0
        ? selectedModules
        : accessibleModules.map((m) => m.value);

    fetchAuditLogs(accessToken, {
      module: modulesForQuery,
      action: selectedAction,
      entityId: entityId?.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: rowsPerPage,
    })
      .then((result) => {
        setLogs(result.logs || []);
        setTotalCount(result.totalCount || 0);
      })
      .catch(() => {
        setLogs([]);
        setTotalCount(0);
        toast.error('Failed to load audit logs');
      })
      .finally(() => setLoading(false));
  }, [
    accessToken,
    hasAuditAccess,
    selectedModules,
    accessibleModules,
    selectedAction,
    entityId,
    startDate,
    endDate,
    page,
    rowsPerPage,
  ]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Sync URL → state on browser back/forward
  useEffect(() => {
    const next = parseAuditLogFilters(location.pathname);
    setSelectedModules(next.modules);
    setSelectedAction(next.action);
    setEntityId(next.entityId);
    setEntityIdInput(next.entityId);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setPage(next.page);
    setRowsPerPage(next.limit);
  }, [location.pathname]);

  // Sync state → URL
  useEffect(() => {
    const pathSegments = ['/home', 'auditLog'];
    if (selectedModules.length > 0) {
      pathSegments.push('module', selectedModules.map(encodeURIComponent).join(','));
    }
    if (selectedAction) pathSegments.push('action', encodeURIComponent(selectedAction));
    if (entityId) pathSegments.push('entityId', encodeURIComponent(entityId));
    if (startDate) pathSegments.push('startDate', startDate);
    if (endDate) pathSegments.push('endDate', endDate);
    if (page > 1) pathSegments.push('page', String(page));
    if (rowsPerPage !== 20) pathSegments.push('limit', String(rowsPerPage));

    const newPath = pathSegments.join('/');
    if (newPath !== location.pathname) {
      navigate(newPath, { replace: true });
    }
  }, [
    selectedModules,
    selectedAction,
    entityId,
    startDate,
    endDate,
    page,
    rowsPerPage,
    navigate,
    location.pathname,
  ]);

  const handleClear = () => {
    setSelectedModules([]);
    setSelectedAction(null);
    setEntityId('');
    setEntityIdInput('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const applyEntityId = () => {
    setEntityId(entityIdInput.trim());
    setPage(1);
  };

  if (!hasAuditAccess) {
    return (
      <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
        <Heading
          Fontweight={700}
          color={'var(--sidebar-text-primary)'}
          Heading={'Audit Log'}
          Fontsize={30}
        />
        <div className="text-center w-full mx-auto mt-10">
          <NoDataFound
            title="Audit Log Unavailable"
            description="No audit modules are enabled for this tenant."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
      <Heading
        Fontweight={700}
        color={'var(--sidebar-text-primary)'}
        Heading={'Audit Log'}
        Fontsize={30}
      />
      <Typography sx={{ mt: -1, mb: 2, fontSize: 14, color: 'var(--dashboard-text-secondary)' }}>
        Track create, update, and delete activity across modules.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: 2,
          p: 2,
          borderRadius: '12px',
          backgroundColor: 'var(--dashboard-tab-box)',
          border: '1px solid var(--dashboard-border)',
        }}
      >
        <FilterDropdown
          label="Modules"
          multiple
          value={selectedModules}
          onChange={(next) => {
            const values = Array.isArray(next) ? next.filter((v) => v && v !== 'all') : [];
            setSelectedModules(values);
            setPage(1);
          }}
          options={moduleOptions}
          placeholder={
            moduleOptions.length === 0
              ? 'No modules available'
              : 'Select modules'
          }
          minWidth={220}
          searchable
          searchPlaceholder="Search module..."
        />

        <FilterDropdown
          label="Action"
          value={selectedAction ?? 'all'}
          onChange={(next) => {
            const effective = String(next) === 'all' ? null : next;
            setSelectedAction(effective);
            setPage(1);
          }}
          options={ACTION_OPTIONS}
          placeholder="Select action"
          minWidth={160}
          placeholderValues={['all']}
        />

        <div style={{ minWidth: 160 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>
            Entity ID
          </label>
          <TextField
            size="small"
            fullWidth
            value={entityIdInput}
            placeholder="e.g. 482"
            onChange={(e) => setEntityIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyEntityId();
            }}
            onBlur={applyEntityId}
            sx={filterFieldSx}
          />
        </div>

        <div style={{ minWidth: 170 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>
            Start Date
          </label>
          <div className="mt-1" style={{ width: '100%' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                format="MM/DD/YYYY"
                value={startDate ? dayjs(startDate) : null}
                onChange={(value) => {
                  setStartDate(value ? dayjs(value).format('YYYY-MM-DD') : '');
                  setPage(1);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    InputLabelProps: { shrink: true },
                    sx: datePickerSx,
                  },
                }}
              />
            </LocalizationProvider>
          </div>
        </div>

        <div style={{ minWidth: 170 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>
            End Date
          </label>
          <div className="mt-1" style={{ width: '100%' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                format="MM/DD/YYYY"
                value={endDate ? dayjs(endDate) : null}
                onChange={(value) => {
                  setEndDate(value ? dayjs(value).format('YYYY-MM-DD') : '');
                  setPage(1);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    InputLabelProps: { shrink: true },
                    sx: datePickerSx,
                  },
                }}
              />
            </LocalizationProvider>
          </div>
        </div>

        <FilterDropdown
          label="Rows"
          value={String(rowsPerPage)}
          onChange={(next) => {
            setRowsPerPage(parseInt(next, 10) || 20);
            setPage(1);
          }}
          options={[
            { label: '10', value: '10' },
            { label: '20', value: '20' },
            { label: '50', value: '50' },
            { label: '100', value: '100' },
          ]}
          placeholder="Rows"
          minWidth={110}
        />

        <div>
          <BottonCustom
            backgroundColor={''}
            width={120}
            title={'Clear'}
            height={40}
            color={'var(--sidebar-text-selected)'}
            fontSize={16}
            fontWeight={500}
            className={'bg-gray-500'}
            onClick={handleClear}
          />
        </div>
      </Box>

      {loading ? (
        <div className="text-center w-full mx-auto mt-10">
          <Loader message="Loading audit logs..." subMessage="Please wait" />
        </div>
      ) : logs.length > 0 ? (
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 0.5, sm: 1 }, pb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.5,
              px: 0.5,
            }}
          >
            <Typography sx={{ fontSize: 13, color: 'var(--dashboard-text-secondary)' }}>
              Showing {(page - 1) * rowsPerPage + 1}
              –
              {Math.min(page * rowsPerPage, totalCount)} of {totalCount} entries
            </Typography>
          </Box>

          {logs.map((log, index) => (
            <AuditLogCard key={log?.id || `audit-log-${index}`} log={log} index={index} />
          ))}

          {totalPages > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, nextPage) => setPage(nextPage)}
                color="primary"
                shape="rounded"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: 'var(--dashboard-text-primary)',
                  },
                }}
              />
            </Box>
          ) : null}
        </Box>
      ) : (
        <div className="text-center w-full mx-auto mt-10">
          <NoDataFound title="No Audit Logs" description="No logs match your current filters." />
        </div>
      )}
    </div>
  );
};

export default AuditLog;
