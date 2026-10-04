import { useSelector } from 'react-redux';

/**
 * Returns the current access token (Redux first, then localStorage fallback)
 * and the logged-in user's details. Used across chat surfaces that need both.
 */
export const useAuthUser = () => {
    const token =
        useSelector((state) => state.auth.accessToken) ||
        (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
    const currentUser = useSelector((state) => state.userData?.userDetails);
    return { token, currentUser };
};

export default useAuthUser;
