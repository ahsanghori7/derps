import Heading from "../../Components/Heading";
import { useEffect, useState, useRef } from "react";
import LabeledInput from "../../Components/LabeledInput";
import DropdownMenu from "../../Components/dropdownMenu";
import BottonCustom from "../../Components/ButtonCustom";
import CustomDatePicker from "../../Components/CustomDatePicker";
import CustomTimePicker from "../../Components/CustomTimePicker";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getTenantPhone, getTenantEmail, getTenantWebsite, getTenantAddress } from "../../Utils/helper";
import { toast } from "react-toastify";
import { baseURl } from "../../Config/systemConfig";
import { getRequestWithOutBody, putRequestWithBodyAndToken, postRequestWithFormData, deleteRequest } from "../../Api/fetch";
import Loader from "../../Components/Loader";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import dayjs from "dayjs";
import logo4k from "../../assets/logo4k.png";
import SignatureModal from "../../Components/SignatureModal";
import UploadFile from "../../Components/UploadFile";
import { SVG } from "../../assets/svg";
import SearchInput from "../../Components/SearchInput";
import { IoIosArrowBack } from "react-icons/io";
import styled from "styled-components";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);
const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10,
    cursor: 'pointer'
});

const TechInstallationEdit = () => {
    const navigate = useNavigate();
    const locationHook = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const tenantLogo = useSelector((state) => state.auth.tenantLogo);
    const logoSrc = tenantLogo || logo4k;
    const userData = useSelector((state) => state.userData.userDetails);
    const showCompanyName = !tenantLogo;
    const tenantName = userData?.tenant?.name || "Company";
    const tenantPhone = getTenantPhone(userData);
    const tenantEmail = getTenantEmail(userData);
    const tenantWebsite = getTenantWebsite(userData);
    const tenantAddress = getTenantAddress(userData);

    const rowData = locationHook.state?.rowData || {};

    const [formDate, setFormDate] = useState(rowData?.date ? dayjs(rowData.date).format("MM/DD/YYYY") : "");
    const [address, setAddress] = useState(rowData?.address || "");
    const [location, setLocation] = useState(rowData?.businessName || rowData?.locationName || rowData?.merchantName || "");
    const [status, setStatus] = useState(rowData?.jobStatus || "");
    const [techVisitPurpose, setTechVisitPurpose] = useState(rowData?.purposeOfVisit || rowData?.techVisitPurpose || "");
    const [loading, setLoading] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [servicePerformed, setServicePerformed] = useState(rowData?.workDescription || rowData?.servicePerformed || "");
    const [notes, setNotes] = useState(rowData?.issuesEncountered || rowData?.notes || "");
    const [hardwareMake, setHardwareMake] = useState(rowData?.hardwareItems?.[0]?.model || rowData?.hardwareMake || "");
    const [serial, setSerial] = useState(rowData?.hardwareItems?.[0]?.serialNo || rowData?.serialNumber || "");
    const [merchantName, setMerchantName] = useState(rowData?.merchantNamePrinted || rowData?.merchantName || "");
    const [hardwareType, setHardwareType] = useState(rowData?.hardwareItems?.[0]?.deviceType || rowData?.hardwareInstallation || "");
    const [customerList, setCustomerList] = useState([]);
    const [showMerchantModal, setShowMerchantModal] = useState(false);
    const [showTechModal, setShowTechModal] = useState(false);
    const [merchantSignature, setMerchantSignature] = useState(rowData?.merchantSignature?.url || rowData?.merchantSign || null);
    const [techSignature, setTechSignature] = useState(rowData?.technicianSignature?.url || rowData?.techSign || null);
    const [visitData, setVisitData] = useState(rowData || {});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [uploadedFile, setUploadedFile] = useState([]);
    const printRef = useRef(null);
    // helper: sleep
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const blobToDataURL = (blob) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    const resolveImageToDataURL = async (src) => {
        try {
            if (!src || typeof src !== "string") return src;
            if (src.startsWith("data:")) return src;

            // PROXY STRATEGY: Route through local /files proxy to avoid CORS
            if (
                src.includes("dev-derps.gotmsolutions.com") ||
                src.includes("/files/")
            ) {
                try {
                    let proxyUrl = src;
                    // If absolute URL, convert to relative path to trigger proxy
                    if (src.startsWith("http")) {
                        const urlObj = new URL(src);
                        proxyUrl = urlObj.pathname + urlObj.search;
                    }

                    const res = await fetch(proxyUrl);
                    if (res.ok) {
                        const blob = await res.blob();
                        return await blobToDataURL(blob);
                    } else {
                    }
                } catch (err) {
                }
            }

            // FALLBACK STRATEGY: Direct CORS fetch with cache busting
            // Only runs if proxy failed or domain didn't match
            const separator = src.includes("?") ? "&" : "?";
            const corsSrc = `${src}${separator}cors_bust=${Date.now()}`;

            const res = await fetch(corsSrc, { mode: "cors" });
            if (!res.ok) {
                return src;
            }
            const blob = await res.blob();
            return await blobToDataURL(blob);
        } catch (e) {
            return src;
        }
    };

    const generatePdf = async (mode /* 'print' | 'download' */) => {
        try {
            const node = printRef.current;
            if (!node) return;

            const logoImgs = Array.from(
                node.querySelectorAll('img[data-role="invoice-logo"]'),
            );
            const prevLogoSrcs = logoImgs.map((img) => img.getAttribute("src") || "");

            const resolvedLogo = await resolveImageToDataURL(logoSrc);
            if (resolvedLogo) {
                logoImgs.forEach((img) => {
                    img.setAttribute("src", resolvedLogo);
                });
                await sleep(500);
            }

            const { jsPDF } = await import("jspdf");
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(node, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                allowTaint: false,
                imageTimeout: 15000,
            });

            // Restore logos immediately after capture
            logoImgs.forEach((img, idx) => {
                img.setAttribute("src", prevLogoSrcs[idx] || "");
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "pt", "a4");
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            const imgW = pageW;
            const imgH = (canvas.height * imgW) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH, undefined, "FAST");

            const fileName = `tech-installation-${dayjs(formDate).format("YYYY-MM-DD")}.pdf`;

            if (mode === "download") {
                pdf.save(fileName);
            } else {
                // open in a new tab and trigger print
                const blob = pdf.output("blob");
                const url = URL.createObjectURL(blob);
                const w = window.open(url);
                // give the new tab a breath to load before printing
                setTimeout(() => {
                    try { w?.print(); } catch { }
                }, 400);
            }
        } catch (e) {
            toast.error("Could not generate PDF.");
        }
    };

    // Helper: render signature preview for typed, URL/dataURL, or File
    const renderSignature = (sig) => {
        if (!sig) return (
            <div className="flex items-center gap-x-2">
                <SVG.Signature />
                <span className="text-gray-500">Signature</span>
            </div>
        );
        if (typeof sig === 'string' && sig.startsWith('typed:')) {
            return <span className="font-[cursive] text-xl">{sig.replace('typed:', '')}</span>;
        }
        if (sig instanceof File) {
            const url = URL.createObjectURL(sig);
            return <img src={url} alt="Signature" className="h-full object-contain" />;
        }
        if (typeof sig === 'string') {
            return <img src={sig} alt="Signature" className="h-full object-contain" />;
        }
        return null;
    };

    // Signature renderer for the PDF area
    const PrintSignature = ({ sig, label }) => {
        if (!sig) return <span className="text-gray-500">{label}</span>;
        if (typeof sig === "string" && sig.startsWith("typed:")) {
            return <span style={{ fontFamily: "cursive", fontSize: 18 }}>{sig.replace("typed:", "")}</span>;
        }
        return <img src={sig} alt={label} style={{ maxHeight: 40, objectFit: "contain" }} />;
    };

    /* ========= Small field component ========= */
    function Field({ label, value, span = 1 }) {
        return (
            <div style={{
                gridColumn: `span ${span} / span ${span}`,
                minHeight: 28,
                border: "0.7px solid #D6D6D6",
                borderRadius: 2,
                // background: "#f8fafc",
                padding: "0px 10px",
                display: "flex",
                // alignItems: "center",
                flexDirection: "column",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
            }}>
                <div style={{ fontSize: 8, fontWeight: 500, color: "#222222", }}>{label}</div>
                <div style={{
                    fontWeight: 500,
                    fontSize: 8,
                    marginBottom: 10,
                    color: "#3E3E3EB2",
                }}>
                    {value}
                </div>
            </div>
        );
    }

    // Helper: convert dataURL string to Blob
    const dataUrlToBlob = async (dataUrl) => {
        const res = await fetch(dataUrl);
        return await res.blob();
    };

    // Helper: ensure a signature is uploaded if needed; returns a string URL or typed value
    const ensureSignatureUrl = async (sig, originalSig = null) => {
        if (!sig) return null;

        // Case 1: typed signature
        if (typeof sig === "string" && sig.startsWith("typed:")) return sig;

        // Case 2: already hosted URL
        if (typeof sig === "string" && (sig.startsWith("http://") || sig.startsWith("https://"))) {
            if (originalSig && sig === originalSig) return sig; // unchanged
            return sig;
        }

        let fileToUpload = null;

        // Case 3: uploaded file
        if (sig instanceof File) {
            fileToUpload = sig;
        }
        // Case 4: drawn signature (dataURL)
        else if (typeof sig === "string" && sig.startsWith("data:")) {
            const blob = await dataUrlToBlob(sig);
            fileToUpload = new File([blob], "signature.png", { type: blob.type || "image/png" });
        }
        // Case 5: blob URL from URL.createObjectURL
        else if (typeof sig === "string" && sig.startsWith("blob:")) {
            const blob = await fetch(sig).then((res) => res.blob());
            fileToUpload = new File([blob], "signature.png", { type: blob.type || "image/png" });
        }

        // Upload only if file exists and is an image
        if (fileToUpload && fileToUpload.type.startsWith("image/")) {
            const formData = new FormData();
            formData.append("file", fileToUpload);
            formData.append("type", "tech-installation");

            const result = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

            // ⚠️ Important: check your API response field here
            // Sometimes it's `dLFileUrl.url`, sometimes `fileUrl.url`
            return (
                result?.data?.dLFileUrl?.url ||
                result?.data?.fileUrl?.url ||
                sig
            );
        }

        return sig;
    };

    const statusOptions = [
        { id: "Pending", name: "Pending" },
        { id: "In Progress", name: "In Progress" },
        { id: "Completed", name: "Completed" }
    ];

    const fetchData2 = () => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}item-services`, accessToken
        )
            .then(result => {
                setItemServicesList(result?.data)
                getRequestWithOutBody(
                    `${baseURl}customer`, accessToken
                )
                    .then(result => {

                        const customerData = Array.isArray(result?.data)
                            ? result.data
                            : Array.isArray(result?.data?.data)
                                ? result.data.data
                                : [];

                        setCustomerList(customerData);
                        setLoading(false);
                    })
                    .catch(error => {
                        setLoading(false)
                    })
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData2()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (visitData?.id) {
            setLoading(true);
            getRequestWithOutBody(`${baseURl}site-visits/${visitData.id}`, accessToken)
                .then((result) => {
                    if (result?.data) setVisitData(result.data);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visitData?.id, accessToken])

    useEffect(() => {
        if (visitData?.timeIn) {
            const parsedStart = dayjs(visitData.timeIn, ["HH:mm:ss", "HH:mm"], true);
            setStartTime(parsedStart.isValid() ? parsedStart : null);
        } else {
            setStartTime(null);
        }

        if (visitData?.timeOut) {
            const parsedEnd = dayjs(visitData.timeOut, ["HH:mm:ss", "HH:mm"], true);
            setEndTime(parsedEnd.isValid() ? parsedEnd : null);
        } else {
            setEndTime(null);
        }
    }, [visitData]);

    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setFormDate(formattedDate);
    };
    const handleAddressChange = (e) => setAddress(e.target.value);
    const handleTechVisitPurposeChange = (e) => setTechVisitPurpose(e.target.value);

    const handleLocationChange = (selectedState) => {
        const selectedValue =
            typeof selectedState === "string"
                ? selectedState
                : selectedState?.name || selectedState?.dbaName || "";

        setLocation(selectedValue);

        const selectedCustomer = Array.isArray(customerList)
            ? customerList.find((customer) => customer?.dbaName === selectedValue)
            : null;

        if (selectedCustomer) {
            setMerchantName(selectedCustomer?.dbaName || "");
            setAddress(selectedCustomer?.dbaAddress || "");
        }
    };

    const handleHardwareTypeChange = (selectedState) => setHardwareType(selectedState);
    const handleStatusChange = (selectedState) => setStatus(selectedState);
    const handleNotesChange = (e) => setNotes(e.target.value);
    const handleHardwareMakeChange = (e) => setHardwareMake(e.target.value);
    const handleSerialChange = (e) => setSerial(e.target.value);
    const handleMerchantNameChange = (e) => setMerchantName(e.target.value);
    const handleServicePerformedChange = (e) => setServicePerformed(e.target.value);

    const handleGoBack = () => navigate(-1);

    const toKebab = (val) => (val || '').toString().toLowerCase().replace(/\s+/g, '-');

    const handleSave = async () => {
        if (!formDate || !startTime || !endTime || !location || !address || !techVisitPurpose || !hardwareType || !servicePerformed || !status || !merchantName) {
            toast.error("Please fill all required fields");
            return;
        }

        const year = dayjs(formDate).year();
        if (year < 1900 || year > 2100) {
            toast.error("Please select a valid date.");
            return;
        }

        const formattedDate = dayjs(formDate).format("YYYY-MM-DD");
        const formattedTimeIn = startTime?.format ? startTime.format("HH:mm") : startTime;
        const formattedTimeOut = endTime?.format ? endTime.format("HH:mm") : endTime;

        const selectedCustomer = Array.isArray(customerList)
            ? customerList.find((c) => c?.dbaName === location) || { id: visitData?.storeId }
            : { id: visitData?.storeId };
        const storeId = selectedCustomer?.id || visitData?.storeId || null;

        if (!storeId) {
            toast.error("Selected location is invalid");
            return;
        }

        const normalizedMerchantUrl = await ensureSignatureUrl(merchantSignature, visitData?.merchantSignature?.url || null);
        const normalizedTechUrl = await ensureSignatureUrl(techSignature, visitData?.technicianSignature?.url || null);

        const normalizeSignature = (url, existing) => {
            if (!url) return null;
            return {
                url,
                mimetype: 'image/png',
                originalname: existing?.originalname || 'signature.png',
            };
        };

        const existingItems = Array.isArray(visitData?.hardwareItems) ? visitData.hardwareItems : [];
        const firstExisting = existingItems[0] || {};
        const updatedFirst = {
            ...firstExisting,
            deviceType: hardwareType || firstExisting.deviceType || null,
            model: hardwareMake || firstExisting.model || null,
            serialNo: serial || firstExisting.serialNo || null,
        };
        const hardwareItems = [updatedFirst, ...existingItems.slice(1)];

        const rest = Object.fromEntries(Object.entries(visitData || {}).filter(([key]) => key !== 'id'));
        const payload = {
            ...rest,
            storeId,
            date: formattedDate,
            priority: visitData?.priority || 'urgent',
            businessName: location,
            address,
            merchantContactNumber: visitData?.merchantContactNumber || null,
            contactPhone: visitData?.contactPhone || null,
            visitTypes: visitData?.visitTypes || [],
            otherVisitTypeDescription: visitData?.otherVisitTypeDescription || null,
            purposeOfVisit: techVisitPurpose,
            inventoryItems: visitData?.inventoryItems || [],
            technicianId: visitData?.technicianId || userData?.id || null,
            technicianBadgeNo: visitData?.technicianBadgeNo || null,
            timeIn: formattedTimeIn,
            timeOut: formattedTimeOut,
            hardwareItems,
            workDescription: servicePerformed,
            issuesEncountered: notes,
            followUpRequired: toKebab(status) === 'follow-up',
            jobStatus: toKebab(status),
            followUpNotes: visitData?.followUpNotes || null,
            targetFollowUpDate: visitData?.targetFollowUpDate || null,
            photos: visitData?.photos || [],
            equipmentAccountedFor: typeof visitData?.equipmentAccountedFor === 'boolean' ? visitData.equipmentAccountedFor : true,
            merchantNamePrinted: merchantName,
            merchantSignature: normalizeSignature(normalizedMerchantUrl, visitData?.merchantSignature),
            technicianSignature: normalizeSignature(normalizedTechUrl, visitData?.technicianSignature),
            currentStep: 9,
            submit: true,
        };

        setLoading(true);
        try {
            const result = await putRequestWithBodyAndToken(`${baseURl}site-visits/${visitData?.id}`, accessToken, payload);
            toast.success(result?.message || "Updated successfully");
            navigate(-1);
        } catch (error) {
            toast.error(error?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        if (!visitData?.id) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        try {
            await deleteRequest(`${baseURl}site-visits/${visitData.id}`, accessToken);
            toast.success("Deleted successfully");
            setShowDeleteModal(false);
            navigate(-1);
        } catch (error) {
            toast.error(error?.message || "Delete failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <div className="flex items-center gap-2" onClick={handleGoBack}>
                    <IoIosArrowBack size={20} color="var(--sidebar-text-primary)" />
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Edit Tech Installation'}
                        Fontsize={24}
                    />
                </div>
            </HeaderWrapper>
            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 5, paddingTop: 15, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-2 m-2">
                    {loading ? (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-start">
                                {showCompanyName ? (
                                    <div
                                        style={{
                                            color: 'var(--navbar-text)',
                                            maxWidth: '160px',
                                            lineHeight: '1.2',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                                            {tenantName.split(' ').slice(0, 2).join(' ')}
                                        </span>
                                        {tenantName.split(' ').length > 2 && (
                                            <div style={{ fontSize: '12px', fontWeight: 500 }}>
                                                {tenantName.split(' ').slice(2).join(' ')}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <img
                                        src={logoSrc}
                                        alt="Tenant logo"
                                        className="max-w-56 max-h-20 w-auto h-auto object-contain object-left"
                                        data-role="invoice-logo"
                                    />
                                )}
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Date'} Fontsize={16} required={true} />
                                    </div>
                                    <CustomDatePicker value={formDate} onChange={setFormDate} bussiness={true} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Time In/Out'} Fontsize={16} required={true} />
                                    </div>
                                    <div className="flex items-center gap-x-8 flex-wrap">
                                        <CustomTimePicker innerLabel="In" value={startTime} techInstallation={true} onChange={(v) => setStartTime(v)} />
                                        <CustomTimePicker innerLabel="Out" value={endTime} techInstallation={true} onChange={(v) => setEndTime(v)} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Location Name'} Fontsize={16} required={true} />
                                    </div>
                                    <SearchInput
                                        selectedValue={location}
                                        suggestions={
                                            Array.isArray(customerList)
                                                ? customerList
                                                    .map((c) => ({ name: c?.dbaName }))
                                                    .filter((item) => item?.name)
                                                : []
                                        }
                                        onSelect={handleLocationChange}
                                        techInstallation={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Address'} Fontsize={16} required={true} />
                                    </div>
                                    <LabeledInput inputPlaceholder="Type address" inputValue={address} onInputChange={handleAddressChange} bussiness={true} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Tech Visit Purpose'} Fontsize={16} required={true} />
                                    </div>
                                    <LabeledInput inputPlaceholder="Type Tech Visit Purpose" inputValue={techVisitPurpose} onInputChange={handleTechVisitPurposeChange} bussiness={true} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Hardware Installation'} Fontsize={16} required={true} />
                                    </div>
                                    <DropdownMenu menuItems={itemServicesList} businessType={true} defaultText={"Select Hardware"} onSelect={handleHardwareTypeChange} selectedValue={hardwareType} />
                                </div>

                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Service Performed'} Fontsize={16} required={true} />
                                    </div>
                                    <LabeledInput inputPlaceholder="Type Service Performed" inputValue={servicePerformed} onInputChange={handleServicePerformedChange} bussiness={true} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Notes'} Fontsize={16} />
                                    </div>
                                    <LabeledInput inputPlaceholder="Notes" inputValue={notes} onInputChange={handleNotesChange} bussiness={true} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Hardware Make'} Fontsize={16} required={true} />
                                    </div>
                                    <LabeledInput inputPlaceholder="Hardware Make" inputValue={hardwareMake} onInputChange={handleHardwareMakeChange} bussiness={true} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Serial#'} Fontsize={16} required={true} />
                                    </div>
                                    <LabeledInput inputPlaceholder="Serial#" inputValue={serial} onInputChange={handleSerialChange} bussiness={true} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Job Status'} Fontsize={16} required={true} />
                                    </div>
                                    <DropdownMenu menuItems={statusOptions} businessType={true} defaultText={"Select Status"} onSelect={handleStatusChange} selectedValue={status} />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Merchant Name'} Fontsize={16} required={true} />
                                    </div>
                                    <LabeledInput inputPlaceholder="Merchant Name" inputValue={merchantName} onInputChange={handleMerchantNameChange} bussiness={true} />
                                </div>
                            </div>

                            {/* Merchant Sign */}
                            <div className="flex items-start gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Merchant Sign"} Fontsize={16} mt={8} />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            backgroundColor: "var(--dashboard-tab-box)",
                                            border: "1px solid rgba(100, 153, 255, 1)",
                                            borderRadius: 8,
                                        }}
                                        className="h-20 w-44 sm:w-80 mt-2 flex flex-col items-center justify-center cursor-pointer"
                                        onClick={() => setShowMerchantModal(true)}
                                    >
                                        {renderSignature(merchantSignature)}
                                    </div>
                                </div>
                            </div>

                            {/* Tech Sign */}
                            <div className="flex items-start gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Tech Sign"} Fontsize={16} mt={8} />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            backgroundColor: "var(--dashboard-tab-box)",
                                            border: "1px solid rgba(100, 153, 255, 1)",
                                            borderRadius: 8,
                                        }}
                                        className="h-20 w-44 sm:w-80 mt-2 flex flex-col items-center justify-center cursor-pointer"
                                        onClick={() => setShowTechModal(true)}
                                    >
                                        {renderSignature(techSignature)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#24282E', borderRadius: 14 }} className="flex flex-wrap justify-between items-center py-1 px-2 mt-10 gap-3" >
                                <BottonCustom
                                    backgroundColor={'#D0D0D0'}
                                    width={130}
                                    title={'Back'}
                                    height={40}
                                    color={'black'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleGoBack}
                                />
                                <BottonCustom
                                    backgroundColor={'#D92D20'}
                                    width={130}
                                    title={'Delete'}
                                    height={40}
                                    color={'white'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleDelete}
                                />
                                <div className="flex flex-col items-center">
                                    <Heading Fontweight={500} color={'#FFFFFF'} Heading={'Invoice will be Emailed'} Fontsize={16} />
                                    <Heading Fontweight={700} color={'#0C79F7'} Heading={'Thankyou for your business'} Fontsize={18} />
                                </div>
                                <BottonCustom
                                    backgroundColor={'rgba(67, 121, 238, 1)'}
                                    width={130}
                                    title={'Update'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleSave}
                                />
                                <BottonCustom
                                    backgroundColor={'#6CC1E7'}
                                    width={150}
                                    title={'Download PDF'}
                                    height={40}
                                    color={'white'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={() => generatePdf('download')}
                                />
                            </div>

                            <SignatureModal showSignatureModal={showMerchantModal} setShowSignatureModal={setShowMerchantModal} setSignatureDataUrl={setMerchantSignature} />
                            <SignatureModal showSignatureModal={showTechModal} setShowSignatureModal={setShowTechModal} setSignatureDataUrl={setTechSignature} />

                            <DeleteConfirmationModal
                                open={showDeleteModal}
                                title="Delete Site Visit"
                                subtitle="Are you sure you want to delete this site visit?"
                                entityName=""
                                warningMessage="This action cannot be undone."
                                onCancel={() => setShowDeleteModal(false)}
                                onDelete={confirmDelete}
                                isLoading={loading}
                            />

                            {/* ===== Printable A4 layout (hidden) ===== */}
                            {/* ===== PRINTABLE A4 (exact design) ===== */}
                            <div
                                ref={printRef}
                                style={{
                                    width: 608,               // A4 portrait @ ~96dpi
                                    minHeight: 588,
                                    background: "#FFFFFF",    // light gray page bg
                                    // padding: 16,
                                    position: "absolute",
                                    left: -99999, top: 0
                                }}
                            >
                                {/* CARD */}
                                <div style={{ background: "#ffffff", overflow: "hidden", }}>
                                    {/* Top strip */}
                                    <div style={{ height: 17, background: "#6CC1E7" }} />

                                    {/* Header */}
                                    <div
                                        style={{
                                            padding: "18px 10px 8px 22px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            position: "relative",
                                        }}
                                    >
                                        {/* Logo on the left */}
                                        {showCompanyName ? (
                                            <div
                                                style={{
                                                    fontSize: 16,
                                                    fontWeight: "bold",
                                                    color: "#202224",
                                                    position: "absolute",
                                                    left: 22,
                                                    maxWidth: 150,
                                                    // wordWrap: "break-word",
                                                    // overflowWrap: "break-word",
                                                    whiteSpace: "normal",
                                                    lineHeight: "1.2",
                                                    // display: "flex",
                                                    alignItems: "center",
                                                    maxHeight: 32
                                                }}
                                                data-role="invoice-logo"
                                            >
                                                <span style={{ fontSize: '16px', fontWeight: 700 }}>
                                                    {tenantName.split(' ').slice(0, 2).join(' ')}
                                                </span>
                                                {tenantName.split(' ').length > 2 && (
                                                    <div style={{ fontSize: '12px', fontWeight: 500 }}>
                                                        {tenantName.split(' ').slice(2).join(' ')}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <img
                                                src={logoSrc}
                                                alt="Logo"
                                                style={{
                                                    maxWidth: 97,
                                                    maxHeight: 32,
                                                    width: "auto",
                                                    height: "auto",
                                                    objectFit: "contain",
                                                    position: "absolute",
                                                    left: 22,
                                                }}
                                                data-role="invoice-logo"
                                            />
                                        )}

                                        {/* Centered text */}
                                        <div style={{ fontSize: 18, fontWeight: 600, color: "#202224" }}>
                                            Tech Installation
                                        </div>
                                    </div>


                                    {/* Section: Visit Details */}
                                    <div style={{ padding: "14px 22px 6px" }}>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 10, borderBottom: "1px solid #2222224D", paddingBottom: 10 }}>Visit Details</div>

                                        {/* 4-up row */}
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                                            <Field label="Date" value={formDate || "-"} />
                                            <Field label="Time In:" value={startTime?.format ? startTime.format("hh:mm A") : (startTime || "-")} />
                                            <Field label="Time Out:" value={endTime?.format ? endTime.format("hh:mm A") : (endTime || "-")} />
                                            <Field label="Location Name:" value={location || "-"} />
                                        </div>

                                        {/* 2-up row */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                                            <Field label="Address" value={address || "-"} />
                                            <Field label="Tech Visit Purpose:" value={techVisitPurpose || "-"} />
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    {/* <div style={{ borderTop: "1px solid #e5e7eb" }} /> */}

                                    {/* Section: Service Details */}
                                    <div style={{ padding: "14px 22px 6px", }}>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 10, borderBottom: "1px solid #2222224D", paddingBottom: 10 }}>Service Details</div>

                                        {/* 3-up row */}
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                                            <Field label="Hardware Installation:" value={hardwareType || "-"} />
                                            <Field label="Hardware Make:" value={hardwareMake || "-"} />
                                            <Field label="Serial#:" value={serial || "-"} />
                                        </div>

                                        {/* 3-up row: left = Service Performed, middle+right = Notes */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                                            <Field label="Service Performed:" value={servicePerformed || "-"} />
                                            <Field label="Notes:" value={notes || "-"} span={2} />
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    {/* <div style={{ borderTop: "1px solid #e5e7eb" }} /> */}

                                    {/* Section: Merchant & Technician */}
                                    <div style={{ padding: "14px 22px 18px" }}>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 10, borderBottom: "1px solid #2222224D", paddingBottom: 10 }}>Merchant & Technician</div>

                                        {/* Row: Merchant Name (box) */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                                            <Field label="Merchant Name:" value={merchantName || "-"} />
                                            <Field label="Date" value={formDate || "-"} />
                                            {/* </div> */}

                                            {/* Row: Signatures */}
                                            {/* <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 10 }}> */}
                                            {/* Merchant Sign */}
                                            <div>
                                                <div style={{ fontSize: 8, fontWeight: 500, color: "#222222", }}>Merchant Sign:</div>
                                                <div style={{
                                                    height: 40,
                                                    borderBottom: "0.7px solid #D6D6D6",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    // padding: "4px 6px"
                                                }}>
                                                    <PrintSignature sig={merchantSignature} label="Signature" />
                                                </div>
                                            </div>

                                            {/* Tech Sign */}
                                            <div>
                                                <div style={{ fontSize: 8, fontWeight: 500, color: "#222222", }}>Tech Sign:</div>
                                                <div style={{
                                                    height: 40,
                                                    borderBottom: "0.7px solid #D6D6D6",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    // padding: "4px 6px"
                                                }}>
                                                    <PrintSignature sig={techSignature} label="Signature" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer bar (blue) */}
                                    <div style={{ background: "#6CC1E7", color: "#fff", marginTop: 40 }}>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            padding: "4px 14px",
                                            fontSize: 8,
                                            color: '#222222'
                                        }}>
                                            <span className="mb-1.5">📍 {tenantAddress}</span>
                                            <span className="mb-1.5">☎️ Direct: {tenantPhone}</span>
                                            <span className="mb-1.5">✉️ {tenantEmail}</span>
                                            {tenantWebsite ? (
                                            <span className="mb-1.5">🌐 {tenantWebsite}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TechInstallationEdit;
