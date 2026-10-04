"use client"

import { useEffect, useState } from "react"
import CustomDatePicker from "../CustomDatePicker"
import LabeledInput from "../LabeledInput"
import Heading from "../Heading"
import { Plus, X } from "lucide-react"
import { RxCrossCircled } from "react-icons/rx";
import { getRequestWithOutBody, getRequestWithOutBodyCached, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import DropdownMenu from "../dropdownMenu"
import attachFile from "../../assets/attachFile.png"
import moment from "moment"
import dayjs from "dayjs"
import BottonCustom from "../ButtonCustom"
import FileUpload from "../FileUpload"

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

const AddNewTask = ({
    isOpen,
    onClose,
    projectDetail,
    projectName,
    parentId,
    onSuccess,
    task
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [selectedStatus, setSelectedStatus] = useState("pending")
    const [selectedPhaseId, setSelectedPhaseId] = useState(null)
    const [selectedTaskType, setSelectedTaskType] = useState(null)
    const [selectedTaskLevel, setSelectedTaskLevel] = useState(null)
    const [selectedTaskEstimation, setSelectedTaskEstimation] = useState(null)
    const [projectTitle, setProjectTitle] = useState("")
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedPriority, setSelectedPriority] = useState('');
    const [description, setDescription] = useState('');
    const [selectedAssignTo, setSelectedAssignTo] = useState(null)
    const [userList, setUserList] = useState([])
    const [taskType, setTaskType] = useState([])
    const [taskLevel, setTaskLevel] = useState([])
    const [taskEstimation, setTaskEstimation] = useState([])
    const [loading, setLoading] = useState(false)
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [phaseName, setPhaseName] = useState("");
    const [taskTypeName, setTaskTypeName] = useState("");
    const [taskLevelName, setTaskLevelName] = useState("");
    const [selectedAssignToName, setSelectedAssignToName] = useState("");
    if (!isOpen) return null

    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };

    // Reset form when modal closes
    const handleClose = () => {
        setProjectTitle("");
        setDescription("");
        setSelectedPriority("");
        setSelectedStatus("pending");
        setStartDate(null);
        setEndDate(null);
        setSelectedAssignTo(null);
        setSelectedAssignToName("");
        setSelectedPhaseId(null);
        setPhaseName("");
        setTaskTypeName("");
        setTaskLevelName("");
        setSelectedTaskType(null);
        setSelectedTaskLevel(null);
        setUploadedFile(null);
        onClose();
    };

    const phaseOptions = Array.isArray(projectDetail)
        ? projectDetail.map((phase) => ({
            id: phase.id,
            name: phase.phase,
        }))
        : [];

    // Status options
    const statusOptions = [
        { id: "On Hold", name: "On Hold" },
        { id: "Pending", name: "Pending" },
        { id: "In Progress", name: "In Progress" },
        { id: "Completed", name: "Completed" },
        { id: "not-completed", name: "Not Completed" },
        { id: "Ready for QA", name: "Ready for QA" },
        { id: "Ready for Approval", name: "Ready for Approval" },
        { id: "UI Completed", name: "UI Completed" },
        { id: "API Completed", name: "API Completed" },
        { id: "Failed QA", name: "Failed QA" },
        { id: "Ready For Deployment", name: "Ready For Deployment" },
        { id: "QA In Progress", name: "QA In Progress" },
        { id: "Deployment Completed", name: "Deployment Completed" },
    ]
    const priorityOptions = [
        { id: "low", name: "Low" },
        { id: "medium", name: "Medium" },
        { id: "high", name: "High" },
    ]

    const fetchData2 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                const sortedUsers = activeUsers.sort((a, b) => a.name.localeCompare(b.name));
                setUserList(sortedUsers);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}task/types`, accessToken
        )
            .then(result => {
                setTaskType(result?.data)
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchData3 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}task/levels`, accessToken
        )
            .then(result => {
                setTaskLevel(result?.data)
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchData4 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}task/estimations`, accessToken
        )
            .then(result => {
                setTaskEstimation(result?.data)
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData2()
        fetchData()
        fetchData3()
        fetchData4()
    }, [])

    useEffect(() => {
        if (!task || !isOpen) return;

        if (task.phaseId) {
            setSelectedPhaseId(task.phaseId);
            const phaseName = projectDetail?.find((phase) => phase.id === task.phaseId)?.phase;
            if (phaseName) setPhaseName(phaseName);
        }


        // Task Type
        if (task.taskTypeId) {
            setSelectedTaskType(task.taskTypeId);
            const typeName = taskType?.find((type) => type.id === task.taskTypeId)?.type;
            if (typeName) setTaskTypeName(typeName);
        }

        // Task Level
        if (task.taskLevelId) {
            setSelectedTaskLevel(task.taskLevelId);
            const levelName = taskLevel?.find((level) => level.id === task.taskLevelId)?.level;
            if (levelName) setTaskLevelName(levelName);
        }

        // Priority
        if (task.priority) {
            setSelectedPriority(task.priority);
        }

        // Status → always Pending for new subtask
        setSelectedStatus("Pending");

        // Assign To → same user as parent
        if (task.assignee?.user) {
            setSelectedAssignTo(task.assignee.user.id);
            setSelectedAssignToName(task.assignee.user.name);
        } else if (task.assignments?.length > 0) {
            setSelectedAssignTo(task.assignments[0]?.user?.id);
            setSelectedAssignToName(task.assignments[0]?.user?.name);
        }
    }, [task, isOpen, projectDetail, taskType, taskLevel]);


    useEffect(() => {
        if (startDate && selectedTaskType && selectedTaskLevel) {
            const match = taskEstimation.find(
                (item) =>
                    item.taskType.id === selectedTaskType &&
                    item.taskLevel.id === selectedTaskLevel
            );

            if (match) {
                const estimatedDays = match.estimatedDays;
                const estimatedId = match.id;
                const newEndDate = moment(startDate).add(estimatedDays, 'days').format('YYYY-MM-DD');
                setEndDate(newEndDate);
                setSelectedTaskEstimation(estimatedId);
            } else {
                setEndDate('');
                setSelectedTaskEstimation(null);
            }
        }
    }, [startDate, selectedTaskType, selectedTaskLevel, taskEstimation]);


    const handleTitleChange = (e) => {
        setProjectTitle(e.target.value)
    }
    const handleNewPhaseNameChange = (e) => {
        setNewPhaseName(e.target.value);
    };
    const handleSelectionChange = (items) => {
        setSelectedAssignTo(items);
    };

    const handleSubmit = async () => {
        setLoading(true);

        if (
            projectTitle.trim() === "" ||
            description.trim() === "" ||
            selectedStatus === "" ||
            selectedPriority === "" ||
            startDate === null ||
            !selectedAssignTo ||
            !selectedTaskType ||
            !selectedTaskLevel ||
            !selectedPhaseId
        ) {
            toast.error("All fields are required");
            setLoading(false);
            return;
        }

        const startYear = dayjs(startDate).year();
        const endYear = dayjs(endDate).year();

        if (startYear < 1900 || startYear > 2100 || endYear < 1900 || endYear > 2100) {
            toast.error("Please select a valid date.");
            setLoading(false);
            return;
        }

        if (endDate < startDate) {
            toast.error("End Date must be after Start Date.");
            setLoading(false);
            return;
        }
        try {
            const uploadedFileResults = []; // Step 3: Array to hold results of uploaded files

            // Check if uploadedFile is an array and has files
            if (Array.isArray(uploadedFile) && uploadedFile.length > 0) { // {{ edit_1 }}
                for (const file of uploadedFile) { // Step 4: Loop through each file
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'tickets');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                    uploadedFileResults.push({ // Step 5: Store each result
                        url: result1?.data?.uploadedFiles?.url,
                        mimetype: result1?.data?.uploadedFiles?.mimetype,
                        originalname: result1?.data?.uploadedFiles?.originalname,
                    });
                }
            }

            let finalParentId = parentId;
            let createdParentId = null;

            // ✅ Convert pseudo-main to real parent BEFORE creating the new subtask
            // Condition: current item is a subtask and has no parent (parentId is null)
            if (task?.isSubtask === true && (task?.parentId === null || task?.parentId === undefined)) {
                try {

                    // New approach: use convert-subtask API which preserves previous details
                    const url = `${baseURl}task/convert-subtask/${task?.id}`;
                    const convertRes = await putRequestWithBodyAndToken(url, accessToken, {});
                    // API returns new parent under data.task
                    const newParentId = convertRes?.data?.task?.id;
                    if (newParentId) {
                        finalParentId = newParentId;
                        createdParentId = newParentId;
                    }
                    // Show response (no routing)
                    toast.success(convertRes?.message || 'Converted successfully');
                } catch (e) {
                    toast.error(e?.message || 'Failed to convert');
                }
            }

            // Create payload
            const payload = {
                title: projectTitle,
                description: description,
                taskTypeId: selectedTaskType,
                taskLevelId: selectedTaskLevel,
                taskEstimateId: selectedTaskEstimation,
                status: selectedStatus || 'Pending',
                priority: selectedPriority || 'medium',
                startDate: moment(startDate).format('MM/DD/YYYY'),
                endDate: moment(endDate).format('MM/DD/YYYY'),
                files: uploadedFileResults || null, // Optional, can be modified to accept file uploads
                projectId: projectDetail[0]?.projectId?.toString() || "0", // Ensure it's a string
                projectName: projectName,
                phaseId: selectedPhaseId,
                assignedBy: userData?.id, // Replace with actual assigner ID if dynamic
                createdBy: userData?.id, // Replace with actual assigner ID if dynamic
                assignee: selectedAssignTo,
                parentId: finalParentId
            };

            const result = await postRequestWithBodyAndToken(`${baseURl}subtask`, accessToken, payload)
            toast.success(result.message);
            // Reset form and close modal
            handleClose();
            onSuccess(createdParentId);
        }
        catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center  z-504 bg-black bg-opacity-30" style={{ zIndex: 9999 }}>
            <div className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <button onClick={handleClose} className="absolute top-4 right-4 text-xl text-[var(--sidebar-text-primary)]">
                    ×
                </button>

                <h2 className="text-xl font-semibold mb-4 text-[var(--sidebar-text-primary)]">Add New Sub Task</h2>

                <div className="flex flex-wrap gap-x-4  mb-2">
                    <div className="mb-2">
                        <LabeledInput
                            label="Task Name"
                            inputPlaceholder="Enter name"
                            inputValue={projectTitle}
                            addAgent={true}
                            onInputChange={handleTitleChange}

                        />
                    </div>
                    <div className="mb-2">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Phase"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Phase"
                            menuItems={phaseOptions}
                            defaultText="--select phase--"
                            onSelect={(id) => {
                                setSelectedPhaseId(id);
                                const phaseName = phaseOptions?.find((phase) => phase.id === id)?.name;
                                if (phaseName) setPhaseName(phaseName);
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={phaseName}
                        />
                    </div>
                    <div className="mb-2">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Task Type"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Task Type"
                            menuItems={taskType}
                            defaultText="--select task type--"
                            onSelect={(id) => {
                                setSelectedTaskType(id);
                                const typeName = taskType?.find((type) => type.id === id)?.type;
                                if (typeName) setTaskTypeName(typeName);
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={taskTypeName}
                        />
                    </div>
                    <div className="mb-2">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Task Level"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Task Level"
                            menuItems={taskLevel}
                            defaultText="--select task level--"
                            onSelect={(id) => {
                                setSelectedTaskLevel(id);
                                const levelName = taskLevel?.find((level) => level.id === id)?.level;
                                if (levelName) setTaskLevelName(levelName);
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={taskLevelName}
                        />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Start Date"} Fontsize={10} mb={2} />
                        <CustomDatePicker label="Start Date" selectedDate={startDate} onChange={setStartDate} addAgent={true} minDate={dayjs()} />
                    </div>

                    <div className="">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"End Date"} Fontsize={10} mb={2} />
                        <CustomDatePicker label="End Date" value={endDate} disabled={true} onChange={setEndDate} addAgent={true} />
                    </div>

                    <div className="mb-2">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Priority"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Priority"
                            menuItems={priorityOptions}
                            defaultText="--select priority--"
                            onSelect={setSelectedPriority}
                            addAgent={true}
                            idSet={true}
                            selectedValue={selectedPriority}
                        />
                    </div>

                    <div className="mb-2">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Status"} Fontsize={10} mb={2} />
                        <DropdownMenu
                            label="Status"
                            menuItems={statusOptions}
                            defaultText="--select status--"
                            onSelect={setSelectedStatus}
                            addAgent={true}
                            idSet={true}
                            selectedValue={selectedStatus}
                        />
                    </div>
                    <div className="mb-2">
                        <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Assign To"} Fontsize={10} mb={2} />

                        <DropdownMenu
                            label="Assign To"
                            menuItems={userList}
                            defaultText="--select assign To--"
                            onSelect={(id) => {
                                setSelectedAssignTo(id);
                                const userName = userList?.find((user) => user.id === id)?.name;
                                if (userName) setSelectedAssignToName(userName);
                            }}
                            addAgent={true}
                            searchable={true}
                            idSet={true}
                            selectedValue={selectedAssignToName}
                        />
                    </div>

                </div>

                <div className="w-full mt-2 -mb-3">
                    <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Task Description"} Fontsize={10} />
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

                <FileUpload onFileChange={handleFileUpload} />

                <div className="flex justify-end mt-4">
                    <button onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2 text-white rounded-lg ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#0C79F7] hover:bg-blue-600'}`}>
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddNewTask