import { useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { toast } from 'react-toastify';
import { Avatar } from '../shared/components';
import {
  ChevronDownIcon,
  ClockIcon,
  CopyIcon,
  CrownIcon,
  GroupIcon,
  LinkIcon,
  VideoIcon,
} from '../shared/icons';
import {
  buildParticipantTrail,
  getActiveParticipants,
  getUniqueParticipantCount,
  groupParticipantsByUser,
} from '../shared/utils/meetingRoleUtils';

const formatTime = (timestamp) =>
  timestamp ? moment.utc(timestamp).local().format('hh:mm A') : '—';

const formatDuration = (startedAt) => {
  if (!startedAt) return '—';
  const start = moment.utc(startedAt).local();
  if (!start.isValid()) return '—';
  const mins = moment().diff(start, 'minutes');
  if (mins < 1) return 'Just started';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const StatChip = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium chat-bg-muted chat-text-secondary">
    {icon}
    {label}
  </span>
);

StatChip.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
};

const AvatarStack = ({ groups, max = 4 }) => {
  const active = groups.filter((g) => g.isActive);
  if (active.length === 0) return null;

  const visible = active.slice(0, max);
  const overflow = active.length - visible.length;

  return (
    <div className="flex items-center gap-2 mt-2.5">
      <div className="flex -space-x-2">
        {visible.map((group) => (
          <Avatar
            key={group.userId}
            id={group.userId}
            name={group.user?.name}
            user={group.user}
            size="xs"
            className="ring-2 ring-[var(--chat-surface)]"
          />
        ))}
        {overflow > 0 && (
          <div className="w-6 h-6 rounded-full chat-control flex items-center justify-center text-[10px] font-semibold chat-text-secondary ring-2 ring-[var(--chat-surface)]">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-xs chat-text-muted">{active.length} in call now</span>
    </div>
  );
};

AvatarStack.propTypes = {
  groups: PropTypes.array.isRequired,
  max: PropTypes.number,
};

const ParticipantTrail = ({ trail, isActive, sessions }) => {
  if (!trail.length) return null;

  return (
    <div className="mt-3 relative pl-1">
      <div
        className="absolute left-[9px] top-2 bottom-2 w-px"
        style={{ background: 'var(--chat-border)' }}
      />
      <ul className="space-y-2.5">
        {trail.map((event, index) => {
          const isLast = index === trail.length - 1;
          const isCurrentSession =
            isActive &&
            isLast &&
            event.type === 'joined' &&
            !sessions[sessions.length - 1]?.leftAt;

          return (
            <li
              key={`${event.type}-${event.at}-${index}`}
              className="relative flex items-start gap-3 pl-5"
            >
              <span
                className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                  event.type === 'joined'
                    ? 'border-green-500 bg-green-500/15'
                    : 'border-[var(--chat-border-strong)] chat-bg-muted'
                }`}
                style={{ borderColor: event.type === 'joined' ? undefined : 'var(--chat-border-strong)' }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    event.type === 'joined' ? 'bg-green-500' : 'bg-[var(--chat-text-subtle)]'
                  }`}
                />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-xs font-medium chat-text">
                  {event.type === 'joined' ? 'Joined' : 'Left'}{' '}
                  <span className="chat-text-muted font-normal">{formatTime(event.at)}</span>
                </p>
                {isCurrentSession && (
                  <span className="inline-flex mt-1 items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Currently in call
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

ParticipantTrail.propTypes = {
  trail: PropTypes.array.isRequired,
  isActive: PropTypes.bool,
  sessions: PropTypes.array.isRequired,
};

const ActiveMeetingCard = ({ meeting, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeParticipants = getActiveParticipants(meeting);
  const groupedParticipants = groupParticipantsByUser(meeting.participants);
  const uniqueParticipantCount = getUniqueParticipantCount(meeting);
  const hostName = meeting.host?.name || 'Unknown host';

  const handleRefresh = async (e) => {
    e.stopPropagation();
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh(meeting.id);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (!meeting.meetingLink) return;
    navigator.clipboard.writeText(meeting.meetingLink).then(
      () => toast.success('Meeting link copied'),
      () => toast.error('Could not copy link'),
    );
  };

  return (
    <article
      className={`rounded-xl border chat-divider overflow-hidden transition-shadow ${
        expanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: '#22c55e' }}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left p-4 sm:p-5 chat-hover transition-colors min-w-0"
        >
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <Avatar id={meeting.hostId} name={hostName} user={meeting.host} size="md" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-[var(--chat-surface)]" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold chat-text truncate">{hostName}</h3>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">
                  <VideoIcon className="w-3 h-3" />
                  Live
                </span>
              </div>

              <p
                className="text-xs chat-text-muted mt-1 font-mono truncate opacity-80"
                title={meeting.roomId}
              >
                {meeting.roomId}
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                <StatChip
                  icon={<ClockIcon className="w-3.5 h-3.5 chat-text-muted" />}
                  label={formatDuration(meeting.startedAt)}
                />
                <StatChip
                  icon={<VideoIcon className="w-3.5 h-3.5 chat-text-muted" />}
                  label={`${activeParticipants.length} in call`}
                />
                <StatChip
                  icon={<GroupIcon className="w-3.5 h-3.5 chat-text-muted" />}
                  label={`${uniqueParticipantCount} joined`}
                />
              </div>

              {!expanded && <AvatarStack groups={groupedParticipants} />}
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0 self-start">
              <ChevronDownIcon
                className={`w-5 h-5 chat-text-muted transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
              <span className="text-[11px] chat-text-muted whitespace-nowrap mt-1">
                {meeting.startedAt
                  ? moment.utc(meeting.startedAt).local().format('MMM D, hh:mm A')
                  : '—'}
              </span>
            </div>
          </div>
        </button>

        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh meeting"
            className={`flex-shrink-0 w-10 flex items-center justify-center chat-divider-l chat-hover transition-colors disabled:opacity-50 self-stretch ${
              refreshing ? 'opacity-60' : ''
            }`}
          >
            <span
              className={`text-lg chat-text-muted leading-none ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden
            >
              ↻
            </span>
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-0 chat-divider-t chat-bg-muted/40">
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg chat-surface border chat-divider p-3">
                <p className="text-[10px] chat-text-muted uppercase tracking-wider font-semibold mb-2">
                  Host
                </p>
                <div className="flex items-center gap-3">
                  <Avatar id={meeting.hostId} name={hostName} user={meeting.host} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold chat-text truncate">{hostName}</p>
                    {meeting.host?.email && (
                      <p className="text-xs chat-text-muted truncate">{meeting.host.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {meeting.originalHost &&
                meeting.originalHost.id !== meeting.hostId && (
                  <div className="rounded-lg chat-surface border chat-divider p-3">
                    <p className="text-[10px] chat-text-muted uppercase tracking-wider font-semibold mb-2">
                      Original host
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar
                        id={meeting.originalHost.id}
                        name={meeting.originalHost.name}
                        user={meeting.originalHost}
                        size="sm"
                      />
                      <p className="text-sm font-semibold chat-text truncate">
                        {meeting.originalHost.name}
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {meeting.meetingLink && (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={meeting.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium chat-accent bg-blue-500/10 hover:bg-blue-500/15 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon className="w-4 h-4" />
                  Open meeting
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium chat-text-secondary chat-control transition-colors"
                >
                  <CopyIcon className="w-4 h-4" />
                  Copy link
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider chat-text-muted">
                  Participants
                </h4>
                <span className="text-xs chat-text-muted">
                  {activeParticipants.length} active · {uniqueParticipantCount} unique
                </span>
              </div>

              {groupedParticipants.length === 0 ? (
                <p className="text-sm chat-text-muted py-4 text-center rounded-lg chat-surface border chat-divider border-dashed">
                  No participants recorded yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {groupedParticipants.map((group) => {
                    const isHost = String(group.userId) === String(meeting.hostId);
                    const trail = buildParticipantTrail(group.sessions);

                    return (
                      <li
                        key={group.userId}
                        className={`rounded-lg chat-surface border chat-divider p-3 ${
                          group.isActive ? 'ring-1 ring-green-500/25' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar
                              id={group.userId}
                              name={group.user?.name}
                              user={group.user}
                              size="sm"
                            />
                            {group.isActive && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--chat-surface)]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold chat-text truncate">
                                    {group.user?.name || 'Unknown'}
                                  </p>
                                  {isHost && (
                                    <CrownIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  )}
                                </div>
                                {group.user?.email && (
                                  <p className="text-xs chat-text-muted truncate mt-0.5">
                                    {group.user.email}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  group.isActive
                                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                    : 'chat-bg-muted chat-text-muted'
                                }`}
                              >
                                {group.isActive ? 'In call' : 'Left'}
                              </span>
                            </div>

                            <ParticipantTrail
                              trail={trail}
                              isActive={group.isActive}
                              sessions={group.sessions}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

ActiveMeetingCard.propTypes = {
  meeting: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    roomId: PropTypes.string,
    status: PropTypes.string,
    startedAt: PropTypes.string,
    hostId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    host: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      email: PropTypes.string,
    }),
    originalHost: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
    }),
    meetingLink: PropTypes.string,
    participants: PropTypes.array,
  }).isRequired,
  onRefresh: PropTypes.func,
};

export default ActiveMeetingCard;
