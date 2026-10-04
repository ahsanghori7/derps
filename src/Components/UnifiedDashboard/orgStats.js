import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function monthLabel(monthKey, year) {
  if (!monthKey) return "";
  const short = monthKey.charAt(0).toUpperCase() + monthKey.slice(1, 3);
  return `${short} ${year}`;
}

function isAbort(err) {
  return err?.name === "AbortError";
}

/**
 * Last calendar month first, then walk back up to 6 older months until rows exist.
 * Aborts cleanly when the dashboard unmounts.
 */
async function fetchLatestAgentPayout(accessToken, { signal } = {}) {
  const now = new Date();

  for (let back = 1; back <= 6; back += 1) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const month = MONTH_KEYS[d.getMonth()];
    const year = d.getFullYear();

    try {
      const result = await getRequestWithOutBody(
        `${baseURl}payouts/report?month=${month}&year=${year}`,
        accessToken,
        { signal },
      );
      const rows = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];
      if (!rows.length) continue;

      const total = rows.reduce(
        (sum, row) => sum + (Number(row?.totalPayout) || 0),
        0,
      );
      return { total, month, year, periodLabel: monthLabel(month, year) };
    } catch (err) {
      if (isAbort(err)) throw err;
      // empty / failed month → try older
    }
  }

  return { total: 0, month: null, year: null, periodLabel: null };
}

async function safeGet(url, accessToken, signal) {
  try {
    return await getRequestWithOutBody(url, accessToken, { signal });
  } catch (err) {
    if (isAbort(err)) throw err;
    return { __error: err };
  }
}

// Total active users + how many distinct sign-in/sign-out events were logged today.
export async function fetchStaffOverview(accessToken, { signal }) {
  const today = todayStr();

  const [userResult, signInResult, signOutResult] = await Promise.all([
    getRequestWithOutBody(`${baseURl}user?paginate=true&page=1&limit=1`, accessToken, { signal }),
    getRequestWithOutBody(
      `${baseURl}user-login-log?eventType=attendance_signin&paginate=true&page=1&limit=1&startDate=${today}&endDate=${today}`,
      accessToken,
      { signal },
    ),
    getRequestWithOutBody(
      `${baseURl}user-login-log?eventType=attendance_signout&paginate=true&page=1&limit=1&startDate=${today}&endDate=${today}`,
      accessToken,
      { signal },
    ),
  ]);

  return {
    activeUsers: Number(userResult?.totalActiveStatusCount) || 0,
    signedInToday: Number(signInResult?.data?.totalRecords) || 0,
    signedOutToday: Number(signOutResult?.data?.totalRecords) || 0,
  };
}

export async function fetchBusinessOverview(accessToken, { signal }) {
  const [projectResult, customerResult] = await Promise.all([
    getRequestWithOutBody(`${baseURl}project`, accessToken, { signal }),
    getRequestWithOutBody(
      `${baseURl}customer?paginate=true&page=1&limit=1`,
      accessToken,
      { signal },
    ),
  ]);

  const projects = Array.isArray(projectResult?.data) ? projectResult.data : [];

  return {
    totalProjects: projects.length,
    totalCustomers: Number(customerResult?.data?.totalRecords) || 0,
  };
}

/**
 * Live KPIs for Business Overview:
 * 1) Agent payout — latest month with report rows (payouts/report)
 * 2) Pending returns — inventory/return-item pending count
 * 3) Pending tech installations — jobStatus === Pending
 * 4) Pending agent requests — totalPendingCount (or N/A if feature disabled)
 */
export async function fetchBusinessOverviewKpis(accessToken, { signal } = {}) {
  const [payout, returnsResult, techResult, agentResult] = await Promise.all([
    fetchLatestAgentPayout(accessToken, { signal }),
    safeGet(`${baseURl}inventory/return-item?page=1&limit=1`, accessToken, signal),
    // Pull a large page so we can count Pending jobStatus client-side
    safeGet(
      `${baseURl}tech-installation?paginate=true&page=1&limit=500`,
      accessToken,
      signal,
    ),
    safeGet(`${baseURl}agent-request?paginate=true&page=1&limit=1`, accessToken, signal),
  ]);

  let pendingReturns = 0;
  if (returnsResult && !returnsResult.__error) {
    if (returnsResult.totalPendingStatusCount != null) {
      pendingReturns = Number(returnsResult.totalPendingStatusCount) || 0;
    } else {
      const pendingList = await safeGet(
        `${baseURl}inventory/return-item?status=pending&page=1&limit=1`,
        accessToken,
        signal,
      );
      if (pendingList && !pendingList.__error) {
        pendingReturns =
          Number(pendingList.totalPendingStatusCount) ||
          Number(pendingList.totalRecords) ||
          Number(pendingList?.data?.totalRecords) ||
          (Array.isArray(pendingList.data) ? pendingList.data.length : 0) ||
          0;
      }
    }
  }

  let pendingTech = 0;
  if (techResult && !techResult.__error) {
    const techApi = techResult?.data ?? techResult;
    const rows = Array.isArray(techApi?.results)
      ? techApi.results
      : Array.isArray(techApi?.data?.results)
        ? techApi.data.results
        : Array.isArray(techApi?.data)
          ? techApi.data
          : [];
    pendingTech = rows.filter(
      (row) => String(row?.jobStatus || "").trim().toLowerCase() === "pending",
    ).length;
  }

  let agentPending = 0;
  let agentDisabled = false;
  if (agentResult?.__error) {
    const msg = String(agentResult.__error?.message || "");
    agentDisabled =
      msg.toLowerCase().includes("feature not enabled") ||
      msg.toLowerCase().includes("agent-requests") ||
      agentResult.__error?.status === 403;
  } else if (agentResult) {
    agentPending = Number(agentResult.totalPendingCount) || 0;
  }

  return [
    {
      id: "agentPayout",
      label: payout.periodLabel
        ? `Agent Payout (${payout.periodLabel})`
        : "Agent Payout",
      value: formatMoney(payout.total),
      tint: "#26A69A",
      route: "reports",
      sub: payout.periodLabel ? "Latest available month" : "No payout report found",
    },
    {
      id: "pendingReturns",
      label: "Pending Returns",
      value: pendingReturns,
      tint: "#FF4C4C",
      route: "returns",
      sub: pendingReturns ? "Awaiting action" : "None pending",
    },
    {
      id: "techInstallation",
      label: "Pending Tech Installs",
      value: pendingTech,
      tint: "#7C5CFF",
      route: "techInstallationList",
      sub: pendingTech ? "jobStatus = Pending" : "None pending",
    },
    {
      id: "agentManagement",
      label: "Pending Agent Applications",
      value: agentDisabled ? "N/A" : agentPending,
      tint: "#EC407A",
      route: "agentManagement",
      sub: agentDisabled
        ? "Feature not enabled"
        : agentPending
          ? "Awaiting review"
          : "None pending",
    },
  ];
}

/**
 * Communication widget — same sources as Chat / Calendar / Drive / Notifications screens.
 */
export async function fetchCommunicationStats(
  accessToken,
  { userId, roleTitle, tenantId, signal } = {},
) {
  const today = todayStr();
  const isAdmin = roleTitle === "Admin" || roleTitle === "Human Resource";
  const chatBase = `${String(baseURl || "").replace(/\/$/, "")}/chat`;
  const notifBase = `${String(baseURl || "").replace(/\/$/, "")}/notifications`;

  const filesUrl = isAdmin
    ? `${baseURl}files`
    : userId
      ? `${baseURl}files?userId=${userId}`
      : `${baseURl}files`;

  const notifParams = new URLSearchParams({
    limit: "100",
    page: "1",
    paginate: "true",
    orderBy: "createdAt",
    order: "desc",
  });
  if (tenantId != null && tenantId !== "") {
    notifParams.set("tenantId", String(tenantId));
  }

  const [chatsRes, meetingsRes, filesRes, notifRes] = await Promise.all([
    safeGet(`${chatBase}?page=1&limit=100`, accessToken, signal),
    userId
      ? safeGet(
          `${baseURl}meeting/?startDate=${today}&endDate=${today}&userId=${userId}`,
          accessToken,
          signal,
        )
      : Promise.resolve(null),
    safeGet(filesUrl, accessToken, signal),
    safeGet(`${notifBase}?${notifParams.toString()}`, accessToken, signal),
  ]);

  // Chat screen: sum chat.unreadCount (ChatList.jsx)
  let unreadChats = 0;
  if (chatsRes && !chatsRes.__error) {
    const chats = Array.isArray(chatsRes?.data)
      ? chatsRes.data
      : Array.isArray(chatsRes)
        ? chatsRes
        : [];
    unreadChats = chats.reduce(
      (sum, chat) => sum + (Number(chat?.unreadCount) || 0),
      0,
    );
  }

  // Calendar / TodaySchedule: meetings[] for today
  let meetingsToday = 0;
  if (meetingsRes && !meetingsRes.__error) {
    const entries = Array.isArray(meetingsRes?.data?.data) ? meetingsRes.data.data : [];
    const todayEntry =
      entries.find((e) => e?.date === today) || entries[0] || {};
    meetingsToday = Array.isArray(todayEntry.meetings) ? todayEntry.meetings.length : 0;
  }

  // StorageBucket: result.data array length
  let driveFiles = 0;
  if (filesRes && !filesRes.__error) {
    const list = Array.isArray(filesRes?.data)
      ? filesRes.data
      : Array.isArray(filesRes?.data?.data)
        ? filesRes.data.data
        : [];
    driveFiles = list.length;
  }

  // Notifications screen: count where !isRead
  let unreadNotifications = 0;
  if (notifRes && !notifRes.__error) {
    let list = [];
    if (Array.isArray(notifRes?.data?.data)) list = notifRes.data.data;
    else if (Array.isArray(notifRes?.data)) list = notifRes.data;
    else if (Array.isArray(notifRes)) list = notifRes;
    unreadNotifications = list.filter((n) => !n?.isRead).length;
  }

  return [
    {
      label: "Unread Chats",
      value: unreadChats,
      color: "#0059F5",
      route: "chat",
    },
    {
      label: "Meetings Today",
      value: meetingsToday,
      color: "#0C79F7",
      route: "calendar",
    },
    {
      label: "Drive Files",
      value: driveFiles,
      color: "#7C5CFF",
      route: "storageBucket",
    },
    {
      label: "Notifications",
      value: unreadNotifications,
      color: "#FF478A",
      route: "notifications",
    },
  ];
}

export async function fetchTodaySchedule(accessToken, ctx, { signal }) {
  const today = todayStr();
  const result = await getRequestWithOutBody(
    `${baseURl}meeting/?startDate=${today}&endDate=${today}&userId=${ctx.userId}`,
    accessToken,
    { signal },
  );

  const entries = Array.isArray(result?.data?.data) ? result.data.data : [];
  const todayEntry = entries.find((e) => e?.date === today) || entries[0] || {};

  return {
    meetings: Array.isArray(todayEntry.meetings) ? todayEntry.meetings : [],
    tasks: Array.isArray(todayEntry.tasks) ? todayEntry.tasks : [],
  };
}
