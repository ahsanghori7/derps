import React from "react";
import Spinner from "../Spinner";

const Loader = ({
  fullscreen = false,
  message = "Loading...",
  subMessage,
  size = "w-10 h-10",
  showSpinner = true,
  showBar = true,
  className = "",
}) => {
  const containerClass = fullscreen
    ? "fixed inset-0 z-[3000]"
    : "w-full";

  return (
    <div className={containerClass}>
      <div
        className={`flex items-center justify-center ${fullscreen ? "w-screen h-screen" : "w-full"} ${className}`}
        style={{
          backgroundColor: fullscreen ? "rgba(0,0,0,0.18)" : "transparent",
          backdropFilter: fullscreen ? "blur(6px)" : undefined,
        }}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{
            background:
              "radial-gradient(1100px 320px at 50% -35%, rgba(67,121,238,0.22) 0%, rgba(67,121,238,0.00) 60%), var(--dashboard-tab-box)",
            border: "1px solid rgba(67,121,238,0.18)",
            borderRadius: 14,
            padding: "18px 18px",
            minWidth: 240,
            boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
          }}
        >
          <div className="flex items-center gap-3">
            {showSpinner && <Spinner size={size} />}
            <div className="min-w-0">
              <div
                className="text-[14px] font-semibold truncate"
                style={{ color: "var(--dashboard-text-primary)" }}
              >
                {message}
              </div>
              {subMessage ? (
                <div
                  className="text-[12px] truncate"
                  style={{ color: "var(--dashboard-text-primary)", opacity: 0.7 }}
                >
                  {subMessage}
                </div>
              ) : null}
            </div>
          </div>

          {showBar ? (
            <div className="mt-4 w-full">
              <div
                className="h-[8px] w-full rounded-full overflow-hidden"
                style={{
                  backgroundColor: "rgba(67,121,238,0.10)",
                  border: "1px solid rgba(67,121,238,0.14)",
                }}
              >
                <div
                  className="h-full animate-pulse"
                  style={{
                    width: "55%",
                    background:
                      "linear-gradient(90deg, rgba(67,121,238,0.10) 0%, rgba(67,121,238,0.55) 50%, rgba(67,121,238,0.10) 100%)",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Loader;
