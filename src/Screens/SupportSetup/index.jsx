import React, { useEffect, useState } from 'react';
import Heading from '../../Components/Heading';
import { styled } from '@mui/material/styles';
import BottonWithIcon from '../../Components/ButtonWithIcon';
import AddPreference from '../../Components/AddPreference';
import addIcon from "../../assets/addIcon.png";
import Loader from '../../Components/Loader';
import NoDataFound from '../../Components/NoDataFound';
import SortablePreferenceList from '../../Components/SortablePreferenceList';
import { getRequestWithOutBody, patchRequestWithBody, deleteRequest, buildAuthHeaders } from '../../Api/fetch';
import DeleteConfirmationModal from '../../Components/DeleteModal';
import { baseURl } from '../../Config/systemConfig';
import { useSelector } from 'react-redux';
import EditPreference from '../../Components/EditPreference';
import ProductItem from '../../Components/ProductItem';
import { useNavigate, useLocation } from 'react-router-dom';
import AddPricingPlan from '../../Components/AddPricingPlan';
import PricingPlanBox from '../../Components/PricingPlanBox';
import EditPricingPlan from '../../Components/EditPricingPlan';
import { HiSearch } from 'react-icons/hi';
import { usePageTitle } from '../../Hooks/usePageTitle';
import { toast } from 'react-toastify';
import AgreementListPanel from './AgreementListPanel';

const sortByOrder = (items = []) =>
    [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const getServiceKey = (service) =>
    service?.solution || String(service?.id || '');

const getServiceLabel = (service) =>
    service?.title || service?.name || getServiceKey(service) || 'Service';

const toCamelCase = (slug) =>
    String(slug || '')
        .split('-')
        .filter(Boolean)
        .map((part, index) =>
            index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join('');

const getMerchantOwnedFormName = (solution) => {
    const camel = toCamelCase(solution);
    if (!camel) return 'merchantOwnedAtm';
    return `merchantOwned${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
};

const getPreferencesFormName = (solution) =>
    solution ? `${solution}1` : 'preferences';

const getProcessingFormName = (solution) =>
    solution || 'preferences';

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
    flexWrap: 'wrap',
});

const HeaderWrapper2 = styled('div')({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
});

const SupportSetupModal = ({
    isOpen,
    onClose,
    onSubmit,
    title,
    value,
    setValue,
    submitText = 'Save',
    btnLoading = false,
    secondLabel,
    secondValue,
    setSecondValue,
    secondPlaceholder = 'Enter value',
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
            <div
                className="w-full max-w-md p-5"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 14,
                    boxShadow: '0 10px 35px rgba(0,0,0,0.18)'
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={title}
                        Fontsize={22}
                    />
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1 rounded-md"
                        style={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)',
                            border: '1px solid rgba(0,0,0,0.08)'
                        }}
                    >
                        Close
                    </button>
                </div>

                <div className="mb-4">
                    <label
                        className="block mb-2 text-sm font-medium"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        Title
                    </label>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter title"
                        className="w-full px-3 py-3 rounded-lg outline-none"
                        style={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)',
                            border: '1px solid rgba(100, 153, 255, 0.35)'
                        }}
                    />
                </div>

                {secondLabel && (
                    <div className="mb-4">
                        <label
                            className="block mb-2 text-sm font-medium"
                            style={{ color: 'var(--dashboard-text-primary)' }}
                        >
                            {secondLabel}
                        </label>
                        <input
                            type="text"
                            value={secondValue}
                            onChange={(e) => setSecondValue(e.target.value)}
                            placeholder={secondPlaceholder}
                            className="w-full px-3 py-3 rounded-lg outline-none"
                            style={{
                                backgroundColor: 'var(--dashboard-tab-box)',
                                color: 'var(--dashboard-text-primary)',
                                border: '1px solid rgba(100, 153, 255, 0.35)'
                            }}
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg"
                        style={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={btnLoading}
                        className="px-4 py-2 rounded-lg"
                        style={{
                            backgroundColor: '#0C79F7',
                            color: '#fff',
                            opacity: btnLoading ? 0.7 : 1
                        }}
                    >
                        {btnLoading ? 'Saving...' : submitText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SupportSingleFieldCard = ({ data, onEdit }) => {
    return (
        <div
            className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] p-4"
            style={{
                backgroundColor: 'var(--dashboard-tab-box)',
                borderRadius: 12,
                border: '1px solid rgba(100, 153, 255, 0.18)'
            }}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div
                        className="text-base font-semibold break-words"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        {data?.title || data?.name || '-'}
                    </div>
                    {(data?.solution || data?.subtitle) && (
                        <div
                            className="text-sm mt-1 break-words"
                            style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}
                        >
                            {data?.solution || data?.subtitle}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => onEdit(data)}
                    className="px-3 py-2 text-sm rounded-lg"
                    style={{
                        backgroundColor: '#0C79F7',
                        color: '#fff'
                    }}
                >
                    Edit
                </button>
            </div>
        </div>
    );
};

const SupportSetup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    
    // Update browser tab title
    usePageTitle("Support Setup", location);

    const [activeTab, setActiveTab] = useState(location.state?.tab || 'preferences');
    const [activeProcessingTab, setActiveProcessingTab] = useState('');
    const [activePreferencesTab, setActivePreferencesTab] = useState('');
    const [activeMerchantOwnedTab, setActiveMerchantOwnedTab] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [isHardwareModalOpen, setHardwareModalOpen] = useState(false);
    const [isEditPreferenceModalOpen, setEditPreferenceModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [editpricingPlanData, setEditpricingPlanData] = useState(null);
    const [preferencesData, setPreferencesData] = useState([]);
    const [preferencesSubData, setPreferencesSubData] = useState({});
    const [merchantOwnedData, setMerchantOwnedData] = useState({});
    const [processingData, setProcessingData] = useState({});
    const [loading, setLoading] = useState(false);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [isPricingPlanModalOpen, setPricingPlanModalOpen] = useState(false);
    const [pricingPlanList, setPricingPlanList] = useState([]);
    const [isEditPricingPlanModalOpen, setEditPricingPlanModalOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

    // new states for support-setup tabs
    const supportSetupTabs = ['model', 'encryption', 'brand', 'processor'];
    const [supportSetupList, setSupportSetupList] = useState([]);
    const [isSupportSetupModalOpen, setSupportSetupModalOpen] = useState(false);
    const [supportSetupTitle, setSupportSetupTitle] = useState('');
    const [supportSetupBtnLoading, setSupportSetupBtnLoading] = useState(false);
    const [supportSetupEditData, setSupportSetupEditData] = useState(null);

    // agreements tab states
    const [agreementList, setAgreementList] = useState([]);
    const [agreementPage, setAgreementPage] = useState(1);
    const [agreementTotal, setAgreementTotal] = useState(0);
    const agreementLimit = 20;
    const [deleteAgreementRule, setDeleteAgreementRule] = useState(null);
    const [deletingAgreementRule, setDeletingAgreementRule] = useState(false);
    const [activeAgreementSubTab, setActiveAgreementSubTab] = useState(
        location.state?.tab === 'agreements' && location.state?.agreementSubTab
            ? location.state.agreementSubTab
            : 'list'
    );

    // item-category tab states
    const [itemCategoryList, setItemCategoryList] = useState([]);
    const [isItemCategoryModalOpen, setItemCategoryModalOpen] = useState(false);
    const [itemCategoryTitle, setItemCategoryTitle] = useState('');
    const [itemCategorySolution, setItemCategorySolution] = useState('');
    const [itemCategoryBtnLoading, setItemCategoryBtnLoading] = useState(false);
    const [itemCategoryEditData, setItemCategoryEditData] = useState(null);


    const closeModal = () => {
        setModalOpen(false);
    };

    const closeHardwareModal = () => {
        setHardwareModalOpen(false);
    };

    const closeEditPreferenceModal = () => {
        setEditPreferenceModalOpen(false);
    };

    const closePricingPlanModal = () => {
        setPricingPlanModalOpen(false);
    };

    const closeEditPricingPlanModal = () => {
        setEditPricingPlanModalOpen(false);
    };

    const closeSupportSetupModal = () => {
        setSupportSetupModalOpen(false);
        setSupportSetupTitle('');
        setSupportSetupEditData(null);
    };

    const closeItemCategoryModal = () => {
        setItemCategoryModalOpen(false);
        setItemCategoryTitle('');
        setItemCategorySolution('');
        setItemCategoryEditData(null);
    };

    const handleButtonClick = () => {
        setModalOpen(true);
    };

    const handlePricingPlanClick = () => {
        setPricingPlanModalOpen(true);
    };

    const handleAddHardwareClick = () => {
        navigate('/home/addItem');
    };

    const handleAddSupportSetupClick = () => {
        setSupportSetupTitle('');
        setSupportSetupEditData(null);
        setSupportSetupModalOpen(true);
    };

    const handleAddItemCategoryClick = () => {
        setItemCategoryTitle('');
        setItemCategorySolution('');
        setItemCategoryEditData(null);
        setItemCategoryModalOpen(true);
    };

    const fetchData = () => {
        let api;
        let formName = 'preferences';

        if (activeTab === 'processing') {
            if (!activeProcessingTab) return;
            formName = getProcessingFormName(activeProcessingTab);
            api = `${baseURl}application-preferences?formName=${formName}`;
        } else if (activeTab === 'preferences') {
            if (!activePreferencesTab) return;
            formName = getPreferencesFormName(activePreferencesTab);
            api = `${baseURl}application-preferences?formName=${formName}`;
        } else if (activeTab === 'merchant-owned') {
            if (!activeMerchantOwnedTab) return;
            formName = getMerchantOwnedFormName(activeMerchantOwnedTab);
            api = `${baseURl}application-preferences?formName=${formName}`;
        } else {
            api = `${baseURl}application-preferences`;
        }

        setLoading(true);
        getRequestWithOutBody(api, accessToken)
            .then(result => {
                if (activeTab === 'processing') {
                    const filteredData = sortByOrder(
                        result?.data?.filter(item => item.formName === formName) || []
                    );

                    setProcessingData(prev => ({
                        ...prev,
                        [formName]: filteredData
                    }));
                } else if (activeTab === 'preferences') {
                    const filteredData = sortByOrder(
                        result?.data?.filter(item => item.formName === formName) || []
                    );

                    setPreferencesSubData(prev => ({
                        ...prev,
                        [formName]: filteredData
                    }));
                } else if (activeTab === 'merchant-owned') {
                    const filteredData = sortByOrder(
                        result?.data?.filter(item => item.formName === formName) || []
                    );

                    setMerchantOwnedData(prev => ({
                        ...prev,
                        [formName]: filteredData
                    }));
                } else {
                    setPreferencesData(result?.data);
                }
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
            });
    };

    const handlePreferenceReorder = async (fromIndex, toIndex, formName, tabType) => {
        if (fromIndex === toIndex) return;

        const setter = tabType === 'processing'
            ? setProcessingData
            : tabType === 'merchant-owned'
                ? setMerchantOwnedData
                : setPreferencesSubData;
        let previousItems = [];
        let orderPayload = [];

        setter((prev) => {
            const currentItems = prev[formName] || [];
            previousItems = currentItems;

            const reordered = [...currentItems];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);

            const withNewOrder = reordered.map((item, index) => ({
                ...item,
                order: index,
            }));

            orderPayload = withNewOrder.map(({ id, order }) => ({ id, order }));

            return {
                ...prev,
                [formName]: withNewOrder,
            };
        });

        try {
            await patchRequestWithBody(
                `${baseURl}application-preferences/set-order`,
                { data: orderPayload },
                accessToken
            );
            toast.success('Order updated successfully');
        } catch (error) {
            setter((prev) => ({
                ...prev,
                [formName]: previousItems,
            }));
            toast.error(error?.message || 'Failed to update order');
        }
    };

    const renderPreferenceList = (items, formName, tabType, emptyDescription) => {
        if (loading) {
            return (
                <div className="w-full flex justify-center py-8">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            );
        }

        if (!items?.length) {
            return <NoDataFound title="No Data Found" description={emptyDescription} />;
        }

        return (
            <SortablePreferenceList
                items={items}
                onReorder={(fromIndex, toIndex) =>
                    handlePreferenceReorder(fromIndex, toIndex, formName, tabType)
                }
                onEdit={(item) => {
                    setEditPreferenceModalOpen(true);
                    setEditData(item);
                }}
                onSuccess={fetchData}
            />
        );
    };

    const fetchData2 = () => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then(result => {
                setItemServicesList(result?.data);
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
            });
    };

    const fetchData3 = () => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}price-plan`, accessToken)
            .then(result => {
                setPricingPlanList(result?.data);
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
            });
    };

    const fetchAgreements = (page = agreementPage) => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}agreement-rule?paginate=true&page=${page}&limit=${agreementLimit}`,
            accessToken
        )
            .then((result) => {
                const rows = Array.isArray(result?.data) ? result.data : result?.data?.data || [];
                setAgreementList(rows);
                setAgreementTotal(result?.totalRecords || result?.data?.totalRecords || rows.length);
                setLoading(false);
            })
            .catch(() => {
                setAgreementList([]);
                setLoading(false);
            });
    };

    const handleDeleteAgreementRule = async () => {
        if (!deleteAgreementRule?.id) return;

        try {
            setDeletingAgreementRule(true);
            const result = await deleteRequest(`${baseURl}agreement-rule/${deleteAgreementRule.id}`, accessToken);
            toast.success(result?.message || 'Agreement rule deleted successfully');
            setDeleteAgreementRule(null);
            fetchAgreements();
        } catch (error) {
            toast.error(error?.message || 'Failed to delete agreement rule');
        } finally {
            setDeletingAgreementRule(false);
        }
    };

    const fetchSupportSetupData = (type) => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}support-setup?type=${type}`, accessToken)
            .then((result) => {
                setSupportSetupList(result?.data || []);
                setLoading(false);
            })
            .catch((error) => {
                setSupportSetupList([]);
                setLoading(false);
            });
    };

    const createSupportSetup = async () => {
        if (!supportSetupTitle?.trim()) return;

        try {
            setSupportSetupBtnLoading(true);

            const response = await fetch(`${baseURl}support-setup`, {
                method: 'POST',
                headers: buildAuthHeaders(accessToken, {
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({
                    title: supportSetupTitle?.trim(),
                    type: activeTab
                }),
            });

            const result = await response.json();

            setSupportSetupBtnLoading(false);
            closeSupportSetupModal();
            fetchSupportSetupData(activeTab);
        } catch (error) {
            setSupportSetupBtnLoading(false);
        }
    };

    const updateSupportSetup = async () => {
        if (!supportSetupTitle?.trim() || !supportSetupEditData?.id) return;

        try {
            setSupportSetupBtnLoading(true);

            const response = await fetch(`${baseURl}support-setup/${supportSetupEditData?.id}`, {
                method: 'PUT',
                headers: buildAuthHeaders(accessToken, {
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({
                    title: supportSetupTitle?.trim(),
                    type: activeTab
                }),
            });

            const result = await response.json();

            setSupportSetupBtnLoading(false);
            closeSupportSetupModal();
            fetchSupportSetupData(activeTab);
        } catch (error) {
            setSupportSetupBtnLoading(false);
        }
    };

    const normalizeItemCategoryList = (result) => {
        const list =
            result?.data?.data
            || result?.data?.results
            || (Array.isArray(result?.data) ? result.data : [])
            || [];
        return (Array.isArray(list) ? list : [])
            .map((item) => ({
                ...item,
                title: item.title || item.name || '',
                solution: item.solution || '',
            }))
            .filter((item) => getServiceKey(item));
    };

    const syncActiveServiceTabs = (list) => {
        const keys = list.map(getServiceKey).filter(Boolean);
        if (!keys.length) return;
        const first = keys[0];
        const pick = (prev) => (keys.includes(prev) ? prev : first);
        setActivePreferencesTab(pick);
        setActiveProcessingTab(pick);
        setActiveMerchantOwnedTab(pick);
    };

    const fetchItemCategories = (options = {}) => {
        const { withLoading = true } = options;
        if (withLoading) setLoading(true);
        getRequestWithOutBody(`${baseURl}item-category/`, accessToken)
            .then((result) => {
                const list = normalizeItemCategoryList(result);
                setItemCategoryList(list);
                syncActiveServiceTabs(list);
                if (withLoading) setLoading(false);
            })
            .catch(() => {
                setItemCategoryList([]);
                if (withLoading) setLoading(false);
            });
    };

    const createItemCategory = async () => {
        if (!itemCategoryTitle?.trim()) return;

        try {
            setItemCategoryBtnLoading(true);

            const response = await fetch(`${baseURl}item-category/`, {
                method: 'POST',
                headers: buildAuthHeaders(accessToken, {
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({
                    title: itemCategoryTitle?.trim(),
                    solution: itemCategorySolution?.trim(),
                }),
            });

            await response.json();

            setItemCategoryBtnLoading(false);
            closeItemCategoryModal();
            fetchItemCategories();
            toast.success('Service created successfully');
        } catch (error) {
            setItemCategoryBtnLoading(false);
            toast.error(error?.message || 'Failed to create service');
        }
    };

    const updateItemCategory = async () => {
        if (!itemCategoryTitle?.trim() || !itemCategoryEditData?.id) return;

        try {
            setItemCategoryBtnLoading(true);

            const response = await fetch(`${baseURl}item-category/${itemCategoryEditData?.id}`, {
                method: 'PUT',
                headers: buildAuthHeaders(accessToken, {
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({
                    title: itemCategoryTitle?.trim(),
                    solution: itemCategorySolution?.trim(),
                }),
            });

            await response.json();

            setItemCategoryBtnLoading(false);
            closeItemCategoryModal();
            fetchItemCategories();
            toast.success('Service updated successfully');
        } catch (error) {
            setItemCategoryBtnLoading(false);
            toast.error(error?.message || 'Failed to update service');
        }
    };

    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
        if (location.state?.agreementSubTab) {
            setActiveAgreementSubTab(location.state.agreementSubTab);
        }
    }, [location.state?.tab, location.state?.agreementSubTab]);

    useEffect(() => {
        if (!accessToken) return;
        fetchItemCategories({ withLoading: false });
    }, [accessToken]);

    useEffect(() => {
        if (activeTab === 'preferences') {
            fetchData();
        }
        if (activeTab === 'merchant-owned') {
            fetchData();
        }
        if (activeTab === 'hardware') {
            fetchData2();
        }
        if (activeTab === 'pricing') {
            fetchData3();
        }
        if (activeTab === 'processing') {
            fetchData();
        }
        if (supportSetupTabs.includes(activeTab)) {
            fetchSupportSetupData(activeTab);
        }
        if (activeTab === 'agreements' && activeAgreementSubTab === 'rules') {
            fetchAgreements();
        }
        if (activeTab === 'item-category') {
            fetchItemCategories();
        }
    }, [activeTab, accessToken, activeAgreementSubTab]);

    useEffect(() => {
        if (activeTab === 'agreements' && activeAgreementSubTab === 'rules') {
            fetchAgreements(agreementPage);
        }
    }, [agreementPage]);

    useEffect(() => {
        if (activeTab === 'processing' && activeProcessingTab) {
            fetchData();
        }
    }, [activeProcessingTab, accessToken]);

    useEffect(() => {
        if (activeTab === 'preferences' && activePreferencesTab) {
            fetchData();
        }
    }, [activePreferencesTab, accessToken]);

    useEffect(() => {
        if (activeTab === 'merchant-owned' && activeMerchantOwnedTab) {
            fetchData();
        }
    }, [activeMerchantOwnedTab, accessToken]);

    const getSupportHeading = () => {
        switch (activeTab) {
            case 'model':
                return 'Model';
            case 'encryption':
                return 'Encryption';
            case 'brand':
                return 'Brand';
            case 'processor':
                return 'Processor';
            default:
                return 'Support Setup';
        }
    };

    const renderAgreementRules = () => (
        <>
            <HeaderWrapper className="mt-4">
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Agreement Rules'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Create Agreement'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    onClick={() => navigate('/home/agreementConfiguration')}
                />
            </HeaderWrapper>

            {loading ? (
                <div className="w-full flex justify-center py-8">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : agreementList?.length > 0 ? (
                <>
                    <div className="w-full overflow-x-auto mt-4 rounded-xl" style={{ border: '1px solid rgba(100, 153, 255, 0.18)' }}>
                        <table className="w-full text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--dashboard-tab-box)' }}>
                                    <th className="text-left px-4 py-3 font-semibold">Title</th>
                                    <th className="text-left px-4 py-3 font-semibold">Service</th>
                                    <th className="text-left px-4 py-3 font-semibold">Relationship</th>
                                    <th className="text-left px-4 py-3 font-semibold">Condition</th>
                                    <th className="text-left px-4 py-3 font-semibold">Agreements</th>
                                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agreementList.map((item, index) => {
                                    const serviceName = item?.ruleCategories
                                        ?.map((rc) => rc?.category?.title)
                                        .filter(Boolean)
                                        .join(', ') || '-';
                                    const planNames = item?.rulePlans
                                        ?.map((rp) => rp?.plan?.title || rp?.plan?.name)
                                        .filter(Boolean)
                                        .join(', ');
                                    const itemNames = item?.ruleItems
                                        ?.map((ri) => ri?.item?.title || ri?.item?.name)
                                        .filter(Boolean)
                                        .join(', ');
                                    const relationType = item?.rulePlans?.length && item?.ruleItems?.length
                                        ? 'Service + Hardware + Plan'
                                        : item?.rulePlans?.length
                                            ? 'Service + Plan'
                                            : item?.ruleItems?.length
                                                ? 'Service + Hardware'
                                                : 'Service Only';
                                    const condition = [planNames, itemNames].filter(Boolean).join(' | ') || 'Always shown';
                                    const agreementNames = item?.ruleAgreements
                                        ?.map((ra) => ra?.agreement?.title)
                                        .filter(Boolean)
                                        .join(', ') || '-';
                                    const isActive = item?.ruleAgreements?.length
                                        ? item.ruleAgreements.some((ra) => ra?.agreement?.isActive)
                                        : true;
                                    return (
                                        <tr key={item?.id || index} style={{ borderTop: '1px solid rgba(100, 153, 255, 0.12)' }}>
                                            <td className="px-4 py-3 font-medium">{item?.title || '-'}</td>
                                            <td className="px-4 py-3">{serviceName}</td>
                                            <td className="px-4 py-3">{relationType}</td>
                                            <td className="px-4 py-3">{condition}</td>
                                            <td className="px-4 py-3">{agreementNames}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                                                    style={{
                                                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                        color: isActive ? '#059669' : '#DC2626'
                                                    }}
                                                >
                                                    <span
                                                        className="h-1.5 w-1.5 rounded-full"
                                                        style={{ backgroundColor: isActive ? '#10B981' : '#EF4444' }}
                                                    />
                                                    {isActive ? 'Active' : 'In-Active'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate('/home/agreementConfiguration', { state: { editRule: item } })}
                                                        className="px-3 py-1.5 text-sm rounded-lg"
                                                        style={{ backgroundColor: '#0C79F7', color: '#fff' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteAgreementRule(item)}
                                                        className="px-3 py-1.5 text-sm rounded-lg"
                                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {agreementTotal > agreementLimit && (
                        <div className="flex items-center justify-end gap-3 mt-4">
                            <button
                                disabled={agreementPage <= 1}
                                onClick={() => setAgreementPage((p) => p - 1)}
                                className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                                style={{ backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                            >
                                Previous
                            </button>
                            <span className="text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>
                                Page {agreementPage} of {Math.max(1, Math.ceil(agreementTotal / agreementLimit))}
                            </span>
                            <button
                                disabled={agreementPage >= Math.ceil(agreementTotal / agreementLimit)}
                                onClick={() => setAgreementPage((p) => p + 1)}
                                className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                                style={{ backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <NoDataFound title="No Data Found" description="No agreements found." />
            )}
        </>
    );

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Support'}
                Fontsize={30}
            />

            <HeaderWrapper2 className="flex space-x-4 border-b mt-3 border-gray-200">
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'preferences'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('preferences')}
                >
                    Preferences
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'merchant-owned'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('merchant-owned')}
                >
                    Merchant-owned
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'hardware'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('hardware')}
                >
                    Hardware
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'pricing'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('pricing')}
                >
                    Pricing Plan
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'model'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('model')}
                >
                    Model
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'encryption'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('encryption')}
                >
                    Encryption
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'brand'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('brand')}
                >
                    Brand
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'processor'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('processor')}
                >
                    Processor
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'processing'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('processing')}
                >
                    Processing Information
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'agreements'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => {
                        setActiveTab('agreements');
                        setActiveAgreementSubTab('list');
                    }}
                >
                    Agreements
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'item-category'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('item-category')}
                >
                    Services
                </button>
            </HeaderWrapper2>

            <div className="w-full p-4 min-h-screen mt-4" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                {activeTab === 'preferences' ? (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Preferences'}
                                Fontsize={30}
                            />
                        </HeaderWrapper>

                        <HeaderWrapper2 className="flex space-x-4 border-b mt-3 border-gray-200 overflow-x-auto">
                            {itemCategoryList.map((service) => {
                                const key = getServiceKey(service);
                                return (
                                    <button
                                        key={key}
                                        className={`pb-2 px-4 text-sm font-medium whitespace-nowrap ${activePreferencesTab === key
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-600 hover:text-[#0C79F7]'
                                            }`}
                                        onClick={() => setActivePreferencesTab(key)}
                                    >
                                        {getServiceLabel(service)}
                                    </button>
                                );
                            })}
                        </HeaderWrapper2>

                        <div className="w-full p-4 mt-4" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                            {!itemCategoryList.length ? (
                                <NoDataFound title="No Data Found" description="No services found. Add services from the Services tab." />
                            ) : activePreferencesTab ? (
                                <>
                                    <HeaderWrapper>
                                        <Heading
                                            Fontweight={700}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={getServiceLabel(itemCategoryList.find((s) => getServiceKey(s) === activePreferencesTab))}
                                            Fontsize={30}
                                        />
                                        <BottonWithIcon
                                            backgroundColor={'#0C79F7'}
                                            icon={addIcon}
                                            title={'Add New Preference'}
                                            height={40}
                                            color={'var(--sidebar-text-selected)'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={handleButtonClick}
                                        />
                                    </HeaderWrapper>

                                    {renderPreferenceList(
                                        preferencesSubData[getPreferencesFormName(activePreferencesTab)],
                                        getPreferencesFormName(activePreferencesTab),
                                        'preferences',
                                        `No ${getServiceLabel(itemCategoryList.find((s) => getServiceKey(s) === activePreferencesTab)).toLowerCase()} found.`
                                    )}
                                </>
                            ) : null}
                        </div>
                    </>
                ) : activeTab === 'merchant-owned' ? (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Merchant-owned'}
                                Fontsize={30}
                            />
                        </HeaderWrapper>

                        <HeaderWrapper2 className="flex space-x-4 border-b mt-3 border-gray-200 overflow-x-auto">
                            {itemCategoryList.map((service) => {
                                const key = getServiceKey(service);
                                return (
                                    <button
                                        key={key}
                                        className={`pb-2 px-4 text-sm font-medium whitespace-nowrap ${activeMerchantOwnedTab === key
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-600 hover:text-[#0C79F7]'
                                            }`}
                                        onClick={() => setActiveMerchantOwnedTab(key)}
                                    >
                                        {getServiceLabel(service)}
                                    </button>
                                );
                            })}
                        </HeaderWrapper2>

                        <div className="w-full p-4 mt-4" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                            {!itemCategoryList.length ? (
                                <NoDataFound title="No Data Found" description="No services found. Add services from the Services tab." />
                            ) : activeMerchantOwnedTab ? (
                                <>
                                    <HeaderWrapper>
                                        <Heading
                                            Fontweight={700}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={getServiceLabel(itemCategoryList.find((s) => getServiceKey(s) === activeMerchantOwnedTab))}
                                            Fontsize={30}
                                        />
                                        <BottonWithIcon
                                            backgroundColor={'#0C79F7'}
                                            icon={addIcon}
                                            title={'Add New Preference'}
                                            height={40}
                                            color={'var(--sidebar-text-selected)'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={handleButtonClick}
                                        />
                                    </HeaderWrapper>

                                    {renderPreferenceList(
                                        merchantOwnedData[getMerchantOwnedFormName(activeMerchantOwnedTab)],
                                        getMerchantOwnedFormName(activeMerchantOwnedTab),
                                        'merchant-owned',
                                        `No ${getServiceLabel(itemCategoryList.find((s) => getServiceKey(s) === activeMerchantOwnedTab)).toLowerCase()} found.`
                                    )}
                                </>
                            ) : null}
                        </div>
                    </>
                ) : activeTab === 'hardware' ? (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Hardware'}
                                Fontsize={30}
                            />
                            <BottonWithIcon
                                backgroundColor={'#0C79F7'}
                                icon={addIcon}
                                title={'Add New Hardware'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleAddHardwareClick}
                            />
                        </HeaderWrapper>

                        <div>
                            <div style={{ borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', height: 40, borderColor: 'rgba(100, 153, 255, 1)', borderWidth: 2 }} className="w-52 lg:w-96 max-w-96 mt-2 relative bg-[var(--scroll-thumb)] gap-2 items-center rounded-full flex-grow flex">
                                <HiSearch className="text-[22px] text-dashboard-card-text-primary-light dark:text-dashboard-card-text-primary-dark ml-3" />
                                <input
                                    type="text"
                                    placeholder="Search by Name"
                                    className="bg-transparent outline-none text-[14px] p-1 notranslate"
                                    style={{ width: 388, color: 'var(--dashboard-text-primary)' }}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value.toLowerCase())}
                                />
                            </div>

                            <div className="flex flex-wrap gap-4 mt-4">
                                {loading ? (
                                    <div className="w-full flex justify-center py-8">
                                        <Loader message="Loading..." subMessage="Please wait" />
                                    </div>
                                ) : itemServicesList?.length > 0 ? (
                                    itemServicesList
                                        .filter(item =>
                                            item.name?.toLowerCase().includes(searchText)
                                        ).map((item, index) => (
                                            <ProductItem key={index} data={item} editProduct={true} />
                                        ))
                                ) : (
                                    <NoDataFound title="No Data Found" description="No hardware found." />
                                )}
                            </div>
                        </div>
                    </>
                ) : activeTab === 'pricing' ? (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Pricing Plan'}
                                Fontsize={30}
                            />
                            <BottonWithIcon
                                backgroundColor={'#0C79F7'}
                                icon={addIcon}
                                title={'Add New Pricing Plan'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handlePricingPlanClick}
                            />
                        </HeaderWrapper>

                        <div className="flex flex-wrap gap-4 mt-4">
                            {loading ? (
                                <div className="w-full flex justify-center py-8">
                                    <Loader message="Loading..." subMessage="Please wait" />
                                </div>
                            ) : pricingPlanList?.length > 0 ? (
                                pricingPlanList.map((item, index) => (
                                    <PricingPlanBox
                                        key={index}
                                        data={item}
                                        editProduct={true}
                                        onEdit={(item) => {
                                            setEditPricingPlanModalOpen(true);
                                            setEditpricingPlanData(item);
                                        }}
                                    />
                                ))
                            ) : (
                                <NoDataFound title="No Data Found" description="No pricing plan found." />
                            )}
                        </div>
                    </>
                ) : activeTab === 'processing' ? (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Processing Information'}
                                Fontsize={30}
                            />
                        </HeaderWrapper>

                        <HeaderWrapper2 className="flex space-x-4 border-b mt-3 border-gray-200 overflow-x-auto">
                            {itemCategoryList.map((service) => {
                                const key = getServiceKey(service);
                                return (
                                    <button
                                        key={key}
                                        className={`pb-2 px-4 text-sm font-medium whitespace-nowrap ${activeProcessingTab === key
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-600 hover:text-[#0C79F7]'
                                            }`}
                                        onClick={() => setActiveProcessingTab(key)}
                                    >
                                        {getServiceLabel(service)}
                                    </button>
                                );
                            })}
                        </HeaderWrapper2>

                        <div className="w-full p-4 mt-4" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                            {!itemCategoryList.length ? (
                                <NoDataFound title="No Data Found" description="No services found. Add services from the Services tab." />
                            ) : activeProcessingTab ? (
                                <>
                                    <HeaderWrapper>
                                        <Heading
                                            Fontweight={700}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={getServiceLabel(itemCategoryList.find((s) => getServiceKey(s) === activeProcessingTab))}
                                            Fontsize={30}
                                        />
                                        <BottonWithIcon
                                            backgroundColor={'#0C79F7'}
                                            icon={addIcon}
                                            title={'Add New Preference'}
                                            height={40}
                                            color={'var(--sidebar-text-selected)'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={handleButtonClick}
                                        />
                                    </HeaderWrapper>

                                    {renderPreferenceList(
                                        processingData[getProcessingFormName(activeProcessingTab)],
                                        getProcessingFormName(activeProcessingTab),
                                        'processing',
                                        `No ${getServiceLabel(itemCategoryList.find((s) => getServiceKey(s) === activeProcessingTab)).toLowerCase()} found.`
                                    )}
                                </>
                            ) : null}
                        </div>
                    </>
                ) : activeTab === 'agreements' ? (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Agreements'}
                                Fontsize={30}
                            />
                        </HeaderWrapper>

                        <HeaderWrapper2 className="flex space-x-4 border-b mt-1 border-gray-200">
                            <button
                                className={`pb-2 px-4 text-sm font-medium ${activeAgreementSubTab === 'list'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-[#0C79F7]'
                                    }`}
                                onClick={() => setActiveAgreementSubTab('list')}
                            >
                                Agreement List
                            </button>
                            <button
                                className={`pb-2 px-4 text-sm font-medium ${activeAgreementSubTab === 'rules'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-[#0C79F7]'
                                    }`}
                                onClick={() => setActiveAgreementSubTab('rules')}
                            >
                                Agreement Rules
                            </button>
                        </HeaderWrapper2>

                        {activeAgreementSubTab === 'list' ? (
                            <div className="mt-4">
                                <AgreementListPanel />
                            </div>
                        ) : (
                            renderAgreementRules()
                        )}
                    </>
                ) : activeTab === 'item-category' ? (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Services'}
                                Fontsize={30}
                            />
                            <BottonWithIcon
                                backgroundColor={'#0C79F7'}
                                icon={addIcon}
                                title={'Add New Service'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleAddItemCategoryClick}
                            />
                        </HeaderWrapper>

                        <div className="flex flex-wrap gap-4 mt-4">
                            {loading ? (
                                <div className="w-full flex justify-center py-8">
                                    <Loader message="Loading..." subMessage="Please wait" />
                                </div>
                            ) : itemCategoryList?.length > 0 ? (
                                itemCategoryList.map((item, index) => (
                                    <SupportSingleFieldCard
                                        key={item?.id || index}
                                        data={item}
                                        onEdit={(category) => {
                                            setItemCategoryEditData(category);
                                            setItemCategoryTitle(category?.title || category?.name || '');
                                            setItemCategorySolution(category?.solution || '');
                                            setItemCategoryModalOpen(true);
                                        }}
                                    />
                                ))
                            ) : (
                                <NoDataFound title="No Data Found" description="No item categories found." />
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <HeaderWrapper>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={getSupportHeading()}
                                Fontsize={30}
                            />
                            <BottonWithIcon
                                backgroundColor={'#0C79F7'}
                                icon={addIcon}
                                title={`Add New ${getSupportHeading()}`}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleAddSupportSetupClick}
                            />
                        </HeaderWrapper>

                        <div className="flex flex-wrap gap-4 mt-4">
                            {loading ? (
                                <div className="w-full flex justify-center py-8">
                                    <Loader message="Loading..." subMessage="Please wait" />
                                </div>
                            ) : supportSetupList?.length > 0 ? (
                                supportSetupList.map((item, index) => (
                                    <SupportSingleFieldCard
                                        key={index}
                                        data={item}
                                        onEdit={(item) => {
                                            setSupportSetupEditData(item);
                                            setSupportSetupTitle(item?.title || '');
                                            setSupportSetupModalOpen(true);
                                        }}
                                    />
                                ))
                            ) : (
                                <NoDataFound title="No Data Found" description={`No ${getSupportHeading().toLowerCase()} found.`} />
                            )}
                        </div>
                    </>
                )}
            </div>

            {isModalOpen && (
                <AddPreference
                    onClose={closeModal}
                    isOpen={isModalOpen}
                    onSuccess={() => {
                        fetchData();
                    }}
                    formName={
                        activeTab === 'merchant-owned'
                            ? getMerchantOwnedFormName(activeMerchantOwnedTab)
                            : activeTab === 'processing'
                                ? getProcessingFormName(activeProcessingTab)
                                : activeTab === 'preferences'
                                    ? getPreferencesFormName(activePreferencesTab)
                                    : 'preferences'
                    }
                />
            )}

            {isEditPreferenceModalOpen && (
                <EditPreference
                    onClose={closeEditPreferenceModal}
                    isOpen={isEditPreferenceModalOpen}
                    editData={editData}
                    onSuccess={() => {
                        fetchData();
                    }}
                />
            )}

            {isPricingPlanModalOpen && (
                <AddPricingPlan
                    onClose={closePricingPlanModal}
                    isOpen={isPricingPlanModalOpen}
                    onSuccess={() => {
                        fetchData3();
                    }}
                />
            )}

            {isEditPricingPlanModalOpen && (
                <EditPricingPlan
                    onClose={closeEditPricingPlanModal}
                    isOpen={isEditPricingPlanModalOpen}
                    editData={editpricingPlanData}
                    onSuccess={() => {
                        fetchData3();
                    }}
                />
            )}

            <DeleteConfirmationModal
                open={Boolean(deleteAgreementRule)}
                title="Delete Agreement Rule"
                subtitle="Are you sure you want to delete this agreement rule?"
                entityName={deleteAgreementRule?.title || ''}
                warningMessage="This action cannot be undone. The agreement rule will be permanently removed."
                onCancel={() => setDeleteAgreementRule(null)}
                onDelete={handleDeleteAgreementRule}
                isLoading={deletingAgreementRule}
            />

            {isSupportSetupModalOpen && (
                <SupportSetupModal
                    isOpen={isSupportSetupModalOpen}
                    onClose={closeSupportSetupModal}
                    title={`${supportSetupEditData ? 'Edit' : 'Add'} ${getSupportHeading()}`}
                    value={supportSetupTitle}
                    setValue={setSupportSetupTitle}
                    submitText={supportSetupEditData ? 'Update' : 'Create'}
                    btnLoading={supportSetupBtnLoading}
                    onSubmit={() => {
                        if (supportSetupEditData) {
                            updateSupportSetup();
                        } else {
                            createSupportSetup();
                        }
                    }}
                />
            )}

            {isItemCategoryModalOpen && (
                <SupportSetupModal
                    isOpen={isItemCategoryModalOpen}
                    onClose={closeItemCategoryModal}
                    title={`${itemCategoryEditData ? 'Edit' : 'Add'} Service`}
                    value={itemCategoryTitle}
                    setValue={setItemCategoryTitle}
                    secondLabel="Solution"
                    secondValue={itemCategorySolution}
                    setSecondValue={setItemCategorySolution}
                    secondPlaceholder="Enter solution (e.g. atm)"
                    submitText={itemCategoryEditData ? 'Update' : 'Create'}
                    btnLoading={itemCategoryBtnLoading}
                    onSubmit={() => {
                        if (itemCategoryEditData) {
                            updateItemCategory();
                        } else {
                            createItemCategory();
                        }
                    }}
                />
            )}
        </div>
    );
};

export default SupportSetup;