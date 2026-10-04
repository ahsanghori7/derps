import Heading from "../../Components/Heading"
import Stepper from "../../Components/Stepper";
import BottonCustom from "../../Components/ButtonCustom";
import SignatureCanvas from "react-signature-canvas";
import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { HiInformationCircle, HiCheck } from "react-icons/hi";
import { PencilLine, Mail } from "lucide-react";
import { getRequestWithOutBody, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import {
    submitPublicApplicationStep,
    uploadPublicApplicationFile,
    getPublicAgreementDocuments,
    getPublicAgreementSummary,
    signPublicAgreementDocument,
} from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { APPLICATION_STEPS, goToPreviousWizardStep, isGuestSession } from "../../Utils/applicationNavigation";
import { clearPublicApplicationDraft } from "../../features/applications/screens/PublicApplication";

const SIGN_METHODS = {
    ELECTRONIC: "electronic",
    EMAIL: "email",
};

const PUBLIC_AGREEMENT_SIGN_PATH = "/application/sign";

const appKey = (applicationId) => String(applicationId ?? "");

const getAppMapValue = (map, applicationId) => {
    if (!map || applicationId == null || applicationId === "") return undefined;
    if (Object.prototype.hasOwnProperty.call(map, applicationId)) return map[applicationId];
    const key = appKey(applicationId);
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
    const asNum = Number(applicationId);
    if (!Number.isNaN(asNum) && Object.prototype.hasOwnProperty.call(map, asNum)) {
        return map[asNum];
    }
    return undefined;
};

const SERVICE_OPTIONS = [
    { id: 1, text: 'ATM Solutions', value: 'atm' },
    { id: 2, text: 'Credit Card Processing', value: 'credit-card' },
    { id: 3, text: 'Cash Advance', value: 'cash-advance' },
    { id: 4, text: 'Point-Of-Sale Solutions', value: 'pos' },
    { id: 5, text: 'EBT Processing', value: 'ebt' },
    { id: 6, text: 'AIRVAC Systems', value: 'airvac' },
    { id: 7, text: 'Website Services', value: 'website' },
    { id: 8, text: 'ACH Processing', value: 'ach-processing' },
];

const getServiceLabel = (solution) => {
    const normalizedSolution = (solution || "").toLowerCase();
    return SERVICE_OPTIONS.find((option) => option.value === normalizedSolution)?.text || solution;
};

const getAgreementTitle = (plan) => {
    const normalized = (plan || "").toLowerCase();
    if (normalized.includes("placement")) return "ATM Placement Agreement";
    if (normalized.includes("owner")) return "ATM Owner Agreement";
    return "Subscription Agreement";
};

const SignMethodCard = ({ selected, onSelect, icon, title, recommended, description, features }) => (
    <button
        type="button"
        onClick={onSelect}
        className="w-full text-left h-full"
        style={{
            display: "flex",
            flexDirection: "column",
            border: selected ? "2px solid var(--dashboard-tab-active)" : "1px solid var(--dashboard-box-border, #E5E7EB)",
            borderRadius: 14,
            padding: "18px 18px 16px",
            backgroundColor: selected ? "rgba(59, 130, 246, 0.04)" : "var(--dashboard-card-bg)",
            boxShadow: selected ? "0 8px 24px rgba(59, 130, 246, 0.12)" : "0 1px 2px rgba(15, 23, 42, 0.04)",
            cursor: "pointer",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, transform 0.2s ease",
        }}
        onMouseEnter={(e) => {
            if (!selected) {
                e.currentTarget.style.borderColor = "var(--dashboard-tab-active)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(15, 23, 42, 0.08)";
                e.currentTarget.style.transform = "translateY(-1px)";
            }
        }}
        onMouseLeave={(e) => {
            if (!selected) {
                e.currentTarget.style.borderColor = "var(--dashboard-box-border, #E5E7EB)";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
                e.currentTarget.style.transform = "translateY(0)";
            }
        }}
    >
        <div className="flex items-start gap-3">
            <div
                style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: selected ? "6px solid var(--dashboard-tab-active)" : "2px solid #D1D5DB",
                    backgroundColor: "#fff",
                    flexShrink: 0,
                    marginTop: 2,
                }}
            />
            <div
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: selected ? "rgba(59, 130, 246, 0.14)" : "var(--dashboard-card-bg2, #F3F4F6)",
                    color: selected ? "var(--dashboard-tab-active)" : "#6B7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <p style={{ fontWeight: 700, fontSize: 16, color: "var(--sidebar-text-primary)", lineHeight: 1.3 }}>
                        {title}
                    </p>
                    {recommended && (
                        <span
                            style={{
                                backgroundColor: "rgba(59, 130, 246, 0.12)",
                                color: "var(--dashboard-tab-active)",
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 999,
                                padding: "3px 9px",
                                letterSpacing: 0.2,
                            }}
                        >
                            Recommended
                        </span>
                    )}
                </div>
                <p style={{ fontSize: 13, color: "var(--Gray, #6B7280)", marginTop: 6, lineHeight: 1.5 }}>
                    {description}
                </p>
            </div>
        </div>

        <div
            style={{
                marginTop: "auto",
                paddingTop: 14,
            }}
        >
            <div
                style={{
                    borderRadius: 10,
                    padding: "12px 14px",
                    backgroundColor: selected ? "rgba(59, 130, 246, 0.08)" : "var(--dashboard-card-bg2, #F3F4F6)",
                }}
            >
                {features.map((feature, index) => (
                    <div key={feature} className="flex items-center gap-2" style={{ marginTop: index === 0 ? 0 : 8 }}>
                        <span
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                backgroundColor: selected ? "rgba(59, 130, 246, 0.16)" : "rgba(59, 130, 246, 0.1)",
                                color: "var(--dashboard-tab-active)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <HiCheck size={13} />
                        </span>
                        <span style={{ fontSize: 13, color: "var(--sidebar-text-primary)", fontWeight: 500 }}>{feature}</span>
                    </div>
                ))}
            </div>
        </div>
    </button>
);

const extractFileReference = (result, fallbackName = "signature.png") => ({
    url: result?.data?.merchantSignatureFileUrl?.url
        ?? result?.data?.fileUrl?.url
        ?? result?.data?.uploadedFiles?.url,
    mimetype: result?.data?.merchantSignatureFileUrl?.mimetype
        ?? result?.data?.fileUrl?.mimetype
        ?? result?.data?.uploadedFiles?.mimetype
        ?? "image/png",
    originalname: result?.data?.merchantSignatureFileUrl?.originalname
        ?? result?.data?.fileUrl?.originalname
        ?? result?.data?.uploadedFiles?.originalname
        ?? fallbackName,
});

const SubmitApplication = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const roleTitleNormalized = (userData?.roleTitle || "").toLowerCase();
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;
    const hasOwnHardwareByApp =
        location.state?.hasOwnHardwareByApp
        || location.state?.eighthStep?.hasOwnHardwareByApp
        || location.state?.seventhStep?.hasOwnHardwareByApp
        || location.state?.sixthStep?.hasOwnHardwareByApp
        || {};

    const applicationIds = useMemo(() => {
        if (location.state?.applicationIds?.length) return location.state.applicationIds;
        const fromApps = (location.state?.applications || [])
            .map((app) => app.applicationId || app.id)
            .filter(Boolean);
        if (fromApps.length) return fromApps;
        return [
            location.state?.applicationId
            || location.state?.eighthStep?.applicationId,
        ].filter(Boolean);
    }, [
        location.state?.applicationIds,
        location.state?.applications,
        location.state?.applicationId,
        location.state?.eighthStep?.applicationId,
    ]);

    const applications = useMemo(() => {
        const fromState = location.state?.applications || [];
        const bySolution = location.state?.firstStep?.categoryIdBySolution || {};
        if (fromState.length > 0) {
            return fromState
                .filter((app) => app?.applicationId && app?.solution)
                .map((app) => ({
                    ...app,
                    categoryId: app.categoryId ?? bySolution[app.solution] ?? null,
                }));
        }
        return [];
    }, [location.state?.applications, location.state?.firstStep?.categoryIdBySolution]);

    const getCategoryIdForApp = useCallback((applicationId) => {
        const app = applications.find((item) => String(item.applicationId) === String(applicationId));

        if (app?.categoryId != null && app.categoryId !== "") return app.categoryId;

        const solution = app?.solution;
        const bySolution = location.state?.firstStep?.categoryIdBySolution;
        if (solution && bySolution?.[solution] != null) {
            return bySolution[solution];
        }

        const solutions = location.state?.firstStep?.solutions || [];
        const categoryIds = location.state?.firstStep?.categoryIds || [];
        if (solution && solutions.length && categoryIds.length) {
            const solutionIndex = solutions.findIndex((s) => s === solution);
            if (solutionIndex >= 0 && categoryIds[solutionIndex] != null) {
                return categoryIds[solutionIndex];
            }
        }

        const appIndex = applications.findIndex(
            (item) => String(item.applicationId) === String(applicationId)
        );
        if (appIndex >= 0 && categoryIds[appIndex] != null) {
            return categoryIds[appIndex];
        }
        if (!app && categoryIds.length === 1) return categoryIds[0];
        return null;
    }, [applications, location.state?.firstStep]);

    // Returns undefined when the app doesn't own hardware (omit the param entirely),
    // else the categoryId (or "" if unresolved) — shared by both the authenticated
    // URL builder below and the guest API call in loadAgreementDocs/fetchAllData.
    const getCategoryIdsParamForApp = useCallback((applicationId) => {
        const ownsHardware =
            hasOwnHardwareByApp[applicationId] === true
            || hasOwnHardwareByApp[String(applicationId)] === true;
        if (!ownsHardware) return undefined;
        const categoryId = getCategoryIdForApp(applicationId);
        return categoryId == null || categoryId === "" ? "" : categoryId;
    }, [hasOwnHardwareByApp, getCategoryIdForApp]);

    const buildAgreementDocumentsUrl = useCallback((applicationId) => {
        const base = `${baseURl}application/${applicationId}/agreement-documents`;
        const categoryIds = getCategoryIdsParamForApp(applicationId);
        if (categoryIds === undefined) return base;
        return `${base}?categoryIds=${encodeURIComponent(categoryIds)}`;
    }, [getCategoryIdsParamForApp]);

    const getApplicationPayloadFields = (applicationId) => {
        if (applicationIds.length > 1) {
            return { applicationIds };
        }
        return {
            applicationId:
                applicationId
                || applicationIds[0]
                || location.state?.applicationId
                || location.state?.eighthStep?.applicationId,
        };
    };

    const [loading, setLoading] = useState(false);
    const [agreementLoading, setAgreementLoading] = useState(false);
    const [signing, setSigning] = useState(false);
    const [fetchedDataByApp, setFetchedDataByApp] = useState({});
    const [checkedByApp, setCheckedByApp] = useState({});
    const [signatureByApp, setSignatureByApp] = useState({});
    const [signedByApp, setSignedByApp] = useState({});
    const [agreementDocsByApp, setAgreementDocsByApp] = useState({});
    const [activeDocIndex, setActiveDocIndex] = useState(0);
    const [summaryUrlByApp, setSummaryUrlByApp] = useState({});
    const [viewingSummary, setViewingSummary] = useState(false);
    const [activeApplicationId, setActiveApplicationId] = useState(null);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signMethodByApp, setSignMethodByApp] = useState({});
    const [emailSentByApp, setEmailSentByApp] = useState({});
    const [sendingEmail, setSendingEmail] = useState(false);
    const [signatureEmail, setSignatureEmail] = useState("");
    const [signatureOwnerFirstName, setSignatureOwnerFirstName] = useState("");
    const [signatureOwnerLastName, setSignatureOwnerLastName] = useState("");
    const signatureRef = useRef();
    const signMethodByAppRef = useRef({});
    const signatureEmailInitializedRef = useRef(false);
    const signatureOwnerInitializedRef = useRef(false);

    const resolvedApplications = useMemo(() => {
        if (applications.length > 0) {
            return applications;
        }

        const fallbackId =
            applicationIds[0]
            || location.state?.applicationId
            || location.state?.eighthStep?.applicationId;

        const fallbackSolution =
            location.state?.eighthStep?.solution
            || Object.values(fetchedDataByApp)[0]?.solution;

        if (fallbackId && fallbackSolution) {
            return [{ applicationId: fallbackId, solution: fallbackSolution }];
        }

        return [];
    }, [applications, applicationIds, location.state?.applicationId, location.state?.eighthStep, fetchedDataByApp]);

    const normalizeAgreementDocs = (result) => {
        const rows = result?.data?.agreementFileUrls || [];
        return rows
            .map((doc) => ({
                agreementId: doc?.agreementId,
                envelopeNumber: doc?.envelopeNumber,
                status: doc?.status,
                title: doc?.title || doc?.unsignedFileUrl?.originalname || "Agreement",
                // prefer the signed version once available
                url: doc?.signedFileUrl?.url || doc?.unsignedFileUrl?.url,
                signed: Boolean(doc?.signedFileUrl?.url) || doc?.status === "signed",
                unsignedFileUrl: doc?.unsignedFileUrl || null,
            }))
            .filter((doc) => doc.url);
    };

    const getFirstUnsignedDocIndex = (docs = []) =>
        docs.findIndex((doc) => !doc.signed);

    // Keep the same application sequence across every wizard step (by applicationIds).
    const sortedApplications = useMemo(() => {
        if (!resolvedApplications.length) return [];
        if (!applicationIds.length) return resolvedApplications;

        const byId = new Map(
            resolvedApplications.map((app) => [String(app.applicationId), app])
        );
        const ordered = [];
        const seen = new Set();

        applicationIds.forEach((id) => {
            const key = String(id);
            const app = byId.get(key);
            if (app && !seen.has(key)) {
                ordered.push(app);
                seen.add(key);
            }
        });

        resolvedApplications.forEach((app) => {
            const key = String(app.applicationId);
            if (!seen.has(key)) {
                ordered.push(app);
                seen.add(key);
            }
        });

        return ordered;
    }, [resolvedApplications, applicationIds]);

    const activeAppData = activeApplicationId ? getAppMapValue(fetchedDataByApp, activeApplicationId) : null;
    const activeDocs = activeApplicationId ? getAppMapValue(agreementDocsByApp, activeApplicationId) || [] : [];
    const activeDoc = activeDocs[activeDocIndex] || null;
    const activeAgreementTitle = activeDoc?.title || getAgreementTitle(activeAppData?.plan);
    const activeIsSigned = activeApplicationId ? Boolean(getAppMapValue(signedByApp, activeApplicationId)) : false;

    const loadAgreementDocs = useCallback(async (applicationId) => {
        if (!applicationId) return [];
        if (!isGuest && !accessToken) return [];

        setAgreementLoading(true);
        try {
            const result = isGuest
                ? await getPublicAgreementDocuments({
                    applicationId,
                    tenantSlug,
                    categoryIds: getCategoryIdsParamForApp(applicationId),
                })
                : await getRequestWithOutBody(buildAgreementDocumentsUrl(applicationId), accessToken);
            const docs = normalizeAgreementDocs(result);
            setAgreementDocsByApp((prev) => ({ ...prev, [applicationId]: docs }));
            return docs;
        } catch (error) {
            toast.error(error.message || "Failed to load agreement documents");
            return [];
        } finally {
            setAgreementLoading(false);
        }
    }, [accessToken, isGuest, tenantSlug, buildAgreementDocumentsUrl, getCategoryIdsParamForApp]);

    const fetchAgreementSummary = useCallback(async (applicationId) => {
        if (!applicationId) return null;
        if (!isGuest && !accessToken) return null;

        try {
            const result = isGuest
                ? await getPublicAgreementSummary({ applicationId, tenantSlug })
                : await getRequestWithOutBody(`${baseURl}application/${applicationId}/agreement-documents/summary`, accessToken);
            const url =
                result?.data?.envelopeSummaryFileUrl?.url
                ?? result?.data?.summaryFileUrl?.url
                ?? result?.data?.url;
            if (url) {
                setSummaryUrlByApp((prev) => ({ ...prev, [applicationId]: url }));
            }
            return url;
        } catch (error) {
            return null;
        }
    }, [accessToken, isGuest, tenantSlug]);

    const downloadAgreementSummary = async (applicationId) => {
        try {
            const url = isGuest
                ? `${baseURl}application/public/${applicationId}/agreement-documents/summary?download=true&tenantSlug=${encodeURIComponent(tenantSlug)}`
                : `${baseURl}application/${applicationId}/agreement-documents/summary?download=true`;
            const response = await fetch(
                url,
                isGuest ? {} : { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!response.ok) {
                throw new Error("Failed to download summary");
            }

            const contentType = response.headers.get("content-type") || "";
            let blob;

            if (contentType.includes("application/json")) {
                const json = await response.json();
                const url = json?.data?.summaryFileUrl?.url ?? json?.data?.url ?? json?.url;
                if (!url) throw new Error("Summary file not found");
                const fileResponse = await fetch(url);
                if (!fileResponse.ok) throw new Error("Failed to download summary");
                blob = await fileResponse.blob();
            } else {
                blob = await response.blob();
            }

            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `agreement-summary-${applicationId}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            toast.error(error.message || "Failed to download summary");
        }
    };

    const dataUrlToBlob = async (dataUrl) => {
        const res = await fetch(dataUrl);
        return await res.blob();
    };

    const createSignatureFile = async (signature) => {
        if (!signature) return null;

        if (typeof signature === "string" && signature.startsWith("typed:")) {
            const canvas = document.createElement("canvas");
            canvas.width = 400;
            canvas.height = 100;
            const ctx = canvas.getContext("2d");
            ctx.font = "32px cursive";
            ctx.fillStyle = "black";
            ctx.fillText(signature.replace("typed:", ""), 20, 60);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
            return new File([blob], "signature.png", { type: "image/png" });
        }

        if (typeof signature === "string" && signature.startsWith("data:")) {
            const blob = await dataUrlToBlob(signature);
            return new File([blob], "signature.png", { type: blob.type || "image/png" });
        }

        if (typeof signature === "string" && signature.startsWith("blob:")) {
            const blob = await fetch(signature).then((res) => res.blob());
            return new File([blob], "signature.png", { type: blob.type || "image/png" });
        }

        return null;
    };

    const uploadMerchantSignature = async (signature) => {
        const fileToUpload = await createSignatureFile(signature);
        if (!fileToUpload) {
            throw new Error("Please provide a valid signature");
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("type", "application-merchant-signature");

        const result = isGuest
            ? await uploadPublicApplicationFile(formData, tenantSlug)
            : await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
        const fileReference = extractFileReference(result);

        if (!fileReference.url) {
            throw new Error("Failed to upload signature");
        }

        return fileReference;
    };

    useEffect(() => {
        const fetchAllData = async () => {
            const idsToFetch = applicationIds.length
                ? applicationIds
                : [location.state?.applicationId || location.state?.eighthStep?.applicationId].filter(Boolean);

            if (!idsToFetch.length) return;
            if (!isGuest && !accessToken) return;

            setLoading(true);
            try {
                // Guests have no public equivalent of `GET application/:id`, so the
                // form's own checked/signature state simply starts empty for them —
                // fine for a first-time submit, they have nothing previously saved to restore.
                let initialSigned = {};
                if (!isGuest) {
                    const results = await Promise.all(
                        idsToFetch.map((id) => getRequestWithOutBody(`${baseURl}application/${id}`, accessToken))
                    );

                    const dataByApp = {};
                    const initialChecked = {};
                    const initialSignatures = {};

                    results.forEach((result, index) => {
                        const appId = idsToFetch[index];
                        const data = result?.data;
                        if (!data) return;

                        dataByApp[appId] = data;
                        initialChecked[appId] = data?.agreedTermsAndConditon === 0 ? false : true;

                        const existingSignature = data?.merchantSignatureFileUrl;
                        if (existingSignature?.url) {
                            initialSignatures[appId] = existingSignature;
                            initialSigned[appId] = true;
                        }
                    });

                    setFetchedDataByApp(dataByApp);
                    setCheckedByApp(initialChecked);
                    setSignatureByApp(initialSignatures);
                    setSignedByApp(initialSigned);
                }

                // Fetch agreement documents for every application
                // If app already owns hardware, pass categoryIds from first step
                const docsResults = await Promise.all(
                    idsToFetch.map((id) =>
                        (isGuest
                            ? getPublicAgreementDocuments({
                                applicationId: id,
                                tenantSlug,
                                categoryIds: getCategoryIdsParamForApp(id),
                            })
                            : getRequestWithOutBody(buildAgreementDocumentsUrl(id), accessToken)
                        ).catch(() => null)
                    )
                );

                const docsByApp = {};
                docsResults.forEach((result, index) => {
                    docsByApp[idsToFetch[index]] = result ? normalizeAgreementDocs(result) : [];
                });
                setAgreementDocsByApp(docsByApp);

                // For apps with agreement documents, signed state comes from the documents themselves
                setSignedByApp(() => {
                    const next = { ...initialSigned };
                    Object.entries(docsByApp).forEach(([appId, docs]) => {
                        if (docs.length) {
                            next[appId] = docs.every((doc) => doc.signed);
                        }
                    });
                    return next;
                });

                // Load summaries for applications whose agreements are already all signed
                Object.entries(docsByApp).forEach(([appId, docs]) => {
                    if (docs.length && docs.every((doc) => doc.signed)) {
                        fetchAgreementSummary(appId);
                    }
                });
            } catch (error) {
                toast.error(error.message || "Failed to load application");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [accessToken, applicationIds, isGuest, tenantSlug, location.state?.applicationId, location.state?.eighthStep?.applicationId]);

    const updateChecked = (applicationId, checked) => {
        setCheckedByApp((prev) => ({
            ...prev,
            [applicationId]: checked,
        }));
    };

    const handlePreviousClick = () => {
        goToPreviousWizardStep(navigate, {
            pathname: location.pathname,
            roleTitle: userData?.roleTitle,
            state: location.state,
        });
    };

    const hasAgreementDocs = (applicationId) =>
        (getAppMapValue(agreementDocsByApp, applicationId) || []).length > 0;

    const updateSignMethod = (method) => {
        const next = {};
        sortedApplications.forEach((app) => {
            next[appKey(app.applicationId)] = method;
        });
        signMethodByAppRef.current = {
            ...signMethodByAppRef.current,
            ...next,
        };
        setSignMethodByApp((prev) => ({
            ...prev,
            ...next,
        }));
    };

    const getSignMethod = (applicationId) =>
        signMethodByAppRef.current[appKey(applicationId)]
        || getAppMapValue(signMethodByApp, applicationId)
        || SIGN_METHODS.ELECTRONIC;

    const getSharedSignMethod = () => {
        const firstApp = sortedApplications[0];
        return firstApp ? getSignMethod(firstApp.applicationId) : SIGN_METHODS.ELECTRONIC;
    };

    const getAppsNeedingSignChoice = () =>
        sortedApplications.filter((app) => {
            const hasDocs = hasAgreementDocs(app.applicationId);
            const isSigned = Boolean(getAppMapValue(signedByApp, app.applicationId));
            const emailedTo = getAppMapValue(emailSentByApp, app.applicationId);
            return hasDocs && !isSigned && !emailedTo;
        });

    const getMerchantEmail = (applicationId) => {
        const data = getAppMapValue(fetchedDataByApp, applicationId) || {};
        return (
            data.email
            || data.ownerEmail
            || data.dbaEmail
            || data.merchantEmail
            || data.merchant?.email
            || data.merchant?.ownerEmail
            || location.state?.secondStep?.email
            || location.state?.thirdStep?.ownerEmail
            || location.state?.eighthStep?.email
            || ""
        ).trim();
    };

    const getOwnerNameParts = (applicationId) => {
        const data = getAppMapValue(fetchedDataByApp, applicationId) || {};
        let firstName = (
            data.ownerFirstName
            || data.merchantFirstName
            || location.state?.thirdStep?.ownerFirstName
            || ""
        ).trim();
        let lastName = (
            data.ownerLastName
            || data.merchantLastName
            || location.state?.thirdStep?.ownerLastName
            || ""
        ).trim();

        if (!firstName && !lastName) {
            const fullName = (data.ownerName || data.merchantName || "").trim();
            if (fullName) {
                const parts = fullName.split(/\s+/);
                firstName = parts[0] || "";
                lastName = parts.slice(1).join(" ");
            }
        }

        return { firstName, lastName };
    };

    useEffect(() => {
        if (signatureEmailInitializedRef.current && signatureOwnerInitializedRef.current) return;
        const appId =
            sortedApplications[0]?.applicationId
            || applicationIds[0]
            || location.state?.applicationId
            || location.state?.eighthStep?.applicationId;
        if (!appId) return;

        if (!signatureEmailInitializedRef.current) {
            const email = getMerchantEmail(appId);
            if (email) {
                setSignatureEmail(email);
                signatureEmailInitializedRef.current = true;
            }
        }

        if (!signatureOwnerInitializedRef.current) {
            const { firstName, lastName } = getOwnerNameParts(appId);
            if (firstName || lastName) {
                setSignatureOwnerFirstName(firstName);
                setSignatureOwnerLastName(lastName);
                signatureOwnerInitializedRef.current = true;
            }
        }
    }, [fetchedDataByApp, sortedApplications, applicationIds, location.state]);

    const getDbaName = (applicationId) => {
        const data = getAppMapValue(fetchedDataByApp, applicationId) || {};
        return (
            data.businessName
            || data.dbaName
            || data.legalName
            || location.state?.secondStep?.businessName
            || location.state?.eighthStep?.businessName
            || ""
        ).trim();
    };

    const buildUnsignedFilePayload = (doc) => {
        if (doc?.unsignedFileUrl?.url) {
            return {
                url: doc.unsignedFileUrl.url,
                originalname: doc.unsignedFileUrl.originalname || `${doc.title || "Agreement"}.pdf`,
                mimetype: doc.unsignedFileUrl.mimetype || "application/pdf",
            };
        }
        if (doc?.url) {
            return {
                url: doc.url,
                originalname: `${doc.title || "Agreement"}.pdf`,
                mimetype: "application/pdf",
            };
        }
        return null;
    };

    const sendAgreementEmailsForApp = async (applicationId) => {
        const to = (signatureEmail || getMerchantEmail(applicationId)).trim();
        if (!to) {
            throw new Error("Merchant email not found. Please enter an email address to send the agreement.");
        }

        let docs = getAppMapValue(agreementDocsByApp, applicationId) || [];
        if (!docs.length) {
            docs = await loadAgreementDocs(applicationId);
        }

        const unsignedEntries = docs
            .filter((doc) => !doc.signed)
            .map((doc) => ({
                agreementId: doc.agreementId,
                unsignedFileUrl: buildUnsignedFilePayload(doc),
            }))
            .filter((entry) => entry.unsignedFileUrl);

        if (!unsignedEntries.length) {
            throw new Error("No unsigned agreement found to email.");
        }

        const payloads = unsignedEntries.map((entry) => entry.unsignedFileUrl);
        const agreementIds = unsignedEntries
            .map((entry) => entry.agreementId)
            .filter((id) => id != null && id !== "");
        const ownerFirstName = signatureOwnerFirstName.trim();
        const ownerLastName = signatureOwnerLastName.trim();

        const body = {
            to,
            unsignedFileUrl: payloads[0],
            unsignedFileUrls: payloads,
            ownerFirstName,
            ownerLastName,
            link: PUBLIC_AGREEMENT_SIGN_PATH,
        };
        if (agreementIds.length === 1) {
            body.agreementId = agreementIds[0];
        } else if (agreementIds.length > 1) {
            body.agreementIds = agreementIds;
        }

        await postRequestWithBodyAndToken(
            `${baseURl}application/${applicationId}/send-agreement-email`,
            accessToken,
            body
        );

        return to;
    };

    const buildApiDataForApp = (applicationId, status) => {
        const apiData = {
            currentStep: APPLICATION_STEPS.SUBMIT,
            agreedTermsAndConditon: checkedByApp[applicationId] ?? false,
            ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
            applicationId,
            status,
        };

        if (signatureByApp[applicationId]) {
            apiData.merchantSignatureFileUrl = signatureByApp[applicationId];
        }

        return apiData;
    };

    const getNavigationState = (apiData) => ({
        sixthStep: apiData,
        hasOwnHardware: location.state?.hasOwnHardware,
        hasOwnHardwareByApp,
        applications: sortedApplications,
        applicationIds,
        applicationId:
            applicationIds[0]
            || location.state?.applicationId
            || location.state?.eighthStep?.applicationId,
    });

    const navigateToRequestSubmitted = (navigationState) => {
        if (isGuest) {
            clearPublicApplicationDraft();
            navigate(`/apply/${tenantSlug}/requestSubmitted`, { state: { ...navigationState, tenantSlug } });
        } else if (roleTitleNormalized === "agent") {
            navigate("/userdashboard/requestSubmitted", { state: navigationState });
        } else {
            navigate("/home/requestSubmitted", { state: navigationState });
        }
    };

    const submitApplication = async () => {
        setLoading(true);
        try {
            if (resolvedApplications.length > 1) {
                await Promise.all(
                    resolvedApplications.map((app) => {
                        const apiData = buildApiDataForApp(app.applicationId, "pending");
                        return isGuest
                            ? submitPublicApplicationStep(apiData)
                            : postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
                    })
                );

                const apiData = {
                    currentStep: APPLICATION_STEPS.SUBMIT,
                    ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                    applicationIds,
                    status: "pending",
                };

                navigateToRequestSubmitted(getNavigationState(apiData));
                return;
            }

            const primaryApp = resolvedApplications[0];
            const applicationId =
                primaryApp?.applicationId
                || applicationIds[0]
                || location.state?.eighthStep?.applicationId;

            const apiData = {
                ...buildApiDataForApp(applicationId, "pending"),
                ...getApplicationPayloadFields(applicationId),
            };

            if (isGuest) {
                await submitPublicApplicationStep(apiData);
            } else {
                await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
            }

            navigateToRequestSubmitted(getNavigationState(apiData));
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAgreement = async (applicationId, docIndex = null) => {
        setActiveApplicationId(applicationId);
        setViewingSummary(false);
        const existingDocs = getAppMapValue(agreementDocsByApp, applicationId) || [];
        const docs = existingDocs.length
            ? existingDocs
            : await loadAgreementDocs(applicationId);
        if (!docs.length) {
            toast.error("No agreement documents found for this application");
            return;
        }

        const firstUnsignedIndex = getFirstUnsignedDocIndex(docs);
        const resolvedIndex = docIndex ?? (firstUnsignedIndex >= 0 ? firstUnsignedIndex : 0);
        setActiveDocIndex(resolvedIndex);
        setIsPdfModalOpen(true);
    };

    const handleContinueToNextAgreement = () => {
        const nextUnsignedIndex = getFirstUnsignedDocIndex(activeDocs);
        if (nextUnsignedIndex >= 0) {
            setActiveDocIndex(nextUnsignedIndex);
            setViewingSummary(false);
        }
    };

    const validateAllChecked = () => {
        const uncheckedApp = sortedApplications.find((app) => !getAppMapValue(checkedByApp, app.applicationId));
        if (uncheckedApp) {
            toast.error(`You must agree to the terms and conditions for ${getServiceLabel(uncheckedApp.solution)}.`);
            return false;
        }
        return true;
    };

    const handleButtonClick = async () => {
        if (!validateAllChecked()) return;

        const pendingEmailApps = sortedApplications.filter((app) => {
            const method = getSignMethod(app.applicationId);
            const signed = Boolean(getAppMapValue(signedByApp, app.applicationId));
            const emailed = Boolean(getAppMapValue(emailSentByApp, app.applicationId));
            return method === SIGN_METHODS.EMAIL && !signed && !emailed;
        });

        if (pendingEmailApps.length) {
            setSendingEmail(true);
            try {
                const sentEntries = [];
                for (const app of pendingEmailApps) {
                    const to = await sendAgreementEmailsForApp(app.applicationId);
                    sentEntries.push({
                        applicationId: appKey(app.applicationId),
                        to,
                        label: getServiceLabel(app.solution),
                    });
                }

                setEmailSentByApp((prev) => {
                    const next = { ...prev };
                    sentEntries.forEach(({ applicationId, to }) => {
                        next[applicationId] = to;
                    });
                    return next;
                });

                toast.success(`Agreement emailed for ${sentEntries.map((entry) => entry.label).join(", ")}.`);
            } catch (error) {
                toast.error(error.message || "Failed to send agreement email");
                return;
            } finally {
                setSendingEmail(false);
            }
        }

        const electronicUnsignedApp = sortedApplications.find((app) => {
            const method = getSignMethod(app.applicationId);
            const signed = Boolean(getAppMapValue(signedByApp, app.applicationId));
            return method === SIGN_METHODS.ELECTRONIC && !signed && hasAgreementDocs(app.applicationId);
        });

        if (electronicUnsignedApp) {
            await handleOpenAgreement(electronicUnsignedApp.applicationId);
            return;
        }

        await submitApplication();
    };

    const saveApplication = async () => {
        if (resolvedApplications.length > 1) {
            await Promise.all(
                resolvedApplications.map((app) => {
                    const apiData = buildApiDataForApp(app.applicationId, "draft");
                    return isGuest
                        ? submitPublicApplicationStep(apiData)
                        : postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
                })
            );
            return;
        }

        const primaryApp = resolvedApplications[0];
        const applicationId =
            primaryApp?.applicationId
            || applicationIds[0]
            || location.state?.eighthStep?.applicationId;

        const apiData = {
            ...buildApiDataForApp(applicationId, "draft"),
            ...getApplicationPayloadFields(applicationId),
        };

        if (isGuest) {
            await submitPublicApplicationStep(apiData);
        } else {
            await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
        }
    };

    const handleSaveClick = async () => {
        setLoading(true);
        try {
            await saveApplication();
            toast.success("Save in draft");
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleSignatureSubmit = async () => {
        if (!activeApplicationId || !activeDoc?.agreementId) return;

        if (!signatureRef.current || signatureRef.current.isEmpty()) {
            toast.error("Please provide a signature");
            return;
        }

        const dataUrl = signatureRef.current.toDataURL();
        setShowSignatureModal(false);
        setSigning(true);

        try {
            const uploadedSignature = await uploadMerchantSignature(dataUrl);

            const signResult = isGuest
                ? await signPublicAgreementDocument({
                    applicationId: activeApplicationId,
                    agreementId: activeDoc.agreementId,
                    tenantSlug,
                    signatureFileUrl: uploadedSignature,
                })
                : await putRequestWithBodyAndToken(
                    `${baseURl}application/${activeApplicationId}/agreement-documents/${activeDoc.agreementId}/sign`,
                    accessToken,
                    { signatureFileUrl: uploadedSignature }
                );

            setSignatureByApp((prev) => ({
                ...prev,
                [activeApplicationId]: uploadedSignature,
            }));

            // The sign API returns the updated document; update it in place,
            // falling back to a re-fetch if the response is missing.
            const signedDocData = signResult?.data;
            let docs;
            if (signedDocData?.agreementId) {
                docs = (agreementDocsByApp[activeApplicationId] || []).map((doc) =>
                    doc.agreementId === signedDocData.agreementId
                        ? {
                            ...doc,
                            status: signedDocData.status,
                            url: signedDocData.signedFileUrl?.url || doc.url,
                            signed: Boolean(signedDocData.signedFileUrl?.url) || signedDocData.status === "signed",
                        }
                        : doc
                );
                setAgreementDocsByApp((prev) => ({ ...prev, [activeApplicationId]: docs }));
            } else {
                docs = await loadAgreementDocs(activeApplicationId);
            }

            const allSigned = docs.length > 0 && docs.every((doc) => doc.signed);
            setSignedByApp((prev) => ({
                ...prev,
                [activeApplicationId]: allSigned,
            }));

            // Once every agreement is signed, load the combined summary
            if (allSigned) {
                fetchAgreementSummary(activeApplicationId);
            }

            // If there are more unsigned documents, show the next one automatically
            const nextUnsignedIndex = getFirstUnsignedDocIndex(docs);
            if (nextUnsignedIndex >= 0) {
                setActiveDocIndex(nextUnsignedIndex);
                setViewingSummary(false);
                setIsPdfModalOpen(true);
                toast.success(
                    docs.length > 1
                        ? `Agreement signed. Please review and sign the next agreement (${nextUnsignedIndex + 1} of ${docs.length}).`
                        : "Agreement signed successfully"
                );
            } else {
                const nextElectronicApp = sortedApplications.find(
                    (app) =>
                        hasAgreementDocs(app.applicationId)
                        && String(app.applicationId) !== String(activeApplicationId)
                        && getSignMethod(app.applicationId) === SIGN_METHODS.ELECTRONIC
                        && !signedByApp[app.applicationId]
                );

                if (nextElectronicApp) {
                    toast.success("All agreements signed. Please sign the next service.");
                    await handleOpenAgreement(nextElectronicApp.applicationId);
                } else {
                    setIsPdfModalOpen(true);
                    toast.success("All agreements signed successfully");
                }
            }
        } catch (error) {
            toast.error(error.message || "Failed to save signature");
        } finally {
            setSigning(false);
        }
    };

    const handlePdfModalSubmit = async () => {
        const remainingUnsignedIndex = getFirstUnsignedDocIndex(activeDocs);
        if (remainingUnsignedIndex >= 0) {
            setActiveDocIndex(remainingUnsignedIndex);
            setViewingSummary(false);
            toast.info("Please sign the remaining agreement(s) before submitting.");
            return;
        }

        setIsPdfModalOpen(false);

        const nextUnsignedApp = sortedApplications.find(
            (app) =>
                hasAgreementDocs(app.applicationId)
                && app.applicationId !== activeApplicationId
                && getSignMethod(app.applicationId) === SIGN_METHODS.ELECTRONIC
                && !signedByApp[app.applicationId]
        );

        if (nextUnsignedApp) {
            await handleOpenAgreement(nextUnsignedApp.applicationId);
            return;
        }

        await submitApplication();
    };

    const renderSignMethodChooser = (detailsApplicationId) => {
        const selectedSignMethod = getSharedSignMethod();
        const detailsAppId = detailsApplicationId || sortedApplications[0]?.applicationId;

        return (
            <div className="mt-7 mb-4">
                <p style={{ fontWeight: 700, fontSize: 16, color: "var(--sidebar-text-primary)", marginBottom: 16 }}>
                    Choose how you want to sign the agreement
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    <SignMethodCard
                        selected={selectedSignMethod === SIGN_METHODS.ELECTRONIC}
                        onSelect={() => updateSignMethod(SIGN_METHODS.ELECTRONIC)}
                        icon={<PencilLine size={22} />}
                        title="Electronic Signature"
                        recommended
                        description="Sign the agreement electronically using our secure e-signature process."
                        features={["Fast and secure", "Legally binding"]}
                    />
                    <SignMethodCard
                        selected={selectedSignMethod === SIGN_METHODS.EMAIL}
                        onSelect={() => updateSignMethod(SIGN_METHODS.EMAIL)}
                        icon={<Mail size={22} />}
                        title="Email for Signature"
                        description="We will send the agreement to your email address. You can review and sign it from there."
                        features={["Receive via email", "Sign at your convenience"]}
                    />
                </div>
                {selectedSignMethod === SIGN_METHODS.EMAIL && detailsAppId && (
                    <div
                        className="mt-4"
                        style={{
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            borderRadius: 12,
                            backgroundColor: "rgba(59, 130, 246, 0.08)",
                            padding: "16px 18px",
                        }}
                    >
                        <p style={{ fontWeight: 700, fontSize: 14, color: "var(--sidebar-text-primary)", marginBottom: 12 }}>
                            Agreement will be sent to
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--Gray, #6B7280)", marginBottom: 4 }}>
                                    Email
                                </p>
                                <input
                                    type="email"
                                    value={signatureEmail}
                                    onChange={(e) => setSignatureEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className="w-full"
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "var(--sidebar-text-primary)",
                                        backgroundColor: "var(--dashboard-card-bg)",
                                        border: "1px solid var(--dashboard-box-border, #E5E7EB)",
                                        borderRadius: 8,
                                        padding: "8px 10px",
                                        outline: "none",
                                        width: "100%",
                                    }}
                                />
                            </div>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--Gray, #6B7280)", marginBottom: 4 }}>
                                    DBA Name
                                </p>
                                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--sidebar-text-primary)", wordBreak: "break-word" }}>
                                    {getDbaName(detailsAppId) || "—"}
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--Gray, #6B7280)", marginBottom: 4 }}>
                                    Owner First Name
                                </p>
                                <input
                                    type="text"
                                    value={signatureOwnerFirstName}
                                    onChange={(e) => setSignatureOwnerFirstName(e.target.value)}
                                    placeholder="Enter first name"
                                    className="w-full"
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "var(--sidebar-text-primary)",
                                        backgroundColor: "var(--dashboard-card-bg)",
                                        border: "1px solid var(--dashboard-box-border, #E5E7EB)",
                                        borderRadius: 8,
                                        padding: "8px 10px",
                                        outline: "none",
                                        width: "100%",
                                    }}
                                />
                            </div>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--Gray, #6B7280)", marginBottom: 4 }}>
                                    Owner Last Name
                                </p>
                                <input
                                    type="text"
                                    value={signatureOwnerLastName}
                                    onChange={(e) => setSignatureOwnerLastName(e.target.value)}
                                    placeholder="Enter last name"
                                    className="w-full"
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "var(--sidebar-text-primary)",
                                        backgroundColor: "var(--dashboard-card-bg)",
                                        border: "1px solid var(--dashboard-box-border, #E5E7EB)",
                                        borderRadius: 8,
                                        padding: "8px 10px",
                                        outline: "none",
                                        width: "100%",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTermsSection = (applicationId, solution, { showSignChooser = false } = {}) => {
        const appData = fetchedDataByApp[applicationId] || {};
        const agreementDocs = agreementDocsByApp[applicationId] || [];
        const hasDocs = agreementDocs.length > 0;
        const agreementTitle = agreementDocs[0]?.title || getAgreementTitle(appData?.plan);
        const isChecked = checkedByApp[applicationId] ?? false;
        const showServiceHeading = sortedApplications.length > 1;
        const selectedSignMethod = getSharedSignMethod();
        const agreementNames = agreementDocs.map((doc) => doc.title).filter(Boolean).join(", ");
        const emailedTo = getAppMapValue(emailSentByApp, applicationId);
        const isSigned = Boolean(getAppMapValue(signedByApp, applicationId));
        const serviceLabel = getServiceLabel(solution);

        return (
            <div
                key={applicationId}
                className="mb-8"
                style={showServiceHeading ? {
                    border: "1px solid var(--dashboard-box-border, #E5E7EB)",
                    borderRadius: 14,
                    padding: 22,
                    backgroundColor: "var(--dashboard-card-bg)",
                } : undefined}
            >
                {showServiceHeading && (
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                        <h2 style={{
                            fontWeight: 700,
                            fontSize: 18,
                            color: "var(--sidebar-text-primary)",
                        }}>
                            {serviceLabel}
                        </h2>
                        {hasDocs && (
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    borderRadius: 999,
                                    padding: "4px 10px",
                                    backgroundColor: isSigned
                                        ? "rgba(16, 185, 129, 0.12)"
                                        : emailedTo
                                            ? "rgba(59, 130, 246, 0.12)"
                                            : selectedSignMethod === SIGN_METHODS.EMAIL
                                                ? "rgba(59, 130, 246, 0.08)"
                                                : "var(--dashboard-card-bg2, #F3F4F6)",
                                    color: isSigned
                                        ? "#059669"
                                        : selectedSignMethod === SIGN_METHODS.EMAIL || emailedTo
                                            ? "var(--dashboard-tab-active)"
                                            : "var(--sidebar-text-primary)",
                                }}
                            >
                                {isSigned
                                    ? "Signed"
                                    : emailedTo
                                        ? "Emailed"
                                        : selectedSignMethod === SIGN_METHODS.EMAIL
                                            ? "Email for signature"
                                            : "Electronic signature"}
                            </span>
                        )}
                    </div>
                )}

                <Heading
                    Fontweight={700}
                    color={"var(--sidebar-text-primary)"}
                    Heading={hasDocs ? agreementTitle : "Terms & Condition"}
                    Fontsize={showServiceHeading ? 20 : 30}
                />

                {hasDocs ? (
                    <div
                        className="flex items-start gap-3"
                        style={{
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            borderRadius: 12,
                            backgroundColor: "rgba(59, 130, 246, 0.08)",
                            padding: "14px 16px",
                            marginTop: 14,
                        }}
                    >
                        <HiInformationCircle
                            size={20}
                            style={{ color: "var(--dashboard-tab-active)", flexShrink: 0, marginTop: 2 }}
                        />
                        <p style={{ fontSize: 14, color: "var(--sidebar-text-primary)", lineHeight: 1.55 }}>
                            {agreementDocs.length > 1
                                ? `Please review the following agreements generated for your application: ${agreementNames}. Click Next to review and sign your agreement before submitting the application.`
                                : `Please review the ${agreementTitle.toLowerCase()} generated for your application. Click Next to review and sign your agreement before submitting the application.`}
                        </p>
                    </div>
                ) : (
                    <div style={{ borderColor: "var(--sidebar-border)", borderWidth: 1, borderRadius: 8, backgroundColor: "var(--dashboard-tab-box)", padding: 25 }}>
                        <Heading
                            Fontweight={400}
                            color={"var(--sidebar-text-primary)"}
                            Heading={"By submitting this application, you agree to provide accurate and complete information. We reserve the right to verify all information provided and may request additional documentation."}
                            Fontsize={14}
                            mb={16}
                        />
                        <Heading
                            Fontweight={400}
                            color={"var(--sidebar-text-primary)"}
                            Heading={"By checking the agreement box and submitting this application, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions."}
                            Fontsize={14}
                        />
                    </div>
                )}

                {showSignChooser && hasDocs && !isSigned && !emailedTo && renderSignMethodChooser(applicationId)}

                {hasDocs && emailedTo && !isSigned && (
                    <div
                        className="mt-4"
                        style={{
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            borderRadius: 8,
                            backgroundColor: "rgba(59, 130, 246, 0.08)",
                            padding: "16px 20px",
                        }}
                    >
                        <p style={{ color: "var(--dashboard-tab-active)", fontWeight: 700, fontSize: 15 }}>
                            Agreement sent via email
                        </p>
                        <p style={{ color: "var(--sidebar-text-primary)", fontSize: 13, marginTop: 2 }}>
                            Sent to {emailedTo}. The merchant can review the agreement list and sign from the public link in that email.
                        </p>
                    </div>
                )}

                {hasDocs && isSigned && summaryUrlByApp[applicationId] && (
                    <div
                        className="mt-4 flex flex-wrap items-center justify-between gap-3"
                        style={{
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                            borderRadius: 8,
                            backgroundColor: "rgba(16, 185, 129, 0.08)",
                            padding: "16px 20px",
                        }}
                    >
                        <div>
                            <p style={{ color: "#10B981", fontWeight: 700, fontSize: 15 }}>
                                ✓ All agreements signed
                            </p>
                            <p style={{ color: "var(--sidebar-text-primary)", fontSize: 13, marginTop: 2 }}>
                                Agreement summary is ready for review.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setActiveApplicationId(applicationId);
                                    setActiveDocIndex(0);
                                    setViewingSummary(true);
                                    setIsPdfModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-sm rounded-lg"
                                style={{ backgroundColor: "var(--dashboard-tab-active)", color: "var(--sidebar-text-selected)" }}
                            >
                                View Summary
                            </button>
                            <button
                                onClick={() => downloadAgreementSummary(applicationId)}
                                className="px-3 py-1.5 text-sm rounded-lg"
                                style={{ backgroundColor: "#059669", color: "var(--sidebar-text-selected)" }}
                            >
                                Download Summary
                            </button>
                        </div>
                    </div>
                )}

                <label
                    htmlFor={`terms-${applicationId}`}
                    className="flex items-center w-full my-8 cursor-pointer"
                    style={{ userSelect: "none" }}
                >
                    <input
                        type="checkbox"
                        id={`terms-${applicationId}`}
                        checked={isChecked}
                        onChange={() => updateChecked(applicationId, !isChecked)}
                        style={{ width: 18, height: 18, accentColor: "var(--dashboard-tab-active)", cursor: "pointer" }}
                    />
                    <span style={{ color: "var(--Gray)", fontSize: 15, marginLeft: 10 }}>
                        I agree all the terms and conditions
                    </span>
                </label>
            </div>
        );
    };

    const appsNeedingSignChoice = getAppsNeedingSignChoice();
    const isPageLoading = loading || agreementLoading || signing;

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}>
            <Heading
                Fontweight={700}
                color={"var(--sidebar-text-primary)"}
                Heading={"Application"}
                Fontsize={30}
            />

            <div className="w-full " style={{ backgroundColor: "var(--dashboard-card-bg)", borderRadius: 14 }}>
                <div style={{ marginTop: 30, paddingTop: 40, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-8 m-2">
                    <Stepper activeStep={APPLICATION_STEPS.SUBMIT - 1} />
                    {isPageLoading ? (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <>
                            {!sortedApplications.length ? (
                                <NoDataFound title="No Application" description="No applications found for submission." />
                            ) : (
                                <>
                                    <div className="mt-12 gap-8">
                                        {sortedApplications.length === 1 ? (
                                            renderTermsSection(
                                                sortedApplications[0].applicationId,
                                                sortedApplications[0].solution,
                                                { showSignChooser: !isGuest }
                                            )
                                        ) : (
                                            <div className="flex flex-col gap-5">
                                                {!isGuest && appsNeedingSignChoice.length > 0 &&
                                                    renderSignMethodChooser(appsNeedingSignChoice[0]?.applicationId)}
                                                {sortedApplications.map(({ applicationId, solution }) =>
                                                    renderTermsSection(applicationId, solution)
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between mr-6 flex-wrap mt-20 gap-3">
                                        <BottonCustom
                                            backgroundColor={"var(--dashboard-card-bg2)"}
                                            width={130}
                                            title={"Previous"}
                                            height={40}
                                            color={"var(--dashboard-text-primary)"}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={handlePreviousClick}
                                        />
                                        <div className="flex gap-2 flex-row flex-wrap">
                                            {!isGuest && (
                                                <BottonCustom
                                                    backgroundColor={"var(--sidebar-selected-bg)"}
                                                    width={130}
                                                    title={"Save"}
                                                    height={40}
                                                    color={"var(--sidebar-text-selected)"}
                                                    fontSize={16}
                                                    fontWeight={500}
                                                    onClick={handleSaveClick}
                                                />
                                            )}
                                            <BottonCustom
                                                backgroundColor={"var(--sidebar-selected-bg)"}
                                                width={130}
                                                title={sendingEmail ? "Sending..." : "Next"}
                                                height={40}
                                                color={"var(--sidebar-text-selected)"}
                                                fontSize={16}
                                                fontWeight={500}
                                                disabled={sendingEmail}
                                                onClick={handleButtonClick}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {isPdfModalOpen && activeDoc && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" style={{ zIndex: 10000 }}>
                    <div className="bg-[var(--dashboard-card-bg)] border border-[var(--dashboard-border)] w-[38%] h-[90%] relative rounded-lg p-4 flex flex-col text-[var(--dashboard-text-primary)]">
                        <button
                            onClick={() => setIsPdfModalOpen(false)}
                            className="absolute top-0 right-1 text-lg text-red-500"
                        >
                            ✕
                        </button>

                        {!viewingSummary && activeDocs.length > 1 && (
                            <div className="flex items-center justify-between mb-2 pr-6 gap-2">
                                <span className="text-sm font-semibold text-[var(--dashboard-text-primary)] truncate">
                                    {activeDoc.title}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        disabled={activeDocIndex <= 0}
                                        onClick={() => {
                                            setViewingSummary(false);
                                            setActiveDocIndex((i) => Math.max(0, i - 1));
                                        }}
                                        className="px-2.5 py-1 text-sm rounded bg-[var(--dashboard-card-bg2)] text-[var(--dashboard-text-primary)] hover:bg-[var(--sidebar-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Prev
                                    </button>
                                    <span className="text-xs text-[var(--dashboard-text-secondary)] whitespace-nowrap">
                                        {activeDocIndex + 1} / {activeDocs.length}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={activeDocIndex >= activeDocs.length - 1}
                                        onClick={() => {
                                            setViewingSummary(false);
                                            setActiveDocIndex((i) => Math.min(activeDocs.length - 1, i + 1));
                                        }}
                                        className="px-2.5 py-1 text-sm rounded bg-[var(--dashboard-card-bg2)] text-[var(--dashboard-text-primary)] hover:bg-[var(--sidebar-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewingSummary && (
                            <div className="mb-2 pr-6">
                                <span className="text-sm font-semibold text-[var(--dashboard-text-primary)]">Agreement Summary</span>
                            </div>
                        )}

                        <div className="flex-grow">
                            <iframe
                                key={viewingSummary ? "summary" : activeDoc.agreementId}
                                src={`${viewingSummary && summaryUrlByApp[activeApplicationId]
                                    ? summaryUrlByApp[activeApplicationId]
                                    : activeDoc.url}#toolbar=1&navpanes=0&view=FitH`}
                                title={viewingSummary ? "Agreement Summary" : activeAgreementTitle}
                                className="w-full h-full border border-[var(--dashboard-border)]"
                            />
                        </div>

                        <div className="text-right mt-2">
                            {activeDoc.signed ? (
                                <>
                                    <span className="inline-block text-sm text-green-600 font-semibold px-2 py-1">
                                        ✓ Signed
                                    </span>
                                    {!activeIsSigned && getFirstUnsignedDocIndex(activeDocs) >= 0 && (
                                        <button
                                            onClick={handleContinueToNextAgreement}
                                            className="bg-[var(--sidebar-selected-bg)] text-sm ml-1 text-[var(--sidebar-text-selected)] px-3 py-1 rounded"
                                        >
                                            Next Agreement
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsPdfModalOpen(false);
                                        setShowSignatureModal(true);
                                    }}
                                    className="bg-[var(--sidebar-selected-bg)] text-sm text-[var(--sidebar-text-selected)] px-2 py-1 rounded"
                                >
                                    Sign Agreement
                                </button>
                            )}
                            {activeIsSigned && (
                                <>
                                    <button
                                        onClick={async () => {
                                            if (viewingSummary) {
                                                setViewingSummary(false);
                                                return;
                                            }
                                            const url =
                                                summaryUrlByApp[activeApplicationId]
                                                || await fetchAgreementSummary(activeApplicationId);
                                            if (url) {
                                                setViewingSummary(true);
                                            } else {
                                                toast.error("Summary not available yet");
                                            }
                                        }}
                                        className="bg-[var(--dashboard-card-bg2)] text-sm ml-1 text-[var(--dashboard-text-primary)] px-3 py-1 rounded"
                                    >
                                        {viewingSummary ? "View Agreement" : "View Summary"}
                                    </button>
                                    <button
                                        onClick={() => downloadAgreementSummary(activeApplicationId)}
                                        className="bg-[var(--dashboard-tab-inactive)] text-sm ml-1 text-[var(--dashboard-text-primary)] px-3 py-1 rounded"
                                    >
                                        Download Summary
                                    </button>
                                    <button
                                        onClick={handlePdfModalSubmit}
                                        className="bg-green-600 text-sm ml-1 text-white px-3 py-1 rounded"
                                    >
                                        Submit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showSignatureModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[10000]">
                    <div className="bg-[var(--dashboard-card-bg)] border border-[var(--dashboard-border)] p-4 rounded w-[90%] max-w-md">
                        <h2 className="text-lg font-semibold mb-2 text-[var(--dashboard-text-primary)]">Please Sign Below</h2>
                        <SignatureCanvas
                            penColor="black"
                            canvasProps={{ width: 400, height: 150, className: "border border-[var(--dashboard-border)] bg-white" }}
                            ref={signatureRef}
                        />
                        <div className="flex justify-between mt-4">
                            <button
                                onClick={() => signatureRef.current?.clear()}
                                className="px-4 py-2 bg-[var(--dashboard-card-bg2)] text-[var(--dashboard-text-primary)] rounded"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleSignatureSubmit}
                                className="px-4 py-2 bg-[var(--dashboard-tab-active)] text-[var(--sidebar-text-selected)] rounded"
                            >
                                Submit Signature
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmitApplication;
