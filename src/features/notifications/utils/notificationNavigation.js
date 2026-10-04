import { getChatRoute } from "@features/chat/shared/utils/chatUtility";

const toUrlProjectName = (name) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

const buildTaskDetailPath = (meta) => {
  const taskId = meta?.id;
  if (!taskId) return null;

  const projectName = meta?.project?.name || meta?.projectName;
  const urlProjectName = projectName ? toUrlProjectName(projectName) : null;

  return urlProjectName
    ? `/home/taskDetail/${urlProjectName}/${taskId}`
    : `/home/taskDetail/${taskId}`;
};

const buildTaskDetailNavigation = (meta, fromRoute = "myTask") => ({
  path: buildTaskDetailPath(meta),
  state: {
    itemData: meta,
    projectName: meta?.project?.name || meta?.projectId,
    fromRoute,
  },
});

/**
 * Utility function to determine navigation path and state from a notification
 * @param {Object} notification - The notification object
 * @returns {Object|null} - Navigation object with path and state, or null if no navigation needed
 */
export const getNotificationNavigation = (notification) => {
  if (!notification) return null;

  const body = (notification.body || notification.title || "").toLowerCase();
  const title = (notification.title || "").toLowerCase();
  const meta = notification.meta || {};
  const projectId = meta?.project?.id || meta?.projectId;
  // ensure projectId is always available for later checks
  meta.projectId = projectId;

  // Chat notifications: if meta contains chat information we always want to route to chat
  // regardless of the body text.  Some back‑end payloads are inconsistent, so we try to
  // pull as much useful data as we can from the `meta` object.
  const chatIdFromMeta = meta?.chatId || meta?.chat?.id;
  const chatDataFromMeta = meta?.chat || null;

  // Determine a candidate message ID.  The back end has used a number of different
  // property names over time, and unfortunately `meta.id` can sometimes contain the
  // chat's ID rather than a message ID.  In the latter case we must *not* treat it as
  // a message reference because it will result in an impossible scroll target.
  let messageIdFromMeta =
    meta?.messageId ||
    meta?.message?.id ||
    meta?.chatMessageId ||
    meta?.chat_message_id;

  // If we still don't have a message id but we do have an `id` field that does **not**
  // match the chat id, assume it is the message identifier.  This covers older
  // payloads where the backend put the message id in the generic `id` property.
  if (!messageIdFromMeta && meta?.id) {
    const maybeId = String(meta.id);
    if (chatIdFromMeta && maybeId !== String(chatIdFromMeta)) {
      messageIdFromMeta = maybeId;
    } else if (
      !chatIdFromMeta &&
      chatDataFromMeta &&
      maybeId !== String(chatDataFromMeta.id)
    ) {
      messageIdFromMeta = maybeId;
    }
  }

  // If the only thing we found was the chat id itself, drop it – it isn't a message.
  if (
    messageIdFromMeta &&
    chatIdFromMeta &&
    String(messageIdFromMeta) === String(chatIdFromMeta)
  ) {
    messageIdFromMeta = undefined;
  }

  if (chatIdFromMeta || chatDataFromMeta) {
    return {
      path: getChatRoute(),
      state: {
        selectedChatId: chatIdFromMeta,
        selectedChat: chatDataFromMeta,
        selectedMessageId: messageIdFromMeta,
      },
    };
  }

  // Check for booking / meeting notifications (public booking page bookings and reminders)
  // Examples: "Ahsan booked a slot on 2026-09-02 at 12:00:00", "Meeting with Ahsan starts in 30 minutes"
  const meetingIdFromMeta = meta?.meetingId;
  if (
    notification.type === "booking" ||
    notification.type === "booking_reminder" ||
    meetingIdFromMeta
  ) {
    if (meetingIdFromMeta) {
      return {
        path: "/home/calendar/",
        state: {
          selectedMeetingId: meetingIdFromMeta,
          selectedBookingId: meta?.bookingId,
          itemData: meta,
        },
      };
    }
  }

  // Check for ticket/task assignment notifications
  // Examples: "Admin assigned you a ticket test", "Admin assigned you a ticket Subt task"
  if (
    body.includes("assigned you a ticket") ||
    body.includes("assigned you a task")
  ) {
    if (meta.id) {
      // Check if it's a task (has project?.id) or a ticket
      if (projectId) {
        return buildTaskDetailNavigation(meta);
      } else {
        // It's a ticket - navigate to single ticket
        return {
          path: `/home/singleTicket/${meta.id}`,
          state: {
            rowData: meta,
          },
        };
      }
    }
  }

  // Check for memo notifications
  // Example: "A new memo is create, Please review."
  if (
    title.includes("new memo") 
    // &&
    // (body.includes("create") ||
    //   body.includes("created") ||
    //   body.includes("review"))
  ) {
    if (meta.id) {
      return {
        path: "/home/memo",
        state: {
          itemData: meta,
        },
      };
    }
  }

  // Check for credit card application notifications
  // Example: "New Credit Card Application" / "Admin: create a new credit card application ."
  if (
    title.includes("credit card application") ||
    body.includes("credit card application")
  ) {
    if (meta.id) {
      return {
        path: "/home/editApplication",
        state: {
          itemData: meta,
        },
      };
    }
  }

  // Check for message/chat notifications
  // Example: "Admin: send you a new message."
  if (
    body.includes("send you a new message") ||
    body.includes("sent you a message") ||
    body.includes("new message")
  ) {
    // Check if notification meta contains chat information
    const chatId = chatIdFromMeta;
    const chatData = chatDataFromMeta;
    const messageId = messageIdFromMeta;

    if (chatId || chatData) {
      return {
        path: getChatRoute(),
        state: {
          selectedChatId: chatId,
          selectedChat: chatData,
          selectedMessageId: messageId,
        },
      };
    }

    // Fallback to general chat if no specific chat info
    return {
      path: getChatRoute(),
      state: null,
    };
  }

  // Check for ticket status change notifications
  if (body.includes("status changed") || body.includes("status update")) {
    if (meta.id) {
      if (projectId) {
        return buildTaskDetailNavigation(meta);
      } else {
        return {
          path: `/home/singleTicket/${meta.id}`,
          state: {
            rowData: meta,
          },
        };
      }
    }
  }

  // Check for ticket comment notifications
  if (body.includes("comment") || body.includes("commented")) {
    if (meta.id) {
      if (projectId) {
        return buildTaskDetailNavigation(meta);
      } else {
        return {
          path: `/home/singleTicket/${meta.id}`,
          state: {
            rowData: meta,
          },
        };
      }
    }
  }

  // Check for file added notifications
  if (body.includes("file added") || body.includes("added a file")) {
    if (meta.id) {
      if (projectId) {
        return buildTaskDetailNavigation(meta);
      } else {
        return {
          path: `/home/singleTicket/${meta.id}`,
          state: {
            rowData: meta,
          },
        };
      }
    }
  }

  // Fallback: if meta has id but no specific pattern matched, try to determine from meta structure
  if (meta.id) {
    // If it has project?.id, it's likely a task
    if (projectId) {
      return buildTaskDetailNavigation(meta);
    }
    // Otherwise, assume it's a ticket
    return {
      path: `/home/singleTicket/${meta.id}`,
      state: {
        rowData: meta,
      },
    };
  }

  return null;
};
