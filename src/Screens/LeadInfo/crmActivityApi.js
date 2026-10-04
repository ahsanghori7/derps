import { getRequestWithOutBody, postRequestWithBodyAndToken } from '../../Api/fetch';
import { createVideoRoom, generateMeetingRoomId } from '../../Api/videoRoomApi';
import { baseURl } from '../../Config/systemConfig';

export { generateMeetingRoomId };

/** Public app origin used in emailed meeting links (matches AddEvent). */
export const MEETING_APP_BASE_URL = 'https://derps.gotmsolutions.com';

export const ACTIVITY_TYPES = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Notes', value: 'note' },
  { label: 'Follow-Up', value: 'follow_up' },
];

export const CALL_OUTCOMES = [
  { label: 'Answered', value: 'answered' },
  { label: 'No Answer', value: 'no_answer' },
  { label: 'Busy', value: 'busy' },
  { label: 'Voicemail', value: 'voicemail' },
  { label: 'Wrong Number', value: 'wrong_number' },
];

/** Format Date for `<input type="datetime-local" />` (local timezone). */
export const toDatetimeLocalValue = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Current local datetime for Call At / Meeting Scheduled At defaults. */
export const getNowDatetimeLocal = () => toDatetimeLocalValue(new Date());

/** Tomorrow at the current local time — default for Follow-Up due date. */
export const getTomorrowDatetimeLocal = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDatetimeLocalValue(d);
};

const parseActivityList = (result) => {
  const payload = result?.data ?? result;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.activities)) return payload.activities;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const fetchLeadActivities = async (leadId, token) => {
  const url = `${baseURl}crm-activity/entity/lead/${encodeURIComponent(leadId)}`;
  const result = await getRequestWithOutBody(url, token);
  return parseActivityList(result);
};

export const fetchActivityById = async (activityId, token) => {
  const url = `${baseURl}crm-activity/${encodeURIComponent(activityId)}`;
  const result = await getRequestWithOutBody(url, token);
  return result?.data ?? result;
};

const buildActivityPayload = ({
  entityType,
  entityId,
  type,
  subject,
  description,
  dueDate,
  callAt,
  callDurationSeconds,
  callOutcome,
  callNotes,
}) => {
  const payload = {
    entityType,
    entityId: Number(entityId),
    type,
    subject: subject.trim(),
  };

  if (type === 'call') {
    if (callAt) {
      payload.callAt = callAt;
    }
    if (callDurationSeconds != null && callDurationSeconds > 0) {
      payload.callDurationSeconds = Number(callDurationSeconds);
    }
    if (callOutcome) {
      payload.callOutcome = callOutcome;
    }
    if (callNotes?.trim()) {
      payload.callNotes = callNotes.trim();
    }
  } else if (description?.trim()) {
    payload.description = description.trim();
  }

  if (dueDate) {
    payload.dueDate = dueDate;
  }

  return payload;
};

export const createLeadActivity = async ({
  leadId,
  type,
  subject,
  description,
  dueDate,
  callAt,
  callDurationSeconds,
  callOutcome,
  callNotes,
  token,
}) => {
  const payload = buildActivityPayload({
    entityType: 'lead',
    entityId: leadId,
    type,
    subject,
    description,
    dueDate,
    callAt,
    callDurationSeconds,
    callOutcome,
    callNotes,
  });

  return postRequestWithBodyAndToken(`${baseURl}crm-activity`, token, payload);
};

/** Relative meeting path (without origin), e.g. join/?meeting=<roomId> */
export const generateMeetingRoomPath = () =>
  `join/?meeting=${generateMeetingRoomId()}`;

/** Absolute meeting URL for sharing / email invites. */
export const buildMeetingLinkFromRoomId = (roomId) =>
  `${MEETING_APP_BASE_URL}/join/?meeting=${encodeURIComponent(roomId)}`;

/** Creates a video room and returns a shareable meeting link. */
export const createLeadMeetingLink = async (token) => {
  if (!token) {
    throw new Error('Authentication token not available');
  }
  const roomId = generateMeetingRoomId();
  const { roomId: finalRoomId } = await createVideoRoom(token, {
    roomId,
    status: 'scheduled',
    isOpenCall: false,
  });
  return buildMeetingLinkFromRoomId(finalRoomId || roomId);
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

/** Normalize CC to a string[] for send-email APIs. */
export const normalizeEmailCcList = (cc) => {
  if (Array.isArray(cc)) {
    return cc.map((email) => String(email || '').trim()).filter(Boolean);
  }
  if (typeof cc === 'string' && cc.trim()) {
    return cc
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }
  return [];
};

/** Convert File objects to API attachment payloads (filename, content, contentType). */
export const filesToEmailAttachments = async (files = []) => {
  const list = Array.isArray(files) ? files : [];
  return Promise.all(
    list.map(async (file) => ({
      filename: file?.name || 'attachment',
      content: await readFileAsBase64(file),
      contentType: file?.type || 'application/octet-stream',
    }))
  );
};

const buildSendEmailPayload = ({ subject, message, to, cc, attachments }) => {
  const payload = {
    subject: String(subject || '').trim(),
    message: String(message || '').trim(),
  };

  if (to?.trim()) {
    payload.to = to.trim();
  }

  const ccList = normalizeEmailCcList(cc);
  if (ccList.length > 0) {
    payload.cc = ccList;
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    payload.attachments = attachments.map((item) => ({
      filename: item.filename || 'attachment',
      content: item.content,
      contentType: item.contentType || 'application/octet-stream',
    }));
  }

  return payload;
};

/** POST /api/lead/:id/send-email */
export const sendLeadEmail = async ({
  leadId,
  subject,
  message,
  to,
  cc,
  attachments,
  files,
  token,
}) => {
  const resolvedAttachments =
    Array.isArray(attachments) && attachments.length > 0
      ? attachments
      : files?.length
        ? await filesToEmailAttachments(files)
        : [];

  const payload = buildSendEmailPayload({
    subject,
    message,
    to,
    cc,
    attachments: resolvedAttachments,
  });

  return postRequestWithBodyAndToken(
    `${baseURl}lead/${encodeURIComponent(leadId)}/send-email`,
    token,
    payload
  );
};

/** POST /api/lead/:id/create-meeting */
export const createLeadMeeting = async ({
  leadId,
  subject,
  description,
  scheduledAt,
  to,
  sendInvite,
  roomId,
  token,
}) => {
  const payload = {
    subject: subject.trim(),
    scheduledAt,
    sendInvite: Boolean(sendInvite),
    roomId: roomId || generateMeetingRoomPath(),
  };

  if (description?.trim()) {
    payload.description = description.trim();
  }
  if (to?.trim()) {
    payload.to = to.trim();
  }

  return postRequestWithBodyAndToken(
    `${baseURl}lead/${encodeURIComponent(leadId)}/create-meeting`,
    token,
    payload
  );
};

/** POST /api/lead/:id/schedule-follow-up */
export const scheduleLeadFollowUp = async ({
  leadId,
  subject,
  description,
  dueDate,
  to,
  sendInvite,
  meetingLink,
  token,
}) => {
  const payload = {
    subject: subject.trim(),
    sendInvite: Boolean(sendInvite),
  };

  if (description?.trim()) {
    payload.description = description.trim();
  }
  if (dueDate) {
    payload.dueDate = dueDate;
  }
  if (to?.trim()) {
    payload.to = to.trim();
  }
  if (meetingLink?.trim()) {
    payload.meetingLink = meetingLink.trim();
  }

  return postRequestWithBodyAndToken(
    `${baseURl}lead/${encodeURIComponent(leadId)}/schedule-follow-up`,
    token,
    payload
  );
};

export const fetchOpportunityActivities = async (opportunityId, token) => {
  const url = `${baseURl}crm-activity/entity/opportunity/${encodeURIComponent(opportunityId)}`;
  const result = await getRequestWithOutBody(url, token);
  return parseActivityList(result);
};

export const createOpportunityActivity = async ({
  opportunityId,
  type,
  subject,
  description,
  dueDate,
  callAt,
  callDurationSeconds,
  callOutcome,
  callNotes,
  token,
}) => {
  const payload = buildActivityPayload({
    entityType: 'opportunity',
    entityId: opportunityId,
    type,
    subject,
    description,
    dueDate,
    callAt,
    callDurationSeconds,
    callOutcome,
    callNotes,
  });

  return postRequestWithBodyAndToken(`${baseURl}crm-activity`, token, payload);
};

/** POST /api/crm-opportunity/:id/send-email */
export const sendOpportunityEmail = async ({
  opportunityId,
  subject,
  message,
  to,
  cc,
  attachments,
  files,
  token,
}) => {
  const resolvedAttachments =
    Array.isArray(attachments) && attachments.length > 0
      ? attachments
      : files?.length
        ? await filesToEmailAttachments(files)
        : [];

  const payload = buildSendEmailPayload({
    subject,
    message,
    to,
    cc,
    attachments: resolvedAttachments,
  });

  return postRequestWithBodyAndToken(
    `${baseURl}crm-opportunity/${encodeURIComponent(opportunityId)}/send-email`,
    token,
    payload
  );
};

/** POST /api/crm-opportunity/:id/create-meeting */
export const createOpportunityMeeting = async ({
  opportunityId,
  subject,
  description,
  scheduledAt,
  to,
  sendInvite,
  roomId,
  token,
}) => {
  const payload = {
    subject: subject.trim(),
    scheduledAt,
    sendInvite: Boolean(sendInvite),
    roomId: roomId || generateMeetingRoomPath(),
  };

  if (description?.trim()) {
    payload.description = description.trim();
  }
  if (to?.trim()) {
    payload.to = to.trim();
  }

  return postRequestWithBodyAndToken(
    `${baseURl}crm-opportunity/${encodeURIComponent(opportunityId)}/create-meeting`,
    token,
    payload
  );
};

/** POST /api/crm-opportunity/:id/schedule-follow-up */
export const scheduleOpportunityFollowUp = async ({
  opportunityId,
  subject,
  description,
  dueDate,
  to,
  sendInvite,
  meetingLink,
  token,
}) => {
  const payload = {
    subject: subject.trim(),
    sendInvite: Boolean(sendInvite),
  };

  if (description?.trim()) {
    payload.description = description.trim();
  }
  if (dueDate) {
    payload.dueDate = dueDate;
  }
  if (to?.trim()) {
    payload.to = to.trim();
  }
  if (meetingLink?.trim()) {
    payload.meetingLink = meetingLink.trim();
  }

  return postRequestWithBodyAndToken(
    `${baseURl}crm-opportunity/${encodeURIComponent(opportunityId)}/schedule-follow-up`,
    token,
    payload
  );
};

export const ACTIVITY_TYPE_COLORS = {
  call: '#1976d2',
  email: '#2e7d32',
  meeting: '#0288d1',
  notes: '#ed6c02',
  follow_up: '#9c27b0',
};

export const getActivityTypeLabel = (type) => {
  const key = String(type || 'call').toLowerCase();
  const found = ACTIVITY_TYPES.find((item) => item.value === key);
  if (found) return found.label;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getCallOutcomeLabel = (outcome) => {
  const key = String(outcome || '').toLowerCase();
  const found = CALL_OUTCOMES.find((item) => item.value === key);
  if (found) return found.label;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatCallDuration = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '';
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
};

