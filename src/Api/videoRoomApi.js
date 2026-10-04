import { getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from './fetch';
import { baseURl } from '../Config/systemConfig';

/**
 * Client-side roomId for a new video room, matching the backend's own format
 * (crypto.randomBytes(6).toString('hex')) so IDs look the same regardless of
 * which flow created the room.
 */
export const generateMeetingRoomId = () => {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Registers a video room on the server. Call only when the host creates a meeting.
 * Users joining via a shared link should not call this — they only join with the existing roomId.
 * When isOpenCall is true, joiners skip host approval (open meeting).
 */
export const createVideoRoom = async (token, { roomId, status = 'scheduled', isOpenCall = false } = {}) => {
  const url = `${baseURl}video-room`;
  const raw = await postRequestWithBodyAndToken(url, token, { roomId, status, isOpenCall: !!isOpenCall });
  const resolvedRoomId = raw?.roomId ?? raw?.data?.roomId ?? roomId;
  return { ...raw, roomId: resolvedRoomId };
};

/**
 * Updates a video room (e.g. toggle open call during a meeting).
 * PUT /api/video-room/:roomId
 */
export const updateVideoRoom = async (token, roomId, { isOpenCall } = {}) => {
  if (!token) throw new Error('token is required');
  if (!roomId) throw new Error('roomId is required');
  const url = `${baseURl}video-room/${encodeURIComponent(String(roomId))}`;
  const body = {};
  if (isOpenCall !== undefined) body.isOpenCall = !!isOpenCall;
  return await putRequestWithBodyAndToken(url, token, body);
};

/**
 * Fetches a video room by roomId to verify it exists.
 * Backend deletes rooms after ~1 hour; if this returns 404, the meeting link is expired.
 */
export const getVideoRoom = async (token, roomId, options = {}) => {
  if (!token) throw new Error('token is required');
  if (!roomId) throw new Error('roomId is required');
  const safeRoomId = encodeURIComponent(String(roomId));
  const url = `${baseURl}video-room/${safeRoomId}`;
  return await getRequestWithOutBody(url, token, options);
};

/**
 * Paginated list of video rooms (admin/HR monitoring).
 * GET /api/video-room?paginate=true&page=1&limit=20
 */
export const listVideoRooms = async (
  token,
  { page = 1, limit = 20, paginate = true, status } = {},
) => {
  if (!token) throw new Error('token is required');
  const params = new URLSearchParams({
    paginate: String(paginate),
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set('status', status);
  const url = `${baseURl}video-room?${params.toString()}`;
  return getRequestWithOutBody(url, token);
};

/**
 * Fetch a single video room by numeric id.
 * GET /api/video-room/:id
 */
export const getVideoRoomById = async (token, id, options = {}) => {
  if (!token) throw new Error('token is required');
  if (id === undefined || id === null || id === '') throw new Error('id is required');
  const url = `${baseURl}video-room/${encodeURIComponent(String(id))}`;
  return getRequestWithOutBody(url, token, options);
};

/** Unwrap `{ data: { ... } }` or return the payload as-is. */
export const normalizeVideoRoomResponse = (raw) => raw?.data ?? raw;

/**
 * Starts a ringing call: invites are pushed to invitees via `video:incomingCall`,
 * the caller joins their own roomId immediately (no ring for self).
 * POST /api/video-room/call
 */
export const startCall = async (token, { chatId, userIds, withVideo = true } = {}) => {
  if (!token) throw new Error('token is required');
  if (!chatId && !(Array.isArray(userIds) && userIds.length > 0)) {
    throw new Error('chatId or userIds is required');
  }
  const url = `${baseURl}video-room/call`;
  const body = { withVideo: !!withVideo };
  if (chatId !== undefined && chatId !== null) body.chatId = chatId;
  if (Array.isArray(userIds) && userIds.length > 0) body.userIds = userIds;
  return await postRequestWithBodyAndToken(url, token, body);
};

/**
 * Rings more people into an existing call.
 * POST /api/video-room/call/:id/invite
 */
export const inviteToCall = async (token, callId, { userIds, chatId } = {}) => {
  if (!token) throw new Error('token is required');
  if (!callId) throw new Error('callId is required');
  const url = `${baseURl}video-room/call/${encodeURIComponent(String(callId))}/invite`;
  const body = {};
  if (Array.isArray(userIds) && userIds.length > 0) body.userIds = userIds;
  if (chatId !== undefined && chatId !== null) body.chatId = chatId;
  return await postRequestWithBodyAndToken(url, token, body);
};

/**
 * Cancels remaining rings for a call (caller/host only).
 * POST /api/video-room/call/:id/cancel
 */
export const cancelCall = async (token, callId) => {
  if (!token) throw new Error('token is required');
  if (!callId) throw new Error('callId is required');
  const url = `${baseURl}video-room/call/${encodeURIComponent(String(callId))}/cancel`;
  return await postRequestWithBodyAndToken(url, token, {});
};

/**
 * Fetches call status (caller, host, any invitee, or a room participant may call this).
 * GET /api/video-room/call/:id
 */
export const getCall = async (token, callId) => {
  if (!token) throw new Error('token is required');
  if (!callId) throw new Error('callId is required');
  const url = `${baseURl}video-room/call/${encodeURIComponent(String(callId))}`;
  const raw = await getRequestWithOutBody(url, token);
  return normalizeVideoRoomResponse(raw);
};
