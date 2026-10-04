import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import Loader from "../../../../Components/Loader";
import NoDataFound from "../../../../Components/NoDataFound";
import {
    getPublicApplicationContext,
    getPublicApplicationProgress,
} from "../../api/applicationPublicApi";
import { getApplicationWizardRoute } from "../../../../Utils/applicationNavigation";

const UserActivations = lazy(() => import("../../../../Screens/UserActivations"));
const ApplicationInformation = lazy(() => import("../../../../Screens/ApplicationInformation"));
const SelectPlan = lazy(() => import("../../../../Screens/SelectPlan"));
const ProductList = lazy(() => import("../../../../Screens/ProductList"));
const ShipmentAndPickup = lazy(() => import("../../../../Screens/ShipmentAndPickup"));
const SubmitApplication = lazy(() => import("../../../../Screens/SubmitApplication"));
const RequestSubmitted = lazy(() => import("../../../../Screens/RequestSubmitted"));

const PAGE_STYLE = {
    minHeight: "100vh",
    backgroundColor: "var(--dashboard-bg)",
};

// Fixed viewport shell for the ready state: header stays put, only SCROLL_AREA_STYLE scrolls.
const SHELL_STYLE = {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--dashboard-bg)",
    overflow: "hidden",
};

const SCROLL_AREA_STYLE = {
    flex: 1,
    overflowY: "auto",
};

const CONTENT_STYLE = {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 16px 40px",
};

const HEADER_STYLE = {
    height: 65,
    display: "flex",
    alignItems: "center",
    backgroundColor: "var(--dashboard-card-bg)",
    borderBottom: "1px solid var(--dashboard-box-border, #E5E7EB)",
};

const HEADER_CONTENT_STYLE = {
    maxWidth: 1400,
    width: "100%",
    margin: "0 auto",
    padding: "0 16px",
};

const TenantBrandingHeader = ({ tenantContext }) => {
    const [logoError, setLogoError] = useState(false);
    const name = tenantContext?.name;
    const showLogo = Boolean(tenantContext?.logo) && !logoError;

    if (!showLogo && !name) {
        return <div style={HEADER_STYLE} aria-hidden="true" />;
    }

    return (
        <div style={HEADER_STYLE}>
            <div style={HEADER_CONTENT_STYLE}>
                {showLogo ? (
                    <img
                        src={tenantContext.logo}
                        alt={name || "logo"}
                        className="block w-24 sm:w-32 h-auto max-h-10 object-contain align-middle"
                        style={{ maxHeight: "40px" }}
                        onError={() => setLogoError(true)}
                    />
                ) : (
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--sidebar-text-primary)" }}>
                        {name}
                    </span>
                )}
            </div>
        </div>
    );
};

export const DRAFT_STORAGE_KEY = "publicApplicationDraft";

export const readPublicApplicationDraft = (tenantSlug) => {
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return null;
        const draft = JSON.parse(raw);
        if (!draft || draft.tenantSlug !== tenantSlug) return null;
        return draft;
    } catch {
        return null;
    }
};

export const writePublicApplicationDraft = (draft) => {
    try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
        // ignore quota / private mode
    }
};

export const clearPublicApplicationDraft = () => {
    try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
        // ignore
    }
};

const GuestWizardEntry = ({ tenantSlug }) => {
    const [resumeState, setResumeState] = useState(undefined); // undefined = loading, null = start fresh

    useEffect(() => {
        let cancelled = false;
        const draft = readPublicApplicationDraft(tenantSlug);
        const applicationId = draft?.applicationId || draft?.applicationIds?.[0];

        if (!applicationId) {
            setResumeState(null);
            return;
        }

        getPublicApplicationProgress({ applicationId, tenantSlug })
            .then((result) => {
                if (cancelled) return;
                if (!result?.data) {
                    clearPublicApplicationDraft();
                    setResumeState(null);
                    return;
                }
                setResumeState({
                    route: getApplicationWizardRoute(result.data.currentStep),
                    state: {
                        tenantSlug,
                        applicationId: draft.applicationId,
                        applicationIds: draft.applicationIds,
                    },
                });
            })
            .catch(() => {
                if (!cancelled) setResumeState(null);
            });

        return () => {
            cancelled = true;
        };
    }, [tenantSlug]);

    if (resumeState === undefined) {
        return (
            <div className="text-center w-full mx-auto my-20">
                <Loader message="Loading..." subMessage="Please wait" />
            </div>
        );
    }

    if (resumeState === null) {
        return <Navigate to="userActivations" state={{ tenantSlug }} replace />;
    }

    return <Navigate to={resumeState.route} state={resumeState.state} replace />;
};

const PublicApplication = () => {
    const { tenantSlug } = useParams();
    const [status, setStatus] = useState("loading"); // 'loading' | 'ready' | 'unavailable'
    const [tenantContext, setTenantContext] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getPublicApplicationContext({ tenantSlug })
            .then((result) => {
                if (cancelled) return;
                setTenantContext(result?.data || null);
                setStatus("ready");
            })
            .catch(() => {
                if (!cancelled) setStatus("unavailable");
            });
        return () => {
            cancelled = true;
        };
    }, [tenantSlug]);

    if (status === "loading") {
        return (
            <div style={PAGE_STYLE} className="flex items-center justify-center">
                <Loader message="Loading..." subMessage="Please wait" />
            </div>
        );
    }

    if (status === "unavailable") {
        return (
            <div style={PAGE_STYLE} className="flex items-center justify-center">
                <NoDataFound
                    title="Link Unavailable"
                    description="This application link is no longer available. Please contact the business that shared it with you."
                />
            </div>
        );
    }

    return (
        <div style={SHELL_STYLE}>
            <TenantBrandingHeader tenantContext={tenantContext} />
            <div style={SCROLL_AREA_STYLE}>
                <div style={{ height: 65 }} aria-hidden="true" />
                <div style={CONTENT_STYLE}>
                    <Suspense fallback={<Loader fullscreen message="Loading..." subMessage="Please wait" />}>
                        <Routes>
                            <Route index element={<GuestWizardEntry tenantSlug={tenantSlug} />} />
                            <Route path="userActivations" element={<UserActivations />} />
                            <Route path="selectPlan" element={<SelectPlan />} />
                            <Route path="applicationInformation" element={<ApplicationInformation />} />
                            {/* Old per-screen Information routes (bookmarks / old links) */}
                            <Route path="businessInformation" element={<ApplicationInformation />} />
                            <Route path="ownershipInformation" element={<ApplicationInformation />} />
                            <Route path="financialInformation" element={<ApplicationInformation />} />
                            <Route path="preferences" element={<ApplicationInformation />} />
                            <Route path="productList" element={<ProductList />} />
                            <Route path="shipmentAndPickup" element={<ShipmentAndPickup />} />
                            <Route path="submitApplication" element={<SubmitApplication />} />
                            <Route path="requestSubmitted" element={<RequestSubmitted />} />
                            <Route path="*" element={<Navigate to="." replace />} />
                        </Routes>
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default PublicApplication;
