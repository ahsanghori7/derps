import React, { useState } from 'react';
import { SVG } from '../../assets/svg';
import { Menu } from '@headlessui/react';
import { FiMoreVertical } from 'react-icons/fi';
import ShareFileModal from '../ShareFileModal';
import DeleteConfirmationModal from '../DeleteModal';
import { toast } from 'react-toastify';
import { deleteRequest, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from '../../Api/fetch';
import { useSelector } from 'react-redux';
import { baseURl } from '../../Config/systemConfig';
import OneFieldModal from '../OneFieldModal';
import SendEmailModal from '../SendEmailModal';
import { getErrorMessage } from '../../Utils/errorHandler';

// CSS to hide scrollbars
const hideScrollbarStyles = `
  .pdf-iframe-hide-scrollbar::-webkit-scrollbar {
    display: none !important;
  }
  .pdf-iframe-hide-scrollbar {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }
  .pdf-iframe-container {
    overflow: hidden !important;
    position: relative !important;
  }
  .pdf-iframe-container iframe {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    border: none !important;
  }
  .pdf-preview-container {
    overflow: hidden !important;
    position: relative !important;
    max-height: 176px !important;
    max-width: 288px !important;
  }
  .pdf-preview-container object,
  .pdf-preview-container embed,
  .pdf-preview-container iframe {
    overflow: hidden !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    max-height: 176px !important;
    max-width: 288px !important;
    pointer-events: none !important;
  }
  .pdf-preview-container object::-webkit-scrollbar,
  .pdf-preview-container embed::-webkit-scrollbar,
  .pdf-preview-container iframe::-webkit-scrollbar,
  .pdf-preview-container *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
  }
  .pdf-preview-container object::-webkit-scrollbar-track,
  .pdf-preview-container embed::-webkit-scrollbar-track,
  .pdf-preview-container iframe::-webkit-scrollbar-track,
  .pdf-preview-container *::-webkit-scrollbar-track {
    display: none !important;
    background: transparent !important;
  }
  .pdf-preview-container object::-webkit-scrollbar-thumb,
  .pdf-preview-container embed::-webkit-scrollbar-thumb,
  .pdf-preview-container iframe::-webkit-scrollbar-thumb,
  .pdf-preview-container *::-webkit-scrollbar-thumb {
    display: none !important;
    background: transparent !important;
  }
  .pdf-preview-container object::-webkit-scrollbar-corner,
  .pdf-preview-container embed::-webkit-scrollbar-corner,
  .pdf-preview-container iframe::-webkit-scrollbar-corner,
  .pdf-preview-container *::-webkit-scrollbar-corner {
    display: none !important;
    background: transparent !important;
  }
  .pdf-preview-container object,
  .pdf-preview-container embed,
  .pdf-preview-container iframe {
    scrollbar-color: transparent transparent !important;
  }
`;

// Format file size in human-readable form
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  const formattedSize = size % 1 === 0 ? size.toFixed(0) : size.toFixed(1);

  return `${formattedSize} ${sizes[i]}`;
};
const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};


const FileBox = ({ files, onRename, onMove, selectedCategory, folderId }) => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);

  const [copied, setCopied] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [oneFieldModalOpen, setOneFieldModalOpen] = useState(false);
  const [oneFieldModalData, setOneFieldModalData] = useState('');
  const [renameDefaultValue, setRenameDefaultValue] = useState('');
  const [pdfLoadError, setPdfLoadError] = useState(false);

  // Inject CSS to hide scrollbars
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = hideScrollbarStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const filePath = files?.file?.path || files?.path;
  const fileName = files?.file?.name || files?.name;
  const fileSize = files?.file?.size || files?.size;
  const fileId = files?.file?.id || files?.id;
  const thumbnailPath = files?.file?.thumbnailPath || files?.thumbnailPath;

  const getIconColor = (name) => {
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) return '#04C144';
    if (name.endsWith('.mp4')) return '#FF0000';
    if (name.endsWith('.docx')) return '#526EFF';
    return '#04C144';
  };

  const Icon =
    fileName.endsWith('.pdf') ? SVG.PdfFiles :
      fileName.endsWith('.xlsx') ? SVG.ExcelFile :
        fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') ? SVG.PictureFile :
          fileName.endsWith('.mp4') ? SVG.VideoFiles :
            fileName.endsWith('.docx') ? SVG.DocumentsFile :
              SVG.DocumentsFile;

  const handleOpenFile = () => {
    if (filePath) {
      window.open(filePath, '_blank');
    } else {
      alert("File Path not available.");
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = filePath;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async () => {
    try {
      if (!filePath) {
        toast.error('File path not available');
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(filePath);
      } else {
        // Fallback for insecure context or older browser
        const textArea = document.createElement("textarea");
        textArea.value = filePath;
        textArea.style.position = "fixed"; // Prevent scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) throw new Error("Fallback failed");
      }

      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };


  const deleteFile = async (id) => {
    setFileToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteRequest(`${baseURl}files/${fileToDelete}`, accessToken);
      toast.success(result.messages || 'File deleted successfully');
      onRename();
    } catch (error) {
      toast.error(error.message || "Something went wrong while deleting the file");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setFileToDelete(null);
    }
  };

  const handleSendFileEmail = async ({ to, cc, html, subject }) => {
    if (!fileId) {
      toast.error('File not found');
      return false;
    }

    const resolvedFolderId =
      folderId ??
      files?.folderId ??
      files?.file?.folderId ??
      files?.parentId ??
      files?.file?.parentId;

    if (!resolvedFolderId) {
      toast.error('Folder not found');
      return false;
    }

    const recipients = [to, ...(cc || [])]
      .map((email) => String(email || '').trim())
      .filter(Boolean);
    const uniqueRecipients = [...new Set(recipients)];

    if (uniqueRecipients.length === 0) {
      toast.error('Please enter at least one recipient email');
      return false;
    }

    try {
      const res = await postRequestWithBodyAndToken(
        `${baseURl}folder/send-email`,
        accessToken,
        {
          recipients: uniqueRecipients,
          folderId: Number(resolvedFolderId),
          fileIds: [Number(fileId)],
          message: html,
          subject: subject?.trim() || `File shared with you — ${fileName || 'file'}`,
        }
      );
      toast.success(res?.message || res?.messages || 'Email sent successfully');
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send email'));
      return false;
    }
  };

  const handleRenameFile = async (name) => {
    try {
      setOneFieldModalOpen(false)
      let apiData = {
        name: name
      }
      const result = await putRequestWithBodyAndToken(`${baseURl}files/${oneFieldModalData}`, accessToken, apiData);
      onRename()
      toast.success(result.messages || 'File renamed successfully');
    } catch (error) {
      toast.error(error.message || "Something went wrong while renaming the file");
    }
  };

  const isImageOrVideo = (name) =>
    name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.mp4') || name.endsWith('.pdf');

  const createdAt =
    files?.file?.createdAt ||
    files?.createdAt ||
    files?.created_by?.createdAt;

  return (
    <>
      {(isImageOrVideo(filePath) && thumbnailPath) || filePath.endsWith('.pdf') ? (
        <div
          className="relative w-80 h-60 border  rounded-xl shadow-sm  flex  p-2 justify-center  hover:shadow-md transition bg-[var(--dashboard-card-bg2)] cursor-pointer"
          onClick={handleOpenFile}
        >
          <div className=" z-10" onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center'>
              <div className='flex items-center gap-2'>
                <Icon className="h-6 w-6 mb-2" style={{ color: getIconColor(filePath) }} />

                <div className='flex flex-col items-start'>
                  {fileName?.length > 25 ? (
                    <p className="text-md font-semibold truncate w-full " style={{ color: 'var(--sidebar-text-primary)' }}>
                      {fileName?.slice(0, 22)}...
                    </p>
                  ) : (
                    <p className="text-md font-semibold truncate w-full " style={{ color: 'var(--sidebar-text-primary)' }}>
                      {fileName}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--sidebar-text-primary)' }}>File Size: {formatFileSize(fileSize)}</p>
                  <p className="text-xs text-gray-500">
                    Uploaded at: {formatDateTime(createdAt)}
                  </p>
                </div>
              </div>
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="focus:outline-none inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                  <FiMoreVertical className="h-5 w-5 text-gray-600" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-1 w-40 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                  <div className="px-1 py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleOpenFile}
                          className={`${active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                        >
                          Open
                        </button>
                      )}
                    </Menu.Item>
                    {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' || files?.permission?.includes('edit') || files?.sharedItem?.permission?.includes('edit')) && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => {
                              setOneFieldModalOpen(true)
                              setOneFieldModalData(fileId)
                              setRenameDefaultValue(fileName || '')
                            }}
                            className={`${active ? 'bg-gray-100' : ''
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                          >
                            Rename
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    {(
                      userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' ||
                      files?.permission?.includes('edit') ||
                      files?.sharedItem?.permission?.includes('edit')
                    ) && selectedCategory === 'All' && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              disabled={!onMove}
                              onClick={() => onMove?.(fileId, folderId)}
                              className={`${active ? 'bg-gray-100' : ''
                                } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              Move
                            </button>
                          )}
                        </Menu.Item>
                      )}
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleCopyLink}
                          className={`${active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setShowEmailModal(true)}
                          className={`${active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                        >
                          Email
                        </button>
                      )}
                    </Menu.Item>
                    {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource') && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => setIsShareFileModalOpen(true)}
                            className={`${active ? 'bg-gray-100' : ''
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                          >
                            Share
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' || files?.permission?.includes('edit') || files?.sharedItem?.permission?.includes('edit')) && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => deleteFile(fileId)}
                            className={`${active ? 'bg-gray-100' : ''
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                          >
                            Delete
                          </button>
                        )}
                      </Menu.Item>
                    )}
                  </div>
                </Menu.Items>
              </Menu>
            </div>
            {filePath.endsWith('.pdf') ? (
              <div className="relative">
                {pdfLoadError ? (
                  <div 
                    className="h-44 w-72 mt-1 rounded-md mb-2 border-0 bg-gray-100 flex items-center justify-center cursor-pointer"
                    onClick={handleOpenFile}
                  >
                    <div className="text-center">
                      <SVG.PdfFiles className="h-12 w-12 mx-auto mb-2 text-red-500" />
                      <p className="text-sm text-gray-600">PDF Preview Unavailable</p>
                      <p className="text-xs text-gray-500 mt-1">Click to open in new tab</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 w-72 mt-1 rounded-md mb-2 cursor-pointer overflow-hidden" onClick={handleOpenFile}>
                    <div className="relative h-full w-full">
                      <div 
                        className="absolute inset-0 overflow-hidden"
                        style={{
                          clipPath: 'inset(0 0 0 0)',
                          WebkitClipPath: 'inset(0 0 0 0)'
                        }}
                      >
                        <iframe
                          src={`${filePath}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&zoom=fit&view=fitH&zoom=auto`}
                          className="w-full h-full border-0"
                          style={{ 
                            overflow: 'hidden',
                            touchAction: 'none',
                            userSelect: 'none',
                            width: 'calc(100% + 20px)',
                            height: 'calc(100% + 20px)',
                            margin: '-10px',
                            pointerEvents: 'none'
                          }}
                          onError={() => setPdfLoadError(true)}
                          onLoad={() => setPdfLoadError(false)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <img
                src={thumbnailPath}
                alt={fileName}
                onClick={handleOpenFile}
                className="  object-cover h-44 w-72 mt-1 rounded-md mb-2"
              />
            )}
          </div>
        </div>
      ) : (
        <div
          className="relative w-80 h-60 border rounded-xl shadow-sm p-3 flex flex-col items-center justify-center text-center hover:shadow-md transition bg-[var(--dashboard-card-bg2)] cursor-pointer"
          onClick={handleOpenFile}
        >
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="focus:outline-none inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                <FiMoreVertical className="h-5 w-5 text-gray-600" />
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-1 w-40 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                <div className="px-1 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleOpenFile}
                        className={`${active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                      >
                        Open
                      </button>
                    )}
                  </Menu.Item>
                  {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' || files?.permission?.includes('edit') || files?.sharedItem?.permission?.includes('edit')) && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            setOneFieldModalOpen(true)
                            setOneFieldModalData(fileId)
                            setRenameDefaultValue(fileName || '')
                          }}
                          className={`${active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                        >
                          Rename
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  {(
                    userData.roleTitle === 'Admin' ||
                    userData.roleTitle === 'Human Resource' ||
                    files?.permission?.includes('edit') ||
                    files?.sharedItem?.permission?.includes('edit')
                  ) && selectedCategory === 'All' && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            disabled={!onMove}
                            onClick={() => onMove?.(fileId, folderId)}
                            className={`${active ? 'bg-gray-100' : ''
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            Move
                          </button>
                        )}
                      </Menu.Item>
                    )}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleCopyLink}
                        className={`${active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className={`${active ? 'bg-gray-100' : ''
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                      >
                        Email
                      </button>
                    )}
                  </Menu.Item>
                  {userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setIsShareFileModalOpen(true)}
                          className={`${active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                        >
                          Share
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  {(userData.roleTitle === 'Admin'  || userData.roleTitle === 'Human Resource' || files?.permission?.includes('edit') || files?.sharedItem?.permission?.includes('edit')) && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => deleteFile(fileId)}
                          className={`${active ? 'bg-gray-100' : ''
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                        >
                          Delete
                        </button>
                      )}
                    </Menu.Item>
                  )}
                </div>
              </Menu.Items>
            </Menu>
          </div>

          <Icon className="h-10 w-10 mb-2" style={{ color: getIconColor(fileName) }} />
          <p className="text-md font-semibold truncate w-full px-1" style={{ color: 'var(--sidebar-text-primary)' }}>{fileName}</p>
          <p className="text-xs" style={{ color: 'var(--sidebar-text-primary)' }}>File Size: {formatFileSize(fileSize)}</p>
          <p className="text-xs text-gray-500">
            Uploaded at: {formatDateTime(createdAt)}
          </p>
        </div>
      )}
      {isShareFileModalOpen && (
        <ShareFileModal
          isOpen={isShareFileModalOpen}
          onClose={() => setIsShareFileModalOpen(false)}
          path={files}
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
        open={deleteModalOpen}
        title="Delete File"
        subtitle="Are you sure you want to delete this file?"
        entityName={fileName || 'Untitled File'}
        warningMessage="This action cannot be undone. The file will be permanently deleted."
        onCancel={() => {
          setDeleteModalOpen(false);
          setFileToDelete(null);
        }}
        onDelete={confirmDeleteFile}
        isLoading={isDeleting}
      />
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendFileEmail}
        title="Send File Email"
        showSubject
        defaultSubject="File shared with you."
        includeTermsAndConditions={false}
        defaultEmailBody={`<p>Hello — please find the attached file: <strong>${fileName || 'file'}</strong>.</p>`}
      />
    </>
  );
};

export default FileBox;
