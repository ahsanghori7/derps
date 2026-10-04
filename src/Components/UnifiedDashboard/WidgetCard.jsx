import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  LabelList,
} from "recharts";
import { createContext, useContext, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { followHref, itemHref, widgetHref } from "./dashboardLinks";
import {
  BarChart3,
  Boxes,
  List as ListIcon,
  PieChart as PieChartIcon,
  ChevronRight,
  FolderKanban,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Ticket,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

const GROUP_ICONS = {
  Tickets: Ticket,
  Communication: MessageSquare,
  Projects: FolderKanban,
  Finance: Wallet,
  Operations: Boxes,
  CRM: Users,
  Sales: TrendingUp,
  HR: UserRound,
};

const GROUP_TINTS = {
  Tickets: "#0059F5",
  Communication: "#0C79F7",
  Projects: "#7C5CFF",
  Finance: "#16A34A",
  Operations: "#D07E0B",
  CRM: "#DB2777",
  Sales: "#0891B2",
  HR: "#9333EA",
};

const AVATAR_COLORS = ["#0059F5", "#0C79F7", "#7C5CFF", "#D07E0B", "#DB2777", "#16A34A"];

function initialsOf(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || "?").slice(0, 2)).toUpperCase();
}

function avatarColor(name) {
  const text = String(name || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const Avatar = ({ name, src, size = 28 }) => {
  const color = avatarColor(name);
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || ""}
        loading="lazy"
        onError={() => setFailed(true)}
        className="rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          backgroundColor: `${color}1F`,
          border: "1px solid var(--dashboard-border)",
        }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 700,
        color,
        backgroundColor: `${color}1F`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
};

const EmptyBody = ({ label }) => (
  <div
    className="h-full flex flex-col items-center justify-center gap-1.5"
    style={{ fontSize: 11.5, color: "var(--dashboard-text-secondary)" }}
  >
    <Inbox size={22} strokeWidth={1.75} style={{ opacity: 0.55 }} />
    {label}
  </div>
);

const LoadingBody = () => (
  <div className="h-full flex flex-col gap-2 p-1">
    <div className="ud-skeleton" style={{ height: 12, width: "55%" }} />
    <div className="ud-skeleton" style={{ height: 12, width: "80%" }} />
    <div className="ud-skeleton flex-1" />
  </div>
);

const LinkContext = createContext({ hrefFor: () => null, go: () => {} });
const useWidgetLinks = () => useContext(LinkContext);

/** Real <a> when there's a target, so Ctrl/Cmd-click opens a new tab. */
const DashLink = ({ to, className = "", style, children, ...rest }) =>
  to ? (
    <Link
      to={to}
      className={`${className} ud-clickable`}
      style={{ color: "inherit", textDecoration: "none", cursor: "pointer", ...style }}
      {...rest}
    >
      {children}
    </Link>
  ) : (
    <div className={className} style={style} {...rest}>
      {children}
    </div>
  );

const WidgetShell = ({ title, subtitle, group, openHref, children }) => {
  const Icon = GROUP_ICONS[group] || LayoutGrid;
  const tint = GROUP_TINTS[group] || "#0C79F7";
  return (
    <div className="ud-card rounded-2xl flex flex-col h-full min-h-0" style={{ overflow: "hidden" }}>
      <div
        className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-2 flex-shrink-0"
        style={{ minHeight: 44 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ width: 28, height: 28, backgroundColor: `${tint}1A`, color: tint }}
          >
            <Icon size={15} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <div
              className="truncate"
              style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dashboard-text-primary)", lineHeight: 1.25 }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                className="truncate"
                style={{ fontSize: 10, color: "var(--dashboard-text-secondary)", lineHeight: 1.3 }}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {openHref && (
          <Link
            to={openHref}
            title={`Open ${title}`}
            className="ud-open-btn flex items-center gap-0.5 rounded-md"
            style={{
              textDecoration: "none",
              fontSize: 10.5,
              fontWeight: 700,
              color: "#0C79F7",
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            Open
            <ChevronRight size={13} />
          </Link>
        )}
      </div>
      <div
        style={{ height: 1, margin: "0 12px", backgroundColor: "var(--dashboard-border)", flexShrink: 0 }}
      />
      <div className="flex-1 min-h-0 px-2 py-2 overflow-hidden">{children}</div>
    </div>
  );
};

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 10,
  border: "1px solid var(--dashboard-border)",
  backgroundColor: "var(--dashboard-card-bg)",
  color: "var(--dashboard-text-primary)",
  boxShadow: "0 8px 20px -10px rgba(15, 23, 42, 0.35)",
};

const axisTick = { fontSize: 9, fill: "var(--dashboard-text-secondary)" };
const tooltipCursor = { fill: "rgba(12, 121, 247, 0.06)" };

export const KpiRowWidget = ({ items, loading }) => {
  const { hrefFor } = useWidgetLinks();
  if (loading) {
    return <LoadingBody />;
  }

  const cols = Math.min(Math.max(items?.length || 1, 1), 5);

  return (
    <div
      className="grid gap-2 h-full min-h-0"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {(items || []).map((item) => (
        <DashLink
          key={item.id || item.label}
          to={hrefFor(item)}
          className="rounded-lg px-2.5 py-2 flex flex-col justify-center min-w-0 text-left"
          style={{ backgroundColor: "var(--dashboard-card-bg2)" }}
        >
          <div
            className="truncate"
            style={{
              fontSize: 11,
              color: "var(--dashboard-text-secondary)",
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
            title={item.label}
          >
            {item.label}
          </div>
          <div className="flex items-baseline gap-1.5 mt-1 min-w-0">
            <span
              className="truncate"
              style={{ fontSize: 18, fontWeight: 700, color: "var(--dashboard-text-primary)" }}
            >
              {item.value ?? "—"}
            </span>
            {item.delta && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: String(item.delta).startsWith("-") ? "#FF4C4C" : "#0CA30C",
                  flexShrink: 0,
                }}
              >
                {item.delta}
              </span>
            )}
          </div>
          {item.sub && (
            <div
              className="truncate mt-0.5"
              style={{ fontSize: 10, color: "var(--dashboard-text-secondary)" }}
            >
              {item.sub}
            </div>
          )}
          <div
            style={{
              height: 3,
              marginTop: 8,
              borderRadius: 999,
              backgroundColor: `${item.tint || "#0C79F7"}33`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "70%",
                height: "100%",
                borderRadius: 999,
                backgroundColor: item.tint || "#0C79F7",
              }}
            />
          </div>
        </DashLink>
      ))}
    </div>
  );
};

export const StatGridWidget = ({ items }) => {
  const { hrefFor } = useWidgetLinks();
  if (items.length === 1) {
    const item = items[0];
    return (
      <DashLink
        to={hrefFor(item)}
        className="ud-tile h-full w-full rounded-xl flex flex-col items-center justify-center gap-1.5"
        style={{
          background: `linear-gradient(160deg, ${item.color || "#0C79F7"}14, var(--dashboard-card-bg2))`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dashboard-text-secondary)" }}>
          {item.label}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: item.color || "#0C79F7", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {typeof item.value === "number" ? item.value.toLocaleString("en-US") : item.value}
        </div>
      </DashLink>
    );
  }

  return (
  <div className="grid grid-cols-2 gap-2 h-full min-h-0 content-stretch">
    {items.map((item) => (
      <DashLink
        key={item.label}
        to={hrefFor(item)}
        className="ud-tile rounded-xl px-3 py-2 text-left min-h-0 overflow-hidden flex flex-col justify-center"
        style={{
          backgroundColor: "var(--dashboard-card-bg2)",
          borderLeft: `3px solid ${item.color || "#0C79F7"}`,
        }}
      >
        <div
          className="truncate"
          style={{ fontSize: 11, color: "var(--dashboard-text-secondary)", fontWeight: 600 }}
        >
          {item.label}
        </div>
        <div
          className="truncate"
          style={{
            fontSize: items.length <= 4 ? 24 : 17,
            fontWeight: 800,
            color: "var(--dashboard-text-primary)",
            marginTop: 2,
            lineHeight: 1.2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {typeof item.value === "number" ? item.value.toLocaleString("en-US") : item.value}
        </div>
      </DashLink>
    ))}
  </div>
  );
};

const VIEW_PREFS_KEY = "drms-dashboard-widget-views-v1";

const viewPrefsKey = (userId) => (userId ? `${VIEW_PREFS_KEY}:${userId}` : VIEW_PREFS_KEY);

function readViewPref(id, userId) {
  try {
    return JSON.parse(localStorage.getItem(viewPrefsKey(userId)) || "{}")[id] || null;
  } catch {
    return null;
  }
}

function writeViewPref(id, view, userId) {
  try {
    const current = JSON.parse(localStorage.getItem(viewPrefsKey(userId)) || "{}");
    localStorage.setItem(viewPrefsKey(userId), JSON.stringify({ ...current, [id]: view }));
  } catch {
    // Preference is a convenience only.
  }
}

const BREAKDOWN_VIEWS = [
  { id: "donut", label: "Donut", icon: PieChartIcon },
  { id: "bars", label: "Bars", icon: BarChart3 },
  { id: "list", label: "List", icon: ListIcon },
];

const ViewToggle = ({ value, onChange }) => (
  <div
    className="flex items-center rounded-lg p-0.5 flex-shrink-0"
    style={{ backgroundColor: "var(--dashboard-card-bg2)" }}
  >
    {BREAKDOWN_VIEWS.map(({ id, label, icon: Icon }) => {
      const active = value === id;
      return (
        <button
          key={id}
          type="button"
          title={label}
          aria-pressed={active}
          onClick={() => onChange(id)}
          className="flex items-center justify-center rounded-md"
          style={{
            width: 24,
            height: 20,
            border: "none",
            cursor: "pointer",
            color: active ? "#0C79F7" : "var(--dashboard-text-secondary)",
            backgroundColor: active ? "var(--dashboard-card-bg)" : "transparent",
            boxShadow: active ? "0 1px 2px rgba(15, 23, 42, 0.12)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Icon size={12} strokeWidth={2.25} />
        </button>
      );
    })}
  </div>
);

const BreakdownDonut = ({ items, total }) => {
  const { hrefFor, go } = useWidgetLinks();
  const [activeIndex, setActiveIndex] = useState(null);
  const active = activeIndex != null ? items[activeIndex] : null;
  const pieData = total > 0 ? items : [{ name: "Empty", value: 1, color: "var(--dashboard-border)" }];
  const pctOf = (value) => (total ? Math.round((value / total) * 100) : 0);

  return (
    <div className="flex h-full min-h-0 gap-3 items-center overflow-hidden">
      <div
        className="relative flex-shrink-0 h-full"
        style={{ width: "40%", maxWidth: 220, minWidth: 110 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="88%"
              paddingAngle={total > 0 && items.filter((i) => i.value > 0).length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="none"
              isAnimationActive
              onMouseLeave={() => setActiveIndex(null)}
              onMouseEnter={(_, index) => total > 0 && setActiveIndex(index)}
              onClick={(_, index, event) => total > 0 && go(event, hrefFor(items[index]))}
              style={{ cursor: total > 0 ? "pointer" : "default" }}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  opacity={activeIndex == null || activeIndex === index ? 1 : 0.28}
                  style={{ transition: "opacity 0.2s ease", outline: "none" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", padding: "0 18%" }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: active ? active.color : "var(--dashboard-text-primary)",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {(active ? active.value : total).toLocaleString("en-US")}
          </div>
          <div
            className="truncate w-full"
            style={{ fontSize: 9.5, color: "var(--dashboard-text-secondary)", marginTop: 3, fontWeight: 600 }}
          >
            {active ? `${active.name} · ${pctOf(active.value)}%` : "Total"}
          </div>
        </div>
      </div>
      <div
        className="flex-1 min-w-0 max-h-full overflow-auto grid gap-x-3 gap-y-1 content-start"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
      >
        {items.map((item, index) => {
          const pct = pctOf(item.value);
          const dimmed = activeIndex != null && activeIndex !== index;
          return (
            <DashLink
              to={hrefFor(item)}
              key={item.name}
              onMouseEnter={() => total > 0 && setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className="ud-row block rounded-lg px-2 py-1 min-w-0"
              style={{ opacity: dimmed ? 0.45 : 1, transition: "opacity 0.2s ease" }}
            >
              <div className="flex items-center justify-between gap-2" style={{ fontSize: 11, lineHeight: 1.3 }}>
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: item.color, flexShrink: 0 }}
                  />
                  <span className="truncate" title={item.name} style={{ color: "var(--dashboard-text-primary)", fontWeight: 600 }}>
                    {item.name}
                  </span>
                </span>
                <span className="flex-shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <b style={{ color: "var(--dashboard-text-primary)" }}>{item.value.toLocaleString("en-US")}</b>
                  <span style={{ marginLeft: 4, fontSize: 10, color: "var(--dashboard-text-secondary)" }}>{pct}%</span>
                </span>
              </div>
              <div style={{ height: 3, marginTop: 3, borderRadius: 999, backgroundColor: "var(--dashboard-card-bg2)" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: item.color,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </DashLink>
          );
        })}
      </div>
    </div>
  );
};

const BreakdownBars = ({ items, total }) => {
  const { hrefFor, go } = useWidgetLinks();
  const onBarClick = (entry, _index, event) => go(event, hrefFor(entry?.payload || entry));
  const horizontal = items.length > 5;
  const data = items.map((item) => ({
    ...item,
    pct: total ? Math.round((item.value / total) * 100) : 0,
  }));
  const barTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div style={{ ...tooltipStyle, padding: "6px 10px" }}>
        <div className="flex items-center gap-1.5" style={{ fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: item.color }} />
          {item.name}
        </div>
        <div style={{ color: "var(--dashboard-text-secondary)", marginTop: 2 }}>
          {item.value.toLocaleString("en-US")} · {item.pct}%
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {horizontal ? (
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 44, left: 0, bottom: 2 }} barCategoryGap="22%">
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={118}
            axisLine={false}
            tickLine={false}
            tick={{ ...axisTick, fontSize: 10, fill: "var(--dashboard-text-primary)" }}
          />
          <Tooltip content={barTooltip} cursor={tooltipCursor} />
          <Bar
            dataKey="value"
            radius={[0, 6, 6, 0]}
            maxBarSize={16}
            background={{ fill: "var(--dashboard-card-bg2)", radius: 6 }}
            onClick={onBarClick}
            style={{ cursor: "pointer" }}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value) => Number(value).toLocaleString("en-US")}
              style={{ fontSize: 10, fontWeight: 700, fill: "var(--dashboard-text-primary)" }}
            />
          </Bar>
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ top: 18, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
          <XAxis
            dataKey="name"
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={{ ...axisTick, fontSize: 10 }}
          />
          <YAxis hide />
          <Tooltip content={barTooltip} cursor={tooltipCursor} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44} onClick={onBarClick} style={{ cursor: "pointer" }}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(value) => Number(value).toLocaleString("en-US")}
              style={{ fontSize: 10, fontWeight: 700, fill: "var(--dashboard-text-primary)" }}
            />
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  );
};

const BreakdownList = ({ items, total }) => {
  const { hrefFor } = useWidgetLinks();
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="flex flex-col gap-1 h-full min-h-0 overflow-auto px-1">
      {items.map((item) => {
        const pct = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <DashLink key={item.name} to={hrefFor(item)} className="ud-row block flex-shrink-0 rounded-md px-1 py-0.5">
            <div className="flex items-center justify-between gap-2" style={{ fontSize: 11, lineHeight: 1.3 }}>
              <span className="flex items-center gap-1.5 min-w-0">
                <span style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: item.color, flexShrink: 0 }} />
                <span className="truncate" style={{ color: "var(--dashboard-text-primary)", fontWeight: 600 }}>
                  {item.name}
                </span>
              </span>
              <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", color: "var(--dashboard-text-secondary)" }}>
                <b style={{ color: "var(--dashboard-text-primary)" }}>{item.value.toLocaleString("en-US")}</b>
                <span style={{ marginLeft: 6, fontSize: 10 }}>{pct}%</span>
              </span>
            </div>
            <div
              style={{
                height: 6,
                marginTop: 3,
                borderRadius: 999,
                backgroundColor: "var(--dashboard-card-bg2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(item.value / max) * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${item.color}B3, ${item.color})`,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </DashLink>
        );
      })}
    </div>
  );
};

/** Status breakdown with a per-widget Donut / Bars / List switch. */
export const BreakdownWidget = ({ widgetId, pack }) => {
  const { hrefFor } = useWidgetLinks();
  const items = [...(pack?.items || [])].sort((a, b) => b.value - a.value);
  const total = pack?.total ?? items.reduce((sum, item) => sum + item.value, 0);
  const userId = useSelector((state) => state?.userData?.userDetails?.id);
  const [view, setView] = useState(() => readViewPref(widgetId, userId) || "donut");

  if (!items.length) return <EmptyBody label="No statuses yet." />;

  const changeView = (next) => {
    setView(next);
    writeViewPref(widgetId, next, userId);
  };
  const top = items[0];
  const topPct = total ? Math.round((top.value / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0 gap-1.5">
      <div className="flex items-center justify-between gap-2 flex-shrink-0 px-1">
        <div className="flex items-center gap-1.5 min-w-0" style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)" }}>
          {total > 0 ? (
            <>
              <span
                className="rounded-full px-1.5 py-px flex-shrink-0"
                style={{ fontSize: 9.5, fontWeight: 700, color: top.color, backgroundColor: `${top.color}1F` }}
              >
                {topPct}%
              </span>
              <span className="truncate">
                Mostly <b style={{ color: "var(--dashboard-text-primary)" }}>{top.name}</b>
              </span>
            </>
          ) : (
            <span>No records yet</span>
          )}
        </div>
        <ViewToggle value={view} onChange={changeView} />
      </div>
      {total > 0 && (
        <div className="flex flex-shrink-0 mx-1 overflow-hidden" style={{ height: 6, borderRadius: 999, gap: 2 }}>
          {items
            .filter((item) => item.value > 0)
            .map((item) => (
              <DashLink
                key={item.name}
                to={hrefFor(item)}
                title={`${item.name}: ${item.value}`}
                style={{ flex: item.value, backgroundColor: item.color, minWidth: 3 }}
              />
            ))}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {view === "bars" ? (
          <BreakdownBars items={items} total={total} />
        ) : view === "list" ? (
          <BreakdownList items={items} total={total} />
        ) : (
          <BreakdownDonut items={items} total={total} />
        )}
      </div>
    </div>
  );
};

export const BarsWidget = ({ items }) => {
  const useHorizontal = items.length > 4;
  if (useHorizontal) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={items}
          layout="vertical"
          margin={{ top: 2, right: 8, left: 4, bottom: 2 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--dashboard-border)" horizontal={false} />
          <XAxis axisLine={false} tickLine={false} type="number" tick={axisTick} />
          <YAxis axisLine={false} tickLine={false} type="category" dataKey="name" width={72} tick={axisTick} />
          <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={10}>
            {items.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={items} margin={{ top: 4, right: 4, left: -22, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--dashboard-border)" vertical={false} />
        <XAxis axisLine={false} tickLine={false} dataKey="name" tick={axisTick} interval={0} />
        <YAxis axisLine={false} tickLine={false} tick={axisTick} />
        <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {items.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const LineWidget = ({ series, compare }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={series} margin={{ top: 4, right: 6, left: -22, bottom: compare ? 2 : 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--dashboard-border)" vertical={false} />
      <XAxis axisLine={false} tickLine={false} dataKey="month" tick={axisTick} />
      <YAxis axisLine={false} tickLine={false} tick={axisTick} />
      <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
      {compare && (
        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 0 }} iconType="circle" iconSize={7} />
      )}
      <Line type="monotone" dataKey="value" name="This year" stroke="#0C79F7" strokeWidth={2} dot={false} />
      {compare && (
        <Line
          type="monotone"
          dataKey="prev"
          name="Last year"
          stroke="#94A3B8"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      )}
    </LineChart>
  </ResponsiveContainer>
);

export const FunnelWidget = ({ items }) => {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col justify-evenly h-full min-h-0 overflow-hidden px-0.5 gap-0.5">
      {items.map((item) => (
        <div key={item.name} className="min-w-0 flex-shrink-0">
          <div className="flex justify-between mb-0.5 gap-1" style={{ fontSize: 10.5, lineHeight: 1.2 }}>
            <span className="truncate" style={{ color: "var(--dashboard-text-secondary)" }}>
              {item.name}
            </span>
            <b style={{ color: "var(--dashboard-text-primary)", flexShrink: 0 }}>{item.value}</b>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              backgroundColor: "var(--dashboard-card-bg2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(item.value / max) * 100}%`,
                height: "100%",
                borderRadius: 999,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ComboSalesWidget = ({ series, compare }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={series} margin={{ top: 4, right: 6, left: -22, bottom: 2 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--dashboard-border)" vertical={false} />
      <XAxis axisLine={false} tickLine={false} dataKey="month" tick={axisTick} />
      <YAxis axisLine={false} tickLine={false} tick={axisTick} />
      <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
      <Legend wrapperStyle={{ fontSize: 9 }} iconType="circle" iconSize={7} />
      <Bar dataKey="leads" name="Leads" fill="#00ACC1" radius={[2, 2, 0, 0]} />
      <Bar dataKey="opportunities" name="Opps" fill="#7E57C2" radius={[2, 2, 0, 0]} />
      <Line type="monotone" dataKey="orders" name="Orders" stroke="#26A69A" strokeWidth={2} dot={false} />
      {compare && (
        <Line
          type="monotone"
          dataKey="lastOrders"
          name="Orders LY"
          stroke="#94A3B8"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      )}
    </ComposedChart>
  </ResponsiveContainer>
);

export const ComboMoneyWidget = ({ series, compare }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={series} margin={{ top: 4, right: 6, left: -12, bottom: 2 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--dashboard-border)" vertical={false} />
      <XAxis axisLine={false} tickLine={false} dataKey="month" tick={axisTick} />
      <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(v) =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(v)
        }
      />
      <Legend wrapperStyle={{ fontSize: 9 }} iconType="circle" iconSize={7} />
      <Bar dataKey="revenue" name="Revenue" fill="#5C6BC0" radius={[2, 2, 0, 0]} />
      <Bar dataKey="expenses" name="Expenses" fill="#26A69A" radius={[2, 2, 0, 0]} />
      {compare && (
        <Line
          type="monotone"
          dataKey="lastRevenue"
          name="Revenue LY"
          stroke="#94A3B8"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      )}
    </ComposedChart>
  </ResponsiveContainer>
);

export const StackedBarsWidget = ({ items, series }) => {
  const { hrefFor, go } = useWidgetLinks();
  if (!items?.length) {
    return (
      <EmptyBody label="No chart data yet." />
    );
  }

  const horizontal = items.length > 5;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={items}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={horizontal ? { top: 2, right: 8, left: 4, bottom: 2 } : { top: 4, right: 4, left: -22, bottom: 2 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--dashboard-border)" vertical={false} />
        {horizontal ? (
          <>
            <XAxis axisLine={false} tickLine={false} type="number" tick={axisTick} />
            <YAxis axisLine={false} tickLine={false} type="category" dataKey="name" width={72} tick={axisTick} />
          </>
        ) : (
          <>
            <XAxis axisLine={false} tickLine={false} dataKey="name" tick={axisTick} interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
        <Legend wrapperStyle={{ fontSize: 9 }} iconType="circle" iconSize={7} />
        {(series || []).map((entry, index, list) => (
          <Bar
            key={entry.key}
            dataKey={entry.key}
            stackId="status"
            fill={entry.color}
            maxBarSize={18}
            radius={index === list.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
            onClick={(bar, _i, event) => go(event, hrefFor(bar?.payload || bar, entry.key))}
            style={{ cursor: "pointer" }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export const RankedListWidget = ({ items, emptyLabel = "Nothing to show yet." }) => {
  const { hrefFor } = useWidgetLinks();
  if (!items?.length) {
    return (
      <EmptyBody label={emptyLabel} />
    );
  }

  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);
  const hasValues = items.some((item) => item.value != null);

  return (
    <div className="flex flex-col gap-0.5 h-full min-h-0 overflow-auto">
      {items.map((item, index) => (
        <DashLink
          key={`${item.label}-${index}`}
          to={hrefFor(item)}
          className="ud-row flex items-center gap-2 flex-shrink-0 rounded-lg px-1.5 py-1"
        >
          <span
            className="flex-shrink-0 text-center"
            style={{
              width: 16,
              fontSize: 10,
              fontWeight: 800,
              color: index < 3 && hasValues ? "#0C79F7" : "var(--dashboard-text-secondary)",
            }}
          >
            {index + 1}
          </span>
          <Avatar name={item.label} src={item.imageUrl} size={26} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span
                className="truncate"
                style={{ fontSize: 11.5, fontWeight: 600, color: "var(--dashboard-text-primary)" }}
              >
                {item.label}
              </span>
              {item.value != null && (
                <b style={{ fontSize: 12, color: "var(--dashboard-text-primary)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {item.value}
                </b>
              )}
            </span>
            {item.sub ? (
              <span className="block truncate" style={{ fontSize: 10, color: "var(--dashboard-text-secondary)" }}>
                {item.sub}
              </span>
            ) : null}
            {item.value != null && (
              <span
                className="block"
                style={{ height: 3, marginTop: 3, borderRadius: 999, backgroundColor: "var(--dashboard-card-bg2)" }}
              >
                <span
                  className="block"
                  style={{
                    width: `${((Number(item.value) || 0) / max) * 100}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: "#0C79F7",
                  }}
                />
              </span>
            )}
          </span>
        </DashLink>
      ))}
    </div>
  );
};

export const ChatListWidget = ({ items }) => {
  const { hrefFor } = useWidgetLinks();
  if (!items?.length) {
    return (
      <EmptyBody label="No recent chats." />
    );
  }

  return (
    <div className="flex flex-col gap-0.5 h-full min-h-0 overflow-auto">
      {items.map((item, index) => (
        <DashLink
          key={`${item.label}-${index}`}
          to={hrefFor(item)}
          className="ud-row flex items-center justify-between gap-2 flex-shrink-0 rounded-lg px-1.5 py-1.5"
        >
          <Avatar name={item.label} src={item.imageUrl} size={32} />
          <span className="min-w-0 flex-1">
            <span
              className="block truncate"
              style={{
                fontSize: 12,
                fontWeight: item.unread > 0 ? 700 : 600,
                color: "var(--dashboard-text-primary)",
              }}
            >
              {item.label}
            </span>
            {item.preview ? (
              <span
                className="block truncate"
                style={{
                  fontSize: 10.5,
                  color: item.unread > 0 ? "var(--dashboard-text-primary)" : "var(--dashboard-text-secondary)",
                  opacity: item.unread > 0 ? 0.85 : 1,
                }}
              >
                {item.preview}
              </span>
            ) : null}
          </span>
          {item.unread > 0 && (
            <span
              style={{
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                backgroundColor: "#0C79F7",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                flexShrink: 0,
              }}
            >
              {item.unread}
            </span>
          )}
        </DashLink>
      ))}
    </div>
  );
};

export const InsightsWidget = ({ sections }) => {
  const rows = sections || [];
  if (!rows.length) {
    return (
      <EmptyBody label="No project insights yet." />
    );
  }

  return (
    <div
      className="grid h-full min-h-0 gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.min(rows.length, 3)}, minmax(0, 1fr))` }}
    >
      {rows.map((section) => (
        <div key={section.title} className="min-w-0 min-h-0 overflow-auto">
          <DashLink
            to={section.route ? `/home/${section.route}` : null}
            className="inline-block"
            style={{ fontSize: 11, fontWeight: 700, color: "#0C79F7", marginBottom: 6 }}
          >
            {section.title}
          </DashLink>
          {section.items.map((item) => (
            <div key={`${section.title}-${item.label}`} className="flex items-center justify-between gap-1 mb-1">
              <span className="truncate" style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)" }}>
                {item.label}
              </span>
              <b style={{ fontSize: 11, color: item.color || "var(--dashboard-text-primary)", flexShrink: 0 }}>
                {item.value}
              </b>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const SCHEDULE_TONES = {
  meeting: { color: "#0059F5", label: "Meeting" },
  task: { color: "#D07E0B", label: "Task" },
};

export const ScheduleWidget = ({ items }) => {
  const { hrefFor } = useWidgetLinks();
  if (!items?.length) return <EmptyBody label="Clear day — no meetings or tasks." />;

  return (
    <div className="flex flex-col gap-0.5 h-full min-h-0 overflow-auto">
      {items.map((item) => {
        const tone = SCHEDULE_TONES[item.kind] || SCHEDULE_TONES.task;
        return (
          <DashLink
            key={`${item.kind}-${item.id}`}
            to={hrefFor(item)}
            state={item.linkState}
            className="ud-row flex items-center gap-2.5 flex-shrink-0 rounded-lg px-1.5 py-1.5"
          >
            <span
              className="flex-shrink-0 text-center rounded-md"
              style={{
                width: 58,
                padding: "4px 0",
                fontSize: 10.5,
                fontWeight: 700,
                color: tone.color,
                backgroundColor: `${tone.color}14`,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {item.time}
            </span>
            <span
              className="flex-shrink-0 self-stretch rounded-full"
              style={{ width: 3, backgroundColor: tone.color }}
            />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate"
                title={item.title}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--dashboard-text-primary)" }}
              >
                {item.title}
              </span>
              <span
                className="block truncate"
                style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)", textTransform: "none" }}
              >
                {item.sub || tone.label}
              </span>
            </span>
          </DashLink>
        );
      })}
    </div>
  );
};

/** One card height for every widget, so cards sitting side by side always line up. */
const WIDGET_HEIGHT = 272;

export function widgetMinHeight(widget) {
  if (widget.type === "kpiRow") return 118;
  return WIDGET_HEIGHT;
}

const WidgetCard = ({ widget, period, liveOverride, liveLoading }) => {
  const compare = period === "yoy";
  const dataKey = period === "lastYear" ? "lastYear" : "thisYear";
  const data =
    liveOverride !== undefined
      ? liveOverride
      : widget.data?.[dataKey] ?? widget.data?.thisYear;
  const navigate = useNavigate();
  const links = useMemo(
    () => ({
      hrefFor: (item, seriesKey) => itemHref(widget, item, seriesKey),
      go: (event, href) => followHref(event, href, navigate),
    }),
    [widget, navigate],
  );

  let body = null;
  if (liveLoading && widget.type !== "kpiRow") {
    body = <LoadingBody />;
  } else {
    switch (widget.type) {
    case "kpiRow":
      body = (
        <KpiRowWidget
          items={data || []}
          loading={liveLoading}
        />
      );
      break;
    case "statGrid":
      body = <StatGridWidget items={data || []} />;
      break;
    case "donut":
    case "statusList":
      body = <BreakdownWidget widgetId={widget.id} pack={data || { total: 0, items: [] }} />;
      break;
    case "bars":
      body = <BarsWidget items={data || []} />;
      break;
    case "line":
      body = <LineWidget series={data || []} compare={compare} />;
      break;
    case "funnel":
      body = <FunnelWidget items={data || []} />;
      break;
    case "combo":
      body = <ComboSalesWidget series={data || []} compare={compare} />;
      break;
    case "comboMoney":
      body = <ComboMoneyWidget series={data || []} compare={compare} />;
      break;
    case "stackedBars":
      body = <StackedBarsWidget items={data || []} series={widget.series} />;
      break;
    case "rankedList":
      body = <RankedListWidget items={data || []} emptyLabel={widget.emptyLabel} />;
      break;
    case "chatList":
      body = <ChatListWidget items={data || []} />;
      break;
    case "insights":
      body = <InsightsWidget sections={data || []} />;
      break;
    case "schedule":
      body = <ScheduleWidget items={data || []} />;
      break;
    default:
      body = null;
    }
  }

  return (
    <LinkContext.Provider value={links}>
      <WidgetShell title={widget.name} subtitle={widget.subtitle} group={widget.group} openHref={widgetHref(widget)}>
        {body}
      </WidgetShell>
    </LinkContext.Provider>
  );
};

export default WidgetCard;
