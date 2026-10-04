import moment from "moment";
import Spinner from "../Spinner";

const formatTime = (value) => {
  if (!value) return null;
  const parsed = moment(value, "HH:mm:ss");
  return parsed.isValid() ? parsed.format("h:mm A") : null;
};

const MAX_VISIBLE = 4;

// Slim single-line strip — keeps the main module grid from overflowing the viewport.
const TodaySchedule = ({ state, data, error }) => {
  const meetings = data?.meetings || [];
  const tasks = data?.tasks || [];
  const combined = [
    ...meetings.map((m) => ({
      key: `meeting-${m.id}`,
      color: "#0C79F7",
      label: `${formatTime(m.startTime) ? `${formatTime(m.startTime)} — ` : ""}${m.title || "Untitled meeting"}`,
    })),
    ...tasks.map((t) => ({
      key: `task-${t.id}`,
      color: "#D07E0B",
      label: `${t.title || "Untitled task"} (due today)`,
    })),
  ];
  const isEmpty = combined.length === 0;
  const visible = combined.slice(0, MAX_VISIBLE);
  const extra = combined.length - visible.length;

  return (
    <div
      className="rounded-lg px-3 py-1.5 flex items-center gap-3 flex-wrap"
      style={{
        backgroundColor: "var(--dashboard-card-bg)",
        border: "1px solid var(--dashboard-border)",
        minHeight: 36,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--dashboard-text-primary)",
          flexShrink: 0,
        }}
      >
        Today
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--dashboard-text-secondary)",
          flexShrink: 0,
        }}
      >
        {moment().format("ddd, D MMM")}
      </span>

      {state === "loading" && <Spinner size="w-4 h-4" />}

      {state === "error" && (
        <span style={{ fontSize: 11, color: "var(--dashboard-text-secondary)" }}>
          Couldn&apos;t load schedule{error?.message ? `: ${error.message}` : "."}
        </span>
      )}

      {state === "success" && isEmpty && (
        <span style={{ fontSize: 11, color: "var(--dashboard-text-secondary)" }}>
          Clear day — no meetings or tasks.
        </span>
      )}

      {state === "success" &&
        !isEmpty &&
        visible.map((item) => (
          <span
            key={item.key}
            className="flex items-center gap-1.5 truncate"
            style={{ fontSize: 11, color: "var(--dashboard-text-secondary)", maxWidth: 220 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: item.color,
                flexShrink: 0,
              }}
            />
            <span className="truncate">{item.label}</span>
          </span>
        ))}

      {state === "success" && extra > 0 && (
        <span style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)" }}>+{extra} more</span>
      )}
    </div>
  );
};

export default TodaySchedule;
