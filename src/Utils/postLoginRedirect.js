export const getPostLoginPath = (userDetails) => {
    try {
        const user =
            userDetails ??
            JSON.parse(localStorage.getItem("userDetails") || "{}");
        const roleTitle = (user?.roleTitle || "").toLowerCase();

        if (roleTitle === "agent") {
            return "/userdashboard/userMemo";
        }
        if (user?.roleTitle === "Super Admin") {
            return "/masterDashboard/TenantsDashboard";
        }
        return "/home";
    } catch {
        return "/home";
    }
};
