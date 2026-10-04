"use client"

import { useState } from "react"
import CustomDatePicker from "../CustomDatePicker"
import LabeledInput from "../LabeledInput"
import DropdownMenu from "../dropdownMenu"
import Heading from "../Heading"
import { Plus, X } from "lucide-react"
import { RxCrossCircled } from "react-icons/rx";
import { toast } from "react-toastify"
import { postRequestWithBodyAndToken } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { useSelector } from "react-redux"
import dayjs from "dayjs"
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

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

const TaskModal = ({
    isOpen,
    onClose,
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [selectedStatus, setSelectedStatus] = useState("")
    const [projectTitle, setProjectTitle] = useState("")
    const [phases, setPhases] = useState([])
    const [newPhaseName, setNewPhaseName] = useState("")
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedPriority, setSelectedPriority] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    if (!isOpen) return null
    // Status options
    const statusOptions = [
        { id: "on_hold", name: "On Hold" },
        { id: "todo", name: "To Do" },
        { id: "active", name: "Active" },
        { id: "completed", name: "Completed" },
        { id: "cancelled", name: "Cancelled" },
    ]
    const priorityOptions = [
        { id: "low", name: "Low" },
        { id: "medium", name: "Medium" },
        { id: "high", name: "High" },
    ]

    const handleTitleChange = (e) => {
        setProjectTitle(e.target.value)
        if (e.target.value.trim()) setErrors((prev) => ({ ...prev, projectTitle: false }));
    }
    const handleNewPhaseNameChange = (e) => {
        setNewPhaseName(e.target.value);
    };
    const handleAddPhase = () => {
        if (newPhaseName.trim()) {
            const newPhase = {
                id: phases.length + 1,
                name: newPhaseName,
                description: "",
                status: "active",
                priority: "low",
                startDate: new Date(),
                endDate: new Date(),
            }
            setPhases([...phases, newPhase])
            setNewPhaseName("")
            setErrors((prev) => ({ ...prev, phases: false }));
        }
    }

    const handleRemovePhase = (id) => {
        setPhases(phases.filter((phase) => phase.id !== id))
    }

    const handlePhaseChange = (id, field, value) => {
        setPhases(phases.map((phase) => (phase.id === id ? { ...phase, [field]: value } : phase)))
    }

    const handleSubmit = async () => {
        const fieldErrors = {
            projectTitle: projectTitle.trim() === "",
            description: description.trim() === "",
            status: selectedStatus === "",
            priority: selectedPriority === "",
            startDate: startDate === null,
            endDate: endDate === null,
            phases: phases.length === 0,
        };
        phases.forEach((phase) => {
            if (!phase.startDate) fieldErrors[`phase.${phase.id}.startDate`] = true;
            if (!phase.endDate) fieldErrors[`phase.${phase.id}.endDate`] = true;
        });
        setErrors(fieldErrors);

        const missingFields = [
            fieldErrors.projectTitle && "Project Title",
            fieldErrors.description && "Description",
            fieldErrors.status && "Status",
            fieldErrors.priority && "Priority",
            fieldErrors.startDate && "Start Date",
            fieldErrors.endDate && "End Date",
            fieldErrors.phases && "Project Phase",
            phases.some((phase) => !phase.startDate || !phase.endDate) && "Phase Dates",
        ].filter(Boolean);

        if (missingFields.length > 0) {
            toast.error(`Please fill: ${missingFields.join(", ")}`);
            return;
        }

        // Date validation
        const startYear = dayjs(startDate).year();
        const endYear = dayjs(endDate).year();

        if (startYear < 1900 || startYear > 2100 || endYear < 1900 || endYear > 2100) {
            toast.error("Please select a valid date.");
            return;
        }

        if (dayjs(endDate).isBefore(dayjs(startDate))) {
            toast.error("End Date must be after Start Date.");
            return;
        }

        // Validate all phase date ranges
        for (let phase of phases) {
            if (!phase.startDate || !phase.endDate) {
                toast.error(`Please select start and end date for phase: ${phase.name}`);
                return;
            }
            const phaseStartYear = dayjs(phase.startDate).year();
            const phaseEndYear = dayjs(phase.endDate).year();

            if (phaseStartYear < 1900 || phaseStartYear > 2100 || phaseEndYear < 1900 || phaseEndYear > 2100) {
                toast.error(`Please select a valid date: ${phase.name}`);
                return;
            }

            if (dayjs(phase.endDate).isBefore(dayjs(phase.startDate))) {
                toast.error(`End date must be after start date for phase: ${phase.name}`);
                return;
            }
        }

        setLoading(true);
        try {
            const payload = {
                name: projectTitle,
                description: description,
                status: selectedStatus,
                priority: selectedPriority,
                startDate: startDate,
                endDate: endDate,
                phases: phases.map((phase) => ({
                    phase: phase.name,
                    description: phase.description,
                    status: phase.status,
                    priority: phase.priority,
                    startDate: phase.startDate,
                    endDate: phase.endDate,
                })),
            };

            // Validate payload before sending
            if (!payload.name || !payload.description) {
                toast.error("Invalid project data");
                return;
            }

            if (!accessToken) {
                toast.error("Authentication token not available");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}project`, accessToken, payload);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);
            setProjectTitle("");
            setDescription("");
            setSelectedPriority("");
            setSelectedStatus("");
            setStartDate(null);
            setEndDate(null);
            setPhases([]);
            onClose();
        } catch (error) {
            console.error('Project creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid project data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create projects");
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
                <button onClick={onClose} className="absolute top-4 right-4 text-xl text-[var(--sidebar-text-primary)]">
                    ×
                </button>

                <h2 className="text-xl font-semibold mb-4 text-[var(--sidebar-text-primary)]">Add New Project</h2>

                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="">
                        <LabeledInput
                            label="Project Title"
                            inputPlaceholder="Enter name"
                            inputValue={projectTitle}
                            addAgent={true}
                            onInputChange={handleTitleChange}
                            error={errors.projectTitle}
                        />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Start Date"} Fontsize={10} mb={2} />
                        <CustomDatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={(value) => {
                                setStartDate(value);
                                if (value) setErrors((prev) => ({ ...prev, startDate: false }));
                            }}
                            addAgent={true}
                            fieldError={errors.startDate}
                        />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"End Date"} Fontsize={10} mb={2} />
                        <CustomDatePicker
                            label="End Date"
                            value={endDate}
                            onChange={(value) => {
                                setEndDate(value);
                                if (value) setErrors((prev) => ({ ...prev, endDate: false }));
                            }}
                            addAgent={true}
                            fieldError={errors.endDate}
                        />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Priority"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Priority"
                            menuItems={priorityOptions}
                            defaultText="--select priority--"
                            onSelect={(value) => {
                                setSelectedPriority(value);
                                setErrors((prev) => ({ ...prev, priority: false }));
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={priorityOptions.find((option) => option.id === selectedPriority)?.name || ""}
                            error={errors.priority}
                        />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Status"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Status"
                            menuItems={statusOptions}
                            defaultText="--select status--"
                            onSelect={(value) => {
                                setSelectedStatus(value);
                                setErrors((prev) => ({ ...prev, status: false }));
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={statusOptions.find((option) => option.id === selectedStatus)?.name || ""}
                            error={errors.status}
                        />
                    </div>

                    <div className="">
                        <div className="flex items-center">
                            <LabeledInput
                                label="Project Phase"
                                inputPlaceholder="Enter phase name"
                                inputValue={newPhaseName}
                                addAgent={true}
                                onInputChange={handleNewPhaseNameChange}
                                error={errors.phases}
                            />
                            <button
                                onClick={handleAddPhase}
                                className="ml-2 mt-4 bg-[#0C79F7] text-white rounded-full hover:bg-blue-600"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full mb-4">
                    <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Project Description"} Fontsize={10} mb={2} />
                    <textarea
                        type="text"
                        placeholder="Enter project details..."
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            if (e.target.value.trim()) setErrors((prev) => ({ ...prev, description: false }));
                        }}
                        className="mt-1 p-3 w-full mb-5"
                        rows={4}
                        style={{
                            border: errors.description ? "1px solid #ef4444" : "1px solid var(--sidebar-selected-bg)",
                            fontSize: 14,
                            borderRadius: 8,
                            backgroundColor: "var(--dashboard-tab-box)",
                            color: "var(--sidebar-text-primary)",
                        }}
                    />
                </div>

                {phases.map((phase, index) => {
                    const phaseColors = ["#9747FF", "#FF478A", "#00ACA1", "#4AC411"];
                    const backgroundColor = index < phaseColors.length ? phaseColors[index] : "rgba(62, 62, 62, 0.4)";

                    return (
                        <div key={phase.id} className="mb-6 border-b border-gray-200 pb-4">
                            <div className="flex items-center mb-3">
                                <div className="flex  px-2 py-1 gap-1 rounded-lg text-white mr-2" style={{ backgroundColor }}>
                                    {phase.name}
                                    <button
                                        onClick={() => handleRemovePhase(phase.id)}
                                        className="p-1 text-white rounded-full hover:bg-red-600"
                                    >
                                        <RxCrossCircled size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="">
                                    <Heading
                                        Fontweight={600}
                                        color={"var(--fieldsTitle)"}
                                        Heading={"Start Date"}
                                        Fontsize={10}
                                        mb={2}
                                    />
                                    <CustomDatePicker
                                        label={`${phase.name} Start Date`}
                                        value={phase.startDate}
                                        onChange={(date) => {
                                            handlePhaseChange(phase.id, "startDate", date);
                                            if (date) setErrors((prev) => ({ ...prev, [`phase.${phase.id}.startDate`]: false }));
                                        }}
                                        addAgent={true}
                                        fieldError={errors[`phase.${phase.id}.startDate`]}
                                    />
                                </div>

                                <div className="">
                                    <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"End Date"} Fontsize={10} mb={2} />
                                    <CustomDatePicker
                                        label={`${phase.name} End Date`}
                                        value={phase.endDate}
                                        onChange={(date) => {
                                            handlePhaseChange(phase.id, "endDate", date);
                                            if (date) setErrors((prev) => ({ ...prev, [`phase.${phase.id}.endDate`]: false }));
                                        }}
                                        addAgent={true}
                                        fieldError={errors[`phase.${phase.id}.endDate`]}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}


                <div className="flex justify-end mt-4">
                    <button onClick={handleSubmit} disabled={loading} className={`px-6 py-2 text-white rounded-lg ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#0C79F7] hover:bg-blue-600'}`}>
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TaskModal
