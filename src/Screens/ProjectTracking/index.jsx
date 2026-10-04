import { useNavigate, useLocation, useParams } from "react-router-dom";
import Heading from "../../Components/Heading";
import { useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import {
  getRequestWithOutBody,
  getRequestWithOutBodyCached,
  putRequestWithBodyAndToken,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import addTask from "../../assets/addTask.png";
import addIcon from "../../assets/addIcon.png";
import { styled } from "@mui/material/styles";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { SVG } from "../../assets/svg";
import TaskList from "../../Components/TaskList";
import TaskModal from "../../Components/TaskModal";
import TaskTable from "../../Components/TaskTable";
import { usePageTitle } from "../../Hooks/usePageTitle";
import AddNewTask from "../../Components/AddNewTask";
import EditProject from "../../Components/EditProject";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import { toast } from "react-toastify";
import BottonCustom from "../../Components/ButtonCustom";
import FilterDropdown from "../../Components/FilterDropdown";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import { ContextMenuProvider } from "../../Context/ContextMenuContext";
import {
  buildProjectListPath,
  parseProjectTrackingPath,
  projectNameToSlug,
  slugToDisplayName,
} from "../../Utils/projectTrackingRoutes";

console.log('ContextMenuProvider imported:', ContextMenuProvider);

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  // marginBottom: '20px',
  flexWrap: "wrap",
  gap: 10,
});

const ProjectTracking = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const location = useLocation();
  const params = useParams();

  const getPathParams = () =>
    parseProjectTrackingPath(location.pathname, location.search);

  const {
    tab: pathTab,
    page: pathPage,
    rowsPerPage: pathRowsPerPage,
    projectSlug: pathProjectSlug,
    projectId: pathProjectId,
  } = getPathParams();

  const query = new URLSearchParams(location.search);
  const projectId = pathProjectId;
  const queryProjectName = query.get('projectName');
  const querySearch = query.get('search');
  const parseMultiQueryParam = (raw) =>
    raw.length > 1
      ? raw.filter(Boolean).map(String)
      : raw[0]
        ? raw[0].includes(",")
          ? raw[0].split(",").filter(Boolean).map(String)
          : [String(raw[0])]
        : [];
  const queryStatus = parseMultiQueryParam(query.getAll('status'));
  const queryAssigneeRaw = query.getAll('assignee');
  const queryAssignee =
    queryAssigneeRaw.length > 1
      ? queryAssigneeRaw.filter(Boolean).map(String)
      : queryAssigneeRaw[0]
        ? queryAssigneeRaw[0].includes(',')
          ? queryAssigneeRaw[0].split(',').filter(Boolean).map(String)
          : [String(queryAssigneeRaw[0])]
        : [];
  const queryCreatedBy = parseMultiQueryParam(query.getAll('createdBy'));
  const queryAssigneeNameRaw = query.getAll('assigneeName');
  const queryAssigneeName =
    queryAssigneeNameRaw.length > 1
      ? queryAssigneeNameRaw.filter(Boolean)
      : queryAssigneeNameRaw[0]
        ? queryAssigneeNameRaw[0].includes(',')
          ? queryAssigneeNameRaw[0].split(',').filter(Boolean)
          : [queryAssigneeNameRaw[0]]
        : [];
  const queryCreatedByName = parseMultiQueryParam(query.getAll('createdByName'));

  const urlProjectSlug = pathProjectSlug || queryProjectName;

  const findProjectBySlug = (slug, projects) => {
    if (!slug || !projects?.length) return null;
    const normalizedSlug = slug.toLowerCase();
    return (
      projects.find((p) => projectNameToSlug(p.name) === normalizedSlug) || null
    );
  };

  const hasUrlProject = pathTab === 'list' && !!urlProjectSlug;

  // Restore from sessionStorage if URL doesn't have project info
  const savedProjectId = sessionStorage.getItem('projectTracking_projectId');
  const savedProjectName = sessionStorage.getItem('projectTracking_projectName');

  const [loading, setLoading] = useState(false);
  const [isBoardLoading, setIsBoardLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(
    hasUrlProject && !projectId && !savedProjectId,
  );
  const [activeTab, setActiveTab] = useState(pathTab);
  const [isModalOpen, setModalOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [projectDetail, setProjectDetail] = useState([]);
  const [currentProjectData, setCurrentProjectData] = useState(null);
  const [taskList, setTaskList] = useState([]);
  const [selectedTaskList, setSelectedTaskList] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  const [selectedProject, setSelectedProject] = useState(
    !!(projectId || savedProjectId || hasUrlProject),
  );
  const [totalTasks, setTotalTasks] = useState(0);
  const [taskStatusCounts, setTaskStatusCounts] = useState({
    pending: 0,
    inProgress: 0,
    readyForQA: 0,
    completed: 0,
    failedQA: 0,
  });
  const [selectedTask, setSelectedTask] = useState(
    projectId
      ? { id: projectId }
      : savedProjectId
        ? { id: savedProjectId }
        : null,
  );
  const [projectName, setProjectName] = useState(
    slugToDisplayName(urlProjectSlug) || queryProjectName || savedProjectName || null,
  );
  const [page, setPage] = useState(pathPage);
  const [rowsPerPage, setRowsPerPage] = useState(pathRowsPerPage);
  const [searchText, setSearchText] = useState(
    querySearch || "",
  );
  const [statusFilter, setStatusFilter] = useState(
    Array.isArray(queryStatus) ? queryStatus : [],
  );
  const [assigneeFilter, setAssigneeFilter] = useState(
    Array.isArray(queryAssignee) ? queryAssignee : [],
  );
  const [assigneeName, setAssigneeName] = useState(
    Array.isArray(queryAssigneeName) ? queryAssigneeName : [],
  );
  const [createdByFilter, setCreatedByFilter] = useState(
    Array.isArray(queryCreatedBy) ? queryCreatedBy : [],
  );
  const [createdByName, setCreatedByName] = useState(
    Array.isArray(queryCreatedByName) ? queryCreatedByName : [],
  );
  const [taskType, setTaskType] = useState([]);
  const [userList, setUserList] = useState([]);

  const latestProjectIdRef = useRef(null);

  usePageTitle(currentProjectData?.name || "Project Board", location);

  const resetToBoardView = () => {
    setActiveTab('board');
    setSelectedProject(false);
    setSelectedTask(null);
    setProjectName(null);
    setCurrentProjectData(null);
    setProjectDetail([]);
    setTaskList([]);
    setTaskStatusCounts({
      pending: 0,
      inProgress: 0,
      readyForQA: 0,
      completed: 0,
      failedQA: 0,
    });
    setIsListLoading(false);
    setPage(1);
    setRowsPerPage(25);
    latestProjectIdRef.current = null;
    sessionStorage.removeItem('projectTracking_projectId');
    sessionStorage.removeItem('projectTracking_projectName');
  };

  // Redirect legacy ?projectId= URLs to path-based format
  useEffect(() => {
    const { tab, projectSlug, page, rowsPerPage } = getPathParams();
    const legacyProjectId = new URLSearchParams(location.search).get('projectId');

    if (tab !== 'list' || !projectSlug || !legacyProjectId) return;

    const newPath = buildProjectListPath({
      slug: projectSlug,
      projectId: legacyProjectId,
      page,
      rowsPerPage,
    });
    const queryParams = new URLSearchParams(location.search);
    queryParams.delete('projectId');
    queryParams.delete('projectName');
    const qs = queryParams.toString();
    const target = newPath + (qs ? `?${qs}` : '');

    if (location.pathname + location.search !== target) {
      navigate(target, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  // Sync state when URL changes (sidebar click, back button, pasted link)
  useEffect(() => {
    const { tab, projectSlug: pathProject } = getPathParams();
    const isListView = tab === 'list' && !!pathProject;

    if (!isListView) {
      if (activeTab !== 'board' || selectedProject || selectedTask || projectName) {
        resetToBoardView();
      }
      return;
    }

    setActiveTab('list');
    setSelectedProject(true);
  }, [location.pathname, location.search]);

  // Update URL when path-based parameters change
  useEffect(() => {
    const { tab: urlTab, projectSlug: urlPathProject } = getPathParams();
    const isListUrl = urlTab === 'list' && !!urlPathProject;
    const isRootProjectTracking = /\/projectTracking\/?$/.test(location.pathname);

    // Board view: normalize URL and never redirect back to a project list
    if (!isListUrl) {
      const queryParams = new URLSearchParams();
      if (searchText) queryParams.set('search', searchText);
      if (Array.isArray(statusFilter) && statusFilter.length) {
        statusFilter.forEach((status) => queryParams.append('status', status));
      }
      if (Array.isArray(assigneeFilter) && assigneeFilter.length) {
        assigneeFilter.forEach((id) => queryParams.append('assignee', id));
      }
      if (Array.isArray(createdByFilter) && createdByFilter.length) {
        createdByFilter.forEach((id) => queryParams.append('createdBy', id));
      }
      if (Array.isArray(assigneeName) && assigneeName.length) {
        assigneeName.forEach((name) => queryParams.append('assigneeName', name));
      }
      if (Array.isArray(createdByName) && createdByName.length) {
        createdByName.forEach((name) => queryParams.append('createdByName', name));
      }

      const queryString = queryParams.toString();
      const boardPath =
        '/home/projectTracking/board' + (queryString ? `?${queryString}` : '');

      if (isRootProjectTracking || location.pathname + location.search !== boardPath) {
        if (location.pathname + location.search !== boardPath) {
          navigate(boardPath, { replace: true });
        }
      }
      return;
    }

    let listPath = null;
    if (activeTab === 'list' && projectName && selectedTask?.id) {
      listPath = buildProjectListPath({
        slug: projectNameToSlug(projectName),
        projectId: selectedTask.id,
        page,
        rowsPerPage,
      });
    } else if (urlPathProject && projectId) {
      listPath = buildProjectListPath({
        slug: urlPathProject,
        projectId,
        page,
        rowsPerPage,
      });
    } else {
      return;
    }

    // Save selected project to sessionStorage (not URL)
    if (selectedTask?.id) {
      sessionStorage.setItem('projectTracking_projectId', selectedTask.id);
    } else {
      sessionStorage.removeItem('projectTracking_projectId');
    }
    if (projectName) {
      sessionStorage.setItem('projectTracking_projectName', projectName);
    } else {
      sessionStorage.removeItem('projectTracking_projectName');
    }
    
    // Build query string for filters only (project id lives in the path)
    const queryParams = new URLSearchParams();
    if (searchText) queryParams.set('search', searchText);
    if (Array.isArray(statusFilter) && statusFilter.length) {
      statusFilter.forEach((status) => queryParams.append('status', status));
    }
    if (Array.isArray(assigneeFilter) && assigneeFilter.length) {
      assigneeFilter.forEach((id) => queryParams.append('assignee', id));
    }
    if (Array.isArray(createdByFilter) && createdByFilter.length) {
      createdByFilter.forEach((id) => queryParams.append('createdBy', id));
    }
    if (Array.isArray(assigneeName) && assigneeName.length) {
      assigneeName.forEach((name) => queryParams.append('assigneeName', name));
    }
    if (Array.isArray(createdByName) && createdByName.length) {
      createdByName.forEach((name) => queryParams.append('createdByName', name));
    }
    
    const queryString = queryParams.toString();
    const finalPath = listPath + (queryString ? `?${queryString}` : '');

    if (location.pathname + location.search !== finalPath) {
      navigate(finalPath, { replace: true });
    }
  }, [
    activeTab,
    searchText,
    statusFilter,
    assigneeFilter,
    createdByFilter,
    assigneeName,
    createdByName,
    page,
    rowsPerPage,
    navigate,
    location.pathname,
    location.search,
    selectedTask,
    projectName,
  ]);

  // Sync URL project id/slug with state for direct navigation and shared links
  useEffect(() => {
    if (pathTab === 'list' && urlProjectSlug) {
      setSelectedProject(true);
      setActiveTab('list');
    }
    if (projectId && !selectedTask?.id) {
      setSelectedTask({ id: projectId });
      setSelectedProject(true);
    }
    const projectNameToSet = slugToDisplayName(urlProjectSlug) || queryProjectName;
    if (projectNameToSet && projectName !== projectNameToSet && !projectList?.length) {
      setProjectName(projectNameToSet);
    }
  }, [projectId, urlProjectSlug, queryProjectName, pathTab]);

  // Resolve project from URL slug when project id is not in the path
  useEffect(() => {
    if (selectedTask?.id) return;

    if (projectId) {
      setSelectedTask({ id: projectId });
      setSelectedProject(true);
      return;
    }

    if (!urlProjectSlug || !projectList?.length) return;

    const matchedProject = findProjectBySlug(urlProjectSlug, projectList);
    if (matchedProject) {
      const idStr = String(matchedProject.id);
      latestProjectIdRef.current = idStr;
      setSelectedTask({ ...matchedProject, id: idStr });
      setSelectedProject(true);
      setProjectName(matchedProject.name);
      setIsListLoading(true);
    } else {
      setIsListLoading(false);
    }
  }, [selectedTask?.id, urlProjectSlug, projectId, projectList]);

  const fetchData = () => {
    let api = "";
    if (userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource") {
      api = `${baseURl}project`;
    } else {
      api = `${baseURl}project?userId=${userData.id}`;
    }
    setIsBoardLoading(true);
    getRequestWithOutBody(api, accessToken)
      .then((result) => {
        setProjectList(result?.data);
        setIsBoardLoading(false);
      })
      .catch(() => {
        setIsBoardLoading(false);
      });
  };
  const fetchData7 = () => {
    getRequestWithOutBodyCached(`${baseURl}user`, accessToken)
      .then((result) => {
        const activeUsers =
          result?.data?.results?.filter((user) => user.status === "active") || [];
        setUserList(activeUsers);
      })
      .catch(() => {});
  };
  const fetchData2 = (projectId) => {
    const currentProjectId = projectId || selectedTask?.id;
    if (!currentProjectId) return;
    const idStr = String(currentProjectId);
    getRequestWithOutBody(`${baseURl}project/${idStr}`, accessToken)
      .then((result) => {
        // Ignore if project changed while fetching
        if (latestProjectIdRef.current !== idStr) return;
        const phases = result?.data?.phases || [];
        const projectData = result?.data;
        setProjectDetail(phases);
        
        // Update project name and current project data when we have project data
        if (projectData?.name) {
          setProjectName(projectData.name);
          setCurrentProjectData(projectData);
        }
      })
      .catch((error) => {
      });
  };

  const fetchData3 = (pageNum = 1, rowsPerPage = 10, overrides = {}) => {
    if (!selectedTask?.id || !projectDetail?.length) {
      setIsListLoading(false);
      return;
    }

    const effectiveStatus =
      overrides.status !== undefined ? overrides.status : statusFilter;

    const effectiveAssignee =
      overrides.assignee !== undefined ? overrides.assignee : assigneeFilter;

    const effectiveCreatedBy =
      overrides.createdBy !== undefined ? overrides.createdBy : createdByFilter;

    const searchParam = searchText
      ? `&keyword=${encodeURIComponent(searchText)}`
      : "";
    const statusValues = Array.isArray(effectiveStatus)
      ? effectiveStatus.filter(Boolean)
      : effectiveStatus
        ? [effectiveStatus]
        : [];
    const statusParam = statusValues.length
      ? statusValues
          .map((status) => `&status=${encodeURIComponent(status)}`)
          .join("")
      : "";
    const assigneeIds = Array.isArray(effectiveAssignee)
      ? effectiveAssignee.filter(Boolean)
      : effectiveAssignee
        ? [effectiveAssignee]
        : [];
    const assigneeParam = assigneeIds.length
      ? assigneeIds.map((id) => `&userId=${encodeURIComponent(id)}`).join("")
      : "";
    const createdByIds = Array.isArray(effectiveCreatedBy)
      ? effectiveCreatedBy.filter(Boolean)
      : effectiveCreatedBy
        ? [effectiveCreatedBy]
        : [];
    const createdByParam = createdByIds.length
      ? createdByIds
          .map((id) => `&createdBy=${encodeURIComponent(id)}`)
          .join("")
      : "";

    const currentProjectId = String(selectedTask.id);

    getRequestWithOutBody(
      `${baseURl}task/all/?projectId=${currentProjectId}&paginate=true&limit=${rowsPerPage}&page=${pageNum}&orderBy=createdAt&order=desc${searchParam}${statusParam}${assigneeParam}${createdByParam}`,
      accessToken,
    )
      .then((result) => {
        if (latestProjectIdRef.current !== currentProjectId) return;

        const allTasks = result?.data?.data || [];
        const total = result?.data?.totalRecords || 0;

        const tasksByPhase = allTasks.reduce((acc, task) => {
          if (!acc[task.phaseId]) acc[task.phaseId] = [];
          acc[task.phaseId].push(task);
          return acc;
        }, {});

        setTaskList(
          projectDetail.map((phase) => ({
            ...phase,
            tasks: tasksByPhase[phase.id] || [],
          })),
        );
        setTotalTasks(total);
        setTaskStatusCounts({
          pending: result?.data?.totalPendingCount ?? 0,
          inProgress: result?.data?.totalInProgressCount ?? 0,
          readyForQA: result?.data?.totalReadyForQACount ?? 0,
          completed: result?.data?.totalCompletedCount ?? 0,
          failedQA: result?.data?.totalFailedQACount ?? 0,
        });
        setIsListLoading(false);
      })
      .catch(() => setIsListLoading(false));
  };

  const fetchData4 = () => {
    setLoading(true); // Set loading state before fetching
    if (!taskToEdit?.id) return;
    getRequestWithOutBody(`${baseURl}project/${taskToEdit?.id}`, accessToken)
      .then((result) => {
        setProjectDetail(result?.data?.phases);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  };
  const fetchData6 = () => {
    // setLoading(true); // Set loading state before fetching
    getRequestWithOutBody(`${baseURl}task/types`, accessToken)
      .then((result) => {
        setTaskType(result?.data);
        // setLoading(false)
      })
      .catch((error) => {
        // setLoading(false)
      });
  };
  const fetchData5 = () => {
    setLoading(true); // Set loading state before fetching
    getRequestWithOutBody(
      `${baseURl}task/?projectId=${taskToEdit?.id}`,
      accessToken,
    )
      .then((result) => {
        const allTasks = result?.data?.list || [];

        // Group tasks by phaseId
        const tasksByPhase = allTasks.reduce((acc, task) => {
          if (!acc[task.phaseId]) acc[task.phaseId] = [];
          acc[task.phaseId].push(task);
          return acc;
        }, {});

        // Add tasks to each phase in projectDetail
        const updatedPhases = projectDetail?.map((phase) => ({
          ...phase,
          tasks: tasksByPhase[phase.id] || [],
        }));
        setTaskList(updatedPhases);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  };
  const handleSuccess = () => {
    fetchData3(page, rowsPerPage);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsListLoading(true);
      setPage(1); // reset pagination when new search applied
      fetchData3(1, rowsPerPage);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchText(text);
  };
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state?.activeTab);
    }
  }, [location.state]);
  useEffect(() => {
    if (!userData?.roleTitle && !userData?.id) return;
    fetchData();
    fetchData6();
    fetchData7();
  }, [userData?.id, userData?.roleTitle]);
  useEffect(() => {
    // When switching project, clear previous data to avoid flicker
    if (selectedTask?.id) {
      latestProjectIdRef.current = String(selectedTask.id);
      setIsListLoading(true);
      setTaskList([]);
      setProjectDetail([]);
      fetchData2(selectedTask.id);
    }
  }, [selectedTask]);
  useEffect(() => {
    // Only fetch tasks when we have a selected project and its phases are loaded
    if (selectedTask?.id && projectDetail?.length) {
      setIsListLoading(true);
      fetchData3(page, rowsPerPage);
    }
  }, [
    statusFilter,
    page,
    rowsPerPage,
    selectedTask,
    projectDetail,
    assigneeFilter,
    createdByFilter,
  ]);

  // Removed duplicate fetch effect to prevent early fetch with stale phases

  const openEditModal = (task) => {
    setTaskToEdit(task);
    setIsEditModalVisible(true);
  };

  const columns = [
    { id: "checkbox", label: "", align: "center" },
    { id: "id", label: "Ticket No", align: "center" },
    { id: "title", label: "Title", align: "left" },
    { id: "taskTypeId", label: "Task Type", align: "center" },
    { id: "creator", label: "Created By", align: "center" },
    { id: "assignees", label: "Assignee", align: "center" },
    { id: "endDate", label: "Due Date", align: "center" },
    { id: "priority", label: "Priority", align: "center" },
    { id: "status", label: "STATUS", align: "center" },
  ];

  const closeEditModal = () => {
    fetchData();
    fetchData4();
    fetchData5();
    setIsEditModalVisible(false);
    setTaskToEdit(null);
  };
  const handleOpenModal = () => {
    setModalOpen(true);
  };
  const handleCloseModal = () => setModalOpen(false);

  const handleOpenAddTaskModal = () => {
    navigate("/home/addNewTask", {
      state: { projectDetail: projectDetail, projectName: projectName },
    });
  };
  const handleCloseAddTaskModal = () => {
    setIsListLoading(true);
    fetchData3(page, rowsPerPage);
    setAddTaskModalOpen(false);
  };

  const handleDeleteTask = async () => {
    if (selectedTaskList.length === 0) {
      toast.error('Please select tasks to cancel');
      return;
    }
    setDeleteModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    setIsDeleting(true);
    try {
      const body = {
        userId: userData?.id,
        status: "cancelled",
      };
      for (const id of selectedTaskList) {
        const result = await putRequestWithBodyAndToken(
          `${baseURl}task/update-status/${id.id}`,
          accessToken,
          body,
        );
        toast.success(`Task ${id.id} Cancelled successfully.`);
      }
      setSelectedTaskList([]);
      // Refresh the data after deletion
      fetchData();
      setIsListLoading(true);
      fetchData3(page, rowsPerPage);
    } catch (error) {
      toast.error(error.message || "Failed to cancel tasks");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };
  const statusTitles = {
    todo: "TODO",
    active: "In Progress",
    completed: "Completed",
    on_hold: "On Hold",
    cancelled: "Cancelled",
  };

  const headerColors = {
    todo: { bg: "#DEDEDE", text: "#000000" },
    active: { bg: "#0C79F7", text: "#FFFFFF" },
    completed: { bg: "#DEDEDE", text: "#000000" },
    on_hold: { bg: "#DEDEDE", text: "#000000" },
    cancelled: { bg: "#DEDEDE", text: "#000000" },
  };

  const bgColors = {
    todo: "rgba(151, 71, 255, 0.05)",
    active: "rgba(0, 172, 161, 0.05)",
    completed: "rgba(74, 196, 17, 0.05)",
    on_hold: "rgba(255, 153, 0, 0.05)",
    cancelled: "rgba(255, 76, 76, 0.05)",
  };

  const priorityStyles = {
    high: {
      bg: "rgba(179, 48, 0, 0.2)",
      text: "#B33000",
    },
    medium: {
      bg: "rgba(67, 121, 238, 0.2)",
      text: "#0C79F7",
    },
    low: {
      bg: "rgba(239, 187, 0, 0.2)",
      text: "#E2B100",
    },
    default: {
      bg: "bg-gray-100",
      text: "text-gray-700",
    },
  };

  const statusOrder = ["todo", "active", "on_hold", "completed", "cancelled"];


  const tasksByStatus = projectList?.reduce((acc, task) => {
    const status = task.status || "todo";
    if (!acc[status]) acc[status] = [];
    acc[status].push(task); // Push full task object
    return acc;
  }, {});

  const handleButtonClick = () => {
    navigate("/home/addPolicy");
  };

  const exportToCSV = () => {
    const allTasks = taskList.flatMap((phase) => phase.tasks || []);
    if (allTasks.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Ticket No",
      "Title",
      "Task Type",
      "Created By",
      "Assignee",
      "Due Date",
      "Priority",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...allTasks.map((task) =>
        [
          task.id || "",
          `"${(task.title || "").replace(/"/g, '""')}"`,
          taskType?.find((typeObj) => typeObj.id === task.taskTypeId)?.type ||
            "",
          task.creator?.name || "",
          task.assignments?.map((a) => a.user?.name).join("; ") ||
            task.assignee?.user?.name ||
            "",
          task.endDate || "",
          task.priority || "",
          task.status || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `tickets_${projectName}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  const exportToPDF = async () => {
    const element = document.querySelector(".task-table-container");
    if (!element) {
      toast.error("No table data to export");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `tickets_${projectName}_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      toast.success("PDF exported successfully");
    } catch (error) {
      toast.error("Failed to export PDF");
    }
  };

  const backgroundColors = ["#9747FF", "#FF478A", "#00ACA1", "#4AC411"];

  const qaStats = {
    all:
      Number(taskStatusCounts.pending || 0) +
      Number(taskStatusCounts.inProgress || 0) +
      Number(taskStatusCounts.readyForQA || 0) +
      Number(taskStatusCounts.completed || 0) +
      Number(taskStatusCounts.failedQA || 0),
    pending: taskStatusCounts.pending,
    inProgress: taskStatusCounts.inProgress,
    readyForQA: taskStatusCounts.readyForQA,
    completed: taskStatusCounts.completed,
    failedQA: taskStatusCounts.failedQA,
  };

  const handleStatClick = (status) => {
    const next = status ? [status] : [];
    setStatusFilter(next);
    setIsListLoading(true);
    setPage(1);
    fetchData3(1, rowsPerPage, { status: next });
  };

  const isStatusSelected = (status) =>
    Array.isArray(statusFilter) &&
    statusFilter.length === 1 &&
    statusFilter[0] === status;
  
  return (
    <ContextMenuProvider>
      <>
      <div
        style={{
          marginTop: -65,
          backgroundColor: "var(--dashboard-bg)",
          minHeight: "100vh",
          padding: 10,
        }}
      >
        <HeaderWrapper>
          <Heading
            Fontweight={700}
            color={"var(--sidebar-text-primary)"}
            Heading={
              activeTab === "list" && projectName ? projectName : "Board"
            }
            Fontsize={30}
            // Tailwind CSS classes
          />
          <div className="pt-2">
            {activeTab === "board" ? (
              // <div className="">
              <div>
                {(userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource" ||
                  userData.roleTitle === "Technical Support") && (
                  <BottonWithIcon
                    backgroundColor={"#0C79F7"}
                    icon={addIcon}
                    // width={145}
                    title={"Add Project"}
                    height={40}
                    color={"var(--sidebar-text-selected)"}
                    fontSize={16}
                    fontWeight={500}
                    onClick={handleOpenModal}
                  />
                )}
              </div>
            ) : (
              // </div>
              <div className="flex ">
                {((userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource") &&
                  selectedTaskList?.length > 0) ||
                  (selectedTaskList?.length > 0 &&
                    selectedTaskList.every(
                      (task) => task?.creator?.id === userData.id,
                    )) && (
                  <BottonWithIcon
                    title={"Cancel Task"}
                    height={40}
                    color={"var(--sidebar-text-selected)"}
                    fontSize={16}
                    className="bg-red-500"
                    fontWeight={500}
                    onClick={handleDeleteTask}
                  />
                )}
                <BottonWithIcon
                  backgroundColor={"#0C79F7"}
                  icon={addTask}
                  // width={145}
                  disabled={isListLoading}
                  title={isListLoading ? "Loading..." : "Add Task"}
                  height={40}
                  color={"var(--sidebar-text-selected)"}
                  fontSize={16}
                  fontWeight={500}
                  onClick={handleOpenAddTaskModal}
                />
              </div>
            )}
          </div>
        </HeaderWrapper>
        {loading ? (
          <div className="text-center w-full mx-auto">
            <Loader message="Loading..." subMessage="Please wait" />
          </div>
        ) : (
          <div className="w-full">
            <div
              className="w-full flex justify-between items-center "
              style={{
                backgroundColor: "var(--dashboard-card-bg)",
                borderRadius: 14,
              }}
            >
              <div className="flex items-center pb-1">
                {["board", selectedProject ? "list" : null]
                  .filter(Boolean) // removes null
                  .map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1 px-4 py-2 font-medium text-sm border-b-2 transition-all ${
                        activeTab === tab
                          ? "border-[#0C79F7] text-blue-600"
                          : "border-transparent text-[var(--dashboard-tab-text-inactive)]"
                      }`}
                    >
                      {tab === "board" ? (
                        <SVG.BoardIcon
                          style={{
                            color:
                              activeTab === "board"
                                ? "#2563eb"
                                : "var(--dashboard-tab-text-inactive)",
                          }}
                        />
                      ) : (
                        <SVG.ListIcon
                          style={{
                            color:
                              activeTab === "list"
                                ? "#2563eb"
                                : "var(--dashboard-tab-text-inactive)",
                          }}
                        />
                      )}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
              </div>
            </div>
            {activeTab === "list" && selectedTask && (
              <div
                className="w-full mt-4 p-4 rounded-lg"
                style={{ backgroundColor: "var(--dashboard-card-bg)" }}
              >
                {/* <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: "var(--sidebar-text-primary)" }}
                >
                  QA Dashboard
                </h3> */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div
                    onClick={() => handleStatClick("")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStatClick("");
                      }
                    }}
                  >
                    <TaxDashboardBox
                      compact
                      selected={!statusFilter?.length}
                      title="All"
                      amount={qaStats.all}
                      subtitle="All tasks"
                    />
                  </div>
                  <div
                    onClick={() => handleStatClick("Pending")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStatClick("Pending");
                      }
                    }}
                  >
                    <TaxDashboardBox
                      compact
                      selected={isStatusSelected("Pending")}
                      title="Pending"
                      amount={qaStats.pending}
                      subtitle="Pending tasks"
                    />
                  </div>
                  <div
                    onClick={() => handleStatClick("In Progress")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStatClick("In Progress");
                      }
                    }}
                  >
                    <TaxDashboardBox
                      compact
                      selected={isStatusSelected("In Progress")}
                      title="In Progress"
                      amount={qaStats.inProgress}
                      subtitle="In progress tasks"
                    />
                  </div>
                  <div
                    onClick={() => handleStatClick("Ready for QA")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStatClick("Ready for QA");
                      }
                    }}
                  >
                    <TaxDashboardBox
                      compact
                      selected={isStatusSelected("Ready for QA")}
                      title="Ready for QA"
                      amount={qaStats.readyForQA}
                      subtitle="Ready for QA tasks"
                    />
                  </div>
                  <div
                    onClick={() => handleStatClick("Completed")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStatClick("Completed");
                      }
                    }}
                  >
                    <TaxDashboardBox
                      compact
                      selected={isStatusSelected("Completed")}
                      title="Completed"
                      amount={qaStats.completed}
                      subtitle="Completed tasks"
                    />
                  </div>
                  <div
                    onClick={() => handleStatClick("Failed QA")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStatClick("Failed QA");
                      }
                    }}
                  >
                    <TaxDashboardBox
                      compact
                      selected={isStatusSelected("Failed QA")}
                      title="Failed QA"
                      amount={qaStats.failedQA}
                      subtitle="Failed QA tasks"
                    />
                  </div>
                </div>
              </div>
            )}
            <div
              className="w-full mt-4"
              style={{
                backgroundColor:
                  activeTab === "list" && "var(--dashboard-card-bg)",
                borderRadius: 14,
              }}
            >
              {activeTab === "board" ? (
                isBoardLoading ? (
                  <div className="text-center w-full mx-auto py-16 min-h-[400px] flex items-center justify-center">
                    <Loader message="Loading board..." subMessage="Fetching projects" />
                  </div>
                ) : projectList?.length > 0 ? (
                  <div className="overflow-x-auto">
                    {(() => {
                      const boardCount = statusOrder.filter(
                        (statusKey) => tasksByStatus[statusKey],
                      ).length;
                      const containerClass =
                        boardCount === 1
                          ? "max-w-[600px] md:w-max"
                          : "flex-wrap md:flex-nowrap md:w-max";
                      return (
                        <div className={`flex pb-2 gap-4 ${containerClass}`}>
                          {statusOrder.map((statusKey) => {
                            const tasks = tasksByStatus[statusKey];
                            if (!tasks) return null;

                            return (
                              <TaskList
                                key={statusKey}
                                title={statusTitles[statusKey]}
                                tasks={tasks}
                                priorityStyles={priorityStyles}
                                headerColor={headerColors[statusKey]}
                                backgroundColor={bgColors[statusKey]}
                                onAddTaskClick={handleOpenModal}
                                onTaskClick={(task) => {
                                  setPage(1);
                                  const idStr = String(task?.id);
                                  latestProjectIdRef.current = idStr;
                                  setIsListLoading(true);
                                  setTaskList([]);
                                  setProjectDetail([]);
                                  setSelectedTask({ ...task, id: idStr });
                                  setActiveTab("list");
                                  setSelectedProject(true);
                                  setProjectName(task?.name);

                                  navigate(
                                    buildProjectListPath({
                                      slug: projectNameToSlug(task?.name),
                                      projectId: idStr,
                                    }),
                                  );
                                }}
                                isEditModalOpen={openEditModal}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex mt-1 items-center justify-center py-16 min-h-[400px]">
                    <NoDataFound title="No Projects Found" description="No projects available." />
                  </div>
                )
              ) : (
                <div className="">
                  <div className="px-4">
                    <div className="flex justify-start items-end gap-3 flex-wrap mt-4">
                      <div style={{ minWidth: 280 }}>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--dashboard-text-primary)",
                          }}
                        >
                          Search
                        </label>
                        <input
                          type="text"
                          value={searchText}
                          onKeyDown={handleKeyDown}
                          onChange={handleInputChange}
                          placeholder="Search by Title or ticket Number"
                          className="mt-1 p-2 w-full"
                          style={{
                            border: "1px solid var(--dashboard-box-border)",
                            borderRadius: 8,
                            backgroundColor: "var(--dashboard-tab-box)",
                            height: 40,
                            color: "var(--dashboard-text-primary)",
                          }}
                        />
                      </div>

                      <FilterDropdown
                        label="Created By"
                        multiple
                        value={createdByFilter}
                        onChange={(next) => {
                          const nextIds = (Array.isArray(next) ? next : []).map(
                            String,
                          );
                          const nextNames = nextIds.map((id) => {
                            const user = userList.find(
                              (u) => String(u?.id) === String(id),
                            );
                            return user?.name || user?.username || "";
                          });

                          setIsListLoading(true);
                          setPage(1);
                          setCreatedByFilter(nextIds);
                          setCreatedByName(nextNames);
                          fetchData3(1, rowsPerPage, { createdBy: nextIds });
                        }}
                        options={userList.map((u) => ({
                          label: u?.name || u?.username || "-",
                          value: String(u?.id),
                        }))}
                        placeholder="Filter by Created By"
                        minWidth={220}
                        searchable={true}
                        searchPlaceholder="Search user..."
                      />

                      <FilterDropdown
                        label="Assignee"
                        multiple
                        value={assigneeFilter}
                        onChange={(next) => {
                          const nextIds = (Array.isArray(next) ? next : []).map(
                            String,
                          );
                          const nextNames = nextIds.map((id) => {
                            const user = userList.find(
                              (u) => String(u?.id) === String(id),
                            );
                            return user?.name || user?.username || "";
                          });

                          setIsListLoading(true);
                          setPage(1);
                          setAssigneeFilter(nextIds);
                          setAssigneeName(nextNames);
                          fetchData3(1, rowsPerPage, { assignee: nextIds });
                        }}
                        options={userList.map((u) => ({
                          label: u?.name || u?.username || "-",
                          value: String(u?.id),
                        }))}
                        placeholder="Filter by Assignee"
                        minWidth={220}
                        searchable={true}
                        searchPlaceholder="Search user..."
                      />

                      <FilterDropdown
                        label="Status"
                        multiple
                        value={statusFilter}
                        onChange={(next) => {
                          const nextStatuses = (
                            Array.isArray(next) ? next : []
                          ).filter(Boolean);
                          setIsListLoading(true);
                          setPage(1);
                          setStatusFilter(nextStatuses);
                          fetchData3(1, rowsPerPage, { status: nextStatuses });
                        }}
                        options={[
                          { label: "On Hold", value: "On Hold" },
                          { label: "Pending", value: "Pending" },
                          { label: "In Progress", value: "In Progress" },
                          { label: "Completed", value: "Completed" },
                          { label: "Not Completed", value: "not-completed" },
                          { label: "Ready for QA", value: "Ready for QA" },
                          { label: "Ready for Approval", value: "Ready for Approval" },
                          { label: "UI Completed", value: "UI Completed" },
                          { label: "API Completed", value: "API Completed" },
                          { label: "Failed QA", value: "Failed QA" },
                          { label: "QA Succeeded", value: "QA Succeeded" },
                          { label: "Created (QA View)", value: "Created" },
                          { label: "Reported (QA View)", value: "Reported" },
                        ]}
                        placeholder="Filter by Status"
                        minWidth={220}
                        searchable={true}
                        searchPlaceholder="Search status..."
                      />

                      <div>
                        <BottonCustom
                          backgroundColor={""}
                          width={120}
                          title={"Search"}
                          height={40}
                          color={"var(--sidebar-text-selected)"}
                          fontSize={16}
                          fontWeight={500}
                          className={"bg-[#0C79F7]"}
                          onClick={() => {
                            setIsListLoading(true);
                            setPage(1);
                            fetchData3(1, rowsPerPage);
                          }}
                        />
                      </div>

                      <div>
                        <BottonCustom
                          backgroundColor={""}
                          width={120}
                          title={"Clear"}
                          height={40}
                          color={"var(--sidebar-text-selected)"}
                          fontSize={16}
                          fontWeight={500}
                          className={"bg-gray-500"}
                          onClick={() => {
                            setIsListLoading(true);
                            setPage(1);
                            setSearchText("");
                            setStatusFilter([]);
                            setAssigneeFilter([]);
                            setAssigneeName([]);
                            setCreatedByFilter([]);
                            setCreatedByName([]);
                            setTimeout(() => {
                              fetchData3(1, rowsPerPage, {
                                status: [],
                                assignee: [],
                                createdBy: [],
                              });
                            }, 0);
                          }}
                        />
                      </div>

                      <div>
                        <button
                          onClick={exportToCSV}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: "#10B981",
                            color: "white",
                            border: "1px solid #10B981",
                            height: 40,
                            // height: 40,
                          }}
                        >
                          Export CSV
                        </button>
                      </div>
                    </div>
                    {isListLoading ? (
                      <div className="text-center w-full mx-auto py-8">
                        <Loader message="Loading..." subMessage="Please wait" />
                      </div>
                    ) : taskList &&
                      taskList.length > 0 &&
                      taskList.some(
                        (phase) => phase.tasks && phase.tasks.length > 0,
                      ) ? (
                      taskList.map((phase, index) =>
                        phase.tasks && phase.tasks.length > 0 ? (
                          <div key={phase.id} className="mb-4 mt-2">
                            <Heading
                              Fontweight={700}
                              color={"white"}
                              Heading={phase?.phase}
                              Fontsize={12}
                              backgroundColor={
                                backgroundColors[
                                  index % backgroundColors.length
                                ]
                              }
                              className="rounded-[6px] inline-block px-3 py-1 mb-2"
                            />
                            <div className="task-table-container">
                              <TaskTable
                                tasks={phase?.tasks}
                                onSuccess={handleSuccess}
                                setSelectedTaskList={setSelectedTaskList}
                                columns={columns}
                                projectName={projectName}
                                page={page}
                                setPage={setPage}
                                rowsPerPage={rowsPerPage}
                                setRowsPerPage={setRowsPerPage}
                                totalTasks={totalTasks}
                                taskType={taskType}
                              />
                            </div>
                          </div>
                        ) : null,
                      )
                    ) : (
                      <div className="flex mt-1 items-center justify-center py-3">
                        <NoDataFound title="No Data Found" description="No data available." />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {isModalOpen && (
        <TaskModal onClose={handleCloseModal} isOpen={isModalOpen} />
      )}
      {isEditModalVisible && (
        <EditProject
          onClose={closeEditModal}
          isOpen={isEditModalVisible}
          task={taskToEdit}
        />
      )}
      {isAddTaskModalOpen && (
        <AddNewTask
          onClose={handleCloseAddTaskModal}
          isOpen={isAddTaskModalOpen}
          projectDetail={projectDetail}
          projectName={projectName}
        />
      )}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        title="Cancel Tasks"
        subtitle={`Are you sure you want to cancel ${selectedTaskList.length} selected task(s)?`}
        entityName={`${selectedTaskList.length} Task(s)`}
        warningMessage="This action cannot be undone. The selected tasks will be cancelled and moved to cancelled status."
        onCancel={() => setDeleteModalOpen(false)}
        onDelete={confirmDeleteTask}
        isLoading={isDeleting}
      />
      </>
    </ContextMenuProvider>
  );
};

export default ProjectTracking;