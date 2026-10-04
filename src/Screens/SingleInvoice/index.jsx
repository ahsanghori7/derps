import { useLocation, useNavigate } from "react-router-dom";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import previewEye from "../../assets/previewEye.png";
import { useEffect, useState } from "react";
import { styled } from '@mui/material/styles';
import CustomDatePicker from "../../Components/CustomDatePicker";
import logo4k from "../../assets/logo4k.png";
import website from "../../assets/website.png";
import locationInvoice from "../../assets/locationInvoice.png";
import contactInvoice from "../../assets/contactInvoice.png";
import mailInvoice from "../../assets/mailInvoice.png";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import BottonCustom from "../../Components/ButtonCustom";
import { toast } from "react-toastify";
import { deleteRequest, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import DropdownMenu from "../../Components/dropdownMenu";
import { getTenantPhone, getTenantEmail, getTenantWebsite, getTenantAddress } from "../../Utils/helper";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
});

const ButtonWrapper = styled('div')({
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
});

const SingleInvoice = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const tenantPhone = getTenantPhone(userData);
    const tenantEmail = getTenantEmail(userData);
    const tenantWebsite = getTenantWebsite(userData);
    const tenantAddress = getTenantAddress(userData);
    const [shipTo, setShipTo] = useState("")
    const [billTo, setBillTo] = useState("")
    const [invoiceNo, setInvoiceNo] = useState("")
    const [agentCode, setAgentCode] = useState("")
    const [issueDate, setIssueDate] = useState(null)
    const [dueDate, setDueDate] = useState(null)
    const [totalAmount, setTotalAmount] = useState(0)
    const [subtotal, setSubtotal] = useState(0); // New state for subtotal
    const [taxes, setTaxes] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [status, setStatus] = useState(""); // State to hold selected payment term
    const data = [
        { title: "Paid", value: "paid" },
        { title: "Unpaid", value: "un-paid" },
        { title: "Draft", value: "draft" },
    ];

    const navigate = useNavigate();
    const location = useLocation();
    const invoiceData = location.state?.invoiceData;
    const handleButtonClick = () => {
        navigate('/home/previewInvoice', { state: { invoiceData: invoiceData } });
    };
    // Use invoiceData to populate the form fields if available
    useEffect(() => {
        if (invoiceData) {
            setShipTo(invoiceData?.shippingAddress || "");
            setBillTo(invoiceData?.billingAddress || "");
            setInvoiceNo(invoiceData?.invoiceNumber || "");
            setAgentCode(invoiceData?.agent?.name || "");
            setIssueDate(invoiceData?.issueDate ? new Date(invoiceData?.issueDate) : null);
            setDueDate(invoiceData?.dueDate ? new Date(invoiceData?.dueDate) : null);
            setInvoiceNo(invoiceData?.invoiceNo || "");
            setSubtotal(parseFloat(invoiceData?.subTotal) || 0);
            setTaxes(parseFloat(invoiceData?.tax) || 0);
            setTotalAmount(parseFloat(invoiceData?.totalAmount) || 0);
            setDeliveryFee(parseFloat(invoiceData?.deliveryFee) || 0);
            setStatus(invoiceData?.status || ""); // Set status from API
        }
    }, [invoiceData]);

    const columns = [
        { id: 'inventory.name', label: 'Item', align: 'center' },
        { id: 'inventory.description', label: 'Item Description', align: 'center' },
        { id: 'quantity', label: 'Quantity', align: 'center' },
        { id: 'rate', label: 'Rate', align: 'center' },
        { id: 'amount', label: 'Amount', align: 'center' },
    ];

    const sanitizedLineItems = invoiceData?.lineItems?.map(item => ({
        ...item,
        inventory: item.inventory || { name: '', description: '' }
    })) || [];

    const handleDeleteLead = async () => {
        try {
            const result = await deleteRequest(`${baseURl}invoice/${location.state?.invoiceData?.id}`, accessToken)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        }
    };

    const handleInvoiceStatus = async () => {
        try {
            const apiData = {
                "status": status,
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}invoice/${location?.state?.invoiceData?.id}`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error('Error', error || "Something went wrong");
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -50, backgroundColor: 'var(--dashboard-bg)', }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Invoice'}
                    Fontsize={30}
                />
                <ButtonWrapper>
                    <BottonWithIcon
                        backgroundColor={'#0C79F7'}
                        icon={previewEye}
                        title={'Preview'}
                        height={40}
                        color={'var(--sidebar-text-selected)'}
                        fontSize={16}
                        fontWeight={500}
                        onClick={handleButtonClick}
                    />
                </ButtonWrapper>
            </HeaderWrapper>
            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 30, paddingTop: 40, borderRadius: 14 }} className="m-2 sm:m-8 p-3 pt-4 sm:p-8">
                    <div className="flex justify-between gap-3 flex-wrap-reverse">
                        <div>
                            <div style={{ borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }} className="py-4 px-2 sm:px-7">
                                <div className="flex justify-center">
                                    <img src={logo4k} alt="Tenant logo" className="max-w-44 max-h-14 w-auto h-auto object-contain" />
                                </div>
                                <div className="flex justify-start gap-2 items-start mt-4 w-52">
                                    <img src={locationInvoice} className="w-4 h-5 mt-1" />
                                    <Heading
                                        Fontweight={400}
                                        color={'rgba(0, 0, 0, 1)'}
                                        Heading={tenantAddress}
                                        Fontsize={18}
                                    />
                                </div>
                                <div className="flex justify-start gap-2 items-start mt-3">
                                    <img src={contactInvoice} className="w-4 h-4 mt-1" />
                                    <Heading
                                        Fontweight={400}
                                        color={'rgba(0, 0, 0, 1)'}
                                        Heading={`60007 ${tenantPhone}`}
                                        Fontsize={18}
                                    />
                                </div>
                                <div className="flex justify-start gap-2 items-start mt-3">
                                    <img src={mailInvoice} className="w-5 h-5 mt-1" />
                                    <Heading
                                        Fontweight={400}
                                        color={'rgba(0, 0, 0, 1)'}
                                        Heading={tenantEmail}
                                        Fontsize={18}
                                    />
                                </div>
                                {tenantWebsite ? (
                                <div className="flex justify-start gap-2 items-start mt-3">
                                    <img src={website} className="w-5 h-5 mt-1" />
                                    <Heading
                                        Fontweight={400}
                                        color={'rgba(0, 0, 0, 1)'}
                                        Heading={tenantWebsite}
                                        Fontsize={18}
                                    />
                                </div>
                                ) : null}
                            </div>
                        </div>
                        <div className="">
                            <div className="flex justify-between gap-4 items-center mt-3 flex-wrap md:flex-nowrap">
                              
                                <div className="">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Invoice No'}
                                        Fontsize={16}
                                    />
                                    <input
                                        type="text"
                                        value={invoiceNo}
                                        Disabled={true}
                                        className="mt-1 py-2 px-3 w-52 md:w-64 sm:w-72"
                                        style={{ border: '2px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}
                                    />
                                </div>
                                <div className="">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Agent Name'}
                                        Fontsize={16}
                                    />
                                    <input
                                        type="text"
                                        value={agentCode || '-'}
                                        disabled={true}
                                        className="mt-1 py-2 px-3 w-52 md:w-64 sm:w-72"
                                        style={{ border: '2px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between gap-4 items-center mt-3 flex-wrap md:flex-nowrap">
                               
                                <div className="">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Merchant Name'}
                                        Fontsize={16}
                                    />
                                    <input
                                        type="text"
                                        value={invoiceData?.merchant?.dbaName || '-'}
                                        Disabled={true}
                                        className="mt-1 py-2 px-3 w-52 md:w-64 sm:w-72"
                                        style={{ border: '2px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}
                                    />
                                </div>
                                <div className="">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Status'}
                                        Fontsize={16}
                                    />
                                    <DropdownMenu
                                        menuItems={data.map(term => ({ name: term.title, value: term.value }))}
                                        defaultText={status}
                                        onSelect={(value) => setStatus(value)}
                                        inventory={true}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between gap-4 items-center mt-3 flex-wrap md:flex-nowrap">
                                <div>
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Issue Date'}
                                        Fontsize={16}
                                        mb={4}
                                    />
                                    <CustomDatePicker
                                        value={issueDate}
                                        onChange={setIssueDate}
                                        label="Issue Date"
                                        singleInvoice={true}
                                        disabled={true}
                                    />
                                </div>
                                <div>
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Due Date'}
                                        Fontsize={16}
                                        mb={4}
                                    />
                                    <CustomDatePicker
                                        value={dueDate || '-'}
                                        onChange={setDueDate}
                                        label="Due Date"
                                        singleInvoice={true}
                                        disabled={true}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between gap-4 flex-wrap items-center mt-3">
                                <div>
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Bill To'}
                                        Fontsize={16}
                                    />
                                    <textarea
                                        type="text"
                                        placeholder="Description"
                                        disabled={true}
                                        value={billTo}
                                        onChange={setBillTo}
                                        className={`mt-1 p-3 w-52 md:w-64 sm:w-72`}
                                        rows={4}
                                        style={{ border: '2px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}
                                    />
                                </div>
                                <div>
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Ship to'}
                                        Fontsize={16}
                                    // Tailwind CSS classes
                                    />
                                    <textarea
                                        type="text"
                                        disabled={true}
                                        placeholder="Description"
                                        value={shipTo}
                                        onChange={setShipTo}
                                        className={`mt-1 p-3 w-52 md:w-64 sm:w-72`}
                                        rows={4}
                                        style={{ border: '2px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="mt-8">
                        <AgentTicketListTable
                            columns={columns}
                            data={sanitizedLineItems}
                            subtotal={subtotal ? subtotal : null}
                            taxes={taxes ? taxes : null}
                            deliveryFee={deliveryFee ? deliveryFee : null}
                            invoiceData={totalAmount ? totalAmount : null}
                            PreviewInvoiceQuantity={true}
                            invoiceBottom={true}
                            isMerchantTaxExempt={invoiceData?.merchant?.taxExempt}
                        />
                    </div>
                    <div style={{ display: '' }} className="flex justify-end gap-3 mt-3" >
                        <BottonCustom
                            backgroundColor={''}
                            width={130}
                            title={'Delete'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            className={"bg-red-500"}
                            onClick={handleDeleteLead}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Edit Status'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleInvoiceStatus} // Change onClick to handleDownload
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SingleInvoice;
