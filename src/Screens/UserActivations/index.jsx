import Heading from "../../Components/Heading"
import Stepper from "../../Components/Stepper";
import ATMBlack from "../../assets/ATMBlack.png";
import CreditCardBlack from "../../assets/CreditCardBlack.png";
import CashBlack from "../../assets/CashBlack.png";
import ReceiptTerminalBlack from "../../assets/ReceiptTerminalBlack.png";
import ElectronicInvoiceBlack from "../../assets/ElectronicInvoiceBlack.png";
import FireExtinguisherBlack from "../../assets/FireExtinguisherBlack.png";
import websiteServiceBlack from "../../assets/websiteServiceBlack.png";
import DoctorsBagBlack from "../../assets/DoctorsBagBlack.png";
import ApplicationCard from "../../Components/ApplicationCard";
import BottonCustom from "../../Components/ButtonCustom";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { getPublicItemCategories, submitPublicApplicationStep } from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { isGuestSession } from "../../Utils/applicationNavigation";
import { writePublicApplicationDraft } from "../../features/applications/screens/PublicApplication";

const SOLUTION_ICONS = {
    atm: ATMBlack,
    "credit-card": CreditCardBlack,
    "cash-advance": CashBlack,
    pos: ReceiptTerminalBlack,
    ebt: ElectronicInvoiceBlack,
    airvac: FireExtinguisherBlack,
    website: websiteServiceBlack,
    "ach-processing": DoctorsBagBlack,
};

const UserActivations = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const roleTitleNormalized = (userData?.roleTitle || "").toLowerCase();
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;
    const isDuplicate = Boolean(location.state?.isDuplicate);
    const sourceApplicationId =
        location.state?.sourceApplicationId
        || location.state?.duplicateFrom?.id
        || null;
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [selectedSolutions, setSelectedSolutions] = useState(() => {
        if (isDuplicate) return [];
        if (location.state?.firstStep?.solutions?.length) {
            return location.state.firstStep.solutions;
        }
        return location.state?.itemData?.solution
            ? [location.state.itemData.solution]
            : [];
    });
    const [data, setData] = useState([]);

    useEffect(() => {
        if (!isGuest && !accessToken) return;
        setFetching(true);
        const request = isGuest
            ? getPublicItemCategories({ tenantSlug })
            : getRequestWithOutBody(`${baseURl}item-category/`, accessToken);
        request
            .then((result) => {
                const services = (result?.data || []).map((item) => ({
                    id: item.id,
                    text: item.title,
                    value: item.solution,
                    icon: SOLUTION_ICONS[item.solution] || ATMBlack,
                })).reverse();
                setData(services);
            })
            .catch(() => setData([]))
            .finally(() => setFetching(false));
    }, [accessToken, isGuest, tenantSlug]);

    const toggleSolution = (value) => {
        setSelectedSolutions((prev) =>
            prev.includes(value)
                ? prev.filter((item) => item !== value)
                : [...prev, value]
        );
    };

    const resolveSourceApplication = async () => {
        if (!isDuplicate) return location.state?.duplicateFrom || null;

        let sourceApp = location.state?.duplicateFrom || null;
        if (sourceApplicationId) {
            try {
                const result = await getRequestWithOutBody(
                    `${baseURl}application/${sourceApplicationId}`,
                    accessToken
                );
                if (result?.data) {
                    sourceApp = result.data;
                }
            } catch {
                // keep state payload
            }
        }
        return sourceApp;
    };

    const handleNext = async () => {
        if (selectedSolutions.length === 0) {
            toast.error("Please select at least one service");
            return;
        }

        setLoading(true);
        try {
            const selectedCategories = data.filter((item) => selectedSolutions.includes(item.value));
            const categoryIds = selectedCategories.map((item) => item.id);
            const categoryIdBySolution = selectedCategories.reduce((acc, item) => {
                acc[item.value] = item.id;
                return acc;
            }, {});

            // Same create payload as a normal new application.
            // Duplicate never reuses the source applicationId.
            const apiData = {
                currentStep: 1,
                solutions: selectedSolutions,
                ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                applicationId: isDuplicate
                    ? null
                    : (location.state?.itemData?.id
                        || location.state?.applicationId
                        || null),
            };
            const result = isGuest
                ? await submitPublicApplicationStep(apiData)
                : await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
            const rawApplications = result?.data?.applications || [];
            const fallbackId = result?.data?.applicationId || result?.data?.id || null;
            const applications = (rawApplications.length
                ? rawApplications
                : selectedSolutions.map((solution) => ({ applicationId: fallbackId, solution }))
            )
                .map((app, index) => {
                    const solution = app.solution || selectedSolutions[index];
                    return {
                        ...app,
                        applicationId: app.applicationId || app.id || fallbackId,
                        solution,
                        categoryId: categoryIdBySolution[solution] ?? null,
                    };
                })
                .filter((app) => app.applicationId);
            const applicationIds = [...new Set(applications.map((app) => app.applicationId).filter(Boolean))];
            if (fallbackId && !applicationIds.includes(fallbackId)) {
                applicationIds.unshift(fallbackId);
            }

            const sourceApp = isDuplicate ? await resolveSourceApplication() : null;

            const navigationState = {
                firstStep: {
                    ...apiData,
                    categoryIds,
                    categoryIdBySolution,
                },
                applications,
                applicationIds,
                applicationId: fallbackId || applicationIds[0] || null,
                ...(isGuest && { tenantSlug }),
                ...(isDuplicate && {
                    isDuplicate: true,
                    sourceApplicationId,
                    duplicateFrom: sourceApp,
                }),
            };
            if (isGuest) {
                writePublicApplicationDraft({
                    tenantSlug,
                    applicationId: navigationState.applicationId,
                    applicationIds,
                });
                navigate(`/apply/${tenantSlug}/selectPlan`, { state: navigationState });
            } else if (roleTitleNormalized === "agent") {
                navigate('/userdashboard/selectPlan', { state: navigationState });
            } else {
                navigate('/home/selectPlan', { state: navigationState });
            }
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
                Heading={isDuplicate ? 'Duplicate Application' : 'Application'}
                Fontsize={30}
            />
            <p style={{ color: 'var(--dashboard-text-secondary)', fontSize: 16, marginTop: 4, fontFamily: 'Nunito' }}>
                {isDuplicate
                    ? 'Select the service(s) for the new application. Shared details will be prefilled from the original on the next steps.'
                    : 'Select the services required for your business'}
            </p>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, paddingTop: 40, borderRadius: 14 }} className="sm:m-8 p-4 pt-4 sm:p-10 m-2">
                    <Stepper activeStep={0} />
                    {loading || fetching ? (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <div className="mt-14">
                            {Array.isArray(data) && data.length > 0 ? (
                                <>
                                    <div className="grid gap-x-8 gap-y-6 grid-cols-1 sm:grid-cols-2">
                                        {data.map((column) => (
                                            <ApplicationCard
                                                key={column.id}
                                                data={column}
                                                isSelected={selectedSolutions.includes(column.value)}
                                                onClick={() => toggleSolution(column.value)}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-end mt-16">
                                        <BottonCustom
                                            backgroundColor={'var(--sidebar-selected-bg)'}
                                            width={180}
                                            title={'Next'}
                                            height={46}
                                            color={'var(--sidebar-text-selected)'}
                                            fontSize={16}
                                            fontWeight={600}
                                            onClick={handleNext}
                                        />
                                    </div>
                                </>
                            ) : (
                                <NoDataFound
                                    title="No Data Found"
                                    description="No applications options are available right now."
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
};

export default UserActivations;
