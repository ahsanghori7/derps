import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useChatUsers } from '../shared/hooks';
import {
    ChatModalShell,
    SearchBar,
    UserListItem,
    EmptyState,
    SelectedMembersChips,
} from '../shared/components';

/**
 * In-call "Add people" picker — rings more people into an already-started call
 * via inviteToCall. Same shape as StartMeetingModal's member-selection step,
 * kept standalone for now rather than sharing code with it.
 */
const InviteToCallModal = ({ open, onClose, onInvite, excludeIds = [], inviting = false }) => {
    const [selectedMembers, setSelectedMembers] = useState([]);
    const { users, filteredUsers, loading, search, setSearch } = useChatUsers({
        enabled: open,
        excludeIds,
    });

    useEffect(() => {
        if (!open) {
            setSelectedMembers([]);
            setSearch('');
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

    const handleConfirm = () => {
        if (selectedMembers.length === 0) return;
        onInvite(selectedMembers);
    };

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 chat-text-secondary chat-hover rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedMembers.length === 0 || inviting}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                {inviting ? 'Inviting…' : 'Invite'}
            </button>
        </>
    );

    return (
        <ChatModalShell
            open={open}
            title="Add people"
            onClose={onClose}
            maxWidth="md"
            maxHeight="80vh"
            footer={footer}
        >
            <div className="mb-4 px-2 pt-2">
                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    sticky={true}
                />
            </div>
            <div className="flex-1 overflow-y-auto p-6 pt-0">
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
            </div>
        </ChatModalShell>
    );
};

InviteToCallModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onInvite: PropTypes.func.isRequired,
    excludeIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    inviting: PropTypes.bool,
};

export default InviteToCallModal;
