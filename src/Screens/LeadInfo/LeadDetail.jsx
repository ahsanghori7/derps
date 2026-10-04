import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken, deleteRequest } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import Loader from '../../Components/Loader';
import NoDataFound from '../../Components/NoDataFound';
import DeleteConfirmationModal from '../../Components/DeleteModal';
import { toast } from 'react-toastify';
import { useSocket } from '../../Contexts/SocketContext';
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_COLORS,
  CALL_OUTCOMES,
  createLeadActivity,
  createLeadMeeting,
  createLeadMeetingLink,
  fetchActivityById,
  fetchLeadActivities,
  formatCallDuration,
  getActivityTypeLabel,
  getCallOutcomeLabel,
  getNowDatetimeLocal,
  getTomorrowDatetimeLocal,
  scheduleLeadFollowUp,
  sendLeadEmail,
} from './crmActivityApi';
import {
  clickToCall,
  getGotoLines,
  getMyGotoLine,
  isGotoLineRequiredError,
  isGotoMissingPhoneError,
  isGotoNotConnectedError,
  isGotoPermissionError,
  parseGotoErrorMessage,
  reconcileGotoCallEvents,
  setMyGotoLine,
} from '../../Api/gotoApi';
import { 
  Box, 
  Typography, 
  Button, 
  Chip, 
  Tabs, 
  Tab, 
  Paper, 
  Grid, 
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  useTheme,
  TextField,
  Link,
  FormControl,
  FormControlLabel,
  Select,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { 
  ArrowBack,
  MoreVert,
  CheckCircle,
  RadioButtonUnchecked,
  Circle,
  Phone,
  Email,
  Language,
  Business,
  Person,
  MonetizationOn,
  LocationOn,
  Message,
  Close,
} from '@mui/icons-material';
import styled from '@mui/material/styles/styled';
import LeadPath, { getLeadStageInfo, getNextLeadStage, normalizeLeadStatusKey } from './LeadPath';
import LeadQualificationForm from './LeadQualificationForm';
import {
  pickOpportunityIdFromConvertResponse,
  pickOpportunityIdFromLeadRecord,
  buildCrmAccountPayloadFromLead,
  createCrmAccount,
  extractCreatedCrmAccountId,
  setOpportunityCrmAccountId,
} from '../SalesFormBuilder/formDefinitionApi';

const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  padding: '24px',
  marginBottom: '24px',
  backgroundColor: 'var(--dashboard-card-bg)',
}));

const StepContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '16px 0',
  marginBottom: '24px',
}));

const StepItem = styled(Box)(({ theme, status, active }) => {
  const getStatusColor = () => {
    if (active) return '#1976d2';
    if (status === 'completed') return '#2e7d32';
    return '#9e9e9e';
  };

  const getStatusBgColor = () => {
    if (active) return '#e3f2fd';
    if (status === 'completed') return '#e8f5e8';
    return '#f5f5f5';
  };

  return {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    padding: '12px 20px',
    borderRadius: '4px',
    backgroundColor: getStatusBgColor(),
    border: `1px solid ${getStatusColor()}`,
    cursor: 'pointer',
    opacity: active ? 1 : status === 'completed' ? 0.8 : 0.5,
    '&:hover': {
      opacity: 1,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      right: '-10px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '0',
      height: '0',
      borderTop: '10px solid transparent',
      borderBottom: '10px solid transparent',
      borderLeft: `10px solid ${getStatusColor()}`,
      zIndex: 1,
    },
    '&:last-child::after': {
      display: 'none',
    },
  };
});

const StepArrow = styled(Box)(({ theme, status }) => {
  const getStatusColor = () => {
    if (status === 'completed') return '#2e7d32';
    return '#e0e0e0';
  };

  return {
    width: '20px',
    height: '2px',
    backgroundColor: getStatusColor(),
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      right: '-5px',
      top: '-3px',
      width: '0',
      height: '0',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent',
      borderLeft: `8px solid ${getStatusColor()}`,
    },
  };
});

const InfoSection = styled(Box)(({ theme }) => ({
  marginBottom: '24px',
}));

const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginBottom: '16px',
  alignItems: 'flex-start',
}));

const InfoLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: 'var(--dashboard-text-secondary)',
  minWidth: '140px',
  marginRight: '16px',
  fontSize: '14px',
}));

const InfoValue = styled(Typography)(({ theme }) => ({
  color: 'var(--dashboard-text-primary)',
  fontSize: '14px',
  flex: 1,
}));

const StatusAlert = styled(Alert)(({ theme, severity }) => ({
  marginBottom: '24px',
  borderRadius: '8px',
  '& .MuiAlert-message': {
    fontWeight: 500,
  },
}));

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const HIDDEN_FIELD_KEYS = new Set([
  'id',
  'tenantId',
  'agentId',
  'agent',
  'convertedAccountId',
  'convertedApplicationId',
  'convertedAt',
  'convertedContactId',
  'convertedOpportunityId',
  'createdAt',
  'updatedAt',
  'formSubmissions',
  'forms',
  'formData',
  'formDefinition',
  'formDefinitionId',
  'formVersion',
  'entityType',
  'entityId',
  'submittedAt',
  'submittedBy',
]);

const CORE_LEAD_FIELD_KEYS = new Set([
  'fullName',
  'name',
  'businessName',
  'company',
  'phoneNumber',
  'phone',
  'mobile',
  'fax',
  'email',
  'website',
  'designation',
  'title',
  'services',
  'comments',
  'address',
  'street',
  'state',
  'postalCode',
  'country',
  'leadOwner',
  'annualRevenue',
  'industry',
  'leadStatus',
  'status',
  'statusText',
  'productInterest',
  'sicCode',
  'currentGenerator',
  'primary',
  'employees',
]);

const CORE_FIELD_LABELS = {
  fullName: 'Name',
  name: 'Name',
  businessName: 'Company Name',
  company: 'Company',
  phoneNumber: 'Phone',
  phone: 'Phone',
  mobile: 'Mobile',
  fax: 'Fax',
  email: 'Email',
  website: 'Website',
  designation: 'Title',
  title: 'Title',
  services: 'Services',
  comments: 'Comments',
  address: 'Address',
  street: 'Street',
  state: 'State',
  postalCode: 'Postal Code',
  country: 'Country',
  leadOwner: 'Lead Owner',
  annualRevenue: 'Annual Revenue',
  industry: 'Industry',
  leadStatus: 'Lead Status',
  status: 'Status',
  statusText: 'Status',
  productInterest: 'Product Interest',
  sicCode: 'SIC Code',
  currentGenerator: 'Current Generator(s)',
  primary: 'Primary',
  employees: 'No. of Employees',
};

const snakeCaseToTitleCase = (key = '') =>
  String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getFieldLabel = (key) => CORE_FIELD_LABELS[key] || snakeCaseToTitleCase(key);

const getAgentDisplayName = (itemData = {}) => {
  const agent = itemData?.agent;
  if (agent && typeof agent === 'object' && agent.name) return agent.name;
  if (typeof agent === 'string' && agent.trim()) return agent.trim();
  return null;
};

const buildAgentDisplayField = (itemData = {}) => {
  const agentName = getAgentDisplayName(itemData);
  if (!agentName) return null;
  return {
    key: 'agentName',
    label: 'Agent',
    value: agentName,
    rawValue: agentName,
  };
};

const mergeFormSubmissionData = (forms = []) =>
  (Array.isArray(forms) ? forms : []).reduce((acc, submission) => {
    if (submission?.data && typeof submission.data === 'object') {
      return { ...acc, ...submission.data };
    }
    return acc;
  }, {});

const mergeLeadRecordData = (itemData = {}, forms = []) => {
  const inlineFormData =
    itemData.formData && typeof itemData.formData === 'object' ? itemData.formData : {};
  const submissionData = mergeFormSubmissionData(forms);
  return { ...itemData, ...inlineFormData, ...submissionData };
};

const isEmptyDisplayValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

const formatArrayDisplayValue = (values = []) =>
  values
    .map((item) => {
      if (typeof item !== 'string') return String(item);
      return item
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    })
    .join(', ');

const formatDisplayValue = (value) => {
  if (isEmptyDisplayValue(value)) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return formatArrayDisplayValue(value);
  if (typeof value === 'object') {
    if (value.url) return value.name || value.url;
    if (value.name) return value.name;
    return JSON.stringify(value);
  }
  return String(value);
};

const isRenderableFormField = (field) => {
  const type = String(field?.type || '').toLowerCase();
  return type !== 'heading' && Boolean(field?.apiName);
};

const getSubmissionTimestamp = (submission) =>
  new Date(submission?.submittedAt || 0).getTime();

const getSectionKey = (section = {}) => section.id || section.title || 'details';

const buildFormFieldDisplay = (field, data = {}) => {
  const key = field.apiName;
  const rawValue = data[key];
  return {
    key,
    label: field.label || getFieldLabel(key),
    value: formatDisplayValue(rawValue),
    rawValue,
    masked: Boolean(field.masked),
  };
};

const buildFormDisplaySections = (forms = []) => {
  const submissions = (Array.isArray(forms) ? forms : [])
    .slice()
    .sort((a, b) => getSubmissionTimestamp(b) - getSubmissionTimestamp(a));

  if (!submissions.length) return [];

  const mergedData = submissions
    .slice()
    .sort((a, b) => getSubmissionTimestamp(a) - getSubmissionTimestamp(b))
    .reduce((acc, submission) => {
      if (submission?.data && typeof submission.data === 'object') {
        return { ...acc, ...submission.data };
      }
      return acc;
    }, {});

  const latestSubmission =
    submissions.find((submission) => submission?.formDefinition?.status === 'published') ||
    submissions[0];
  const latestSchemaSections = latestSubmission?.formDefinition?.schema?.sections || [];

  const latestFieldApiNames = new Set();
  latestSchemaSections.forEach((section) => {
    (section.fields || []).forEach((field) => {
      if (isRenderableFormField(field)) {
        latestFieldApiNames.add(field.apiName);
      }
    });
  });

  const sectionMap = new Map();

  const addFieldToSection = (sectionKey, sectionMeta, displayField) => {
    if (isEmptyDisplayValue(displayField.rawValue)) return;

    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, {
        id: sectionMeta.id || sectionKey,
        title: sectionMeta.title || 'Details',
        fields: [],
        fieldKeys: new Set(),
      });
    }

    const sectionEntry = sectionMap.get(sectionKey);
    if (sectionEntry.fieldKeys.has(displayField.key)) return;

    sectionEntry.fieldKeys.add(displayField.key);
    sectionEntry.fields.push(displayField);
  };

  latestSchemaSections.forEach((section) => {
    const sectionKey = getSectionKey(section);
    (section.fields || [])
      .filter(isRenderableFormField)
      .forEach((field) => {
        addFieldToSection(sectionKey, section, buildFormFieldDisplay(field, mergedData));
      });
  });

  submissions
    .filter((submission) => submission !== latestSubmission)
    .forEach((submission) => {
      const schemaSections = submission?.formDefinition?.schema?.sections || [];
      schemaSections.forEach((section) => {
        (section.fields || [])
          .filter(isRenderableFormField)
          .forEach((field) => {
            if (latestFieldApiNames.has(field.apiName)) return;
            addFieldToSection(
              getSectionKey(section),
              section,
              buildFormFieldDisplay(field, mergedData)
            );
          });
      });
    });

  const orderedSectionKeys = [];
  const seenSectionKeys = new Set();

  latestSchemaSections.forEach((section) => {
    const sectionKey = getSectionKey(section);
    if (seenSectionKeys.has(sectionKey)) return;
    seenSectionKeys.add(sectionKey);
    orderedSectionKeys.push(sectionKey);
  });

  sectionMap.forEach((_section, sectionKey) => {
    if (seenSectionKeys.has(sectionKey)) return;
    seenSectionKeys.add(sectionKey);
    orderedSectionKeys.push(sectionKey);
  });

  return orderedSectionKeys
    .map((sectionKey) => sectionMap.get(sectionKey))
    .filter((section) => section?.fields?.length)
    .map(({ id, title, fields }) => ({ id, title, fields }));
};

const buildCoreDisplayFields = (itemData = {}) => {
  const agentField = buildAgentDisplayField(itemData);
  const fields = Object.entries(itemData)
    .filter(
      ([key, value]) =>
        CORE_LEAD_FIELD_KEYS.has(key) &&
        !HIDDEN_FIELD_KEYS.has(key) &&
        !isEmptyDisplayValue(value)
    )
    .map(([key, value]) => ({
      key,
      label: getFieldLabel(key),
      value: formatDisplayValue(value),
      rawValue: value,
    }));

  return agentField ? [agentField, ...fields] : fields;
};

const buildDynamicDisplayFields = (itemData = {}, forms = []) => {
  const mergedData = mergeLeadRecordData(itemData, forms);
  const agentField = buildAgentDisplayField(mergedData);
  const fields = Object.entries(mergedData)
    .filter(([key, value]) => !HIDDEN_FIELD_KEYS.has(key) && !isEmptyDisplayValue(value))
    .map(([key, value]) => ({
      key,
      label: getFieldLabel(key),
      value: formatDisplayValue(value),
      rawValue: value,
    }));

  return agentField ? [agentField, ...fields] : fields;
};

const extractLeadResponse = (result) => {
  const payload = result?.data ?? result;
  if (!payload) return { lead: null, forms: [] };

  if (payload.lead) {
    return {
      lead: payload.lead,
      forms: payload.forms ?? payload.formSubmissions ?? [],
    };
  }

  const forms = payload.forms ?? payload.formSubmissions ?? [];
  const { forms: _forms, formSubmissions: _formSubmissions, ...leadFields } = payload;
  return {
    lead: Object.keys(leadFields).length ? leadFields : payload,
    forms: Array.isArray(forms) ? forms : [],
  };
};

const mapApiLeadToDetail = (itemData = {}, forms = []) => {
  const data = mergeLeadRecordData(itemData, forms);

  return {
    name: data.fullName || data.name || '-',
    company: data.businessName || data.company || '-',
    title: data.designation || data.title || '-',
    phone: data.phoneNumber || data.phone || '-',
    mobile: data.phoneNumber || data.mobile || '-',
    fax: data.fax || data.phoneNumber || '-',
    email: data.email || '-',
    website: data.website || 'N/A',
    agentName: getAgentDisplayName(data) || '-',
    leadOwner: data.leadOwner || '-',
    annualRevenue: data.annualRevenue || '-',
    industry: data.industry || '-',
    leadStatus: data.leadStatus || data.statusText || data.status || 'Working - Contacted',
    street: data.address || data.street || 'N/A',
    state: data.state || 'N/A',
    postalCode: data.postalCode || 'N/A',
    country: data.country || 'N/A',
    productInterest: data.services || data.productInterest || 'N/A',
    sicCode: data.sicCode || 'N/A',
    currentGenerator: data.currentGenerator || 'N/A',
    primary: data.primary || 'N/A',
    employees: data.employees || 'N/A',
  };
};

const renderFieldValue = (field) => {
  if (field.masked && !isEmptyDisplayValue(field.rawValue)) {
    return '••••••••';
  }

  if (field.rawValue && typeof field.rawValue === 'object' && field.rawValue.url) {
    return (
      <Link href={field.rawValue.url} target="_blank" rel="noopener noreferrer" underline="hover">
        {field.rawValue.name || 'View file'}
      </Link>
    );
  }

  return field.value;
};

const renderDisplayFieldRows = (fields = []) =>
  fields.map((field) => (
    <InfoRow key={field.key}>
      <InfoLabel>{field.label}</InfoLabel>
      <InfoValue>{renderFieldValue(field)}</InfoValue>
    </InfoRow>
  ));

const formatActivityTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDueDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatActivityDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getCallOutcomeStyle = (outcome) => {
  const key = String(outcome || '').toLowerCase();
  const styles = {
    answered: { backgroundColor: '#D1FAE5', color: '#10B981' },
    no_answer: { backgroundColor: '#FEF3C7', color: '#F59E0B' },
    busy: { backgroundColor: '#FEE2E2', color: '#EF4444' },
    voicemail: { backgroundColor: '#EDE9FE', color: '#8B5CF6' },
    wrong_number: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  };
  return styles[key] || { backgroundColor: '#F3F4F6', color: '#6B7280' };
};

const ActivityDetailRow = ({ label, children, alignStart = false }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 1.5,
      alignItems: alignStart ? 'flex-start' : 'center',
    }}
  >
    <Typography
      variant="caption"
      sx={{
        minWidth: 76,
        fontWeight: 600,
        color: 'var(--dashboard-text-secondary)',
        flexShrink: 0,
        pt: alignStart ? 0.25 : 0,
      }}
    >
      {label}
    </Typography>
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
  </Box>
);

const toIsoDueDate = (localDateTime) => {
  if (!localDateTime) return null;
  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const LEAD_STATUS_SLUG = { open: 'open', working: 'contacted', qualified: 'qualified', lost: 'closed' };
const statusKeyToSlug = (key) => LEAD_STATUS_SLUG[key] ?? 'open';
const GOTO_RECONCILE_LOOKBACK_HOURS = 2;

const sortActivitiesNewestFirst = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  return list.slice().sort((a, b) => {
    const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
    const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
};

const activityMatchesLead = (activity, leadId) => {
  if (!activity || leadId == null) return false;
  const entityType = String(activity.entityType || activity.entity_type || '').toLowerCase();
  const entityId = activity.entityId ?? activity.entity_id;
  if (entityType && entityType !== 'lead') return false;
  if (entityId == null) return true;
  return String(entityId) === String(leadId);
};

const LeadDetail = () => {
  const { id, stage: urlStagePart } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const { socket } = useSocket();
  const [tabValue, setTabValue] = useState(0);
  const [activitySubTab, setActivitySubTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leadRecord, setLeadRecord] = useState(null);
  const [leadForms, setLeadForms] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activitySubject, setActivitySubject] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityDueDate, setActivityDueDate] = useState(getTomorrowDatetimeLocal);
  const [activityCallAt, setActivityCallAt] = useState(getNowDatetimeLocal);
  const [activityCallDurationMinutes, setActivityCallDurationMinutes] = useState('');
  const [activityCallOutcome, setActivityCallOutcome] = useState('');
  const [activityCallNotes, setActivityCallNotes] = useState('');
  const [activityScheduledAt, setActivityScheduledAt] = useState(getNowDatetimeLocal);
  const [activitySendInvite, setActivitySendInvite] = useState(true);
  const [activityEmailCcList, setActivityEmailCcList] = useState([]);
  const [activityEmailCcInput, setActivityEmailCcInput] = useState('');
  const [activityEmailAttachments, setActivityEmailAttachments] = useState([]);
  const [activityMeetingLink, setActivityMeetingLink] = useState('');
  const [activityGeneratingLink, setActivityGeneratingLink] = useState(false);
  const [activitySendFollowUpEmail, setActivitySendFollowUpEmail] = useState(true);
  const [activitySubjectError, setActivitySubjectError] = useState(false);
  const [gotoCalling, setGotoCalling] = useState(false);
  const [gotoPolling, setGotoPolling] = useState(false);
  const [gotoActivityId, setGotoActivityId] = useState(null);
  const [gotoLine, setGotoLine] = useState(null);
  const [gotoLines, setGotoLines] = useState([]);
  const [gotoLinesLoading, setGotoLinesLoading] = useState(false);
  const [linePickerOpen, setLinePickerOpen] = useState(false);
  const [selectedGotoLineId, setSelectedGotoLineId] = useState('');
  const [gotoLineSaving, setGotoLineSaving] = useState(false);
  const [pendingCallAfterLine, setPendingCallAfterLine] = useState(false);
  const locationStateRef = useRef(location.state);
  const gotoActivityIdRef = useRef(null);

  const selectedActivityType = ACTIVITY_TYPES[activitySubTab]?.value || 'call';
  const isFollowUpActivity = selectedActivityType === 'follow_up';
  const isCallActivity = selectedActivityType === 'call';
  const isEmailActivity = selectedActivityType === 'email';
  const isMeetingActivity = selectedActivityType === 'meeting';

  const fetchActivities = useCallback(() => {
    if (!id || !accessToken) return Promise.resolve([]);

    setActivitiesLoading(true);
    return fetchLeadActivities(id, accessToken)
      .then((rows) => {
        const sorted = sortActivitiesNewestFirst(rows);
        setActivities(sorted);
        return sorted;
      })
      .catch(() => {
        setActivities([]);
        return [];
      })
      .finally(() => {
        setActivitiesLoading(false);
      });
  }, [id, accessToken]);

  const fetchLead = useCallback(() => {
    if (!id || !accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const apiUrl = `${baseURl}lead/${id}?includeForms=true`;

    getRequestWithOutBody(apiUrl, accessToken)
      .then((result) => {
        const { lead, forms } = extractLeadResponse(result);
        setLeadRecord(lead);
        setLeadForms(Array.isArray(forms) ? forms : []);
      })
      .catch(() => {
        const fallback = locationStateRef.current?.itemData || locationStateRef.current?.lead;
        if (fallback) {
          setLeadRecord(fallback);
          setLeadForms([]);
        } else {
          setLeadRecord(null);
          setLeadForms([]);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, accessToken]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  useEffect(() => {
    if (!loading && leadRecord) {
      const currentKey = normalizeLeadStatusKey(leadRecord?.status ?? leadRecord?.leadStatus ?? 'open');
      const expectedSlug = statusKeyToSlug(currentKey);
      if (urlStagePart !== expectedSlug) {
        const match = location.pathname.match(/^(.*\/lead\/[^/]+)/);
        const basePath = match ? match[1] : `/home/leadInfo/lead/${id}`;
        navigate(`${basePath}/${expectedSlug}`, { replace: true, state: locationStateRef.current });
      }
    }
  }, [leadRecord, loading, id, urlStagePart, navigate, location.pathname]);

  useEffect(() => {
    if (tabValue === 1) {
      fetchActivities();
    }
  }, [tabValue, fetchActivities]);

  useEffect(() => {
    if (!accessToken || tabValue !== 1) return;

    getMyGotoLine(accessToken)
      .then((line) => setGotoLine(line))
      .catch(() => setGotoLine(null));
  }, [accessToken, tabValue]);

  useEffect(() => {
    gotoActivityIdRef.current = gotoActivityId;
  }, [gotoActivityId]);

  useEffect(() => {
    if (!id || !accessToken) return;

    let cancelled = false;

    const syncMissedCallEvents = async () => {
      await fetchActivities();
      if (cancelled) return;

      try {
        await reconcileGotoCallEvents(accessToken, {
          lookbackHours: GOTO_RECONCILE_LOOKBACK_HOURS,
        });
      } catch {
        return;
      }

      if (!cancelled) {
        await fetchActivities();
      }
    };

    syncMissedCallEvents();

    return () => {
      cancelled = true;
    };
  }, [id, accessToken, fetchActivities]);

  useEffect(() => {
    if (!socket || !id || !accessToken) return;

    const handleGotoCallUpdated = async (payload = {}) => {
      const activityId = payload.activityId ?? payload.activity_id;
      const entityType = payload.entityType ?? payload.entity_type;
      const entityId = payload.entityId ?? payload.entity_id;
      const sameLead =
        String(entityType || '').toLowerCase() === 'lead' &&
        String(entityId) === String(id);
      const samePendingCall =
        activityId != null && String(activityId) === String(gotoActivityIdRef.current);

      if (!sameLead && !samePendingCall) return;

      try {
        if (activityId) {
          const activity = await fetchActivityById(activityId, accessToken);
          const record = activity?.data ?? activity;
          if (record && activityMatchesLead(record, id)) {
            setActivities((prev) => {
              const withoutCurrent = prev.filter(
                (item) => String(item?.id) !== String(record.id)
              );
              return sortActivitiesNewestFirst([record, ...withoutCurrent]);
            });
          }
        }

        await fetchActivities();

        if (samePendingCall) {
          setGotoPolling(false);
          setGotoActivityId(null);
          toast.success('Call completed. Duration and outcome updated.');
        }
      } catch {
        fetchActivities();
      }
    };

    socket.on('goto:call-updated', handleGotoCallUpdated);
    return () => {
      socket.off('goto:call-updated', handleGotoCallUpdated);
    };
  }, [socket, id, accessToken, fetchActivities]);

  const resetActivityForm = () => {
    setActivitySubject('');
    setActivityDescription('');
    setActivityDueDate(getTomorrowDatetimeLocal());
    setActivityCallAt(getNowDatetimeLocal());
    setActivityCallDurationMinutes('');
    setActivityCallOutcome('');
    setActivityCallNotes('');
    setActivityScheduledAt(getNowDatetimeLocal());
    setActivitySendInvite(true);
    setActivityEmailCcList([]);
    setActivityEmailCcInput('');
    setActivityEmailAttachments([]);
    setActivityMeetingLink('');
    setActivityGeneratingLink(false);
    setActivitySendFollowUpEmail(true);
    setActivitySubjectError(false);
  };

  const handleGenerateFollowUpMeetingLink = async () => {
    if (!accessToken || activityGeneratingLink) return;

    setActivityGeneratingLink(true);
    try {
      const link = await createLeadMeetingLink(accessToken);
      setActivityMeetingLink(link);
      toast.success('Meeting link generated');
    } catch (error) {
      toast.error(error?.message || 'Failed to generate meeting link');
    } finally {
      setActivityGeneratingLink(false);
    }
  };

  const handleActivityAttachmentChange = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 0) {
      setActivityEmailAttachments((prev) => [...prev, ...selected]);
    }
    event.target.value = '';
  };

  const handleRemoveActivityAttachment = (indexToRemove) => {
    setActivityEmailAttachments((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleAddActivityCcEmail = (email) => {
    const trimmedEmail = String(email || '').trim();
    if (!trimmedEmail) return;
    setActivityEmailCcList((prev) =>
      prev.includes(trimmedEmail) ? prev : [...prev, trimmedEmail]
    );
    setActivityEmailCcInput('');
  };

  const handleRemoveActivityCcEmail = (emailToRemove) => {
    setActivityEmailCcList((prev) =>
      prev.filter((email) => email !== emailToRemove)
    );
  };

  const handleActivityCcInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault();
      handleAddActivityCcEmail(activityEmailCcInput);
    } else if (
      event.key === 'Backspace' &&
      !activityEmailCcInput &&
      activityEmailCcList.length > 0
    ) {
      setActivityEmailCcList((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmitActivity = async () => {
    if (!id || !accessToken || activitySubmitting) return;

    if (!activitySubject.trim()) {
      setActivitySubjectError(true);
      toast.error(
        isEmailActivity || isMeetingActivity ? 'Subject is required' : 'Title is required'
      );
      return;
    }

    if (isEmailActivity && !activityDescription.trim()) {
      toast.error('Message is required');
      return;
    }

    if (isMeetingActivity && !activityScheduledAt) {
      toast.error('Scheduled date & time is required');
      return;
    }

    setActivitySubmitting(true);
    try {
      if (isEmailActivity) {
        const contactEmail =
          lead?.email && lead.email !== '-' ? lead.email : null;

        if (!contactEmail) {
          toast.error('Contact email not found');
          return;
        }

        const pendingCc = activityEmailCcInput.trim();
        const ccEmails = pendingCc
          ? activityEmailCcList.includes(pendingCc)
            ? activityEmailCcList
            : [...activityEmailCcList, pendingCc]
          : activityEmailCcList;

        await sendLeadEmail({
          leadId: id,
          subject: activitySubject,
          message: activityDescription,
          to: contactEmail,
          cc: ccEmails,
          files: activityEmailAttachments,
          token: accessToken,
        });
        toast.success('Email sent successfully');
      } else if (isMeetingActivity) {
        const contactEmail =
          lead?.email && lead.email !== '-' ? lead.email : null;

        if (activitySendInvite && !contactEmail) {
          toast.error('Contact email not found');
          return;
        }

        const scheduledAt = toIsoDueDate(activityScheduledAt);
        if (!scheduledAt) {
          toast.error('Invalid scheduled date & time');
          return;
        }

        await createLeadMeeting({
          leadId: id,
          subject: activitySubject,
          description: activityDescription,
          scheduledAt,
          to: contactEmail || undefined,
          sendInvite: activitySendInvite,
          token: accessToken,
        });
        toast.success('Meeting created successfully');
      } else if (isFollowUpActivity) {
        const contactEmail =
          lead?.email && lead.email !== '-' ? lead.email : null;

        if (activitySendFollowUpEmail && !contactEmail) {
          toast.error('Contact email not found');
          return;
        }

        let meetingLink = activityMeetingLink.trim();
        if (activitySendFollowUpEmail && !meetingLink) {
          try {
            meetingLink = await createLeadMeetingLink(accessToken);
            setActivityMeetingLink(meetingLink);
          } catch (error) {
            toast.error(error?.message || 'Failed to generate meeting link');
            return;
          }
        }

        const notes = activityDescription.trim();
        const descriptionWithLink = meetingLink
          ? notes
            ? `${notes}\n\nMeeting link: ${meetingLink}`
            : `Meeting link: ${meetingLink}`
          : notes || undefined;

        await scheduleLeadFollowUp({
          leadId: id,
          subject: activitySubject,
          description: descriptionWithLink,
          dueDate: toIsoDueDate(activityDueDate) || null,
          to: contactEmail || undefined,
          sendInvite: activitySendFollowUpEmail,
          meetingLink: meetingLink || undefined,
          token: accessToken,
        });
        toast.success('Follow-up scheduled successfully');
      } else {
        const callDurationMinutes = Number(activityCallDurationMinutes);
        const callDurationSeconds =
          isCallActivity && Number.isFinite(callDurationMinutes) && callDurationMinutes > 0
            ? Math.round(callDurationMinutes * 60)
            : null;

        await createLeadActivity({
          leadId: id,
          type: selectedActivityType,
          subject: activitySubject,
          description: isCallActivity ? null : activityDescription,
          dueDate: null,
          callAt: isCallActivity ? toIsoDueDate(activityCallAt) : null,
          callDurationSeconds,
          callOutcome: isCallActivity ? activityCallOutcome || null : null,
          callNotes: isCallActivity ? activityCallNotes : null,
          token: accessToken,
        });
        toast.success('Activity logged successfully');
      }
      resetActivityForm();
      fetchActivities();
    } catch (error) {
      toast.error(
        error?.message ||
          (isEmailActivity
            ? 'Failed to send email'
            : isMeetingActivity
              ? 'Failed to create meeting'
              : isFollowUpActivity
                ? 'Failed to schedule follow-up'
                : 'Failed to log activity')
      );
    } finally {
      setActivitySubmitting(false);
    }
  };

  const lead = useMemo(() => {
    if (leadRecord) return mapApiLeadToDetail(leadRecord, leadForms);
    const stateLead = locationStateRef.current?.itemData || locationStateRef.current?.lead;
    return stateLead ? mapApiLeadToDetail(stateLead, []) : null;
  }, [leadRecord, leadForms]);

  const getLeadPhoneNumber = useCallback(() => {
    const candidates = [
      leadRecord?.phoneNumber,
      leadRecord?.phone,
      leadRecord?.mobile,
      lead?.phone,
      lead?.mobile,
    ];
    for (const value of candidates) {
      const phone = String(value || '').trim();
      if (phone && phone !== '-') return phone;
    }
    return '';
  }, [leadRecord, lead]);

  const markGotoCallInProgress = useCallback((activityId) => {
    if (!activityId) return;
    setGotoActivityId(activityId);
    setGotoPolling(true);
  }, []);

  const openGotoLinePicker = useCallback(
    async ({ thenCall = false } = {}) => {
      if (!accessToken) return;
      setPendingCallAfterLine(thenCall);
      setLinePickerOpen(true);
      setGotoLinesLoading(true);
      try {
        const lines = await getGotoLines(accessToken);
        const list = Array.isArray(lines) ? lines : [];
        setGotoLines(list);
        setSelectedGotoLineId(gotoLine?.lineId || list[0]?.lineId || '');
      } catch (error) {
        const message = parseGotoErrorMessage(error);
        if (isGotoNotConnectedError(message)) {
          setLinePickerOpen(false);
          setPendingCallAfterLine(false);
          toast.error('GoTo is not connected. Ask an admin to connect it under Settings → GoTo Connect.');
        } else {
          toast.error(message || 'Failed to load GoTo lines');
        }
      } finally {
        setGotoLinesLoading(false);
      }
    },
    [accessToken, gotoLine]
  );

  const placeGotoCall = useCallback(async () => {
    if (!id || !accessToken || gotoCalling) return;

    const phoneNumber = getLeadPhoneNumber();
    if (!phoneNumber) {
      toast.error('No phone number on this lead. Add a phone number first.');
      return;
    }

    setGotoCalling(true);
    try {
      const result = await clickToCall(accessToken, {
        entityType: 'lead',
        entityId: Number(id),
        phoneNumber,
        subject: activitySubject.trim() || undefined,
      });

      const activity = result?.activity || result?.data?.activity;
      const activityId = activity?.id || result?.activityId;
      toast.success('Calling… answer your GoTo app');
      setTabValue(1);
      setActivitySubTab(0);
      fetchActivities();

      if (activityId) {
        markGotoCallInProgress(activityId);
      }
    } catch (error) {
      const message = parseGotoErrorMessage(error);
      if (isGotoLineRequiredError(message)) {
        await openGotoLinePicker({ thenCall: true });
        return;
      }
      if (isGotoNotConnectedError(message)) {
        toast.error('GoTo is not connected. Ask an admin to connect it under Settings → GoTo Connect.');
        return;
      }
      if (isGotoMissingPhoneError(message)) {
        toast.error('No phone number on this lead. Add a phone number first.');
        return;
      }
      if (isGotoPermissionError(message)) {
        toast.error(
          'GoTo says you don’t have permission to make this call. That is a GoTo Admin outbound/international dialing setting, not a CRM issue.'
        );
        return;
      }
      toast.error(message || 'Failed to place GoTo call');
    } finally {
      setGotoCalling(false);
    }
  }, [
    id,
    accessToken,
    gotoCalling,
    getLeadPhoneNumber,
    activitySubject,
    fetchActivities,
    markGotoCallInProgress,
    openGotoLinePicker,
  ]);

  const handleGotoCall = useCallback(async () => {
    setTabValue(1);
    setActivitySubTab(0);
    if (!gotoLine?.lineId) {
      await openGotoLinePicker({ thenCall: true });
      return;
    }
    await placeGotoCall();
  }, [gotoLine, openGotoLinePicker, placeGotoCall]);

  const handleSaveGotoLine = useCallback(async () => {
    if (!accessToken || gotoLineSaving) return;
    const selected = gotoLines.find((line) => line.lineId === selectedGotoLineId);
    if (!selected?.lineId) {
      toast.error('Select your GoTo line first');
      return;
    }

    setGotoLineSaving(true);
    try {
      await setMyGotoLine(accessToken, {
        lineId: selected.lineId,
        extensionNumber: selected.extensionNumber,
      });
      setGotoLine(selected);
      toast.success(
        selected.extensionNumber
          ? `GoTo line set to ext ${selected.extensionNumber}`
          : 'GoTo line saved'
      );
      setLinePickerOpen(false);
      if (pendingCallAfterLine) {
        setPendingCallAfterLine(false);
        await placeGotoCall();
      }
    } catch (error) {
      toast.error(parseGotoErrorMessage(error) || 'Failed to save GoTo line');
    } finally {
      setGotoLineSaving(false);
    }
  }, [
    accessToken,
    gotoLineSaving,
    gotoLines,
    selectedGotoLineId,
    pendingCallAfterLine,
    placeGotoCall,
  ]);

  const formDisplaySections = useMemo(() => buildFormDisplaySections(leadForms), [leadForms]);

  const hasFormSections = formDisplaySections.length > 0;

  const coreDisplayFields = useMemo(() => {
    if (leadRecord) {
      return hasFormSections
        ? buildCoreDisplayFields(leadRecord)
        : buildDynamicDisplayFields(leadRecord, leadForms);
    }
    const stateLead = locationStateRef.current?.itemData || locationStateRef.current?.lead;
    return stateLead ? buildDynamicDisplayFields(stateLead, []) : [];
  }, [leadRecord, leadForms, hasFormSections]);

  const leftColumnFields = useMemo(
    () => (hasFormSections ? coreDisplayFields : coreDisplayFields.filter((_, index) => index % 2 === 0)),
    [coreDisplayFields, hasFormSections]
  );

  const rightColumnFields = useMemo(
    () => (hasFormSections ? [] : coreDisplayFields.filter((_, index) => index % 2 === 1)),
    [coreDisplayFields, hasFormSections]
  );

  const savedReturnRoute = locationStateRef.current?.returnTo;
  const backRoute =
    locationStateRef.current?.fromRoute === 'leadsList'
      ? (savedReturnRoute?.startsWith('/home/leadsList') ? savedReturnRoute : '/home/leadsList')
      : '/home/sales';

  const leadStatus = leadRecord?.status ?? leadRecord?.leadStatus ?? 'open';
  const statusKey = normalizeLeadStatusKey(leadStatus);
  const statusInfo = getLeadStageInfo(leadStatus);
  const showQualificationForm = statusKey === 'working';
  const isConverted =
    statusKey === 'qualified' ||
    Boolean(
      leadRecord?.convertedAt ||
      leadRecord?.convertedOpportunityId ||
      leadRecord?.convertedAccountId ||
      leadRecord?.convertedContactId
    );

  const convertLead = useCallback(async () => {
    if (!id || !accessToken) return null;

    try {
      return await postRequestWithBodyAndToken(
        `${baseURl}lead/${encodeURIComponent(id)}/convert`,
        accessToken,
        {}
      );
    } catch {
      return null;
    }
  }, [id, accessToken]);

  const updateLeadStatus = useCallback(
    async (nextStatus) => {
      if (!id || !accessToken) return false;

      // Converting to an opportunity must succeed before the lead is marked
      // 'qualified' — that status is treated as terminal elsewhere in the UI
      // (advance/action controls hide), so persisting it on a failed convert
      // would strand the lead with no way to retry.
      if (nextStatus === 'qualified') {
        const convertResult = await convertLead();
        if (!convertResult) {
          toast.error('Lead conversion failed. Please try again.');
          return false;
        }

        try {
          const result = await putRequestWithBodyAndToken(
            `${baseURl}lead/${encodeURIComponent(id)}`,
            accessToken,
            { status: nextStatus }
          );
          const updatedStatus =
            result?.data?.status ?? result?.status ?? nextStatus;
          setLeadRecord((prev) => (prev ? { ...prev, status: updatedStatus } : prev));
        } catch {
          return false;
        }

        const merged = mergeLeadRecordData(leadRecord, leadForms);
        let opportunityId =
          pickOpportunityIdFromConvertResponse(convertResult)
          ?? pickOpportunityIdFromLeadRecord(merged);

        if (!opportunityId) {
          try {
            const refreshed = await getRequestWithOutBody(
              `${baseURl}lead/${encodeURIComponent(id)}?includeForms=true`,
              accessToken
            );
            const { lead: refreshedLead } = extractLeadResponse(refreshed);
            opportunityId = pickOpportunityIdFromLeadRecord(refreshedLead);
          } catch {
            // ignore
          }
        }

        if (opportunityId) {
          try {
            const accountPayload = buildCrmAccountPayloadFromLead(merged);
            const createRes = await createCrmAccount(accountPayload, accessToken);
            const accountId = extractCreatedCrmAccountId(createRes);
            if (accountId != null && accountId !== '') {
              await setOpportunityCrmAccountId(String(opportunityId), accountId, accessToken);
            }
          } catch (linkErr) {
            toast.error(
              linkErr.message
              || 'Lead converted but CRM account could not be created or linked to the opportunity.'
            );
          }
        }

        try {
          const refreshed = await getRequestWithOutBody(
            `${baseURl}lead/${encodeURIComponent(id)}?includeForms=true`,
            accessToken
          );
          const { lead: nextLead, forms: nextForms } = extractLeadResponse(refreshed);
          if (nextLead) setLeadRecord(nextLead);
          if (Array.isArray(nextForms)) setLeadForms(nextForms);
        } catch {
          // ignore refresh errors
        }

        return true;
      }

      try {
        const result = await putRequestWithBodyAndToken(
          `${baseURl}lead/${encodeURIComponent(id)}`,
          accessToken,
          { status: nextStatus }
        );
        const updatedStatus =
          result?.data?.status ?? result?.status ?? nextStatus;
        setLeadRecord((prev) => (prev ? { ...prev, status: updatedStatus } : prev));
        return true;
      } catch {
        return false;
      }
    },
    [id, accessToken, convertLead, leadRecord, leadForms]
  );

  const updateLeadStatusSequence = useCallback(
    async (statuses = []) => {
      if (!id || !accessToken || !statuses.length) return false;

      setStatusUpdating(true);
      try {
        for (const nextStatus of statuses) {
          const success = await updateLeadStatus(nextStatus);
          if (!success) return false;
        }
        return true;
      } finally {
        setStatusUpdating(false);
      }
    },
    [id, accessToken, updateLeadStatus]
  );

  const handleAdvanceStatus = useCallback(async () => {
    if (statusUpdating) return;

    const nextStage = getNextLeadStage(leadStatus);
    if (!nextStage?.apiValue) return;

    setStatusUpdating(true);
    try {
      const success = await updateLeadStatus(nextStage.apiValue);
      if (success && nextStage.apiValue === 'working') {
        toast.success('Lead marked as contacted');
      }
    } finally {
      setStatusUpdating(false);
    }
  }, [statusUpdating, leadStatus, updateLeadStatus]);

  const handleMarkQualified = useCallback(async () => {
    if (statusUpdating) return;

    setStatusUpdating(true);
    try {
      const success = await updateLeadStatus('qualified');
      if (success) {
        toast.success('Lead marked as qualified and converted');
        await fetchLead();
      } else {
        toast.error('Failed to mark lead as qualified');
      }
    } finally {
      setStatusUpdating(false);
    }
  }, [statusUpdating, updateLeadStatus, fetchLead]);

  const handleDisqualify = async () => {
    handleMenuClose();
    if (statusUpdating) return;

    setStatusUpdating(true);
    try {
      await updateLeadStatus('not_contacted');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConvert = async () => {
    handleMenuClose();
    if (statusUpdating) return;

    const statusKey = normalizeLeadStatusKey(leadStatus);
    if (statusKey === 'open') {
      await updateLeadStatusSequence(['working', 'qualified']);
      return;
    }

    setStatusUpdating(true);
    try {
      await updateLeadStatus('qualified');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditLead = () => {
    handleMenuClose();
    navigate('/home/addLeads', {
      state: {
        mode: 'edit',
        leadId: id,
        fromRoute: locationStateRef.current?.fromRoute,
        returnTo: locationStateRef.current?.returnTo,
      },
    });
  };

  const handleDeleteLead = () => {
    handleMenuClose();
    if (isConverted || deleting) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteLead = async () => {
    if (!id || !accessToken || isConverted || deleting) return;

    setDeleting(true);
    try {
      const result = await deleteRequest(
        `${baseURl}lead/${encodeURIComponent(id)}`,
        accessToken
      );
      toast.success(result?.message || 'Lead deleted successfully');
      setShowDeleteModal(false);
      navigate(backRoute);
    } catch (error) {
      toast.error(error?.message || 'Failed to delete lead');
    } finally {
      setDeleting(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ px: 3, pb: 3, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', mt: -8, pt: 2 }}>
        <Loader message="Loading lead..." subMessage="Please wait" />
      </Box>
    );
  }

  if (!lead) {
    return (
      <Box sx={{ px: 3, pb: 3, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', mt: -8, pt: 2 }}>
        <IconButton onClick={() => navigate(backRoute)} sx={{ mb: 2, color: 'var(--sidebar-text-primary)' }}>
          <ArrowBack />
        </IconButton>
        <NoDataFound title="Lead Not Found" description="Unable to load lead details." />
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3, pb: 3, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', mt: -8, pt: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate(backRoute)} sx={{ mr: 2, color: 'var(--sidebar-text-primary)' }}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'var(--sidebar-text-primary)' }}>
              {lead.name}
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--dashboard-text-secondary)' }}>
              {lead.company}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isConverted ? (
            <>
              <Button
                variant="contained"
                onClick={handleMenuClick}
                sx={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  borderRadius: '4px',
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 400,
                  padding: '6px 12px',
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                endIcon={<MoreVert sx={{ fontSize: '16px' }} />}
              >
                More Action
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    mt: 1,
                  }
                }}
              >
                {statusKey !== 'lost' ? (
                  <>
                    <MenuItem onClick={handleEditLead} sx={{ fontSize: '13px', py: 1 }}>
                      Edit
                    </MenuItem>
                    {/* <MenuItem onClick={handleConvert} sx={{ fontSize: '13px', py: 1 }}>
                      Qualified
                    </MenuItem> */}
                    <MenuItem onClick={handleDisqualify} sx={{ fontSize: '13px', py: 1 }}>
                      Disqualify (Not contacted)
                    </MenuItem>
                  </>
                ) : null}
                <MenuItem
                  onClick={handleDeleteLead}
                  sx={{ fontSize: '13px', py: 1, color: '#d32f2f' }}
                >
                  Delete
                </MenuItem>
              </Menu>
            </>
          ) : null}
        </Box>
      </Box>

      {/* Contact Information */}
      <Box sx={{ mb: 3, mt: 2 }}>

       
        <Box sx={{ display: 'flex', gap: 6, mb: 1, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: '150px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Message sx={{ fontSize: '16px', color: 'var(--dashboard-text-secondary)' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--dashboard-text-secondary)' }}>
              Company Name
            </Typography>
          </Box>
          <Box sx={{ minWidth: '120px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone sx={{ fontSize: '16px', color: 'var(--dashboard-text-secondary)' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--dashboard-text-secondary)' }}>
              Phone
            </Typography>
          </Box>
          <Box sx={{ minWidth: '200px', display: 'flex', alignItems: 'center', gap: 1, ml:2 }}>
            <Message sx={{ fontSize: '16px', color: 'var(--dashboard-text-secondary)' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--dashboard-text-secondary)', }}>
              Email
            </Typography>
          </Box>
          <Box sx={{ minWidth: '150px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: '16px', color: 'var(--dashboard-text-secondary)' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--dashboard-text-secondary)' }}>
              Agent
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 6 }}>
          <Box sx={{ minWidth: '150px' }}>
            <Typography variant="body1" sx={{ color: 'var(--dashboard-text-primary)' }}>
              {lead.company}
            </Typography>
          </Box>
          <Box sx={{ minWidth: '120px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body1" sx={{ color: 'var(--dashboard-text-primary)' }}>
              {lead.phone}
            </Typography>
            {getLeadPhoneNumber() ? (
              <IconButton
                size="small"
                onClick={handleGotoCall}
                disabled={gotoCalling}
                title="Call via GoTo Connect"
                sx={{ color: '#1976d2' }}
              >
                {gotoCalling ? <CircularProgress size={16} /> : <Phone fontSize="small" />}
              </IconButton>
            ) : null}
          </Box>
          <Box sx={{ minWidth: '200px' }}>
            <Typography variant="body1" sx={{ color: 'var(--dashboard-text-primary)' }}>
              {lead.email}
            </Typography>
          </Box>
          <Box sx={{ minWidth: '150px' }}>
            <Typography variant="body1" sx={{ color: 'var(--dashboard-text-primary)' }}>
              {lead.agentName}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Sales Process Flow */}
      <Box sx={{ mb: 3 }}>
        <LeadPath
          status={leadStatus}
          onAdvanceStatus={handleAdvanceStatus}
          isUpdating={statusUpdating}
        />
      </Box>

      {showQualificationForm ? (
        <LeadQualificationForm
          leadId={id}
          accessToken={accessToken}
          leadRecord={leadRecord}
          leadForms={leadForms}
          onMarkQualified={handleMarkQualified}
          isUpdating={statusUpdating}
        />
      ) : null}

      {/* Status Alert */}
      <StatusAlert severity={normalizeLeadStatusKey(leadStatus) === 'lost' ? 'warning' : 'info'}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {statusInfo.message}
        </Typography>
        <Typography variant="body2">
          {statusInfo.description}
        </Typography>
      </StatusAlert>

      {/* Tabs */}
      <StyledPaper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            className="dark:text-white"
            sx={{
              '& .MuiTab-root': {
                color: 'inherit',
                '&.Mui-selected': {
                  color: 'inherit',
                },
              },
            }}
          >
            <Tab label="Details" />
            <Tab label="Activity" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InfoSection>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'var(--sidebar-text-primary)' }}>
                  Lead Details
                </Typography>
                {leftColumnFields.length ? (
                  renderDisplayFieldRows(leftColumnFields)
                ) : (
                  <InfoValue>No lead details available.</InfoValue>
                )}
              </InfoSection>
            </Grid>

            {hasFormSections ? (
              formDisplaySections.map((section) => (
                <Grid item xs={12} md={6} key={section.id}>
                  <InfoSection>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'var(--sidebar-text-primary)' }}>
                      {section.title}
                    </Typography>
                    {renderDisplayFieldRows(section.fields)}
                  </InfoSection>
                </Grid>
              ))
            ) : (
              <Grid item xs={12} md={6}>
                <InfoSection>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'var(--sidebar-text-primary)' }}>
                    Additional Details
                  </Typography>
                  {rightColumnFields.length ? (
                    renderDisplayFieldRows(rightColumnFields)
                  ) : (
                    <InfoValue>No additional details available.</InfoValue>
                  )}
                </InfoSection>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {ACTIVITY_TYPES.map((tab, index) => (
                  <Button
                    key={tab.value}
                    variant={activitySubTab === index ? 'contained' : 'text'}
                    onClick={() => setActivitySubTab(index)}
                    sx={{
                      borderRadius: '4px',
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: activitySubTab === index ? 500 : 400,
                      backgroundColor: activitySubTab === index ? '#1976d2' : 'transparent',
                      color: activitySubTab === index ? 'white' : 'inherit',
                      '&:hover': {
                        backgroundColor: activitySubTab === index ? '#1565c0' : 'var(--dashboard-hover)',
                      },
                    }}
                    className={activitySubTab === index ? '' : 'dark:text-gray-300'}
                  >
                    {tab.label}
                  </Button>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: 'var(--dashboard-bg)',
                borderRadius: '8px',
                width: '100%',
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, mb: 1.5, color: 'var(--sidebar-text-primary)' }}
              >
                Log an Activity
              </Typography>
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                >
                  {isEmailActivity || isMeetingActivity ? 'Subject' : 'Title'}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={activitySubject}
                  error={activitySubjectError}
                  onChange={(event) => {
                    setActivitySubject(event.target.value);
                    if (activitySubjectError) setActivitySubjectError(false);
                  }}
                  placeholder={
                    isEmailActivity
                      ? 'Follow-up on your application'
                      : isMeetingActivity
                        ? 'Discovery call'
                        : 'Follow-up call with client'
                  }
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      '& fieldset': {
                        borderColor: activitySubjectError
                          ? '#ef4444'
                          : 'var(--dashboard-border-light)',
                      },
                      '&:hover fieldset': {
                        borderColor: activitySubjectError
                          ? '#ef4444'
                          : 'var(--dashboard-primary)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: activitySubjectError
                          ? '#ef4444'
                          : 'var(--dashboard-primary)',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'var(--dashboard-text-primary)',
                    },
                  }}
                />
              </Box>
              {isEmailActivity ? (
                <>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      To
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={lead?.email && lead.email !== '-' ? lead.email : ''}
                      disabled
                      placeholder="Contact email"
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '4px',
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      CC
                    </Typography>
                    <Box
                      onClick={() =>
                        document.getElementById('lead-activity-cc-input')?.focus()
                      }
                      sx={{
                        border: '1px solid var(--dashboard-border-light)',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        padding: '8px',
                        minHeight: '40px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'text',
                        '&:focus-within': {
                          borderColor: 'var(--dashboard-primary)',
                        },
                      }}
                    >
                      {activityEmailCcList.map((email) => (
                        <Chip
                          key={email}
                          label={email}
                          onDelete={() => handleRemoveActivityCcEmail(email)}
                          deleteIcon={<Close sx={{ fontSize: '16px' }} />}
                          size="small"
                          sx={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            fontSize: '12px',
                            height: '28px',
                          }}
                        />
                      ))}
                      <Box
                        component="input"
                        id="lead-activity-cc-input"
                        type="text"
                        value={activityEmailCcInput}
                        onChange={(event) => setActivityEmailCcInput(event.target.value)}
                        onKeyDown={handleActivityCcInputKeyDown}
                        onBlur={() => {
                          if (activityEmailCcInput.trim()) {
                            handleAddActivityCcEmail(activityEmailCcInput);
                          }
                        }}
                        placeholder={
                          activityEmailCcList.length === 0
                            ? 'Type email and press Enter'
                            : ''
                        }
                        sx={{
                          border: 'none',
                          outline: 'none',
                          flex: 1,
                          minWidth: '140px',
                          fontSize: '14px',
                          backgroundColor: 'transparent',
                          padding: '4px',
                          color: 'var(--dashboard-text-primary)',
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      Message
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      maxRows={14}
                      value={activityDescription}
                      onChange={(event) => setActivityDescription(event.target.value)}
                      placeholder="Hi, just checking if you had any questions."
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '4px',
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      Attachments
                    </Typography>
                    <Box
                      sx={{
                        border: '1px dashed var(--dashboard-border-light)',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        padding: '12px',
                      }}
                    >
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        sx={{
                          textTransform: 'none',
                          borderColor: 'var(--dashboard-border-light)',
                          color: 'var(--dashboard-primary)',
                          mb: activityEmailAttachments.length > 0 ? 1 : 0,
                        }}
                      >
                        Add file
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={handleActivityAttachmentChange}
                        />
                      </Button>
                      {activityEmailAttachments.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          {activityEmailAttachments.map((file, index) => (
                            <Box
                              key={`${file.name}-${index}`}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                px: 1,
                                py: 0.75,
                                borderRadius: '4px',
                                backgroundColor: 'var(--dashboard-bg)',
                                border: '1px solid var(--dashboard-border-light)',
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'var(--dashboard-text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '13px',
                                }}
                              >
                                {file.name}
                              </Typography>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleRemoveActivityAttachment(index)}
                                sx={{ minWidth: 'auto', px: 1, textTransform: 'none' }}
                              >
                                Remove
                              </Button>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: 'var(--dashboard-text-secondary)', mt: 0.5 }}
                        >
                          Optional — select one or more files to attach
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </>
              ) : isMeetingActivity ? (
                <>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      Description
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      maxRows={14}
                      value={activityDescription}
                      onChange={(event) => setActivityDescription(event.target.value)}
                      placeholder="Discuss pricing and next steps"
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '4px',
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  </Box>
                  <Grid container spacing={1.5} sx={{ mb: 1.5 }} alignItems="flex-end">
                    <Grid item xs={12} sm={4}>
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                      >
                        Scheduled At
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="datetime-local"
                        value={activityScheduledAt}
                        onChange={(event) => setActivityScheduledAt(event.target.value)}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            backgroundColor: 'white',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                      >
                        To
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={lead?.email && lead.email !== '-' ? lead.email : ''}
                        disabled
                        placeholder="Contact email"
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            backgroundColor: 'white',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={activitySendInvite}
                            onChange={(event) =>
                              setActivitySendInvite(event.target.checked)
                            }
                            color="primary"
                          />
                        }
                        label="Send invite"
                        sx={{
                          m: 0,
                          color: 'var(--dashboard-text-primary)',
                          '& .MuiFormControlLabel-label': {
                            fontSize: '14px',
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </>
              ) : isCallActivity ? (
                <>
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: '8px',
                      border: '1px solid #bbdefb',
                      backgroundColor: '#e3f2fd',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: '#1565c0', mb: 0.5 }}
                    >
                      GoTo Connect
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 1 }}
                    >
                      Click Call now. Your GoTo app or desk phone will ring first — answer it, then the customer is dialed. Duration and outcome update when the call ends.
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'var(--dashboard-text-primary)' }}>
                        Phone: {getLeadPhoneNumber() || 'No number on this lead'}
                      </Typography>
                      {gotoLine?.extensionNumber ? (
                        <Chip
                          size="small"
                          label={`Your line: ext ${gotoLine.extensionNumber}`}
                          sx={{ height: 22, fontSize: '11px' }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="No GoTo line set"
                          sx={{ height: 22, fontSize: '11px' }}
                        />
                      )}
                      <Button
                        size="small"
                        onClick={() => openGotoLinePicker({ thenCall: false })}
                        sx={{ textTransform: 'none', minWidth: 0, px: 0.5 }}
                      >
                        {gotoLine?.lineId ? 'Change line' : 'Set line'}
                      </Button>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={
                        gotoCalling ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Phone />
                        )
                      }
                      onClick={handleGotoCall}
                      disabled={gotoCalling || !getLeadPhoneNumber()}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: '#1976d2',
                        '&:hover': { backgroundColor: '#1565c0' },
                      }}
                    >
                      {gotoCalling ? 'Calling…' : 'Call now'}
                    </Button>
                    {gotoPolling ? (
                      <Alert severity="info" sx={{ mt: 1.5 }}>
                        Call in progress. Duration and outcome will update when the call ends.
                      </Alert>
                    ) : null}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, mb: 1, color: 'var(--dashboard-text-secondary)' }}
                  >
                    Or log a call manually
                  </Typography>
                  <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                    <Grid item xs={12} sm={5}>
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                      >
                        Call At
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="datetime-local"
                        value={activityCallAt}
                        onChange={(event) => setActivityCallAt(event.target.value)}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            backgroundColor: 'white',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                      >
                        Duration (min)
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={activityCallDurationMinutes}
                        onChange={(event) =>
                          setActivityCallDurationMinutes(event.target.value)
                        }
                        placeholder="7"
                        inputProps={{ min: 0, step: 1 }}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            backgroundColor: 'white',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={5}>
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                      >
                        Outcome
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={activityCallOutcome}
                          onChange={(event) => setActivityCallOutcome(event.target.value)}
                          displayEmpty
                          sx={{
                            borderRadius: '4px',
                            backgroundColor: 'white',
                          }}
                        >
                          <MenuItem value="">
                            <em>Select outcome</em>
                          </MenuItem>
                          {CALL_OUTCOMES.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      Call Notes
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      maxRows={14}
                      value={activityCallNotes}
                      onChange={(event) => setActivityCallNotes(event.target.value)}
                      placeholder="Key points from the call..."
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '4px',
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  </Box>
                </>
              ) : (
                <Box sx={{ mb: 1.5 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                  >
                    Notes
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={14}
                    value={activityDescription}
                    onChange={(event) => setActivityDescription(event.target.value)}
                    placeholder="What happened? key points..."
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        '& fieldset': {
                          borderColor: 'var(--dashboard-border-light)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'var(--dashboard-primary)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'var(--dashboard-primary)',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: 'var(--dashboard-text-primary)',
                      },
                    }}
                  />
                </Box>
              )}
              {isFollowUpActivity && (
                <>
                  <Box sx={{ mb: 1.5, maxWidth: 280 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      Due Date (optional)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      value={activityDueDate}
                      onChange={(event) => setActivityDueDate(event.target.value)}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '4px',
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                    >
                      Meeting Link
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={activityMeetingLink}
                      onChange={(event) => setActivityMeetingLink(event.target.value)}
                      placeholder="Generate or paste a meeting link"
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '4px',
                          backgroundColor: 'white',
                        },
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateFollowUpMeetingLink}
                      disabled={activityGeneratingLink || activitySubmitting}
                      sx={{
                        mt: 0.75,
                        px: 0,
                        minWidth: 0,
                        textTransform: 'none',
                        fontSize: '12px',
                        color: '#0C79F7',
                        '&:hover': {
                          backgroundColor: 'transparent',
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {activityGeneratingLink ? 'Generating…' : 'Generate Meeting Link'}
                    </Button>
                  </Box>
                  <Grid container spacing={1.5} sx={{ mb: 1.5 }} alignItems="flex-end">
                    <Grid item xs={12} sm={8}>
                      <Typography
                        variant="body2"
                        sx={{ color: 'var(--dashboard-text-secondary)', mb: 0.5 }}
                      >
                        To
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={lead?.email && lead.email !== '-' ? lead.email : ''}
                        disabled
                        placeholder="Contact email"
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            backgroundColor: 'white',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={activitySendFollowUpEmail}
                            onChange={(event) =>
                              setActivitySendFollowUpEmail(event.target.checked)
                            }
                            color="primary"
                          />
                        }
                        label="Send email"
                        sx={{
                          m: 0,
                          color: 'var(--dashboard-text-primary)',
                          '& .MuiFormControlLabel-label': {
                            fontSize: '14px',
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </>
              )}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                <Button
                  variant="contained"
                  onClick={handleSubmitActivity}
                  disabled={activitySubmitting || activityGeneratingLink}
                  sx={{
                    backgroundColor: '#1976d2',
                    textTransform: 'none',
                    minWidth: 90,
                    '&:hover': {
                      backgroundColor: '#1565c0',
                    },
                  }}
                >
                  {activitySubmitting
                    ? isMeetingActivity || isFollowUpActivity
                      ? 'Scheduling...'
                      : 'Sending...'
                    : isMeetingActivity || isFollowUpActivity
                      ? 'Schedule'
                      : 'Send'}
                </Button>
              </Box>
            </Box>

            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: 'var(--sidebar-text-primary)' }}
                >
                  Activity History
                </Typography>
                <Button
                  size="small"
                  onClick={fetchActivities}
                  disabled={activitiesLoading}
                  sx={{ textTransform: 'none' }}
                >
                  {activitiesLoading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </Box>

              {activitiesLoading ? (
                <Loader message="Loading activities..." subMessage="Please wait" />
              ) : activities.length === 0 ? (
                <Box
                  sx={{
                    py: 3,
                    px: 2,
                    borderRadius: '8px',
                    border: '1px dashed var(--dashboard-border-light)',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: 'var(--dashboard-text-secondary)' }}
                  >
                    No activities logged yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {activities.map((activity, index) => {
                    const activityType = String(activity?.type || 'call').toLowerCase();
                    const activityTypeLabel = getActivityTypeLabel(activityType);
                    const dotColor = ACTIVITY_TYPE_COLORS[activityType] || '#1976d2';
                    const createdLabel = formatActivityTime(
                      activity?.createdAt || activity?.updatedAt
                    );
                    const dueLabel = formatDueDate(activity?.dueDate);
                    const callAtLabel = formatActivityDateTime(activity?.callAt);
                    const callDurationLabel = formatCallDuration(
                      activity?.callDurationSeconds
                    );
                    const callOutcomeLabel = activity?.callOutcome
                      ? getCallOutcomeLabel(activity.callOutcome)
                      : '';
                    const callNotes =
                      activityType === 'call'
                        ? activity?.callNotes || activity?.description
                        : '';
                    const activityDescriptionText =
                      activityType !== 'call' ? activity?.description : '';

                    const hasCallDetails =
                      activityType === 'call' &&
                      (callOutcomeLabel ||
                        callAtLabel ||
                        callDurationLabel ||
                        callNotes);

                    return (
                      <Box
                        key={activity?.id || `${activityType}-${index}`}
                        sx={{
                          border: '1px solid var(--dashboard-border-light)',
                          borderLeft: `3px solid ${dotColor}`,
                          borderRadius: '8px',
                          p: 1.5,
                          backgroundColor: 'white',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            mb: 0.75,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Chip
                              label={activityTypeLabel}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '11px',
                                fontWeight: 600,
                                color: dotColor,
                                backgroundColor: `${dotColor}14`,
                                border: `1px solid ${dotColor}33`,
                              }}
                            />
                            {String(activity?.id) === String(gotoActivityId) && gotoPolling ? (
                              <Chip
                                label="In progress"
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: '#DBEAFE',
                                  color: '#1D4ED8',
                                }}
                              />
                            ) : null}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'var(--dashboard-text-secondary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {createdLabel}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'var(--dashboard-text-primary)',
                            lineHeight: 1.4,
                          }}
                        >
                          {activity?.subject || 'Untitled activity'}
                        </Typography>

                        {hasCallDetails ? (
                          <Box
                            sx={{
                              mt: 1,
                              p: 1.25,
                              borderRadius: '6px',
                              backgroundColor: 'var(--dashboard-bg)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.75,
                            }}
                          >
                            {callOutcomeLabel ? (
                              <ActivityDetailRow label="Outcome">
                                <Chip
                                  label={callOutcomeLabel}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    ...getCallOutcomeStyle(activity.callOutcome),
                                  }}
                                />
                              </ActivityDetailRow>
                            ) : null}
                            {callAtLabel ? (
                              <ActivityDetailRow label="Call At">
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'var(--dashboard-text-primary)' }}
                                >
                                  {callAtLabel}
                                </Typography>
                              </ActivityDetailRow>
                            ) : null}
                            {callDurationLabel ? (
                              <ActivityDetailRow label="Duration">
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'var(--dashboard-text-primary)' }}
                                >
                                  {callDurationLabel}
                                </Typography>
                              </ActivityDetailRow>
                            ) : null}
                            {callNotes ? (
                              <ActivityDetailRow label="Notes" alignStart>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'var(--dashboard-text-primary)',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {callNotes}
                                </Typography>
                              </ActivityDetailRow>
                            ) : null}
                          </Box>
                        ) : null}

                        {dueLabel ? (
                          <Box sx={{ mt: 1 }}>
                            <ActivityDetailRow label="Due Date">
                              <Typography
                                variant="body2"
                                sx={{ color: 'var(--dashboard-text-primary)' }}
                              >
                                {dueLabel}
                              </Typography>
                            </ActivityDetailRow>
                          </Box>
                        ) : null}

                        {activityDescriptionText ? (
                          <Box
                            sx={{
                              mt: 1,
                              p: 1.25,
                              borderRadius: '6px',
                              backgroundColor: 'var(--dashboard-bg)',
                            }}
                          >
                            <ActivityDetailRow label="Description" alignStart>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'var(--dashboard-text-primary)',
                                  lineHeight: 1.5,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {activityDescriptionText}
                              </Typography>
                            </ActivityDetailRow>
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>
        </TabPanel>
      </StyledPaper>

      <Dialog
        open={linePickerOpen}
        onClose={() => {
          if (!gotoLineSaving) {
            setPendingCallAfterLine(false);
            setLinePickerOpen(false);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.5, fontWeight: 600 }}>Set your GoTo line</DialogTitle>
        <DialogContent sx={{ pt: 0.5, pb: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--dashboard-text-secondary)', mb: 1.5 }}>
            Each agent must pick their own GoTo extension before placing a call.
          </Typography>
          {gotoLinesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <FormControl fullWidth size="small">
              <Select
                value={selectedGotoLineId}
                onChange={(event) => setSelectedGotoLineId(event.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select a line</em>
                </MenuItem>
                {gotoLines.map((line) => (
                  <MenuItem key={line.lineId} value={line.lineId}>
                    {line.name || 'Line'}
                    {line.extensionNumber ? ` (ext ${line.extensionNumber})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setPendingCallAfterLine(false);
              setLinePickerOpen(false);
            }}
            disabled={gotoLineSaving}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveGotoLine}
            disabled={gotoLineSaving || gotoLinesLoading || !selectedGotoLineId}
            sx={{ textTransform: 'none', backgroundColor: '#1976d2' }}
          >
            {gotoLineSaving ? 'Saving…' : pendingCallAfterLine ? 'Save & call' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmationModal
        open={showDeleteModal}
        title="Delete Lead"
        subtitle="Are you sure you want to delete"
        entityName={lead?.name || 'this lead'}
        warningMessage="This action cannot be undone. The lead will be permanently removed from the system."
        onCancel={() => {
          if (!deleting) setShowDeleteModal(false);
        }}
        onDelete={confirmDeleteLead}
        isLoading={deleting}
      />
    </Box>
  );
};

export default LeadDetail;
