import { useNavigate } from "react-router-dom";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import addIcon from "../../assets/addIcon.png";
import { useEffect, useState } from "react";
import MemoTable from "../../Components/MemoTable";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";

const UserInvoice = () => {
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const userData = useSelector((state) => state?.userData?.userDetails);
    const navigate = useNavigate();

    const [allInvoices, setAllInvoices] = useState(1)
    const [selectInvoice, setSelectInvoices] = useState(1)
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filteredInvoiceList, setFilteredInvoiceList] = useState([]);

    const fetchData = () => {
        if (!accessToken || !userData?.id) return;

        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}invoice?agentId=${userData?.id}`, accessToken
        )
            .then(result => {
                const apiData = result?.data ?? result;
                const rows =
                    apiData?.results ??
                    apiData?.data?.results ??
                    apiData?.data ??
                    (Array.isArray(apiData) ? apiData : []);

                setInvoiceList(
                    (Array.isArray(rows) ? rows : []).filter(Boolean)
                );
                setLoading(false);
            })
            .catch(() => {
                setInvoiceList([]);
                setFilteredInvoiceList([]);
                setLoading(false);
            });
    }

    useEffect(() => {
        fetchData();
    }, [accessToken, userData?.id]);

    useEffect(() => {
        filterInvoices();
    }, [allInvoices, invoiceList]);

    const filterInvoices = () => {
        const safeList = Array.isArray(invoiceList) ? invoiceList : [];
        let filteredList = safeList;

        if (allInvoices === 2) {
            filteredList = safeList.filter(invoice => invoice?.status === 'paid');
        } else if (allInvoices === 3) {
            filteredList = safeList.filter(invoice => invoice?.status === 'un-paid');
        }

        setFilteredInvoiceList(filteredList);
    };

    const handleButtonClick = () => {
        navigate('/userdashboard/createInvoice');
    };

    const handleAllInvoice = () => {
        setAllInvoices(1)
        setSelectInvoices('All Invoices')
    };

    const handlePaidInvoice = () => {
        setAllInvoices(2)
        setSelectInvoices('Paid Invoices')
    };

    const handleUnpaidInvoice = () => {
        setAllInvoices(3)
        setSelectInvoices('Unpaid Invoices')
    };

    const columns = [
        { id: 'id', label: 'INVOICE NUMBER', align: 'center' },
        { id: 'agent?.name', label: 'AGENT', align: 'center' },
        { id: 'createdAt', label: 'CREATED DATE', align: 'center' },
        { id: 'issueDate', label: 'ISSUE DATE', align: 'center' },
        { id: 'dueDate', label: 'DUE DATE', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
        { id: 'totalAmount', label: 'TOTAL AMOUNT', align: 'center' },
    ];

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Invoice Management'}
                Fontsize={30}
            />
            <div className="flex justify-between items-center gap-3 flex-wrap mt-2" >
                <div style={{ border: '1px solid var(--dashboard-box-border)', borderRadius: 12 }} className="">
                    <button style={{ fontSize: 14, backgroundColor: allInvoices === 1 ? 'rgba(43, 75, 242, 0.2)' : 'rgba(249, 249, 251, 1)', borderRadius: '12px 0 0 12px', fontWeight: 600 }} className="py-3 px-5" onClick={handleAllInvoice}>
                        All Invoices
                    </button>
                    <button style={{ fontSize: 14, backgroundColor: allInvoices === 2 ? 'rgba(43, 75, 242, 0.2)' : 'rgba(249, 249, 251, 1)', borderRadius: '0 0 0 0', fontWeight: 600 }} className="py-3 px-5" onClick={handlePaidInvoice}>
                        Paid Invoices
                    </button>
                    <button style={{ fontSize: 14, backgroundColor: allInvoices === 3 ? 'rgba(43, 75, 242, 0.2)' : 'rgba(249, 249, 251, 1)', borderRadius: '0 12px 12px 0', fontWeight: 600 }} className="py-3 px-5" onClick={handleUnpaidInvoice}>
                        Unpaid Invoices
                    </button>
                </div>
                <div>
                    <BottonWithIcon
                        backgroundColor={'#0C79F7'}
                        icon={addIcon}
                        // width={145}
                        title={'Create Invoice'}
                        height={40}
                        color={'var(--sidebar-text-selected)'}
                        fontSize={16}
                        fontWeight={500}
                        onClick={handleButtonClick}
                    />
                </div>
            </div>
            {loading ? (
                <div className="text-center w-full mx-auto">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {Array.isArray(filteredInvoiceList) && filteredInvoiceList.length > 0 ? (
                        <MemoTable columns={columns} data={filteredInvoiceList} invoiceTableUser={true} />
                    ) : (
                        <NoDataFound
                            title="No Data Found"
                            description="No invoices are available for the selected filter."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default UserInvoice;
