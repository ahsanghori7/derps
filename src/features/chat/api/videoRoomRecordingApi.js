import { getRequestWithOutBody } from '@api/fetch';
import { baseURl } from '../../../Config/systemConfig';

/**
 * Paginated list of video room recordings (admin/HR monitoring).
 * GET /api/video-room-recording?paginate=true&page=1&limit=10
 */
export const listVideoRoomRecordings = async (
  token,
  { page = 1, limit = 10, paginate = true, roomId, videoRoomId, status, orderBy, order } = {},
) => {
  if (!token) throw new Error('token is required');
  const params = new URLSearchParams({
    paginate: String(paginate),
    page: String(page),
    limit: String(limit),
  });
  if (roomId) params.set('roomId', roomId);
  if (videoRoomId !== undefined && videoRoomId !== null) params.set('videoRoomId', String(videoRoomId));
  if (status) params.set('status', status);
  if (orderBy) params.set('orderBy', orderBy);
  if (order) params.set('order', order);
  const url = `${baseURl}video-room-recording?${params.toString()}`;
  return getRequestWithOutBody(url, token);
};

/**
 * Fetch a single video room recording by numeric id.
 * GET /api/video-room-recording/:id
 */
export const getVideoRoomRecordingById = async (token, id, options = {}) => {
  if (!token) throw new Error('token is required');
  if (id === undefined || id === null || id === '') throw new Error('id is required');
  const url = `${baseURl}video-room-recording/${encodeURIComponent(String(id))}`;
  return getRequestWithOutBody(url, token, options);
};
