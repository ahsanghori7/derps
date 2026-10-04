// Two-tone progress ring with % in the center — used as the primary visual on each module tile.
const GaugeRing = ({ pct = 0, color = "#0C79F7", size = 36, strokeWidth = 4, onClick }) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--dashboard-card-bg2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.45s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(10, size * 0.26),
          fontWeight: 700,
          color: "var(--dashboard-text-primary)",
          pointerEvents: "none",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {clamped}%
      </div>
    </div>
  );
};

export default GaugeRing;
