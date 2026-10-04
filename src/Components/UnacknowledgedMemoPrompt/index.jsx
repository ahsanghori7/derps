import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import MemoViewModal from "../MemoViewModal";

/** Survives effect re-runs within the same page load; resets on hard reload / full logout redirect. */
let memoPromptCheckedThisLoad = false;

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("userDetails") || "null");
  } catch {
    return null;
  }
};

/**
 * Prompts the latest unacknowledged memo once per browser session load
 * (login or hard reload), on any authenticated page — not only Dashboard.
 */
const UnacknowledgedMemoPrompt = () => {
  const accessToken =
    useSelector((state) => state.auth.accessToken) ||
    localStorage.getItem("accessToken");
  const userData = useSelector((state) => state.userData.userDetails);

  const [selectedMemo, setSelectedMemo] = useState(null);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);

  useEffect(() => {
    if (!accessToken || memoPromptCheckedThisLoad) return;

    const currentUser = userData?.id ? userData : getStoredUser();
    if (!currentUser?.id) return;

    const role = (currentUser?.roleTitle || "").toLowerCase();
    // Admin / HR do not acknowledge memos — skip the prompt for them.
    if (role.includes("admin") || role.includes("human resource")) {
      memoPromptCheckedThisLoad = true;
      return;
    }

    memoPromptCheckedThisLoad = true;

    getRequestWithOutBody(`${baseURl}memo?acknowledged=false`, accessToken)
      .then((result) => {
        const list = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.results)
            ? result.results
            : Array.isArray(result)
              ? result
              : [];

        const currentUserId = currentUser.id;
        // acknowledged=false returns memos the current user still needs to ack.
        // userIds / selectedUsers = assignees who must acknowledge.
        const pendingMemos = list.filter((memo) => {
          if (memo?.isAcknowledgedByCurrentUser === true) return false;

          const userIds = memo?.userIds;
          if (Array.isArray(userIds) && userIds.length > 0) {
            return userIds.some((id) => String(id) === String(currentUserId));
          }

          const selectedUsers = memo?.selectedUsers;
          if (Array.isArray(selectedUsers) && selectedUsers.length > 0) {
            return selectedUsers.some(
              (u) => String(u?.id) === String(currentUserId)
            );
          }

          return true;
        });

        if (!pendingMemos.length) return;

        const latestMemo = [...pendingMemos].sort((a, b) => {
          const dateA = new Date(a?.date || a?.createdAt || 0).getTime();
          const dateB = new Date(b?.date || b?.createdAt || 0).getTime();
          return dateB - dateA;
        })[0];

        if (!latestMemo) return;

        setSelectedMemo({
          ...latestMemo,
          isAcknowledgedByCurrentUser: false,
        });
        setIsMemoModalOpen(true);
      })
      .catch(() => {
        // Allow a retry on next login / hard reload if this attempt failed.
        memoPromptCheckedThisLoad = false;
      });
  }, [accessToken, userData?.id]);

  const handleCloseMemoModal = () => {
    setIsMemoModalOpen(false);
    setSelectedMemo(null);
  };

  return (
    <MemoViewModal
      open={isMemoModalOpen}
      onClose={handleCloseMemoModal}
      memoData={selectedMemo}
      onAcknowledged={handleCloseMemoModal}
    />
  );
};

export default UnacknowledgedMemoPrompt;
