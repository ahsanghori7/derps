import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { WORKSPACE_WIDGETS } from "./dashboardWidgets";

const ManageDashboardModal = ({
  open,
  prefs,
  modules,
  workspaceWidgets = WORKSPACE_WIDGETS,
  onSave,
  onClose,
}) => {
  const [workspaceDraft, setWorkspaceDraft] = useState(prefs);
  const [moduleDraft, setModuleDraft] = useState(modules);
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    if (!open) return;
    setWorkspaceDraft(prefs);
    setModuleDraft(modules);
    setSaveError("");
    setBusy(false);
    setDragIndex(null);
  }, [open, prefs, modules]);

  if (!open) return null;

  const enabledCount =
    workspaceWidgets.filter((widget) => workspaceDraft[widget.id]).length +
    moduleDraft.filter((module) => module.visible).length;

  const toggleWorkspace = (id) => {
    setWorkspaceDraft((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleModule = (key) => {
    setModuleDraft((prev) =>
      prev.map((module) =>
        module.key === key ? { ...module, visible: !module.visible } : module,
      ),
    );
  };

  const reorderModule = (from, to) => {
    setModuleDraft((prev) => {
      if (from === to || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((module, order) => ({ ...module, order }));
    });
  };

  const moveModule = (index, direction) => reorderModule(index, index + direction);

  // Reorder live while dragging so the list shows where the item will land.
  const dragProps = (index) => ({
    draggable: true,
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
      setDragIndex(index);
    },
    onDragOver: (event) => {
      if (dragIndex == null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (index !== dragIndex) {
        reorderModule(dragIndex, index);
        setDragIndex(index);
      }
    },
    onDrop: (event) => event.preventDefault(),
    onDragEnd: () => setDragIndex(null),
  });

  const setAll = (value) => {
    setWorkspaceDraft((prev) => ({
      ...prev,
      ...Object.fromEntries(workspaceWidgets.map((widget) => [widget.id, value])),
    }));
    setModuleDraft((prev) => prev.map((module) => ({ ...module, visible: value })));
  };

  const handleSave = async () => {
    setBusy(true);
    setSaveError("");
    try {
      await onSave({ prefs: workspaceDraft, modules: moduleDraft });
      onClose();
    } catch (err) {
      setSaveError(err?.message || "Couldn’t save dashboard settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: "min(560px, 100%)",
          maxHeight: "min(80vh, 640px)",
          backgroundColor: "var(--dashboard-card-bg)",
          border: "1px solid var(--dashboard-border)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--dashboard-border)" }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dashboard-text-primary)" }}>
              Manage Dashboard
            </div>
            <div style={{ fontSize: 11.5, color: "var(--dashboard-text-secondary)", marginTop: 2 }}>
              Report panels stay on this device · module order is saved to your account · {enabledCount} selected
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--dashboard-text-secondary)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div className="px-4 py-2 flex gap-2" style={{ borderBottom: "1px solid var(--dashboard-border)" }}>
          <button
            type="button"
            onClick={() => setAll(true)}
            style={{ fontSize: 11, fontWeight: 700, color: "#0C79F7", background: "none", border: "none", cursor: "pointer" }}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            style={{ fontSize: 11, fontWeight: 700, color: "var(--dashboard-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
          >
            Clear all
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-4">
          {workspaceWidgets.length > 0 && (
            <div>
              <div style={groupLabelStyle}>Reports</div>
              <div className="flex flex-col gap-1.5">
                {workspaceWidgets.map((widget) => (
                  <ToggleRow
                    key={widget.id}
                    title={widget.name}
                    subtitle={widget.subtitle}
                    checked={!!workspaceDraft[widget.id]}
                    onChange={() => toggleWorkspace(widget.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <div style={groupLabelStyle}>Modules</div>
              {moduleDraft.length > 1 && (
                <div style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)", marginBottom: 8 }}>
                  Drag to reorder
                </div>
              )}
            </div>
            {moduleDraft.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--dashboard-text-secondary)" }}>
                No modules available for your access.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {moduleDraft.map((module, index) => (
                  <div
                    key={module.key}
                    {...dragProps(index)}
                    style={{
                      opacity: dragIndex === index ? 0.5 : 1,
                      cursor: dragIndex == null ? "grab" : "grabbing",
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    <ToggleRow
                      title={module.label}
                      subtitle={module.group}
                      checked={module.visible}
                      onChange={() => toggleModule(module.key)}
                      dragging={dragIndex === index}
                      leading={
                        <GripVertical
                          size={14}
                          aria-hidden
                          style={{ color: "var(--dashboard-text-secondary)", flexShrink: 0, cursor: "grab" }}
                        />
                      }
                      extra={
                        <span className="flex items-center gap-1">
                          <OrderButton
                            label="Move up"
                            icon={ChevronUp}
                            disabled={index === 0}
                            onClick={() => moveModule(index, -1)}
                          />
                          <OrderButton
                            label="Move down"
                            icon={ChevronDown}
                            disabled={index === moduleDraft.length - 1}
                            onClick={() => moveModule(index, 1)}
                          />
                        </span>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {saveError && (
          <div className="px-4 py-2" style={{ fontSize: 12, color: "#FF4C4C" }}>
            {saveError}
          </div>
        )}

        <div
          className="px-4 py-3 flex justify-end gap-2"
          style={{ borderTop: "1px solid var(--dashboard-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-1.5"
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--dashboard-text-secondary)",
              background: "var(--dashboard-card-bg2)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded-lg px-3.5 py-1.5"
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "#fff",
              background: "#0C79F7",
              border: "none",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Saving…" : "Save layout"}
          </button>
        </div>
      </div>
    </div>
  );
};

const groupLabelStyle = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#0C79F7",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginBottom: 8,
};

const ToggleRow = ({ title, subtitle, checked, onChange, extra, leading, dragging }) => (
  <label
    className="flex items-center gap-3 rounded-lg px-2.5 py-2 cursor-pointer"
    style={{
      backgroundColor: checked ? "rgba(12,121,247,0.08)" : "var(--dashboard-card-bg2)",
      border: dragging
        ? "1px dashed #0C79F7"
        : `1px solid ${checked ? "rgba(12,121,247,0.35)" : "transparent"}`,
    }}
  >
    {leading}
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ accentColor: "#0C79F7", width: 14, height: 14 }}
    />
    <div className="min-w-0 flex-1">
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--dashboard-text-primary)" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 10.5, color: "var(--dashboard-text-secondary)" }}>{subtitle}</div>
      )}
    </div>
    {extra}
  </label>
);

const OrderButton = ({ label, icon: Icon, disabled, onClick }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    }}
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: disabled ? "var(--dashboard-text-secondary)" : "#0C79F7",
      background: "transparent",
      border: "1px solid var(--dashboard-border)",
      borderRadius: 6,
      padding: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1,
    }}
  >
    <Icon size={14} />
  </button>
);

export default ManageDashboardModal;
