// components/TaskList.jsx
import React from "react";
import { Link } from "react-router-dom";
import Heading from "../Heading";
import { SVG } from "../../assets/svg";
import { useSelector } from "react-redux";
import {
    buildProjectListPath,
    projectNameToSlug,
} from "../../Utils/projectTrackingRoutes";

const getProjectUrl = (task) =>
    buildProjectListPath({
        slug: projectNameToSlug(task?.name),
        projectId: task?.id,
    });

const TaskList = ({ title, tasks, priorityStyles, headerColor, backgroundColor, onAddTaskClick, isEditModalOpen, onTaskClick }) => {
    const userData = useSelector((state) => state.userData.userDetails);
    const [showContextMenu, setShowContextMenu] = React.useState(false);
    const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });
    const [selectedTask, setSelectedTask] = React.useState(null);

    // Close context menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            // Don't close if clicking on the context menu itself
            if (event.target.closest('.context-menu')) {
                return;
            }
            setShowContextMenu(false);
        };

        if (showContextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showContextMenu]);

    return (
        <div className="rounded-md shadow w-96 md:w-80  overflow-hidden" style={{ backgroundColor, minHeight: 600 }}>
            <div
                className="text-white font-semibold text-sm px-4 py-2 flex justify-between items-center"
                style={{ backgroundColor: headerColor?.bg, color: headerColor?.text }}
            >
                <span>{title} ({tasks.length.toString().padStart(2, '0')})</span>
                {/* <button onClick={onAddTaskClick}>
                    <LuCirclePlus size={20} />
                </button> */}
            </div>

            <div className="p-3 space-y-2 " >
                {tasks.map((task, index) => {
                    const priorityStyle = priorityStyles[task.priority] || priorityStyles.default;
                    const projectUrl = getProjectUrl(task);
                    return (
                        <>
                        <Link
                            key={task.id ?? index}
                            to={projectUrl}
                            onClick={(e) => {
                                if (e.metaKey || e.ctrlKey) {
                                    // CMD+click or Ctrl+click opens in new tab
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(projectUrl, '_blank');
                                } else {
                                    e.preventDefault();
                                    onTaskClick(task);
                                }
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setSelectedTask(task);
                                setContextMenuPosition({ x: e.clientX, y: e.clientY });
                                setShowContextMenu(true);
                            }}
                            className="block bg-[var(--dashboard-card-bg)] p-4 cursor-pointer rounded-md shadow-sm border no-underline text-inherit"
                        >
                            <div className="flex justify-between items-start">
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={task.name}
                                    Fontsize={18}
                                />
                                {(userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource") && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            isEditModalOpen(task);
                                        }}
                                    >
                                        <SVG.EditTask style={{ color: 'var(--sidebar-text-primary)' }} />
                                    </button>
                                )}
                            </div>
                            <p className="mt-1"
                                style={{
                                    color: 'var(--sidebar-text-primary)',
                                    fontSize: 13
                                }}>
                                Start: {new Date(task.startDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                })}
                            </p>
                            <p className=""
                                style={{
                                    color: 'var(--sidebar-text-primary)',
                                    fontSize: 13
                                }}>
                                Due Date: {new Date(task.endDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                })}
                            </p>

                            <div className="flex justify-between items-center mt-3">
                                <span
                                    className={`flex items-center rounded-full px-3 py-1 cursor-pointer `}
                                    style={{ fontWeight: 700, fontSize: 12, backgroundColor: priorityStyle.bg, color: priorityStyle.text }}
                                >
                                    {task.priority} Priority
                                    {/* <RiArrowDropDownLine size={16} /> */}
                                </span>

                                <span style={{ color: '#0C79F7', fontSize: 13, fontWeight: 700 }}>
                                    View Details
                                </span>
                            </div>
                        </Link>
                        
                        {showContextMenu && selectedTask?.id === task.id && (
                            <div
                                className={`context-menu fixed z-50 w-40 ${document.documentElement.classList.contains('dark') ? 'bg-gray-800 divide-gray-600' : 'bg-white divide-y divide-gray-100'} rounded-md shadow-lg ring-1 ring-black ring-opacity-5`}
                                style={{
                                    left: contextMenuPosition.x,
                                    top: contextMenuPosition.y,
                                }}
                            >
                                <div className="px-1 py-1">
                                    <button
                                        onClick={() => {
                                            window.open(getProjectUrl(selectedTask), '_blank');
                                            setShowContextMenu(false);
                                        }}
                                        className={`${
                                            document.documentElement.classList.contains('dark')
                                                ? 'hover:bg-gray-700'
                                                : 'hover:bg-gray-100'
                                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                    >
                                        Open in new tab
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskList;
