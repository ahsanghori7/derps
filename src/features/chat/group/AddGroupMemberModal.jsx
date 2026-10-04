import { useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  SearchBar,
  ChatModalShell,
  UserListItem,
  EmptyState,
} from '../shared/components';
import { PlusIcon } from '../shared/icons';
import { useChatUsers } from '../shared/hooks';
import Loader from '@components/Loader';
import '../shared/theme/ChatWindow.css';

const AddGroupMemberModal = ({
    open,
    onClose,
    excludeIds = [],
    onUserSelected,
    adding = false,
}) => {
    const { filteredUsers, loading, search, setSearch } = useChatUsers({
        enabled: open,
        excludeIds,
    });

    useEffect(() => {
        if (!open) setSearch('');
    }, [open, setSearch]);

    const handleUserSelect = (user) => {
        if (adding) return;
        onUserSelected?.(user);
    };

    return (
        <ChatModalShell
            open={open}
            title="Add Member"
            onClose={onClose}
            maxWidth="md"
        >
            <div className="p-4 chat-divider-b">
                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                />
            </div>

            <div className="chat-scroll flex-1 overflow-y-auto p-4 min-h-[200px]">
                {adding ? (
                    <div className="py-8">
                        <Loader message="Adding member..." subMessage="Please wait" />
                    </div>
                ) : loading ? (
                    <EmptyState className="py-8">Loading users...</EmptyState>
                ) : filteredUsers.length === 0 ? (
                    <EmptyState className="py-8">No users found</EmptyState>
                ) : (
                    <div className="space-y-2">
                        {filteredUsers.map((user) => (
                            <UserListItem
                                key={user.id}
                                user={user}
                                onClick={handleUserSelect}
                                variant="custom"
                                avatarSize="sm"
                                containerClassName="p-2"
                                nameClassName="text-sm font-medium chat-text"
                                emailClassName="text-xs chat-text-muted"
                                trailing={
                                    <PlusIcon className="w-5 h-5 chat-accent-muted flex-shrink-0" />
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </ChatModalShell>
    );
};

AddGroupMemberModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    excludeIds: PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ),
    onUserSelected: PropTypes.func,
    adding: PropTypes.bool,
};

export default AddGroupMemberModal;
