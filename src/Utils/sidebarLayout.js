export const SIDEBAR_CURRENT_WIDTH_VAR = '--sidebar-current-width';

export const syncSidebarCurrentWidth = ({
    isDesktop,
    isOpen,
    openWidth = 240,
    collapsedWidth = 72,
}) => {
    const width = isDesktop ? `${isOpen ? openWidth : collapsedWidth}px` : '0px';
    document.documentElement.style.setProperty(SIDEBAR_CURRENT_WIDTH_VAR, width);
};

export const clearSidebarCurrentWidth = () => {
    document.documentElement.style.removeProperty(SIDEBAR_CURRENT_WIDTH_VAR);
};
