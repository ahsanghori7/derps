import { useSelector } from "react-redux";
import moment from "moment";
import { LogIn, Timer, CalendarDays } from "lucide-react";
import UnifiedDashboard from "../../Components/UnifiedDashboard";
import { useAttendanceClock } from "./useAttendanceClock";

const HIDDEN_CLOCK_ROLES = new Set(["admin", "human resource", "client"]);

function greetingFor(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const ClockChip = ({ icon: Icon, label, value, live }) => (
  <div
    className="flex items-center gap-2 rounded-xl px-3 py-1.5"
    style={{
      backgroundColor: "var(--dashboard-card-bg)",
      border: "1px solid var(--dashboard-border)",
    }}
  >
    <span
      className="flex items-center justify-center rounded-lg"
      style={{ width: 26, height: 26, backgroundColor: "rgba(12, 121, 247, 0.12)", color: "#0C79F7" }}
    >
      <Icon size={14} strokeWidth={2.25} />
    </span>
    <div className="leading-tight">
      <div style={{ fontSize: 10, color: "var(--dashboard-text-secondary)", fontWeight: 600 }}>
        {label}
      </div>
      <div
        className="flex items-center gap-1.5"
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dashboard-text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {live && (
          <span
            className="ud-pulse-dot"
            style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "#22C55E" }}
          />
        )}
        {value}
      </div>
    </div>
  </div>
);

const DashboardScreen = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const signinFlag = useSelector((state) => state.signinReducer.signin);
  const roleTitle = (userData?.roleTitle || "").toLowerCase();
  const showClock = !HIDDEN_CLOCK_ROLES.has(roleTitle);
  const { signInData, liveDuration } = useAttendanceClock({
    accessToken,
    userId: userData?.id,
    signinFlag,
  });
  const now = moment();
  const signedIn = Boolean(signInData?.lastSignIn);

  return (
    <div
      className="dashboard-fill flex flex-col overflow-hidden"
      style={{
        marginTop: -64,
        height: "calc(100vh - 64px - var(--company-switch-banner-offset, 0px))",
        maxHeight: "calc(100vh - 64px - var(--company-switch-banner-offset, 0px))",
        backgroundColor: "var(--dashboard-bg)",
        padding: "10px 4px 10px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 flex-wrap flex-shrink-0 px-3"
        style={{ minHeight: 48, marginBottom: 8 }}
      >
        <div className="min-w-0">
          <div
            className="flex items-center gap-1.5"
            style={{ fontSize: 11.5, color: "var(--dashboard-text-secondary)", fontWeight: 500 }}
          >
            <CalendarDays size={13} />
            {now.format("dddd, D MMMM YYYY")}
          </div>
          <h1
            className="truncate"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--sidebar-text-primary)",
              lineHeight: 1.25,
              margin: 0,
              letterSpacing: -0.2,
            }}
          >
            {greetingFor(now.hour())}
            {userData?.username ? `, ${userData.username}` : ""}
          </h1>
        </div>
        {showClock && (
          <div className="flex items-center gap-2 flex-wrap">
            <ClockChip
              icon={LogIn}
              label="Last login"
              value={signedIn ? moment(signInData.lastSignIn).format("hh:mm A") : "Not signed in today"}
            />
            <ClockChip icon={Timer} label="Duration" value={liveDuration} live={signedIn} />
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <UnifiedDashboard />
      </div>
    </div>
  );
};

export default DashboardScreen;
