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

const AddSetup = ({
    isOpen,
    onClose,
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [points, setPoints] = useState("")
    const [estimatedDays, setEstimatedDays] = useState("")
    const [allowedLateDays, setAllowedLateDays] = useState("")
    const [bonus, setBonus] = useState("")
    const [taskType, setTaskType] = useState([])
    const [taskLevel, setTaskLevel] = useState([])
    const [selectedTaskType, setSelectedTaskType] = useState(null)
    const [selectedTaskLevel, setSelectedTaskLevel] = useState(null)
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    if (!isOpen) return null

    const fetchData5 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}task/types`, accessToken
        )
            .then(result => {
                setTaskType(result?.data)
            })
            .catch(error => {
            })
    }
    const fetchData6 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}task/levels`, accessToken
        )
            .then(result => {
                setTaskLevel(result?.data)
            })
            .catch(error => {
            })
    }

    useEffect(() => {
        fetchData5()
        fetchData6()
        setLoading(false)
    }, [])

    const handleTitleChange = (e) => {
        setProjectTitle(e.target.value)
    }
    const handlePointsChange = (e) => {
        const value = e.target.value;
        // Remove any leading zeros unless the value is just "0"
        const cleanedValue = value === "0" ? "0" : value.replace(/^0+/, '');
        // Only update if it's a valid number or empty string
        if (cleanedValue === "" || /^\d+$/.test(cleanedValue)) {
            setPoints(cleanedValue);
            clearError("points");
        }
    };

    const handleEstimatedDaysChange = (e) => {
        const value = e.target.value;
        // Remove any leading zeros unless the value is just "0"
        const cleanedValue = value === "0" ? "0" : value.replace(/^0+/, '');
        // Only update if it's a valid number or empty string
        if (cleanedValue === "" || /^\d+$/.test(cleanedValue)) {
            setEstimatedDays(cleanedValue);
            clearError("estimatedDays");
        }
    };
    const handleAllowedLateDaysChange = (e) => {
        const value = e.target.value;
        // Remove any leading zeros unless the value is just "0"
        const cleanedValue = value === "0" ? "0" : value.replace(/^0+/, '');
        // Only update if it's a valid number or empty string
        if (cleanedValue === "" || /^\d+$/.test(cleanedValue)) {
            setAllowedLateDays(cleanedValue);
            clearError("allowedLateDays");
        }
    };
    const handleBonusChange = (e) => {
        const value = e.target.value;
        // Remove any leading zeros unless the value is just "0"
        const cleanedValue = value === "0" ? "0" : value.replace(/^0+/, '');
        // Only update if it's a valid number or empty string
        if (cleanedValue === "" || /^\d+$/.test(cleanedValue)) {
            setBonus(cleanedValue);
            clearError("bonus");
        }
    };

    const handleTaskTypeChange = (selected) => {
        setSelectedTaskType(selected);
        clearError("selectedTaskType");
    };

    const handleTaskLevelChange = (selected) => {
        setSelectedTaskLevel(selected);
        clearError("selectedTaskLevel");
    };

    const handleSubmit = async () => {
        setLoading(true);
        
        // Clear previous errors
        setErrors({});
        
        // Validation checks
        const fieldErrors = {};
        if (!points || points.trim() === "") fieldErrors.points = true;
        if (!estimatedDays || estimatedDays.trim() === "") fieldErrors.estimatedDays = true;
        if (!allowedLateDays || allowedLateDays.trim() === "") fieldErrors.allowedLateDays = true;
        if (!bonus || bonus.trim() === "") fieldErrors.bonus = true;
        if (!selectedTaskType) fieldErrors.selectedTaskType = true;
        if (!selectedTaskLevel) fieldErrors.selectedTaskLevel = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("All fields are required");
            setLoading(false);
            return;
        }
        // Parse to integers
        const parsedPoints = parseInt(points);
        const parsedEstimatedDays = parseInt(estimatedDays);
        const parsedAllowedLateDays = parseInt(allowedLateDays);
        const parsedBonus = parseInt(bonus);

        // Check if any value is negative or NaN
        if (
            isNaN(parsedPoints) || parsedPoints < 0 ||
            isNaN(parsedEstimatedDays) || parsedEstimatedDays < 0 ||
            isNaN(parsedAllowedLateDays) || parsedAllowedLateDays < 0 ||
            isNaN(parsedBonus) || parsedBonus < 0
        ) {
            toast.error("Values must be non-negative numbers");
            setLoading(false);
            return;
        }
        try {

            const payload = {
                taskTypeId: selectedTaskType,
                taskLevelId: selectedTaskLevel,
                points: parseInt(points),
                estimatedDays: parseInt(estimatedDays),
                allowedLateDays: parseInt(allowedLateDays),
                bonus: parseInt(bonus),
            };

            const result = await postRequestWithBodyAndToken(`${baseURl}task-estimations`, accessToken, payload)
            toast.success(result.message);
            setPoints("");
            setEstimatedDays("");
            setAllowedLateDays("");
            setBonus("");
            setSelectedTaskType(null);
            setSelectedTaskLevel(null);
            onClose();
        } catch (error) {
            toast.error(error.message || "Something went wrong");
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

                <h2 className="text-xl text-[var(--sidebar-text-primary)] font-semibold mb-4">Add New Row</h2>

                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Task Type"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Task Type"
                            menuItems={taskType}
                            defaultText="--select task type--"
                            onSelect={handleTaskTypeChange}
                            addAgent={true}
                            idSet={true}
                            error={!!errors.selectedTaskType}
                        />
                    </div>
                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Task Level"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Task Level"
                            menuItems={taskLevel}
                            defaultText="--select task level--"
                            onSelect={handleTaskLevelChange}
                            addAgent={true}
                            idSet={true}
                            error={!!errors.selectedTaskLevel}
                        />
                    </div>
                    <div className="">
                        <LabeledInput
                            label="Task Point"
                            inputPlaceholder="0"
                            inputValue={points}
                            addAgent={true}
                            onInputChange={handlePointsChange}
                            inputType="number"
                            step="1"
                            min="0"
                            error={!!errors.points}
                        />
                    </div>
                    <div className="">
                        <LabeledInput
                            label="Estimated Days"
                            inputPlaceholder="0"
                            inputValue={estimatedDays}
                            addAgent={true}
                            onInputChange={handleEstimatedDaysChange}
                            inputType="number"
                            step="1"
                            min="0"
                            error={!!errors.estimatedDays}
                        />
                    </div>
                    <div className="">
                        <LabeledInput
                            label="Allowed Late Days"
                            inputPlaceholder="0"
                            inputValue={allowedLateDays}
                            addAgent={true}
                            onInputChange={handleAllowedLateDaysChange}
                            inputType="number"
                            step="1"
                            min="0"
                            error={!!errors.allowedLateDays}
                        />
                    </div>
                    <div className="">
                        <LabeledInput
                            label="Bonus"
                            inputPlaceholder="0"
                            inputValue={bonus}
                            addAgent={true}
                            onInputChange={handleBonusChange}
                            inputType="number"
                            step="1"
                            min="0"
                            error={!!errors.bonus}
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4">
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

export default AddSetup
