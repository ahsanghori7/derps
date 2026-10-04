// Deep links from dashboard widgets into list screens, with the clicked
// status / category / user pre-selected using each screen's own URL format.

function compact(value) {
  return String(value ?? "").toLowerCase().replace(/[\s_-]/g, "");
}

/** Finds the screen's option value matching a dashboard status label or key. */
function matchOption(options, raw, aliases = {}) {
  const key = compact(raw);
  const target = aliases[key] || key;
  return options.find((option) => compact(option) === target) || null;
}

const segment = (value) => encodeURIComponent(String(value));

const TICKET_STATUSES = ["pending", "in-progress", "complete", "active", "inactive"];
const TICKET_ALIASES = { completed: "complete", new: "pending", open: "pending" };

function ticketsPath({ status, category, agent } = {}) {
  const parts = ["/home/agentsTickets"];
  const statusValue = status ? matchOption(TICKET_STATUSES, status, TICKET_ALIASES) : null;
  if (statusValue) parts.push("status", statusValue);
  if (category) parts.push("category", segment(category));
  if (agent != null && agent !== "") parts.push("agent", segment(agent));
  return parts.join("/");
}

const withQuery = (path, key, value) => (value ? `${path}?${key}=${encodeURIComponent(value)}` : path);

// API module key → how its list screen takes a status filter.
const MODULE_STATUS_LINKS = {
  tickets: (status) => ticketsPath({ status }),
  invoices: (status) => {
    const tab = matchOption(["paid", "unpaid", "partial"], status, { partialpaid: "partial" });
    return tab ? `/home/invoices/tab/${tab}` : "/home/invoices";
  },
  purchase_orders: (status) => {
    const tab = matchOption(["received", "not-received", "partial"], status, { partialpaid: "partial" });
    return tab ? `/home/purchase/tab/${tab}` : "/home/purchase";
  },
  applications: (status) => {
    const value = matchOption(
      [
        "draft",
        "pending",
        "completed",
        "in-active",
        "approved",
        "declined-rejected",
        "under-review",
        "on-hold",
        "suspicious-activity",
        "verification-required",
        "incomplete",
        "cancelled",
      ],
      status,
      { declined: "declinedrejected", rejected: "declinedrejected" },
    );
    return value ? `/home/adminApplication/status/${value}` : "/home/adminApplication";
  },
  sales_orders: (status) =>
    withQuery(
      "/home/salesOrder",
      "status",
      matchOption(["processing", "confirmed", "shipped", "delivered", "cancelled"], status),
    ),
  crm_opportunities: (status) =>
    withQuery(
      "/home/opportunities",
      "stage",
      matchOption(
        ["qualification", "proposal", "quotation", "negotiation", "closed_won", "closed_lost"],
        status,
        { won: "closedwon", lost: "closedlost" },
      ),
    ),
  crm_quotations: (status) =>
    withQuery(
      "/home/quotations",
      "status",
      matchOption(["draft", "sent", "accepted", "rejected", "expired", "cancelled"], status),
    ),
  leads: (status) =>
    withQuery(
      "/home/leadsList",
      "status",
      matchOption(["open", "not_contacted", "working", "converted"], status),
    ),
  users: (status) =>
    withQuery("/home/agent", "status", matchOption(["active", "inactive"], status)),
};

const OVERVIEW_STATUS = {
  pendingTickets: "pending",
  completedTickets: "complete",
};

const CATEGORY_SERIES_STATUS = { New: "pending", "In Progress": "in-progress", Completed: "complete" };

/** Link for a widget's "Open" button. */
export function widgetHref(widget) {
  if (!widget?.route) return null;
  return `/home/${widget.route}`;
}

/**
 * Link for one item inside a widget.
 * `seriesKey` is the stacked-bar series that was clicked, if any.
 */
export function itemHref(widget, item, seriesKey) {
  if (!widget || !item) return null;
  const id = widget.id;

  if (id === "overview") {
    if (item.route === "agentsTickets") return ticketsPath({ status: OVERVIEW_STATUS[item.id] });
    if (item.route === "agent") return withQuery("/home/agent", "status", item.id === "inactiveUsers" ? "inactive" : "active");
    return item.route ? `/home/${item.route}` : null;
  }
  if (id === "ticketTrends") return ticketsPath({ status: seriesKey });
  if (id === "ticketCategories") {
    return ticketsPath({ category: item.categoryTitle || item.name, status: CATEGORY_SERIES_STATUS[seriesKey] });
  }
  if (id === "assignedUsers") return ticketsPath({ agent: item.userId });
  if (id === "schedule") return item.kind === "meeting" ? "/home/calendar/" : "/home/myTask";
  if (id === "chats") return item.chatId != null ? `/home/chat/${segment(item.chatId)}` : "/home/chat";
  if (id === "recentProjects" || id === "projectCounts") return "/home/projectTracking/board";

  const moduleLink = MODULE_STATUS_LINKS[id];
  if (moduleLink) return moduleLink(item.key ?? item.name ?? item.label);
  if (item.route) return `/home/${item.route}`;
  return widgetHref(widget);
}

/**
 * Click handler for chart marks (recharts can't render real links):
 * Ctrl/Cmd/middle click opens a new tab, a plain click navigates in place.
 */
export function followHref(event, href, navigate) {
  if (!href) return;
  const native = event?.nativeEvent || event;
  if (native?.metaKey || native?.ctrlKey || native?.button === 1) {
    window.open(href, "_blank", "noopener");
    return;
  }
  navigate(href);
}
