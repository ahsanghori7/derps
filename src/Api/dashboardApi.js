import {
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  putRequestWithBodyAndToken,
} from "./fetch";
import { baseURl } from "../Config/systemConfig";

function dashboardUrl(path = "") {
  const root = String(baseURl || "");
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return `${prefix}dashboard${path}`;
}

export function readDashboardError(error) {
  const raw = String(error?.message || "").trim();
  if (!raw || raw.startsWith("<") || raw.length > 240) {
    return "Couldn’t load dashboard";
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.message) return String(parsed.message);
  } catch {
    // Response body was plain text.
  }
  return raw;
}

export async function getDashboardSettings(token, { signal } = {}) {
  const result = await getRequestWithOutBody(`${dashboardUrl()}/settings`, token, {
    signal,
  });
  return Array.isArray(result?.data?.modules) ? result.data.modules : [];
}

export async function saveDashboardSettings(token, modules) {
  const payload = (modules || []).map((module, index) => ({
    key: module.key,
    visible: module.visible !== false,
    order: index,
    label: module.label,
  }));
  const result = await putRequestWithBodyAndToken(`${dashboardUrl()}/settings`, token, {
    modules: payload.map(({ key, visible, order }) => ({ key, visible, order })),
  });
  const saved = result?.data?.modules;
  return Array.isArray(saved) && saved.length ? saved : payload;
}

export async function getDashboardStats(
  token,
  { modules, respectSettings = false, userId, signal } = {},
) {
  const params = new URLSearchParams();
  if (userId) params.set("userId", String(userId));
  if (Array.isArray(modules) && modules.length) {
    params.set("modules", modules.join(","));
  } else if (respectSettings) {
    params.set("respectSettings", "true");
  }
  const query = params.toString();
  const result = await getRequestWithOutBody(
    `${dashboardUrl()}/stats${query ? `?${query}` : ""}`,
    token,
    { signal },
  );
  const data = result?.data && typeof result.data === "object" ? result.data : {};
  return {
    generatedAt: data.generatedAt || null,
    moduleKeys: Array.isArray(data.moduleKeys) ? data.moduleKeys : [],
    modules: data.modules && typeof data.modules === "object" ? data.modules : {},
    meetings: data.meetings && typeof data.meetings === "object" ? data.meetings : null,
  };
}

export async function getLoginAnalytics(token, { signal } = {}) {
  const result = await getRequestWithOutBody(
    `${dashboardUrl()}/login-analytics`,
    token,
    { signal },
  );
  if (!result?.data || typeof result.data !== "object") return [];
  return Array.isArray(result.data.memos) ? result.data.memos : [];
}

export async function getTicketCategoryCounts(token, { signal } = {}) {
  const result = await getRequestWithOutBody(`${dashboardUrl()}/`, token, { signal });
  return Array.isArray(result?.data) ? result.data : [];
}

export async function getTicketDashboardBundle(token, body = {}, { signal } = {}) {
  const result = await postRequestWithBodyAndToken(
    `${dashboardUrl()}/new`,
    token,
    { period: "monthly", ...body },
    { signal },
  );
  return result?.data && typeof result.data === "object" ? result.data : {};
}

export async function getInsightsProjectTracker(token, query = {}, { signal } = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, String(value));
  });
  const qs = params.toString();
  const result = await getRequestWithOutBody(
    `${dashboardUrl()}/insights-project-tracker${qs ? `?${qs}` : ""}`,
    token,
    { signal },
  );
  if (!result || typeof result !== "object") return null;
  return result.data !== undefined ? result.data : result;
}

export async function getRecentChats(token, { signal } = {}) {
  const root = String(baseURl || "");
  const prefix = root.endsWith("/") ? root : `${root}/`;
  const result = await getRequestWithOutBody(`${prefix}chat?page=1&limit=10`, token, { signal });
  return {
    chats: Array.isArray(result?.data) ? result.data : [],
    total: Number(result?.pagination?.totalItems) || 0,
  };
}
