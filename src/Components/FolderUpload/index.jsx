import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { FaFolder } from "react-icons/fa";
import Heading from "../Heading";
import axios from "axios";
import { buildAuthHeaders } from "../../Api/fetch";

// MUI
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const FolderUpload = ({
  isOpen,
  folderId,
  onClose,
  onSuccess,
}) => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const allowedExtensions = [
    "png", "jpeg", "jpg", "csv", "xls", "xlsx", "pdf",
    "mp4", "mkv", "avi", "mp3", "zip", "doc", "docx",
  ];

  /* =========================
     Reset progress on close
     ========================= */
  useEffect(() => {
    if (!isOpen) {
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen]);

  /* =========================
     Folder upload with progress
     ========================= */
  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('userId', userData?.id);
    if (folderId !== null && folderId !== undefined && folderId !== '') {
      formData.append('parentId', folderId);
    }

    files.forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (allowedExtensions.includes(ext)) {
        formData.append("paths", file.webkitRelativePath);
        formData.append("files", file);
      }
    });

    try {
      await axios.post(`${baseURl}folder/upload`, formData, {
        headers: buildAuthHeaders(accessToken),
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percent);
        },
      });

      toast.success("Folder uploaded successfully");
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-504 flex items-center justify-center bg-black bg-opacity-30"
      style={{ zIndex: 9999 }}
    >
      <div className="relative w-full max-w-sm bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 max-h-[80vh] overflow-y-auto scrollbar-hide">

        {/* Close Button */}
        <button
          onClick={() => {
            if (!isUploading) {
              onClose();
            } else {
              toast.warn("Please wait until upload finishes.");
            }
          }}
          className="absolute top-4 right-4 text-2xl text-[var(--sidebar-text-primary)]"
        >
          ×
        </button>

        {/* Title */}
        <h2 className="text-xl font-semibold text-[var(--sidebar-text-primary)] mb-4">
          Upload Folder
        </h2>

        {/* Folder Picker */}
        <label className="flex flex-col justify-center items-center mt-6 px-4 py-6 border border-dashed border-gray-400 rounded-lg cursor-pointer">
          <input
            type="file"
            multiple
            webkitdirectory="true"
            directory="true"
            onChange={handleFolderUpload}
            disabled={isUploading}
            className="hidden"
          />

          <FaFolder size={40} className="text-[var(--sidebar-text-primary)]" />

          <Heading
            Fontweight={500}
            color={"var(--fieldsTitle)"}
            Heading={"Click to browse folder"}
            Fontsize={13}
            mt={4}
            txtAlign={"center"}
          />
        </label>

        {/* 🔵 Progress Bar */}
        {isUploading && (
          <Box sx={{ width: "100%", mt: 3 }}>
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

        {/* Uploading text */}
        {isUploading && (
          <p className="mt-2 text-sm text-[var(--sidebar-text-primary)] text-center">
            Uploading folder...
          </p>
        )}
      </div>
    </div>
  );
};

export default FolderUpload;