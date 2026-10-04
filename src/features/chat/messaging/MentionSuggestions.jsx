import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Avatar from '../shared/components/Avatar';

const MentionSuggestions = ({ 
  members, 
  onMentionSelect, 
  searchQuery, 
  isVisible, 
  position,
  selectedIndex,
  onSelectedIndexChange 
}) => {
  const suggestionsRef = useRef(null);

  // Filter members based on search query
  const filteredMembers = members.filter(member => {
    if (!member.user?.name) return false;
    return member.user.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isVisible || filteredMembers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        onSelectedIndexChange((prevIndex) => 
          prevIndex < filteredMembers.length - 1 ? prevIndex + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        onSelectedIndexChange((prevIndex) => 
          prevIndex > 0 ? prevIndex - 1 : filteredMembers.length - 1
        );
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onMentionSelect(null); // Close suggestions
        break;
    }
  }, [isVisible, filteredMembers.length, onMentionSelect, onSelectedIndexChange]);

  // Add keyboard event listener for arrow keys and escape
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      handleKeyDown(e);
    };

    if (isVisible) {
      document.addEventListener('keydown', handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isVisible, handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (suggestionsRef.current && selectedIndex >= 0) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isVisible || filteredMembers.length === 0) {
    return null;
  }

  return (
    <div
      ref={suggestionsRef}
      className="chat-surface border chat-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
      onMouseDown={(e) => {
        // Prevent textarea blur and stop ChatWindow's document mousedown handler
        // from closing the suggestions before we can select an item.
        e.preventDefault();
        e.stopPropagation();
      }}
style={{
  position: "fixed",
  left: `${position.left}px`,
  top: `${position.top}px`,
  minWidth: "200px",
  maxWidth: "300px",
  zIndex: 9999
}}

    >
      {filteredMembers.map((member, index) => (
        <div
          key={member.userId}
          className={`px-3 py-2 cursor-pointer flex items-center gap-2 chat-hover ${
            index === selectedIndex ? 'chat-control' : ''
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMentionSelect(member);
          }}
        >
          {/* Avatar */}
          <Avatar id={member.userId || member.user?.id} name={member.user?.name} user={member.user} size="sm" />
          
          {/* Member info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium chat-text truncate">
              {member.user?.name || 'Unknown User'}
            </div>
            {member.user?.email && (
              <div className="text-xs chat-text-muted truncate">
                {member.user.email}
              </div>
            )}
          </div>
          
          {/* Online status indicator */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            member.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
      ))}
    </div>
  );
};

MentionSuggestions.propTypes = {
  members: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      isOnline: PropTypes.bool,
      user: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
      }),
    }),
  ).isRequired,
  onMentionSelect: PropTypes.func.isRequired,
  searchQuery: PropTypes.string,
  isVisible: PropTypes.bool,
  position: PropTypes.shape({
    left: PropTypes.number,
    top: PropTypes.number,
  }),
  selectedIndex: PropTypes.number,
  onSelectedIndexChange: PropTypes.func.isRequired,
};

export default MentionSuggestions;
