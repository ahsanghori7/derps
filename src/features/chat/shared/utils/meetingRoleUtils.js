export const isAdminOrHR = (user) => {
  const roleTitle = user?.roleTitle?.toLowerCase?.() || '';
  return roleTitle.includes('admin') || roleTitle.includes('human resource');
};

export const getLiveMeetings = (meetings) =>
  (Array.isArray(meetings) ? meetings : []).filter((m) => m?.status === 'live');

const sortByJoinedAt = (a, b) =>
  new Date(a?.joinedAt || 0).getTime() - new Date(b?.joinedAt || 0).getTime();

/** Group multiple join/leave sessions for the same userId into one entry. */
export const groupParticipantsByUser = (participants) => {
  if (!Array.isArray(participants)) return [];

  const byUser = new Map();

  participants.forEach((participant) => {
    const userId = participant?.userId;
    if (userId === undefined || userId === null) return;

    const key = String(userId);
    if (!byUser.has(key)) {
      byUser.set(key, {
        userId,
        user: participant.user,
        sessions: [],
      });
    }

    const group = byUser.get(key);
    group.sessions.push(participant);
    if (participant.user) group.user = participant.user;
  });

  return Array.from(byUser.values())
    .map((group) => {
      const sessions = [...group.sessions].sort(sortByJoinedAt);
      const isActive = sessions.some((s) => !s.leftAt);
      return { ...group, sessions, isActive };
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const aLatest = a.sessions[a.sessions.length - 1]?.joinedAt || '';
      const bLatest = b.sessions[b.sessions.length - 1]?.joinedAt || '';
      return bLatest.localeCompare(aLatest);
    });
};

/** Chronological join/leave events across all sessions for one user. */
export const buildParticipantTrail = (sessions) => {
  const events = [];

  (sessions || []).forEach((session) => {
    if (session.joinedAt) {
      events.push({ type: 'joined', at: session.joinedAt });
    }
    if (session.leftAt) {
      events.push({ type: 'left', at: session.leftAt });
    }
  });

  return events.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
};

export const getActiveParticipants = (meeting) => {
  return groupParticipantsByUser(meeting?.participants).filter((g) => g.isActive);
};

export const getUniqueParticipantCount = (meeting) =>
  groupParticipantsByUser(meeting?.participants).length;

