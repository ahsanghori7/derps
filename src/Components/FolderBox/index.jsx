import React, { useState } from 'react';
import { SVG } from '../../assets/svg';
import { Menu } from '@headlessui/react';
import { FiMoreVertical } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { deleteRequest, putRequestWithBodyAndToken, buildAuthHeaders } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import OneFieldModal from '../OneFieldModal';
import ShareFileModal from '../ShareFileModal';
import DeleteConfirmationModal from '../DeleteModal';

const FolderBox = ({ files, onClick, onRename, onMove, onDelete }) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [oneFieldModalOpen, setOneFieldModalOpen] = useState(false);
    const [oneFieldModalData, setOneFieldModalData] = useState('');
    const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const capitalizeFirst = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };


    const deleteFolder = async (id) => {
        setFolderToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDeleteFolder = async () => {
        if (!folderToDelete) return;
        
        setIsDeleting(true);
        try {
            const result = await deleteRequest(`${baseURl}folder/${folderToDelete}`, accessToken);
            toast.success(result.messages || 'Folder deleted successfully');
            onRename();
        } catch (error) {
            toast.error(error.message || "Something went wrong while deleting the folder");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setFolderToDelete(null);
        }
    };

    const handleDownloadFolder = async (e) => {
        e.stopPropagation();
        const folderId = files?.folder?.id ? files?.folder?.id : files.id;
        const downloadUrl = `${baseURl}folder/${folderId}/download`;

        try {
            // Pre-check with a normal fetch so a "no files"/"not found" error can be
            // shown as a toast — a plain <a> navigation can't inspect the response.
            const response = await fetch(downloadUrl, {
                headers: buildAuthHeaders(accessToken),
            });

            if (!response.ok) {
                let message = 'Something went wrong while downloading the folder';
                try {
                    const data = await response.json();
                    message = data?.message || message;
                } catch (_) {
                    // response body wasn't JSON — keep the default message
                }
                toast.error(message);
                return;
            }

            // Discard this check's body; the real download below is handled natively by the browser.
            response.body?.cancel?.();

            // access_token as a query param lets the browser handle the download natively
            // (passport-http-bearer accepts it as a fallback to the Authorization header)
            const link = document.createElement('a');
            link.href = `${downloadUrl}?access_token=${encodeURIComponent(accessToken)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast.error(error.message || 'Something went wrong while downloading the folder');
        }
    };

    const handleRenameFolder = async (name) => {
        try {
            setOneFieldModalOpen(false);
            const result = await putRequestWithBodyAndToken(
                `${baseURl}folder/${oneFieldModalData}`,
                accessToken,
                { name }
            );
            toast.success(result.messages || 'Folder renamed successfully');
            onRename();
        } catch (error) {
            toast.error(error.message || 'Error renaming folder');
        }
    };

    return (
        <>
            <div
                className="w-80 min-h-14 border rounded-xl shadow-sm p-3 flex flex-row items-center justify-between gap-3 hover:shadow-md transition bg-[var(--dashboard-card-bg2)] cursor-pointer"
                onClick={() => onClick(files.id)}
            >
                <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                    <SVG.FolderIcon style={{ width: '20px', height: '20px' }} />
                    <p
                        className="text-base font-medium leading-5 break-words line-clamp-2"
                        style={{ color: 'var(--sidebar-text-primary)' }}
                        title={capitalizeFirst(files?.name || files?.folder?.name)}
                    >
                        {capitalizeFirst(files?.name || files?.folder?.name)}
                    </p>
                </div>
                {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' || files?.permission?.includes('edit') || files?.permission?.includes('delete') || files?.sharedItem?.permission?.includes('edit') || files?.sharedItem?.permission?.includes('delete')) && (
                    <Menu as="div" className="relative inline-block text-left " >
                        <Menu.Button className="focus:outline-none inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                            <FiMoreVertical className="h-5 w-5 text-gray-600" />
                        </Menu.Button>

                        <Menu.Items className="absolute right-0 mt-1 w-40 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="px-1 py-1">
                                {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' || files?.permission?.includes('edit') || files?.sharedItem?.permission?.includes('edit')) && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOneFieldModalOpen(true);
                                                    setOneFieldModalData(files?.folder?.id ? files?.folder?.id : files.id);
                                                }}
                                                className={`${active ? 'bg-gray-100' : ''
                                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                                            >
                                                Rename
                                            </button>
                                        )}
                                    </Menu.Item>
                                )}
                                {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource' || files?.permission?.includes('edit') || files?.sharedItem?.permission?.includes('edit')) && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                disabled={!onMove}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMove?.(files?.folder?.id ? files?.folder?.id : files.id)
                                                }}
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
                                            onClick={handleDownloadFolder}
                                            className={`${active ? 'bg-gray-100' : ''
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                                        >
                                            Download
                                        </button>
                                    )}
                                </Menu.Item>
                                {(userData.roleTitle === 'Admin' || userData.roleTitle === 'Human Resource') && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsShareFileModalOpen(true)
                                                }}
                                                className={`${active ? 'bg-gray-100' : ''
                                                    } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-700`}
                                            >
                                                Share
                                            </button>
                                        )}
                                    </Menu.Item>
                                )}
                                {(userData.roleTitle === 'Admin'  || userData.roleTitle === 'Human Resource' || files?.permission?.includes('delete') || files?.sharedItem?.permission?.includes('delete')) && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteFolder(files.id)
                                                }}
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
                )}
            </div>

            {isShareFileModalOpen && (
                <ShareFileModal
                    isOpen={isShareFileModalOpen}
                    onClose={() => setIsShareFileModalOpen(false)}
                    path={files}
                    fileShared={false}
                />
            )}
            {oneFieldModalOpen && (
                <OneFieldModal
                    fieldTitle="Enter Folder Name"
                    fieldPlaceholder="Enter Name"
                    modalTitle="Rename Folder"
                    isOpen={oneFieldModalOpen}
                    onClose={() => setOneFieldModalOpen(false)}
                    onSubmit={handleRenameFolder}
                    defaultValue={files?.name || files?.folder?.name || ''}
                    buttonName="Rename"
                />
            )}
            <DeleteConfirmationModal
                open={deleteModalOpen}
                title="Delete Folder"
                subtitle="Are you sure you want to delete this folder?"
                entityName={files?.name || files?.folder?.name || 'Untitled Folder'}
                warningMessage="This action cannot be undone. The folder and all its contents will be permanently deleted."
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setFolderToDelete(null);
                }}
                onDelete={confirmDeleteFolder}
                isLoading={isDeleting}
            />
        </>
    );
};

export default FolderBox;
