/* eslint-disable react/prop-types */
import React from "react";
import { useLocation } from "react-router-dom";
import { isChunkLoadError, recoverFromChunkError } from "../../Utils/lazyWithRetry";
import Loader from "../Loader";

class ChunkErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, autoReloading: false };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      autoReloading: isChunkLoadError(error),
    };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && !recoverFromChunkError()) {
      this.setState({ autoReloading: false });
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, autoReloading: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (isChunkLoadError(this.state.error) && this.state.autoReloading) {
      return (
        <Loader
          fullscreen
          message="Refreshing..."
          subMessage="Loading the latest version"
        />
      );
    }

    return (
      <div
        style={{
          minHeight: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--dashboard-text-primary)",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.75,
              color: "var(--dashboard-text-primary)",
              marginBottom: 16,
            }}
          >
            Please reload the page and try again.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "var(--sidebarNew-border, #4379ee)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

const ChunkErrorBoundary = ({ children }) => {
  const location = useLocation();
  return (
    <ChunkErrorBoundaryInner resetKey={`${location.pathname}${location.search}`}>
      {children}
    </ChunkErrorBoundaryInner>
  );
};

export default ChunkErrorBoundary;
