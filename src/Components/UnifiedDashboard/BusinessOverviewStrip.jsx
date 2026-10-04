import { Link } from "react-router-dom";
import { itemHref } from "./dashboardLinks";
import { CalendarRange, CheckCircle2, Hourglass, Ticket, ArrowUpRight } from "lucide-react";

const PLACEHOLDERS = [
  { id: "totalTickets", label: "Total Tickets", value: "…", tint: "#0C79F7", sub: "Loading…", route: "agentsTickets" },
  { id: "pendingTickets", label: "Pending Tickets", value: "…", tint: "#D07E0B", sub: "Loading…", route: "agentsTickets" },
  { id: "completedTickets", label: "Completed Tickets", value: "…", tint: "#4AC411", sub: "Loading…", route: "agentsTickets" },
  { id: "currentMonthTickets", label: "This Month", value: "…", tint: "#0C79F7", sub: "Loading…", route: "agentsTickets" },
];

const ICONS = {
  totalTickets: Ticket,
  pendingTickets: Hourglass,
  completedTickets: CheckCircle2,
  currentMonthTickets: CalendarRange,
};

const Tile = ({ to, children, ...rest }) =>
  to ? (
    <Link to={to} style={{ color: "inherit", textDecoration: "none" }} {...rest}>
      {children}
    </Link>
  ) : (
    <div {...rest}>{children}</div>
  );

const BusinessOverviewStrip = ({ items, loading, error }) => {
  const rows = items?.length ? items : PLACEHOLDERS;
  const total = Number(rows.find((item) => item.id === "totalTickets")?.value) || 0;

  return (
    <div className="w-full" style={{ flex: "1 1 100%" }}>
      <div className="flex items-baseline gap-2 mb-1.5 px-0.5">
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>
          Ticket Summary
        </span>
        <span style={{ fontSize: 10.5, color: error ? "#DC2626" : "var(--dashboard-text-secondary)" }}>
          {error || (loading ? "Loading ticket summary…" : "Total · Pending · Completed · This month")}
        </span>
      </div>
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
      >
        {rows.map((item) => {
          const tint = item.tint || "#0C79F7";
          const Icon = ICONS[item.id] || Ticket;
          const value = Number(item.value);
          const share =
            item.id === "totalTickets"
              ? 100
              : total && Number.isFinite(value)
                ? Math.min(100, Math.round((value / total) * 100))
                : null;
          return (
            <Tile
              key={item.id}
              to={item.route && !loading ? itemHref({ id: "overview" }, item) : null}
              className={`ud-card ud-tile rounded-2xl p-3 text-left min-w-0 relative overflow-hidden block ${item.route ? "ud-clickable" : ""}`}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  right: -28,
                  top: -28,
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  backgroundColor: `${tint}14`,
                }}
              />
              <div className="flex items-start justify-between gap-2 relative">
                <span
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width: 36, height: 36, backgroundColor: `${tint}1F`, color: tint }}
                >
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                {item.route && (
                  <ArrowUpRight size={15} style={{ color: "var(--dashboard-text-secondary)", opacity: 0.7 }} />
                )}
              </div>
              <div
                className="truncate mt-2.5 relative"
                title={item.label}
                style={{ fontSize: 11.5, fontWeight: 600, color: "var(--dashboard-text-secondary)" }}
              >
                {item.label}
              </div>
              <div className="flex items-baseline gap-2 relative">
                {loading ? (
                  <div className="ud-skeleton" style={{ width: 60, height: 24, marginTop: 4 }} />
                ) : (
                  <span
                    className="truncate"
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "var(--dashboard-text-primary)",
                      lineHeight: 1.2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {typeof item.value === "number" ? item.value.toLocaleString("en-US") : item.value}
                  </span>
                )}
                {!loading && share != null && item.id !== "totalTickets" && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: tint }}>{share}%</span>
                )}
              </div>
              {item.sub && (
                <div
                  className="truncate relative"
                  style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)" }}
                >
                  {item.sub}
                </div>
              )}
              <div
                className="relative"
                style={{ height: 4, marginTop: 10, borderRadius: 999, backgroundColor: `${tint}22` }}
              >
                <div
                  style={{
                    width: `${share ?? 70}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: tint,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </Tile>
          );
        })}
      </div>
    </div>
  );
};

export default BusinessOverviewStrip;
