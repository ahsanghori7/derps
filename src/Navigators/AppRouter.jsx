import { Route, Routes, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry as lazy } from "../Utils/lazyWithRetry";
import ChunkErrorBoundary from "../Components/ChunkErrorBoundary";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import Navbar from "../Components/Navbar";
import Toast from "../Components/Toast";
import { SocketProvider } from "../Contexts/SocketContext";
import { ChatSocketSync } from "../Contexts/ChatSocketSync";
import { NotificationProvider, useNotifications } from "../Contexts/NotificationContext";
import { VideoCallProvider } from "../Contexts/VideoCallContext";
import { IncomingCallProvider } from "../Contexts/IncomingCallContext";
import NotificationPopup from "../features/notifications/components/NotificationPopup";
import VideoCallBadge from "@features/chat/meetings/VideoCallBadge";
import IncomingCallBanner from "@features/chat/calls/IncomingCallBanner";
import { notificationService } from "../features/notifications/utils/notificationService";
import { toast } from "react-toastify";
import Loader from "../Components/Loader";
import UnacknowledgedMemoPrompt from "../Components/UnacknowledgedMemoPrompt";

// Lazy load heavy components
const Home = lazy(() => import("../Screens/Home"));
const Login = lazy(() => import("../Screens/Login"));
const ForgotPassword = lazy(() => import("../Screens/ForgotPassword"));
const ResetPassword = lazy(() => import("../Screens/ResetPassword"));
const UserDashboard = lazy(() => import("../Screens/UserDashboard"));
const MasterDashboard = lazy(() => import("../Screens/MasterDashboard"));
const NotFound = lazy(() => import("../Screens/NotFound"));
const PublicCallApp = lazy(() => import("@features/chat/video-call/PublicCallApp"));
const SNItemDetail = lazy(() => import("../Screens/SNItemDetail"));
const PaymentSuccess = lazy(() => import("../Screens/PaymentSuccess"));
const PaymentCancel = lazy(() => import("../Screens/PaymentCancel"));
const ViewQuotation = lazy(() => import("../Screens/ViewQuotation"));
const PrivacyPolicy = lazy(() => import("../Screens/PrivacyPolicy"));
const DeleteAccount = lazy(() => import("../Screens/DeleteAccount"));
const AgentRequestSign = lazy(() => import("../Screens/AgentRequestSign"));
const ChangeRequestSign = lazy(() => import("../Screens/ChangeRequestSign"));
const ApplicationAgreementSign = lazy(() => import("../Screens/ApplicationAgreementSign"));
const PublicBookingPage = lazy(() => import("../features/booking/screens/PublicBookingPage"));
const PublicApplication = lazy(() => import("../features/applications/screens/PublicApplication"));

const isPublicQuoteReviewPath = (pathname = "") =>
  pathname === "/home/crmQuotation/view" || pathname.startsWith("/home/crmQuotation/view/");

const isPublicLegalPath = (pathname = "") =>
  pathname === "/privacy-policy" ||
  pathname === "/privacy" ||
  pathname === "/delete-account";

const isAgentRequestSignPath = (pathname = "") =>
  pathname === "/agent-request/sign" || pathname.startsWith("/agent-request/sign/");

const isChangeRequestSignPath = (pathname = "") =>
  pathname === "/change-request/sign" || pathname.startsWith("/change-request/sign/");

const isApplicationAgreementSignPath = (pathname = "") =>
  pathname === "/application/sign" || pathname.startsWith("/application/sign/");

const isPublicBookingPath = (pathname = "") => pathname.startsWith("/schedule/");
const isPublicApplyPath = (pathname = "") => pathname.startsWith("/apply/");

const isPublicSignPath = (pathname = "") =>
  isAgentRequestSignPath(pathname) ||
  isChangeRequestSignPath(pathname) ||
  isApplicationAgreementSignPath(pathname);

const isPublicFlowPath = (pathname = "") =>
  pathname === "/forgot-password" ||
  pathname === "/reset-password" ||
  pathname === "/payment/success" ||
  pathname === "/payment/cancelled" ||
  pathname === "/payment/cancel" ||
  isPublicLegalPath(pathname) ||
  isPublicQuoteReviewPath(pathname) ||
  isPublicSignPath(pathname) ||
  isPublicBookingPath(pathname) ||
  isPublicApplyPath(pathname);

// Move outside to avoid recreation on every render
// eslint-disable-next-line react/prop-types
const PrivateRoute = ({ element }) => {
  const isAuthenticated = Boolean(localStorage.getItem("accessToken"));
  return isAuthenticated ? element : <Navigate to="/" replace />;
};

// eslint-disable-next-line react/prop-types
const PublicOnlyRoute = ({ element }) => {
  const isAuthenticated = Boolean(localStorage.getItem("accessToken"));
  return isAuthenticated ? <Navigate to="/home" replace /> : element;
};

// Inner component that uses NotificationContext (must be inside NotificationProvider)
const AppContentWithNotifications = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  const isSignupPage = location.pathname === "/Signup";
  const isPublicQuoteReview = isPublicQuoteReviewPath(location.pathname);
  const isAuthFlowPage = isPublicFlowPath(location.pathname);
  const { activeNotifications, dismissNotification, markAsRead } = useNotifications();

  return (
    <>
      <Toast />
      {!isPublicSignPath(location.pathname) && !isPublicBookingPath(location.pathname) && !isPublicApplyPath(location.pathname) && <UnacknowledgedMemoPrompt />}
      {!isLoginPage && !isSignupPage && !isAuthFlowPage && <Navbar />}
      {!isPublicQuoteReview && !isPublicLegalPath(location.pathname) && !isPublicSignPath(location.pathname) && !isPublicBookingPath(location.pathname) && !isPublicApplyPath(location.pathname) && <VideoCallBadge />}
      {!isPublicQuoteReview && !isPublicLegalPath(location.pathname) && !isPublicSignPath(location.pathname) && !isPublicBookingPath(location.pathname) && !isPublicApplyPath(location.pathname) && <IncomingCallBanner />}
      {/* Render multiple notification popups stacked */}
      {/* Reverse array so newest notifications appear at bottom (closest to edge) */}
      {[...activeNotifications].reverse().map((notification, index) => (
        <NotificationPopup
          key={notification.popupId}
          notification={notification}
          onDismiss={() => dismissNotification(notification.popupId)}
          onMarkAsRead={markAsRead}
          index={index}
        />
      ))}
      <ChunkErrorBoundary>
      <Suspense fallback={<Loader fullscreen message="Loading..." subMessage="Please wait" />}>
        <Routes>
        <Route path="/" element={<PublicOnlyRoute element={<Login />} />} />
        <Route path="/forgot-password" element={<PublicOnlyRoute element={<ForgotPassword />} />} />
        <Route path="/reset-password" element={<PublicOnlyRoute element={<ResetPassword />} />} />
        <Route path="/payment/success" element={<PublicOnlyRoute element={<PaymentSuccess />} />} />
        <Route path="/payment/cancelled" element={<PublicOnlyRoute element={<PaymentCancel />} />} />
        <Route path="/payment/cancel" element={<Navigate to="/payment/cancelled" replace />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/agent-request/sign" element={<AgentRequestSign />} />
        <Route path="/change-request/sign" element={<ChangeRequestSign />} />
        <Route path="/application/sign" element={<ApplicationAgreementSign />} />
        {/* Public booking page — external guests schedule a meeting, no login required */}
        <Route path="/schedule/:tenantSlug/:userSlug" element={<PublicBookingPage />} />
        {/* Public merchant application — external guests apply via a tenant's shared link, no login required */}
        <Route path="/apply/:tenantSlug/*" element={<PublicApplication />} />
        {/* Public quote review from email — no login required */}
        <Route path="home/crmQuotation/view" element={<ViewQuotation />} />
        {/* Meeting invite links use /join; mount the same Sidebar shell as /home so logged-in users keep their nav */}
        <Route path="join/*" element={<PrivateRoute element={<Home />} />} />
        <Route path="home/*" element={<PrivateRoute element={<Home />} />} />
        <Route path="userDashboard/*" element={<PrivateRoute element={<UserDashboard />} />} />
        <Route path="masterDashboard/*" element={<PrivateRoute element={<MasterDashboard />} />} />
        <Route path="snItemDetail" element={<PrivateRoute element={<SNItemDetail />} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ChunkErrorBoundary>
    </>
  );
};

function AppRouter() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  const isSignupPage = location.pathname === "/Signup";
  const isAuthFlowPage = isPublicFlowPath(location.pathname);
  
  // Check if user is authenticated to enable socket connection
  const accessToken = useSelector((state) => state.auth.accessToken) || localStorage.getItem("accessToken");
  const isAuthenticated = Boolean(accessToken);

  // Initialize notification service when app loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wait a bit for the app to load
      const timer = setTimeout(() => {
        notificationService.initialize().then(success => {
          if (success) {
            // 
          } else {
            toast.warn('Notification service initialization failed or not supported');
          }
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Wrap with SocketProvider and NotificationProvider only if authenticated
  return isAuthenticated ? (
    <SocketProvider>
      <ChatSocketSync />
      <NotificationProvider>
        <VideoCallProvider>
          <IncomingCallProvider>
            <AppContentWithNotifications />
          </IncomingCallProvider>
        </VideoCallProvider>
      </NotificationProvider>
    </SocketProvider>
  ) : (
    <>
      <Toast />
      {!isLoginPage && !isSignupPage && !isAuthFlowPage && <Navbar />}
      <ChunkErrorBoundary>
      <Suspense fallback={<Loader fullscreen message="Loading..." subMessage="Please wait" />}>
      <Routes>
        <Route path="/" element={<PublicOnlyRoute element={<Login />} />} />
        <Route path="/forgot-password" element={<PublicOnlyRoute element={<ForgotPassword />} />} />
        <Route path="/reset-password" element={<PublicOnlyRoute element={<ResetPassword />} />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancelled" element={<PaymentCancel />} />
        <Route path="/payment/cancel" element={<Navigate to="/payment/cancelled" replace />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/agent-request/sign" element={<AgentRequestSign />} />
        <Route path="/change-request/sign" element={<ChangeRequestSign />} />
        <Route path="/application/sign" element={<ApplicationAgreementSign />} />
        {/* Public booking page — external guests schedule a meeting, no login required */}
        <Route path="/schedule/:tenantSlug/:userSlug" element={<PublicBookingPage />} />
        {/* Public merchant application — external guests apply via a tenant's shared link, no login required */}
        <Route path="/apply/:tenantSlug/*" element={<PublicApplication />} />
        {/* Allow guests to join calls at this URL without logging in */}
        <Route path="home/call/*" element={<PublicCallApp />} />
        <Route path="join/*" element={<PublicCallApp />} />
        {/* Public quote review from email — no login required */}
        <Route path="home/crmQuotation/view" element={<ViewQuotation />} />
        <Route path="home/*" element={<PrivateRoute element={<Home />} />} />
        <Route path="userDashboard/*" element={<PrivateRoute element={<UserDashboard />} />} />
        <Route path="masterDashboard/*" element={<PrivateRoute element={<MasterDashboard />} />} />
        <Route path="snItemDetail" element={<PrivateRoute element={<SNItemDetail />} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ChunkErrorBoundary>
    </>
  );
}

export default AppRouter;