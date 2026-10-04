import Heading from "../../Components/Heading"
import Stepper from "../../Components/Stepper";
import { useRef, useState } from "react";
import BottonCustom from "../../Components/ButtonCustom";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { postRequestWithBodyAndToken } from "../../Api/fetch";
import { submitPublicApplicationStep } from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import BusinessInformation from "../BusinessInformation";
import OwnershipInformation from "../OwnershipInformation";
import FinancialInformation from "../FinancialInformation";
import Preferences from "../Preferences";
import { APPLICATION_STEPS, goToPreviousWizardStep, goToWizardStep, isGuestSession } from "../../Utils/applicationNavigation";
import { writePublicApplicationDraft } from "../../features/applications/screens/PublicApplication";

// Wizard step 3 (Information): business, owner, bank and preferences on one screen.
const ApplicationInformation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;

    const applicationIds = (() => {
        if (location.state?.applicationIds?.length) return location.state.applicationIds;
        const fromApps = (location.state?.applications || [])
            .map((app) => app.applicationId || app.id)
            .filter(Boolean);
        if (fromApps.length) return fromApps;
        return [location.state?.applicationId].filter(Boolean);
    })();

    const [saving, setSaving] = useState(false);

    const businessRef = useRef(null);
    const ownershipRef = useRef(null);
    const financialRef = useRef(null);
    const preferencesRef = useRef(null);

    const businessSectionRef = useRef(null);
    const ownershipSectionRef = useRef(null);
    const financialSectionRef = useRef(null);
    const preferencesSectionRef = useRef(null);

    const sections = [
        { ref: businessRef, sectionRef: businessSectionRef },
        { ref: ownershipRef, sectionRef: ownershipSectionRef },
        { ref: financialRef, sectionRef: financialSectionRef },
        { ref: preferencesRef, sectionRef: preferencesSectionRef },
    ];

    // Each section shows its own toast; stop at the first invalid one and bring it into view.
    const validateAll = () => {
        for (const { ref, sectionRef } of sections) {
            if (ref.current && !ref.current.validate()) {
                sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                return false;
            }
        }
        return true;
    };

    const saveAll = async () => {
        const preferencesData = await preferencesRef.current?.save();

        const businessPayload = businessRef.current?.buildPayload() || {};
        const ownershipPayload = (await ownershipRef.current?.buildPayload()) || {};
        const financialPayload = (await financialRef.current?.buildPayload()) || {};

        // One Information save so the backend sees business, owner and bank data together
        // (merchant creation runs on step 3). Business goes last so its agentId/source win.
        const apiPayload = {
            ...financialPayload,
            ...ownershipPayload,
            ...businessPayload,
            currentStep: APPLICATION_STEPS.INFORMATION,
        };
        if (isGuest) {
            await submitPublicApplicationStep(apiPayload);
        } else {
            await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiPayload);
        }

        return { businessPayload, ownershipPayload, financialPayload, preferencesData };
    };

    const handlePreviousClick = () => {
        goToPreviousWizardStep(navigate, {
            pathname: location.pathname,
            roleTitle: userData?.roleTitle,
            state: location.state,
        });
    };

    const handleButtonClick = async () => {
        if (!validateAll()) return;

        setSaving(true);
        try {
            const { businessPayload, ownershipPayload, financialPayload, preferencesData } = await saveAll();

            // Keep the legacy step keys; later steps (e.g. Submit) read owner/business data from them.
            const navigationState = {
                firstStep: location.state?.firstStep,
                secondStep: businessPayload,
                thirdStep: ownershipPayload,
                fourthStep: financialPayload,
                fifthStep: location.state?.fifthStep,
                seventhStep: preferencesData,
                applications: location.state?.applications || [],
                applicationIds,
                applicationId: applicationIds[0] || location.state?.applicationId,
                isDuplicate: location.state?.isDuplicate,
                sourceApplicationId: location.state?.sourceApplicationId,
                duplicateFrom: location.state?.duplicateFrom,
                ...(isGuest && { tenantSlug }),
            };

            if (isGuest) {
                writePublicApplicationDraft({ tenantSlug, applicationId: navigationState.applicationId, applicationIds });
            }
            goToWizardStep(navigate, {
                step: APPLICATION_STEPS.HARDWARE,
                roleTitle: userData?.roleTitle,
                state: navigationState,
                tenantSlug,
            });
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveClick = async () => {
        if (!validateAll()) return;

        setSaving(true);
        try {
            await saveAll();
            toast.success('Save in draft');
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Application'}
                Fontsize={30}
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 5, paddingTop: 15, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-2 m-2">
                    <Stepper activeStep={APPLICATION_STEPS.INFORMATION - 1} />
                    {saving && (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    )}
                    {/* Sections stay mounted while saving so their form state survives a failed save. */}
                    <div style={{ display: saving ? 'none' : 'block' }}>
                        <div className="flex flex-col gap-8">
                            <div ref={businessSectionRef}>
                                <BusinessInformation ref={businessRef} />
                            </div>
                            <div ref={ownershipSectionRef}>
                                <OwnershipInformation
                                    ref={ownershipRef}
                                    getLegalInfo={() => businessRef.current?.getLegalInfo()}
                                />
                            </div>
                            <div ref={financialSectionRef}>
                                <FinancialInformation ref={financialRef} />
                            </div>
                            <div ref={preferencesSectionRef}>
                                <Preferences ref={preferencesRef} />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-between mr-6 mt-20 gap-3">
                            <BottonCustom
                                backgroundColor={'var(--dashboard-card-bg2)'}
                                width={130}
                                title={'Previous'}
                                height={40}
                                color={'var(--dashboard-text-primary)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handlePreviousClick}
                            />
                            <div className="flex gap-2 flex-row flex-wrap">
                                {!isGuest && (
                                    <BottonCustom
                                        backgroundColor={'var(--sidebar-selected-bg)'}
                                        width={130}
                                        title={'Save'}
                                        height={40}
                                        color={'var(--sidebar-text-selected)'}
                                        fontSize={16}
                                        fontWeight={500}
                                        onClick={handleSaveClick}
                                    />
                                )}
                                <BottonCustom
                                    backgroundColor={'var(--sidebar-selected-bg)'}
                                    width={130}
                                    title={'Next'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleButtonClick}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationInformation;
