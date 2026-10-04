"use client";

import { useEffect, useRef, useState } from "react";
import {
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  postRequestWithFormData,
  putRequestWithBodyAndToken,
  deleteRequest,
} from "../../Api/fetch";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import CustomDatePicker from "../../Components/CustomDatePicker";
import LabeledInput from "../../Components/LabeledInput";
import Heading from "../../Components/Heading";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import GoBack from "../../Components/GoBack";
import DropdownMenu from "../../Components/dropdownMenu";
import Loader from "../../Components/Loader";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import dayjs from "dayjs";
import moment from "moment";
import styled from "styled-components";
import { SVG } from "../../assets/svg";
import FileUpload from "../../Components/FileUpload";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import UserProfileAvatar from "../../Components/UserProfileAvatar";
import AddNewTask from "../../Components/AddNewTask";
import TaskTable from "../../Components/TaskTable";
import { resolveTaskDetailSidebarRoute } from "../../Utils/taskDetailSidebarRoute";
import { buildProjectListPath } from "../../Utils/projectTrackingRoutes";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const STATUS = Object.freeze({
  ON_HOLD: "On Hold",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  NOT_COMPLETED: "not-completed",
  READY_FOR_QA: "Ready for QA",
  READY_FOR_APPROVAL: "Ready for Approval",
  UI_COMPLETED: "UI Completed",
  API_COMPLETED: "API Completed",
  FAILED_QA: "Failed QA",
  QA_SUCCEEDED: "QA Succeeded",
  READY_FOR_DEPLOYMENT: "Ready For Deployment",
  QA_IN_PROGRESS: "QA In Progress",
  DEPLOYMENT_COMPLETED: "Deployment Completed",
  CANCELLED: "Cancelled",
});

const STATUS_DISPLAY_NAMES = {
  [STATUS.NOT_COMPLETED]: "Not Completed",
};

const toOption = (statusId) => ({
  id: statusId,
  name: STATUS_DISPLAY_NAMES[statusId] ?? statusId,
});

const getStatusDisplayLabel = (statusId) =>
  STATUS_DISPLAY_NAMES[statusId] ?? statusId;

const STATUS_SETS = Object.freeze({
  adminLike: [
    STATUS.ON_HOLD,
    STATUS.PENDING,
    STATUS.IN_PROGRESS,
    STATUS.COMPLETED,
    STATUS.NOT_COMPLETED,
    STATUS.READY_FOR_QA,
    STATUS.READY_FOR_APPROVAL,
    STATUS.UI_COMPLETED,
    STATUS.API_COMPLETED,
    STATUS.FAILED_QA,
    STATUS.QA_SUCCEEDED,
    STATUS.READY_FOR_DEPLOYMENT,
    STATUS.DEPLOYMENT_COMPLETED,
    STATUS.CANCELLED,
  ],
  developer: [
    STATUS.PENDING,
    STATUS.IN_PROGRESS,
    STATUS.READY_FOR_QA,
    STATUS.UI_COMPLETED,
    STATUS.API_COMPLETED,
    STATUS.READY_FOR_DEPLOYMENT,
  ],
  qa: [
    STATUS.QA_SUCCEEDED,
    STATUS.FAILED_QA,
    STATUS.QA_IN_PROGRESS,
    STATUS.READY_FOR_DEPLOYMENT,
    STATUS.COMPLETED,
    STATUS.CANCELLED,
  ],
  webMarketing: [
    STATUS.PENDING,
    STATUS.IN_PROGRESS,
    STATUS.ON_HOLD,
    STATUS.READY_FOR_APPROVAL,
  ],
});

const getStatusMenuItems = (userData, effectiveTask) => {
  const roleTitle = (userData?.roleTitle || "").trim();
  const roleTitleLower = roleTitle.toLowerCase();

  const isAdminLike =
    roleTitle === "Admin" ||
    roleTitle === "Human Resource" ||
    roleTitle === "Super Admin" ||
    roleTitleLower.includes("admin") ||
    roleTitleLower.includes("human resource") ||
    userData?.id === effectiveTask?.creator?.id;

  const isWebMarketing =
    roleTitleLower.includes("marketing") && !isAdminLike;

  const set = isAdminLike
    ? STATUS_SETS.adminLike
    : roleTitle === "Developer"
      ? STATUS_SETS.developer
      : isWebMarketing
        ? STATUS_SETS.webMarketing
        : STATUS_SETS.qa;

  return set.map(toOption);
};

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Longest name first so "Abraham Jimenez" wins over a shorter prefix. */
const usersSortedForMentionMatch = (userList) =>
  [...(userList || [])]
    .filter((u) => u?.name && String(u.name).trim())
    .sort((a, b) => String(b.name).length - String(a.name).length);

const mentionEndsOk = (rest, nameLen) => {
  if (nameLen === rest.length) return true;
  const next = rest[nameLen];
  return next === undefined || /[\s.,!?;:]/.test(next);
};

const nameMatchesAt = (rest, name) => {
  const n = String(name);
  if (rest.length < n.length) return false;
  return rest.slice(0, n.length).toLowerCase() === n.toLowerCase();
};

/** After each @, take the longest user.name prefix; collect unique ids in order. */
const extractTaggedUserIdsFromComment = (commentText, userList) => {
  if (!commentText || !userList?.length) return [];
  const sorted = usersSortedForMentionMatch(userList);
  const ids = [];
  let i = 0;
  while (i < commentText.length) {
    if (commentText[i] !== "@") {
      i += 1;
      continue;
    }
    const rest = commentText.slice(i + 1);
    let matched = false;
    for (const user of sorted) {
      const name = String(user.name);
      if (!nameMatchesAt(rest, name) || !mentionEndsOk(rest, name.length)) continue;
      if (user.id != null) ids.push(user.id);
      i += 1 + name.length;
      matched = true;
      break;
    }
    if (!matched) i += 1;
  }
  return [...new Set(ids)];
};

/** [start, end) for each @mention substring (includes leading @). */
const getMentionRangesInText = (text, userList) => {
  if (!text || !userList?.length) return [];
  const sorted = usersSortedForMentionMatch(userList);
  const ranges = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "@") {
      i += 1;
      continue;
    }
    const start = i;
    const rest = text.slice(i + 1);
    let matchedLen = 0;
    for (const user of sorted) {
      const name = String(user.name);
      if (!nameMatchesAt(rest, name) || !mentionEndsOk(rest, name.length)) continue;
      matchedLen = 1 + name.length;
      break;
    }
    if (matchedLen > 0) {
      ranges.push({ start, end: start + matchedLen });
      i = start + matchedLen;
    } else {
      i += 1;
    }
  }
  return ranges;
};

const buildMentionHighlightedInnerHTML = (text, userList) => {
  const ranges = getMentionRangesInText(text, userList);
  if (ranges.length === 0) return escapeHtml(text);
  let out = "";
  let last = 0;
  for (const { start, end } of ranges) {
    out += escapeHtml(text.slice(last, start));
    out += `<span style="color: #1E40AF; font-weight: 500;">${escapeHtml(text.slice(start, end))}</span>`;
    last = end;
  }
  out += escapeHtml(text.slice(last));
  return out;
};

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

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "10px",
  flexWrap: "wrap",
  gap: 10,
  zIndex: 100, // ✅ ensure clickable
});

const HeaderWrapper2 = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 10,
  zIndex: 101, // ✅ above
});

// Helper function to get tab from URL hash
const getTabFromHash = () => {
  const hash = window.location.hash.slice(1); // Remove the # symbol
  const validTabs = ['comment', 'subtasks', 'logs', 'files', 'parent'];
  return validTabs.includes(hash) ? hash : null;
};

// Helper function to update URL hash
const updateHash = (tab, isInitialLoad = false) => {
  const currentHash = window.location.hash.slice(1);
  const targetHash = tab === 'comment' ? '' : tab;
  
  // Don't remove hash during initial load if there's already a hash
  if (isInitialLoad && tab === 'comment' && currentHash) {
    return; // Preserve existing hash during initial load
  }
  
  // Only update if hash is different to prevent unnecessary hashchange events
  if (currentHash !== targetHash) {
    if (tab === 'comment') {
      // Remove hash if it's the default comment tab
      window.history.replaceState(null, null, window.location.pathname);
    } else {
      window.history.replaceState(null, null, `#${tab}`);
    }
  }
};

const TaskDetail = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  console.log('userData', userData)
  const { projectName: urlProjectName, id: routeId } = useParams();

  // Convert URL project name back to original format
  const getProjectNameFromUrl = (urlName) => {
    if (!urlName) return null;
    return urlName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const urlProjectDisplayName = getProjectNameFromUrl(urlProjectName);
  const toUrlProjectName = (name) =>
    String(name || "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
  const tenantName = (() => {
    const fromRedux = userData?.tenant?.name;
    if (fromRedux && String(fromRedux).trim()) return fromRedux;
    try {
      const u = JSON.parse(localStorage.getItem("userDetails") || "{}");
      const fromStorage = u?.tenant?.name || u?.company?.name;
      return fromStorage && String(fromStorage).trim() ? fromStorage : "";
    } catch (_) {
      return "";
    }
  })();
  const tenantId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('userDetails') || '{}');
      return u?.tenantId || u?.tenant?.id || u?.tenant?.tenantId || u?.company?.tenantId || u?.company?.id || '';
    } catch (_) {
      return '';
    }
  })();
  // 🔹 Retrieve task data from sessionStorage if opened in a new tab
  const savedData = sessionStorage.getItem('newTabTaskData');
  const parsedData = savedData ? JSON.parse(savedData) : null;

  // Use parsed data only if React Router's location.state is missing
  const location = useLocation();
  const task = location.state?.itemData || parsedData?.itemData;
  const projectName = urlProjectDisplayName || location.state?.projectName || parsedData?.projectName;

  // Prefer route param id, but also support state/session-only navigation
  const id = routeId || task?.id || parsedData?.itemData?.id;

  // If no task data from state/sessionStorage, create a basic task object with the ID from URL
  const [effectiveTask, setEffectiveTask] = useState(task || { id });

  // Get project name from URL, state, or task data
  const projectNameFromTask = effectiveTask?.project?.name || task?.project?.name || parsedData?.itemData?.project?.name;
  const finalProjectName = projectNameFromTask || urlProjectDisplayName;
  const breadcrumbProjectSlug = urlProjectName || toUrlProjectName(finalProjectName);
  const navigate = useNavigate();

  // Precompute breadcrumb paths so anchors show URLs on hover
  const breadcrumbProjectsPath = '/home/projectTracking/board';

  const handleProjectsBreadcrumbClick = (e) => {
    e?.stopPropagation?.();
    // If user used modifier keys or middle-click, allow default browser behavior
    if (e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey || e?.button === 1) {
      return;
    }
    e?.preventDefault?.();
    navigate(breadcrumbProjectsPath);
  };

  // Compute project breadcrumb path after `effectiveTask` is defined
  const breadcrumbProjectPath = breadcrumbProjectSlug
    ? buildProjectListPath({
        slug: breadcrumbProjectSlug,
        projectId:
          effectiveTask?.projectId || task?.projectId || parsedData?.itemData?.projectId,
      })
    : null;

  const handleProjectBreadcrumbClick = (e) => {
    e?.stopPropagation?.();
    // Allow modifier-keys / middle-click to open in new tab/window
    if (e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey || e?.button === 1) {
      return;
    }
    e?.preventDefault?.();
    if (!breadcrumbProjectSlug || !breadcrumbProjectPath) return;
    navigate(breadcrumbProjectPath);
  };
  // Initialize state variables outside the conditional block
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const [selectedTaskType, setSelectedTaskType] = useState(null);
  const [selectedTaskLevel, setSelectedTaskLevel] = useState(null);
  const [selectedTaskEstimation, setSelectedTaskEstimation] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAssignTo, setSelectedAssignTo] = useState(null);
  const [selectedAssignToName, setSelectedAssignToName] = useState(null);
  const [userList, setUserList] = useState([]);
  const [apiProjectName, setApiProjectName] = useState("");
  const [taskDetail, setTaskDetail] = useState(null);
  const resolvedBreadcrumbName = taskDetail?.project?.name || taskDetail?.projectName || apiProjectName || finalProjectName;
  const [projectDetail, setProjectDetail] = useState([]);
  const [projectDetailLoaded, setProjectDetailLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState([]);
  const [taskLevel, setTaskLevel] = useState([]);
  const [taskEstimation, setTaskEstimation] = useState([]);
  const [agentName, setAgentName] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [taskTypeName, setTaskTypeName] = useState("");
  const [taskLevelName, setTaskLevelName] = useState("");
  const [comments, setComments] = useState("");
  const [activeTab, setActiveTab] = useState("comment"); // Start with default, will be updated by hash after data loads
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load to prevent hash removal
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileUploadKey, setFileUploadKey] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [commentPendingDelete, setCommentPendingDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640,
  );
  const commentTextareaRef = useRef(null);
  // When a pseudo-main is converted, we want to render the newly created parent task.
  // Track which taskId to display; default to incoming task.id
  const [displayTaskId, setDisplayTaskId] = useState(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [embeddedParentTask, setEmbeddedParentTask] = useState(null);
  const [isEditingTaskInfo, setIsEditingTaskInfo] = useState(false);
  const [originalTaskValues, setOriginalTaskValues] = useState({ title: "", description: "" });
  const [originalRightSectionValues, setOriginalRightSectionValues] = useState({
    phaseId: "",
    taskTypeId: "",
    taskLevelId: "",
    startDate: null,
    endDate: null,
    priority: "",
    assignee: "",
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateViewport = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  // Update URL to reflect the real project name once task/project data is loaded
  useEffect(() => {
    const name = taskDetail?.project?.name || taskDetail?.projectName || apiProjectName;
    if (name && id) {
      const correctSlug = toUrlProjectName(name);
      const newUrl = `/home/taskDetail/${correctSlug}/${id}`;
      if (newUrl !== location.pathname) {
        navigate(newUrl, { replace: true, state: location.state });
      }
    }
  }, [taskDetail?.project?.name, taskDetail?.projectName, apiProjectName, id, location.pathname, location.state, navigate]);

  const breadcrumbTaskId = taskDetail?.id || displayTaskId || id;
  const handleTaskBreadcrumbClick = (e) => {
    e?.stopPropagation?.();
    // Allow modifier-keys / middle-click to open in new tab/window
    if (e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey || e?.button === 1) {
      return;
    }
    e?.preventDefault?.();
    if (!breadcrumbTaskId) return;
    const taskUrl = breadcrumbProjectSlug
      ? `/home/taskDetail/${breadcrumbProjectSlug}/${breadcrumbTaskId}`
      : `/home/taskDetail/${breadcrumbTaskId}`;
    navigate(taskUrl, {
      state: {
        itemData: taskDetail || task || effectiveTask,
        projectName: urlProjectDisplayName || projectName,
        fromRoute: location.state?.fromRoute,
      },
    });
  };

  const isSubtask = Boolean(taskDetail?.parentId || effectiveTask?.parentId);

  const phaseOptions = Array.isArray(projectDetail)
    ? projectDetail.map((phase) => ({
      id: phase.id,
      name: phase.phase,
    }))
    : [];

  const handleFileUpload = (file) => {
    setUploadedFile(file);
  };

  const handleCommentChange = (e) => {
    const textContent = e.target.value;
    const cursorPosition = e.target.selectionStart ?? textContent.length;
    setComments(textContent);

    const textBeforeCursor = textContent.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');

      if (spaceIndex === -1 || spaceIndex >= textAfterAt.length) {
        const searchQuery = textAfterAt;
        setMentionSearch(searchQuery);

        let filtered;
        if (searchQuery.trim() === '') {
          filtered = [...userList].sort((a, b) => a.name.localeCompare(b.name));
        } else {
          filtered = userList
            .filter(user =>
              user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
        }

        setFilteredUsers(filtered);
        setShowMentions(filtered.length > 0);
        setMentionIndex(0);
      } else {
        setShowMentions(false);
        setFilteredUsers([]);
      }
    } else {
      setShowMentions(false);
      setFilteredUsers([]);
    }
  };

  const applyColoredMentions = (editableDiv, cursorPosition) => {
    const textContent = editableDiv.innerText || editableDiv.textContent;
    const newHTML = textContent.includes("@")
      ? buildMentionHighlightedInnerHTML(textContent, userList)
      : escapeHtml(textContent);

    const currentHTML = editableDiv.innerHTML;
    if (currentHTML === newHTML) {
      return;
    }

    // Store current selection
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    // Update HTML
    editableDiv.innerHTML = newHTML;

    // Restore cursor position using text-based approach
    if (range !== null) {
      try {
        // Create a walker to find the text node at the cursor position
        const walker = document.createTreeWalker(
          editableDiv,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let currentPos = 0;
        let targetNode = null;
        let targetOffset = 0;

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent.length;

          if (currentPos + nodeLength >= cursorPosition) {
            targetNode = node;
            targetOffset = cursorPosition - currentPos;
            break;
          }

          currentPos += nodeLength;
        }

        if (targetNode) {
          const newRange = document.createRange();
          newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent.length));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } catch (e) {
        // Fallback: set cursor to end
        const newRange = document.createRange();
        newRange.selectNodeContents(editableDiv);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  };

  const extractTaggedUserIds = (commentText) =>
    extractTaggedUserIdsFromComment(commentText, userList);

  const handleMentionSelect = (user) => {
    const textarea = commentTextareaRef.current;
    const cursorPosition = textarea?.selectionStart ?? comments.length;

    const textBeforeCursor = comments.substring(0, cursorPosition);
    const textAfterCursor = comments.substring(cursorPosition);

    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const beforeMention = textBeforeCursor.substring(0, lastAtIndex);

    const newComment = beforeMention + '@' + user.name + ' ' + textAfterCursor;
    const newCursorPosition = beforeMention.length + user.name.length + 2;

    setComments(newComment);
    setShowMentions(false);
    setFilteredUsers([]);
    setMentionSearch('');

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showMentions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % filteredUsers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === 'Enter' && filteredUsers[mentionIndex]) {
      e.preventDefault();
      handleMentionSelect(filteredUsers[mentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
      setFilteredUsers([]);
    }
  };

  // URL detection regex - matches http, https, and www URLs
const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

// Function to detect URLs in text
const getUrlsInText = (text) => {
  if (!text) return [];
  const matches = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      url: match[0],
    });
  }
  return matches;
};

// Function to normalize URL (add https:// if missing)
const normalizeUrl = (url) => {
  if (url.startsWith('www.')) {
    return `https://${url}`;
  }
  return url;
};

const renderCommentWithMentionsAndLinks = (comment) => {
    if (!comment) return "";
    
    // Get mention ranges and URL ranges
    const mentionRanges = getMentionRangesInText(comment, userList);
    const urlRanges = getUrlsInText(comment);
    
    // Combine all ranges and sort by start position
    const allRanges = [...mentionRanges, ...urlRanges].sort((a, b) => a.start - b.start);
    
    if (allRanges.length === 0) return comment;
    
    const parts = [];
    let last = 0;
    let key = 0;
    
    for (const range of allRanges) {
      // Add text before this range
      if (range.start > last) {
        parts.push(<span key={key++}>{comment.slice(last, range.start)}</span>);
      }
      
      // Determine if this is a mention or URL
      const isMention = mentionRanges.some(m => m.start === range.start && m.end === range.end);
      
      if (isMention) {
        // Render mention with blue styling
        parts.push(
          <span key={key++} style={{ color: "#1E40AF", fontWeight: 500 }}>
            {comment.slice(range.start, range.end)}
          </span>,
        );
      } else {
        // Render URL as clickable link
        const url = comment.slice(range.start, range.end);
        const normalizedUrl = normalizeUrl(url);
        parts.push(
          <a
            key={key++}
            href={normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: "#1E40AF", 
              textDecoration: "underline",
              cursor: "pointer"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>,
        );
      }
      
      last = range.end;
    }
    
    // Add remaining text
    if (last < comment.length) {
      parts.push(<span key={key++}>{comment.slice(last)}</span>);
    }
    
    return parts;
  };

const renderCommentWithMentions = (comment) => {
    if (!comment) return "";
    const ranges = getMentionRangesInText(comment, userList);
    if (ranges.length === 0) return comment;
    const parts = [];
    let last = 0;
    let key = 0;
    for (const { start, end } of ranges) {
      if (start > last) {
        parts.push(<span key={key++}>{comment.slice(last, start)}</span>);
      }
      parts.push(
        <span key={key++} style={{ color: "#1E40AF", fontWeight: 500 }}>
          {comment.slice(start, end)}
        </span>,
      );
      last = end;
    }
    if (last < comment.length) {
      parts.push(<span key={key++}>{comment.slice(last)}</span>);
    }
    return parts;
  };

  const canEditCoreFields =
    userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource" || userData?.id === effectiveTask?.creator?.id;

  const canEditPhaseTypeLevelFields =
    userData?.roleTitle === "Admin" ||
    userData?.roleTitle === "Human Resource" ||
    userData?.id === effectiveTask?.creator?.id ||
    userData?.roleTitle === "QA Engineer";

  const validateRequiredEditableFields = () => {
    const missing = [];

    const addMissing = (label) => {
      if (!missing.includes(label)) missing.push(label);
    };

    if (canEditCoreFields) {
      if (projectTitle.trim() === "") addMissing("Title");
      if (description.trim() === "") addMissing("Description");
      if (!selectedStatus) addMissing("Status");
      if (!selectedAssignTo) addMissing("Assignee");
      if (!selectedTaskType) addMissing("Task Type");
    }

    if (canEditPhaseTypeLevelFields) {
      if (!selectedPhaseId) addMissing("Phase");
      if (!selectedTaskLevel) addMissing("Task Level");
    }

    if (!startDate) addMissing("Start Date");
    if (!endDate) addMissing("End Date");

    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.join(", ")}`);
      return false;
    }
    return true;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const inFlightTaskFetchRef = useRef(null);
  const lastCommentPostedAtRef = useRef(0);
  const lastHydratedTaskIdRef = useRef(null);
  const statusChangeInFlightRef = useRef(false);

  const fetchTaskDetails = async (taskId = id, { force = false } = {}) => {
    if (!taskId) return null;
    // After posting a comment, the backend/gateway may transiently fail on immediate refetch.
    // Skip refetches briefly unless explicitly forced.
    if (!force) {
      const since = Date.now() - (lastCommentPostedAtRef.current || 0);
      if (since >= 0 && since < 3000) return null;
    }
    if (force) {
      lastHydratedTaskIdRef.current = null;
    }
    // Dedupe concurrent calls (comment + render effects etc)
    if (inFlightTaskFetchRef.current) return inFlightTaskFetchRef.current;

    setLoading(true);
    const run = (async () => {
      try {
        const taskEndpoint = `${baseURl}task/${taskId}`;
        const res = await getRequestWithOutBody(taskEndpoint, accessToken);
        const taskData = res?.data?.data ?? res?.data;
        if (taskData) {
          if (taskData?.isSubtask === true && taskData?.parentId) {
            const parentFromTask =
              taskData?.task?.id &&
                Number(taskData.task.id) === Number(taskData.parentId)
                ? taskData.task
                : null;

            const parentFromParentTask =
              taskData?.parentTask?.id &&
                Number(taskData.parentTask.id) === Number(taskData.parentId)
                ? taskData.parentTask
                : null;

            setEmbeddedParentTask(
              parentFromTask || parentFromParentTask || null,
            );
          } else {
            setEmbeddedParentTask(null);
          }

          setEffectiveTask(taskData);
          setTaskDetail(taskData);
          return taskData;
        }
        return null;
      } catch (error) {
        // If task fetch fails, try as subtask
        try {
          const subtaskEndpoint = `${baseURl}subtask/${taskId}`;
          const res2 = await getRequestWithOutBody(subtaskEndpoint, accessToken);
          const taskData2 = res2?.data?.data ?? res2?.data;
          if (taskData2) {
            if (taskData2?.isSubtask === true && taskData2?.parentId) {
              const parentFromTask =
                taskData2?.task?.id &&
                  Number(taskData2.task.id) === Number(taskData2.parentId)
                  ? taskData2.task
                  : null;

              const parentFromParentTask =
                taskData2?.parentTask?.id &&
                  Number(taskData2.parentTask.id) === Number(taskData2.parentId)
                  ? taskData2.parentTask
                  : null;

              setEmbeddedParentTask(
                parentFromTask || parentFromParentTask || null,
              );
            } else {
              setEmbeddedParentTask(null);
            }

            setEffectiveTask(taskData2);
            setTaskDetail(taskData2);
            return taskData2;
          }
          throw error;
        } catch (error2) {
          throw error2;
        }
      } finally {
        inFlightTaskFetchRef.current = null;
        setLoading(false);
      }
    })();

    inFlightTaskFetchRef.current = run;
    return run;
  };

  const refreshTaskDetailsWithRetry = async (taskId = id) => {
    // Exponential backoff for transient gateway errors
    const delays = [400, 900, 1600];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      try {
        return await fetchTaskDetails(taskId);
      } catch (e) {
        const status = e?.status;
        if (status !== 502 && status !== 504) throw e;
        await sleep(delays[attempt]);
      }
    }
    // final attempt
    return await fetchTaskDetails(taskId);
  };

  const appendLocalComment = (commentsArray, uploadedFiles, commentId) => {
    const text = commentsArray?.comment?.trim();
    const files = uploadedFiles || commentsArray?.files;

    if (text) {
      const resolvedUserName =
        userData?.name ||
        userData?.fullName ||
        userData?.username ||
        userData?.email ||
        userData?.user?.name ||
        "Unknown";

      const newComment = {
        ...(commentId != null ? { id: commentId } : {}),
        comment: text,
        createdAt: new Date().toISOString(),
        user: {
          id: userData?.id,
          name: resolvedUserName,
          email: userData?.email,
          profilePicture: userData?.profilePicture ?? userData?.profileImage ?? null,
        },
        userId: userData?.id,
        files: Array.isArray(files) ? files : [],
      };

      setTaskDetail((prev) => {
        if (!prev) return prev;
        const existing = Array.isArray(prev.comments) ? prev.comments : [];
        return { ...prev, comments: [newComment, ...existing] };
      });
      return;
    }

    if (Array.isArray(files) && files.length > 0) {
      setTaskDetail((prev) => {
        if (!prev) return prev;
        const existing = Array.isArray(prev.files) ? prev.files : [];
        return { ...prev, files: [...existing, ...files] };
      });
    }
  };
  const priorityOptions = [
    { id: "low", name: "Low" },
    { id: "medium", name: "Medium" },
    { id: "high", name: "High" },
  ];

  const fetchData2 = () => {
    getRequestWithOutBody(`${baseURl}user`, accessToken)
      .then((result) => {
        const activeUsers =
          result?.data?.results?.filter((user) => user.status === "active") || [];
        setUserList(activeUsers);
      })
      .catch((error) => {
      });
  };
  // fetchTaskDetails is defined above as an async function

  const fetchData = () => {
    // Only fetch project data if we have a valid projectId
    if (!effectiveTask?.projectId) {
      return;
    }
    getRequestWithOutBody(
      `${baseURl}project/${effectiveTask?.projectId}`,
      accessToken,
    )
      .then((result) => {
        setProjectDetail(result?.data?.phases || []);
        setProjectDetailLoaded(true);
        const name = result?.data?.name || result?.data?.projectName;
        if (name) setApiProjectName(name);
      })
      .catch((error) => {
        setProjectDetailLoaded(true);
      });
  };

  const fetchData5 = () => {
    getRequestWithOutBody(`${baseURl}task/types`, accessToken)
      .then((result) => {
        setTaskType(result?.data);
      })
      .catch((error) => {
      });
  };
  const fetchData6 = () => {
    getRequestWithOutBody(`${baseURl}task/levels`, accessToken)
      .then((result) => {
        setTaskLevel(result?.data);
      })
      .catch((error) => {
      });
  };
  const fetchData4 = () => {

    getRequestWithOutBody(`${baseURl}task/estimations`, accessToken)
      .then((result) => {
        setTaskEstimation(result?.data);
      })
      .catch((error) => {
      });
  };
  const fetchData3 = () => {
    // Avoid calling task/subtask detail endpoints immediately after posting a comment.
    // The backend/gateway intermittently returns 502 for a short window post-mutation.
    const since = Date.now() - (lastCommentPostedAtRef.current || 0);
    if (since >= 0 && since < 3000) return;

    // Only set loading if not already loading and we don't have task detail data
    if (!loading && !taskDetail?.id) {
      setLoading(true);
    }

    // Check if the task has a parentId (not null or undefined)
    const effectiveTaskId = displayTaskId || effectiveTask?.id;
    const endpoint =
      effectiveTask?.parentId && effectiveTask.isSubtask && !displayTaskId
        ? `${baseURl}subtask/${effectiveTaskId}`
        : effectiveTask?.parentId === null &&
          effectiveTask.isSubtask === true &&
          !displayTaskId
          ? `${baseURl}subtask/${effectiveTaskId}`
          : `${baseURl}task/${effectiveTaskId}`;
    getRequestWithOutBody(endpoint, accessToken)
      .then((result) => {
        const data = result?.data?.data ?? result?.data;

        // When a subtask response includes its parent task object, keep the current (subtask) view,
        // but expose the parent via a dedicated tab.
        if (data?.isSubtask === true && data?.parentId) {
          const parentFromTask =
            data?.task?.id && Number(data.task.id) === Number(data.parentId)
              ? data.task
              : null;

          const parentFromParentTask =
            data?.parentTask?.id &&
              Number(data.parentTask.id) === Number(data.parentId)
              ? data.parentTask
              : null;

          setEmbeddedParentTask(parentFromTask || parentFromParentTask || null);
        } else {
          setEmbeddedParentTask(null);
        }

        setTaskDetail(data);

        if (data) {
          setProjectTitle(data.title || "");
          setDescription(data.description || "");
          setSelectedStatus(data.status || "pending");
          setSelectedPriority(data.priority || "low");
          setSelectedTaskType(data.taskTypeId || "");
          setSelectedTaskLevel(data.taskLevelId || "");
          setSelectedTaskEstimation(data.taskEstimateId || "");
          setSelectedAssignTo(data.assignee?.user?.id || "");
          setSelectedAssignToName(data.assignee?.user?.name || "");
          setAgentName(data?.assignments?.[0]?.user?.name);
          setSelectedPhaseId(data.phaseId || "");
          setPhaseName(
            phaseOptions.find((phase) => phase.id === data.phaseId)
              ?.name,
          );
          setTaskTypeName(
            taskType.find((taskType) => taskType.id === data.taskTypeId)
              ?.type,
          );
          setTaskLevelName(
            taskLevel.find(
              (taskLevel) => taskLevel.id === data.taskLevelId,
            )?.level,
          );

          // Convert ISO strings to readable local dates
          setStartDate(
            data.startDate
              ? new Date(data.startDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
              : null,
          );
          setEndDate(
            data.endDate
              ? new Date(data.endDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
              : null,
          );
        }
      })
      .catch((error) => {
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData2();
    fetchData5();
    fetchData6();
    fetchData4();
  }, []);

  useEffect(() => {
    if (!id) return;
    // Reset local state so UI doesn't show stale data when navigating between tasks
    setLoading(true);
    setEffectiveTask(task || { id });
    setTaskDetail(null);
    refreshTaskDetailsWithRetry(id);
  }, [id]);

  useEffect(() => {
    // Only call fetchData when we have projectId
    if (effectiveTask?.projectId) {
      fetchData();
    }
  }, [effectiveTask?.projectId]);

  useEffect(() => {
    // Populate form fields from fetched detail.
    // Important: only hydrate when switching to a different task id.
    // Otherwise this effect can fight user typing when dropdown options load.
    if (!taskDetail || !taskDetail.id) return;
    if (lastHydratedTaskIdRef.current === taskDetail.id) return;
    lastHydratedTaskIdRef.current = taskDetail.id;

    setProjectTitle(taskDetail.title || "");
    setDescription(taskDetail.description || "");
    setSelectedStatus(taskDetail.status || "pending");
    setSelectedPriority(taskDetail.priority || "low");
    setSelectedTaskType(taskDetail.taskTypeId || "");
    setSelectedTaskLevel(taskDetail.taskLevelId || "");
    setSelectedTaskEstimation(taskDetail.taskEstimateId || "");
    setSelectedAssignTo(taskDetail.assignee?.user?.id || "");
    setSelectedAssignToName(taskDetail.assignee?.user?.name || "");
    setAgentName(taskDetail?.assignments?.[0]?.user?.name);
    setSelectedPhaseId(taskDetail.phaseId || "");

    setPhaseName(
      phaseOptions.find((phase) => phase.id === taskDetail.phaseId)?.name || "",
    );
    setTaskTypeName(
      taskType.find((t) => t.id === taskDetail.taskTypeId)?.type || "",
    );
    setTaskLevelName(
      taskLevel.find((l) => l.id === taskDetail.taskLevelId)?.level || "",
    );

    const hydratedStartDate = taskDetail.startDate
      ? new Date(taskDetail.startDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      : null;
    const hydratedEndDate = taskDetail.endDate
      ? new Date(taskDetail.endDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      : null;

    setStartDate(hydratedStartDate);
    setEndDate(hydratedEndDate);

    setOriginalRightSectionValues({
      phaseId: taskDetail.phaseId || "",
      taskTypeId: taskDetail.taskTypeId || "",
      taskLevelId: taskDetail.taskLevelId || "",
      startDate: hydratedStartDate,
      endDate: hydratedEndDate,
      priority: taskDetail.priority || "low",
      assignee: taskDetail.assignee?.user?.id || "",
    });
  }, [taskDetail, phaseOptions, taskType, taskLevel]);

  // Optimized phaseName setting - only set when needed
  useEffect(() => {
    if (taskDetail?.phaseId && phaseOptions.length > 0 && !phaseName) {
      const phase = phaseOptions.find((phase) => phase.id === taskDetail.phaseId);
      if (phase) {
        setPhaseName(phase.name);
      }
    }
  }, [taskDetail?.phaseId, phaseOptions]);

  // Keep dropdown labels in sync with selected ids (e.g. after save + refetch)
  useEffect(() => {
    if (!selectedTaskType || !taskType?.length) return;
    const typeName = taskType.find((t) => t.id === selectedTaskType)?.type;
    if (typeName) setTaskTypeName(typeName);
  }, [selectedTaskType, taskType]);

  useEffect(() => {
    if (!selectedTaskLevel || !taskLevel?.length) return;
    const levelName = taskLevel.find((l) => l.id === selectedTaskLevel)?.level;
    if (levelName) setTaskLevelName(levelName);
  }, [selectedTaskLevel, taskLevel]);

  useEffect(() => {
    // Only call fetchData3 when the dependencies are ready and we need task detail data
    if (
      effectiveTask?.id &&
      taskType?.length > 0 &&
      taskLevel?.length > 0 &&
      !taskDetail?.id
    ) {
      fetchData3();
    }
  }, [effectiveTask?.id, displayTaskId, taskType, taskLevel, projectDetail]);

  // If viewing a subtask, default away from the Sub Tasks tab
  useEffect(() => {
    if (isSubtask && activeTab === "subtasks") {
      setActiveTab("comment");
    }
  }, [isSubtask]);

  // If parent tab disappears, fall back to comments.
  useEffect(() => {
    if (activeTab === 'parent' && !embeddedParentTask) {
      setActiveTab('comment');
    }
  }, [activeTab, embeddedParentTask]);

  // Handle URL hash changes and initial tab setting
  useEffect(() => {
    const handleHashChange = () => {
      const tabFromHash = getTabFromHash();
      if (tabFromHash && tabFromHash !== activeTab) {
        setActiveTab(tabFromHash);
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Set initial tab based on priority: location.state > hash > default
    if (!loading && taskDetail?.id) {
      const stateTab = location.state?.activeTab;
      const hashTab = getTabFromHash();
      
      if (stateTab && stateTab !== activeTab) {
        setActiveTab(stateTab);
      } else if (hashTab && hashTab !== activeTab) {
        setActiveTab(hashTab);
      }
      
      // Mark initial load as complete after setting the tab
      setIsInitialLoad(false);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [loading, taskDetail?.id, location.state?.activeTab]); // Add location.state dependency

  // Update URL hash when active tab changes
  useEffect(() => {
    updateHash(activeTab, isInitialLoad);
  }, [activeTab, isInitialLoad]);

  useEffect(() => {
    if (startDate && selectedTaskType && selectedTaskLevel) {
      const match = taskEstimation.find(
        (item) =>
          item.taskType.id === selectedTaskType &&
          item.taskLevel.id === selectedTaskLevel,
      );

      if (match) {
        const estimatedDays = match.estimatedDays;
        const estimatedId = match.id;
        const newEndDate = moment(startDate)
          .add(estimatedDays, "days")
          .format("YYYY-MM-DD");
        setEndDate(newEndDate);
        setSelectedTaskEstimation(estimatedId);
      } else {
        setEndDate("");
        setSelectedTaskEstimation(null);
      }
    }
  }, [startDate, selectedTaskType, selectedTaskLevel, taskEstimation]);

  // Update browser tab title to match heading format
  usePageTitle(`${urlProjectDisplayName ? `${urlProjectDisplayName} | ${id}` : id}`, location);

  const handleTitleChange = (e) => {
    setProjectTitle(e.target.value);
  };

  // Check if task information has been changed from original values
  const hasTaskInfoChanges = () => {
    return originalTaskValues.title !== projectTitle || originalTaskValues.description !== description;
  };

  const normalizeAssigneeId = (assignee) => {
    if (!assignee) return "";
    if (typeof assignee === "object") {
      return assignee?.user?.id ?? assignee?.id ?? "";
    }
    return assignee;
  };

  const normalizeDateValue = (date) => (date ? String(date) : "");

  const hasRightSectionChanges = () => {
    const orig = originalRightSectionValues;
    return (
      String(orig.phaseId || "") !== String(selectedPhaseId || "") ||
      String(orig.taskTypeId || "") !== String(selectedTaskType || "") ||
      String(orig.taskLevelId || "") !== String(selectedTaskLevel || "") ||
      normalizeDateValue(orig.startDate) !== normalizeDateValue(startDate) ||
      normalizeDateValue(orig.endDate) !== normalizeDateValue(endDate) ||
      (orig.priority || "") !== (selectedPriority || "") ||
      String(normalizeAssigneeId(orig.assignee)) !==
        String(normalizeAssigneeId(selectedAssignTo))
    );
  };

  // Handle starting edit mode - store original values
  const handleStartEditing = () => {
    setOriginalTaskValues({
      title: projectTitle,
      description: description
    });
    setIsEditingTaskInfo(true);
  };

  const handleNewPhaseNameChange = (e) => {
    setNewPhaseName(e.target.value);
  };

  const handleSelectionChange = (items) => {
    setSelectedAssignTo(items);
  };
  const formatAssignments = (assignments) => {
    return assignments.map((item) => {
      if (item.user && item.id) {
        // Case 1: id and user both present
        return {
          id: item.id,
          user: item.user,
        };
      } else if (item.user) {
        // Case 2: only user present
        return {
          user: {
            id: item.user.id,
          },
        };
      } else {
        // Case 3: no nested user, flatten it
        return {
          user: {
            id: item.id,
            name: item.name,
            email: item.email,
          },
        };
      }
    });
  };



  // Helper: upload selected files and return normalized list
  const uploadFiles = async () => {
    let uploadedFiles = [];
    if (uploadedFile && Array.isArray(uploadedFile)) {
      for (const file of uploadedFile) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "tickets");
        const result1 = await postRequestWithFormData(
          `${baseURl}files`,
          accessToken,
          formData,
        );
        uploadedFiles.push({
          url: result1?.data?.uploadedFiles?.url,
          mimetype: result1?.data?.uploadedFiles?.mimetype,
          originalname: result1?.data?.uploadedFiles?.originalname,
        });
      }
    }
    return uploadedFiles;
  };

  const postTaskComment = async (commentsArray) => {
    const result = await postRequestWithBodyAndToken(
      `${baseURl}task-comment`,
      accessToken,
      commentsArray,
    );
    lastCommentPostedAtRef.current = Date.now();
    const createdId =
      result?.data?.id ??
      result?.data?.commentId ??
      result?.data?.comment?.id ??
      result?.id;
    appendLocalComment(commentsArray, null, createdId);
    return result;
  };

  const getCommentAuthorId = (comment) =>
    comment?.user?.id ?? comment?.userId ?? comment?.createdBy ?? null;

  const canManageComment = (comment) => {
    const authorId = getCommentAuthorId(comment);
    if (authorId == null || userData?.id == null) return false;
    return String(authorId) === String(userData.id);
  };

  const getTaskCommentUrl = (commentId) =>
    `${baseURl}task/${effectiveTask.id}/comment/${commentId}`;

  const updateLocalCommentText = (commentId, nextText) => {
    setTaskDetail((prev) => {
      if (!prev || !Array.isArray(prev.comments)) return prev;
      return {
        ...prev,
        comments: prev.comments.map((c) =>
          String(c.id) === String(commentId)
            ? { ...c, comment: nextText, updatedAt: new Date().toISOString() }
            : c,
        ),
      };
    });
  };

  const removeLocalComment = (commentId) => {
    setTaskDetail((prev) => {
      if (!prev || !Array.isArray(prev.comments)) return prev;
      return {
        ...prev,
        comments: prev.comments.filter((c) => String(c.id) !== String(commentId)),
      };
    });
  };

  const handleStartEditComment = (comment) => {
    if (!comment?.id) {
      toast.error("Comment id not found. Please refresh and try again.");
      return;
    }
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment || "");
    setShowMentions(false);
    setFilteredUsers([]);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEditComment = async () => {
    const commentText = editingCommentText.trim();
    if (!commentText) {
      toast.error("Please enter a comment.");
      return;
    }
    if (!editingCommentId) return;

    setSavingComment(true);
    try {
      const taggedIds = extractTaggedUserIds(commentText);
      const body = {
        comment: commentText,
        ...(tenantId ? { tenantId } : {}),
        ...(taggedIds.length > 0 && { taggedUserIds: taggedIds }),
      };
      const result = await putRequestWithBodyAndToken(
        getTaskCommentUrl(editingCommentId),
        accessToken,
        body,
      );
      updateLocalCommentText(editingCommentId, commentText);
      setEditingCommentId(null);
      setEditingCommentText("");
      toast.success(result?.message || "Comment updated successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to update comment.");
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    const commentId = commentPendingDelete?.id;
    if (!commentId) return;

    setDeletingComment(true);
    try {
      const result = await deleteRequest(
        getTaskCommentUrl(commentId),
        accessToken,
      );
      removeLocalComment(commentId);
      if (String(editingCommentId) === String(commentId)) {
        handleCancelEditComment();
      }
      setCommentPendingDelete(null);
      toast.success(result?.message || "Comment deleted successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to delete comment.");
    } finally {
      setDeletingComment(false);
    }
  };

  const handleAddComment = async () => {
    const commentText = comments.trim();
    if (!commentText) {
      toast.error("Please enter a comment.");
      return;
    }

    setLoading(true);
    try {
      const taggedIds = extractTaggedUserIds(commentText);
      const commentsArray = {
        comment: commentText,
        taskId: effectiveTask.id,
        userId: userData?.id,
        ...(tenantId ? { tenantId } : {}),
        ...(taggedIds.length > 0 && { taggedUserIds: taggedIds }),
      };
      const result = await postTaskComment(commentsArray);
      setComments("");
      toast.success(result?.message || "Comment saved successfully.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFiles = async () => {
    if (!uploadedFile?.length) {
      toast.error("Please attach a file.");
      return;
    }

    setLoading(true);
    try {
      const uploadedFiles = await uploadFiles();
      if (!uploadedFiles.length) {
        toast.error("Failed to upload files.");
        return;
      }

      const commentsArray = {
        comment: "",
        taskId: effectiveTask.id,
        userId: userData?.id,
        ...(tenantId ? { tenantId } : {}),
        files: uploadedFiles,
      };
      const result = await postTaskComment(commentsArray);
      setUploadedFile(null);
      setFileUploadKey((key) => key + 1);
      toast.success(result?.message || "Files saved successfully.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!validateRequiredEditableFields()) {
      setLoading(false);
      return;
    }

    if (canEditCoreFields && startDate && endDate) {
      const startYear = dayjs(startDate).year();
      const endYear = dayjs(endDate).year();

      if (
        startYear < 1900 ||
        startYear > 2100 ||
        endYear < 1900 ||
        endYear > 2100
      ) {
        toast.error("Please select a valid date.");
        setLoading(false);
        return;
      }

      if (endDate < startDate) {
        toast.error("End Date must be after Start Date.");
        setLoading(false);
        return;
      }
    }
    try {
      const hasValidAssignee = (() => {
        if (!selectedAssignTo) return false;
        if (Array.isArray(selectedAssignTo)) return selectedAssignTo.length > 0;
        if (typeof selectedAssignTo === "object") return Object.keys(selectedAssignTo).length > 0;
        return false;
      })();

      const formattedStartDate =
        startDate && moment(startDate).isValid()
          ? moment(startDate).format("MM/DD/YYYY")
          : undefined;
      const formattedEndDate =
        endDate && moment(endDate).isValid()
          ? moment(endDate).format("MM/DD/YYYY")
          : undefined;

      // Build payload for MAIN task update only
      const taskPayload = {
        title: projectTitle,
        description: description,
        // status: selectedStatus || 'Pending',
        priority: selectedPriority || "medium",
        ...(formattedStartDate ? { startDate: formattedStartDate } : {}),
        ...(formattedEndDate ? { endDate: formattedEndDate } : {}),
        taskTypeId: selectedTaskType,
        taskLevelId: selectedTaskLevel,
        projectName: projectName,
        taskEstimateId: selectedTaskEstimation,
        // files: null, // main task keeps comment/file via task-comment
        // projectId: projectDetail[0]?.projectId?.toString() || "0",
        phaseId: selectedPhaseId,
        assignedBy: userData?.id,
        assignee: selectedAssignTo,
        ...(tenantId ? { tenantId } : {}),
      };

      const endpoint = `${baseURl}task/${effectiveTask.id}`;
      const endpoint2 = `${baseURl}subtask/${effectiveTask.id}`;
      if (effectiveTask?.isSubtask) {
        const result = await putRequestWithBodyAndToken(
          endpoint2,
          accessToken,
          taskPayload,
        );
        toast.success(result.message || "Task updated successfully.");
      } else {
        const result = await putRequestWithBodyAndToken(
          endpoint,
          accessToken,
          taskPayload,
        );
        toast.success(result.message || "Task updated successfully.");
      }
      await fetchTaskDetails(effectiveTask.id, { force: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Separate handler for title/description changes that doesn't navigate away
  const handleTaskInfoSave = async () => {
    setLoading(true);
    
    try {
      const taskPayload = {
        title: projectTitle,
        description: description,
        ...(tenantId ? { tenantId } : {}),
      };

      const endpoint = `${baseURl}task/${effectiveTask.id}`;
      const endpoint2 = `${baseURl}subtask/${effectiveTask.id}`;
      
      let result;
      if (effectiveTask?.isSubtask) {
        result = await putRequestWithBodyAndToken(
          endpoint2,
          accessToken,
          taskPayload,
        );
      } else {
        result = await putRequestWithBodyAndToken(
          endpoint,
          accessToken,
          taskPayload,
        );
      }
      
      toast.success(result.message || "Task information saved successfully!");
      
      // Refresh the task details instead of navigating away
      await fetchTaskDetails(effectiveTask.id, { force: true });
      
      // Update original values to reflect the saved state
      setOriginalTaskValues({ title: projectTitle, description });
    } catch (error) {
      toast.error(error.message || "Failed to save task information");
    } finally {
      setLoading(false);
    }
  };

  // Handler for saving only right section changes
  const handleRightSectionSave = async () => {
    setLoading(true);
    
    try {
      const formattedStartDate =
        startDate && moment(startDate).isValid()
          ? moment(startDate).format("MM/DD/YYYY")
          : undefined;
      const formattedEndDate =
        endDate && moment(endDate).isValid()
          ? moment(endDate).format("MM/DD/YYYY")
          : undefined;

      // Build payload for right section fields only
      const rightSectionPayload = {
        priority: selectedPriority || "medium",
        status: selectedStatus,
        ...(formattedStartDate ? { startDate: formattedStartDate } : {}),
        ...(formattedEndDate ? { endDate: formattedEndDate } : {}),
        taskTypeId: selectedTaskType,
        taskLevelId: selectedTaskLevel,
        phaseId: selectedPhaseId,
        assignee: selectedAssignTo,
        ...(tenantId ? { tenantId } : {}),
      };

      const endpoint = `${baseURl}task/${effectiveTask.id}`;
      const endpoint2 = `${baseURl}subtask/${effectiveTask.id}`;
      
      let result;
      if (effectiveTask?.isSubtask) {
        result = await putRequestWithBodyAndToken(
          endpoint2,
          accessToken,
          rightSectionPayload,
        );
      } else {
        result = await putRequestWithBodyAndToken(
          endpoint,
          accessToken,
          rightSectionPayload,
        );
      }
      
      toast.success(result.message || "Right section changes saved successfully!");
      
      // Refresh the task details instead of reloading the whole page
      await fetchTaskDetails(effectiveTask.id, { force: true });

      setOriginalRightSectionValues({
        phaseId: selectedPhaseId || "",
        taskTypeId: selectedTaskType || "",
        taskLevelId: selectedTaskLevel || "",
        startDate,
        endDate,
        priority: selectedPriority || "",
        assignee: normalizeAssigneeId(selectedAssignTo),
      });
    } catch (error) {
      toast.error(error.message || "Failed to save right section changes");
    } finally {
      setLoading(false);
    }
  };

  // Separate handler for SUBTASK updates
  const handleSubtaskUpdate = async () => {
    setLoading(true);
    if (!validateRequiredEditableFields()) {
      setLoading(false);
      return;
    }

    if (canEditCoreFields && startDate && endDate) {
      const startYear = dayjs(startDate).year();
      const endYear = dayjs(endDate).year();
      if (
        startYear < 1900 ||
        startYear > 2100 ||
        endYear < 1900 ||
        endYear > 2100
      ) {
        toast.error("Please select a valid date.");
        setLoading(false);
        return;
      }
      if (endDate < startDate) {
        toast.error("End Date must be after Start Date.");
        setLoading(false);
        return;
      }
    }

    try {
      const parentId = taskDetail?.parentId || effectiveTask?.parentId || null;
      const projectIdForPayload =
        projectDetail?.[0]?.projectId?.toString() || "0";

      const hasValidAssignee = (() => {
        if (!selectedAssignTo) return false;
        if (Array.isArray(selectedAssignTo)) return selectedAssignTo.length > 0;
        if (typeof selectedAssignTo === "object") return Object.keys(selectedAssignTo).length > 0;
        return false;
      })();

      const formattedStartDate =
        startDate && moment(startDate).isValid()
          ? moment(startDate).format("MM/DD/YYYY")
          : undefined;
      const formattedEndDate =
        endDate && moment(endDate).isValid()
          ? moment(endDate).format("MM/DD/YYYY")
          : undefined;

      const subtaskPayload = {
        title: projectTitle,
        description: description,
        taskTypeId: selectedTaskType,
        taskLevelId: selectedTaskLevel,
        taskEstimateId: selectedTaskEstimation,
        status: selectedStatus || "Pending",
        priority: selectedPriority || "medium",
        ...(formattedStartDate ? { startDate: formattedStartDate } : {}),
        ...(formattedEndDate ? { endDate: formattedEndDate } : {}),
        // Keep files managed via comments for consistency
        files: null,
        projectId: projectIdForPayload,
        projectName: projectName,
        phaseId: selectedPhaseId,
        assignedBy: userData?.id,
        createdBy: userData?.id,
        ...(tenantId ? { tenantId } : {}),
        assignee: selectedAssignTo,
        parentId: parentId,
      };

      const result = await putRequestWithBodyAndToken(
        `${baseURl}subtask/${effectiveTask.id}`,
        accessToken,
        subtaskPayload,
      );
      toast.success(result.message || "Subtask updated successfully.");
      await fetchTaskDetails(effectiveTask.id, { force: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (id) => {
    if (statusChangeInFlightRef.current) return;
    statusChangeInFlightRef.current = true;
    const previousStatus = selectedStatus;
    try {
      const body = {
        userId: userData?.id,
        ...(tenantId ? { tenantId } : {}),
        status: id,
      };
      await putRequestWithBodyAndToken(
        `${baseURl}task/update-status/${effectiveTask.id}`,
        accessToken,
        body,
      );
      toast.success("Status updated successfully.");
    } catch (error) {
      // Revert optimistic UI update so the dropdown reflects the actual saved state
      setSelectedStatus(previousStatus);
      toast.error(error.message || "Failed to update status. Please try again.");
    } finally {
      statusChangeInFlightRef.current = false;
    }
  };

  const addSubTask = () => { };

  const handleCloseAddTaskModal = () => {
    setIsAddTaskModalOpen(false);
  };

  const onSuccess = (newParentId) => {
    // If a new parent was created by convert-subtask, render that parent here
    if (newParentId) {
      setDisplayTaskId(newParentId);
    }
    fetchData3();
    setIsAddTaskModalOpen(false);
  };

  const commentCount = (taskDetail?.comments || []).filter((c) =>
    c.comment?.trim(),
  ).length;
  const subtaskCount = taskDetail?.subTasks?.length || 0;
  const logCount = (taskDetail?.logs || []).filter((log) =>
    log.details?.trim(),
  ).length;
  const fileCount =
    (taskDetail?.files?.length || 0) +
    (taskDetail?.comments || []).reduce(
      (acc, c) => acc + (c.files?.length || 0),
      0,
    );
  const parentCount = embeddedParentTask ? 1 : 0;

  const getTabLabel = (tab) => {
    const labels = {
      comment: "Comments",
      subtasks: "Sub Tasks",
      logs: "Logs",
      files: "Files",
      parent: "Parent Task",
    };
    const base = labels[tab] || tab;
    const counts = {
      comment: commentCount,
      subtasks: subtaskCount,
      logs: logCount,
      files: fileCount,
      parent: parentCount,
    };
    const count = counts[tab];
    if (count > 0) return `${base} (${count})`;
    return base;
  };

  const attachButtonWidth = isMobileViewport ? 115 : 150;
  const attachButtonHeight = isMobileViewport ? 32 : 37;
  const attachButtonFontSize = isMobileViewport ? 12 : 14;

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
        <HeaderWrapper>
          <HeaderWrapper2>
            <div className="flex flex-col">
              {(urlProjectDisplayName || id) && (
                <Heading
                  Fontweight={700}
                  color={"var(--sidebar-text-primary)"}
                  Heading={
                    loading && !taskDetail?.project?.name ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                        <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    ) : (
                      <span>
                        <a
                          href={breadcrumbProjectsPath}
                          onClick={handleProjectsBreadcrumbClick}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleProjectsBreadcrumbClick(e);
                            }
                          }}
                          style={{ color: "#2563EB", textDecoration: "underline", cursor: "pointer" }}
                        >
                          Projects
                        </a>
                        {resolvedBreadcrumbName ? (
                          <>
                            <span>{" > "}</span>
                            <a
                              href={breadcrumbProjectPath || '#'}
                              onClick={handleProjectBreadcrumbClick}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleProjectBreadcrumbClick(e);
                                }
                              }}
                              style={{ color: "#2563EB", textDecoration: "underline", cursor: "pointer" }}
                            >
                              {resolvedBreadcrumbName}
                            </a>
                          </>
                        ) : null}
                        {breadcrumbTaskId ? (
                          <>
                            <span>{" > "}</span>
                            <a
                              href={breadcrumbProjectSlug ? `/home/taskDetail/${breadcrumbProjectSlug}/${breadcrumbTaskId}` : `/home/taskDetail/${breadcrumbTaskId}`}
                              onClick={handleTaskBreadcrumbClick}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleTaskBreadcrumbClick(e);
                                }
                              }}
                              style={{ color: "#2563EB", textDecoration: "underline", cursor: "pointer" }}
                            >
                              {breadcrumbTaskId}
                            </a>
                          </>
                        ) : null}
                      </span>
                    )
                  }
                  Fontsize={24}
                />
              )}
            </div>
          </HeaderWrapper2>

          {/* Right Side - Add Sub Task and New Task Buttons (hidden for subtask view) */}
          {!isSubtask && (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigate("/home/addNewTask", {
                  state: { projectDetail: projectDetail, projectName: finalProjectName },
                })}
                disabled={loading || !projectDetailLoaded}
                className={`px-4 py-2 text-white rounded-lg ${loading || !projectDetailLoaded ? 'bg-green-300 cursor-not-allowed' : 'bg-[#10B981] hover:bg-green-600'}`}
              >
                New Task
              </button>
              <button
                onClick={() => setIsAddTaskModalOpen(true)}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#0C79F7] hover:bg-blue-600'}`}
              >
                Add Sub Task
              </button>
            </div>
          )}

        </HeaderWrapper>
        {loading ? (
          <div className="text-center w-full mx-auto">
            <Loader message="Loading..." subMessage="Please wait" />
          </div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row flex-1 gap-6">
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
                      {projectTitle || `Task #${id}`}
                    </h2>
                  </div>
                  
                  {/* Task Details Section */}
                  <div className="mb-6 p-4 sm:p-6 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Task Information</h3>
                      <div className="flex items-center gap-2">
                        {isEditingTaskInfo && (
                          <button
                            onClick={() => {
                              // Reset values to original when canceling
                              setProjectTitle(originalTaskValues.title);
                              setDescription(originalTaskValues.description);
                              setIsEditingTaskInfo(false);
                            }}
                            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors text-lg font-bold"
                            title="Cancel editing"
                          >
                            ×
                          </button>
                        )}
                        {!isEditingTaskInfo && (
                          <button
                            onClick={handleStartEditing}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            title="Edit task information"
                          >
                            <SVG.EditTask width="18" height="18" />
                          </button>
                        )}
                      </div>
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
                        disabled={!isEditingTaskInfo || (userData?.roleTitle !== "Admin" && userData?.roleTitle !== "Human Resource" && userData?.id !== effectiveTask?.creator?.id)}
                        className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white transition-colors ${
                          !isEditingTaskInfo || (userData?.roleTitle !== "Admin" && userData?.roleTitle !== "Human Resource" && userData?.id !== effectiveTask?.creator?.id) 
                            ? 'bg-gray-50 dark:bg-gray-600 cursor-not-allowed' 
                            : 'bg-white dark:bg-gray-700'
                        }`}
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
                        disabled={!isEditingTaskInfo || (userData?.roleTitle !== "Admin" && userData?.roleTitle !== "Human Resource" && userData?.id !== effectiveTask?.creator?.id)}
                        rows={5}
                        className={`w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white transition-colors ${
                          !isEditingTaskInfo || (userData?.roleTitle !== "Admin" && userData?.roleTitle !== "Human Resource" && userData?.id !== effectiveTask?.creator?.id) 
                            ? 'bg-gray-50 dark:bg-gray-600 cursor-not-allowed' 
                            : 'bg-white dark:bg-gray-700'
                        }`}
                        style={{
                          fontSize: 14,
                          resize: "vertical",
                        }}
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {description.length}/2500 characters
                      </div>
                      {isEditingTaskInfo && hasTaskInfoChanges() && (
                        <div className="mt-4">
                          <button
                            onClick={() => {
                              handleTaskInfoSave();
                              setIsEditingTaskInfo(false);
                            }}
                            className="px-4 py-2 bg-[#0C79F7] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                          >
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>

                  {/* Tabs Section - Comments, Subtasks, Logs, Files */}
                  <div className="mb-6 p-4 sm:p-6 pb-0 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                    <Heading
                      Fontweight={700}
                      color={'var(--sidebar-text-primary)'}
                      Heading={
                        activeTab === "subtasks"
                          ? "Sub Tasks"
                          : activeTab === "comment"
                            ? "Comments"
                            : activeTab === "logs"
                              ? "Activity Log"
                              : "Files"
                      }
                      Fontsize={20}
                    />

                    {/* Tabs */}
                    <div className="flex items-center border-b border-gray-300 overflow-x-auto">
                      {(isSubtask
                        ? ["comment", ...(embeddedParentTask ? ["parent"] : []), "logs", "files"]
                        : [ "comment", "subtasks", "logs", "files"]
                      ).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex items-center gap-1 px-2 sm:px-3 lg:px-4 py-2 font-medium text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab
                            ? "border-[#0C79F7] text-blue-600"
                            : "border-transparent text-[var(--dashboard-tab-text-inactive)]"
                            }`}
                        >
                          {tab === "comment" ? (
                            <SVG.BoardIcon
                              style={{
                                color:
                                  activeTab === "comment"
                                    ? "#2563eb"
                                    : "var(--dashboard-tab-text-inactive)",
                              }}
                            />
                          ) : tab === "subtasks" ? (
                            <SVG.ListIcon
                              style={{
                                color:
                                  activeTab === "subtasks"
                                    ? "#2563eb"
                                    : "var(--dashboard-tab-text-inactive)",
                              }}
                            />
                          ) : tab === "logs" ? (
                            <SVG.ListIcon
                              style={{
                                color:
                                  activeTab === "logs"
                                    ? "#2563eb"
                                    : "var(--dashboard-tab-text-inactive)",
                              }}
                            />
                          ) : (
                            <SVG.ListIcon
                              style={{
                                color:
                                  activeTab === "files"
                                    ? "#2563eb"
                                    : "var(--dashboard-tab-text-inactive)",
                              }}
                            />
                          )}
                          {getTabLabel(tab)}
                        </button>
                      ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex flex-col mt-2">
                      {activeTab === "comment" && (
                        <>
                          <div className="max-h-[420px] sm:max-h-[480px] overflow-y-auto overflow-x-hidden pb-2 pr-1">
                          {taskDetail?.comments?.some((c) => c.comment?.trim()) ? (
                            [...taskDetail.comments]
                              .filter((comment) => comment.comment?.trim())
                              .sort(
                                (a, b) =>
                                  new Date(b.createdAt) - new Date(a.createdAt),
                              )
                              .map((comment, index) => {
                              const username = comment.user?.name || "Unknown";
                              const isEditing =
                                comment.id != null &&
                                String(editingCommentId) === String(comment.id);
                              const showActions =
                                canManageComment(comment) && comment.id != null;
                              return (
                                <div
                                  key={comment.id ?? `comment-${index}`}
                                  className="mt-1 py-1 px-2 w-full"
                                  style={{
                                    color: "blue",
                                    fontSize: 14,
                                    borderRadius: 8,
                                    backgroundColor: "var(--dashboard-card-bg2)",
                                  }}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <span
                                      className="flex items-center gap-2 min-w-0"
                                      style={{ fontSize: "12px", color: "#0C79F7" }}
                                    >
                                      <UserProfileAvatar user={comment.user} size={32} />
                                      {username}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          color: "var(--fieldsTitle)",
                                        }}
                                      >
                                        {new Date(comment.createdAt).toLocaleString()}
                                      </span>
                                      {showActions && !isEditing && (
                                        <>
                                          <button
                                            type="button"
                                            title="Edit comment"
                                            onClick={() => handleStartEditComment(comment)}
                                            disabled={loading || savingComment || deletingComment}
                                            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                                          >
                                            <EditOutlinedIcon sx={{ fontSize: 14, color: "#0C79F7" }} />
                                          </button>
                                          <button
                                            type="button"
                                            title="Delete comment"
                                            onClick={() => setCommentPendingDelete(comment)}
                                            disabled={loading || savingComment || deletingComment}
                                            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                                          >
                                            <DeleteOutlineIcon sx={{ fontSize: 14, color: "#EF4444" }} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {isEditing ? (
                                    <div className="mt-2">
                                      <textarea
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white resize-none"
                                        rows={3}
                                        style={{ fontSize: 12 }}
                                      />
                                      <div className="flex justify-end gap-2 mt-2">
                                        <button
                                          type="button"
                                          onClick={handleCancelEditComment}
                                          disabled={savingComment}
                                          className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleSaveEditComment}
                                          disabled={savingComment || !editingCommentText.trim()}
                                          className="px-3 py-1 text-sm rounded-lg bg-[#0C79F7] text-white hover:bg-blue-600 disabled:opacity-50"
                                        >
                                          {savingComment ? "Saving..." : "Save"}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        marginTop: "4px",
                                        color: "var(--sidebar-text-primary)",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {renderCommentWithMentionsAndLinks(comment.comment)}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm text-[var(--dashboard-tab-text-inactive)] flex items-center justify-center mt-2">
                              No comments
                            </div>
                          )}
                          </div>

                          <div className="mb-6 mt-5">
                                                        <div className="border-t border-gray-200 dark:border-gray-600 mb-4 mt-2"></div>

                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Add Comment</h3>
                            <div className="mb-4 relative">
                              <textarea
                                ref={commentTextareaRef}
                                value={comments}
                                placeholder="Enter a comment..."
                                onChange={handleCommentChange}
                                onKeyDown={handleKeyDown}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0C79F7] focus:border-[#0C79F7] dark:bg-gray-700 dark:text-white resize-none transition-colors"
                                rows={3}
                                style={{
                                  fontSize: 14,
                                  resize: "vertical",
                                  minHeight: "80px"
                                }}
                              />

                              {showMentions && filteredUsers.length > 0 && (
                                <div
                                  className="absolute z-50 w-full max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg bg-white dark:bg-gray-800"
                                  style={{
                                    top: "100%",
                                    marginTop: "4px"
                                  }}
                                >
                                  {filteredUsers.map((user, index) => (
                                    <div
                                      key={user.id}
                                      className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                                        index === mentionIndex
                                          ? 'bg-blue-50 dark:bg-blue-900/30'
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                      onClick={() => handleMentionSelect(user)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <UserProfileAvatar user={user} size={24} />
                                        <div>
                                          <div className="font-medium text-gray-900 dark:text-white">
                                            {user.name}
                                          </div>
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {user.email}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end mb-4">
                              {comments.trim() && (
                                <button
                                  onClick={handleAddComment}
                                  disabled={loading}
                                  className="px-4 py-2 bg-[#0C79F7] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Add Comment
                                </button>
                              )}
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-600 mb-4"></div>

                            <div className="mb-6">
                              <h3 className="text-lg sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Attachments</h3>
                              <FileUpload
                                key={fileUploadKey}
                                onFileChange={handleFileUpload}
                                buttonWidth={attachButtonWidth}
                                buttonHeight={attachButtonHeight}
                                fontSize={attachButtonFontSize}
                              >
                                <BottonWithIcon
                                  backgroundColor={"#3B82F6"}
                                  width={attachButtonWidth}
                                  height={attachButtonHeight}
                                  title="Save File"
                                  color={"#FFFFFF"}
                                  fontSize={attachButtonFontSize}
                                  fontWeight={500}
                                  borderRadius={6}
                                  className="!mb-0 !mx-0 shrink-0 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={handleSaveFiles}
                                  disabled={loading}
                                />
                              </FileUpload>
                            </div>
                          </div>
                        </>
                      )}
                      {activeTab === "parent" && embeddedParentTask && (
                        <div className="mt-3 max-h-[420px] sm:max-h-[480px] overflow-y-auto overflow-x-hidden pb-4 pr-1">
                          <TaskTable
                            columns={[
                              { id: "id", label: "Ticket No", align: "center" },
                              { id: "title", label: "Title", align: "center" },
                              { id: "creator", label: "Created By", align: "center" },
                              { id: "startDate", label: "Start Date", align: "center" },
                              { id: "endDate", label: "End Date", align: "center" },
                              { id: "priority", label: "Priority", align: "center" },
                              { id: "status", label: "Status", align: "center" },
                            ]}
                            tasks={[
                              {
                                ...embeddedParentTask,
                                creator: embeddedParentTask.creator || { name: embeddedParentTask.creator?.name || "-" },
                              },
                            ]}
                            setSelectedTaskList={() => { }}
                            projectName={projectName}
                            page={1}
                            setPage={() => { }}
                            rowsPerPage={25}
                            setRowsPerPage={() => { }}
                            totalTasks={1}
                            taskType={taskType}
                            taskDetail={true}
                            onRowClick={async (row) => {
                              if (!row?.id) return;
                              try {
                                const checkRes = await getRequestWithOutBody(
                                  `${baseURl}task/${row.id}`,
                                  accessToken,
                                );
                                const msg =
                                  checkRes?.data?.message ||
                                  checkRes?.data?.data?.message ||
                                  checkRes?.message;
                                if (msg === "Record does not exist.") return;

                                const projectSlug = breadcrumbProjectSlug || toUrlProjectName(finalProjectName);
                                const taskUrl = projectSlug
                                  ? `/home/taskDetail/${projectSlug}/${row.id}`
                                  : `/home/taskDetail/${row.id}`;

                                sessionStorage.setItem(
                                  'newTabTaskData',
                                  JSON.stringify({
                                    itemData: row,
                                    projectName: finalProjectName,
                                    activeTab: "subtasks",
                                    fromRoute: resolveTaskDetailSidebarRoute(location.state),
                                  }),
                                );
                                window.open(taskUrl, '_blank');
                              } catch (e) {
                                const msg =
                                  e?.response?.data?.message ||
                                  e?.response?.data?.data?.message;
                                if (msg === "Record does not exist.") return;
                              }
                            }}
                          />
                        </div>
                      )}
                      

                      {activeTab === "subtasks" && (
                        <div className="max-h-[420px] sm:max-h-[480px] overflow-y-auto overflow-x-hidden pb-4 pr-1">
                        {taskDetail?.subTasks?.length > 0 ? (
                          (() => {
                            const columns = [
                              { id: "id", label: "Ticket No", align: "center" },
                              { id: "title", label: "Title", align: "center" },
                              {
                                id: "creator",
                                label: "Created By",
                                align: "center",
                              },
                              {
                                id: "assignee",
                                label: "Assignee",
                                align: "center",
                              },
                              { id: "endDate", label: "Due Date", align: "center" },
                              // { id: 'priority', label: 'Priority', align: 'center' },
                              { id: "status", label: "Status", align: "center" },
                            ];

                            // Map subtasks to the shape TaskTable expects
                            const rows = taskDetail.subTasks.map((sub) => ({
                              id: sub.id,
                              title: sub.title,
                              creator:
                                sub.creator ||
                                (sub.createdByName
                                  ? { name: sub.createdByName }
                                  : { name: "-" }),
                              assignments: sub?.assignments?.length
                                ? sub.assignments
                                : sub?.assignee
                                  ? [
                                      {
                                        user: {
                                          name: sub.assignee.user?.name || "-",
                                        },
                                      },
                                    ]
                                  : [],
                              endDate: sub.endDate,
                              priority: sub.priority || "-",
                              status: sub.status || "-",
                              parentId: sub.parentId,
                              projectId: sub.projectId,
                              isSubtask: sub.isSubtask,
                              project: sub.project || taskDetail?.project || { name: finalProjectName },
                            }));

                            return (
                              <div className="mt-2">
                                <TaskTable
                                  tasks={rows}
                                  columns={columns}
                                  projectName={projectName}
                                  taskDetail={true}
                                  taskType={taskType}
                                  setSelectedTaskList={() => { }}
                                  onRowClick={(row) => {
                                    if (!row?.id) return;
                                    const taskProjectName = row.project?.name || finalProjectName;
                                    const projectSlug = toUrlProjectName(taskProjectName);
                                    const taskUrl = projectSlug
                                      ? `/home/taskDetail/${projectSlug}/${row.id}`
                                      : `/home/taskDetail/${row.id}`;

                                    sessionStorage.setItem(
                                      'newTabTaskData',
                                      JSON.stringify({
                                        itemData: row,
                                        projectName: taskProjectName,
                                        fromRoute: resolveTaskDetailSidebarRoute(location.state),
                                      }),
                                    );
                                    window.open(taskUrl, '_blank');
                                  }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-sm text-[var(--dashboard-tab-text-inactive)] flex items-center justify-center mt-2">
                            No sub tasks
                          </div>
                        )}
                        </div>
                      )}
                      {activeTab === "logs" && (
                        <div className="max-h-[420px] sm:max-h-[480px] overflow-y-auto overflow-x-hidden pb-4 pr-1">
                        {taskDetail?.logs?.length > 0 &&
                        [...taskDetail.logs]
                          .sort(
                            (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                          ) // Sort by date descending
                          .map((log, index) => {
                            if (!log.details || log.details.trim() === "")
                              return null;

                            const username = log.user?.name || "Unknown";
                            const detailsWithUsername = log.details.replace(
                              /by \d+$/,
                              `by ${username}`,
                            );

                            return (
                              <div
                                key={index}
                                className="mt-1 py-1 px-2 w-full"
                                style={{
                                  color: "blue",
                                  fontSize: 14,
                                  borderRadius: 8,
                                  backgroundColor: "var(--dashboard-card-bg2)",
                                }}
                              >
                                <div className="flex justify-between">
                                  <span
                                    style={{ fontSize: "12px", color: "#0C79F7" }}
                                  >
                                    {username}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "var(--fieldsTitle)",
                                    }}
                                  >
                                    {new Date(log.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    marginTop: "4px",
                                    color: "var(--sidebar-text-primary)",
                                  }}
                                >
                                  <strong>Action:</strong> {log.action}
                                  <br />
                                  <strong>Details:</strong> {detailsWithUsername}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                  

                      {activeTab === "files" && (
                        <>
                        <div className="max-h-[420px] sm:max-h-[480px] overflow-y-auto overflow-x-hidden pb-2 pr-1 flex flex-col gap-2">
                          {(!taskDetail?.files ||
                            taskDetail?.files?.length === 0) &&
                            (!taskDetail?.comments ||
                              taskDetail?.comments?.every(
                                (comment) =>
                                  !comment.files || comment.files?.length === 0,
                              )) && (
                                <div className="text-sm text-[var(--dashboard-tab-text-inactive)] text-center py-4">
                                  No files
                                </div>
                              )}

                          {taskDetail?.files?.length > 0 &&
                            taskDetail.files.map((file, index) => (
                              <div
                                key={index}
                                className="mt-1 py-1 px-2 w-full cursor-pointer hover:bg-gray-100 rounded-lg"
                                onClick={() => window.open(file.url, "_blank")}
                                style={{
                                  backgroundColor: "var(--dashboard-card-bg2)",
                                  color: "#1E40AF",
                                  fontSize: 14,
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    style={{ fontSize: "13px", fontWeight: 500 }}
                                  >
                                    {file.originalname}
                                  </span>
                                  {/* <span style={{ fontSize: '10px', color: '#6B7280' }}>{file.mimetype}</span> */}
                                </div>
                              </div>
                            ))}
                          {taskDetail?.comments?.flatMap((comment, cIndex) =>
                            comment?.files?.map((file, fIndex) => (
                              <div
                                key={`comment-file-${cIndex}-${fIndex}`}
                                className="py-1 px-2 w-full"
                                style={{
                                  fontSize: 14,
                                  borderRadius: 8,
                                  backgroundColor: "var(--dashboard-card-bg2)",
                                }}
                              >
                                <div className="flex justify-between">
                                  <span
                                    className="flex items-center gap-2 min-w-0"
                                    style={{ fontSize: "12px", color: "#0C79F7" }}
                                  >
                                    <UserProfileAvatar user={comment.user} size={32} />
                                    {comment.user?.name || "Unknown"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "var(--fieldsTitle)",
                                    }}
                                  >
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline text-sm"
                                  >
                                    {file.originalname}
                                  </a>
                                </div>
                              </div>
                            )),
                          )}
                        </div>

                          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Upload Files</h3>
                            <FileUpload
                              key={`files-tab-${fileUploadKey}`}
                              onFileChange={handleFileUpload}
                              buttonWidth={attachButtonWidth}
                              buttonHeight={attachButtonHeight}
                              fontSize={attachButtonFontSize}
                            >
                              <BottonWithIcon
                                backgroundColor={"#3B82F6"}
                                width={attachButtonWidth}
                                height={attachButtonHeight}
                                title="Save Files"
                                color={"#FFFFFF"}
                                fontSize={attachButtonFontSize}
                                fontWeight={500}
                                borderRadius={6}
                                className="!mb-0 !mx-0 shrink-0 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleSaveFiles}
                                disabled={loading}
                              />
                            </FileUpload>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
                {/* Subtasks inline UI removed; moved to right-side "Sub Tasks" tab */}

              </div>

              {/* Right Sidebar */}
              <div className="w-full lg:w-96 xl:w-[480px] 2xl:w-[520px] space-y-6">
                <div className="p-4 sm:p-6 w-full task-detail-container" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                {/* Task Classification Section */}
                <div className="p-4 rounded-lg bg-white dark:bg-gray-800">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Task Classification</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phase
                      </label>
                      {userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource" || userData?.id === effectiveTask?.creator?.id || userData?.roleTitle === "QA Engineer" ? (
                        <div className="relative">
                          <DropdownMenu
                            label="Phase"
                            menuItems={phaseOptions}
                            defaultText="--select phase--"
                            onSelect={(id) => setSelectedPhaseId(id)}
                            addAgent={true}
                            idSet={true}
                            selectedValue={phaseName || ""}
                            fullWidth={true}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={phaseName}
                          disabled={true}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
                          placeholder="Phase"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Task Type
                      </label>
                      {userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource" || userData?.id === effectiveTask?.creator?.id || userData?.roleTitle === "QA Engineer" ? (
                        <div className="relative">
                          <DropdownMenu
                            label="Task Type"
                            menuItems={taskType}
                            defaultText="--select task type--"
                            onSelect={(id) => {
                              setSelectedTaskType(id);
                              setTaskTypeName(
                                taskType.find((t) => t.id === id)?.type || "",
                              );
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={taskTypeName}
                            fullWidth={true}
                            searchable={true}
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <DropdownMenu
                            label="Task Type"
                            menuItems={taskType}
                            defaultText="--select task type--"
                            onSelect={(id) => {
                              setSelectedTaskType(id);
                              setTaskTypeName(
                                taskType.find((t) => t.id === id)?.type || "",
                              );
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={taskTypeName}
                            searchable={true}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Task Level
                      </label>
                      {userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource" || userData?.id === effectiveTask?.creator?.id || userData?.roleTitle === "QA Engineer" ? (
                        <div className="relative">
                          <DropdownMenu
                            label="Task Level"
                            menuItems={taskLevel}
                            defaultText="--select task level--"
                            onSelect={(id) => {
                              setSelectedTaskLevel(id);
                              setTaskLevelName(
                                taskLevel.find((l) => l.id === id)?.level || "",
                              );
                            }}
                            addAgent={true}
                            idSet={true}
                            selectedValue={taskLevelName}
                            fullWidth={true}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={taskLevelName}
                          disabled={true}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
                          placeholder="Task Level"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="p-4  rounded-lg bg-white dark:bg-gray-800 mt-4 mb-4">
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
                          disabled={userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource" || userData?.id === effectiveTask?.creator?.id ? false : true} 
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
                <div className="p-4  rounded-lg bg-white dark:bg-gray-800">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Status & Assignment</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority
                      </label>
                      {userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource" || userData?.id === effectiveTask?.creator?.id ? (
                        <DropdownMenu
                          label="Priority"
                          menuItems={priorityOptions}
                          defaultText="--select priority--"
                          onSelect={setSelectedPriority}
                          taskDetails={true}
                          idSet={true}
                          selectedValue={selectedPriority}
                          fullWidth={true}
                        />
                      ) : (
                        <input
                          type="text"
                          value={selectedPriority}
                          disabled={true}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
                          placeholder="Priority"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <DropdownMenu
                        key={`status-menu-${userData?.roleTitle || "guest"}-${userData?.id || ""}`}
                        label="Status"
                        menuItems={getStatusMenuItems(userData, effectiveTask)}
                        defaultText="--select status--"
                        onSelect={(id) => {
                          setSelectedStatus(id);
                          handleChangeStatus(id); // Run status update on change
                        }}
                        taskDetails={true}
                        idSet={true}
                        selectedValue={getStatusDisplayLabel(selectedStatus)}
                        fullWidth={true}
                        searchable={true}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign To
                      </label>
                      {userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource" || userData?.id === effectiveTask?.creator?.id || effectiveTask?.subTasks?.length === 0 || userData?.roleTitle === "QA Engineer" ? (
                        taskDetail?.subTasks?.length > 0 ? (
                          <input
                            type="text"
                            value={
                              taskDetail?.subTasks?.length === 1
                                ? taskDetail?.subTasks[0]?.assignee?.user?.name
                                : `${taskDetail?.subTasks[0]?.assignee?.user?.name} + ${taskDetail?.subTasks.length - 1} others`
                            }
                            disabled={true}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
                            placeholder="Assign To"
                          />
                        ) : (
                          <div className="relative">
                            <DropdownMenu
                              label="Assign To"
                              menuItems={userList}
                              defaultText="--select assignee--"
                              onSelect={(id) => setSelectedAssignTo(id)}
                              addAgent={true}
                              idSet={true}
                              selectedValue={selectedAssignToName}
                              fullWidth={true}
                              searchable={true}
                            />
                          </div>
                        )
                      ) : (
                        <input
                          type="text"
                          value={
                            taskDetail?.subTasks?.length === 1
                              ? taskDetail?.subTasks[0]?.assignee?.user?.name
                              : `${taskDetail?.subTasks[0]?.assignee?.user?.name} + ${taskDetail?.subTasks.length - 1} others`
                          }
                          disabled={true}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
                          placeholder="Assign To"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Created By
                      </label>
                      <input
                        type="text"
                        value={
                          taskDetail?.creator?.name ||
                          effectiveTask?.creator?.name ||
                          taskDetail?.createdByName ||
                          effectiveTask?.createdByName ||
                          taskDetail?.creator?.name ||
                          effectiveTask?.creator?.name ||
                          ""
                        }
                        disabled={true}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
                        placeholder="Created By"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Save Button for Right Section */}
                <div className="pt-2 flex justify-end mt-2">
                  {hasRightSectionChanges() && (
                    <button
                      onClick={handleRightSectionSave}
                      disabled={loading}
                      className={`px-4 py-2 bg-[#0C79F7] text-white rounded-lg hover:bg-blue-600 transition-colors ${
                        loading ? "bg-blue-300 cursor-not-allowed" : "bg-[#0C79F7] hover:bg-blue-600"
                      }`}
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              {isSubtask ? (
                <button
                  onClick={handleSubtaskUpdate}
                  disabled={loading}
                  className={`px-6 py-2 bg-[#0C79F7] text-white rounded-lg hover:bg-blue-600 ${loading ? "bg-blue-300 cursor-not-allowed" : "bg-[#0C79F7] hover:bg-blue-600"}`}
                >
                  {loading ? "Updating Subtask..." : "Update Subtask"}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`px-6 py-2 bg-[#0C79F7] text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 ${loading ? "bg-blue-300 cursor-not-allowed" : "bg-[#0C79F7] hover:bg-blue-700"}`}
                >
                  {loading ? "Updating Task..." : "Update Task"}
                </button>
              )}
            </div>
            {isAddTaskModalOpen && (
              <AddNewTask
                onClose={handleCloseAddTaskModal}
                isOpen={isAddTaskModalOpen}
                projectDetail={projectDetail}
                projectName={projectName}
                parentId={effectiveTask.id}
                onSuccess={onSuccess}
                task={effectiveTask}
              />
            )}
            <DeleteConfirmationModal
              open={Boolean(commentPendingDelete)}
              title="Delete Comment"
              subtitle="Are you sure you want to delete this comment?"
              entityName={
                commentPendingDelete?.comment
                  ? commentPendingDelete.comment.length > 80
                    ? `${commentPendingDelete.comment.slice(0, 80)}...`
                    : commentPendingDelete.comment
                  : ""
              }
              warningMessage="This action cannot be undone."
              isLoading={deletingComment}
              onCancel={() => {
                if (!deletingComment) setCommentPendingDelete(null);
              }}
              onDelete={handleDeleteComment}
            />
          </>
        )}
      </div>
    </>
  );
};

export default TaskDetail;
