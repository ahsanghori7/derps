import PropTypes from 'prop-types';
import { CHAT_THEME_SOURCE } from './chatThemeConfig';
import './chatTheme.css';
import './ChatWindow.css';

const ChatThemeRoot = ({ children, className = '', style }) => (
  <div
    className={`chat-theme-root ${className}`.trim()}
    data-chat-theme={CHAT_THEME_SOURCE}
    style={style}
  >
    {children}
  </div>
);

ChatThemeRoot.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ChatThemeRoot;
