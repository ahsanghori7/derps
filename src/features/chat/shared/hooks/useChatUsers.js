import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getRequestWithOutBody } from '@api/fetch';
import { baseURl } from '../../../../Config/systemConfig';
import { getErrorMessage } from '@utils/errorHandler';
import { useAuthUser } from '@hooks/useAuthUser';

/**
 * Loads the user directory used by chat modals (New Group, Direct Chat,
 * Start Meeting, Add Member). Filters out the current user by default and
 * any extra ids provided via `excludeIds`. Also exposes a search state and
 * the resulting filtered list.
 *
 * @param {Object} options
 * @param {boolean} [options.enabled=true] When false, the fetch is skipped.
 * @param {Array<string|number>} [options.excludeIds=[]] Ids to filter out.
 * @param {number} [options.limit=100] Page size for the user endpoint.
 */
export const useChatUsers = ({
    enabled = true,
    excludeIds = [],
    limit = 1000,
} = {}) => {
    const { token, currentUser } = useAuthUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const loadUsers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const url = `${baseURl}user?limit=${limit}&status=active`;
            const response = await getRequestWithOutBody(url, token);
            if (response?.data?.results) {
                setUsers(
                    response.data.results.filter((u) => u.id !== currentUser?.id)
                );
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error loading users'));
        } finally {
            setLoading(false);
        }
    }, [token, currentUser?.id, limit]);

    useEffect(() => {
        if (enabled) loadUsers();
    }, [enabled, loadUsers]);

    const excludeSet = useMemo(
        () => new Set((excludeIds || []).map((id) => String(id))),
        [excludeIds]
    );

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter((user) => {
            if (excludeSet.has(String(user.id))) return false;
            const name = user.name?.toLowerCase() || '';
            const email = user.email?.toLowerCase() || '';
            return name.includes(q) || email.includes(q);
        });
    }, [users, search, excludeSet]);

    return {
        users,
        filteredUsers,
        loading,
        search,
        setSearch,
        reload: loadUsers,
    };
};

export default useChatUsers;
