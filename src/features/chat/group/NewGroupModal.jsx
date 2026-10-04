import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { createGroupChat } from '../api/chatApi';
import { getErrorMessage } from '@utils/errorHandler';
import { useAuthUser } from '@hooks/useAuthUser';
import { useChatUsers } from '../shared/hooks';
import {
  SearchBar,
  ChatModalShell,
  UserListItem,
  EmptyState,
  SelectedMembersChips,
} from '../shared/components';
import '../shared/theme/ChatWindow.css';

const NewGroupModal = ({ open, onClose, onGroupCreated }) => {
    const [step, setStep] = useState(1);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [creating, setCreating] = useState(false);

    const { token } = useAuthUser();
    const { users, filteredUsers, loading, search, setSearch } = useChatUsers({
        enabled: open,
    });

    useEffect(() => {
        if (!open) {
            setStep(1);
            setSelectedMembers([]);
            setSearch('');
            setGroupName('');
            setGroupDescription('');
        }
    }, [open, setSearch]);

    const toggleMember = (user) => {
        setSelectedMembers((prev) =>
            prev.includes(user.id)
                ? prev.filter((id) => id !== user.id)
                : [...prev, user.id]
        );
    };

    const removeMember = (userId) => {
        setSelectedMembers((prev) => prev.filter((id) => id !== userId));
    };

    const handleNext = () => {
        if (selectedMembers.length > 0) setStep(2);
    };

    const handleBack = () => setStep(1);

    const handleCreate = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;

        try {
            setCreating(true);
            const response = await createGroupChat(token, {
                name: groupName.trim(),
                description: groupDescription.trim(),
                memberIds: selectedMembers,
            });

            if (response?.data) {
                onGroupCreated(response.data);
                onClose();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error creating group'));
            alert('Failed to create group. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const footer =
        step === 1 ? (
            <>
                <button
                    onClick={onClose}
                    className="px-4 py-2 chat-text-secondary chat-hover rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleNext}
                    disabled={selectedMembers.length === 0}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                </button>
            </>
        ) : (
            <>
                <button
                    onClick={handleBack}
                    className="px-4 py-2 chat-text-secondary chat-hover rounded-lg transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleCreate}
                    disabled={!groupName.trim() || creating}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {creating ? 'Creating...' : 'Create Group'}
                </button>
            </>
        );

    return (
        <ChatModalShell
            open={open}
            title="New Group"
            onClose={onClose}
            onBack={step === 2 ? handleBack : undefined}
            maxWidth="2xl"
            footer={footer}
        >
            {step === 1 && (
                <div className="p-4">
                    <SearchBar
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        sticky={true}
                    />
                </div>
            )}

            <div className="chat-scroll flex-1 overflow-y-auto p-4">
                {step === 1 ? (
                    <>
                        <SelectedMembersChips
                            selectedIds={selectedMembers}
                            users={users}
                            onRemove={removeMember}
                            className="mb-4"
                        />

                        <div className="space-y-2">
                            {loading ? (
                                <EmptyState>Loading users...</EmptyState>
                            ) : filteredUsers.length === 0 ? (
                                <EmptyState>No users found</EmptyState>
                            ) : (
                                filteredUsers.map((user) => (
                                    <UserListItem
                                        key={user.id}
                                        user={user}
                                        onClick={toggleMember}
                                        selected={selectedMembers.includes(user.id)}
                                        variant="selectable"
                                    />
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium chat-text-secondary mb-2">
                                Group Name *
                            </label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Enter group name"
                                className="w-full px-4 py-2 border chat-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 chat-input-field chat-text"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium chat-text-secondary mb-2">
                                Description (Optional)
                            </label>
                            <textarea
                                value={groupDescription}
                                onChange={(e) => setGroupDescription(e.target.value)}
                                placeholder="Enter group description"
                                rows={3}
                                className="w-full px-4 py-2 border chat-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 chat-input-field chat-text"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium chat-text-secondary mb-2">
                                Selected Members ({selectedMembers.length})
                            </label>
                            <SelectedMembersChips
                                selectedIds={selectedMembers}
                                users={users}
                            />
                        </div>
                    </div>
                )}
            </div>
        </ChatModalShell>
    );
};

NewGroupModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    onGroupCreated: PropTypes.func,
};

export default NewGroupModal;
