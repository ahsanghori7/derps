import { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import {
  TARGET_PAGE_WIDTH,
  fetchPdfBytes,
  renderPdfPages,
} from "./pdfHelpers";
import { fileUrlToDisplay, normalizeSignaturePlacements } from "./utils";

const SignedDocumentPreview = ({
  fileUrl,
  placements,
  accessToken,
  signatureUrl,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const pdfUrl = fileUrlToDisplay(fileUrl);
  const boxes = useMemo(
    () => normalizeSignaturePlacements(placements),
    [placements]
  );

  useEffect(() => {
    if (!pdfUrl) {
      setPages([]);
      setError("");
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const bytes = await fetchPdfBytes(fileUrl, accessToken);
        const nextPages = await renderPdfPages(bytes);
        if (!cancelled) setPages(nextPages);
      } catch {
        if (!cancelled) {
          setPages([]);
          setError("Could not preview this PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, fileUrl, accessToken]);

  if (!pdfUrl) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {loading ? (
        <div
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: 180,
            gap: 8,
          }}
        >
          <CircularProgress size={24} />
          <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
            Loading document…
          </p>
        </div>
      ) : error ? (
        <p style={{ margin: 0, color: "#EF3826", fontSize: 13 }}>{error}</p>
      ) : (
        <div
          style={{
            maxHeight: 640,
            overflow: "auto",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: 12,
            background: "#F8FAFC",
          }}
        >
          {pages.map((page) => {
            const pageBoxes = boxes.filter(
              (box) => box.pageIndex === page.pageIndex
            );
            return (
              <div key={page.pageIndex} style={{ marginBottom: 16 }}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748B",
                  }}
                >
                  Page {page.pageIndex + 1}
                </p>
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "100%",
                    maxWidth: TARGET_PAGE_WIDTH,
                    border: "1px solid #E2E8F0",
                    borderRadius: 6,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <img
                    src={page.src}
                    alt={`Page ${page.pageIndex + 1}`}
                    style={{ width: "100%", display: "block" }}
                  />
                  {pageBoxes.map((box, index) => {
                    const boxStyle = {
                      position: "absolute",
                      left: `${(box.x / page.widthPt) * 100}%`,
                      top: `${(box.y / page.heightPt) * 100}%`,
                      width: `${(box.width / page.widthPt) * 100}%`,
                      height: `${(box.height / page.heightPt) * 100}%`,
                      pointerEvents: "none",
                    };
                    if (signatureUrl) {
                      return (
                        <img
                          key={box.id || `${box.pageIndex}-${index}`}
                          src={signatureUrl}
                          alt=""
                          style={{
                            ...boxStyle,
                            objectFit: "contain",
                            background: "rgba(255,255,255,0.65)",
                          }}
                        />
                      );
                    }
                    return (
                      <div
                        key={box.id || `${box.pageIndex}-${index}`}
                        style={{
                          ...boxStyle,
                          border: "2px dashed #0C79F7",
                          background: "rgba(12, 121, 247, 0.14)",
                          boxSizing: "border-box",
                          borderRadius: 3,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SignedDocumentPreview;
