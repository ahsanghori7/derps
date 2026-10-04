import React, { useEffect, useRef, useState } from "react";
import { Box, MenuItem, Pagination, Select } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Menu, Portal } from "@headlessui/react";
import { FiMoreVertical } from "react-icons/fi";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  deleteRequest,
  postRequestWithBodyAndToken,
  putRequestWithBodyAndToken,
} from "../../Api/fetch";
import ShareFileModal from "../ShareFileModal";
import OneFieldModal from "../OneFieldModal";
import SendEmailModal from "../SendEmailModal";
import { baseURl } from "../../Config/systemConfig";
import { SVG } from "../../assets/svg";
import DeleteConfirmationModal from "../DeleteModal";
import { getErrorMessage } from "../../Utils/errorHandler";

const FooterWrapper = styled(Box)(() => ({
  position: "sticky",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "var(--dashboard-card-bg)",
  color: "var(--table-cell-text)",
  borderTop: "1px solid var(--dashboard-box-border)",
  padding: "4px 6px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderRadius: "0 0 14px 14px",
}));

const capitalizeFirst = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ✅ Helper to format size
const formatFileSize = (bytes) => {
  if (!bytes) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size % 1 === 0 ? size.toFixed(0) : size.toFixed(1)} ${sizes[i]}`;
};
const formatDateTime = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // remove if you want 24h format
  });
};

const FileTable = ({ files, onRename, onMove, selectedCategory, folderId }) => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);

  const [copied, setCopied] = useState(false);
  // positioning for context menu so it shows fully without scrolling
  const buttonRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({
    top: 0,
    left: 0,
    placeAbove: false,
  });
  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState(null);
  const [oneFieldModalOpen, setOneFieldModalOpen] = useState(false);
  const [oneFieldModalData, setOneFieldModalData] = useState("");
  const [renameDefaultValue, setRenameDefaultValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedFileForEmail, setSelectedFileForEmail] = useState(null);

  const safeFiles = Array.isArray(files) ? files : [];

  // ✅ Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [safeFiles.length]);

  // ✅ Actions
  const handleOpenFile = (filePath) => {
    if (filePath) {
      window.open(filePath, "_blank");
    } else {
      toast.error("File Path not available.");
    }
  };

  const handleDownload = (filePath, fileName) => {
    const link = document.createElement("a");
    link.href = filePath;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async (filePath) => {
    try {
      if (!filePath) {
        toast.error("File path not available");
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(filePath);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = filePath;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const deleteFile = async (id) => {
    setFileToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteFile = async () => {
    try {
      const result = await deleteRequest(`${baseURl}files/${fileToDelete}`, accessToken);
      toast.success(result.messages || "File deleted successfully");
      setShowDeleteModal(false);
      setFileToDelete(null);
      onRename?.();
    } catch (error) {
      toast.error(error.message || "Something went wrong while deleting");
    }
  };

  const cancelDeleteFile = () => {
    setShowDeleteModal(false);
    setFileToDelete(null);
  };

  const handleSendFileEmail = async ({ to, cc, html, subject }) => {
    const fileId =
      selectedFileForEmail?.file?.id || selectedFileForEmail?.id;

    if (!fileId) {
      toast.error("File not found");
      return false;
    }

    const resolvedFolderId =
      folderId ??
      selectedFileForEmail?.folderId ??
      selectedFileForEmail?.file?.folderId ??
      selectedFileForEmail?.parentId ??
      selectedFileForEmail?.file?.parentId;

    if (!resolvedFolderId) {
      toast.error("Folder not found");
      return false;
    }

    const recipients = [to, ...(cc || [])]
      .map((email) => String(email || "").trim())
      .filter(Boolean);
    const uniqueRecipients = [...new Set(recipients)];

    if (uniqueRecipients.length === 0) {
      toast.error("Please enter at least one recipient email");
      return false;
    }

    const fileName =
      selectedFileForEmail?.file?.name || selectedFileForEmail?.name || "file";

    try {
      const res = await postRequestWithBodyAndToken(
        `${baseURl}folder/send-email`,
        accessToken,
        {
          recipients: uniqueRecipients,
          folderId: Number(resolvedFolderId),
          fileIds: [Number(fileId)],
          message: html,
          subject: subject?.trim() || `File shared with you — ${fileName}`,
        }
      );
      toast.success(res?.message || res?.messages || "Email sent successfully");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send email"));
      return false;
    }
  };

  const handleRenameFile = async (name) => {
    try {
      setOneFieldModalOpen(false);
      const result = await putRequestWithBodyAndToken(
        `${baseURl}files/${oneFieldModalData}`,
        accessToken,
        { name }
      );
      toast.success(result.messages || "File renamed successfully");
      onRename?.();
    } catch (error) {
      toast.error(error.message || "Something went wrong while renaming");
    }
  };

  const getIcon = (name) => {
    if (name.endsWith(".pdf")) return <SVG.PdfFiles className="h-5 w-5" />;
    if (name.endsWith(".xlsx")) return <SVG.ExcelFile className="h-5 w-5" />;
    if (
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png")
    )
      return <SVG.PictureFile className="h-5 w-5" />;
    if (name.endsWith(".mp4")) return <SVG.VideoFiles className="h-5 w-5" />;
    if (name.endsWith(".docx"))
      return <SVG.DocumentsFile className="h-5 w-5" />;
    return <SVG.DocumentsFile className="h-5 w-5" />;
  };

  if (safeFiles.length === 0) {
    return (
      <div className="flex items-center justify-center mt-4">
        <p className="text-lg font-semibold text-gray-500">No Files Found</p>
      </div>
    );
  }

  const totalPages = Math.ceil(safeFiles.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedFiles = safeFiles.slice(startIndex, startIndex + rowsPerPage);

  return (
    <>
      <div className="overflow-x-auto w-full mb-4">
        <table className="min-w-full border border-gray-200">
          <thead className={document.documentElement.classList.contains('dark') ? 'bg-[#0C79F7] text-white' : 'bg-[#0C79F7] text-white'}>
            <tr>
              <th className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-left text-white' : 'px-4 py-2 text-left'}>Name</th>
              <th className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-left text-white' : 'px-4 py-2 text-left'}>Size</th>
              <th className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-left text-white' : 'px-4 py-2 text-left'}>Type</th>
              <th className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-left text-white' : 'px-4 py-2 text-left'}>Uploaded At</th>
              <th className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-left text-white' : 'px-4 py-2 text-left'}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFiles.map((file, index) => {
              const filePath = file?.file?.path || file?.path;
              const fileName = file?.file?.name || file?.name;
              const fileSize = file?.file?.size || file?.size;
              const fileId = file?.file?.id || file?.id;
              const uploadedAt =
                file?.file?.createdAt ||
                file?.createdAt ||
                file?.file?.created_by?.createdAt; // fallback if needed

              return (
                <tr key={index} className={document.documentElement.classList.contains('dark') ? 'border-t hover:bg-gray-700' : 'border-t hover:bg-gray-50'}>
                  <td className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 flex items-center gap-2 text-white' : 'px-4 py-2 flex items-center gap-2'}>
                    {getIcon(fileName)}
                    <span className="truncate max-w-xs">
                      {capitalizeFirst(fileName)}
                    </span>
                  </td>
                  <td className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-white' : 'px-4 py-2'}>{formatFileSize(fileSize)}</td>
                  <td className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-white' : 'px-4 py-2'}>{file.type || "—"}</td>
                  <td className={document.documentElement.classList.contains('dark') ? 'px-4 py-2 text-white' : 'px-4 py-2'}>
                    {formatDateTime(uploadedAt)}
                  </td>
                  {/* <td className="px-4 py-2">
                    {formatDateTime(uploadedAt)}
                  </td> */}
                  <td className="px-4 py-2">
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button
                        ref={buttonRef}
                        onClick={(e) => {
                          // Compute position on open
                          const rect = (
                            e.currentTarget || buttonRef.current
                          ).getBoundingClientRect();
                          const estimatedMenuHeight = 260; // px (roughly our items)
                          const estimatedMenuWidth = 160;
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const placeAbove = spaceBelow < estimatedMenuHeight;
                          const top = placeAbove
                            ? rect.top - 8
                            : rect.bottom + 8; // 8px offset
                          const left = Math.min(
                            Math.max(rect.right - estimatedMenuWidth, 8),
                            window.innerWidth - estimatedMenuWidth - 8
                          );
                          setMenuStyle({ top, left, placeAbove });
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200"
                      >
                        <FiMoreVertical className="h-5 w-5 text-gray-600" />
                      </Menu.Button>
                      <Portal>
                        <Menu.Items
                          // Render in a portal with fixed positioning so it isn't clipped by table overflow
                          className={`fixed w-40 ${document.documentElement.classList.contains('dark') ? 'bg-gray-800 divide-gray-600' : 'bg-white divide-y divide-gray-100'} rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 ${menuStyle.placeAbove
                              ? "origin-bottom-right"
                              : "origin-top-right"
                            }`}
                          style={{ top: menuStyle.top, left: menuStyle.left }}
                        >
                          <div className="px-1 py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleOpenFile(filePath)}
                                  className={`${active ? (document.documentElement.classList.contains('dark') ? 'bg-gray-700' : 'bg-gray-100') : ""
                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                >
                                  Open
                                </button>
                              )}
                            </Menu.Item>
                            {(userData.roleTitle === "Admin" 
                             || userData.roleTitle === 'Human Resource' ||
                              file?.permission?.includes("edit") ||
                              file?.sharedItem?.permission?.includes(
                                "edit"
                              )) && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => {
                                        setOneFieldModalOpen(true);
                                        setOneFieldModalData(fileId);
                                        setRenameDefaultValue(fileName || "");
                                      }}
                                      className={`${active ? (document.documentElement.classList.contains('dark') ? 'bg-gray-700' : 'bg-gray-100') : ""
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                    >
                                      Rename
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                            {(userData.roleTitle === "Admin" || userData.roleTitle === 'Human Resource' ||
                              file?.permission?.includes("edit") ||
                              file?.sharedItem?.permission?.includes("edit")) &&
                              selectedCategory === "All" && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      disabled={!onMove}
                                      onClick={() => onMove?.(fileId, folderId)}
                                      className={`${active ? (document.documentElement.classList.contains('dark') ? 'bg-gray-700' : 'bg-gray-100') : ""
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
                                    >
                                      Move
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleCopyLink(filePath)}
                                  className={`${active ? (document.documentElement.classList.contains('dark') ? 'bg-gray-700' : 'bg-gray-100') : ""
                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                >
                                  {copied ? "Copied!" : "Copy"}
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => {
                                    setSelectedFileForEmail(file);
                                    setShowEmailModal(true);
                                  }}
                                  className={`${active ? (document.documentElement.classList.contains('dark') ? 'bg-gray-700' : 'bg-gray-100') : ""
                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                >
                                  Email
                                </button>
                              )}
                            </Menu.Item>
                            {(userData.roleTitle === "Admin" || userData.roleTitle === 'Human Resource') && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => {
                                      setSelectedFileForShare(file);
                                      setIsShareFileModalOpen(true);
                                    }}
                                    className={`${active ? "bg-gray-100" : ""
                                      } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                  >
                                    Share
                                  </button>
                                )}
                              </Menu.Item>
                            )}

                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => deleteFile(fileId)}
                                  className={`${active ? "bg-gray-100" : ""
                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600`}
                                >
                                  Delete
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Portal>
                    </Menu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages >= 1 && (
          <FooterWrapper>
            <Select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(1);
              }}
              size="small"
              style={{ borderRadius: 10, fontSize: 12 }}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              variant="outlined"
              size="small"
            />
          </FooterWrapper>
        )}
      </div>

      {/* Modals */}
      {isShareFileModalOpen && (
        <ShareFileModal
          isOpen={isShareFileModalOpen}
          onClose={() => {
            setIsShareFileModalOpen(false);
            setSelectedFileForShare(null);
          }}
          path={selectedFileForShare}
          fileShared={true}
        />
      )}
      {oneFieldModalOpen && (
        <OneFieldModal
          isOpen={oneFieldModalOpen}
          onClose={() => setOneFieldModalOpen(false)}
          fieldTitle="Enter New Name"
          modalTitle="Rename File"
          fieldPlaceholder="Enter new name"
          onSubmit={handleRenameFile}
          defaultValue={renameDefaultValue}
          buttonName="Rename"
        />
      )}
      <DeleteConfirmationModal
        open={showDeleteModal}
        title="Delete File"
        subtitle="Are you sure you want to delete"
        entityName={safeFiles.find(f => (f?.file?.id || f?.id) === fileToDelete)?.file?.name || safeFiles.find(f => (f?.file?.id || f?.id) === fileToDelete)?.name || "this file"}
        warningMessage="This action cannot be undone. The file will be permanently removed from the system."
        onCancel={cancelDeleteFile}
        onDelete={confirmDeleteFile}
        isLoading={false}
      />
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setSelectedFileForEmail(null);
        }}
        onSend={handleSendFileEmail}
        title="Send File Email"
        showSubject
        defaultSubject="File shared with you."
        includeTermsAndConditions={false}
        defaultEmailBody={`<p>Hello — please find the attached file: <strong>${selectedFileForEmail?.file?.name || selectedFileForEmail?.name || "file"}</strong>.</p>`}
      />
    </>
  );
};

export default FileTable;
