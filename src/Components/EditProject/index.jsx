"use client"

import { useEffect, useState } from "react"
import CustomDatePicker from "../CustomDatePicker"
import LabeledInput from "../LabeledInput"
import Heading from "../Heading"
import { Plus, X } from "lucide-react"
import { RxCrossCircled } from "react-icons/rx";
import { toast } from "react-toastify"
import { deleteRequest, deleteRequestWithBody, getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { useSelector } from "react-redux"
import DropdownMenu from "../dropdownMenu"
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

const EditProject = ({
    isOpen,
    onClose,
    task
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [selectedStatus, setSelectedStatus] = useState("pending")
    const [projectTitle, setProjectTitle] = useState("")
    const [phases, setPhases] = useState([])
    const [deletePhase, setDeletePhase] = useState([])
    const [newPhaseName, setNewPhaseName] = useState("")
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedPriority, setSelectedPriority] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [taskDetail, setTaskDetail] = useState(null);

    if (!isOpen) return null

    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}project/${task.id}`, accessToken
        )
            .then(result => {
                setTaskDetail(result?.data)
                if (result?.data) {
                    setProjectTitle(result?.data.name || "");
                    setDescription(result?.data.description || "");
                    setSelectedStatus(result?.data.status || "pending");
                    setSelectedPriority(result?.data.priority || "low");

                    // Convert ISO strings to JavaScript Date objects or formatted dates
                    setStartDate(result?.data.startDate ? new Date(result?.data.startDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : null);
                    setEndDate(result?.data.endDate ? new Date(result?.data.endDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : null);

                    const formattedPhases = (result?.data.phases || []).map((phase) => ({
                        id: phase.id,
                        name: phase.phase || "",
                        description: phase.description || "",
                        status: phase.status || "active",
                        priority: phase.priority || "low",
                        startDate: phase.startDate ? new Date(phase.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }) : null,
                        endDate: phase.endDate ? new Date(phase.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }) : null,
                    }));

                    setPhases(formattedPhases);
                }
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
    const selectedStatusTitle = statusOptions.find(status => status.id === selectedStatus)?.name || "";
    const selectedPriorityTitle = priorityOptions.find(status => status.id === selectedPriority)?.name || "";

    const handleTitleChange = (e) => {
        setProjectTitle(e.target.value)
    }
    const handleNewPhaseNameChange = (e) => {
        setNewPhaseName(e.target.value);
    };
    const handleStartDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setStartDate(formattedDate);
    };
    const handleEndDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setEndDate(formattedDate);
    };
    const handleAddPhase = () => {
        if (newPhaseName.trim()) {
            const newPhase = {
                // id: phases.length + 1,
                name: newPhaseName,
                description: "",
                status: "active",
                priority: "low",
                startDate: new Date(),
                endDate: new Date(),
            }
            setPhases([...phases, newPhase])
            setNewPhaseName("")
        }
    }

    const handleRemovePhase = (id) => {
        setPhases(phases.filter((phase) => phase.id !== id))
        setDeletePhase([...deletePhase, id])
    }

    const handlePhaseChange = (id, field, value) => {
        setPhases(phases.map((phase) => (phase.id === id ? { ...phase, [field]: value } : phase)))
    }
    const handleSubmit = async () => {
        // Enhanced validation checks
        const missingFields = [];
        if (projectTitle.trim() === "") missingFields.push("Project Title");
        if (description.trim() === "") missingFields.push("Description");
        if (selectedStatus === "") missingFields.push("Status");
        if (selectedPriority === "") missingFields.push("Priority");
        if (startDate === null) missingFields.push("Start Date");
        if (endDate === null) missingFields.push("End Date");

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

        if (dayjs(endDate).isSameOrBefore(dayjs(startDate))) {
            toast.error("End Date must be after Start Date.");
            return;
        }

        if (phases.length === 0) {
            toast.error("At least one phase is required");
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

            if (dayjs(phase.endDate).isSameOrBefore(dayjs(phase.startDate))) {
                toast.error(`End date must be after start date for phase: ${phase.name}`);
                return;
            }
        }

        // Validate project data
        if (!task || !task.id) {
            toast.error("Project information not available");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        setLoading(true);
        try {
            // Delete phases with error handling
            if (deletePhase.length > 0) {
                for (const phaseId of deletePhase) {
                    try {
                        await deleteRequest(`${baseURl}project-phase/${phaseId}`, accessToken);
                    } catch (deleteError) {
                        console.warn(`Failed to delete phase ${phaseId}:`, deleteError);
                        // Continue with other deletions even if one fails
                    }
                }
            }

            const payload = {
                name: projectTitle,
                description: description,
                status: selectedStatus,
                priority: selectedPriority,
                startDate: startDate,
                endDate: endDate,
                phases: phases.map((phase) => {
                    const phaseObj = {
                        phase: phase.name,
                        description: phase.description,
                        status: phase.status,
                        priority: phase.priority,
                        startDate: phase.startDate,
                        endDate: phase.endDate,
                    };

                    if (phase.id !== undefined) {
                        phaseObj.id = phase.id;
                    }

                    return phaseObj;
                }),
            };

            // Validate payload before sending
            if (!payload.name || !payload.description) {
                toast.error("Invalid project data");
                return;
            }

            const result = await putRequestWithBodyAndToken(`${baseURl}project/${task.id}`, accessToken, payload);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);
            setProjectTitle("");
            setDescription("");
            setSelectedPriority("");
            setSelectedStatus("pending");
            setStartDate(null);
            setEndDate(null);
            setPhases([]);
            onClose();
        } catch (error) {
            console.error('Project update error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid project data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to update this project");
                } else if (status === 404) {
                    toast.error("Project not found or may have been deleted");
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
        <div className="fixed inset-0 flex items-center justify-center  z-504 bg-black bg-opacity-30" style={{ zIndex: 2000 }}>
            <div className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-xl text-[var(--sidebar-text-primary)]">
                    ×
                </button>

                <h2 className="text-xl font-semibold mb-4 text-[var(--sidebar-text-primary)]">Project Details</h2>

                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="">
                        <LabeledInput
                            label="Project Title"
                            inputPlaceholder="Enter name"
                            inputValue={projectTitle}
                            addAgent={true}
                            onInputChange={handleTitleChange}
                        />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Start Date"} Fontsize={10} mb={2} />
                        <CustomDatePicker label="Start Date" value={startDate} onChange={handleStartDateChange} addAgent={true} />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"End Date"} Fontsize={10} mb={2} />
                        <CustomDatePicker label="End Date" value={endDate} onChange={handleEndDateChange} addAgent={true} />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Priority"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Priority"
                            menuItems={priorityOptions}
                            defaultText="--select priority--"
                            onSelect={setSelectedPriority}
                            addAgent={true}
                            idSet={true}
                            selectedValue={selectedPriorityTitle}
                        />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Status"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Status"
                            menuItems={statusOptions}
                            defaultText="--select status--"
                            onSelect={setSelectedStatus}
                            selectedValue={selectedStatusTitle}
                            addAgent={true}
                            idSet={true}
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
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 p-3 w-full mb-5"
                        rows={4}
                        style={{
                            border: "1px solid var(--sidebar-selected-bg)",
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
                                        onChange={(date) => handlePhaseChange(phase.id, "startDate", date)}
                                        addAgent={true}
                                    />
                                </div>

                                <div className="">
                                    <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"End Date"} Fontsize={10} mb={2} />
                                    <CustomDatePicker
                                        label={`${phase.name} End Date`}
                                        value={phase.endDate}
                                        onChange={(date) => handlePhaseChange(phase.id, "endDate", date)}
                                        addAgent={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}


                <div className="flex justify-end mt-4">
                    <button onClick={handleSubmit} disabled={loading} className={`px-6 py-2 text-white rounded-lg ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#0C79F7] hover:bg-blue-600'}`}>
                        {loading ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EditProject