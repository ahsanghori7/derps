import { useState, useEffect, Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Dialog, Transition } from "@headlessui/react";
import { IoIosArrowBack } from "react-icons/io";
import Heading from "../../Components/Heading";
import LabeledInput from "../../Components/LabeledInput";
import DropdownMenu from "../../Components/dropdownMenu";
import BottonCustom from "../../Components/ButtonCustom";
// import UploadFile from "../../Components/UploadFile";
import Spinner from "../../Components/Spinner";
import { generateShippingLabel, getFedexErrorToast } from "../../Api/FedExApi";
import PrintPreview from "./PrintPreview";

// Import b-PAC SDK
import * as bpac from './assets/bpac.js';

// Helper function to convert base64 data URI to PNG format (for display)
const convertBase64ToPNG = (base64DataUri) => {
    return new Promise((resolve, reject) => {
        try {
            // Create an image element
            const img = new Image();
            
            img.onload = () => {
                // Create a canvas element
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw the image onto the canvas
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Convert canvas to PNG data URI
                const pngDataUri = canvas.toDataURL('image/png');
                resolve(pngDataUri);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image from base64 data'));
            };
            
            // Set the image source to the base64 data URI
            img.src = base64DataUri;
        } catch (error) {
            reject(error);
        }
    });
};

// Helper function to convert base64 data URI to a temporary PNG file path for b-PAC
// b-PAC requires a file path, not a data URI
const convertBase64ToPNGFile = async (base64DataUri, applicationId) => {
    try {
        // Extract base64 string from data URI
        const base64String = base64DataUri.includes(',') 
            ? base64DataUri.split(',')[1] 
            : base64DataUri;
        
        // Convert base64 to binary
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create a Blob from the binary data
        const blob = new Blob([bytes], { type: 'image/png' });
        
        // Create a temporary file path (b-PAC needs a file path, not a data URI)
        // Use a temp directory that b-PAC can access (same structure as TEMPLATE_FOLDER)
        const tempDir = "C:\\DMS\\Temp\\";
        const fileName = `fedex_label_application_${applicationId}.png`;
        const filePath = tempDir + fileName;
        
        // Prompt user to save the file to the temp directory
        if ('showSaveFilePicker' in window) {
            // Show alert asking user to save to temp directory
            const userConfirmed = window.confirm(
                `Please save the label image to the following directory:\n\n${tempDir}\n\n` +
                `Click OK to open the file save dialog. Make sure to navigate to and save the file in the temp directory above.`
            );
            
            if (userConfirmed) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'PNG Image',
                            accept: { 'image/png': ['.png'] }
                        }]
                    });
                    
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                    // Show reminder about the path
                    alert(`File saved successfully!\n\nPlease ensure the file is saved at:\n${filePath}\n\n` +
                          `If you saved it elsewhere, please move it to the temp directory for b-PAC to work correctly.`);
                    
                    return filePath;
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        alert(`Error saving file: ${err.message}`);
                    }
                    // User cancelled - continue with fallback
                }
            }
        }
        
        // Fallback: Download the file and show instructions
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show alert with instructions
        alert(
            `File download started.\n\n` +
            `IMPORTANT: Please save/move the downloaded file "${fileName}" to:\n\n${tempDir}\n\n` +
            `b-PAC requires the file to be at this exact path for the label to work correctly.`
        );
        
        return filePath;
    } catch (error) {
        alert(`Error preparing label image file: ${error.message}`);
        throw error;
    }
};

const LabelPrint = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const application = location.state?.application || {};

    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [merchantId, setMerchantId] = useState(application?.applicationId || "");
    const [businessName, setBusinessName] = useState(application?.businessName || "");
    const [deviceType, setDeviceType] = useState("QL-500");
    const [serialNumber, setSerialNumber] = useState("U61050D9Z638183");
    // eslint-disable-next-line no-unused-vars
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [extensionInstalled, setExtensionInstalled] = useState(false);
    
    // FedEx Label states
    const [labelImage, setLabelImage] = useState(null);
    const [labelImagePath, setLabelImagePath] = useState(null); // File path for b-PAC
    const [labelLoading, setLabelLoading] = useState(false);
    const [labelError, setLabelError] = useState(null);
    const [trackingNumber, setTrackingNumber] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false); // Modal for saving label image
    const [printLoading, setPrintLoading] = useState(false); // Loading state for print operation
    
    // Get access token
    const accessToken = useSelector((state) => state.auth.accessToken) || localStorage.getItem('accessToken');

    // Template folder path - adjust this based on where templates will be deployed
    const TEMPLATE_FOLDER = "C:\\DMS\\Templates\\";

    const templateOptions = [
        {
            id: "DMS Dejavoo TSYS Label",
            title: "DMS Dejavoo TSYS Label",
            fileName: "DMS Dejavoo TSYS Label.lbx",
        },
        {
            id: "DMS N5 TSYS Label",
            title: "DMS N5 TSYS Label",
            fileName: "DMS N5 TSYS Label.lbx",
        },
        {
            id: "DMS PAX Label",
            title: "DMS PAX Label",
            fileName: "DMS PAX Label.lbx",
        },
        {
            id: "DMS Verifone Label",
            title: "DMS Verifone Label",
            fileName: "DMS Verifone Label.lbx",
        },
    ];

    // Generate FedEx label on component mount or reuse existing one
    useEffect(() => {
        const loadOrGenerateLabel = async () => {
            if (!accessToken) {
                return;
            }

            // Get application ID from application data
            const applicationId = application?.applicationId || application?.id || merchantId;
            // const applicationId = 491;
            
            if (!applicationId) {
                setLabelError("Application ID is required to generate label");
                setLabelLoading(false);
                return;
            }

            // Check if label file already exists for this application
            const tempDir = "C:\\DMS\\Temp\\";
            const fileName = `fedex_label_application_${applicationId}.png`;
            const filePath = tempDir + fileName;
            
            // Check localStorage to see if this label was previously saved
            const savedLabelKey = `fedex_label_saved_application_${applicationId}`;
            const savedImageDataKey = `fedex_label_image_application_${applicationId}`;
            const savedTrackingKey = `fedex_label_tracking_application_${applicationId}`;
            const isLabelSaved = localStorage.getItem(savedLabelKey) === 'true';
            
            if (isLabelSaved) {
                // Label was saved before, reuse it
                setLabelImagePath(filePath);
                
                // Try to load saved image data from localStorage for preview
                const savedImageData = localStorage.getItem(savedImageDataKey);
                if (savedImageData) {
                    setLabelImage(savedImageData);
                }
                
                // Load saved tracking number if available
                const savedTrackingNumber = localStorage.getItem(savedTrackingKey);
                if (savedTrackingNumber) {
                    setTrackingNumber(savedTrackingNumber);
                }
                
                setLabelLoading(false);
                setLabelError(null);
                return;
            }

            // Label doesn't exist, generate new one
            setLabelLoading(true);
            setLabelError(null);

            try {
                const response = await generateShippingLabel(accessToken, applicationId);
                
                if (response?.labelImage) {
                    // Convert base64 data URI to PNG format on the fly (for display)
                    const pngImage = await convertBase64ToPNG(response.labelImage);
                    setLabelImage(pngImage);
                    // Show modal to save file (b-PAC requires file path)
                    setShowSaveModal(true);
                    setTrackingNumber(response.trackingNumber || null);
                } else {
                    throw new Error("No label image in response");
                }
            } catch (error) {
                setLabelError(getFedexErrorToast(error, "Failed to generate shipping label"));
            } finally {
                setLabelLoading(false);
            }
        };

        loadOrGenerateLabel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, application]);

    // Render template preview using b-PAC with the current FedEx label image
    // Only proceed if file is saved (labelImagePath exists)
    useEffect(() => {
        const generateTemplatePreview = async () => {
            // Block preview until file is saved - b-PAC needs file path
            if (!selectedTemplate || !labelImage || !labelImagePath) {
                setPreviewImage(null);
                return;
            }

            const selectedTemplateOption = templateOptions.find(
                (template) => template.id === selectedTemplate
            );
            const templateFileName = selectedTemplateOption?.fileName || selectedTemplate;

            if (!bpac.IsExtensionInstalled()) {
                setLabelError("Brother b-PAC Extension is not installed");
                return;
            }

            const templatePath = TEMPLATE_FOLDER + templateFileName;
            const objDoc = bpac.IDocument;

            const safeSetText = async (name, value) => {
                try {
                    const obj = await objDoc.GetObject(name);
                    if (obj) {
                        obj.Text = value ?? "";
                    }
                } catch (e) {
                }
            };

            try {
                setPreviewLoading(true);
                setLabelError(null);
                const opened = await objDoc.Open(templatePath);
                if (!opened) {
                    throw new Error("Failed to open template for preview");
                }

                // Get all objects in the document and log them // TODO
                try {
                    const objects = await objDoc.Objects;
                    const count = await objects.Count;
                    
                    
                    const allObjects = [];
                    for (let i = 0; i < count; i++) {
                        try {
                            const obj = await objects.GetItem(i);
                            if (obj) {
                                const objName = await obj.Name;
                                const objType = await obj.Type;
                                const objText = await obj.Text;
                                const objInfo = {
                                    index: i,
                                    name: objName,
                                    type: objType,
                                    text: objText,
                                    x: await obj.X,
                                    y: await obj.Y,
                                    width: await obj.Width,
                                    height: await obj.Height
                                };
                                allObjects.push(objInfo);
                            }
                        } catch (e) {
                        }
                    }
                    
                } catch (e) {
                } // TODO

                // Bind dynamic fields
                await safeSetText("objMerchantId", merchantId);
                await safeSetText("objBusinessName", businessName);
                await safeSetText("objDeviceType", deviceType);
                await safeSetText("objSerialNumber", serialNumber);

                // Attempt to inject FedEx label image into an Image object named "objFedExLabel"
                // b-PAC requires a file path, not a data URI
                try {
                    const imgObj = await objDoc.GetObject("objFedExLabel");
                    if (imgObj) {
                        // Prefer file path if available (b-PAC works best with file paths)
                        let imageSource = labelImagePath;
                        
                        // If no file path exists, we need to save the file first
                        // But we can't trigger file save dialog from useEffect, so we'll try base64 as fallback
                        if (!imageSource && labelImage) {
                            // Try to extract base64 string from data URI (remove data:image/png;base64, prefix)
                            if (labelImage.startsWith('data:')) {
                                imageSource = labelImage.split(',')[1]; // Just the base64 stringe will be prompted when you interact with the preview.');
                            } else {
                                imageSource = labelImage;
                            }
                        }

                        
                        if (imageSource) {
                            if (typeof imgObj.SetData === "function") {
                                // SetData expects: (type, filePath, option)
                                // type: 0 for image, filePath: string path to file, option: 4 for PNG
                                await imgObj.SetData(0, imageSource, 4);
                            } else if ("Picture" in imgObj) {
                                imgObj.Picture = imageSource;
                            } else if ("TextFile" in imgObj) {
                                imgObj.TextFile = imageSource;
                            }
                        } else {
                            setLabelError("Label image is not available. Please regenerate the label.");
                        }
                    }
                } catch (e) {
                    if (!labelImagePath) {
                        setLabelError("b-PAC requires a file path. Please save the label image file first.");
                    } else {
                    }
                }

                // Export preview as PNG (data URL)
                const imageType = 4; // PNG image type constant
                const width = 800;
                const height = 800;
                const previewData = await objDoc.GetImageData(imageType, width, height);

                if (!previewData) {
                    throw new Error("Preview render returned empty image");
                }

                const dataUrl = previewData.startsWith("data:")
                    ? previewData
                    : `data:image/png;base64,${previewData}`;
                setPreviewImage(dataUrl);
            } catch (error) {
                setLabelError(error.message || "Failed to render preview");
                setPreviewImage(null);
            } finally {
                try {
                    await objDoc.Close();
                } catch (e) {
                }
                setPreviewLoading(false);
            }
        };

        generateTemplatePreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemplate, labelImage, labelImagePath, merchantId, businessName, deviceType, serialNumber]);

    // Check if b-PAC extension is installed
    useEffect(() => {
        const checkExtension = () => {
            const isInstalled = bpac.IsExtensionInstalled();
            setExtensionInstalled(isInstalled);
            if (!isInstalled) {
            }
        };
        
        // Check immediately and after a delay (extension might load asynchronously)
        checkExtension();
        const timer = setTimeout(checkExtension, 1000);
        
        return () => clearTimeout(timer);
    }, []);

    const handleBackToDeployment = () => {
        navigate(-1);
    };

    // Function to save label image file (requires user interaction)
    const handleSaveLabelImage = async () => {
        if (!labelImage) {
            alert("No label image available to save. Please wait for the label to be generated.");
            return;
        }

        // Get application ID
        const applicationId = application?.applicationId || application?.id || merchantId;
        if (!applicationId) {
            alert("Application ID is required to save label.");
            return;
        }

        try {
            const filePath = await convertBase64ToPNGFile(labelImage, applicationId);
            setLabelImagePath(filePath);
            
            // Mark label as saved in localStorage for this application
            const savedLabelKey = `fedex_label_saved_application_${applicationId}`;
            const savedImageDataKey = `fedex_label_image_application_${applicationId}`;
            const savedTrackingKey = `fedex_label_tracking_application_${applicationId}`;
            
            localStorage.setItem(savedLabelKey, 'true');
            localStorage.setItem(savedImageDataKey, labelImage); // Save image data for preview
            if (trackingNumber) {
                localStorage.setItem(savedTrackingKey, trackingNumber);
            }
            
            // Close modal after successful save
            setShowSaveModal(false);
            // Preview will automatically regenerate via useEffect when labelImagePath is set
        } catch (error) {
            setLabelError(`Failed to save label image: ${error.message}`);
            // Keep modal open if save failed
        }
    };

    const handlePrintLabel = async () => {
        // Check if extension is installed
        if (!bpac.IsExtensionInstalled()) {
            const agent = window.navigator.userAgent.toLowerCase();
            const isEdge = agent.indexOf('edg') !== -1;
            const isChrome = (agent.indexOf('chrome') !== -1) && (agent.indexOf('opr') === -1);
            
            if (isEdge) {
                window.open('https://microsoftedge.microsoft.com/addons/detail/brother-bpac-extension/kmopihekhjobijiipnloimfdgjddbnhg', '_blank');
            } else if (isChrome) {
                window.open('https://chrome.google.com/webstore/detail/ilpghlfadkjifilabejhhijpfphfcfhb', '_blank');
            } else {
                alert("Please install Brother b-PAC Extension for your browser");
            }
            return;
        }

        // Ensure label image file is saved (b-PAC needs file path)
        if (!labelImagePath && labelImage) {
            // Show modal to save file first
            setShowSaveModal(true);
            alert("Please save the label image file first before printing.");
            return;
        }
        
        if (!labelImagePath) {
            alert("Label image file is required for printing. Please wait for the label to be generated.");
            return;
        }

        // Validate template selection
        const selectedTemplateOption = templateOptions.find(
            (template) => template.id === selectedTemplate
        );

        if (!selectedTemplateOption) {
            alert("Please select a template");
            return;
        }

        setPrintLoading(true);
        try {
            // Construct the full path to the template file
            const templatePath = TEMPLATE_FOLDER + selectedTemplateOption.fileName;
            

            const objDoc = bpac.IDocument;
            const ret = await objDoc.Open(templatePath);

            if (ret === true) {
                // Set dynamic data in the template
                // NOTE: Replace these object names with the actual names in your .lbx templates
                // Open your .lbx files in Brother P-touch Editor to see the object names
                
                try {
                    // Example: Set merchant ID
                    const objMerchantId = await objDoc.GetObject("objMerchantId");
                    if (objMerchantId) {
                        objMerchantId.Text = merchantId;
                    }
                } catch (e) {
                }

                try {
                    // Example: Set business name
                    const objBusinessName = await objDoc.GetObject("objBusinessName");
                    if (objBusinessName) {
                        objBusinessName.Text = businessName;
                    }
                } catch (e) {
                }

                try {
                    // Example: Set device type
                    const objDeviceType = await objDoc.GetObject("objDeviceType");
                    if (objDeviceType) {
                        objDeviceType.Text = deviceType;
                    }
                } catch (e) {
                }

                try {
                    // Example: Set serial number
                    const objSerialNumber = await objDoc.GetObject("objSerialNumber");
                    if (objSerialNumber) {
                        objSerialNumber.Text = serialNumber;
                    }
                } catch (e) {
                }

                // Start the print job
                objDoc.StartPrint("", 0);
                objDoc.PrintOut(1, 0); // Print 1 copy
                objDoc.EndPrint();
                await objDoc.Close();

                alert("Label sent to printer successfully!");
                
            } else {
                alert(`Failed to open template file.\n\nPlease ensure:\n1. The template exists at: ${templatePath}\n2. Brother b-PAC is installed\n3. The file path is correct`);
            }
        } catch (error) {
            alert(`Print error: ${error.message || error}`);
        } finally {
            setPrintLoading(false);
        }
    };

    return (
        <>
            <div
                className="min-h-screen"
                style={{
                    marginTop: -65,
                    backgroundColor: "var(--dashboard-bg)",
                    padding: 10,
                }}
            >
                <Heading
                    Fontweight={700}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Label Print"}
                    Fontsize={30}
                />

                {/* Extension Warning */}
                {!extensionInstalled && (
                    <div style={{
                        backgroundColor: "#FFF3CD",
                        border: "1px solid #FFC107",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                        color: "#856404"
                    }}>
                        ⚠️ Brother b-PAC Extension is not detected. Please install it to print labels.
                    </div>
                )}

                <div
                    className="w-full"
                    style={{
                        backgroundColor: "var(--dashboard-card-bg)",
                        borderRadius: 14,
                    }}
                >
                    <div
                        style={{ marginTop: 10, borderRadius: 14 }}
                        className="sm:m-8 p-3 pt-4 m-2"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={handleBackToDeployment}
                            >
                                <IoIosArrowBack
                                    size={20}
                                    color="var(--sidebar-text-primary)"
                                />
                                <Heading
                                    Fontweight={500}
                                    color={"var(--Gray)"}
                                    Heading={"Back To Deployment"}
                                    Fontsize={18}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-4 mt-4">
                            <div className="">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--fieldsTitle)"}
                                    Heading={"Template Selection"}
                                    Fontsize={10}
                                    mb={2}
                                />
                                <DropdownMenu
                                    menuItems={templateOptions}
                                    businessType={true}
                                    defaultText={"Select"}
                                    onSelect={setSelectedTemplate}
                                    selectedValue={selectedTemplate}
                                    idSet={true}
                                    meetingLink={true}
                                />
                            </div>
                            <LabeledInput
                                label="Merchant ID"
                                inputPlaceholder="Enter ID"
                                inputValue={merchantId}
                                onInputChange={(e) => setMerchantId(e.target.value)}
                                meetingLink={true}
                            />
                            <LabeledInput
                                label="Business Name"
                                inputPlaceholder="Enter Name"
                                inputValue={businessName}
                                onInputChange={(e) => setBusinessName(e.target.value)}
                                meetingLink={true}
                            />
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-4 mt-4">
                            <LabeledInput
                                label="Device Type"
                                inputPlaceholder="Enter"
                                inputValue={deviceType}
                                onInputChange={(e) => setDeviceType(e.target.value)}
                                meetingLink={true}
                            />
                            <LabeledInput
                                label="Serial Number"
                                inputPlaceholder="Enter number"
                                inputValue={serialNumber}
                                onInputChange={(e) => setSerialNumber(e.target.value)}
                                meetingLink={true}
                            />
                        </div>

                        <div className="mt-8">
                            <Heading
                                Fontweight={700}
                                color={"var(--sidebar-text-primary)"}
                                Heading={"Print Preview"}
                                Fontsize={16}
                            />

                            <div className="mt-3 flex flex-col gap-2 max-w-xl">
                                <PrintPreview
                                    labelImage={previewImage || labelImage}
                                    loading={labelLoading || previewLoading}
                                    error={labelError}
                                    trackingNumber={trackingNumber}
                                />

                                {/* Manual Save Button */}
                                {labelImage && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-xs text-blue-800">
                                                <strong>Note:</strong> If the label preview shows a blank or black image, please click the button below to save the label image file first.
                                            </p>
                                        </div>
                                        <div className="flex justify-start">
                                            <BottonCustom
                                                backgroundColor={"#FFFFFF"}
                                                width={180}
                                                title={"Save Label File"}
                                                height={36}
                                                color={"#1E1E1E"}
                                                fontSize={14}
                                                fontWeight={500}
                                                border={"1px solid #D0D5DD"}
                                                onClick={() => setShowSaveModal(true)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* <div className="bg-[#F7F7F7] rounded-b-lg border border-t-0 border-gray-200 px-3 py-2 flex items-center justify-between">
                                    <div className="text-xs text-gray-500">
                                        Attach file to include with label
                                    </div> */}
                                    {/* <BottonCustom
                                        backgroundColor={"#FFFFFF"}
                                        width={110}
                                        title={"Attach File"}
                                        height={30}
                                        color={"#1E1E1E"}
                                        fontSize={12}
                                        fontWeight={500}
                                        border={"1px solid #D0D5DD"}
                                        onClick={() => { }}
                                    /> */}
                                {/* </div> */}
                            </div>

                            {/* <div className="mt-4 max-w-xs" style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 4, }}>
                                <UploadFile
                                    onFileChange={setUploadedFiles}
                                    addTicket={true}
                                />
                            </div> */}
                        </div>

                        <div className="flex justify-end mt-10 gap-3">
                            <BottonCustom
                                backgroundColor={"transparent"}
                                width={130}
                                title={"Cancel"}
                                height={40}
                                color={"#1E1E1E"}
                                fontSize={16}
                                fontWeight={500}
                                border={"1px solid #1E1E1E"}
                                onClick={handleBackToDeployment}
                            />
                            <BottonCustom
                                backgroundColor={"#3769E6"}
                                width={145}
                                title={printLoading ? <Spinner /> : "Print Label"}
                                height={40}
                                color={"#ffffff"}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handlePrintLabel}
                                disabled={printLoading || !extensionInstalled}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Label Image Modal */}
            <Transition appear show={showSaveModal} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    style={{ zIndex: 4000 }}
                    onClose={() => {}} // Prevent closing by clicking outside - user must save file
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-semibold leading-6 text-gray-900 border-b pb-4 pt-6 px-6"
                                    >
                                        Save Label Image File
                                    </Dialog.Title>

                                    <div className="px-6 py-4">
                                        <p className="text-sm text-gray-700 mb-4">
                                            To use b-PAC printing, you need to save the label image as a file. 
                                            Please save the file to the following location:
                                        </p>
                                        
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                                            <p className="text-xs text-gray-600 mb-1 font-medium">Save Location:</p>
                                            <code className="text-sm text-gray-800 font-mono break-all">
                                                C:\DMS\Temp\
                                            </code>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                            <p className="text-xs text-blue-800">
                                                <strong>Important:</strong> Make sure to save the file in the exact location shown above. 
                                                The b-PAC SDK requires the file to be at this specific path.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                                        <BottonCustom
                                            backgroundColor={"#3769E6"}
                                            width={180}
                                            title={"Save File"}
                                            height={40}
                                            color={"#ffffff"}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={handleSaveLabelImage}
                                        />
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default LabelPrint;


