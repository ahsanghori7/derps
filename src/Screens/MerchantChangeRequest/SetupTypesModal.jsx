import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tab,
  Tabs,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { toast } from "react-toastify";
import {
  deleteRequest,
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  putRequestWithBodyAndToken,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { normalizeList, parseApiError } from "./utils";

// eslint-disable-next-line react/prop-types
const SetupTypesModal = ({ open, onClose, accessToken, onChanged }) => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processTypes, setProcessTypes] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [title, setTitle] = useState("");
  const [processTypeId, setProcessTypeId] = useState("");
  const [editing, setEditing] = useState(null);

  const loadLookups = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [ptRes, rtRes] = await Promise.all([
        getRequestWithOutBody(
          `${baseURl}process-type?paginate=true&page=1&limit=100`,
          accessToken
        ),
        getRequestWithOutBody(
          `${baseURl}request-type?paginate=true&page=1&limit=200`,
          accessToken
        ),
      ]);
      setProcessTypes(normalizeList(ptRes).rows);
      setRequestTypes(normalizeList(rtRes).rows);
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (open) {
      setTab(0);
      setEditing(null);
      setTitle("");
      setProcessTypeId("");
      loadLookups();
    }
  }, [open, loadLookups]);

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setProcessTypeId("");
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      toast.error("Title must be at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      if (tab === 0) {
        if (editing?.id) {
          const result = await putRequestWithBodyAndToken(
            `${baseURl}process-type/${editing.id}`,
            accessToken,
            { title: trimmed }
          );
          toast.success(result?.message || "Process type updated.");
        } else {
          const result = await postRequestWithBodyAndToken(
            `${baseURl}process-type`,
            accessToken,
            { title: trimmed }
          );
          toast.success(result?.message || "Process type created.");
        }
      } else {
        if (!processTypeId) {
          toast.error("Select a process type.");
          setSaving(false);
          return;
        }
        const body = {
          title: trimmed,
          processTypeId: Number(processTypeId),
        };
        if (editing?.id) {
          const result = await putRequestWithBodyAndToken(
            `${baseURl}request-type/${editing.id}`,
            accessToken,
            body
          );
          toast.success(result?.message || "Request type updated.");
        } else {
          const result = await postRequestWithBodyAndToken(
            `${baseURl}request-type`,
            accessToken,
            body
          );
          toast.success(result?.message || "Request type created.");
        }
      }
      resetForm();
      await loadLookups();
      onChanged?.();
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditing(row);
    setTitle(row?.title || "");
    setProcessTypeId(
      row?.processTypeId != null
        ? String(row.processTypeId)
        : row?.processType?.id != null
          ? String(row.processType.id)
          : ""
    );
  };

  const handleDelete = async (row) => {
    if (!row?.id) return;
    const endpoint = tab === 0 ? "process-type" : "request-type";
    try {
      const result = await deleteRequest(
        `${baseURl}${endpoint}/${row.id}`,
        accessToken
      );
      toast.success(result?.message || "Deleted successfully.");
      if (editing?.id === row.id) resetForm();
      await loadLookups();
      onChanged?.();
    } catch (error) {
      toast.error(parseApiError(error));
    }
  };

  const list = tab === 0 ? processTypes : requestTypes;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
        }}
      >
        Setup Types
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            resetForm();
          }}
          sx={{ mb: 2, minHeight: 36 }}
        >
          <Tab label="Process Types" sx={{ textTransform: "none", minHeight: 36 }} />
          <Tab label="Request Types" sx={{ textTransform: "none", minHeight: 36 }} />
        </Tabs>

        <div className="flex flex-col gap-3 mb-4">
          {tab === 1 && (
            <TextField
              select
              size="small"
              label="Process Type"
              value={processTypeId}
              onChange={(e) => setProcessTypeId(e.target.value)}
              fullWidth
            >
              {processTypes.map((pt) => (
                <MenuItem key={pt.id} value={String(pt.id)}>
                  {pt.title}
                </MenuItem>
              ))}
            </TextField>
          )}
          <div className="flex gap-2">
            <TextField
              size="small"
              label={editing ? "Edit title" : "New title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 100 }}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 rounded-md text-white text-sm font-medium whitespace-nowrap disabled:opacity-60"
              style={{ backgroundColor: "#0C79F7", minWidth: 88 }}
            >
              {saving ? "Saving…" : editing ? "Update" : "Add"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 rounded-md text-sm border border-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={28} />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No {tab === 0 ? "process" : "request"} types yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {list.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {row.title}
                  </p>
                  {tab === 1 && (
                    <p className="text-xs text-slate-500 truncate">
                      {row?.processType?.title ||
                        processTypes.find(
                          (p) => String(p.id) === String(row.processTypeId)
                        )?.title ||
                        "—"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconButton size="small" onClick={() => handleEdit(row)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(row)}>
                    <DeleteOutlineIcon fontSize="small" color="error" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
      <DialogActions>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600"
        >
          Close
        </button>
      </DialogActions>
    </Dialog>
  );
};

export default SetupTypesModal;
