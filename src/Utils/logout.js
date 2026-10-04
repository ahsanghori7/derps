import { clearChatStore } from "../Stores/chatStore";
import { clearMessageStore } from "../Stores/messageStore";
import { clearTenantGroupStorage } from "./tenantGroup";

/**
 * Clears auth state and performs a hard redirect to the login page.
 * A full page reload avoids lazy-chunk fetch failures that can occur when
 * AppRouter remounts after client-side logout navigation.
 */
export const performLogout = (dispatch, { clearAccessToken, clearUserDetails }) => {
    try {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
    } catch (_) {}

    localStorage.removeItem("accessToken");
    localStorage.removeItem("userDetails");
    localStorage.removeItem("scopes");
    localStorage.removeItem("moduleCodes");
    localStorage.removeItem("categories");
    localStorage.removeItem("tenantFeatures");
    localStorage.removeItem("auditLogModules");
    localStorage.removeItem("tenantLogo");
    clearTenantGroupStorage();

    dispatch(clearAccessToken());
    dispatch(clearUserDetails());

    clearChatStore();
    clearMessageStore();

    window.location.replace("/");
};
