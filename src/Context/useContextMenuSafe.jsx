import { useContext } from 'react';
import { ContextMenuContext } from './ContextMenuContext';

export const useContextMenuSafe = () => {
  try {
    const context = useContext(ContextMenuContext);
    console.log('useContextMenuSafe - context:', context);
    // Return context if available, otherwise return fallback
    return context || {
      showContextMenu: null,
      closeContextMenu: () => {},
      isOpen: false
    };
  } catch (error) {
    console.log('useContextMenuSafe - error:', error);
    // Return a safe fallback when context is not available
    return {
      showContextMenu: null,
      closeContextMenu: () => {},
      isOpen: false
    };
  }
};
