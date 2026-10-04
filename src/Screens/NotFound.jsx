import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const isAuthenticated = Boolean(localStorage.getItem("accessToken"));
  const backHref = isAuthenticated ? "/home/dashboardScreen" : "/";
  const backText = isAuthenticated ? "Go to Dashboard" : "Go to Login";

  return (
    <div style={{
      display: "flex",
      minHeight: "60vh",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "2rem"
    }}>
      <div>
        <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem", color: "#0C79F7" }}>404</h1>
        <h2 style={{ marginBottom: "1rem", fontWeight: 600 }}>Page not found</h2>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          The page you are looking for doesn’t exist or has been moved.
        </p>
        <Link to={backHref} style={{
          display: "inline-block",
          background: "#0C79F7",
          color: "#fff",
          padding: "0.6rem 1rem",
          borderRadius: "8px",
          textDecoration: "none"
        }}>
          {backText}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
