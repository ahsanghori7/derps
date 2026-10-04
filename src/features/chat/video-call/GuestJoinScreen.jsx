import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { baseURl } from '../../../Config/systemConfig';
import { postRequestWithBodyWithoutHeader } from '@api/fetch';
import '../shared/theme/ChatWindow.css';

const GuestJoinScreen = ({ onGuestToken }) => {
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const trimmedName = useMemo(() => String(displayName ?? '').trim(), [displayName]);
  const canJoin = Boolean(trimmedName) && !isSubmitting;

  const handleJoin = async () => {
    if (isSubmitting) return;
    if (!trimmedName) {
      setError('Please enter your name to join.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await postRequestWithBodyWithoutHeader(`${baseURl}video-room/guest-token`, {
        displayName: trimmedName,
      });

      const token = res?.token;
      if (!token) {
        throw new Error('Guest token endpoint did not return a token');
      }
      
      const finalName = res?.displayName || trimmedName;
      onGuestToken({ token, guestId: res?.guestId, displayName: finalName });
    } catch (e) {
      setError(e?.message ? String(e.message) : 'Failed to join as guest');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="chat-scroll fixed chat-fullscreen flex items-center justify-center py-2 sm:py-3 z-50 overflow-auto"
      style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}
    >
      <div className="w-full max-w-lg mx-4">
        <div className="chat-guest-panel rounded-2xl p-5 sm:p-6 shadow-xl">
          <h2 className="text-xl sm:text-2xl font-semibold chat-text">Join meeting as guest</h2>
          <p className="text-sm chat-text-secondary mt-2">
            Enter a name so others can recognize you in the call.
          </p>

          <div className="mt-5">
            <label className="block text-sm font-medium chat-text-secondary mb-2">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="chat-input-field w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              maxLength={64}
              disabled={isSubmitting}
              autoFocus
            />
            {!trimmedName && (
              <p className="text-xs chat-text-muted mt-2">
                Your name will be visible to other participants.
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-900/40 border border-red-700 rounded-xl p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleJoin}
              disabled={!canJoin}
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? 'Joining…' : 'Join as guest'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

GuestJoinScreen.propTypes = {
  onGuestToken: PropTypes.func.isRequired, // ({ token, guestId, displayName }) => void
};

export default GuestJoinScreen;

