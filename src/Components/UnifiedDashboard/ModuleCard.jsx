import { useMemo } from "react";
import Spinner from "../Spinner";
import GaugeRing from "./GaugeRing";
import { STATUS_COLORS } from "./statusColors";

const POSITIVE_KEYS = new Set([
  "completed",
  "paid",
  "delivered",
  "converted",
  "closed_won",
  "approved",
  "accepted",
  "received",
]);

const ModuleCard = ({ moduleDef, state, data, error, onOpen }) => {
  const accentColor = useMemo(() => {
    if (typeof window === "undefined") return "#0059F5";
    return (
      getComputedStyle(document.documentElement).getPropertyValue(moduleDef.accentVar).trim() ||
      "#0059F5"
    );
  }, [moduleDef.accentVar]);

  const items = data?.items || [];
  const chartItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        color: STATUS_COLORS[item.statusKey] || accentColor,
      })),
    [items, accentColor],
  );

  const primaryItem =
    items.find((i) => i.statusKey === moduleDef.primaryStatusKey) ||
    items.find((i) => POSITIVE_KEYS.has(i.statusKey));
  const pct =
    data?.total && primaryItem ? Math.round((primaryItem.value / data.total) * 100) : 0;
  const primaryLabel = primaryItem?.label || "Rate";

  const total = chartItems.reduce((sum, d) => sum + (d.value || 0), 0);
  const nonZero = chartItems.filter((d) => d.value > 0);
  const legendItems = chartItems.slice(0, 4);

  if (state === "loading") {
    return (
      <div
        className="rounded-xl h-full flex flex-col items-center justify-center gap-2"
        style={{
          backgroundColor: "var(--dashboard-card-bg)",
          border: "1px solid var(--dashboard-border)",
        }}
      >
        <Spinner size="w-5 h-5" />
        <span style={{ fontSize: 11, color: "var(--dashboard-text-secondary)" }}>
          {moduleDef.name}
        </span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className="rounded-xl h-full flex flex-col justify-center px-3"
        style={{
          backgroundColor: "var(--dashboard-card-bg)",
          border: "1px solid var(--dashboard-border)",
        }}
        title={error?.message || ""}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>
          {moduleDef.name}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)", marginTop: 4 }}>
          Couldn&apos;t load stats
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl h-full flex flex-col cursor-pointer overflow-hidden transition-shadow"
      style={{
        backgroundColor: "var(--dashboard-card-bg)",
        border: "1px solid var(--dashboard-border)",
      }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen?.()}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${accentColor}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--dashboard-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        className="px-2.5 py-1 flex items-center justify-between gap-2 flex-shrink-0"
        style={{
          backgroundColor: "var(--dashboard-card-bg2)",
          borderBottom: "1px solid var(--dashboard-border)",
        }}
      >
        <span
          className="truncate"
          style={{ fontSize: 11, fontWeight: 700, color: "var(--dashboard-text-primary)" }}
        >
          {moduleDef.name}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: accentColor,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {data?.total ?? 0}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-2 py-1 min-h-0">
        <GaugeRing pct={pct} color={accentColor} size={56} strokeWidth={5.5} />
        <div
          className="truncate w-full"
          style={{
            fontSize: 9,
            color: "var(--dashboard-text-secondary)",
            marginTop: 2,
            textAlign: "center",
          }}
          title={
            data?.secondaryStat
              ? `${primaryLabel} · ${data.secondaryStat.value}`
              : primaryLabel
          }
        >
          {primaryLabel}
          {data?.secondaryStat ? ` · ${data.secondaryStat.value}` : ""}
        </div>

        {total > 0 && (
          <div
            className="flex overflow-hidden w-full mt-1.5 flex-shrink-0"
            style={{
              height: 5,
              borderRadius: 999,
              backgroundColor: "var(--dashboard-card-bg2)",
            }}
          >
            {nonZero.map((d) => (
              <div
                key={d.statusKey || d.label}
                style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }}
                title={`${d.label}: ${d.value}`}
              />
            ))}
          </div>
        )}

        {legendItems.length > 0 && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 w-full mt-1 flex-shrink-0">
            {legendItems.map((d) => (
              <div
                key={d.statusKey || d.label}
                className="flex items-center justify-between gap-1 min-w-0"
                style={{ fontSize: 9, color: "var(--dashboard-text-secondary)" }}
              >
                <span className="flex items-center gap-1 truncate min-w-0">
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate">{d.label}</span>
                </span>
                <b
                  style={{
                    color: "var(--dashboard-text-primary)",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {d.value}
                </b>
              </div>
            ))}
          </div>
        )}

        {!data?.live && (
          <div style={{ fontSize: 9, color: "#F5A623", marginTop: 2 }}>Pending status data</div>
        )}
      </div>
    </div>
  );
};

export default ModuleCard;
