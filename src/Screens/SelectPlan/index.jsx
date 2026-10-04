import Heading from "../../Components/Heading"
import Stepper from "../../Components/Stepper";
import { useEffect, useMemo, useState } from "react";
import BottonCustom from "../../Components/ButtonCustom";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { getPublicItemCategories, getPublicPricePlans, submitPublicApplicationStep } from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { APPLICATION_STEPS, goToPreviousWizardStep, isGuestSession } from "../../Utils/applicationNavigation";
import { writePublicApplicationDraft } from "../../features/applications/screens/PublicApplication";

const SelectPlan = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const roleTitleNormalized = (userData?.roleTitle || "").toLowerCase();
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;
    const applicationIds = useMemo(() => {
        if (location.state?.applicationIds?.length) {
            return location.state.applicationIds;
        }
        const fromApplications = (location.state?.applications || [])
            .map((app) => app.applicationId)
            .filter(Boolean);
        if (fromApplications.length > 0) {
            return fromApplications;
        }
        const singleId =
            location.state?.applicationId
            || location.state?.fourthStep?.applicationId;
        return singleId ? [singleId] : [];
    }, [
        location.state?.applicationIds,
        location.state?.applications,
        location.state?.applicationId,
        location.state?.fourthStep?.applicationId,
    ]);

    const applications = useMemo(() => {
        const fromState = location.state?.applications || [];
        if (fromState.length > 0) {
            return fromState.filter((app) => app?.applicationId && app?.solution);
        }
        return [];
    }, [location.state?.applications]);

    const getApplicationPayloadFields = (applicationId) => {
        if (applicationIds.length > 1) {
            return { applicationIds };
        }
        return {
            applicationId:
                applicationId
                || applicationIds[0]
                || location.state?.applicationId
                || location.state?.fourthStep?.applicationId,
        };
    };

    const [selectedPlans, setSelectedPlans] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetchedData2, setFetchedData2] = useState([]);
    const [fetchedDataByApp, setFetchedDataByApp] = useState({});
    const [serviceOptions, setServiceOptions] = useState([]);

    const getServiceLabel = (solution) => {
        const normalizedSolution = (solution || "").toLowerCase();
        return serviceOptions.find((option) => option.value === normalizedSolution)?.text || solution;
    };

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const idsToFetch = applicationIds.length
                    ? applicationIds
                    : [location.state?.applicationId || location.state?.fourthStep?.applicationId].filter(Boolean);

                const [pricePlansResult, itemCategoryResult, ...applicationResults] = await Promise.all([
                    isGuest ? getPublicPricePlans({ tenantSlug }) : getRequestWithOutBody(`${baseURl}price-plan`, accessToken),
                    isGuest ? getPublicItemCategories({ tenantSlug }) : getRequestWithOutBody(`${baseURl}item-category/`, accessToken),
                    // No public equivalent of `GET application/:id` is documented yet, so a
                    // guest starts this step blank instead of prefilling from an existing application.
                    ...(isGuest ? [] : idsToFetch.map((id) => getRequestWithOutBody(`${baseURl}application/${id}`, accessToken))),
                ]);

                setFetchedData2(pricePlansResult?.data || []);
                setServiceOptions(
                    (itemCategoryResult?.data || []).map((item) => ({
                        id: item.id,
                        text: item.title,
                        value: item.solution,
                    }))
                );

                const initialPlans = {};
                const dataByApp = {};
                applicationResults.forEach((result, index) => {
                    const appId = idsToFetch[index];
                    if (result?.data) {
                        dataByApp[appId] = result.data;
                    }
                    if (result?.data?.plan) {
                        initialPlans[appId] = result.data.plan;
                    }
                });
                setFetchedDataByApp(dataByApp);
                setSelectedPlans(initialPlans);
            } catch (error) {
                // keep UI usable even if one fetch fails
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [accessToken, applicationIds, location.state?.applicationId, location.state?.fourthStep?.applicationId, isGuest, tenantSlug]);

    const resolvedApplications = useMemo(() => {
        if (applications.length > 0) {
            return applications;
        }

        const fromFetched = Object.entries(fetchedDataByApp)
            .map(([applicationId, data]) => ({
                applicationId,
                solution: data?.solution,
            }))
            .filter((app) => app.applicationId && app.solution);

        if (fromFetched.length > 0) {
            return fromFetched;
        }

        const fallbackId =
            applicationIds[0]
            || location.state?.applicationId
            || location.state?.fourthStep?.applicationId;

        const fallbackSolution =
            location.state?.fourthStep?.solution
            || location.state?.firstStep?.solutions?.[0];

        if (fallbackId && fallbackSolution) {
            return [{ applicationId: fallbackId, solution: fallbackSolution }];
        }

        return [];
    }, [
        applications,
        applicationIds,
        fetchedDataByApp,
        location.state?.applicationId,
        location.state?.fourthStep,
        location.state?.firstStep?.solutions,
    ]);

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

    const applicationPlanGroups = useMemo(() => {
        return sortedApplications.map((app) => ({
            ...app,
            plans: fetchedData2.filter(
                (option) => option?.service?.toLowerCase() === app?.solution?.toLowerCase()
            ),
        }));
    }, [sortedApplications, fetchedData2]);

    const hasApplications = sortedApplications.length > 0;

    const handleOptionClick = (applicationId, planName) => {
        setSelectedPlans((prev) => ({
            ...prev,
            [applicationId]: planName,
        }));
    };

    const validatePlanSelection = () => {
        const missingServices = sortedApplications
            .filter((app) => !selectedPlans[app.applicationId])
            .map((app) => getServiceLabel(app.solution));

        if (missingServices.length > 0) {
            toast.error(`Select the plan for ${missingServices.join(", ")}`);
            return false;
        }

        return true;
    };

    const savePlans = async () => {
        if (sortedApplications.length > 1) {
            await Promise.all(
                sortedApplications.map((app) => {
                    const payload = {
                        currentStep: APPLICATION_STEPS.PLAN,
                        plan: selectedPlans[app.applicationId],
                        ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                        applicationId: app.applicationId,
                    };
                    return isGuest
                        ? submitPublicApplicationStep(payload)
                        : postRequestWithBodyAndToken(`${baseURl}application`, accessToken, payload);
                })
            );
            return {
                currentStep: APPLICATION_STEPS.PLAN,
                selectedPlans,
                ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                applicationIds,
            };
        }

        const primaryApp = sortedApplications[0];
        const apiData = {
            currentStep: APPLICATION_STEPS.PLAN,
            plan: selectedPlans[primaryApp?.applicationId],
            ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
            ...getApplicationPayloadFields(primaryApp?.applicationId),
        };
        if (isGuest) {
            await submitPublicApplicationStep(apiData);
        } else {
            await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
        }
        return apiData;
    };

    const handlePreviousClick = () => {
        goToPreviousWizardStep(navigate, {
            pathname: location.pathname,
            roleTitle: userData?.roleTitle,
            state: location.state,
        });
    };

    const handleButtonClick = async () => {
        if (!validatePlanSelection()) {
            return;
        }
        setLoading(true);
        try {
            const apiData = await savePlans();
            const navigationState = {
                firstStep: location.state?.firstStep,
                secondStep: location.state?.secondStep,
                thirdStep: location.state?.thirdStep,
                fourthStep: location.state?.fourthStep,
                fifthStep: apiData,
                applications: sortedApplications,
                applicationIds,
                applicationId: applicationIds[0] || location.state?.applicationId,
                isDuplicate: location.state?.isDuplicate,
                sourceApplicationId: location.state?.sourceApplicationId,
                duplicateFrom: location.state?.duplicateFrom,
                ...(isGuest && { tenantSlug }),
            };

            if (isGuest) {
                writePublicApplicationDraft({ tenantSlug, applicationId: navigationState.applicationId, applicationIds });
                navigate(`/apply/${tenantSlug}/applicationInformation`, { state: navigationState });
            } else if (roleTitleNormalized === "agent") {
                navigate('/userdashboard/applicationInformation', { state: navigationState });
            } else {
                navigate('/home/applicationInformation', { state: navigationState });
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClick = async () => {
        if (!validatePlanSelection()) {
            return;
        }
        setLoading(true);
        try {
            await savePlans();
            toast.success('Save in draft');
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
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
                <div style={{ marginTop: 10, paddingTop: 40, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-2 m-2">
                    <Stepper activeStep={APPLICATION_STEPS.PLAN - 1} />
                    {loading ? (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <>
                            {!hasApplications ? (
                                <NoDataFound title="No Data Found" description="No plans found for this solution." />
                            ) : (
                                <div className="mt-10 mx-8">
                                    {applicationPlanGroups.map(({ applicationId, solution, plans }) => (
                                        <div key={applicationId} className="mb-10">
                                            <h2 style={{ fontWeight: 700, fontSize: 22, color: 'var(--sidebar-text-primary)', marginBottom: 4 }}>
                                                {getServiceLabel(solution)}
                                            </h2>
                                            <p style={{ fontWeight: 400, fontSize: 14, color: 'var(--dashboard-text-secondary)', marginBottom: 16, fontFamily: 'Nunito' }}>
                                                Please select your {getServiceLabel(solution)} Plan.
                                            </p>
                                            {plans.length === 0 ? (
                                                <NoDataFound title="No Data Found" description={`No plans found for ${getServiceLabel(solution)}.`} />
                                            ) : (
                                            <div className="flex flex-wrap gap-4 items-stretch" style={{ backgroundColor: 'var(--dashboard-tab-box)', padding: 10, borderRadius: 12, border: '1px solid var(--dashboard-border)', boxSizing: 'border-box', width: 'fit-content', maxWidth: '100%' }}>
                                                {plans.map((option) => {
                                                    const isSelected = selectedPlans[applicationId]?.toLowerCase() === option?.name?.toLowerCase();
                                                    const description = (option?.description || "").replace(/\\n/g, "\n");
                                                    return (
                                                        <div
                                                            key={option?.id}
                                                            onClick={() => handleOptionClick(applicationId, option?.name)}
                                                            style={{
                                                                backgroundColor: isSelected ? 'var(--dashboard-badge-bg)' : 'var(--dashboard-card-bg)',
                                                                border: isSelected ? '2px solid var(--dashboard-tab-active)' : '1px solid var(--dashboard-box-border)',
                                                                borderRadius: 12,
                                                                width: 260,
                                                                padding: '16px 14px',
                                                                boxSizing: 'border-box',
                                                            }}
                                                            className="flex flex-col cursor-pointer relative"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    style={{
                                                                        width: 22,
                                                                        height: 22,
                                                                        borderRadius: '50%',
                                                                        border: isSelected ? 'none' : '2px solid var(--dashboard-box-border)',
                                                                        backgroundColor: isSelected ? 'var(--dashboard-tab-active)' : 'transparent',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        flexShrink: 0,
                                                                        marginTop: 2,
                                                                    }}
                                                                >
                                                                    {isSelected && (
                                                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                            <path d="M2 6L5 9L10 3" stroke="var(--dashboard-tab-text-active)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
                                                                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--sidebar-text-primary)' }}>
                                                                        {option?.name}
                                                                    </span>
                                                                    <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--sidebar-text-primary)', marginTop: 6, lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                                        {description}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between mx-8 mt-16 flex-wrap gap-3">
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SelectPlan;
