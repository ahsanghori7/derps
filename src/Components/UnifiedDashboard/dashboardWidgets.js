const PREFS_KEY = "drms-dashboard-widgets-v1";

export const WORKSPACE_WIDGETS = [
  {
    id: "overview",
    name: "Ticket Summary",
    group: "Tickets",
    route: null,
    defaultOn: true,
    type: "kpiRow",
    subtitle: "Total · Pending · Completed · This month",
  },
  {
    id: "schedule",
    name: "Today's Schedule",
    group: "Calendar",
    route: "calendar",
    defaultOn: true,
    type: "schedule",
    subtitle: "Today's meetings and tasks",
  },
  {
    id: "chats",
    name: "Chats",
    group: "Communication",
    route: "chat",
    defaultOn: true,
    type: "chatList",
    subtitle: "Unread messages and recent conversations",
  },
  {
    id: "ticketTrends",
    name: "Ticket Trends",
    group: "Tickets",
    route: "agentsTickets",
    defaultOn: true,
    type: "stackedBars",
    subtitle: "Completed and pending by period",
  },
  {
    id: "ticketCategories",
    name: "Tickets by Category",
    group: "Tickets",
    route: "agentsTickets",
    defaultOn: true,
    type: "stackedBars",
    subtitle: "New, in progress, and completed",
  },
  {
    id: "assignedUsers",
    name: "Most Assigned Users",
    group: "Tickets",
    route: "agent",
    defaultOn: true,
    type: "rankedList",
    subtitle: "Highest ticket assignments",
  },
  {
    id: "insights",
    name: "Project Insights",
    group: "Projects",
    route: "trackingReports",
    defaultOn: true,
    type: "insights",
    subtitle: "Projects · tracking · performance · attendance",
  },
];

// Prefs live in the browser, so the key is per user — otherwise every account
// signed in on this browser would share one layout.
function prefsKey(userId) {
  return userId ? `${PREFS_KEY}:${userId}` : PREFS_KEY;
}

export function loadWidgetPrefs(userId) {
  const defaults = Object.fromEntries(
    WORKSPACE_WIDGETS.map((widget) => [widget.id, widget.defaultOn]),
  );
  try {
    const parsed = JSON.parse(localStorage.getItem(prefsKey(userId)) || "null");
    if (!parsed || typeof parsed !== "object") return defaults;
    const next = { ...defaults };
    WORKSPACE_WIDGETS.forEach((widget) => {
      if (typeof parsed[widget.id] === "boolean") next[widget.id] = parsed[widget.id];
    });
    return next;
  } catch {
    return defaults;
  }
}

export function saveWidgetPrefs(prefs, userId) {
  const current = loadWidgetPrefs(userId);
  localStorage.setItem(prefsKey(userId), JSON.stringify({ ...current, ...prefs }));
}
