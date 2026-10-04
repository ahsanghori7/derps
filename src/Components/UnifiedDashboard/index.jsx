import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import moment from "moment";
import ManageDashboardModal from "./ManageDashboardModal";
import BusinessOverviewStrip from "./BusinessOverviewStrip";
import { WORKSPACE_WIDGETS, loadWidgetPrefs, saveWidgetPrefs } from "./dashboardWidgets";
import { useDashboardBoard } from "./useDashboardBoard";
import { useDashboardAccess } from "./dashboardAccess";
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Megaphone,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

const WidgetCard = lazy(() => import("./WidgetCard"));

const widgetMinHeight = (widget) => (widget.type === "kpiRow" ? 118 : 272);

const PINNED_WIDGET_IDS = ["schedule", "chats"];

const EmptyState = ({ icon: Icon, tone, title, text, action, onAction }) => (
  <div className="ud-card flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center">
    <span
      className="flex items-center justify-center rounded-2xl mb-1"
      style={{ width: 52, height: 52, backgroundColor: `${tone}1A`, color: tone }}
    >
      <Icon size={24} />
    </span>
    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>{title}</div>
    <div style={{ fontSize: 12, color: "var(--dashboard-text-secondary)", maxWidth: 320 }}>{text}</div>
    <button
      type="button"
      onClick={onAction}
      className="ud-btn-primary rounded-lg px-4 py-2 mt-2"
      style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", backgroundColor: "#0C79F7", border: "none", cursor: "pointer" }}
    >
      {action}
    </button>
  </div>
);

const UnifiedDashboard = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const userId = userData?.id;
  const [prefs, setPrefs] = useState(() => loadWidgetPrefs(userId));

  // Reload when the signed-in account changes so one user's layout never leaks to another.
  useEffect(() => {
    setPrefs(loadWidgetPrefs(userId));
  }, [userId]);
  const [manageOpen, setManageOpen] = useState(false);

  const access = useDashboardAccess();
  const sources = useMemo(() => ({
    bundle: Boolean(
      (prefs.overview !== false && access.canWidget("overview"))
      || (prefs.ticketTrends !== false && access.canWidget("ticketTrends"))
      || (prefs.ticketCategories !== false && access.canWidget("ticketCategories"))
      || (prefs.assignedUsers !== false && access.canWidget("assignedUsers")),
    ),
    categories: Boolean(prefs.ticketCategories !== false && access.canWidget("ticketCategories")),
    insights: Boolean(prefs.insights !== false && access.canInsights()),
    chats: Boolean(prefs.chats !== false && access.canWidget("chats")),
    memos: access.canWidget("memos"),
  }), [prefs, access]);

  const board = useDashboardBoard(accessToken, {
    userId: userData?.id,
    roleTitle: userData?.roleTitle,
    sources,
  });

  // Only what the user can open from the sidebar is shown or offered in Manage.
  const allowedWorkspaceWidgets = useMemo(
    () =>
      WORKSPACE_WIDGETS.filter((widget) =>
        widget.id === "insights" ? access.canInsights() : access.canWidget(widget.id),
      ),
    [access],
  );
  const allowedSettings = useMemo(
    () => board.settings.filter((module) => access.canModule(module.key)),
    [board.settings, access],
  );
  const allowedWidgets = useMemo(
    () => board.widgets.filter((widget) => access.canModule(widget.id)),
    [board.widgets, access],
  );
  const showOverview = prefs.overview !== false && access.canWidget("overview");
  const memos = access.canWidget("memos") ? board.memos : [];
  const overviewItems = useMemo(
    () => board.overviewItems.filter((item) => !item.route || access.can({ route: item.route })),
    [board.overviewItems, access],
  );

  const workspaceCards = useMemo(() => {
    const byId = Object.fromEntries(board.bundleWidgets.map((widget) => [widget.id, widget]));
    const cards = allowedWorkspaceWidgets
      .filter((widget) => widget.id !== "overview" && widget.id !== "insights" && prefs[widget.id] && byId[widget.id])
      .map((widget) => byId[widget.id]);
    if (prefs.insights && access.canInsights()) {
      cards.push(
        ...board.bundleWidgets.filter(
          (widget) => widget.group === "Projects" && access.canWidget(widget.id),
        ),
      );
    }
    return cards;
  }, [board.bundleWidgets, prefs, allowedWorkspaceWidgets, access]);

  const handleSave = async ({ prefs: nextPrefs, modules }) => {
    if (modules.length) {
      // Keep modules the user can't access untouched so saving never drops them.
      const hidden = board.settings.filter((module) => !access.canModule(module.key));
      await board.saveSettings(
        [...modules, ...hidden].map((module, order) => ({ ...module, order })),
      );
    }
    setPrefs(nextPrefs);
    saveWidgetPrefs(nextPrefs, userId);
  };

  // Today's schedule and chats come first, right below the ticket summary.
  const pinnedCards = workspaceCards.filter((widget) => PINNED_WIDGET_IDS.includes(widget.id));
  const otherCards = workspaceCards.filter((widget) => !PINNED_WIDGET_IDS.includes(widget.id));

  const renderWidget = (widget) => {
    const height = widgetMinHeight(widget);
    const wide = widget.span === "wide";
    const cardLoading = widget.id === "chats"
      ? board.pending.chats
      : widget.id === "schedule"
        ? board.pending.stats
        : widget.group === "Projects"
          ? board.pending.insights
          : widget.id === "ticketCategories"
            ? board.pending.bundle || board.pending.categories
            : widget.id === "ticketTrends" || widget.id === "assignedUsers"
              ? board.pending.bundle
              : board.pending.stats;
    return (
      <div
        key={widget.id}
        style={{
          flex: wide ? "1 1 calc(50% - 10px)" : "1 1 calc(25% - 10px)",
          minWidth: wide ? "min(100%, 320px)" : "min(100%, 240px)",
          height,
          minHeight: height,
        }}
      >
        <Suspense
          fallback={(
            <div className="ud-card rounded-2xl p-3 h-full">
              <div className="ud-skeleton" style={{ height: 14, width: "40%" }} />
            </div>
          )}
        >
          <WidgetCard
            widget={widget}
            period="thisYear"
            liveLoading={cardLoading}
          />
        </Suspense>
      </div>
    );
  };

  const widgetCount = (showOverview ? 1 : 0) + workspaceCards.length + allowedWidgets.length;
  const updatedLabel = board.generatedAt
    ? `Updated ${moment(board.generatedAt).format("h:mm A")}`
    : "";
  const statusError = [board.error, board.statsError, board.notice].filter(Boolean).join(" · ");

  const hasIssue = Boolean(board.error || board.statsError || board.notice);

  return (
    <div className="px-3 flex flex-col gap-2.5 flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--dashboard-text-primary)",
              backgroundColor: "var(--dashboard-card-bg)",
              border: "1px solid var(--dashboard-border)",
            }}
          >
            <LayoutGrid size={12} style={{ color: "#0C79F7" }} />
            {board.loading ? "Loading…" : `${widgetCount} widgets`}
          </span>
          {updatedLabel && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: 11, color: "var(--dashboard-text-secondary)" }}
            >
              <Clock3 size={11} />
              {updatedLabel}
            </span>
          )}
          {statusError && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 truncate"
              title={statusError}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#B45309",
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                maxWidth: 420,
              }}
            >
              <AlertTriangle size={11} style={{ flexShrink: 0 }} />
              <span className="truncate">{statusError}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={board.reload}
            title={hasIssue ? "Retry" : "Refresh"}
            disabled={board.refreshing}
            className="ud-open-btn rounded-lg flex items-center justify-center gap-1.5 px-2.5"
            style={{
              height: 30,
              fontSize: 11.5,
              fontWeight: 700,
              color: "#0C79F7",
              backgroundColor: "var(--dashboard-card-bg)",
              border: "1px solid var(--dashboard-border)",
              cursor: board.refreshing ? "default" : "pointer",
            }}
          >
            <RefreshCw size={13} className={board.refreshing ? "ud-spin" : ""} />
            {hasIssue ? "Retry" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="ud-btn-primary rounded-lg px-3 flex items-center gap-1.5"
            style={{
              height: 30,
              fontSize: 11.5,
              fontWeight: 700,
              color: "#fff",
              background: "linear-gradient(135deg, #0C79F7 0%, #0A68D4 100%)",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px -6px rgba(12, 121, 247, 0.7)",
            }}
          >
            <SlidersHorizontal size={13} />
            Manage
          </button>
        </div>
      </div>

      {memos.length > 0 && (
        <Link
          to="/home/memo"
          className="ud-tile ud-clickable rounded-xl px-3 py-2 text-left flex-shrink-0 flex items-center gap-2.5"
          style={{
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--dashboard-text-primary)",
            background: "linear-gradient(90deg, rgba(12, 121, 247, 0.12), rgba(12, 121, 247, 0.02))",
            border: "1px solid rgba(12, 121, 247, 0.3)",
            cursor: "pointer",
          }}
        >
          <span
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ width: 28, height: 28, backgroundColor: "#0C79F7", color: "#fff" }}
          >
            <Megaphone size={14} />
          </span>
          <span className="flex-1 min-w-0 truncate">
            {memos.length} memo{memos.length === 1 ? "" : "s"} updated since your last login
          </span>
          <span className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 11, fontWeight: 700, color: "#0C79F7" }}>
            View <ChevronRight size={14} />
          </span>
        </Link>
      )}

      {board.loading && allowedWidgets.length === 0 && !showOverview && workspaceCards.length === 0 ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div
                key={key}
                className="ud-card rounded-2xl p-3 flex flex-col gap-2"
                style={{ flex: "1 1 calc(33% - 10px)", minWidth: 260, height: 200 }}
              >
                <div className="ud-skeleton" style={{ height: 14, width: "40%" }} />
                <div className="ud-skeleton flex-1" />
              </div>
            ))}
          </div>
        </div>
      ) : board.error && allowedWidgets.length === 0 && !showOverview && workspaceCards.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          tone="#DC2626"
          title={board.error}
          text="We couldn’t load your dashboard. Please try again."
          action="Retry"
          onAction={board.reload}
        />
      ) : widgetCount === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          tone="#0C79F7"
          title="No widgets selected"
          text="Choose the widgets you want to see on your dashboard."
          action="Manage dashboard"
          onAction={() => setManageOpen(true)}
        />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start" }}>
            {showOverview && (
              <BusinessOverviewStrip
                items={overviewItems}
                loading={board.pending.bundle && overviewItems.length === 0}
                error=""
              />
            )}
            {[...pinnedCards, ...otherCards, ...allowedWidgets].map(renderWidget)}
          </div>
        </div>
      )}

      <ManageDashboardModal
        open={manageOpen}
        prefs={prefs}
        modules={allowedSettings}
        workspaceWidgets={allowedWorkspaceWidgets}
        onSave={handleSave}
        onClose={() => setManageOpen(false)}
      />
    </div>
  );
};

export default UnifiedDashboard;
