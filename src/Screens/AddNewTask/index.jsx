"use client"

import { useEffect, useState } from "react"
import LabeledInput from "../../Components/LabeledInput";
import Heading from "../../Components/Heading";
import { Plus, X } from "lucide-react"
import { RxCrossCircled } from "react-icons/rx";
import { getRequestWithOutBody, getRequestWithOutBodyCached, postRequestWithBodyAndToken, postRequestWithFormData } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import attachFile from "../../assets/attachFile.png"
import moment from "moment"
import dayjs from "dayjs"
import BottonCustom from "../../Components/ButtonCustom"
import FileUpload from "../../Components/FileUpload"
import styled from "styled-components";
import { IoIosArrowBack } from "react-icons/io";
import CustomDatePicker from "../../Components/CustomDatePicker";
import GoBack from "../../Components/GoBack"
import DropdownMenu from "../../Components/dropdownMenu"
import { useNavigate, useLocation } from "react-router-dom";
import { setTaskDetailSidebarRoute } from "../../Utils/taskDetailSidebarRoute";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10,
    zIndex: 100, // ✅ ensure clickable
});

const HeaderWrapper2 = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    zIndex: 101, // ✅ above
});

// Helper function to build task detail URL
const buildTaskDetailUrl = (task, projectName) => {
    const taskProjectName = task?.project?.name || projectName;
    const urlProjectName = taskProjectName?.replace(/\s+/g, '-').toLowerCase();
    return urlProjectName
        ? `/home/taskDetail/${urlProjectName}/${task.id}`
        : `/home/taskDetail/${task.id}`;
};

const AddNewTask = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const location = useLocation();
    const navigate = useNavigate();

    const projectDetail = location?.state?.projectDetail
    const projectName = location?.state?.projectName

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
    const [uploadedFile, setUploadedFile] = useState(null);
    const [subtask, setSubtask] = useState([]);

    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };

    const addSubTask = () => {
        setSubtask((prev) => [
            ...prev,
            {
                title: projectTitle,
                description,
                status: selectedStatus,
                priority: selectedPriority,
                startDate,
                endDate,
                assignTo: selectedAssignTo,
                phaseId: selectedPhaseId,
                taskType: selectedTaskType,
                taskLevel: selectedTaskLevel,
                taskEstimation: selectedTaskEstimation,
                files: uploadedFile ? (Array.isArray(uploadedFile) ? uploadedFile : [uploadedFile]) : [],
            },
        ]);
    };

    const handleSubTaskChange = (index, key, value) => {
        setSubtask((prev) =>
            prev.map((task, i) => (i === index ? { ...task, [key]: value } : task))
        );
    };
    const handleSubTaskFileUpload = (index, files) => {
        setSubtask((prev) =>
          prev.map((task, i) =>
            i === index
              ? {
                  ...task,
                  files: Array.isArray(files)
                    ? [...(task.files || []), ...files]
                    : [...(task.files || []), files],
                }
              : task
          )
        );
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
                setUserList(activeUsers);
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

    // Helper function to add business days (excluding weekends)
    const addBusinessDays = (startDate, businessDays) => {
        let currentDate = moment(startDate);
        let daysAdded = 0;
        
        while (daysAdded < businessDays) {
            currentDate = currentDate.add(1, 'day');
            // Check if it's a weekday (Monday = 1, Friday = 5)
            const dayOfWeek = currentDate.day();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
                daysAdded++;
            }
        }
        
        return currentDate.format('YYYY-MM-DD');
    };

    // Find and save taskEstimationId when taskType and taskLevel are selected (startDate not required)
    useEffect(() => {
        if (selectedTaskType && selectedTaskLevel) {
            const match = taskEstimation.find(
                (item) =>
                    item.taskType.id === selectedTaskType &&
                    item.taskLevel.id === selectedTaskLevel
            );

            if (match) {
                const estimatedId = match.id;
                setSelectedTaskEstimation(estimatedId);
                // Only calculate endDate if startDate is available
                if (startDate) {
                    const estimatedDays = match.estimatedDays;
                    const newEndDate = addBusinessDays(startDate, estimatedDays);
                    setEndDate(newEndDate);
                }
            } else {
                setSelectedTaskEstimation(null);
                if (!startDate) {
                    setEndDate('');
                }
            }
        }
    }, [selectedTaskType, selectedTaskLevel, taskEstimation, startDate]);

    // Calculate endDate when status is set to "In Progress" and we have startDate and taskEstimationId
    useEffect(() => {
        if (selectedStatus === "In Progress" && selectedTaskEstimation) {
            const newStartDate = moment().local().format('YYYY-MM-DD');
            setStartDate(newStartDate);
            const match = taskEstimation.find(
                (item) => item.id === selectedTaskEstimation
            );
            if (match) {
                const estimatedDays = match.estimatedDays;
                // Use the new startDate value directly instead of the state
                const newEndDate = addBusinessDays(newStartDate, estimatedDays);
                setEndDate(newEndDate);
            }
        } else {
            // setStartDate(null);
            // setEndDate(null);
        }
    }, [selectedStatus, selectedTaskEstimation, taskEstimation]);

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
        // Enhanced validation checks
        const missingFields = [];
        if (projectTitle.trim() === "") missingFields.push("Title");
        if (description.trim() === "") missingFields.push("Description");
        if (!selectedStatus) missingFields.push("Status");
        if (!selectedPhaseId) missingFields.push("Phase");
        if (!selectedTaskType) missingFields.push("Task Type");
        if (!selectedTaskLevel) missingFields.push("Task Level");
        if (!selectedAssignTo || selectedAssignTo.length === 0) missingFields.push("Assignee");
        if (!startDate) missingFields.push("Start Date");
        if (!endDate) missingFields.push("End Date");

        if (missingFields.length > 0) {
            toast.error(`Please fill: ${missingFields.join(", ")}`);
            return;
        }

        // Enhanced date validation
        if (startDate) {
            const startYear = dayjs(startDate).year();
            if (startYear < 1900 || startYear > 2100) {
                toast.error("Please select a valid start date.");
                return;
            }
        }
        
        if (endDate) {
            const endYear = dayjs(endDate).year();
            if (endYear < 1900 || endYear > 2100) {
                toast.error("Please select a valid end date.");
                return;
            }
        }
      
        if (endDate && startDate && endDate < startDate) {
            toast.error("End Date must be after Start Date.");
            return;
        }

        // Validate project data
        if (!projectDetail || projectDetail.length === 0) {
            toast.error("Project information not available");
            return;
        }

        if (!userData || !userData.id) {
            toast.error("User information not available");
            return;
        }

        setLoading(true);
        try {
            const uploadedFileResults = [];
      
            // Upload main files with error handling
            if (Array.isArray(uploadedFile) && uploadedFile.length > 0) {
                for (const file of uploadedFile) {
                    if (!file) {
                        toast.error("Invalid file detected");
                        return;
                    }
                    
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", "tickets");
      
                    try {
                        const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                        
                        if (!result1?.data?.uploadedFiles) {
                            toast.error(`Failed to upload file: ${file.name}`);
                            return;
                        }
                        
                        uploadedFileResults.push({
                            url: result1.data.uploadedFiles.url,
                            mimetype: result1.data.uploadedFiles.mimetype,
                            originalname: result1.data.uploadedFiles.originalname,
                        });
                    } catch (fileError) {
                        toast.error(`Failed to upload file: ${file.name}. ${fileError.message}`);
                        return;
                    }
                }
            }
      
            // If NO subtasks → direct to /subtask with ParentId = null
            if (subtask.length === 0) {
                const payload = {
                    title: projectTitle,
                    description,
                    taskTypeId: selectedTaskType,
                    taskLevelId: selectedTaskLevel,
                    taskEstimateId: selectedTaskEstimation,
                    status: selectedStatus || "Pending",
                    priority: selectedPriority || "medium",
                    ...(startDate && { startDate: moment(startDate).format('YYYY-MM-DD') }),
                    ...(endDate && { endDate: moment(endDate).format('YYYY-MM-DD') }),
                    files: uploadedFileResults || null,
                    projectId: projectDetail[0]?.projectId?.toString() || "0",
                    projectName,
                    phaseId: selectedPhaseId,
                    assignedBy: userData?.id,
                    createdBy: userData?.id,
                    assignee: selectedAssignTo,
                    parentId: null,
                };

                // Validate payload before sending
                if (!payload.title || !payload.description || !payload.taskTypeId || !payload.taskLevelId) {
                    toast.error("Invalid task data");
                    return;
                }

                if (!accessToken) {
                    toast.error("Authentication token not available");
                    return;
                }
      
                const result = await postRequestWithBodyAndToken(`${baseURl}subtask`, accessToken, payload);
                
                if (!result || !result.message) {
                    toast.error("Invalid response from server");
                    return;
                }
                
                toast.success(result.message);
                
                // Navigate to the newly created task detail page
                const newTask = result?.subtask || result?.task;
                if (newTask) {
                    setTaskDetailSidebarRoute('projectTracking');
                    const taskDetailUrl = buildTaskDetailUrl(newTask, projectName);
                    navigate(taskDetailUrl, { state: { itemData: newTask, projectName, fromRoute: 'projectTracking' } });
                    return;
                }
            } else {
                // Otherwise first create main task
                const mainTaskPayload = {
                    title: projectTitle,
                    description,
                    taskTypeId: selectedTaskType,
                    taskLevelId: selectedTaskLevel,
                    taskEstimateId: selectedTaskEstimation,
                    status: selectedStatus || "Pending",
                    priority: selectedPriority || "medium",
                    ...(startDate && { startDate: moment(startDate).format('YYYY-MM-DD') }),
                    ...(endDate && { endDate: moment(endDate).format('YYYY-MM-DD') }),
                    files: uploadedFileResults || null,
                    projectId: projectDetail[0]?.projectId?.toString() || "0",
                    projectName,
                    phaseId: selectedPhaseId,
                    assignedBy: userData?.id,
                    createdBy: userData?.id,
                };

                // Validate main task payload
                if (!mainTaskPayload.title || !mainTaskPayload.description) {
                    toast.error("Invalid main task data");
                    return;
                }
      
                const taskResult = await postRequestWithBodyAndToken(`${baseURl}task`, accessToken, mainTaskPayload);
                
                if (!taskResult || !taskResult.task) {
                    toast.error("Failed to create main task");
                    return;
                }
      
                const parentId = taskResult.task.id;
      
                // Then create each subtask with ParentId = main task id
                for (const sTask of subtask) {
                    if (!sTask.title || !sTask.description) {
                        toast.error(`Invalid subtask data for: ${sTask.title || 'Untitled'}`);
                        return;
                    }

                    const subFiles = [];
      
                    if (Array.isArray(sTask.files) && sTask.files.length > 0) {
                        for (const file of sTask.files) {
                            if (!file) {
                                toast.error(`Invalid file in subtask: ${sTask.title}`);
                                return;
                            }
                            
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("type", "tickets");
      
                            try {
                                const uploadRes = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                                
                                if (!uploadRes?.data?.uploadedFiles) {
                                    toast.error(`Failed to upload file for subtask: ${sTask.title}`);
                                    return;
                                }
                                
                                subFiles.push({
                                    url: uploadRes.data.uploadedFiles.url,
                                    mimetype: uploadRes.data.uploadedFiles.mimetype,
                                    originalname: uploadRes.data.uploadedFiles.originalname,
                                });
                            } catch (fileError) {
                                toast.error(`Failed to upload file for subtask: ${sTask.title}. ${fileError.message}`);
                                return;
                            }
                        }
                    }
      
                    const subtaskPayload = {
                        title: sTask.title,
                        description: sTask.description,
                        taskTypeId: sTask.taskType,
                        taskLevelId: sTask.taskLevel,
                        taskEstimateId: sTask.taskEstimation,
                        status: sTask.status || "Pending",
                        priority: sTask.priority || "medium",
                        ...(sTask.startDate && { startDate: moment(sTask.startDate).format('YYYY-MM-DD') }),
                        ...(sTask.endDate && { endDate: moment(sTask.endDate).format('YYYY-MM-DD') }),
                        files: subFiles || null,
                        projectId: projectDetail[0]?.projectId?.toString() || "0",
                        projectName,
                        phaseId: sTask.phaseId,
                        assignedBy: userData?.id,
                        createdBy: userData?.id,
                        assignee: sTask.assignTo,
                        parentId,
                    };

                    // Validate subtask payload
                    if (!subtaskPayload.title || !subtaskPayload.description) {
                        toast.error(`Invalid subtask payload: ${sTask.title}`);
                        return;
                    }
      
                    await postRequestWithBodyAndToken(`${baseURl}subtask`, accessToken, subtaskPayload);
                }
      
                toast.success("Main task and subtasks created successfully!");
                
                // Navigate to the newly created main task detail page
                const newTask = taskResult?.task;
                if (newTask) {
                    setTaskDetailSidebarRoute('projectTracking');
                    const taskDetailUrl = buildTaskDetailUrl(newTask, projectName);
                    navigate(taskDetailUrl, { state: { itemData: newTask, projectName, fromRoute: 'projectTracking' } });
                    return;
                }
            }
      
            // Reset form after success
            setProjectTitle("");
            setDescription("");
            setSelectedPriority("");
            setSelectedStatus("pending");
            setStartDate(null);
            setEndDate(null);
            setSelectedAssignTo([]);
            setSelectedPhaseId(null);
            setSubtask([]);
        } catch (error) {
            console.error('Task creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid task data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create tasks");
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
      };
      

    const handleGoBack = () => {
        navigate(-1, { state: { activeTab: 'list' } })
    };

    const handleRemoveSubTask = (indexToRemove) => {
        setSubtask((prev) => prev.filter((_, i) => i !== indexToRemove));
    };

    return (
        <div
            className="min-h-screen"
            style={{
                marginTop: -65,
                backgroundColor: "var(--dashboard-bg)",
                padding: 10,
            }}
        >
            <HeaderWrapper>
                <HeaderWrapper2 onClick={handleGoBack}>
                    <IoIosArrowBack size={20} color="var(--sidebar-text-primary)" />
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Add New Task'}
                        Fontsize={24}
                    />
                </HeaderWrapper2>

                {/* Right Side - Add Sub Task Button */}
                <div className="flex justify-end">
                    <button
                        onClick={addSubTask}
                        disabled={loading}
                        className={`px-4 py-2 text-white rounded-lg ${
                            loading
                                ? "bg-blue-300 cursor-not-allowed"
                                : "bg-[#0C79F7] hover:bg-blue-600"
                        }`}
                    >
                        Add Sub Task
                    </button>
                </div>
            </HeaderWrapper>

            <div className="flex flex-col lg:flex-row flex-1 gap-6">
                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="p-4 sm:p-6 w-full task-detail-container" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                        <style jsx>{`
                            .task-detail-container .MuiButton-root {
                                border-radius: 12px !important;
                                padding: 10px 16px !important;
                                font-weight: 500 !important;
                                background-color: var(--dashboard-tab-box) !important;
                                color: var(--dashboard-text-primary) !important;
                                border: 1px solid var(--sidebar-selected-bg) !important;
                                transition: all 0.2s ease-in-out !important;
                                min-height: 44px !important;
                                font-size: 14px !important;
                            }
                            .task-detail-container .MuiButton-root:hover {
                                background-color: var(--dashboard-card-bg2) !important;
                                border-color: var(--sidebar-selected-bg) !important;
                                transform: translateY(-1px) !important;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                            }
                            .task-detail-container .MuiButton-root .MuiButton-endIcon {
                                color: var(--dashboard-text-secondary) !important;
                                transition: transform 0.2s ease-in-out !important;
                            }
                            .task-detail-container .MuiButton-root:hover .MuiButton-endIcon {
                                transform: rotate(180deg) !important;
                            }
                            .task-detail-container .MuiPaper-root {
                                border-radius: 12px !important;
                                margin-top: 8px !important;
                                max-height: 300px !important;
                                background-color: var(--dashboard-tab-box) !important;
                                color: var(--dashboard-text-primary) !important;
                                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 10px rgba(0, 0, 0, 0.05) !important;
                                border: 1px solid var(--sidebar-selected-bg) !important;
                            }
                            .task-detail-container .MuiMenuItem-root {
                                padding: 10px 16px !important;
                                font-size: 14px !important;
                                font-weight: 500 !important;
                                color: var(--dashboard-text-primary) !important;
                                border-radius: 8px !important;
                                margin: 2px 8px !important;
                                transition: all 0.2s ease-in-out !important;
                            }
                            .task-detail-container .MuiMenuItem-root:hover {
                                background-color: var(--sidebar-hover-bg) !important;
                                color: var(--dashboard-text-primary) !important;
                            }
                            .task-detail-container .MuiMenuItem-root.Mui-selected {
                                background-color: rgba(72, 128, 255, 0.15) !important;
                                color: #0C79F7 !important;
                            }
                            .task-detail-container .MuiMenuItem-root.Mui-selected:hover {
                                background-color: rgba(72, 128, 255, 0.25) !important;
                            }
                            /* Custom Date Picker Styling for TaskDetail */
                            .task-detail-container .MuiOutlinedInput-root {
                                border-radius: 12px !important;
                                font-size: 14px !important;
                                font-weight: 500 !important;
                                background-color: var(--dashboard-tab-box) !important;
                                color: var(--dashboard-text-primary) !important;
                                transition: all 0.2s ease-in-out !important;
                                min-height: 44px !important;
                            }
                            .task-detail-container .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
                                border-color: var(--sidebar-selected-bg) !important;
                                border-radius: 12px !important;
                            }
                            .task-detail-container .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
                                border-color: var(--sidebar-selected-bg) !important;
                            }
                            .task-detail-container .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
                                border-color: #0C79F7 !important;
                                box-shadow: 0 0 0 3px rgba(72, 128, 255, 0.15) !important;
                            }
                            .task-detail-container .MuiOutlinedInput-root .MuiInputBase-input {
                                color: var(--dashboard-text-primary) !important;
                            }
                            .task-detail-container .MuiSvgIcon-root {
                                color: var(--dashboard-text-secondary) !important;
                                width: 20px !important;
                                height: 20px !important;
                                transition: color 0.2s ease-in-out !important;
                            }
                            .task-detail-container .MuiIconButton-root:hover .MuiSvgIcon-root {
                                color: #0C79F7 !important;
                            }
                        `}</style>

                        {/* Task Title Section */}
                        <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
                                Create New Task
                            </h2>
                        </div>

                        {/* Task Details Section */}
                        <div className="mb-6 p-4 sm:p-6 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Task Information</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Task Name - Full Width */}
                                <div className="col-span-full">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Name
                                    </label>
                                    <input
                                        type="text"
                                        value={projectTitle}
                                        onChange={handleTitleChange}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white transition-colors bg-white dark:bg-gray-700"
                                        placeholder="Enter task name"
                                    />
                                </div>

                                {/* Task Description */}
                                <div className="mb-6 col-span-full">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Description
                                    </label>
                                    <textarea
                                        placeholder="Enter task details..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value.slice(0, 2500))}
                                        maxLength={2500}
                                        rows={5}
                                        className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white transition-colors bg-white dark:bg-gray-700"
                                        style={{
                                            fontSize: 14,
                                            resize: "vertical",
                                        }}
                                    />
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {description.length}/2500 characters
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Task Classification Section */}
                        <div className="p-4 rounded-lg bg-white dark:bg-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Task Classification</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Phase
                                    </label>
                                    <div className="relative">
                                        <DropdownMenu
                                            label="Phase"
                                            menuItems={phaseOptions}
                                            defaultText="--select phase--"
                                            onSelect={(id) => setSelectedPhaseId(id)}
                                            addAgent={true}
                                            idSet={true}
                                            fullWidth={true}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Type
                                    </label>
                                    <div className="relative">
                                        <DropdownMenu
                                            label="Task Type"
                                            menuItems={taskType}
                                            defaultText="--select task type--"
                                            onSelect={(id) => setSelectedTaskType(id)}
                                            addAgent={true}
                                            idSet={true}
                                            fullWidth={true}
                                            searchable={true}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Level
                                    </label>
                                    <div className="relative">
                                        <DropdownMenu
                                            label="Task Level"
                                            menuItems={taskLevel}
                                            defaultText="--select task level--"
                                            onSelect={(id) => setSelectedTaskLevel(id)}
                                            addAgent={true}
                                            idSet={true}
                                            fullWidth={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule Section */}
                        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 mt-4 mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Schedule</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Start Date
                                    </label>
                                    <CustomDatePicker
                                        label="Start Date"
                                        value={startDate}
                                        onChange={setStartDate}
                                        addAgent={true}
                                        fullWidth={true}
                                        minDate={dayjs()}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        End Date
                                    </label>
                                    <CustomDatePicker
                                        label="End Date"
                                        value={endDate}
                                        disabled={true}
                                        onChange={setEndDate}
                                        addAgent={true}
                                        fullWidth={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status & Assignment Section */}
                        <div className="p-4 rounded-lg bg-white dark:bg-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Status & Assignment</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Priority
                                    </label>
                                    <DropdownMenu
                                        label="Priority"
                                        menuItems={priorityOptions}
                                        defaultText="--select priority--"
                                        onSelect={setSelectedPriority}
                                        taskDetails={true}
                                        idSet={true}
                                        fullWidth={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Status
                                    </label>
                                    <DropdownMenu
                                        label="Status"
                                        menuItems={statusOptions}
                                        defaultText="--select status--"
                                        onSelect={setSelectedStatus}
                                        taskDetails={true}
                                        idSet={true}
                                        fullWidth={true}
                                        searchable={true}
                                    />
                                </div>
                                {subtask.length === 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Assign To
                                        </label>
                                        <div className="relative">
                                            <DropdownMenu
                                                label="Assign To"
                                                menuItems={userList}
                                                defaultText="--select assignee--"
                                                onSelect={setSelectedAssignTo}
                                                addAgent={true}
                                                idSet={true}
                                                searchable={true}
                                                fullWidth={true}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Attachments</h3>
                            <FileUpload onFileChange={handleFileUpload} />
                        </div>

                    </div>
                </div>

                {/* Right Sidebar - Additional Options */}
                <div className="w-full lg:w-96 xl:w-[480px] 2xl:w-[520px] space-y-6">
                    <div className="p-4 sm:p-6 w-full task-detail-container" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h3>
                        
                        {/* Subtasks Summary */}
                        {subtask.length > 0 && (
                            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Subtasks ({subtask.length})
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    You have {subtask.length} subtask{subtask.length > 1 ? 's' : ''} configured
                                </p>
                            </div>
                        )}

                        {/* Form Summary */}
                        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                            <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Form Summary
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Task Name:</span>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                                        {projectTitle || 'Not set'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                                        {selectedStatus || 'Not set'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                                        {selectedPriority || 'Not set'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Assignee:</span>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                                        {selectedAssignTo ? 'Selected' : 'Not set'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtasks Section */}
            {subtask?.map((task, index) => (
                <div
                    key={index}
                    className="mt-6"
                >
                    <div className="p-4 sm:p-6 w-full task-detail-container" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                Sub Task {index + 1}
                            </h3>
                            <button
                                onClick={() => handleRemoveSubTask(index)}
                                className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors text-lg font-bold"
                                title="Remove subtask"
                            >
                                ×
                            </button>
                        </div>

                        {/* Subtask Information */}
                        <div className="mb-6 p-4 sm:p-6 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Task Name - Full Width */}
                                <div className="col-span-full">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Name
                                    </label>
                                    <input
                                        type="text"
                                        value={task.title}
                                        onChange={(e) => handleSubTaskChange(index, "title", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white transition-colors bg-white dark:bg-gray-700"
                                        placeholder="Enter task name"
                                    />
                                </div>

                                {/* Task Description */}
                                <div className="mb-6 col-span-full">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Description
                                    </label>
                                    <textarea
                                        placeholder="Enter task details..."
                                        value={task.description}
                                        onChange={(e) => handleSubTaskChange(index, "description", e.target.value.slice(0, 2500))}
                                        maxLength={2500}
                                        rows={4}
                                        className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white transition-colors bg-white dark:bg-gray-700"
                                        style={{
                                            fontSize: 14,
                                            resize: "vertical",
                                        }}
                                    />
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {task.description.length}/2500 characters
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subtask Classification */}
                        <div className="p-4 rounded-lg bg-white dark:bg-gray-800">
                            <h4 className="text-md font-bold text-gray-800 dark:text-gray-200 mb-4">Classification</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Phase
                                    </label>
                                    <div className="relative">
                                        <DropdownMenu
                                            label="Phase"
                                            menuItems={phaseOptions}
                                            selectedValue={
                                                phaseOptions.find((item) => item.id === task.phaseId)?.name ||
                                                phaseOptions.find((item) => item.id === task.phaseId)?.title ||
                                                "--select phase--"
                                            }
                                            defaultText="--select phase--"
                                            onSelect={(id) => handleSubTaskChange(index, "phaseId", id)}
                                            addAgent={true}
                                            idSet={true}
                                            fullWidth={true}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Type
                                    </label>
                                    <div className="relative">
                                        <DropdownMenu
                                            label="Task Type"
                                            menuItems={taskType}
                                            selectedValue={
                                                taskType.find((item) => item.id === task.taskType)?.name ||
                                                taskType.find((item) => item.id === task.taskType)?.type ||
                                                "--select task type--"
                                            }
                                            defaultText="--select task type--"
                                            onSelect={(id) => handleSubTaskChange(index, "taskType", id)}
                                            addAgent={true}
                                            idSet={true}
                                            fullWidth={true}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Task Level
                                    </label>
                                    <div className="relative">
                                        <DropdownMenu
                                            label="Task Level"
                                            menuItems={taskLevel}
                                            selectedValue={
                                                taskLevel.find((item) => item.id === task.taskLevel)?.name ||
                                                taskLevel.find((item) => item.id === task.taskLevel)?.level ||
                                                "--select task level--"
                                            }
                                            defaultText="--select task level--"
                                            onSelect={(id) => handleSubTaskChange(index, "taskLevel", id)}
                                            addAgent={true}
                                            idSet={true}
                                            fullWidth={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subtask Schedule */}
                        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 mt-4 mb-4">
                            <h4 className="text-md font-bold text-gray-800 dark:text-gray-200 mb-4">Schedule</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Start Date
                                    </label>
                                    <CustomDatePicker
                                        label="Start Date"
                                        value={task.startDate ? dayjs(task.startDate) : null}
                                        onChange={(date) => handleSubTaskChange(index, "startDate", date ? date.format("MM/DD/YYYY") : null)}
                                        addAgent={true}
                                        fullWidth={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        End Date
                                    </label>
                                    <CustomDatePicker
                                        label="End Date"
                                        value={task.endDate ? dayjs(task.endDate) : null}
                                        onChange={(date) => handleSubTaskChange(index, "endDate", date ? date.format("YYYY-MM-DD") : null)}
                                        addAgent={true}
                                        disabled={true}
                                        fullWidth={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Subtask Status & Assignment */}
                        <div className="p-4 rounded-lg bg-white dark:bg-gray-800">
                            <h4 className="text-md font-bold text-gray-800 dark:text-gray-200 mb-4">Status & Assignment</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Priority
                                    </label>
                                    <DropdownMenu
                                        label="Priority"
                                        menuItems={priorityOptions}
                                        selectedValue={
                                            priorityOptions.find((item) => item.id === task.priority)?.name ||
                                            priorityOptions.find((item) => item.id === task.priority)?.title ||
                                            "--select priority--"
                                        }
                                        defaultText="--select priority--"
                                        onSelect={(id) => handleSubTaskChange(index, "priority", id)}
                                        taskDetails={true}
                                        idSet={true}
                                        fullWidth={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Status
                                    </label>
                                    <DropdownMenu
                                        label="Status"
                                        menuItems={statusOptions}
                                        selectedValue={task.status}
                                        defaultText="--select status--"
                                        onSelect={(id) => handleSubTaskChange(index, "status", id)}
                                        taskDetails={true}
                                        idSet={true}
                                        fullWidth={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Assign To
                                    </label>
                                    <div className="relative">
                                        <DropdownMenu
                                            label="Assign To"
                                            menuItems={userList}
                                            selectedValue={
                                                userList.find((item) => item.id === task.assignTo)?.name ||
                                                userList.find((item) => item.id === task.assignTo)?.type ||
                                                "--select assign to--"
                                            }
                                            defaultText="--select assign to--"
                                            onSelect={(id) => handleSubTaskChange(index, "assignTo", id)}
                                            addAgent={true}
                                            idSet={true}
                                            searchable={true}
                                            fullWidth={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subtask Attachments */}
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Attachments</h4>
                            <FileUpload onFileChange={(file) => handleSubTaskFileUpload(index, file)} />
                            {task.files && task.files.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {task.files.map((file, fIndex) => (
                                        <div
                                            key={fIndex}
                                            className="flex items-center gap-2 bg-gray-100 dark:bg-[var(--dashboard-tab-box)] px-3 py-2 rounded-lg shadow-sm"
                                        >
                                            <span className="text-sm text-[var(--sidebar-text-primary)] truncate max-w-[150px]">
                                                {file.originalname || file.name}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const updatedFiles = task.files.filter((_, i) => i !== fIndex);
                                                    handleSubTaskChange(index, "files", updatedFiles);
                                                }}
                                                className="text-red-500 hover:text-red-700 text-xs"
                                                title="Remove file"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}


            <div className="flex justify-end mt-6">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`px-6 py-2 bg-[#0C79F7] text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 ${
                        loading ? "bg-blue-300 cursor-not-allowed" : "bg-[#0C79F7] hover:bg-blue-700"
                    }`}
                >
                    {loading ? "Creating..." : "Create Task"}
                </button>
            </div>
        </div>
    )
}

export default AddNewTask