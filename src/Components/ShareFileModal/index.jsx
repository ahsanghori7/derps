"use client"

import { useEffect, useRef, useState } from "react"
import DropdownMenu from "../dropdownMenu"
import Heading from "../Heading"
import { toast } from "react-toastify"
import { getRequestWithOutBody, getRequestWithOutBodyCached, postRequestWithBodyAndToken } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { useSelector } from "react-redux"
import BottonWithIcon from "../ButtonWithIcon"
import SearchInput from "../SearchInput"
import UserProfileAvatar from "../UserProfileAvatar"

/* Add this CSS class to hide scrollbars */
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const ShareFileModal = ({
    isOpen,
    onClose,
    path,
    fileShared
    // onSubmit,
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [loading, setLoading] = useState(false)
    const [projectTitle, setProjectTitle] = useState("")
    const [userList, setUserList] = useState([]);
    const [selectedUser, setSelectedUser] = useState([])
    const [copied, setCopied] = useState(false);
    const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
    const dropdownRef = useRef(null);
    const dropdownButtonRef = useRef(null);
    const dropdownMenuRef = useRef(null);
    const [dropdownPosition, setDropdownPosition] = useState("bottom"); // 'bottom' | 'top'


    if (!isOpen) return null

    useEffect(() => {
        if (openDropdownIndex !== null && dropdownButtonRef.current && dropdownMenuRef.current) {
            const buttonRect = dropdownButtonRef.current.getBoundingClientRect();
            const menuHeight = dropdownMenuRef.current.offsetHeight;
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;

            if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                setDropdownPosition("top");
            } else {
                setDropdownPosition("bottom");
            }
        }
    }, [openDropdownIndex]);


    useEffect(() => {
        const handleClickOutside = (event) => {
            // check if click inside any dropdown button or dropdown menu by class or data attribute
            if (
                !event.target.closest('.dropdown-button') &&
                !event.target.closest('.dropdown-menu')
            ) {
                setOpenDropdownIndex(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const fetchData2 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                setUserList(activeUsers);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData2()
    }, [])

    const handleSelectUser = (user) => {
        if (!user || typeof user !== 'object' || !(user.name || user.username)) {
            return;
        }

        const alreadyAdded = selectedUser.find((u) => u.name === user.name);
        if (alreadyAdded) {
            toast.info("User already added");
            return;
        }

        setSelectedUser((prev) => [...prev, { ...user, permission: [] }]);
    };



    const handleRemoveUser = (name) => {
        setSelectedUser(prev => prev.filter(u => u.name !== name));
    };

    const handleSubmit = async () => {
        setLoading(true);

        if (!selectedUser.length) {
            toast.error("Please select at least one user.");
            setLoading(false);
            return;
        }
        if (fileShared) {
            try {
                const payload = {
                    fileId: path.id, // Adjust this if path is not directly the folderId
                    users: selectedUser.map((user) => ({
                        id: user.id,
                        permission: Array.from(new Set(["view", ...user.permission])),
                    })),
                };

                const result = await postRequestWithBodyAndToken(
                    `${baseURl}share/file`,
                    accessToken,
                    payload,
                );

                toast.success(result.message);
                onClose();

            } catch (error) {
                toast.error(error.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        } else {
            try {
                const payload = {
                    folderId: path.id, // Adjust this if path is not directly the folderId
                    users: selectedUser.map((user) => ({
                        id: user.id,
                        permission: Array.from(new Set(["view", ...user.permission])),
                    })),
                };

                const result = await postRequestWithBodyAndToken(
                    `${baseURl}share/folder`,
                    accessToken,
                    payload,
                );

                toast.success(result.message);
                onClose();

            } catch (error) {
                toast.error(error.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        }
    };


    const handleCopyLink = async () => {
        try {
            if (!path?.path && !path?.file?.path) {
                toast.error('File path not available');
                return;
            }

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(path?.path || path?.file?.path);
            } else {
                // Fallback for insecure context or older browser
                const textArea = document.createElement("textarea");
                textArea.value = path?.path || path?.file?.path;
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


    return (
        <div className="fixed inset-0 flex items-center justify-center z-504 bg-black bg-opacity-30" style={{ zIndex: 9999 }}>
            <div
                className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-5 w-full max-w-md relative max-h-[80vh] min-h-[60vh]"
                style={{ display: 'flex', flexDirection: 'column' }}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-[var(--sidebar-text-primary)]">
                    ×
                </button>

                {path?.path ? (
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Share this file'}
                        Fontsize={20}
                        mb={4}
                    />
                ) : (
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Share this folder'}
                        Fontsize={20}
                        mb={4}
                    />
                )}
                <div className="flex justify-center mt-4 mb-4">
                    <SearchInput
                        suggestions={userList}
                        defaultText="--select share with--"
                        onSelect={handleSelectUser}
                        shareFile={true} />
                </div>

                {/* Scrollable list container */}
                <div
                    className="overflow-y-auto scrollbar-hide"
                    style={{ flexGrow: 1, minHeight: 0, scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {selectedUser.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-4">
                            No user selected
                        </div>
                    ) : (selectedUser.map((user, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-md relative mb-2"
                        >
                            <div className="flex items-center gap-2">
                                <UserProfileAvatar user={user} size={24} />
                                <span className="text-sm text-gray-700">{user.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        className="dropdown-button text-blue-600 border border-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50"
                                        onClick={() =>
                                            setOpenDropdownIndex((prev) => (prev === index ? null : index))
                                        }
                                    >
                                        Permissions ▼
                                    </button>

                                    {openDropdownIndex === index && (
                                        <div
                                            className="dropdown-menu absolute bg-white border rounded shadow-md mt-1 right-0 w-40"
                                            style={{ zIndex: 9999 }}
                                        >
                                            {["edit", "delete"].map((perm) => (
                                                <label
                                                    key={perm}
                                                    className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 flex items-center gap-2"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={user.permission?.includes(perm)}
                                                        onChange={() => {
                                                            const updatedUsers = [...selectedUser];
                                                            const permissions = new Set(updatedUsers[index].permission || []);

                                                            if (permissions.has(perm)) {
                                                                permissions.delete(perm);
                                                            } else {
                                                                permissions.add(perm);
                                                            }

                                                            updatedUsers[index].permission = Array.from(permissions);
                                                            setSelectedUser(updatedUsers);
                                                        }}
                                                    />
                                                    {perm.charAt(0).toUpperCase() + perm.slice(1)}
                                                </label>
                                            ))}

                                            <div
                                                className="text-red-500 px-3 py-2 text-xs cursor-pointer hover:bg-gray-100"
                                                onClick={() => {
                                                    handleRemoveUser(user.name);
                                                    setOpenDropdownIndex(null);
                                                }}
                                            >
                                                Remove User
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )))}
                </div>

                {/* Fixed bottom buttons */}
                {path?.path || path?.file?.path ? (
                    <div
                        className="flex justify-between mt-4 pt-4 border-t border-gray-300 bg-[var(--dashboard-card-bg)]"
                        style={{ flexShrink: 0 }}
                    >
                        <BottonWithIcon
                            backgroundColor={'transparent'}
                            border={'1px solid #3769E6'}
                            title={'Copy Link'}
                            height={29}
                            color={'#3769E6'}
                            fontSize={12}
                            fontWeight={500}
                            onClick={handleCopyLink}
                        />
                        <BottonWithIcon
                            backgroundColor={'#3769E6'}
                            title={'Share File'}
                            height={29}
                            color={'white'}
                            fontSize={12}
                            fontWeight={500}
                            onClick={handleSubmit}
                        />
                    </div>
                ) : (
                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-300 bg-[var(--dashboard-card-bg)]">
                        <BottonWithIcon
                            backgroundColor={'#3769E6'}
                            title={'Share Folder'}
                            height={29}
                            color={'white'}
                            fontSize={12}
                            fontWeight={500}
                            onClick={handleSubmit}
                        />
                    </div>
                )}

            </div>
        </div>
    )
}

export default ShareFileModal