import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@utils/errorHandler';
import { useChatUsers } from '../shared/hooks';
import { getCallRoute } from '../shared/utils/chatUtility';
import {
  SearchBar,
  ChatModalShell,
  UserListItem,
  EmptyState,
  SelectedMembersChips,
  ToggleSwitch,
} from '../shared/components';
import { LinkIcon, VideoIcon, GroupIcon, RecordIcon } from '../shared/icons';

const StartMeetingModal = ({
    open,
    onClose,
    onGetLink,
    onInstantMeeting,
    onGroupMeeting,
    canViewActiveMeetings = false,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [creatingMeeting, setCreatingMeeting] = useState(false);
    const [showMemberSelection, setShowMemberSelection] = useState(false);
    const [isOpenCall, setIsOpenCall] = useState(false);

    const { users, filteredUsers, loading, search, setSearch } = useChatUsers({
        enabled: open && showMemberSelection,
    });

    useEffect(() => {
        if (!open) {
            setSelectedMembers([]);
            setSearch('');
            setShowMemberSelection(false);
            setCreatingMeeting(false);
            setIsOpenCall(false);
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

    const runCreateThenClose = async (fn) => {
        setCreatingMeeting(true);
        try {
            await fn();
            onClose();
        } catch (e) {
            const msg = getErrorMessage(e, 'Could not create the meeting');
            if (msg && !String(e?.message || '').includes('No token')) {
                toast.error(msg);
            }
        } finally {
            setCreatingMeeting(false);
        }
    };

    const handleGetLink = () => runCreateThenClose(() => onGetLink({ isOpenCall }));
    const handleInstantMeeting = () => runCreateThenClose(() => onInstantMeeting({ isOpenCall }));
    const handleGroupMeeting = () => {
        if (selectedMembers.length === 0) {
            setShowMemberSelection(true);
        } else {
            runCreateThenClose(() => onGroupMeeting(selectedMembers, { isOpenCall }));
        }
    };

    const handleBack = () => {
        setShowMemberSelection(false);
        setSelectedMembers([]);
    };

    const footer = showMemberSelection ? (
        <>
            <button
                onClick={handleBack}
                className="px-4 py-2 chat-text-secondary chat-hover rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleGroupMeeting}
                disabled={selectedMembers.length === 0 || creatingMeeting}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                {creatingMeeting ? 'Creating…' : 'Next'}
            </button>
        </>
    ) : null;

    return (
        <ChatModalShell
            open={open}
            title="Meetings"
            onClose={onClose}
            onBack={showMemberSelection ? handleBack : undefined}
            maxWidth="md"
            maxHeight="80vh"
            footer={footer}
        >
            {showMemberSelection && (
                <div className="mb-4 px-2 pt-2">
                    <SearchBar
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        sticky={true}
                    />
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
                {!showMemberSelection ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <span className="min-w-0">
                                <span className="block font-semibold chat-text text-sm">
                                    Open Meeting
                                </span>
                                <span className="block text-xs chat-text-muted mt-0.5">
                                    Participants join without waiting for host approval
                                </span>
                            </span>
                            <ToggleSwitch
                                checked={isOpenCall}
                                onChange={() => setIsOpenCall((prev) => !prev)}
                                disabled={creatingMeeting}
                                ariaLabel="Open Meeting"
                            />
                        </div>

                        <button
                            type="button"
                            disabled={creatingMeeting}
                            onClick={handleGetLink}
                            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-yellow-400 dark:hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
                                <LinkIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-semibold chat-text">
                                    {creatingMeeting
                                        ? 'Creating meeting…'
                                        : 'Get a Meeting Link to share'}
                                </h3>
                            </div>
                        </button>

                        <button
                            type="button"
                            disabled={creatingMeeting}
                            onClick={handleInstantMeeting}
                            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                                <VideoIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-semibold chat-text">
                                    {creatingMeeting
                                        ? 'Creating meeting…'
                                        : 'Start Instant Meeting'}
                                </h3>
                            </div>
                        </button>

                        {canViewActiveMeetings && (
                            <button
                                type="button"
                                disabled={creatingMeeting}
                                onClick={() => {
                                    onClose();
                                    navigate(getCallRoute(location.pathname, 'activeMeetings'));
                                }}
                                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                                    <GroupIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-semibold chat-text">
                                        View Active Meetings
                                    </h3>
                                    <p className="text-sm chat-text-muted mt-0.5">
                                        Monitor ongoing meetings and participants
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* {canViewActiveMeetings && (
                            <button
                                type="button"
                                disabled={creatingMeeting}
                                onClick={() => {
                                    onClose();
                                    navigate(getCallRoute(location.pathname, 'recordings'));
                                }}
                                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                                    <RecordIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-semibold chat-text">
                                        View Recordings
                                    </h3>
                                    <p className="text-sm chat-text-muted mt-0.5">
                                        Browse and download past meeting recordings
                                    </p>
                                </div>
                            </button>
                        )} */}
                    </div>
                ) : (
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
                )}
            </div>
        </ChatModalShell>
    );
};

StartMeetingModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    onGetLink: PropTypes.func,
    onInstantMeeting: PropTypes.func,
    onGroupMeeting: PropTypes.func,
    canViewActiveMeetings: PropTypes.bool,
};

export default StartMeetingModal;
