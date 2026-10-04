import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "react-toastify";
import {
  DEFAULT_SIGNATURE_BOX,
  createSignaturePlacement,
  fileUrlToDisplay,
  normalizeSignaturePlacements,
  serializeSignaturePlacements,
} from "./utils";
import {
  TARGET_PAGE_WIDTH,
  fetchPdfBytes,
  isPdfBuffer,
  renderPdfPages,
} from "./pdfHelpers";

const MIN_BOX_WIDTH = 60;
const MIN_BOX_HEIGHT = 18;

const clampBox = (box, pageWidth, pageHeight) => {
  const width = Math.min(
    Math.max(box.width, MIN_BOX_WIDTH),
    Math.max(MIN_BOX_WIDTH, pageWidth)
  );
  const height = Math.min(
    Math.max(box.height, MIN_BOX_HEIGHT),
    Math.max(MIN_BOX_HEIGHT, pageHeight)
  );
  return {
    ...box,
    width,
    height,
    x: Math.min(Math.max(0, box.x), Math.max(0, pageWidth - width)),
    y: Math.min(Math.max(0, box.y), Math.max(0, pageHeight - height)),
  };
};

const PdfPage = ({
  page,
  boxes,
  selectedId,
  onSelect,
  onAdd,
  onChangeBox,
  onRemove,
}) => {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);

  const getPagePoint = (clientX, clientY) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * page.widthPt,
      y: ((clientY - rect.top) / rect.height) * page.heightPt,
    };
  };

  const handlePagePointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    if (dragRef.current) return;
    if (
      event.target !== wrapRef.current &&
      event.target?.dataset?.role !== "page"
    ) {
      return;
    }
    const point = getPagePoint(event.clientX, event.clientY);
    if (!point) return;
    onAdd(
      clampBox(
        createSignaturePlacement(
          page.pageIndex,
          point.x,
          point.y,
          DEFAULT_SIGNATURE_BOX
        ),
        page.widthPt,
        page.heightPt
      )
    );
  };

  const handleBoxPointerDown = (event, box) => {
    if (event.button != null && event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect(box.id);
    const point = getPagePoint(event.clientX, event.clientY);
    if (!point) return;
    dragRef.current = {
      type: "move",
      id: box.id,
      startX: point.x,
      startY: point.y,
      origX: box.x,
      origY: box.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleResizePointerDown = (event, box) => {
    if (event.button != null && event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect(box.id);
    const point = getPagePoint(event.clientX, event.clientY);
    if (!point) return;
    dragRef.current = {
      type: "resize",
      id: box.id,
      startX: point.x,
      startY: point.y,
      origWidth: box.width,
      origHeight: box.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = getPagePoint(event.clientX, event.clientY);
    if (!point) return;
    const box = boxes.find((item) => item.id === drag.id);
    if (!box) return;
    if (drag.type === "move") {
      onChangeBox(
        clampBox(
          {
            ...box,
            x: drag.origX + (point.x - drag.startX),
            y: drag.origY + (point.y - drag.startY),
          },
          page.widthPt,
          page.heightPt
        )
      );
      return;
    }
    onChangeBox(
      clampBox(
        {
          ...box,
          width: drag.origWidth + (point.x - drag.startX),
          height: drag.origHeight + (point.y - drag.startY),
        },
        page.widthPt,
        page.heightPt
      )
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          fontWeight: 700,
          color: "#64748B",
        }}
      >
        Page {page.pageIndex + 1}
      </p>
      <div
        ref={wrapRef}
        data-role="page"
        onPointerDown={handlePagePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          position: "relative",
          display: "inline-block",
          width: "100%",
          maxWidth: TARGET_PAGE_WIDTH,
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
          cursor: "crosshair",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <img
          data-role="page"
          src={page.src}
          alt={`Page ${page.pageIndex + 1}`}
          draggable={false}
          style={{
            width: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />
        {boxes.map((box) => {
          const selected = box.id === selectedId;
          return (
            <div
              key={box.id}
              onPointerDown={(event) => handleBoxPointerDown(event, box)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                position: "absolute",
                left: `${(box.x / page.widthPt) * 100}%`,
                top: `${(box.y / page.heightPt) * 100}%`,
                width: `${(box.width / page.widthPt) * 100}%`,
                height: `${(box.height / page.heightPt) * 100}%`,
                border: selected ? "2px solid #0C79F7" : "2px dashed #0C79F7",
                background: "rgba(12, 121, 247, 0.16)",
                boxSizing: "border-box",
                cursor: "move",
                borderRadius: 3,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 4,
                  top: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#0C79F7",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                Sign {box.label}
              </span>
              <button
                type="button"
                aria-label="Remove signature location"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(box.id);
                }}
                style={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "none",
                  background: "#EF3826",
                  color: "#fff",
                  fontSize: 12,
                  lineHeight: "20px",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
              <span
                onPointerDown={(event) => handleResizePointerDown(event, box)}
                style={{
                  position: "absolute",
                  right: -5,
                  bottom: -5,
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: "#0C79F7",
                  cursor: "nwse-resize",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// eslint-disable-next-line react/prop-types
const SignaturePlacementPicker = ({
  open,
  onClose,
  fileUrl,
  pdfFile,
  placements,
  onSave,
  accessToken,
  isUploading = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const [draft, setDraft] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const wasOpenRef = useRef(false);
  const pdfUrl = fileUrlToDisplay(fileUrl);
  const loadKey = pdfFile
    ? `local:${pdfFile.name}:${pdfFile.size}:${pdfFile.lastModified}`
    : `remote:${pdfUrl || ""}`;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(normalizeSignaturePlacements(placements));
      setSelectedId(null);
    }
    wasOpenRef.current = open;
  }, [open, placements]);

  useEffect(() => {
    if (!open) {
      setPages([]);
      setError("");
      setSelectedId(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      if (!pdfFile && !pdfUrl) {
        setPages([]);
        setError("No PDF file to preview.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        let bytes;
        if (pdfFile) {
          bytes = await pdfFile.arrayBuffer();
          if (!isPdfBuffer(bytes)) {
            throw new Error("Selected file is not a PDF");
          }
        } else {
          bytes = await fetchPdfBytes(fileUrl, accessToken);
        }
        const nextPages = await renderPdfPages(bytes);
        if (!cancelled) setPages(nextPages);
      } catch {
        if (!cancelled) {
          setPages([]);
          setError("Could not load this PDF. Please re-upload and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  // Keep preview on the local File while the server URL arrives in the background.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadKey, accessToken]);

  const handleAdd = (box) => {
    setDraft((prev) => [...prev, box]);
    setSelectedId(box.id);
  };

  const handleChangeBox = (nextBox) => {
    setDraft((prev) =>
      prev.map((box) =>
        box.id === nextBox.id
          ? {
              ...box,
              x: nextBox.x,
              y: nextBox.y,
              width: nextBox.width,
              height: nextBox.height,
            }
          : box
      )
    );
  };

  const handleRemove = (id) => {
    setDraft((prev) => prev.filter((box) => box.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  const handleClear = () => {
    setDraft([]);
    setSelectedId(null);
  };

  const handleDone = () => {
    const next = serializeSignaturePlacements(draft);
    if (next.length === 0) {
      toast.error("Click the PDF to place at least one signature location.");
      return;
    }
    onSave(draft);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: "12px",
          maxHeight: "92vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 1.5,
          fontWeight: 700,
          fontSize: 18,
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        Place signature locations
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748B" }}>
          Click anywhere on the document to add a signature box. Drag to move,
          use the blue corner to resize, and click × to remove. You can place
          multiple signatures on any page.
        </p>
        {isUploading ? (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#0C79F7" }}>
            Saving document in the background…
          </p>
        ) : null}

        {loading ? (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: 240,
              gap: 10,
            }}
          >
            <CircularProgress size={28} />
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              Loading PDF…
            </p>
          </div>
        ) : error ? (
          <p style={{ margin: 0, color: "#EF3826", fontSize: 13 }}>{error}</p>
        ) : (
          <div style={{ textAlign: "center" }}>
            {pages.map((page) => (
              <PdfPage
                key={page.pageIndex}
                page={page}
                boxes={draft
                  .map((box, index) => ({ ...box, label: index + 1 }))
                  .filter((box) => box.pageIndex === page.pageIndex)}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={handleAdd}
                onChangeBox={handleChangeBox}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}

        {draft.length > 0 && (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {draft.map((box, index) => (
              <span
                key={box.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#F1F5F9",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                Sign {index + 1} · Page {box.pageIndex + 1}
                <button
                  type="button"
                  aria-label={`Remove signature ${index + 1}`}
                  onClick={() => handleRemove(box.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    color: "#94A3B8",
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: "1px solid #E2E8F0",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={handleClear}
          disabled={draft.length === 0 || loading}
          style={{
            border: "none",
            background: "transparent",
            color: draft.length === 0 ? "#94A3B8" : "#EF3826",
            fontSize: 13,
            fontWeight: 600,
            cursor: draft.length === 0 ? "default" : "pointer",
          }}
        >
          Clear all
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "#64748B",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={loading || Boolean(error)}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 8,
              border: "none",
              background: "#0C79F7",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || error ? "not-allowed" : "pointer",
              opacity: loading || error ? 0.7 : 1,
            }}
          >
            Save {draft.length ? `(${draft.length})` : "locations"}
          </button>
        </div>
      </DialogActions>
    </Dialog>
  );
};

export default SignaturePlacementPicker;
