import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from 'react-router-dom';
import edit from '../../assets/edit.png';
import { toast } from "react-toastify";
import { acknowledgeMemo, getMemoAcknowledgements } from "../../Api/memoApi";
import Loader from "../Loader";

const MemoViewModal = ({ open, onClose, memoData, onAcknowledged }) => {
    const currentUser = useSelector((state) => state.userData?.userDetails);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();

    const roleTitle = currentUser?.roleTitle?.toLowerCase?.() || "";
    const isAdminOrHR = useMemo(() => {
        return roleTitle.includes("admin") || roleTitle.includes("human resource");
    }, [roleTitle]);

    const memoId = memoData?.id;
    const currentUserId = currentUser?.id;
    const isAcknowledgedByCurrentUserFromList = Boolean(
        memoData?.isAcknowledgedByCurrentUser,
    );

    const canEdit =
        isAdminOrHR || (memoData?.createdBy && memoData.createdBy === currentUser?.id);

    const [ackLoading, setAckLoading] = useState(false);
    const [ackError, setAckError] = useState(null);
    const [ackData, setAckData] = useState(null);
    const [ackPosting, setAckPosting] = useState(false);
    const [locallyAcknowledged, setLocallyAcknowledged] = useState(false);
    const [locallyAcknowledgedAt, setLocallyAcknowledgedAt] = useState(null);

    useEffect(() => {
        if (!open) return;
        // New memo opened → reset per-memo local state to avoid leaking to other memos
        setLocallyAcknowledged(false);
        setLocallyAcknowledgedAt(null);
    }, [open, memoId]);

    const hasAcknowledged = useMemo(() => {
        if (!isAdminOrHR)
            return isAcknowledgedByCurrentUserFromList || locallyAcknowledged;
        const users = ackData?.data?.users || ackData?.users || [];
        return users.some((u) => String(u?.id) === String(currentUserId));
    }, [
        ackData,
        currentUserId,
        isAdminOrHR,
        isAcknowledgedByCurrentUserFromList,
        locallyAcknowledged,
    ]);

    const acknowledgedAt = useMemo(() => {
        if (!isAdminOrHR) return locallyAcknowledgedAt;
        const users = ackData?.data?.users || ackData?.users || [];
        const row = users.find((u) => String(u?.id) === String(currentUserId));
        return row?.acknowledgedAt || null;
    }, [ackData, currentUserId, isAdminOrHR, locallyAcknowledgedAt]);

    useEffect(() => {
        if (!open) return;
        if (!memoData) return;
        if (isAdminOrHR) return;

        // If list API already knows user acknowledged it, reflect immediately.
        if (isAcknowledgedByCurrentUserFromList) {
            setLocallyAcknowledged(true);
        }
    }, [open, memoData, isAdminOrHR, isAcknowledgedByCurrentUserFromList]);

    const totalAcknowledged = useMemo(() => {
        const summary = ackData?.data?.summary || ackData?.summary;
        return summary?.totalAcknowledged ?? 0;
    }, [ackData]);

    const acknowledgedUsers = useMemo(() => {
        return ackData?.data?.users || ackData?.users || [];
    }, [ackData]);

    useEffect(() => {
        if (!open) return;
        if (!memoData) return;
        if (!isAdminOrHR) return;
        if (!memoId || !accessToken) return;

        const controller = new AbortController();
        setAckLoading(true);
        setAckError(null);

        getMemoAcknowledgements({ memoId, token: accessToken, signal: controller.signal })
            .then((res) => setAckData(res))
            .catch((e) => {
                if (e?.name === "AbortError") return;
                setAckError(e?.message || "Failed to load acknowledgements");
            })
            .finally(() => setAckLoading(false));

        return () => controller.abort();
    }, [open, memoId, accessToken, isAdminOrHR, memoData]);

    const handleEditClick = () => {
        if (!memoData) return;
        navigate('/home/maintainMemo', { state: { itemData: memoData } });
        onClose();
    };

    const handleAcknowledge = async () => {
        if (!memoId || !accessToken) return;
        setAckPosting(true);
        try {
            await acknowledgeMemo({ memoId, token: accessToken });
            toast.success("Memo acknowledged");

            if (isAdminOrHR) {
                // Refresh acknowledgements so UI updates immediately
                const res = await getMemoAcknowledgements({ memoId, token: accessToken });
                setAckData(res);
            } else {
                setLocallyAcknowledged(true);
                setLocallyAcknowledgedAt(new Date().toISOString());
            }

            onAcknowledged?.();
        } catch (e) {
            toast.error(e?.message || "Failed to acknowledge memo");
        } finally {
            setAckPosting(false);
        }
    };

    if (!open || !memoData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-gray-900 flex-1">
                            {memoData.title || 'Untitled Memo'}
                        </h2>
                        <div className="flex items-center gap-3">
                            {canEdit && (
                                <button
                                    onClick={handleEditClick}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                                >
                                    <img src={edit} className="w-4 h-4" alt="Edit" />
                                    Edit
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    <div className="prose prose-lg max-w-none">
                        <div
                            className="text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{
                                __html: memoData.subject || '<p>No content available</p>'
                            }}
                        />
                    </div>

                    {/* Acknowledgements */}
                    <div className="mt-6 pt-5 border-t border-gray-200">
                        {isAdminOrHR && ackLoading ? (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Loader message="Loading..." subMessage="Please wait" />
                            </div>
                        ) : isAdminOrHR && ackError ? (
                            <div className="text-sm text-red-600">{ackError}</div>
                        ) : isAdminOrHR ? (
                            <div>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        Acknowledgements
                                    </h3>
                                    <div className="text-sm text-gray-600">
                                        Total acknowledged: <span className="font-semibold">{totalAcknowledged}</span>
                                    </div>
                                </div>

                                <div className="mt-3 overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-600">
                                                <th className="py-2 pr-4 font-bold">Name</th>
                                                <th className="py-2 pr-4 font-bold">Email</th>
                                                <th className="py-2 pr-4 font-bold">Role</th>
                                                <th className="py-2 pr-0 font-bold">Acknowledged At</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-800">
                                            {acknowledgedUsers?.length ? (
                                                acknowledgedUsers.map((u) => (
                                                    <tr key={u?.id} className="border-t border-gray-100">
                                                        <td className="py-2 pr-4">{u?.name || "-"}</td>
                                                        <td className="py-2 pr-4">{u?.email || "-"}</td>
                                                        <td className="py-2 pr-4">{u?.roleTitle || "-"}</td>
                                                        <td className="py-2 pr-0">
                                                            {u?.acknowledgedAt ? new Date(u.acknowledgedAt).toLocaleString() : "-"}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr className="border-t border-gray-100">
                                                    <td className="py-3 text-gray-500" colSpan={4}>
                                                        No acknowledgements yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-sm text-gray-700">
                                    {hasAcknowledged ? (
                                        <span className="text-green-700 font-medium">
                                            Acknowledged{acknowledgedAt ? ` on ${new Date(acknowledgedAt).toLocaleString()}` : ""}.
                                        </span>
                                    ) : (
                                        <span className="text-gray-700">Please acknowledge this memo.</span>
                                    )}
                                </div>

                                {!hasAcknowledged && (
                                    <button
                                        onClick={handleAcknowledge}
                                        disabled={ackPosting}
                                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${ackPosting ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
                                            }`}
                                    >
                                        {ackPosting ? "Acknowledging…" : "Acknowledge"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemoViewModal;
