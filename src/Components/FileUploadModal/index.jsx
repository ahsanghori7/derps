import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import UploadFile from "../UploadFile";
import axios from "axios";
import { buildAuthHeaders } from "../../Api/fetch";

// MUI
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const FileUploadModal = ({
  isOpen,
  folderId,
  onClose,
  onSuccess,
  droppedFiles,
}) => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  /* =========================
     1️⃣ Handle dropped files
     ========================= */
  useEffect(() => {
    if (droppedFiles) {
      setUploadedFile(droppedFiles);
    }
  }, [droppedFiles]);

  /* =========================
     2️⃣ Reset progress on close
     ========================= */
  useEffect(() => {
    if (!isOpen) {
      setUploadProgress(0);
      setLoading(false);
    }
  }, [isOpen]);

  const handleFileChange = (file) => {
    setUploadedFile(file);
  };

  /* =========================
     3️⃣ Upload with progress
     ========================= */
  const handleSubmit = async () => {
    if (!uploadedFile || uploadedFile.length === 0) {
      toast.error("At least one file is required");
      return;
    }

    setLoading(true);

    try {
      for (let i = 0; i < uploadedFile.length; i++) {
        const formData = new FormData();
        formData.append("files", uploadedFile[i]);
        formData.append("userId", userData.id);
        formData.append("folderId", folderId ? folderId : 1);

        await axios.post(`${baseURl}files/upload`, formData, {
          headers: buildAuthHeaders(accessToken),
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          },
        });

        toast.success(`Uploaded: ${uploadedFile[i].name}`);
        setUploadProgress(0);
      }

      setUploadedFile(null);
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong during upload"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30"
      style={{ zIndex: 9999 }}
    >
      <div
        className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-8 w-full max-w-xl relative max-h-[80vh] overflow-y-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-[var(--sidebar-text-primary)]"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4 text-[var(--sidebar-text-primary)]">
          Upload New File
        </h2>

        {/* Upload Area */}
        <div className="mt-4">
          <div className="flex justify-center">
            <div
              className="h-64 w-full p-4 flex flex-col items-center justify-center"
              style={{
                backgroundColor: "var(--dashboard-tab-box)",
                border: "2px solid var(--sidebar-selected-bg)",
                borderRadius: 8,
              }}
            >
              <UploadFile
                backgroundColor={"var(--scroll-thumb)"}
                addTicket={true}
                onFileChange={handleFileChange}
                droppedFiles={droppedFiles}
              />
            </div>
          </div>
        </div>

        {/* 🔵 Progress Bar */}
        {loading && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                height: 8,
                borderRadius: 5,
                backgroundColor: "rgba(0,0,0,0.1)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  backgroundColor: "#0C79F7",
                },
              }}
            />
            <Typography
              variant="body2"
              align="center"
              sx={{ mt: 0.5, color: "var(--sidebar-text-primary)" }}
            >
              {uploadProgress}%
            </Typography>
          </Box>
        )}

        {/* Upload Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2 text-white rounded-lg ${
              loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-[#0C79F7] hover:bg-blue-600"
            }`}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;