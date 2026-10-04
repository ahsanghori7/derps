import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const ContextMenuContext = createContext();

export { ContextMenuContext };

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  console.log('useContextMenu called, context:', !!context);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
};

export const ContextMenuProvider = ({ children }) => {
  console.log('ContextMenuProvider initialized');
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);

  // Simple test to verify provider is working
  React.useEffect(() => {
    console.log('ContextMenuProvider mounted');
    return () => {
      console.log('ContextMenuProvider unmounted');
    };
  }, []);

  const showContextMenu = (e, menuItems) => {
    console.log('showContextMenu called with menuItems:', menuItems);
    e.preventDefault();
    e.stopPropagation();
    
    // Close any existing context menu first
    closeContextMenu();
    
    const estimatedMenuHeight = 120;
    const estimatedMenuWidth = 160;
    const spaceBelow = window.innerHeight - e.clientY;
    const placeAbove = spaceBelow < estimatedMenuHeight;
    const top = placeAbove
      ? e.clientY - estimatedMenuHeight - 8
      : e.clientY + 8;
    const left = Math.min(
      Math.max(e.clientX, 8),
      window.innerWidth - estimatedMenuWidth - 8
    );

    setContextMenu({
      x: left,
      y: top,
      items: menuItems,
      placeAbove
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeContextMenu();
      }
    };

    const handleContextMenu = (event) => {
      // Close context menu when right-clicking elsewhere
      closeContextMenu();
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleContextMenu);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [contextMenu]);

  const value = {
    showContextMenu,
    closeContextMenu,
    isOpen: !!contextMenu
  };
  
  console.log('ContextMenuProvider value:', value);

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
      {contextMenu && (
        <div
          ref={menuRef}
          className={`fixed z-50 w-40 ${document.documentElement.classList.contains('dark') ? 'bg-gray-800 divide-gray-600' : 'bg-white divide-y divide-gray-100'} rounded-md shadow-lg ring-1 ring-black ring-opacity-5 ${
            contextMenu.placeAbove ? 'origin-bottom-right' : 'origin-top-right'
          }`}
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <div className="px-1 py-1">
            {contextMenu.items.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  closeContextMenu();
                }}
                className={`${
                  document.documentElement.classList.contains('dark')
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-100'
                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </ContextMenuContext.Provider>
  );
};

export default ContextMenuProvider;
