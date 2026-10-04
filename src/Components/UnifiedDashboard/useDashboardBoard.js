import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDashboardSettings,
  getDashboardStats,
  getInsightsProjectTracker,
  getLoginAnalytics,
  getRecentChats,
  getTicketCategoryCounts,
  getTicketDashboardBundle,
  readDashboardError,
  saveDashboardSettings,
} from "../../Api/dashboardApi";
import {
  chatWidget,
  insightWidgets,
  normalizeDashboardSettings,
  overviewItemsFromBundle,
  scheduleWidget,
  ticketBundleWidgets,
  toDashboardWidget,
} from "./apiModules";

function isOrgWideRole(roleTitle) {
  const role = String(roleTitle || "").toLowerCase();
  return role === "admin" || role === "human resource";
}

const INITIAL_PENDING = {
  stats: true,
  bundle: true,
  categories: true,
  insights: true,
  chats: true,
};

export function useDashboardBoard(accessToken, { userId, roleTitle, sources } = {}) {
  const [settings, setSettings] = useState([]);
  const [statsByKey, setStatsByKey] = useState({});
  const [generatedAt, setGeneratedAt] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [memos, setMemos] = useState([]);
  const [bundle, setBundle] = useState(null);
  const [categories, setCategories] = useState([]);
  const [insights, setInsights] = useState(null);
  const [chats, setChats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(INITIAL_PENDING);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [notice, setNotice] = useState("");
  // Admin and HR see org-wide numbers; everyone else only their own.
  const scopedUserId = !isOrgWideRole(roleTitle) && userId ? userId : undefined;
  const needBundle = sources?.bundle !== false;
  const needCategories = sources?.categories !== false;
  const needInsights = sources?.insights !== false;
  const needChats = sources?.chats !== false;
  const needMemos = sources?.memos !== false;

  const load = useCallback(
    async (signal, { refresh = false } = {}) => {
      if (!accessToken) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      setStatsError("");
      setNotice("");
      setPending({
        stats: true,
        bundle: needBundle,
        categories: needCategories,
        insights: needInsights,
        chats: needChats,
      });

      const bundleBody = { period: "monthly" };
      if (scopedUserId) bundleBody.assignedTo = scopedUserId;
      const notices = [];
      const mark = (key) => {
        if (signal?.aborted) return;
        setPending((current) => ({ ...current, [key]: false }));
      };
      const note = (message) => {
        if (!message || signal?.aborted) return;
        notices.push(message);
        setNotice(notices.join(" · "));
      };
      const run = async (key, request, onSuccess, label) => {
        if (signal?.aborted) return;
        try {
          const value = await request();
          if (signal?.aborted) return;
          onSuccess(value);
        } catch (err) {
          if (signal?.aborted || err?.name === "AbortError") return;
          if (label) note(`${label}: ${readDashboardError(err)}`);
          else if (key === "stats") setStatsError(readDashboardError(err));
          else setError(readDashboardError(err));
        } finally {
          if (key) mark(key);
        }
      };

      const primary = Promise.all([
        run("settings", () => getDashboardSettings(accessToken, { signal }), (value) => {
          setSettings(normalizeDashboardSettings(value));
        }),
        run("stats", () => getDashboardStats(accessToken, { respectSettings: true, userId: scopedUserId, signal }), (value) => {
          setStatsByKey(value.modules || {});
          setGeneratedAt(value.generatedAt || null);
          setSchedule(value.meetings);
        }),
      ]);

      const secondary = Promise.all([
        needMemos
          ? run(null, () => getLoginAnalytics(accessToken, { signal }), setMemos, "Memos")
          : Promise.resolve(),
        needBundle
          ? run("bundle", () => getTicketDashboardBundle(accessToken, bundleBody, { signal }), setBundle, "Tickets")
          : Promise.resolve(),
        needCategories
          ? run("categories", () => getTicketCategoryCounts(accessToken, { signal }), setCategories, "Categories")
          : Promise.resolve(),
        needInsights
          ? run("insights", () => getInsightsProjectTracker(accessToken, { userId: scopedUserId }, { signal }), setInsights, "Insights")
          : Promise.resolve(),
        needChats
          ? run("chats", () => getRecentChats(accessToken, { signal }), setChats, "Chats")
          : Promise.resolve(),
      ]);

      await primary;
      if (!signal?.aborted) setLoading(false);
      await secondary;
      if (!signal?.aborted) setRefreshing(false);
    },
    [accessToken, scopedUserId, needBundle, needCategories, needInsights, needChats, needMemos],
  );

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [accessToken, load]);

  const saveSettings = useCallback(
    async (modules) => {
      setRefreshing(true);
      setStatsError("");
      try {
        const saved = await saveDashboardSettings(accessToken, modules);
        setSettings(normalizeDashboardSettings(saved));
      } catch (err) {
        setRefreshing(false);
        throw new Error(readDashboardError(err));
      }

      try {
        const statsResult = await getDashboardStats(accessToken, {
          respectSettings: true,
          userId: scopedUserId,
        });
        setStatsByKey(statsResult.modules || {});
        setGeneratedAt(statsResult.generatedAt || null);
        setSchedule(statsResult.meetings);
      } catch (err) {
        setStatsError(readDashboardError(err));
      } finally {
        setRefreshing(false);
      }
    },
    [accessToken, scopedUserId],
  );

  const widgets = useMemo(
    () =>
      settings
        .filter((module) => module.visible)
        .map((module) => toDashboardWidget(module, statsByKey[module.key])),
    [settings, statsByKey],
  );

  const overviewItems = useMemo(() => overviewItemsFromBundle(bundle), [bundle]);

  const bundleWidgets = useMemo(
    () => [
      ...ticketBundleWidgets({ bundle, categories }),
      chatWidget(chats, userId),
      scheduleWidget(schedule),
      ...insightWidgets(insights),
    ],
    [bundle, categories, chats, insights, schedule, userId],
  );

  return {
    settings,
    widgets,
    bundleWidgets,
    overviewItems,
    generatedAt,
    memos,
    loading,
    refreshing,
    error,
    statsError,
    notice,
    pending,
    statsByKey,
    reload: () => load(undefined, { refresh: true }),
    saveSettings,
  };
}
