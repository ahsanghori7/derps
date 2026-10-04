"use client"

import { useEffect, useState } from "react"
import LabeledInput from "../LabeledInput"
import DropdownMenu from "../dropdownMenu"
import Heading from "../Heading"
import { Plus, X } from "lucide-react"
import { RxCrossCircled } from "react-icons/rx";
import { toast } from "react-toastify"
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { useSelector } from "react-redux"
import CustomTimePicker from "../CustomTimePicker"
import moment from "moment"
import { buildPreferenceExtra } from "../../Utils/preferenceExtra"
/* Add this CSS class to hide scrollbars */
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const getOptionLabel = (option) => {
    if (!option) return '';
    if (typeof option === 'string') return option;
    return String(option.title || option.value || '');
};

const getFieldNameLabel = (selectedField) => {
    if (selectedField === 'textField') return 'Field Name';
    if (selectedField === 'dropdown') return 'Dropdown Name';
    if (selectedField === 'datePicker') return 'Date Picker Name';
    if (selectedField === 'switch') return 'Switch Name';
    return 'Time Picker Name';
};

const PreferenceSettingToggle = ({ id, checked, onChange, title, description }) => (
    <label
        htmlFor={id}
        className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-lg cursor-pointer"
        style={{
            backgroundColor: 'var(--dashboard-tab-box)',
            border: checked ? '1px solid #0C79F7' : '1px solid var(--dashboard-box-border, #E5E7EB)',
        }}
    >
        <span>
            <span className="block text-sm font-medium" style={{ color: 'var(--sidebar-text-primary)' }}>
                {title}
            </span>
            {description ? (
                <span className="block text-xs mt-0.5" style={{ color: 'var(--dashboard-text-secondary, #6b7280)' }}>
                    {description}
                </span>
            ) : null}
        </span>
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            className="w-4 h-4 accent-[#0C79F7] cursor-pointer shrink-0"
        />
    </label>
);

const AddPreference = ({
    isOpen,
    onClose,
    onSuccess,
    formName = "preferences"
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [loading, setLoading] = useState(false);
    const [selectedField, setSelectedField] = useState('');
    const [fieldName, setFieldName] = useState('');
    const [dropdownOptions, setDropdownOptions] = useState([]);
    const [currentDropdownValue, setCurrentDropdownValue] = useState("");
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState(null);
    const [isHidden, setIsHidden] = useState(false);
    const [isRequired, setIsRequired] = useState(false);

    const data = [
        {
            title: "Text Field",
            value: "textField"
        },
        {
            title: "Dropdown",
            value: "dropdown"
        },
        {
            title: "Date Picker",
            value: "datePicker"
        },
        {
            title: "Switch",
            value: "switch"
        },
        {
            title: "Time Picker",
            value: "timePicker"
        },
    ]

    if (!isOpen) return null

    const handleFieldNameChange = (e) => {
        setFieldName(e.target.value);
    }

    const handleDropdownOptionsChange = (e) => {
        setDropdownOptions({
            title: e.target.value,
            value: e.target.value,
        });
    }

    const removeOption = (indexToRemove) => {
        const newOptions = dropdownOptions.filter((_, index) => index !== indexToRemove);
        setDropdownOptions(newOptions);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && currentDropdownValue.trim() !== "") {
            e.preventDefault();
            const newOption = {
                title: currentDropdownValue.trim(),
                value: currentDropdownValue.trim(),
            };
            setDropdownOptions([...dropdownOptions, newOption]);
            setCurrentDropdownValue(""); // clear input
        }
    };

    const handleSubmit = async () => {
        // Enhanced validation checks
        const missingFields = [];
        if (selectedField === null) missingFields.push("Field Type");
        if (fieldName === null || fieldName.trim() === "") missingFields.push("Field Name");
        if (formName === null || formName.trim() === "") missingFields.push("Form Name");

        if (missingFields.length > 0) {
            toast.error(`Please fill: ${missingFields.join(", ")}`);
            return;
        }

        // Additional validation
        if (fieldName.trim().length < 2) {
            toast.error("Field Name must be at least 2 characters long");
            return;
        }

        if (fieldName.trim().length > 50) {
            toast.error("Field Name must be less than 50 characters");
            return;
        }

        if (selectedField === "dropdown" && dropdownOptions.length === 0) {
            toast.error("Dropdown options are required");
            return;
        }

        if (selectedField === "dropdown" && dropdownOptions.some(option => !getOptionLabel(option).trim())) {
            toast.error("All dropdown options must be valid");
            return;
        }

        // Validate accessToken
        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                formName: formName.trim(),
                preference: selectedField,
                name: fieldName.trim(),
                extra: buildPreferenceExtra({
                    preference: selectedField,
                    options: dropdownOptions.filter(option => getOptionLabel(option).trim()),
                    isHidden,
                    required: isRequired,
                }),
            };

            // Validate payload before sending
            if (!payload.formName || !payload.name || !payload.preference) {
                toast.error("Invalid preference data");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}application-preferences`, accessToken, payload);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);
            
            // Call success callback if available
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
            
            // Close modal
            if (typeof onClose === 'function') {
                onClose();
            }
        } catch (error) {
            console.error('Preference creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid preference data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create preferences");
                } else if (status === 409) {
                    toast.error("Preference with this name already exists");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="fixed inset-0 flex items-center justify-center  z-504 bg-black bg-opacity-30" style={{ zIndex: 9999 }}>
            <div className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <button onClick={onClose} className="absolute top-4 text-[var(--sidebar-text-primary)] right-4 text-2xl">
                    ×
                </button>

                <h2 className="text-xl text-[var(--sidebar-text-primary)] font-semibold mb-5">Add New Preference</h2>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="w-full min-w-0">
                            <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Field Type"} Fontsize={10} mb={2} />
                            <DropdownMenu
                                label="Field Type"
                                menuItems={data}
                                defaultText="--select field--"
                                onSelect={setSelectedField}
                                fullWidth
                            />
                        </div>
                        {selectedField ? (
                            <div className="w-full min-w-0">
                                <LabeledInput
                                    label={getFieldNameLabel(selectedField)}
                                    inputPlaceholder={getFieldNameLabel(selectedField)}
                                    inputValue={fieldName}
                                    eventScreen
                                    labelFontSize={10}
                                    onInputChange={handleFieldNameChange}
                                />
                            </div>
                        ) : null}
                    </div>

                    {selectedField ? (
                        <div className={`grid gap-3 ${selectedField === "textField" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                            <PreferenceSettingToggle
                                id="isRequired"
                                checked={isRequired}
                                onChange={(e) => setIsRequired(e.target.checked)}
                                title="Required Field"
                                description="User must fill this field on forms"
                            />
                            {selectedField === "textField" ? (
                                <PreferenceSettingToggle
                                    id="isHidden"
                                    checked={isHidden}
                                    onChange={(e) => setIsHidden(e.target.checked)}
                                    title="Secure Input"
                                    description="Mask the value while typing"
                                />
                            ) : null}
                        </div>
                    ) : null}

                    {selectedField === "dropdown" ? (
                        <div className="w-full min-w-0">
                            <LabeledInput
                                label="Dropdown Options"
                                inputPlaceholder="Press Enter to add option"
                                inputValue={currentDropdownValue}
                                eventScreen
                                labelFontSize={10}
                                onInputChange={(e) => setCurrentDropdownValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {dropdownOptions.length > 0 ? (
                                <div className="flex flex-col gap-2 mt-3">
                                    {dropdownOptions.map((option, index) => (
                                        <div
                                            key={`${option.value}-${index}`}
                                            className="py-2.5 px-4 w-full rounded-lg flex justify-between items-center"
                                            style={{
                                                backgroundColor: 'var(--dashboard-tab-box)',
                                                color: 'var(--sidebar-text-primary)',
                                                border: '1px solid var(--dashboard-box-border, #E5E7EB)',
                                            }}
                                        >
                                            <span className="text-sm">{option.title}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeOption(index)}
                                                className="p-1 rounded-md hover:bg-black/5"
                                                aria-label={`Remove ${option.title}`}
                                            >
                                                <X size={14} color="#DC2626" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="flex justify-end mt-6">
                    <button onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2 text-white rounded-lg ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#0C79F7] hover:bg-blue-600'}`}>
                        {loading ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddPreference
