import { useState } from "react";
import Heading from "../../Components/Heading";
import BottonCustom from "../../Components/ButtonCustom";
import DropdownMenu from "../../Components/dropdownMenu";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const UserPayout = () => {
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [noRecordFound, setNoRecordFound] = useState(false);
    const navigate = useNavigate();

    const fetchData = () => {
        if (!selectedMonth || !selectedYear) {
            toast.error('Month and Year are required');
            return;
        }
        if (!accessToken) {
            toast.error('Session expired. Please login again.');
            return;
        }

        setNoRecordFound(false);
        getRequestWithOutBody(
            `${baseURl}payouts?month=${selectedMonth}&year=${selectedYear}`, accessToken
        )
            .then(result => {
                const payoutData = result?.data ?? [];
                if (Array.isArray(payoutData) && payoutData.length > 0) {
                    navigate("/userdashboard/payoutDetails", { state: { payoutData } });
                } else {
                    setNoRecordFound(true);
                }
            })
            .catch(() => {
                setNoRecordFound(true);
            });
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
        { id: 11, year: 2025, value: 2025 }, // Added value
        { id: 12, year: 2026, value: 2026 }  // Added value
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

    const handleYearChange = (year) => {
        setSelectedYear(year ?? '');
        setNoRecordFound(false);
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month ?? '');
        setNoRecordFound(false);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Payout Details'}
                Fontsize={30}
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ backgroundColor: 'var(--navbar-dropdown-hover)', borderTopLeftRadius: 12, borderTopRightRadius: 12, }} className="mt-4 py-2 w-full">
                    <Heading
                        Fontweight={600}
                        color={'var(--sidebar-text-selected)'}
                        Heading={'Personal Information'}
                        Fontsize={22}
                        ml={30}
                    />
                </div>
                <div className="flex flex-wrap  justify-center mx-4 gap-8 py-4 pb-8 items-center">
                    <div>
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={'Select Month'}
                            Fontsize={14}
                            mb={4}
                        // Tailwind CSS classes
                        />
                        <DropdownMenu menuItems={months} defaultText={'Select Month'} onSelect={handleMonthChange} />
                    </div>
                    <div>
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={'Select Year'}
                            Fontsize={14}
                            mb={4}
                        // Tailwind CSS classes
                        />
                        <DropdownMenu menuItems={data} defaultText={'Select Year'} onSelect={handleYearChange} />
                    </div>

                    <div className="flex justify-between gap-8 mt-4">
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            // width={145}
                            title={'Search'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={fetchData} // Call fetchData on button click
                        />
                    </div>
                </div>
                {noRecordFound && (
                    <div className="py-10">
                        <div className="mx-20 p-16 flex justify-center items-center" style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid rgba(100, 153, 255, 1)', borderRadius: 8 }}>
                            <Heading
                                Fontweight={600}
                                color={'rgba(46, 46, 46, 1)'}
                                Heading={'No Record Found'}
                                Fontsize={28}
                                ml={30}
                            />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default UserPayout;
