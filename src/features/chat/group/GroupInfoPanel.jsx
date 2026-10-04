import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import {
    getChatDetails,
    updateGroupDetails,
    addGroupMember,
    removeGroupMember,
    updateGroupMemberRole,
} from '../api/chatApi';
import { useSocket } from '@contexts/SocketContext';
import { getErrorMessage } from '@utils/errorHandler';
import { useAuthUser } from '@hooks/useAuthUser';
import { useChatUsers, useGroupActions } from '../shared/hooks';
import { Avatar, ToggleSwitch } from '../shared/components';
import { TrashIcon } from '../shared/icons';
import AddGroupMemberModal from './AddGroupMemberModal';
import DeleteConfirmationModal from '@components/DeleteModal';
import Loader from '@components/Loader';
import { getProfilePictureUrl } from '../../../Utils/profile';
import { getChatsSnapshot, subscribeToChatsSnapshot } from '@stores/chatStore';
import '../shared/theme/ChatWindow.css';

const rememberProfilePicture = (map, userId, user) => {
    if (userId == null) return;
    const url = getProfilePictureUrl(user);
    if (!url) return;
    const key = String(userId);
    if (!map.has(key)) map.set(key, url);
};

const rememberMemberPictures = (map, members) => {
    for (const member of members || []) {
        const userId = member?.userId ?? member?.user?.id ?? member?.id;
        rememberProfilePicture(map, userId, member?.user);
        rememberProfilePicture(map, userId, member);
    }
};

const GroupInfoPanel = ({ chat, onChatUpdated, onLeftGroup }) => {
    const [chatDetails, setChatDetails] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [showAddMember, setShowAddMember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);

    const { token, currentUser } = useAuthUser();
    const { socket, isConnected } = useSocket();
    const { users: directoryUsers } = useChatUsers({ enabled: Boolean(chat?.id) });
    const [listedChats, setListedChats] = useState(() => getChatsSnapshot());

    useEffect(() => subscribeToChatsSnapshot(setListedChats), []);

    const profilePicturesByUserId = useMemo(() => {
        const map = new Map();
        for (const user of directoryUsers) rememberProfilePicture(map, user?.id, user);
        rememberProfilePicture(map, currentUser?.id, currentUser);
        for (const listedChat of listedChats) rememberMemberPictures(map, listedChat?.members);
        rememberMemberPictures(map, chat?.members);
        rememberMemberPictures(map, chatDetails?.members);
        return map;
    }, [directoryUsers, currentUser, listedChats, chat?.members, chatDetails?.members]);

    const memberAvatarUser = (member) => {
        const base = member?.user || {};
        const ownPicture = getProfilePictureUrl(base) || getProfilePictureUrl(member);
        if (ownPicture) {
            return getProfilePictureUrl(base) ? base : { ...base, profilePicture: ownPicture };
        }
        const picture = profilePicturesByUserId.get(String(member?.userId));
        if (!picture) return base;
        return { ...base, profilePicture: picture };
    };

    const memberIds = useMemo(
        () => chatDetails?.members?.map((m) => m.userId) || [],
        [chatDetails?.members]
    );

    const { isMuted, isMuting, toggleMute, isLeaving, leaveGroupChat } = useGroupActions(
        chatDetails,
        token,
        currentUser?.id,
        {
            onUpdated: (updatedChat) => {
                setChatDetails(updatedChat);
                notifyChatUpdated(updatedChat);
            },
            onLeft: (chatId) => onLeftGroup?.(chatId),
        }
    );

    const loadChatDetails = async ({ silent = false } = {}) => {
        if (!chat || !token) return null;
        try {
            if (!silent) setLoading(true);
            const response = await getChatDetails(token, chat.id);
            if (response?.data) {
                setChatDetails(response.data);
                setGroupName(response.data.name || '');
                setGroupDescription(response.data.description || '');
                return response.data;
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error loading chat details'));
        } finally {
            if (!silent) setLoading(false);
        }
        return null;
    };

    const notifyChatUpdated = (details) => {
        if (!onChatUpdated || !details) return;
        onChatUpdated({ ...chat, ...details });
    };

    useEffect(() => {
        setIsEditing(false);
        setShowAddMember(false);
        loadChatDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat?.id]);

    useEffect(() => {
        if (!socket || !isConnected || !chat) return;

        const handleMemberAdded = (data) => {
            if (data.chatId === chat.id) {
                loadChatDetails({ silent: true }).then(notifyChatUpdated);
            }
        };

        const handleMemberRemoved = (data) => {
            if (data.chatId === chat.id) {
                loadChatDetails({ silent: true }).then(notifyChatUpdated);
            }
        };

        const handleMemberRoleUpdated = (data) => {
            if (data.chatId === chat.id) {
                loadChatDetails({ silent: true }).then(notifyChatUpdated);
            }
        };

        socket.on('group:member-added', handleMemberAdded);
        socket.on('group:member-removed', handleMemberRemoved);
        socket.on('group:member-role-updated', handleMemberRoleUpdated);

        return () => {
            socket.off('group:member-added', handleMemberAdded);
            socket.off('group:member-removed', handleMemberRemoved);
            socket.off('group:member-role-updated', handleMemberRoleUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, isConnected, chat]);

    const closeAddMember = () => {
        if (addingMember) return;
        setShowAddMember(false);
    };

    const handleSave = async () => {
        if (!groupName.trim() || saving || !chat) return;

        try {
            setSaving(true);
            const response = await updateGroupDetails(token, chat.id, {
                name: groupName.trim(),
                description: groupDescription.trim(),
            });

            if (response?.data) {
                setChatDetails(response.data);
                setIsEditing(false);
                notifyChatUpdated(response.data);
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error updating group'));
        } finally {
            setSaving(false);
        }
    };

    const handleAddMember = async (user) => {
        if (addingMember || !chat) return;

        try {
            setAddingMember(true);
            const response = await addGroupMember(token, chat.id, user.id);

            const successMessage =
                response?.message ||
                response?.data?.message ||
                'Member added successfully';
            toast.success(successMessage);

            const details = await loadChatDetails({ silent: true });
            notifyChatUpdated(details);
            closeAddMember();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error adding member'));
        } finally {
            setAddingMember(false);
        }
    };

    const handleUpdateMemberRole = async (userId, role) => {
        if (updatingRoleUserId || !chat) return;

        try {
            setUpdatingRoleUserId(userId);
            await updateGroupMemberRole(token, chat.id, { userId, role });

            toast.success(
                role === 'admin'
                    ? 'Member promoted to admin'
                    : 'Admin role removed'
            );

            const details = await loadChatDetails({ silent: true });
            notifyChatUpdated(details);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error updating member role'));
        } finally {
            setUpdatingRoleUserId(null);
        }
    };

    const handleRemoveMember = (userId) => {
        const member = chatDetails?.members?.find((m) => m.userId === userId);
        setMemberToRemove(member);
        setDeleteModalOpen(true);
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove || !chat) return;

        setIsRemoving(true);
        try {
            await removeGroupMember(token, chat.id, memberToRemove.userId);
            toast.success('Member removed successfully');

            const details = await loadChatDetails({ silent: true });
            notifyChatUpdated(details);
        } catch (error) {
            toast.error(getErrorMessage(error) || 'Failed to remove member');
        } finally {
            setIsRemoving(false);
            setDeleteModalOpen(false);
            setMemberToRemove(null);
        }
    };

    const handleConfirmLeave = async () => {
        try {
            await leaveGroupChat();
        } finally {
            setLeaveModalOpen(false);
        }
    };

    const isAdmin = () => {
        if (!chatDetails || !currentUser) return false;
        const member = chatDetails.members?.find(
            (m) => m.userId === currentUser.id
        );
        return (
            member?.role === 'admin' ||
            currentUser.roleTitle === 'Admin' ||
            currentUser.roleTitle === 'Human Resource'
        );
    };

    if (!chat || chat.type !== 'group') return null;

    return (
        <>
            <div className="chat-scroll flex-1 overflow-y-auto p-4 chat-chrome-alt">
                {loading ? (
                    <div className="py-6">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold chat-text">
                                    Group Details
                                </h3>
                                {isAdmin() && !isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="text-sm chat-accent-muted chat-accent"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium chat-text-secondary mb-2">
                                            Group Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={groupName}
                                            onChange={(e) =>
                                                setGroupName(e.target.value)
                                            }
                                            className="w-full px-4 py-2 border chat-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 chat-input-field chat-text"
                                            placeholder="Enter group name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium chat-text-secondary mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={groupDescription}
                                            onChange={(e) =>
                                                setGroupDescription(e.target.value)
                                            }
                                            rows={3}
                                            className="w-full px-4 py-2 border chat-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 chat-input-field chat-text"
                                            placeholder="Enter group description"
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={!groupName.trim() || saving}
                                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed chat-call-btn-primary"
                                                style={{maxWidth: '100px'}}
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setGroupName(chatDetails?.name || '');
                                                setGroupDescription(
                                                    chatDetails?.description || ''
                                                );
                                            }}
                                            className="px-4 py-2 chat-text-secondary chat-hover rounded-lg chat-call-btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm chat-text-muted">
                                            Name
                                        </p>
                                        <p className="font-medium chat-text">
                                            {chatDetails?.name || 'No name'}
                                        </p>
                                    </div>
                                    {chatDetails?.description && (
                                        <div>
                                            <p className="text-sm chat-text-muted">
                                                Description
                                            </p>
                                            <p className="chat-text">
                                                {chatDetails.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg chat-chrome-alt border chat-border mb-6">
                            <div>
                                <div className="font-medium chat-text">
                                    Mute notifications
                                </div>
                                <div className="text-xs chat-text-muted mt-0.5">
                                    You won&apos;t be notified for new messages in this group
                                </div>
                            </div>
                            <ToggleSwitch
                                checked={isMuted}
                                onChange={toggleMute}
                                disabled={isMuting}
                                ariaLabel="Mute notifications"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold chat-text">
                                    Members ({chatDetails?.members?.length || 0})
                                </h3>
                                {isAdmin() && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddMember(true)}
                                        className="text-sm chat-accent-muted chat-accent"
                                    >
                                        Add Member
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {chatDetails?.members?.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center justify-between p-3 chat-surface chat-hover rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                id={member.userId}
                                                name={member.user?.name}
                                                user={memberAvatarUser(member)}
                                                size="md"
                                            />
                                            <div>
                                                <p className="font-medium chat-text">
                                                    {member.user?.name || 'Unknown'}
                                                    {member.role === 'admin' && (
                                                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                                            Admin
                                                        </span>
                                                    )}
                                                </p>
                                                {member.user?.email && (
                                                    <p className="text-xs chat-text-muted">
                                                        {member.user.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {isAdmin() &&
                                            member.userId !== currentUser?.id && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleUpdateMemberRole(
                                                                member.userId,
                                                                member.role === 'admin'
                                                                    ? 'member'
                                                                    : 'admin'
                                                            )
                                                        }
                                                        disabled={
                                                            updatingRoleUserId ===
                                                            member.userId
                                                        }
                                                        className="text-xs px-2 py-1 rounded border chat-border-strong chat-text-secondary chat-hover disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                        title={
                                                            member.role === 'admin'
                                                                ? 'Remove admin role'
                                                                : 'Make admin'
                                                        }
                                                    >
                                                        {updatingRoleUserId === member.userId
                                                            ? '...'
                                                            : member.role === 'admin'
                                                              ? 'Remove admin'
                                                              : 'Make admin'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveMember(member.userId)
                                                        }
                                                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                                                        title="Remove member"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t chat-border">
                            <button
                                type="button"
                                onClick={() => setLeaveModalOpen(true)}
                                className="w-full px-4 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium"
                            >
                                Leave Group
                            </button>
                        </div>
                    </>
                )}
            </div>

            <AddGroupMemberModal
                open={showAddMember}
                onClose={closeAddMember}
                excludeIds={memberIds}
                onUserSelected={handleAddMember}
                adding={addingMember}
            />

            <DeleteConfirmationModal
                open={deleteModalOpen}
                title="Remove Member"
                subtitle="Are you sure you want to remove this member from the group?"
                entityName={
                    memberToRemove?.user?.name ||
                    memberToRemove?.user?.email ||
                    'Unknown Member'
                }
                warningMessage="This action cannot be undone. The member will lose access to this group chat."
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setMemberToRemove(null);
                }}
                onDelete={confirmRemoveMember}
                isLoading={isRemoving}
            />

            <DeleteConfirmationModal
                open={leaveModalOpen}
                title="Leave Group"
                subtitle="Are you sure you want to leave this group?"
                entityName={chatDetails?.name || 'this group'}
                warningMessage="You will lose access to this group's messages and will need to be re-added to rejoin."
                confirmLabel="Leave"
                onCancel={() => setLeaveModalOpen(false)}
                onDelete={handleConfirmLeave}
                isLoading={isLeaving}
            />
        </>
    );
};

GroupInfoPanel.propTypes = {
    chat: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        type: PropTypes.string,
    }),
    onChatUpdated: PropTypes.func,
    onLeftGroup: PropTypes.func,
};

export default GroupInfoPanel;
