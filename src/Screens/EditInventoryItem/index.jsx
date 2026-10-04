import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import UploadFile from "../../Components/UploadFile";
import { deleteRequest, getRequestWithOutBody, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DropdownMenu from "../../Components/dropdownMenu";
import { Button } from "@mui/material";

const EditInventory = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();

    const [enabled, setEnabled] = useState(true)
    const [itemName, setItemName] = useState("")
    const [itemSellingPrice, setItemSellingPrice] = useState(0)
    const [sku, setSku] = useState(0)
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(true);
    const [categoryList, setCategoryList] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(""); // Step 1: Define state
    const [selectedCategoryTitle, setSelectedCategoryTitle] = useState(""); // Step 1: Define state
    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [uploadedFile, setUploadedFiles] = useState([]); // Step 1: Add state for the uploaded file

    const handleFileUpload = (files) => { // Step 2: Update parameter to accept multiple files
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const newFiles = Array.from(files).filter(file => validImageTypes.includes(file.type)); // Step 3: Filter valid files

        if (newFiles.length > 0) {
            setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]); // Step 4: Update state with new files
        } else {
            toast.error("Please upload valid image files (JPEG, PNG, GIF)"); // Step 5: Show error for invalid file types
        }
    };
    // Step 1: Define state
    useEffect(() => {
        if (location.state) {
            const { name, categoryId, category, price, quantity, description, status } = location.state?.invoiceData;
            setItemName(name);
            setItemSellingPrice(price);
            setSku(quantity);
            setSelectedCategory(categoryId);
            setDescription(description);
            setEnabled(status === "active");
            setSelectedCategoryTitle(category.title)
            setUploadedUrl(location.state?.invoiceData?.pictureUlr)
        }
        setLoading(false)
    }, [location.state]);

    const fetchData = () => {
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}category`, accessToken
        )
            .then(result => {
                setCategoryList(result?.data)
                // setCompanyCategoryArray(options);
                // setCompanyCategoryArray(result)setLoadin
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleItemNameChange = (e) => {
        setItemName(e.target.value);
    };
    const handleItemSellingPriceChange = (e) => {
        setItemSellingPrice(parseFloat(e.target.value));
    };

    const handleSkuChange = (e) => {
        setSku(parseFloat(e.target.value));
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };
    const handleCategoryChange = (value) => { // Step 2: Define handler
        setSelectedCategory(value);
    };

    const handleCreateMemo = async () => {
        if (
            itemName.trim() === ""
            || itemSellingPrice === 0
            || sku === 0
            || description.trim() === ""
            || selectedCategory === ""
        ) {
            toast.error("All fields are required");
            return;
        }

        // Proceed with login logic
        setLoading(true);
        try {
            let uploadedFiles = []; // Initialize an array for uploaded file data
            if (uploadedFile && Array.isArray(uploadedFile)) { // Check if uploadedFile is an array
                for (const file of uploadedFile) { // Loop through each file
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'inventory');

                    // Step 2: Upload the file and get the uploaded file details
                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                    uploadedFiles.push({
                        url: result1?.data?.pictureUlr?.url,
                        mimetype: result1?.data?.pictureUlr?.mimetype,
                        originalname: result1?.data?.pictureUlr?.originalname,
                    });
                }
            }

            const apiData = {
                "name": itemName,
                "quantity": sku,
                "description": description,
                "price": itemSellingPrice,
                "categoryId": selectedCategory,
                ...(uploadedFiles.length > 0 && { "pictureUlr": [...uploadedUrl, ...uploadedFiles] }),
                "status": enabled ? 'active' : 'in-active',
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}inventory/${location.state?.invoiceData?.id}`, accessToken, apiData)
            toast.success(result.message);
            navigate('/home/allInventory');
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async () => {
        // Proceed with login logic
        setLoading(true);
        try {
            const result = await deleteRequest(`${baseURl}inventory/${location.state?.invoiceData?.id}`, accessToken)
            toast.success(result.message);
            navigate('/home/allInventory');
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <Button
                    onClick={() => navigate(-1)}
                    style={{
                        minWidth: 40,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'var(--dashboard-card-bg)',
                        border: '1px solid var(--dashboard-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginTop: 4
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Edit Item'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                        <div className="flex items-center gap-4">
                            {enabled ?
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'Active'}
                                    Fontsize={16}
                                /> :
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'In-Active'}
                                    Fontsize={16}
                                />
                            }
                            <Switch
                                checked={enabled}
                                onChange={setEnabled}
                                className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                                />
                            </Switch>
                        </div>
                    </div>

                    <div className="flex flex-col mt-4 gap-4">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Item Name"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Item Name"
                                inputValue={itemName}
                                onInputChange={handleItemNameChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {!loading && (
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Category"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <DropdownMenu
                                    menuItems={categoryList}
                                    onSelect={handleCategoryChange}
                                    defaultText={'--Select Category--'}
                                    selectedValue={selectedCategoryTitle}
                                    meetingLink={true}
                                    idSet={true}
                                    className="w-80"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Price"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="0.00"
                                inputValue={itemSellingPrice}
                                onInputChange={handleItemSellingPriceChange}
                                isDecimal={true}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Quantity"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Quantity"
                                inputValue={sku}
                                onInputChange={handleSkuChange}
                                isDecimal={true}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>
                    </div>

                    <div className="mt-2">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={"Item Description"}
                                Fontsize={16}
                                required={true}
                            />
                        </div>
                        <textarea
                            type="text"
                            placeholder="Item Description"
                            value={description}
                            onChange={handleDescriptionChange}
                            className={`mt-1 p-3 w-[60%]`}
                            rows={4}
                            style={{
                                border: '1px solid var(--sidebar-selected-bg)',
                                fontSize: 14,
                                borderRadius: 8,
                                backgroundColor: 'var(--dashboard-tab-box)',
                                color: 'var(--sidebar-text-primary)'
                            }}
                        />
                    </div>

                    <div className="mt-2">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={"Upload Item Image"}
                                Fontsize={16}
                            />
                        </div>
                        <div style={{ 
                            backgroundColor: 'var(--dashboard-tab-box)', 
                            border: '1px solid var(--sidebar-selected-bg)', 
                            borderRadius: 8, 
                            overflow: 'hidden',
                            width: '60%',
                            marginTop: 4
                        }} className="min-h-28 p-2 flex flex-col items-center">
                            <UploadFile backgroundColor={'var(--scroll-thumb)'} addItem={true} onFileChange={handleFileUpload} />
                        </div>
                    </div>

                    {uploadedUrl && uploadedUrl.length > 0 && (
                        <div
                            onClick={() => window.open(uploadedUrl[0]?.url, '_blank')}
                            className="px-4 cursor-pointer mt-3 w-[60%]"
                            style={{
                                border: '1px solid var(--sidebar-selected-bg)',
                                fontSize: 14,
                                borderRadius: 9,
                                backgroundColor: 'var(--dashboard-tab-box)',
                                paddingTop: 8,
                                paddingBottom: 8,
                                color: 'blue'
                            }}
                        >
                            <Heading
                                Fontweight={500}
                                color={'blue'}
                                Heading={uploadedUrl.map(file => file.originalname).join(', ')}
                                Fontsize={16}
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <BottonCustom
                            backgroundColor={"transparent"}
                            width={130}
                            title={"Cancel"}
                            height={40}
                            color={"var(--dashboard-text-primary)"}
                            fontSize={16}
                            fontWeight={500}
                            border={"1px solid var(--sidebar-selected-bg)"}
                            onClick={() => navigate(-1)}
                        />
                        <BottonCustom
                            backgroundColor={''}
                            width={130}
                            title={'Delete'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            className={"bg-red-500"}
                            onClick={handleDeleteItem}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Save'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleCreateMemo}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditInventory;
