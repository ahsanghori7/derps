export const buildEventInviteMessage = ({ title, agenda, eventDate, startTime, endTime, meetingLink }, { isUpdate = false } = {}) => {
    const lines = [
        `📅 ${isUpdate ? 'Event Updated' : 'New Event'}: ${title}`,
        `Date: ${eventDate}   Time: ${startTime} - ${endTime}`,
    ];

    if (meetingLink) lines.push(`Meeting Link: ${meetingLink}`);
    if (agenda) lines.push(`Agenda: ${agenda}`);

    return lines.join('\n');
};
