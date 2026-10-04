import Heading from "../Heading";
import DropdownMenu from "../dropdownMenu";
import BottonCustom from "../ButtonCustom";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { deleteRequestWithBody, getRequestWithOutBody, getRequestWithOutBodyCached } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import DeleteConfirmationModal from "../DeleteModal";

const DeletePayout = (props) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const { title, upload } = props;
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [agentList, setAgentList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const fetchData = () => {
        setLoading(true); 

        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const sortedAgents = result?.data?.results?.sort((a, b) => a.name.localeCompare(b.name)) || [];
                const updatedAgentList = [{ id: 0, name: 'All' }, ...sortedAgents];
                setAgentList(updatedAgentList);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
        setLoading(false)

    }

    useEffect(() => {
        fetchData()
    }, [])
    const handleYearChange = (year) => {
        setSelectedYear(year);
        setFieldErrors((prev) => ({ ...prev, year: false }));
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
        setFieldErrors((prev) => ({ ...prev, month: false }));
    };

    const handleAgentChange = (month) => {
        setSelectedAgent(month);
    };

    const data = [
        { id: 1, year: 2015, value: 2015 },
        { id: 2, year: 2016, value: 2016 }, // Added value
        { id: 3, year: 2017, value: 2017 }, // Added value
        { id: 4, year: 2018, value: 2018 }, // Added value
        { id: 5, year: 2019, value: 2019 }, // Added value
        { id: 6, year: 2020, value: 2020 }, // Added value
        { id: 7, year: 2021, value: 2021 }, // Added value
        { id: 8, year: 2022, value: 2022 }, // Added value
        { id: 9, year: 2023, value: 2023 }, // Added value
        { id: 10, year: 2024, value: 2024 }, // Added value
        { id: 11, year: 2025, value: 2025 },  // Added value
        { id: 11, year: 2026, value: 2026 }  // Added value
    ];

    const months = [
        { id: 1, month: 'January', value: 'january' },
        { id: 2, month: 'February', value: 'february' }, // Added value
        { id: 3, month: 'March', value: 'march' },       // Added value
        { id: 4, month: 'April', value: 'april' },       // Added value
        { id: 5, month: 'May', value: 'may' },           // Added value
        { id: 6, month: 'June', value: 'june' },         // Added value
        { id: 7, month: 'July', value: 'july' },         // Added value
        { id: 8, month: 'August', value: 'august' },     // Added value
        { id: 9, month: 'September', value: 'september' }, // Added value
        { id: 10, month: 'October', value: 'october' },   // Added value
        { id: 11, month: 'November', value: 'november' }, // Added value
        { id: 12, month: 'December', value: 'december' }  // Added value
    ];

    const DeletePayoutHandle = async () => {
        const errors = {
            year: selectedYear === "",
            month: selectedMonth === "",
        };
        setFieldErrors(errors);

        if (Object.values(errors).some(Boolean)) {
            toast.error("All fields are required");
            return;
        }
        setShowDeleteModal(true);
    };

    const confirmDeletePayout = async () => {
        setLoading(true);
        try {
            const apiData = {
                "month": selectedMonth,
                "year": selectedYear,
            };
            if (selectedAgent) {
                apiData.agentId = selectedAgent;
            }
    
            const result1 = await deleteRequestWithBody(`${baseURl}payouts`, accessToken, apiData);
            toast.success(result1.messages);
            setShowDeleteModal(false);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const cancelDeletePayout = () => {
        setShowDeleteModal(false);
    };

    return (
        <>
            <div>
                <div style={{ backgroundColor: 'var(--navbar-dropdown-hover)', borderTopLeftRadius: 12, borderTopRightRadius: 12, }} className="mt-4 py-1 w-[90%] xl:w-[60%]">
                    <Heading
                        Fontweight={600}
                        color={'var(--sidebar-text-selected)'}
                        Heading={title}
                        Fontsize={20}
                        ml={30}
                    // Tailwind CSS classes
                    />
                </div>
                <div style={{ backgroundColor: 'var(--scroll-thumb)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, }} className=" py-2 w-[90%] xl:w-[60%]">
                    <div style={{}} className="flex justify-center flex-wrap gap-4 mx-2 mt-4">
                        <div>
                            <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Select Month'}
                                Fontsize={10}
                                mb={4}
                            // Tailwind CSS classes
                            />
                            <DropdownMenu menuItems={months} meetingLink={true} defaultText={'Select Month'} onSelect={handleMonthChange} error={fieldErrors.month} />
                        </div>
                        <div>
                            <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Select Year'}
                                Fontsize={10}
                                mb={4}
                            // Tailwind CSS classes
                            />
                            <DropdownMenu menuItems={data} meetingLink={true} defaultText={'Select Year'} onSelect={handleYearChange} error={fieldErrors.year} />
                        </div>
                    </div>
                    <div className=" mb-8 mt-4 flex justify-center md:justify-center flex-wrap gap-10 mx-4 md:gap-36">
                        <div>
                            <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Agent'}
                                Fontsize={10}
                                mb={4}
                            // Tailwind CSS classes
                            />
                            <DropdownMenu idSet={true} menuItems={agentList} meetingLink={true} defaultText={'All'} onSelect={handleAgentChange} />
                        </div>
                        <div className="flex justify-end items-end  md:mt-16">
                            <BottonCustom
                                backgroundColor={'rgba(235, 11, 78, 1)'}
                                width={130}
                                title={'Delete'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={600}
                                onClick={DeletePayoutHandle}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Payout"
                subtitle="Are you sure you want to delete payout for"
                entityName={`${months.find(m => m.value === selectedMonth)?.month || selectedMonth} ${selectedYear}`}
                warningMessage="This action cannot be undone. The payout data will be permanently removed from the system."
                onCancel={cancelDeletePayout}
                onDelete={confirmDeletePayout}
                isLoading={loading}
            />
        </>
    );
};

export default DeletePayout;
