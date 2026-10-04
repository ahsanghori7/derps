import moment from "moment";
import { getProfilePictureUrl } from "../../Utils/profile";
import { STATUS_COLORS } from "./statusColors";

const FALLBACK_COLORS = ["#0C79F7", "#0C79F7", "#7C5CFF", "#D07E0B", "#FF4C4C", "#4AC411", "#EC407A"];

const STATUS_ALIASES = {
  inprogress: "inProgress",
  complete: "completed",
  completed: "completed",
  unpaid: "unpaid",
  partial: "partialPaid",
  partialpaid: "partialPaid",
  closedwon: "closed_won",
  closedlost: "closed_lost",
  notcontacted: "notContacted",
  onhold: "onHold",
  inactive: "inactive",
  overdue: "overdue",
  underreview: "underReview",
  suspiciousactivity: "suspiciousActivity",
  declinedrejected: "declined",
  verificationrequired: "verificationRequired",
};

const STATUS_LABELS = {
  inprogress: "In Progress",
  unpaid: "Unpaid",
  partial: "Partial",
  partialpaid: "Partial",
  closedwon: "Closed Won",
  closedlost: "Closed Lost",
  notcontacted: "Not Contacted",
  onhold: "On Hold",
  inactive: "Inactive",
  overdue: "Overdue",
  qualified: "Qualified",
};

export const API_MODULE_META = {
  tickets: { label: "Tickets", route: "agentsTickets", group: "Operations" },
  invoices: { label: "Invoices", route: "invoices", group: "Finance" },
  purchase_orders: { label: "Purchase Orders", route: "purchase", group: "Finance" },
  bills: { label: "Bills", route: "suppliers", featureCode: "bills", group: "Finance" },
  inventory: { label: "Inventory", route: "allInventory", group: "Operations" },
  customers: { label: "Customers", route: "salesCustomers", group: "CRM" },
  vendors: { label: "Vendors", route: "vendors", group: "CRM" },
  applications: { label: "Applications", route: "adminApplication", group: "CRM" },
  sales_orders: { label: "Sales Orders", route: "salesOrder", group: "Sales" },
  crm_opportunities: { label: "CRM Opportunities", route: "opportunities", group: "Sales" },
  crm_quotations: { label: "CRM Quotations", route: "quotations", group: "Sales" },
  leads: { label: "Leads", route: "leadsList", group: "Sales" },
  users: { label: "Users", route: "agent", group: "HR" },
};

function compactStatus(label) {
  return String(label || "").toLowerCase().replace(/[\s_-]/g, "");
}

export function humanizeStatus(label) {
  const compact = compactStatus(label);
  if (STATUS_LABELS[compact]) return STATUS_LABELS[compact];
  return String(label || "")
    .replace(/[_-]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function colorForStatus(label, index = 0) {
  const compact = compactStatus(label);
  const key = STATUS_ALIASES[compact] || compact;
  return STATUS_COLORS[key] || STATUS_COLORS[label] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatMoney(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function moneySubtitle(moduleStats) {
  if (!moduleStats) return "";
  const parts = [];
  if (moduleStats.totalAmount != null) parts.push(`Amount ${formatMoney(moduleStats.totalAmount)}`);
  if (moduleStats.openBalance != null) parts.push(`Open ${formatMoney(moduleStats.openBalance)}`);
  if (moduleStats.openCount != null) parts.push(`${moduleStats.openCount} open`);
  return parts.join(" · ");
}

function chartItems(moduleStats) {
  const labels = Array.isArray(moduleStats?.chart?.labels)
    ? moduleStats.chart.labels
    : Object.keys(moduleStats?.byStatus || {});
  const values = Array.isArray(moduleStats?.chart?.values)
    ? moduleStats.chart.values
    : labels.map((label) => Number(moduleStats?.byStatus?.[label]) || 0);

  return labels.map((label, index) => ({
    key: label,
    name: humanizeStatus(label),
    label: humanizeStatus(label),
    value: Number(values[index]) || 0,
    color: colorForStatus(label, index),
  }));
}

export function normalizeDashboardSettings(modules) {
  return (Array.isArray(modules) ? modules : [])
    .filter((module) => module?.key)
    .map((module, index) => ({
      key: module.key,
      label: module.label || API_MODULE_META[module.key]?.label || module.key,
      visible: module.visible !== false,
      order: Number.isFinite(Number(module.order)) ? Number(module.order) : index,
      group: API_MODULE_META[module.key]?.group || "Modules",
    }))
    .sort((a, b) => a.order - b.order)
    .map((module, index) => ({ ...module, order: index }));
}

export function toDashboardWidget(setting, moduleStats) {
  const meta = API_MODULE_META[setting.key] || {};
  const items = chartItems(moduleStats);
  const reportedTotal = Number(moduleStats?.total);
  const total = Number.isFinite(reportedTotal)
    ? reportedTotal
    : items.reduce((sum, item) => sum + item.value, 0);
  let subtitle = moneySubtitle(moduleStats);

  const isAggregate = moduleStats?.chart?.type === "aggregate";
  let type = "donut";
  let payload = { total, items };
  let span;
  if (isAggregate || !items.length) {
    type = "statGrid";
    const stats = items.length
      ? items.map((item) => ({ key: item.key, label: item.label, value: item.value, color: item.color }))
      : [{ label: "Total", value: total, color: "#0C79F7" }];
    payload = stats.length === 1 ? [{ ...stats[0], key: undefined, label: "Total" }] : stats;
  } else if (items.length > 4) {
    type = "statusList";
    payload = { total, items };
    span = "wide";
    if (!subtitle) subtitle = `${total.toLocaleString("en-US")} total`;
  }

  return {
    id: setting.key,
    name: moduleStats?.label || setting.label || meta.label || setting.key,
    group: meta.group || "Modules",
    route: meta.route || null,
    type,
    subtitle,
    span,
    data: { thisYear: payload },
  };
}

function countOf(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function monthLabel(timeUnit) {
  if (timeUnit == null || timeUnit === "") return "";
  const raw = String(timeUnit);
  if (/^\d{1,2}$/.test(raw)) {
    const month = Number(raw);
    if (month >= 1 && month <= 12) {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
    }
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && raw.length > 3) {
    return parsed.toLocaleString("en-US", { month: "short" });
  }
  return raw;
}

export function overviewItemsFromBundle(bundle) {
  if (!bundle) return [];
  const summary =
    bundle.ticketSummary && typeof bundle.ticketSummary === "object" ? bundle.ticketSummary : {};
  const items = [
    {
      id: "totalTickets",
      label: "Total Tickets",
      value: countOf(summary.totalTickets),
      tint: "#0C79F7",
      route: "agentsTickets",
      sub: "All tickets",
    },
    {
      id: "pendingTickets",
      label: "Pending Tickets",
      value: countOf(summary.pendingTickets),
      tint: "#D07E0B",
      route: "agentsTickets",
      sub: "Awaiting action",
    },
    {
      id: "completedTickets",
      label: "Completed Tickets",
      value: countOf(summary.completedTickets),
      tint: "#4AC411",
      route: "agentsTickets",
      sub: "Closed",
    },
    {
      id: "currentMonthTickets",
      label: "This Month",
      value: countOf(summary.currentMonthTickets),
      tint: "#0C79F7",
      route: "agentsTickets",
      sub: "Opened this month",
    },
  ];

  if (bundle.totalActiveUsers != null) {
    items.push({
      id: "activeUsers",
      label: "Active Users",
      value: countOf(bundle.totalActiveUsers),
      tint: "#0C79F7",
      route: "agent",
      sub: "Active accounts",
    });
  }
  if (bundle.totalInactiveUsers != null) {
    items.push({
      id: "inactiveUsers",
      label: "Inactive Users",
      value: countOf(bundle.totalInactiveUsers),
      tint: "#9AA0AC",
      route: "agent",
      sub: "Inactive accounts",
    });
  }
  if (Number(bundle.totalTenants) > 0) {
    items.push({
      id: "tenants",
      label: "Tenants",
      value: countOf(bundle.totalTenants),
      tint: "#7C5CFF",
      route: null,
      sub: "Organizations",
    });
  }
  return items;
}

function trendRows(ticketTrends) {
  const raw = Array.isArray(ticketTrends?.data)
    ? ticketTrends.data
    : Array.isArray(ticketTrends)
      ? ticketTrends
      : [];
  return raw.map((row) => {
    const month = monthLabel(row?.timeUnit ?? row?.month ?? row?.label);
    const year = row?.year ? String(row.year).slice(-2) : "";
    return {
      name: year && month ? `${month} ${year}` : month || year,
      Completed: countOf(row?.completed ?? row?.Completed),
      Pending: countOf(row?.pending ?? row?.Pending),
    };
  });
}

function categoryRows(source) {
  const raw = Array.isArray(source) ? source : [];
  return raw.map((row) => {
    const stats = row?.ticketStats && typeof row.ticketStats === "object" ? row.ticketStats : row || {};
    return {
      name: String(row?.categoryTitle || row?.category || row?.name || "Category").trim(),
      categoryTitle: String(row?.categoryTitle || row?.category || row?.name || ""),
      New: countOf(stats.newTicketCount ?? stats.new),
      "In Progress": countOf(stats.inProgressTicketCount ?? stats.inProgress),
      Completed: countOf(
        stats.completedTicketCount ?? stats.completeTicketCount ?? stats.totalTicketCount ?? stats.Completed,
      ),
    };
  });
}

const TREND_SERIES = [
  { key: "Completed", color: "#4AC411" },
  { key: "Pending", color: "#D07E0B" },
];

const CATEGORY_SERIES = [
  { key: "New", color: "#9AA0AC" },
  { key: "In Progress", color: "#0C79F7" },
  { key: "Completed", color: "#4AC411" },
];

function statWidget({ id, name, route, subtitle, items }) {
  return {
    id,
    name,
    group: "Projects",
    route,
    type: "statGrid",
    subtitle,
    data: { thisYear: items },
  };
}

function displayNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number.isInteger(number) ? number : Math.round(number * 10) / 10;
}

export function insightWidgets(payload) {
  if (!payload || typeof payload !== "object") return [];
  const widgets = [];
  const projects = payload.projectCounts;
  if (projects && typeof projects === "object") {
    widgets.push(statWidget({
      id: "projectCounts",
      name: "Projects",
      route: "projectTracking/board",
      subtitle: "Total · completed · to do · in progress",
      items: [
        { label: "Total", value: countOf(projects.totalProjects), color: "#0C79F7" },
        { label: "Completed", value: countOf(projects.completedProjects), color: "#4AC411" },
        { label: "To Do", value: countOf(projects.todoProjects), color: "#9747FF" },
        { label: "In Progress", value: countOf(projects.inProgressProjects), color: "#0C79F7" },
      ],
    }));
  }

  const tracking = payload.trackingReport;
  if (tracking && typeof tracking === "object") {
    widgets.push(statWidget({
      id: "trackingReport",
      name: "Tracking",
      route: "trackingReports",
      items: [
        { label: "Total Tasks", value: countOf(tracking.totalTask), color: "#0C79F7" },
        { label: "Completed", value: countOf(tracking.totalCompletedTask), color: "#4AC411" },
        { label: "Pending", value: countOf(tracking.totalPendingTask), color: "#D07E0B" },
        { label: "Avg Days", value: countOf(tracking.avgTaskCompletionDays), color: "#7C5CFF" },
      ],
    }));
  }

  const performance = payload.performanceReport;
  if (performance && typeof performance === "object") {
    widgets.push(statWidget({
      id: "performanceReport",
      name: "Performance",
      route: "performanceReport",
      items: [
        { label: "Total Points", value: displayNumber(performance.totalPoints), color: "#0C79F7" },
        { label: "Earned", value: displayNumber(performance.earnedPoints), color: "#4AC411" },
        { label: "Bonus", value: displayNumber(performance.bonusPoints), color: "#7C5CFF" },
        { label: "Employees", value: countOf(performance.totalEmployees), color: "#0C79F7" },
      ],
    }));
  }

  const attendance = payload.attendenceReport || payload.attendanceReport;
  if (attendance && typeof attendance === "object") {
    const signedIn = attendance.signInTime ? `In ${attendance.signInTime}` : "Not signed in";
    widgets.push(statWidget({
      id: "attendenceReport",
      name: "Attendance",
      route: "attendanceReport",
      subtitle: [attendance.timezone, signedIn].filter(Boolean).join(" · "),
      items: [
        { label: "Signed In", value: countOf(attendance.totalSignedIn), color: "#0C79F7" },
        { label: "Employees", value: countOf(attendance.totalEmployees), color: "#0C79F7" },
        { label: "Duration", value: displayNumber(attendance.duration), color: "#7C5CFF" },
      ],
    }));
  }

  const recent = Array.isArray(payload.recentProjectReport) ? payload.recentProjectReport : [];
  if (recent.length) {
    widgets.push({
      id: "recentProjects",
      name: "Recent Projects",
      group: "Projects",
      route: "projectTracking/board",
      type: "rankedList",
      emptyLabel: "No recent projects.",
      subtitle: "Latest projects",
      data: {
        thisYear: recent.map((project) => ({
          label: project?.name || "Project",
          value: null,
        })),
      },
    });
  }

  return widgets;
}

export function chatWidget(payload, userId) {
  const chats = Array.isArray(payload?.chats) ? payload.chats : [];
  const unread = chats.reduce((sum, chat) => sum + (Number(chat?.unreadCount) || 0), 0);
  const total = Number(payload?.total) || chats.length;
  return {
    id: "chats",
    name: "Chats",
    group: "Communication",
    route: "chat",
    type: "chatList",
    span: "wide",
    subtitle: payload ? `${unread} unread · ${total} chats` : "Recent conversations",
    data: {
      thisYear: chats.slice(0, 6).map((chat) => {
        const other = (chat?.members || []).find((member) => Number(member?.userId) !== Number(userId));
        const message = chat?.messages?.[0];
        const preview = String(message?.content || "").replace(/\s+/g, " ").trim();
        return {
          chatId: chat?.id ?? null,
          imageUrl: chat?.name
            ? getProfilePictureUrl(chat) || getProfilePictureUrl({ image: chat?.groupImage })
            : getProfilePictureUrl(other?.user) || getProfilePictureUrl(other),
          label: chat?.name || other?.user?.name || "Direct chat",
          preview: message?.type === "file" && !preview ? "File" : preview,
          unread: Number(chat?.unreadCount) || 0,
        };
      }),
    },
  };
}

const timeOf = (value) => {
  const parsed = moment(value, "HH:mm:ss", true);
  return parsed.isValid() ? parsed.format("h:mm A") : "";
};

/** Today's meetings and tasks from `/dashboard/stats` → `meetings`, in calendar order. */
export function scheduleWidget(payload) {
  const days = Array.isArray(payload?.data) ? payload.data : [];
  const meetings = days.flatMap((day) => (Array.isArray(day?.meetings) ? day.meetings : []));
  const seenTasks = new Set();
  const tasks = days
    .flatMap((day) => (Array.isArray(day?.tasks) ? day.tasks : []))
    .filter((task) => !seenTasks.has(task?.id) && seenTasks.add(task?.id));
  const today = moment().format("YYYY-MM-DD");

  const meetingRows = meetings
    .slice()
    .sort((a, b) => String(a?.startTime || "").localeCompare(String(b?.startTime || "")))
    .map((meeting) => {
      const start = timeOf(meeting?.startTime);
      const end = timeOf(meeting?.endTime);
      const participants = Array.isArray(meeting?.participants) ? meeting.participants.length : 0;
      return {
        kind: "meeting",
        id: meeting?.id,
        title: meeting?.title || "Untitled meeting",
        time: start || "—",
        sub: [
          start && end ? `${start} – ${end}` : start,
          meeting?.organizer?.name ? `by ${meeting.organizer.name}` : "",
          participants ? `${participants} participant${participants === 1 ? "" : "s"}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        // Same state the calendar reads to jump to the date and open the meeting.
        linkState: { selectedMeetingId: meeting?.id, itemData: meeting },
      };
    });

  const taskRows = tasks.map((task) => {
    const due = task?.endDate ? moment.utc(task.endDate) : null;
    const dueLabel = due?.isValid()
      ? due.format("YYYY-MM-DD") === today
        ? "Due today"
        : `Due ${due.format("D MMM")}`
      : "";
    return {
      kind: "task",
      id: task?.id,
      title: task?.title || "Untitled task",
      time: "Task",
      sub: [dueLabel, task?.status, task?.priority ? `${task.priority} priority` : ""]
        .filter(Boolean)
        .join(" · "),
    };
  });

  const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const dateLabel = (payload?.date ? moment(payload.date, "YYYY-MM-DD") : moment()).format("ddd, D MMM");
  return {
    id: "schedule",
    name: "Today's Schedule",
    group: "Calendar",
    route: "calendar",
    type: "schedule",
    span: "wide",
    subtitle: payload
      ? `${count(meetingRows.length, "meeting")} · ${count(taskRows.length, "task")} · ${dateLabel}`
      : "Meetings and tasks for today",
    data: { thisYear: [...meetingRows, ...taskRows] },
  };
}

export function ticketBundleWidgets({ bundle, categories }) {
  const legacyCategories = categoryRows(categories);
  const bundledCategories = categoryRows(bundle?.ticketsByCategory);
  const categoryHasCounts = (rows) =>
    rows.some((row) => row.New || row["In Progress"] || row.Completed);
  const categoryItems = categoryHasCounts(legacyCategories) ? legacyCategories : bundledCategories;
  const trends = trendRows(bundle?.ticketTrends);
  const users = (Array.isArray(bundle?.mostAssignedUsers) ? bundle.mostAssignedUsers : []).map((user) => ({
    label: user?.name || user?.username || "User",
    userId: user?.id ?? user?.userId ?? null,
    imageUrl: getProfilePictureUrl(user) || getProfilePictureUrl(user?.user),
    value: countOf(user?.ticketCount ?? user?.totalTickets),
    sub: String(user?.categoryTitle || user?.ticketCategory || "").trim(),
  }));

  return [
    {
      id: "ticketTrends",
      name: "Ticket Trends",
      group: "Tickets",
      route: "agentsTickets",
      type: "stackedBars",
      span: "wide",
      subtitle: "Completed and pending by period",
      series: TREND_SERIES,
      data: { thisYear: trends },
    },
    {
      id: "ticketCategories",
      name: "Tickets by Category",
      group: "Tickets",
      route: "agentsTickets",
      type: "stackedBars",
      span: "wide",
      subtitle: "New, in progress, and completed",
      series: CATEGORY_SERIES,
      data: { thisYear: categoryItems },
    },
    {
      id: "assignedUsers",
      name: "Most Assigned Users",
      group: "Tickets",
      route: "agent",
      type: "rankedList",
      emptyLabel: "No assigned users yet.",
      subtitle: "Highest ticket assignments",
      data: { thisYear: users },
    },
  ];
}
