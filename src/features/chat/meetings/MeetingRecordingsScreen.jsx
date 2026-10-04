import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { ChatThemeRoot } from '../shared/theme';
import { EmptyState } from '../shared/components';
import { isAdminOrHR } from '../shared/utils/meetingRoleUtils';
import { useAuthUser } from '@hooks/useAuthUser';
import { usePageTitle } from '@hooks/usePageTitle';
import { listVideoRoomRecordings } from '../api/videoRoomRecordingApi';
import { getErrorMessage } from '@utils/errorHandler';
import { BackIcon, PlayFilledIcon, RecordIcon } from '../shared/icons';
import { getChatRoute } from '../shared/utils/chatUtility';
import './ActiveMeetings.css';

const PAGE_LIMIT = 10;

const STATUS_STYLES = {
  recording: 'bg-red-500/15 text-red-600 dark:text-red-400',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  failed: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
      STATUS_STYLES[status] || STATUS_STYLES.failed
    }`}
  >
    {status}
  </span>
);
StatusBadge.propTypes = { status: PropTypes.string };

const RecordingRow = ({ recording }) => {
  const roomId = recording.roomId ?? recording.videoRoom?.roomId ?? '—';
  const startedByName = recording.startedBy?.name || recording.startedBy?.email || '—';

  return (
    <div className="rounded-xl border chat-divider chat-surface p-4 flex items-center gap-4 shadow-md">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl border border-red-500/20 bg-red-500/10 flex items-center justify-center">
        <RecordIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold chat-text truncate">{roomId}</span>
          <StatusBadge status={recording.status} />
        </div>
        <p className="text-sm chat-text-muted mt-0.5">
          Started by {startedByName}
          {recording.startedAt && <> · {moment(recording.startedAt).format('MMM D, YYYY hh:mm A')}</>}
          {recording.durationLabel && <> · {recording.durationLabel}</>}
        </p>
        {recording.status === 'failed' && recording.errorMessage && (
          <p className="text-xs text-red-500 mt-1">{recording.errorMessage}</p>
        )}
      </div>
      {recording.status === 'completed' && recording.fileUrl && (
        <a
          href={recording.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium chat-control chat-text-secondary transition-colors shadow-md"
        >
          <PlayFilledIcon className="w-4 h-4" />
          Open
        </a>
      )}
    </div>
  );
};
RecordingRow.propTypes = {
  recording: PropTypes.shape({
    roomId: PropTypes.string,
    videoRoom: PropTypes.shape({ roomId: PropTypes.string }),
    status: PropTypes.string,
    startedBy: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }),
    startedAt: PropTypes.string,
    durationLabel: PropTypes.string,
    errorMessage: PropTypes.string,
    fileUrl: PropTypes.string,
  }).isRequired,
};

const MeetingRecordingsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSelector((state) => state.userData?.userDetails);
  const { token } = useAuthUser();
  const [recordings, setRecordings] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  usePageTitle('Meeting Recordings', location);

  useEffect(() => {
    if (!isAdminOrHR(currentUser)) {
      navigate(getChatRoute(location.pathname), { replace: true });
    }
  }, [currentUser, navigate]);

  const loadRecordings = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      if (!token) return;

      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const raw = await listVideoRoomRecordings(token, {
          page: nextPage,
          limit: PAGE_LIMIT,
          paginate: true,
        });
        const payload = raw?.data ?? raw;
        const results = Array.isArray(payload?.results) ? payload.results : [];
        const total = payload?.totalRecords ?? results.length;

        setRecordings((prev) => (append ? [...prev, ...results] : results));
        setPage(nextPage);
        setTotalRecords(total);
        setHasMore(nextPage * PAGE_LIMIT < total);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load recordings'));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!isAdminOrHR(currentUser)) return;
    loadRecordings({ nextPage: 1 });
  }, [currentUser, loadRecordings]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    loadRecordings({ nextPage: page + 1, append: true });
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
              <h1 className="text-xl sm:text-2xl font-bold chat-text">Meeting Recordings</h1>
              <p className="text-sm chat-text-muted mt-0.5">
                Browse and download past meeting recordings
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadRecordings({ nextPage: 1 })}
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
          {loading && recordings.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border chat-divider chat-surface animate-pulse"
                  style={{ borderLeftWidth: 4, borderLeftColor: 'var(--chat-border)' }}
                />
              ))}
            </div>
          ) : recordings.length === 0 ? (
            <div className="rounded-xl border chat-divider chat-surface py-16 px-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl chat-bg-muted flex items-center justify-center mb-4">
                <RecordIcon className="w-7 h-7 chat-text-muted" />
              </div>
              <EmptyState className="py-0">
                <p className="text-base font-semibold chat-text">No recordings yet</p>
                <p className="text-sm chat-text-muted mt-1 max-w-sm mx-auto">
                  When a meeting is recorded, it will appear here once available.
                </p>
              </EmptyState>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <RecordingRow key={recording.id} recording={recording} />
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
                {loadingMore ? 'Loading more…' : `Load more (${recordings.length} of ${totalRecords})`}
              </button>
            </div>
          )}
        </div>
      </main>
    </ChatThemeRoot>
  );
};

export default MeetingRecordingsScreen;
