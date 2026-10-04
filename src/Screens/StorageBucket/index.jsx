import Heading from "../../Components/Heading";
import { useSelector } from "react-redux";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import addIcon from "../../assets/addIcon.png";
import { styled } from '@mui/material/styles';
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Spinner from "../../Components/Spinner";
import { SVG } from "../../assets/svg";
import FileBox from "../../Components/FileBox";
import FileTable from "../../Components/FileTable";
import FolderBox from "../../Components/FolderBox";
import FileUploadModal from "../../Components/FileUploadModal";
import OneFieldModal from "../../Components/OneFieldModal";
import { toast } from "react-toastify";
import FolderUpload from "../../Components/FolderUpload";
import ViewToggle from "../../Components/ViewToggle";

const getStorageBasePath = (pathname) => {
    const pathParts = pathname.split('/').filter(Boolean);
    const storageBucketIndex = pathParts.indexOf('storageBucket');
    if (storageBucketIndex === -1) return '/home/storageBucket';
    return `/${pathParts.slice(0, storageBucketIndex + 1).join('/')}`;
};

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

const StorageBucket = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const storageBasePath = getStorageBasePath(location.pathname);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    // Update browser tab title
    usePageTitle("Drive", location);

    const [loading, setLoading] = useState(false);
    const [folderContentLoading, setFolderContentLoading] = useState(false);
    const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
    const [isFolderCreateModalOpen, setIsFolderCreateModalOpen] = useState(false);
    const [isFolderUploadModalOpen, setIsFolderUploadModalOpen] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [rootFolderId, setRootFolderId] = useState(null);
    const [rootFolderPermission, setRootFolderPermission] = useState(false);
    const [selectedFolderPermission, setSelectedFolderPermission] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [folderList, setFolderList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [selectedMoveFolder, setSelectedMoveFolder] = useState(null);
    const [selectedMoveFile, setSelectedMoveFile] = useState(null);
    const [moveSourceFolderId, setMoveSourceFolderId] = useState(null);
    const [moveDestinationSelected, setMoveDestinationSelected] = useState(false);
    const [moveSubmitting, setMoveSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [breadcrumb, setBreadcrumb] = useState([{ name: 'All', id: null }]);
    const [folderData, setFolderData] = useState([]);
    const [droppedFiles, setDroppedFiles] = useState(null); // To pass files to modal
    const [isDragging, setIsDragging] = useState(false);
    const [sectionViewModes, setSectionViewModes] = useState({});
    const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);

    const breadcrumbRef = useRef(breadcrumb);
    const folderEditByIdRef = useRef({});
    const folderFetchIdRef = useRef(0);
    const actionDropdownRef = useRef(null);

    const clearFolderContent = () => {
        setFolderList([]);
        setFolderData([]);
    };

    const beginFolderContentLoad = () => {
        folderFetchIdRef.current += 1;
        clearFolderContent();
        setFolderContentLoading(true);
    };

    const isAdmin = userData?.roleTitle === 'Admin' || userData?.roleTitle === 'Human Resource';
    const canUpload = isAdmin || (selectedFolderId ? selectedFolderPermission : rootFolderPermission);
    const moveInProgress = Boolean(selectedMoveFolder || selectedMoveFile);
    const moveDestinationFolderId = selectedFolderId ?? rootFolderId ?? null;
    const isDifferentMoveDestination =
        moveDestinationFolderId != null && String(moveDestinationFolderId) !== String(moveSourceFolderId ?? '');
    const isFolderMovingIntoItself =
        selectedMoveFolder && String(moveDestinationFolderId ?? '') === String(selectedMoveFolder);
    const canConfirmMove =
        moveInProgress && moveDestinationSelected && isDifferentMoveDestination && !isFolderMovingIntoItself && canUpload && !moveSubmitting;
    const getSectionViewMode = (sectionKey) => sectionViewModes[sectionKey] || "table";
    const setSectionViewMode = (sectionKey, mode) => {
        setSectionViewModes((prev) => ({ ...prev, [sectionKey]: mode }));
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (actionDropdownRef.current && !actionDropdownRef.current.contains(e.target)) {
                setIsActionDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        breadcrumbRef.current = breadcrumb;
    }, [breadcrumb]);

    const recordFolderEditForId = (folderId, src) => {
        if (folderId == null || src == null) return;
        const canEdit =
            src.permission?.includes('edit') ||
            src.sharedItem?.permission?.includes('edit');
        folderEditByIdRef.current = {
            ...folderEditByIdRef.current,
            [String(folderId)]: Boolean(canEdit),
        };
    };

    const mergeFolderEditRefsFromFolderdsPayload = (dataObj) => {
        if (!dataObj?.folderds || !Array.isArray(dataObj.folderds)) return;
        const next = { ...folderEditByIdRef.current };
        dataObj.folderds.forEach((entry) => {
            const fid = entry.folder?.id ?? entry.itemId;
            if (fid != null) {
                next[String(fid)] = Boolean(
                    entry.permission?.includes('edit') ||
                        entry.sharedItem?.permission?.includes('edit')
                );
            }
        });
        folderEditByIdRef.current = next;
    };

    // Parse URL path to extract folder information
    const parseUrlPath = () => {
        const pathParts = location.pathname.split('/').filter(part => part);
        const storageBucketIndex = pathParts.indexOf('storageBucket');
        
        if (storageBucketIndex === -1 || pathParts.length === storageBucketIndex + 1) {
            // Root level - no folder specified
            return { folderPath: [], folderId: null };
        }
        
        // Extract folder path after storageBucket
        // Format: /home/storageBucket/id1/name1/id2/name2/id3/name3
        const folderPath = pathParts.slice(storageBucketIndex + 1);
        
        // The folder ID is the last ID in the path (even indices: 0, 2, 4...)
        let folderId = null;
        // Start from the last possible ID position (even index from the end)
        const lastIdIndex = folderPath.length % 2 === 0 ? folderPath.length - 2 : folderPath.length - 1;
        for (let i = lastIdIndex; i >= 0; i -= 2) {
            if (folderPath[i] && !isNaN(folderPath[i])) {
                folderId = folderPath[i];
                break;
            }
        }
        
        return { 
            folderPath, 
            folderId 
        };
    };

    // Navigate to a specific folder
    const navigateToFolder = (folderName, folderId) => {
        const sanitizedName = folderName ? folderName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() : '';
        const newPath = folderId ? `${storageBasePath}/${folderId}/${sanitizedName}` : storageBasePath;
        navigate(newPath);
        
        // Update selected folder ID - the actual data fetching will be handled by the useEffect
        if (folderId) {
            setSelectedFolderId(folderId);
        } else {
            setSelectedFolderId(null);
            setSelectedFolderPermission(false);
        }
    };

    // Navigate to breadcrumb level
    const navigateToBreadcrumb = (index) => {
        // Build complete path up to the selected breadcrumb index
        const pathSegments = [];
        for (let i = 1; i <= index; i++) {
            const crumb = breadcrumb[i];
            if (crumb?.id && crumb?.name) {
                const sanitizedName = crumb.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
                pathSegments.push(crumb.id, sanitizedName);
            }
        }
        
        const folderId = index === 0 ? null : breadcrumb[index]?.id;
        const newPath = pathSegments.length > 0 
            ? `${storageBasePath}/${pathSegments.join('/')}`
            : storageBasePath;
            
        navigate(newPath);
        
        setSelectedFolderId(folderId);
        setSelectedFolderPermission(breadcrumb[index]?.permission?.includes('edit') || breadcrumb[index]?.sharedItem?.permission?.includes('edit') ? true : false);
    };

    const fetchData = ({ silent = false } = {}) => {
        let api = ''
        if (isAdmin) {
            api = `${baseURl}files`
        } else {
            api = `${baseURl}files?userId=${userData?.id}`
        }
        if (!silent) setLoading(true);
        getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                setFileList(result?.data)
                if (!silent) setLoading(false)
            })
            .catch(error => {
                if (!silent) setLoading(false)
            })
    }
    const fetchData2 = () => {
        let api = ''
        if (isAdmin) {
            api = `${baseURl}folder`
        } else {
            api = `${baseURl}folder?userId=${userData?.id}`
        }
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                let folders = [];

                if (Array.isArray(result?.data?.data)) {
                    // Case 2: Standard API response
                    folders = result.data.data;
                } else if (Array.isArray(result?.data?.folderds)) {
                    // Case 1: Admin-style response
                    folders = result.data;
                }
                if (folders) {
                    setFolderList(folders);
                    mergeFolderEditRefsFromFolderdsPayload(result?.data);

                    const rootFolder = Array.isArray(folders)
                        ? folders.find((f) => (f?.parentId ?? null) === null)
                        : (folders?.folder ?? folders);

                    setRootFolderId(rootFolder?.id ?? null);
                    setRootFolderPermission(
                        rootFolder?.permission?.includes('edit') || rootFolder?.sharedItem?.permission?.includes('edit')
                            ? true
                            : false
                    );
                    // Keep selected folder controlled by route effect to avoid deep-link flicker.
                } else {
                    setFolderList([]);
                    setSelectedFolderPermission(false);
                    setRootFolderId(null);
                    setRootFolderPermission(false);
                }

                setLoading(false);
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const unwrapFolderData = (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        if (raw.id != null) return raw;
        if (raw.data && typeof raw.data === 'object' && raw.data.id != null) return raw.data;
        return raw;
    };

    const fetchData4 = (folderId, { manageLoading = true } = {}) => {
        if (!folderId) return Promise.resolve({ success: false });

        const fetchId = folderFetchIdRef.current;
        if (manageLoading) setFolderContentLoading(true);

        let api = ''
        if (isAdmin) {
            api = `${baseURl}folder/${folderId}`
        } else {
            api = `${baseURl}folder/${folderId}?userId=${userData?.id}`
        }
        return getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                if (fetchId !== folderFetchIdRef.current) {
                    return { success: false, stale: true };
                }

                const data = unwrapFolderData(result?.data);
                if (!data?.id) {
                    if (manageLoading) setFolderContentLoading(false);
                    return { success: false };
                }
                setFolderList([data]); // wrap in array
                setSelectedFolderId(data?.id);

                const idStr = data?.id != null ? String(data.id) : '';
                const shared = data?.sharedItem;
                const sharedForCurrentUser =
                    shared &&
                    userData?.id != null &&
                    Number(shared.userId) === Number(userData.id);

                const apiEdit = Boolean(
                    data?.permission?.includes('edit') ||
                        (sharedForCurrentUser && shared?.permission?.includes('edit'))
                );

                const crumb = breadcrumbRef.current?.find((b) => String(b?.id) === idStr);
                const fromBreadcrumb = Boolean(
                    crumb?.permission?.includes('edit') ||
                        crumb?.sharedItem?.permission?.includes('edit')
                );

                const fromFolderListCache = Boolean(folderEditByIdRef.current[idStr]);

                const canEdit = apiEdit || fromBreadcrumb || fromFolderListCache;
                setSelectedFolderPermission(canEdit);

                setFolderData(data?.subFolders || []);
                if (manageLoading) setFolderContentLoading(false);
                return { success: true, data };
            })
            .catch(error => {
                if (fetchId === folderFetchIdRef.current && manageLoading) {
                    setFolderContentLoading(false);
                }
                toast.error(error?.message || 'You do not have permission to access this folder');
                return { success: false, error };
            });
    };

    const fetchData3 = () => {
        let api = ''
        if (isAdmin) {
            api = `${baseURl}files/type/?type=${selectedCategory}`
        } else {
            api = `${baseURl}files/type/?type=${selectedCategory}&userId=${userData?.id}`
        }
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                setFilteredList(result?.data)
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        if (selectedCategory !== 'All') {
            fetchData3();
        }
    }, [selectedCategory]);

    // Handle URL changes and initialize based on path
    useEffect(() => {
        const { folderId, folderPath } = parseUrlPath();

        fetchData({ silent: true });

        if (!folderId) {
            // Root level
            setFolderContentLoading(false);
            setSelectedFolderId(null);
            setSelectedFolderPermission(false);
            setBreadcrumb([{ name: 'All', id: null }]);
            breadcrumbRef.current = [{ name: 'All', id: null }];
            fetchData2();
        } else {
            beginFolderContentLoad();

            // Rebuild breadcrumb from URL path
            const newBreadcrumb = [{ name: 'All', id: null }];
            const folderIds = [];
            
            // Extract folder IDs from path (even indices: 0, 2, 4...)
            for (let i = 0; i < folderPath.length; i += 2) {
                if (!isNaN(folderPath[i])) {
                    folderIds.push(folderPath[i]);
                }
            }
            
            // Fetch parent folders for breadcrumb; current folder via fetchData4 (avoids duplicate call)
            const parentFolderIds = folderIds.slice(0, -1);
            const getBreadcrumbEntry = (id, urlName) => {
                const existing = breadcrumbRef.current?.find((b) => String(b?.id) === String(id));
                if (existing?.name) return existing;

                if (urlName) {
                    const label = urlName
                        .split('-')
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' ');
                    return { name: label, id };
                }

                return null;
            };

            const fetchPromises = parentFolderIds.map(async (id, index) => {
                try {
                    let api = '';
                    if (isAdmin) {
                        api = `${baseURl}folder/${id}`;
                    } else {
                        api = `${baseURl}folder/${id}?userId=${userData?.id}`;
                    }
                    const result = await getRequestWithOutBody(api, accessToken);
                    const folder = unwrapFolderData(result?.data);
                    if (folder?.id && folder?.name) return folder;

                    const urlName = folderPath[index * 2 + 1];
                    return getBreadcrumbEntry(id, urlName);
                } catch (error) {
                    const urlName = folderPath[index * 2 + 1];
                    return getBreadcrumbEntry(id, urlName);
                }
            });

            Promise.all(fetchPromises).then(async (parentFolders) => {
                parentFolders.forEach((folder) => {
                    if (folder?.id && folder?.name) {
                        newBreadcrumb.push({
                            name: folder.name,
                            id: folder.id,
                            permission: folder.permission,
                            sharedItem: folder.sharedItem
                        });
                    }
                });

                const folderResult = await fetchData4(folderId);
                const currentFolder = folderResult?.success ? folderResult.data : null;
                const lastUrlName = folderPath[folderPath.length - 1];

                if (currentFolder?.id && currentFolder?.name) {
                    newBreadcrumb.push({
                        name: currentFolder.name,
                        id: currentFolder.id,
                        permission: currentFolder.permission,
                        sharedItem: currentFolder.sharedItem
                    });
                } else {
                    const fallback = getBreadcrumbEntry(folderId, lastUrlName);
                    if (fallback?.name) {
                        newBreadcrumb.push(fallback);
                    }
                }

                setBreadcrumb(newBreadcrumb);
                breadcrumbRef.current = newBreadcrumb;
                setSelectedFolderId(folderId);

                if (!isAdmin && userData?.id && accessToken) {
                    const idForPerm = String(folderId);
                    if (!(idForPerm in folderEditByIdRef.current)) {
                        getRequestWithOutBody(`${baseURl}folder?userId=${userData.id}`, accessToken)
                            .then((permResult) => {
                                mergeFolderEditRefsFromFolderdsPayload(permResult?.data);
                                if (folderEditByIdRef.current[idForPerm]) {
                                    setSelectedFolderPermission(true);
                                }
                            })
                            .catch(() => { });
                    }
                }
            });
        }
    }, [location.pathname]);

    const getAdminFolderContents = () => {
        const folders = [];
        const files = [];
        let filesFolderId = selectedFolderId ?? rootFolderId ?? null;

        if (!Array.isArray(folderList)) {
            return { folders, files, filesFolderId };
        }

        folderList.forEach((item) => {
            if (Array.isArray(item?.subFolders)) {
                item.subFolders.forEach((subFolder) => folders.push(subFolder));
                if (item.files?.length) {
                    files.push(...item.files);
                    filesFolderId = item?.id ?? item?.folder?.id ?? filesFolderId;
                }
            } else if (item?.id) {
                folders.push(item);
            }
        });

        return { folders, files, filesFolderId };
    };

    const refreshCurrentLocation = () => {
        const { folderId } = parseUrlPath();
        const activeFolderId = folderId || selectedFolderId;

        if (selectedCategory === 'All') {
            fetchData();
            if (activeFolderId) {
                fetchData4(activeFolderId);
            } else {
                fetchData2();
            }
        } else {
            fetchData3();
            if (activeFolderId) {
                fetchData4(activeFolderId);
            }
        }
    };

    const handleFolderCreate = async (title) => {
        try {
            const parentIdToSend = selectedFolderId ?? rootFolderId ?? null;
            const payload = {
                name: title,
                userId: userData?.id,
                parentId: parentIdToSend,
            };
            const result = await postRequestWithBodyAndToken(`${baseURl}folder`, accessToken, payload)
            toast.success(result.message);
            setIsFolderCreateModalOpen(false);
            if (selectedCategory === 'All') {
                fetchData2();
            } else {
                fetchData3(); // refresh filtered list
            }

            // ✅ Refresh current folder if any
            if (selectedFolderId) {
                fetchData4(selectedFolderId);
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        }
    }

    const handleFolderClick = (folder) => {
        const folderId = folder?.id;
        if (!folderId) return;
        if (moveInProgress) setMoveDestinationSelected(true);

        beginFolderContentLoad();

        const currentPath = location.pathname;
        const sanitizedName = folder?.name ? folder.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() : '';
        
        // Build new path by appending folder id and name
        const newPath = currentPath === storageBasePath 
            ? `${storageBasePath}/${folderId}/${sanitizedName}`
            : `${currentPath}/${folderId}/${sanitizedName}`;

        // Update breadcrumb
        setBreadcrumb((prev) => {
            const exists = prev.some((b) => String(b?.id) === String(folderId));
            let next;
            if (exists) {
                const idx = prev.findIndex((b) => String(b?.id) === String(folderId));
                next = prev.slice(0, idx + 1);
            } else {
                next = [
                    ...prev,
                    { name: folder?.name, id: folderId, permission: folder?.permission, sharedItem: folder?.sharedItem },
                ];
            }
            breadcrumbRef.current = next;
            return next;
        });

        setSelectedFolderPermission(folder?.permission?.includes('edit') || folder?.sharedItem?.permission?.includes('edit') ? true : false);
        recordFolderEditForId(folderId, folder);
        setSelectedFolderId(folderId);
        navigate(newPath);
    };

    const handleFolderClick2 = (folder) => {
        const folderId = folder?.folder?.id;
        if (!folderId) return;
        if (moveInProgress) setMoveDestinationSelected(true);

        beginFolderContentLoad();

        setBreadcrumb((prev) => {
            const exists = prev.some((b) => String(b?.id) === String(folderId));
            let next;
            if (exists) {
                const idx = prev.findIndex((b) => String(b?.id) === String(folderId));
                next = prev.slice(0, idx + 1);
            } else {
                next = [
                    ...prev,
                    { name: folder?.folder?.name, id: folderId, permission: folder?.permission, sharedItem: folder?.sharedItem },
                ];
            }
            breadcrumbRef.current = next;
            
            // Build complete URL path
            const pathSegments = [];
            next.forEach((crumb, index) => {
                if (index > 0 && crumb.id && crumb.name) {
                    const sanitizedName = crumb.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
                    pathSegments.push(crumb.id, sanitizedName);
                }
            });
            
            const basePath = getStorageBasePath(location.pathname);
            const newPath = pathSegments.length > 0 
                ? `${basePath}/${pathSegments.join('/')}`
                : basePath;
                
            navigate(newPath);
            return next;
        });

        setSelectedFolderPermission(folder?.permission?.includes('edit') || folder?.sharedItem?.permission?.includes('edit') ? true : false);
        recordFolderEditForId(folderId, folder);
        setSelectedFolderId(folderId);
    };

    const handleBreadcrumbClick = (index) => {
        const nextCrumb = breadcrumb[index];
        if (!nextCrumb) return;
        if (moveInProgress) setMoveDestinationSelected(true);
        setBreadcrumb((prev) => {
            const next = prev.slice(0, index + 1);
            breadcrumbRef.current = next;
            return next;
        });
        navigateToBreadcrumb(index);
    };

    const AudioIcon = (props) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
        </svg>
    );

    const typeToIcon = {
        all: SVG.DocumentsFile,
        document: SVG.DocumentsFile,
        image: SVG.PictureFile,
        video: SVG.VideoFiles,
        download: SVG.DownloadFiles,
        audio: AudioIcon,
        archive: SVG.DownloadFiles,
    };

    const typeToIconColor = {
        image: '#22c55e',
        video: '#ef4444',
        audio: '#f59e0b',
    };


    const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const handleRenameFolder = () => {
        refreshCurrentLocation();
    }
    const deleteFolder = () => {
        refreshCurrentLocation();
    }

    const startFolderMove = (folderId) => {
        if (moveInProgress) return;
        setSelectedMoveFolder(folderId);
        setSelectedMoveFile(null);
        setMoveSourceFolderId(selectedFolderId ?? null);
        setMoveDestinationSelected(false);
    };

    const startFileMove = (fileId, sourceFolderId) => {
        if (moveInProgress) return;
        setSelectedMoveFile(fileId);
        setSelectedMoveFolder(null);
        setMoveSourceFolderId(sourceFolderId ?? selectedFolderId ?? null);
        setMoveDestinationSelected(false);
    };

    const clearMove = () => {
        setSelectedMoveFolder(null);
        setSelectedMoveFile(null);
        setMoveSourceFolderId(null);
        setMoveDestinationSelected(false);
    };

    const cancelMove = () => {
        if (!moveSubmitting) clearMove();
    };

    const handleMove = async () => {
        if (!canConfirmMove || !selectedMoveFolder) return;
        setMoveSubmitting(true);
        try {
            let apiData = {
                newParentId: moveDestinationFolderId,
            }
            const result = await putRequestWithBodyAndToken(`${baseURl}folder/move/${selectedMoveFolder}`, accessToken, apiData);
            clearMove();
            refreshCurrentLocation();
            toast.success(result.message || result.messages || 'Folder moved successfully');
        } catch (error) {
            toast.error(error.message || "Something went wrong while moving the folder");
        } finally {
            setMoveSubmitting(false);
        }
    };
    const handleFileMove = async () => {
        if (!canConfirmMove || !selectedMoveFile) return;
        setMoveSubmitting(true);
        try {
            let apiData = {
                newFolderId: moveDestinationFolderId,
            }
            const result = await putRequestWithBodyAndToken(`${baseURl}files/move/${selectedMoveFile}`, accessToken, apiData);
            clearMove();
            refreshCurrentLocation();
            toast.success(result.message || result.messages || 'File moved successfully');
        } catch (error) {
            toast.error(error.message || "Something went wrong while moving the file");
        } finally {
            setMoveSubmitting(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!canUpload) {
            toast.error('You do not have permission to upload in this folder');
            return;
        }
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            setDroppedFiles(files);
            setIsFileUploadModalOpen(true);
        }
    };

    return (
        <>
            <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
                <HeaderWrapper>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Drive Bucket '}
                        Fontsize={30}
                    />
                    {moveInProgress ? (
                        <div className="flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={cancelMove}
                                disabled={moveSubmitting}
                                className="h-9 sm:h-10 px-4 rounded text-xs sm:text-base font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ color: 'var(--sidebar-text-primary)', backgroundColor: 'var(--dashboard-card-bg)' }}
                            >
                                Cancel
                            </button>
                            <BottonWithIcon
                                backgroundColor={canConfirmMove ? '#0C79F7' : '#94A3B8'}
                                svg={<span style={{ fontSize: 14, marginRight: 8 }}>-&gt;</span>}
                                title={selectedMoveFile ? 'Move File Here' : 'Move Folder Here'}
                                color={'var(--sidebar-text-selected)'}
                                iconSize={'w-2 sm:w-4 h-2 sm:h-4'}
                                className="h-9 text-xs sm:h-10 sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                                fontWeight={500}
                                disabled={!canConfirmMove}
                                onClick={selectedMoveFile ? handleFileMove : handleMove}
                            />
                        </div>
                    ) : (
                        canUpload
                    ) ? (
                        <div className="relative" ref={actionDropdownRef}>
                            <button
                                onClick={() => setIsActionDropdownOpen((prev) => !prev)}
                                style={{ backgroundColor: '#0C79F7' }}
                                className="flex items-center gap-2 px-4 h-9 sm:h-10 rounded-lg text-white text-sm font-medium"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                </svg>
                                New File
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>
                            {isActionDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden" style={{ minWidth: 180 }}>
                                    <button
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                                        onClick={() => { setIsFolderCreateModalOpen(true); setIsActionDropdownOpen(false); }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                                        </svg>
                                        New Folder
                                    </button>
                                    <button
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                                        onClick={() => { setIsFolderUploadModalOpen(true); setIsActionDropdownOpen(false); }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="12 12 12 8"/><polyline points="9 11 12 8 15 11"/>
                                        </svg>
                                        Upload Folder
                                    </button>
                                    <button
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                                        onClick={() => { setIsFileUploadModalOpen(true); setIsActionDropdownOpen(false); }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="13" x2="12" y2="17"/><polyline points="9 15 12 12 15 15"/>
                                        </svg>
                                        Upload File
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </HeaderWrapper>
                {
                    loading ? (
                        <div className="text-center w-full mx-auto">
                            <Spinner size="w-10 h-10" />
                        </div>
                    ) : (
                        <div className="w-full p-6  mt-1" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                            <div className="flex flex-wrap gap-4 mb-6">
                                {fileList?.map((item, idx) => {
                                    const categoryTitle = capitalizeFirst(item.type);
                                    const isSelected = selectedCategory === categoryTitle;
                                    const Icon = typeToIcon[item.type] || SVG.DocumentsFile;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setSelectedCategory(categoryTitle);
                                                if (categoryTitle === 'All') {
                                                    if (moveInProgress) setMoveDestinationSelected(true);
                                                    setBreadcrumb([{ name: 'All', id: null }]); // ✅ Reset breadcrumb
                                                    breadcrumbRef.current = [{ name: 'All', id: null }];
                                                    setSelectedFolderId(null); // ✅ Reset folder selection
                                                    setSelectedFolderPermission(false);
                                                    fetchData2(); // ✅ Reload folders
                                                    navigate(storageBasePath);
                                                }
                                            }}
                                            className={`flex items-center w-40 gap-3 px-4 py-2 rounded-md cursor-pointer transition ${isSelected ? 'bg-[#526EFF] text-white' : 'bg-transparent text-[#526EFF] hover:bg-gray-200 border border-[#526EFF]'
                                                }`}
                                        >
                                            <Icon style={{ color: isSelected ? '#FFFFFF' : (typeToIconColor[item.type] || '#526EFF') }} />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{categoryTitle}</span>
                                                {categoryTitle !== 'All' ? (
                                                    <span className="text-xs">{item.count} Files</span>
                                                ) : (
                                                    <span className="text-xs">{fileList?.reduce((sum, it) => (it?.type !== 'all' ? sum + (it?.count || 0) : sum), 0) ?? 0} Files</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedCategory === 'All' && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        {breadcrumb.map((item, index) => (
                                            <div key={index} className="flex items-center">
                                                <button
                                                    onClick={() => handleBreadcrumbClick(index)}
                                                    // className="hover:underline text-blue-600"
                                                    style={{ color: 'var(--sidebar-text-primary)', fontWeight: 700, fontSize: 20 }}
                                                >
                                                    {item.name}
                                                </button>
                                                {index !== breadcrumb.length - 1 && <span className="ml-2 mr-1 ">{'>'}</span>}
                                            </div>
                                        ))}
                                    </div>


                                </div>
                            )}
                            {folderContentLoading ? (
                                <div className="text-center w-full mx-auto py-10">
                                    <Spinner size="w-10 h-10" />
                                </div>
                            ) : (
                                <>
                            {isAdmin && (
                                selectedCategory === 'All' ? (
                                    <div className={`mt-1 ${isDragging ? "border-4 border-blue-400 border-dashed bg-blue-50" : ""}`}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}>
                                        {(() => {
                                            const { folders, files, filesFolderId } = getAdminFolderContents();
                                            const hasFolders = folders.length > 0;
                                            const hasFiles = files.length > 0;

                                            if (!hasFolders && !hasFiles) return null;

                                            return (
                                                <>
                                                    {hasFolders && (
                                                        <div className="mt-3 flex flex-wrap gap-3">
                                                            {folders.map((folder, index) => (
                                                                <FolderBox
                                                                    key={`${folder?.id ?? index}`}
                                                                    files={folder}
                                                                    onClick={() => handleFolderClick(folder)}
                                                                    onRename={handleRenameFolder}
                                                                    onDelete={deleteFolder}
                                                                    onMove={moveInProgress ? undefined : startFolderMove}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {hasFiles && (
                                                        <div className={hasFolders ? 'mt-4' : 'mt-3'}>
                                                            <div className="flex justify-between">
                                                                <Heading
                                                                    Fontweight={700}
                                                                    color={'var(--sidebar-text-primary)'}
                                                                    Heading={'Files'}
                                                                    Fontsize={20}
                                                                />
                                                                <div className="flex justify-end mb-3">
                                                                    <ViewToggle value={getSectionViewMode('admin-root-files')} onChange={(mode) => setSectionViewMode('admin-root-files', mode)} />
                                                                </div>
                                                            </div>
                                                            {getSectionViewMode('admin-root-files') === 'grid' ? (
                                                                <div className="flex flex-wrap gap-4">
                                                                    {files.map((file, fileIndex) => (
                                                                        <FileBox
                                                                            key={`admin-file-${fileIndex}`}
                                                                            files={file}
                                                                            onRename={refreshCurrentLocation}
                                                                            onMove={moveInProgress ? undefined : startFileMove}
                                                                            selectedCategory={selectedCategory}
                                                                            folderId={filesFolderId}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <FileTable
                                                                    files={files}
                                                                    onOpen={(file) => handleFolderClick(file)}
                                                                    onMove={moveInProgress ? undefined : startFileMove}
                                                                    onRename={refreshCurrentLocation}
                                                                    selectedCategory={selectedCategory}
                                                                    folderId={filesFolderId}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        {!folderList ||
                                            folderList.length === 0 ||
                                            (folderList.length === 1 &&
                                                !folderList[0]?.files?.length &&
                                                !folderList[0]?.subFolders?.length) && (
                                                <div className="flex mt-1 items-center justify-center w-full">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'No Folder / File Found'}
                                                        Fontsize={20}
                                                    />
                                                </div>
                                            )}
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <div className="flex justify-end mb-3">
                                            <ViewToggle value={getSectionViewMode("admin-filtered")} onChange={(mode) => setSectionViewMode("admin-filtered", mode)} />
                                        </div>
                                        {getSectionViewMode("admin-filtered") === "grid" ? (
                                            <div className="flex flex-wrap gap-4">
                                                {filteredList?.length > 0 ? (
                                                    filteredList?.map((file, index) => (
                                                        <FileBox key={index} files={file} onRename={refreshCurrentLocation}
                                                            selectedCategory={selectedCategory}
                                                            folderId={selectedFolderId ?? rootFolderId ?? null}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="flex items-center justify-center mt-1">
                                                        <Heading
                                                            Fontweight={700}
                                                            color={'var(--sidebar-text-primary)'}
                                                            Heading={'No Files Found'}
                                                            Fontsize={20}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <FileTable
                                                files={filteredList}
                                                onOpen={(file) => handleFolderClick(file)}
                                                onMove={moveInProgress ? undefined : startFileMove}
                                                onRename={refreshCurrentLocation}
                                                selectedCategory={selectedCategory}
                                                folderId={selectedFolderId ?? rootFolderId ?? null}
                                            />
                                        )}
                                    </div>
                                )
                            )}
                            {(userData?.roleTitle !== 'Admin' && userData?.roleTitle !== 'Human Resource') && selectedCategory === 'All' && canUpload && (
                                <div
                                    className={`mt-1 ${isDragging ? "border-4 border-blue-400 border-dashed bg-blue-50" : ""}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                />
                            )}
                            {(userData?.roleTitle !== 'Admin' && userData?.roleTitle !== 'Human Resource') && (
                                selectedCategory === 'All' ? (
                                    <div className="mt-3">
                                        {folderList?.folderds?.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-8">
                                                {folderList?.folderds?.map((item, idx) => {
                                                    return (
                                                        <div key={idx} className="w-full ">
                                                            <div className="flex flex-wrap gap-8">
                                                                <FolderBox
                                                                    key={`${idx}`}
                                                                    files={item}
                                                                    onClick={() => {
                                                                        handleFolderClick2(item);
                                                                    }}
                                                                    onRename={handleRenameFolder}
                                                                    onDelete={deleteFolder}
                                                                    onMove={moveInProgress ? undefined : startFolderMove}
                                                                />
                                                            </div>
                                                            {item.files?.length > 0 && (
                                                                <div className="mt-2">
                                                                    <div className="flex justify-between">
                                                                        <Heading
                                                                            Fontweight={700}
                                                                            color={'var(--sidebar-text-primary)'}
                                                                            Heading={'Files'}
                                                                            Fontsize={20}
                                                                        />
                                                                        <div className="flex justify-end mb-3">
                                                                            <ViewToggle value={getSectionViewMode(`user-folderds-${idx}`)} onChange={(mode) => setSectionViewMode(`user-folderds-${idx}`, mode)} />
                                                                        </div>
                                                                    </div>
                                                                    {getSectionViewMode(`user-folderds-${idx}`) === "grid" ? (
                                                                        <div className="mt-1 flex flex-wrap gap-8">
                                                                            {item.files.map((file, fileIndex) => (
                                                                                <FileBox
                                                                                    key={`${idx}-file-${fileIndex}`}
                                                                                    files={file}
                                                                                    onRename={refreshCurrentLocation}
                                                                                    onMove={moveInProgress ? undefined : startFileMove}
                                                                                    selectedCategory={selectedCategory}
                                                                                    folderId={item?.id ?? item?.folder?.id ?? selectedFolderId ?? rootFolderId ?? null}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <FileTable
                                                                            files={item.files}
                                                                            // onOpen={(file) => handleFolderClick(file)}
                                                                            onMove={moveInProgress ? undefined : startFileMove}
                                                                            onRename={refreshCurrentLocation}
                                                                            selectedCategory={selectedCategory}
                                                                            folderId={item?.id ?? item?.folder?.id ?? selectedFolderId ?? rootFolderId ?? null}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {folderList[0]?.subFolders?.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-8">
                                                {folderList[0]?.subFolders?.map((item, idx) => {
                                                    return (
                                                        <div key={idx} className="w-full">
                                                            <div className="flex flex-wrap gap-8">
                                                                <FolderBox
                                                                    key={`${idx}`}
                                                                    files={item}
                                                                    onClick={() => {
                                                                        handleFolderClick(item);
                                                                    }}
                                                                    onRename={handleRenameFolder}
                                                                    onDelete={deleteFolder}
                                                                    onMove={moveInProgress ? undefined : startFolderMove}
                                                                />
                                                            </div>

                                                            {item.files?.length > 0 && (
                                                                <div className="mt-2">
                                                                    <div className="flex justify-between">
                                                                        <Heading
                                                                            Fontweight={700}
                                                                            color={'var(--sidebar-text-primary)'}
                                                                            Heading={'Files'}
                                                                            Fontsize={20}
                                                                        />
                                                                        <div className="flex justify-end mb-3">
                                                                            <ViewToggle value={getSectionViewMode(`user-subfolders-${idx}`)} onChange={(mode) => setSectionViewMode(`user-subfolders-${idx}`, mode)} />
                                                                        </div>
                                                                    </div>
                                                                    {getSectionViewMode(`user-subfolders-${idx}`) === "grid" ? (
                                                                        <div className="mt-2 flex flex-wrap gap-8">
                                                                            {item.files.map((file, fileIndex) => (
                                                                                <FileBox
                                                                                    key={`${idx}-file-${fileIndex}`}
                                                                                    files={file}
                                                                                    onRename={refreshCurrentLocation}
                                                                                    onMove={moveInProgress ? undefined : startFileMove}
                                                                                    selectedCategory={selectedCategory}
                                                                                    folderId={item?.id ?? item?.folder?.id ?? selectedFolderId ?? rootFolderId ?? null}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <FileTable
                                                                            files={item.files}
                                                                            // onOpen={(file) => handleFolderClick(file)}
                                                                            onMove={moveInProgress ? undefined : startFileMove}
                                                                            onRename={refreshCurrentLocation}
                                                                            selectedCategory={selectedCategory}
                                                                            folderId={item?.id ?? item?.folder?.id ?? selectedFolderId ?? rootFolderId ?? null}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {folderList?.files?.length > 0 ? (
                                            <div className="mt-2">
                                                <div className="flex justify-between">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Files'}
                                                        Fontsize={20}
                                                    />
                                                    <div className="flex justify-end mb-3">
                                                        <ViewToggle value={getSectionViewMode("user-root-files")} onChange={(mode) => setSectionViewMode("user-root-files", mode)} />
                                                    </div>
                                                </div>
                                                {getSectionViewMode("user-root-files") === "grid" ? (
                                                    <div className="mt-1 flex flex-wrap gap-8">
                                                        {folderList.files.map((file, fileIndex) => (
                                                            <FileBox
                                                                key={`${fileIndex}`}
                                                                files={file}
                                                                onRename={refreshCurrentLocation}
                                                                onMove={moveInProgress ? undefined : startFileMove}
                                                                selectedCategory={selectedCategory}
                                                                folderId={selectedFolderId ?? rootFolderId ?? folderList?.id ?? folderList[0]?.id ?? null}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <FileTable
                                                        files={folderList.files}
                                                        // onOpen={(file) => handleFolderClick(file)}
                                                        onMove={moveInProgress ? undefined : startFileMove}
                                                        onRename={refreshCurrentLocation}
                                                        selectedCategory={selectedCategory}
                                                        folderId={selectedFolderId ?? rootFolderId ?? folderList?.id ?? folderList[0]?.id ?? null}
                                                    />
                                                )}
                                            </div>
                                        ) : folderList[0]?.files?.length > 0 ? (
                                            <div className="mt-2">
                                                <div className="flex justify-between">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Files'}
                                                        Fontsize={20}
                                                    />
                                                    <div className="flex justify-end mb-3">
                                                        <ViewToggle value={getSectionViewMode("user-root0-files")} onChange={(mode) => setSectionViewMode("user-root0-files", mode)} />
                                                    </div>
                                                </div>
                                                {getSectionViewMode("user-root0-files") === "grid" ? (
                                                    <div className="mt-1 flex flex-wrap gap-8">
                                                        {folderList[0]?.files?.map((file, fileIndex) => (
                                                            <FileBox
                                                                key={`${fileIndex}`}
                                                                files={file}
                                                                onRename={refreshCurrentLocation}
                                                                onMove={moveInProgress ? undefined : startFileMove}
                                                                selectedCategory={selectedCategory}
                                                                folderId={selectedFolderId ?? rootFolderId ?? folderList?.id ?? folderList[0]?.id ?? null}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <FileTable
                                                        files={folderList[0]?.files}
                                                        // onOpen={(file) => handleFolderClick(file)}
                                                        onMove={moveInProgress ? undefined : startFileMove}
                                                        onRename={refreshCurrentLocation}
                                                        selectedCategory={selectedCategory}
                                                        folderId={selectedFolderId ?? rootFolderId ?? folderList?.id ?? folderList[0]?.id ?? null}
                                                    />
                                                )}
                                            </div>
                                        ) : null}
                                        {folderList &&
                                            folderList.length > 0 &&
                                            (!folderList[0].files || folderList[0].files.length === 0) &&
                                            (!folderList[0].subFolders || folderList[0].subFolders.length === 0) && (
                                                <div className="flex mt-1 items-center justify-center w-full">
                                                    <Heading
                                                        Fontweight={700}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'No Folder / File Found'}
                                                        Fontsize={20}
                                                    />
                                                </div>
                                            )}
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <div className="flex justify-end mb-3">
                                            <ViewToggle value={getSectionViewMode("user-filtered")} onChange={(mode) => setSectionViewMode("user-filtered", mode)} />
                                        </div>
                                        {getSectionViewMode("user-filtered") === "grid" ? (
                                            <div className=" flex flex-wrap gap-4">
                                                {filteredList?.length > 0 ? (
                                                    filteredList?.map((file, index) => (
                                                        <FileBox key={index} files={file} onRename={refreshCurrentLocation}
                                                            selectedCategory={selectedCategory}
                                                            folderId={selectedFolderId ?? rootFolderId ?? null}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="flex items-center justify-center mt-1">
                                                        <Heading
                                                            Fontweight={700}
                                                            color={'var(--sidebar-text-primary)'}
                                                            Heading={'No Files Found'}
                                                            Fontsize={20}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <FileTable
                                                files={filteredList}
                                                onOpen={(file) => handleFolderClick(file)}
                                                onRename={refreshCurrentLocation}
                                                selectedCategory={selectedCategory}
                                                folderId={selectedFolderId ?? rootFolderId ?? null}
                                            />
                                        )}
                                    </div>
                                )
                            )}
                                </>
                            )}
                        </div>
                    )}
            </div>
            <FileUploadModal
                isOpen={isFileUploadModalOpen}
                onClose={() => setIsFileUploadModalOpen(false)}
                folderId={selectedFolderId ?? rootFolderId ?? null}
                droppedFiles={droppedFiles}
                onSuccess={() => {
                    refreshCurrentLocation();
                }}
            />
            <OneFieldModal
                isOpen={isFolderCreateModalOpen}
                onClose={() => setIsFolderCreateModalOpen(false)}
                fieldTitle={'Folder Name'}
                modalTitle={'Add New Folder'}
                fieldPlaceholder={'Enter Folder Name'}
                onSubmit={(value) => handleFolderCreate(value)}
            />
            <FolderUpload
                isOpen={isFolderUploadModalOpen}
                onClose={() => setIsFolderUploadModalOpen(false)}
                folderId={selectedFolderId ?? rootFolderId ?? null}
                onSuccess={() => {
                    refreshCurrentLocation();
                }}
            />
        </>
    );
};

export default StorageBucket;
