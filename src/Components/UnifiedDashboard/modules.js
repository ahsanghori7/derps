import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

// NormalizedStats = {
//   total: number,
//   items: [{ statusKey, label, value }],
//   live: boolean,
//   secondaryStat?: { label, value } // pre-formatted, for modules that carry a $ amount
// }

export function formatMoney(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

async function fetchTicketStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}ticket?paginate=true&page=1&limit=1`,
    accessToken,
    { signal },
  );

  // mirrors extractTicketStats (Screens/AgentsTickets/index.jsx ~129-143)
  const payload = result?.data && typeof result.data === "object" ? result.data : {};
  const source = { ...payload, ...result };

  const pending = Number(source.totalPendingStatusCount) || 0;
  const inProgress = Number(source.totalInProgressStatusCount) || 0;
  const completed = Number(source.totalCompletedStatusCount) || 0;
  const active = Number(source.totalActiveStatusCount) || 0;
  const inactive = Number(source.totalInActiveStatusCount) || 0;

  return {
    // total reflects every ticket, "active" is just not broken out as its own slice below
    total: pending + inProgress + completed + active + inactive,
    items: [
      { statusKey: "pending", label: "Pending", value: pending },
      { statusKey: "inProgress", label: "In Progress", value: inProgress },
      { statusKey: "completed", label: "Completed", value: completed },
      { statusKey: "inactive", label: "Inactive", value: inactive },
    ],
    live: true,
  };
}

const SUBTASK_STATUS_BUCKETS = [
  { statusKey: "pending", label: "Pending", match: ["pending"] },
  { statusKey: "inProgress", label: "In Progress", match: ["inprogress"] },
  { statusKey: "readyForQA", label: "Ready for QA", match: ["readyforqa", "readyforapproval"] },
  { statusKey: "qaInProgress", label: "QA In Progress", match: ["qainprogress"] },
  { statusKey: "failedQA", label: "Failed QA", match: ["failedqa"] },
  { statusKey: "readyForDeployment", label: "Ready For Deployment", match: ["readyfordeployment"] },
  {
    statusKey: "completed",
    label: "Completed",
    match: ["completed", "qasucceeded", "qasucceed", "uicompleted", "apicompleted", "apicomleted"],
  },
  { statusKey: "deploymentCompleted", label: "Deployment Completed", match: ["deploymentcompleted"] },
  { statusKey: "onHold", label: "On Hold", match: ["onhold"] },
  { statusKey: "cancelled", label: "Cancelled", match: ["cancelled", "canceled"] },
];

function normalizeSubtaskStatus(raw) {
  const key = String(raw || "").toLowerCase().replace(/[\s_-]/g, "");
  const bucket = SUBTASK_STATUS_BUCKETS.find((b) => b.match.includes(key));
  return bucket?.statusKey || "other";
}

async function fetchProjectStats(accessToken, ctx, { signal }) {
  const isAdminOrHR = ctx.roleTitle === "Admin" || ctx.roleTitle === "Human Resource";

  if (!isAdminOrHR) {
    // subtask/all/ already returns root-level aggregates for this user (confirmed live)
    const result = await getRequestWithOutBody(
      `${baseURl}subtask/all/?userId=${ctx.userId}&paginate=true&limit=1&page=1&orderBy=createdAt&order=desc`,
      accessToken,
      { signal },
    );

    const pending = Number(result?.totalPendingStatusCount) || 0;
    const inProgress = Number(result?.totalInProgressStatusCount) || 0;
    const readyForQA =
      (Number(result?.totalReadyForQAStatusCount) || 0) +
      (Number(result?.totalReadyApprovalCount) || 0);
    const qaInProgress = Number(result?.totalQaInProgressCount) || 0;
    const failedQA = Number(result?.totalFailedQAStatusCount) || 0;
    const readyForDeployment = Number(result?.totalReadyForDeploymentCount) || 0;
    const completed =
      (Number(result?.totalCompletedStatusCount) || 0) +
      (Number(result?.totalQaSucceedStatusCount) || 0) +
      (Number(result?.totalUiCompletedStatusCount) || 0) +
      (Number(result?.totalApiComletedCount) || 0);
    const deploymentCompleted = Number(result?.totalDeploymentCompletedCount) || 0;
    const onHold = Number(result?.totalOnHoldStatusCount) || 0;
    const cancelled = Number(result?.totalCancelledStatusCount) || 0;

    return {
      total:
        pending +
        inProgress +
        readyForQA +
        qaInProgress +
        failedQA +
        readyForDeployment +
        completed +
        deploymentCompleted +
        onHold +
        cancelled,
      items: [
        { statusKey: "pending", label: "Pending", value: pending },
        { statusKey: "inProgress", label: "In Progress", value: inProgress },
        { statusKey: "readyForQA", label: "Ready for QA", value: readyForQA },
        { statusKey: "qaInProgress", label: "QA In Progress", value: qaInProgress },
        { statusKey: "failedQA", label: "Failed QA", value: failedQA },
        { statusKey: "readyForDeployment", label: "Ready For Deployment", value: readyForDeployment },
        { statusKey: "completed", label: "Completed", value: completed },
        { statusKey: "deploymentCompleted", label: "Deployment Completed", value: deploymentCompleted },
        { statusKey: "onHold", label: "On Hold", value: onHold },
        { statusKey: "cancelled", label: "Cancelled", value: cancelled },
      ],
      live: true,
    };
  }

  // Admin/HR: subtask has no aggregate fields, only a paginated list — read totalRecords
  // first, then pull the full list once and bucket by `status` client-side.
  const countResult = await getRequestWithOutBody(
    `${baseURl}subtask?paginate=true&page=1&limit=1&orderBy=createdAt&order=desc`,
    accessToken,
    { signal },
  );
  const totalRecords = Math.min(Number(countResult?.data?.totalRecords) || 0, 3000);
  if (!totalRecords) {
    return { total: 0, items: [], live: true };
  }

  const listResult = await getRequestWithOutBody(
    `${baseURl}subtask?paginate=true&page=1&limit=${totalRecords}&orderBy=createdAt&order=desc`,
    accessToken,
    { signal },
  );
  const rows = Array.isArray(listResult?.data?.data) ? listResult.data.data : [];

  const counts = rows.reduce((acc, row) => {
    const bucket = normalizeSubtaskStatus(row?.status);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  const items = SUBTASK_STATUS_BUCKETS.map(({ statusKey, label }) => ({
    statusKey,
    label,
    value: counts[statusKey] || 0,
  }));
  if (counts.other) {
    items.push({ statusKey: "other", label: "Other", value: counts.other });
  }

  return { total: rows.length, items, live: true };
}

async function fetchApplicationStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}application?paginate=true&page=1&limit=1&allStatus=true`,
    accessToken,
    { signal },
  );

  // mirrors the extraction pattern in Screens/AdminApplication/index.jsx ~113-149
  const payload =
    result?.data && typeof result.data === "object" && !Array.isArray(result.data)
      ? result.data
      : {};
  const source = { ...payload, ...result };
  const toCount = (v) => Number(v) || 0;

  const draft = toCount(source.totalDraftStatusCount);
  const pending = toCount(source.totalPendingStatusCount);
  const completed = toCount(source.totalCompletedStatusCount);
  const inactive = toCount(source.totalInactiveStatusCount);
  const approved = toCount(source.totalApprovedStatusCount);
  const declined = toCount(source.totalDeclinedStatusCount);
  const underReview = toCount(source.totalUnderReviewStatusCount);
  const onHold = toCount(source.totalOnHoldStatusCount);
  const suspicious = toCount(source.totalSuspiciousStatusCount);
  const verification = toCount(source.totalVerificationStatusCount);
  const incomplete = toCount(source.totalIncompleteStatusCount);
  const cancelled = toCount(source.totalCancelledStatusCount);

  // "Approved" is folded into Other here (per user request to show Incomplete instead)
  const other = draft + inactive + onHold + suspicious + verification + cancelled + approved;
  const total = draft + pending + completed + inactive + approved + declined +
    underReview + onHold + suspicious + verification + incomplete + cancelled;

  return {
    total,
    items: [
      { statusKey: "completed", label: "Completed", value: completed },
      { statusKey: "incomplete", label: "Incomplete", value: incomplete },
      { statusKey: "pending", label: "Pending", value: pending },
      { statusKey: "underReview", label: "Under Review", value: underReview },
      { statusKey: "declined", label: "Declined", value: declined },
      { statusKey: "other", label: "Other", value: other },
    ],
    live: true,
  };
}

async function fetchSupportTicketStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}application-ticket`,
    accessToken,
    { signal },
  );

  // mirrors extractSupportTicketStats (Screens/MaintananceTicket/index.jsx ~85-109)
  const payload = result?.data ?? result;
  const allStats =
    payload?.allStats && typeof payload.allStats === "object" ? payload.allStats : payload;

  const newCount = Number(allStats?.totalNewStatusCount) || 0;
  const submitted = Number(allStats?.totalSubmittedStatusCount) || 0;
  const signed = Number(allStats?.totalSignedStatusCount) || 0;
  const uw = Number(allStats?.totalUwStatusCount) || 0;
  const approved = Number(allStats?.totalApprovedStatusCount) || 0;
  const completed = Number(allStats?.totalCompletedStatusCount) || 0;

  return {
    total: newCount + submitted + signed + uw + approved + completed,
    items: [
      { statusKey: "new", label: "New", value: newCount },
      { statusKey: "submitted", label: "Maintenance", value: submitted },
      { statusKey: "signed", label: "Terminal Programming", value: signed },
      { statusKey: "uw", label: "Deployment", value: uw },
      { statusKey: "approved", label: "Follow-Up", value: approved },
      { statusKey: "completed", label: "Completed", value: completed },
    ],
    live: true,
  };
}

async function fetchLeadStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}lead?paginate=true&page=1&limit=1`,
    accessToken,
    { signal },
  );

  // mirrors extractLeadStats (Screens/LeadsList/index.jsx ~78-109)
  const payload = result?.data && typeof result.data === "object" ? result.data : {};
  const source = { ...payload, ...result };

  const open = Number(source.totalOpenStatusCount) || 0;
  const notContacted = Number(source.totalNotContactedStatusCount) || 0;
  const working = Number(source.totalWorkingStatusCount) || 0;
  const converted = Number(source.totalConvertedStatusCount) || 0;
  const total = Number(source.totalRecords) || open + notContacted + working + converted;

  return {
    total,
    items: [
      { statusKey: "open", label: "Open", value: open },
      { statusKey: "notContacted", label: "Not Contacted", value: notContacted },
      { statusKey: "working", label: "Working", value: working },
      { statusKey: "converted", label: "Converted", value: converted },
    ],
    live: true,
  };
}

const OPPORTUNITY_STAGES = [
  { statusKey: "qualification", label: "Qualification" },
  { statusKey: "proposal", label: "Proposal" },
  { statusKey: "quotation", label: "Quotation" },
  { statusKey: "negotiation", label: "Negotiation" },
  { statusKey: "closed_won", label: "Closed Won" },
  { statusKey: "closed_lost", label: "Closed Lost" },
];

async function fetchOpportunityStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}crm-opportunity/board`,
    accessToken,
    { signal },
  );

  // board response is a dict keyed by stage -> array (Screens/LeadInfo/Opportunities.jsx ~180-194)
  const board = result?.data && typeof result.data === "object" ? result.data : result || {};
  const knownKeys = new Set(OPPORTUNITY_STAGES.map((s) => s.statusKey));

  let total = 0;
  let otherCount = 0;
  Object.entries(board).forEach(([key, list]) => {
    const count = Array.isArray(list) ? list.length : 0;
    total += count;
    if (!knownKeys.has(key)) otherCount += count;
  });

  const items = OPPORTUNITY_STAGES.map(({ statusKey, label }) => ({
    statusKey,
    label,
    value: Array.isArray(board[statusKey]) ? board[statusKey].length : 0,
  }));
  if (otherCount) items.push({ statusKey: "other", label: "Other", value: otherCount });

  return { total, items, live: true };
}

async function fetchQuotationStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}crm-quotation/stats`,
    accessToken,
    { signal },
  );

  // mirrors extractQuotationStats (Screens/Quotations/index.jsx ~86-102)
  const stats = result?.data ?? result ?? {};
  const byStatus = stats.byStatus || {};
  const getCount = (key) => Number(byStatus[key]) || 0;

  return {
    total: Number(stats.total) || 0,
    items: [
      { statusKey: "draft", label: "Draft", value: getCount("draft") },
      { statusKey: "sent", label: "Sent", value: getCount("sent") },
      { statusKey: "accepted", label: "Accepted", value: getCount("accepted") },
      { statusKey: "rejected", label: "Rejected", value: getCount("rejected") },
      { statusKey: "expired", label: "Expired", value: getCount("expired") },
      { statusKey: "cancelled", label: "Cancelled", value: getCount("cancelled") },
    ],
    live: true,
    secondaryStat: { label: "Total quoted value", value: formatMoney(stats.totalAmount) },
  };
}

async function fetchSalesOrderStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}sales-order/stats`,
    accessToken,
    { signal },
  );

  // mirrors extractSalesOrderStats (Screens/SalesOrder/index.jsx ~91-107)
  const stats = result?.data ?? result ?? {};
  const byStatus = stats.byStatus || {};
  const getCount = (key) => Number(byStatus[key]) || 0;

  return {
    total: Number(stats.total) || 0,
    items: [
      { statusKey: "processing", label: "Processing", value: getCount("processing") },
      { statusKey: "confirmed", label: "Confirmed", value: getCount("confirmed") },
      { statusKey: "shipped", label: "Shipped", value: getCount("shipped") },
      { statusKey: "delivered", label: "Delivered", value: getCount("delivered") },
      { statusKey: "cancelled", label: "Cancelled", value: getCount("cancelled") },
    ],
    live: true,
    secondaryStat: { label: "Total order value", value: formatMoney(stats.totalAmount) },
  };
}

async function fetchPurchaseStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}purchase-order?paginate=true&page=1&limit=1`,
    accessToken,
    { signal },
  );

  // mirrors Screens/Purchase/index.jsx ~320-335
  const apiData = result?.data;
  const source = { ...apiData, ...result };
  const received = Number(source.totalReceived) || 0;
  const notReceived = Number(source.totalNotReceived) || 0;
  const partialPaid = Number(source.totalPartialPaid) || 0;
  const totalOrders = Number(source.totalOrders) || received + notReceived + partialPaid;

  return {
    total: totalOrders,
    items: [
      { statusKey: "received", label: "Received", value: received },
      { statusKey: "notReceived", label: "Not Received", value: notReceived },
      { statusKey: "partialPaid", label: "Partial Paid", value: partialPaid },
    ],
    live: true,
    secondaryStat: { label: "Total order value", value: formatMoney(source.totalOrderAmount) },
  };
}

async function fetchInvoiceStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}invoice?orderBy=createdAt&order=desc&page=1&paginate=true&limit=1`,
    accessToken,
    { signal },
  );

  // mirrors Screens/Invoices/index.jsx ~282-296
  const data = result?.data || {};
  const paid = Number(data.totalPaid) || 0;
  const unpaid = Number(data.totalUnpaid) || 0;
  const partialPaid = Number(data.totalPartialPaid) || 0;
  const totalInvoice = Number(data.totalInvoice) || paid + unpaid + partialPaid;

  return {
    total: totalInvoice,
    items: [
      { statusKey: "paid", label: "Paid", value: paid },
      { statusKey: "unpaid", label: "Unpaid", value: unpaid },
      { statusKey: "partialPaid", label: "Partial Paid", value: partialPaid },
    ],
    live: true,
    secondaryStat: { label: "Total invoiced value", value: formatMoney(data.totalInvoiceAmount) },
  };
}

async function fetchAgentRequestStats(accessToken, ctx, { signal }) {
  const result = await getRequestWithOutBody(
    `${baseURl}agent-request?paginate=true&page=1&limit=1`,
    accessToken,
    { signal },
  );

  // confirmed live: root-level totalCount/totalPendingCount/totalApprovedCount/totalRejectedCount
  const pending = Number(result?.totalPendingCount) || 0;
  const approved = Number(result?.totalApprovedCount) || 0;
  const rejected = Number(result?.totalRejectedCount) || 0;
  const total = Number(result?.totalCount) || pending + approved + rejected;

  return {
    total,
    items: [
      { statusKey: "pending", label: "Pending", value: pending },
      { statusKey: "approved", label: "Approved", value: approved },
      { statusKey: "rejected", label: "Rejected", value: rejected },
    ],
    live: true,
  };
}

async function fetchAttendanceStats(accessToken, ctx, { signal }) {
  const api =
    ctx.roleTitle === "Admin" || ctx.roleTitle === "Human Resource"
      ? `${baseURl}attendance/report?paginate=true&page=1&limit=1`
      : `${baseURl}attendance/report?paginate=true&page=1&limit=1&userId=${ctx.userId}`;

  const result = await getRequestWithOutBody(api, accessToken, { signal });
  const total = Number(result?.data?.totalRecords) || 0;

  return { total, items: [], live: false };
}

export const MODULE_DEFINITIONS = [
  {
    key: "tickets",
    name: "Internal Tickets",
    route: "agentsTickets",
    category: "system",
    group: "Tickets & Tasks",
    accentVar: "--module-accent-tickets",
    primaryStatusKey: "completed",
    fetchStats: fetchTicketStats,
  },
  {
    key: "projectTracker",
    name: "Project Management",
    route: "projectTracking",
    category: "project",
    group: "Tickets & Tasks",
    accentVar: "--module-accent-project",
    primaryStatusKey: "completed",
    fetchStats: fetchProjectStats,
  },
  {
    key: "merchantApplications",
    name: "Merchant Applications",
    route: "adminApplication",
    category: "crm",
    group: "Client Management/CRM",
    accentVar: "--module-accent-applications",
    primaryStatusKey: "completed",
    fetchStats: fetchApplicationStats,
  },
  {
    key: "supportTickets",
    name: "Support Tickets",
    route: "maintananceTicket",
    category: "crm",
    group: "Client Management/CRM",
    accentVar: "--module-accent-support",
    primaryStatusKey: "completed",
    fetchStats: fetchSupportTicketStats,
  },
  {
    key: "leads",
    name: "Leads",
    route: "leadsList",
    category: "crm",
    group: "Sales Management",
    accentVar: "--module-accent-leads",
    primaryStatusKey: "converted",
    fetchStats: fetchLeadStats,
  },
  {
    key: "opportunities",
    name: "Opportunities",
    route: "opportunities",
    category: "sale",
    group: "Sales Management",
    accentVar: "--module-accent-opportunities",
    primaryStatusKey: "closed_won",
    fetchStats: fetchOpportunityStats,
  },
  {
    key: "quotations",
    name: "Quotations",
    route: "quotations",
    category: "sale",
    group: "Sales Management",
    accentVar: "--module-accent-quotations",
    primaryStatusKey: "accepted",
    fetchStats: fetchQuotationStats,
  },
  {
    key: "salesOrders",
    name: "Sales Orders",
    route: "salesOrder",
    category: "sale",
    group: "Sales Management",
    accentVar: "--module-accent-sales-orders",
    primaryStatusKey: "delivered",
    fetchStats: fetchSalesOrderStats,
  },
  {
    key: "purchase",
    name: "Purchase",
    route: "purchase",
    category: "inventory",
    group: "Accounting Management",
    accentVar: "--module-accent-purchase",
    primaryStatusKey: "received",
    fetchStats: fetchPurchaseStats,
  },
  {
    key: "invoices",
    name: "Invoices",
    route: "invoices",
    category: "accounting",
    group: "Accounting Management",
    accentVar: "--module-accent-invoices",
    primaryStatusKey: "paid",
    fetchStats: fetchInvoiceStats,
  },
  {
    key: "agentManagement",
    name: "Agents Application",
    route: "agentManagement",
    category: "hr",
    group: "Workforce Management",
    accentVar: "--module-accent-agent-management",
    primaryStatusKey: "approved",
    fetchStats: fetchAgentRequestStats,
  },
  {
    key: "attendance",
    name: "Attendance",
    route: "attendanceReport",
    category: "hr",
    group: "Workforce Management",
    accentVar: "--module-accent-attendance",
    fetchStats: fetchAttendanceStats,
  },
];
