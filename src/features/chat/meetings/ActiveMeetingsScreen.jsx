import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { toast } from 'react-toastify';
import { ChatThemeRoot } from '../shared/theme';
import { EmptyState } from '../shared/components';
import ActiveMeetingCard from './ActiveMeetingCard';
import {
  getActiveParticipants,
  getLiveMeetings,
  isAdminOrHR,
} from '../shared/utils/meetingRoleUtils';
import { useAuthUser } from '@hooks/useAuthUser';
import { usePageTitle } from '@hooks/usePageTitle';
import {
  getVideoRoomById,
  listVideoRooms,
  normalizeVideoRoomResponse,
} from '@api/videoRoomApi';
import { getErrorMessage } from '@utils/errorHandler';
import { BackIcon, GroupIcon, VideoIcon } from '../shared/icons';
import { getChatRoute } from '../shared/utils/chatUtility';
import './ActiveMeetings.css';

const PAGE_LIMIT = 20;
const AUTO_REFRESH_MS = 30000;

const SummaryStat = ({ icon, label, value, accent = 'green' }) => {
  const accentStyles = {
    green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  };

  return (
    <div className="rounded-xl border chat-divider chat-surface p-4 flex items-center gap-4 shadow-md">
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center ${accentStyles[accent]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide chat-text-muted">{label}</p>
        <p className="text-2xl font-bold chat-text mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  );
};

SummaryStat.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  accent: PropTypes.oneOf(['green', 'blue']),
};

const ActiveMeetingsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSelector((state) => state.userData?.userDetails);
  const { token } = useAuthUser();
  const [meetings, setMeetings] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const refreshTimerRef = useRef(null);

  usePageTitle('Active Meetings', location);

  const liveMeetings = useMemo(() => getLiveMeetings(meetings), [meetings]);
  const ongoingCount = liveMeetings.length;

  const totalInCall = useMemo(
    () =>
      liveMeetings.reduce(
        (sum, meeting) => sum + getActiveParticipants(meeting).length,
        0,
      ),
    [liveMeetings],
  );

  useEffect(() => {
    if (!isAdminOrHR(currentUser)) {
      navigate(getChatRoute(location.pathname), { replace: true });
    }
  }, [currentUser, navigate]);

  const mergeMeeting = useCallback((prev, updated) => {
    if (!updated?.id) return prev;
    return prev.map((m) => {
      if (String(m.id) !== String(updated.id)) return m;
      return {
        ...m,
        ...updated,
        participants: updated.participants ?? m.participants,
        host: updated.host ?? m.host,
        originalHost: updated.originalHost ?? m.originalHost,
      };
    });
  }, []);

  const loadMeetings = useCallback(
    async ({ nextPage = 1, append = false, silent = false } = {}) => {
      if (!token) return;

      try {
        if (append) setLoadingMore(true);
        else if (!silent) setLoading(true);

        const raw = await listVideoRooms(token, {
          page: nextPage,
          limit: PAGE_LIMIT,
          paginate: true,
          status: 'live',
        });
        const payload = raw?.data ?? raw;
        const results = Array.isArray(payload?.results) ? payload.results : [];
        const total = payload?.totalRecords ?? results.length;

        setMeetings((prev) => (append ? [...prev, ...results] : results));
        setPage(nextPage);
        setTotalRecords(total);
        setHasMore(nextPage * PAGE_LIMIT < total);
        setLastRefreshedAt(new Date());
      } catch (error) {
        if (!silent) {
          toast.error(getErrorMessage(error, 'Failed to load active meetings'));
        }
      } finally {
        if (append) setLoadingMore(false);
        else if (!silent) setLoading(false);
      }
    },
    [token],
  );

  const refreshMeeting = useCallback(
    async (meetingId) => {
      if (!token || !meetingId) return;
      try {
        const raw = await getVideoRoomById(token, meetingId);
        const updated = normalizeVideoRoomResponse(raw);
        setMeetings((prev) => mergeMeeting(prev, updated));
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to refresh meeting'));
      }
    },
    [token, mergeMeeting],
  );

  useEffect(() => {
    if (!isAdminOrHR(currentUser)) return;

    loadMeetings({ nextPage: 1 });

    refreshTimerRef.current = setInterval(() => {
      loadMeetings({ nextPage: 1, silent: true });
    }, AUTO_REFRESH_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [currentUser, loadMeetings]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    loadMeetings({ nextPage: page + 1, append: true });
  };

  if (!isAdminOrHR(currentUser)) {
    return null;
  }

  return (
    <ChatThemeRoot className="min-h-screen flex flex-col chat-bg">
      <header className="sticky top-0 z-10 chat-surface chat-divider-b px-4 py-4 sm:px-6 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(getChatRoute(location.pathname))}
              className="p-2 chat-hover rounded-full transition-colors"
              aria-label="Back to chat"
            >
              <BackIcon className="w-5 h-5 chat-text" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold chat-text">Active Meetings</h1>
                {ongoingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    Live
                  </span>
                )}
              </div>
              <p className="text-sm chat-text-muted mt-0.5">
                Real-time overview of ongoing video meetings
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadMeetings({ nextPage: 1 })}
              disabled={loading}
              className="flex-shrink-0 text-sm px-4 py-2 rounded-lg font-medium chat-control chat-text-secondary disabled:opacity-50 transition-colors shadow-md"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto chat-scroll p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SummaryStat
              icon={<VideoIcon className="w-5 h-5" />}
              label="Ongoing meetings"
              value={loading && meetings.length === 0 ? '—' : ongoingCount}
              accent="green"
            />
            <SummaryStat
              icon={<GroupIcon className="w-5 h-5" />}
              label="People in calls"
              value={loading && meetings.length === 0 ? '—' : totalInCall}
              accent="blue"
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs chat-text-muted">
            <span>
              Auto-refreshes every 30 seconds
              {lastRefreshedAt && (
                <> · Last updated {moment(lastRefreshedAt).format('hh:mm A')}</>
              )}
            </span>
            {totalRecords > liveMeetings.length && (
              <span>
                Showing {liveMeetings.length} of {totalRecords}
              </span>
            )}
          </div>

          {loading && meetings.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border chat-divider chat-surface animate-pulse"
                  style={{ borderLeftWidth: 4, borderLeftColor: 'var(--chat-border)' }}
                />
              ))}
            </div>
          ) : liveMeetings.length === 0 ? (
            <div className="rounded-xl border chat-divider chat-surface py-16 px-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl chat-bg-muted flex items-center justify-center mb-4">
                <VideoIcon className="w-7 h-7 chat-text-muted" />
              </div>
              <EmptyState className="py-0">
                <p className="text-base font-semibold chat-text">No active meetings</p>
                <p className="text-sm chat-text-muted mt-1 max-w-sm mx-auto">
                  When someone starts a meeting, it will appear here with live participant details.
                </p>
              </EmptyState>
            </div>
          ) : (
            <div className="space-y-4">
              {liveMeetings.map((meeting) => (
                <ActiveMeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onRefresh={refreshMeeting}
                />
              ))}
            </div>
          )}

          {!loading && hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 text-sm font-medium chat-text-secondary chat-control rounded-lg disabled:opacity-50 transition-colors"
              >
                {loadingMore ? 'Loading more…' : `Load more (${meetings.length} of ${totalRecords})`}
              </button>
            </div>
          )}
        </div>
      </main>
    </ChatThemeRoot>
  );
};

export default ActiveMeetingsScreen;
