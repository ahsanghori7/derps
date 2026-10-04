import { useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  SearchBar,
  ChatModalShell,
  UserListItem,
  EmptyState,
} from '../shared/components';
import { useChatUsers } from '../shared/hooks';
import '../shared/theme/ChatWindow.css';

const DirectChatModal = ({ open, onClose, onUserSelected }) => {
    const { filteredUsers, loading, search, setSearch } = useChatUsers({
        enabled: open,
    });

    useEffect(() => {
        if (!open) setSearch('');
    }, [open, setSearch]);

    const handleUserSelect = (user) => {
        onUserSelected(user.id);
        onClose();
    };

    return (
        <ChatModalShell
            open={open}
            title="New Direct Chat"
            onClose={onClose}
            maxWidth="md"
        >
            <div className="p-4">
                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    sticky={true}
                />
            </div>

            <div className="chat-scroll flex-1 overflow-y-auto p-4">
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
                                onClick={handleUserSelect}
                            />
                        ))
                    )}
                </div>
            </div>
        </ChatModalShell>
    );
};

DirectChatModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    onUserSelected: PropTypes.func,
};

export default DirectChatModal;
