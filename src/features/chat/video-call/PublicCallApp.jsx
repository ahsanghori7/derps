import { SocketProvider } from '@contexts/SocketContext';
import { VideoCallProvider } from '@contexts/VideoCallContext';
import GuestCallEntry from './GuestCallEntry';

/**
 * Public call entry that mounts socket + video providers
 * even when the user isn't logged in, so guests can join.
 */
const PublicCallApp = () => {
  return (
    <SocketProvider>
      <VideoCallProvider>
        <GuestCallEntry />
      </VideoCallProvider>
    </SocketProvider>
  );
};

export default PublicCallApp;

