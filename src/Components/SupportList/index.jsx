// components/TaskList.jsx
import React, { useEffect, useRef, useState } from "react";
import Heading from "../Heading";
import { SVG } from "../../assets/svg";
import { useSelector } from "react-redux";
import { RiArrowDropDownLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { putRequestWithBodyAndToken, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Skeleton from "@mui/material/Skeleton";

const SOLUTION_LABELS = {
    'credit-card': 'Credit Card Processing',
    atm: 'ATM Solutions',
    'cash-advance': 'Cash Advance',
    pos: 'Point-Of-Sale Solutions',
    ebt: 'EBT Processing',
    airvac: 'AIRVAC Systems',
    website: 'Website Services',
    'ach-processing': 'ACH Processing',
};

const getSolutionLabel = (solution) => {
    if (!solution || typeof solution !== 'string') return null;
    const normalized = solution.trim().toLowerCase();
    if (!normalized) return null;
    return SOLUTION_LABELS[normalized] || solution;
};

const SupportList = ({ title, tasks, priorityStyles, headerColor, backgroundColor, onSuccess, isEditModalOpen, onTaskClick, getNewTabUrl, loading = false }) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const itemRef = useRef([]);
    const dropdownRef = useRef(null);

    const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
    const [taskList, setTaskList] = useState(tasks); // local state copy
    const [flipDropdown, setFlipDropdown] = useState(false);

    const TaskSkeleton = () => (
        <div className="bg-[var(--dashboard-card-bg)] p-2 rounded-md shadow-sm border">
            <div className="flex justify-between items-start">
                <div 
                    className="animate-pulse"
                    style={{
                        width: 120,
                        height: 20,
                        backgroundColor: "#e5e7eb",
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                        style={{
                            animation: "shimmer 2s infinite"
                        }}
                    />
                </div>
            </div>
            <div className="flex justify-between items-center mt-1">
                <div 
                    className="animate-pulse"
                    style={{
                        width: 80,
                        height: 16,
                        backgroundColor: "#e5e7eb",
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                        style={{
                            animation: "shimmer 2s infinite"
                        }}
                    />
                </div>
                <div 
                    className="animate-pulse"
                    style={{
                        width: 60,
                        height: 24,
                        backgroundColor: "#e5e7eb",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                        style={{
                            animation: "shimmer 2s infinite"
                        }}
                    />
                </div>
            </div>
        </div>
    );

    const handlePriorityChange = async (taskIndex, newPriority) => {
        const updatedTasks = [...taskList];
        const ticketId = updatedTasks[taskIndex].id;
        // updatedTasks[taskIndex].priority = newPriority;
        setTaskList(updatedTasks);
        setOpenDropdownIndex(null);
        if (title === "Application") {
            if (newPriority === "pending" || newPriority === "completed") {
                const payload = {
                    "status": newPriority === "pending" ? "new" : newPriority === "completed" ? "submitted" : newPriority
                }
                const result = await putRequestWithBodyAndToken(`${baseURl}application-ticket/update-status/${ticketId}`, accessToken, payload)
            }
            const apiData = {
                "applicationId": updatedTasks[taskIndex]?.application?.id,
                "status": newPriority,
                "isCompleted": newPriority === "completed" ? 1 : 0,
                "agentId": updatedTasks[taskIndex]?.ticket?.agent?.id,
                "currentStep": 9,
            };
            try {
                const result2 = await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
            } catch (err) {
                const message = typeof err === 'string' ? err : err?.message;

                if (message?.includes("already been approved")) {
                    alert("This application has already been approved.");
                } else {
                    alert("Something went wrong while updating the application.");
                }
            }
            onSuccess()
        } else {
            const payload = {
                "status": newPriority
            }
            const result = await putRequestWithBodyAndToken(`${baseURl}application-ticket/update-status/${ticketId}`, accessToken, payload)
            onSuccess()
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            // If dropdown is open and the click is outside both the dropdown and trigger
            if (
                openDropdownIndex !== null &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !itemRef.current[openDropdownIndex]?.contains(event.target)
            ) {
                setOpenDropdownIndex(null);
            }
        };
    
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openDropdownIndex]);

    const data = [
        {
            stage: "Pending",
            priority: "new",
        },
        {
            stage: "Maintanace Terminal",
            priority: "submitted",
        },
        {
            stage: "Terminal Programming",
            priority: "signed",
        },
        {
            stage: "Deployment",
            priority: "uw",
        },
    ]
    const data3 = [
        {
            stage: "Pending",
            priority: "new",
        },
        {
            stage: "Terminal Programming",
            priority: "signed",
        }
    ]
    const data4 = [
        {
            stage: "Pending",
            priority: "new",
        },
        {
            stage: "Maintanace Terminal",
            priority: "submitted",
        },
        {
            stage: "Deployment",
            priority: "uw",
        }
    ]
    const data5 = [
        {
            stage: "Pending",
            priority: "new",
        },
        {
            stage: "Maintanace Terminal",
            priority: "submitted",
        },
        {
            stage: "Terminal Programming",
            priority: "signed",
        },
        {
            stage: "Follow Up",
            priority: "approved",
        }
    ]
    const data2 = [
        {
            stage: "Draft",
            priority: "draft",
        },
        {
            stage: "Pending",
            priority: "pending",
        },
        {
            stage: "Completed",
            priority: "completed",
        },
        {
            stage: "In-Active",
            priority: "in-active",
        },
        {
            stage: "Approved",
            priority: "approved",
        },
        {
            stage: "Declined-Rejected",
            priority: "declined-rejected",
        },
        {
            stage: "Under-Review",
            priority: "under-review",
        },
        {
            stage: "On-Hold",
            priority: "on-hold",
        },
        {
            stage: "Suspicious-Activity",
            priority: "suspicious-activity",
        },
        {
            stage: "Verification-Required",
            priority: "verification-required",
        },
        {
            stage: "Incomplete",
            priority: "incomplete",
        },
        {
            stage: "Cancelled",
            priority: "cancelled",
        }
    ]

    return (
        <div className=" shadow w-56  overflow-y-auto" style={{ backgroundColor, height: 600 }}>
            <div
                className="text-white font-semibold text-sm px-3 py-2 flex justify-between items-center"
                style={{ backgroundColor: headerColor }}
            >
                <span>{title} ({tasks.length.toString().padStart(2, '0')})</span>
                <button onClick={title === "Application" ? () => navigate('/home/adminApplication') :
                    title === "Maintenance Request" ? () => navigate('/home/maintananceTicket', { state: { activeTab: "maintainance" } }) :
                        title === "Terminal Programming" ? () => navigate('/home/maintananceTicket', { state: { activeTab: "terminal" } }) :
                            title === "Deployment" ? () => navigate('/home/maintananceTicket', { state: { activeTab: "deployment" } }) :
                                title === "Follow Up" ? () => navigate('/home/maintananceTicket', { state: { activeTab: "followUp" } }) 
                                : title === "Support Tickets" ? () => navigate('/home/agentsTickets') : null}>
                    <SVG.SupportTicketOpen size={20} />
                </button>
            </div>
            <div className="p-2 space-y-2">
                {loading ? (
                    // Show skeleton loaders while loading
                    Array.from({ length: 3 }).map((_, index) => (
                        <TaskSkeleton key={index} />
                    ))
                ) : (
                    // Show actual tasks when not loading
                    tasks.map((task, index) => {
                        const statusKey = title === "Application"
                            ? task.application?.status?.toLowerCase()
                            : task.status?.toLowerCase();

                        const priorityStyle = priorityStyles[statusKey] || priorityStyles.default;
                        const solutionLabel = title !== "Support Tickets"
                            ? getSolutionLabel(task?.application?.solution)
                            : null;
                        const newTabUrl = typeof getNewTabUrl === 'function' ? getNewTabUrl(task) : null;
                        const CardTag = newTabUrl ? 'a' : 'div';
                        const cardLinkProps = newTabUrl
                            ? {
                                href: newTabUrl,
                                onClick: (e) => {
                                    // Cmd/Ctrl/Shift/middle-click: let browser open new tab
                                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                                        return;
                                    }
                                    e.preventDefault();
                                    onTaskClick?.(task, e);
                                },
                            }
                            : {
                                onClick: (e) => onTaskClick?.(task, e),
                            };

                        return (
                            <CardTag
                                key={index}
                                ref={(el) => (itemRef.current[index] = el)}
                                className="bg-[var(--dashboard-card-bg)] p-2 cursor-pointer rounded-md shadow-sm border block no-underline"
                                style={{ color: 'inherit' }}
                                {...cardLinkProps}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <Heading
                                        Fontweight={700}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={title === "Support Tickets" ? task?.title : task?.application?.businessName}
                                        Fontsize={14}
                                    />
                                </div>
                                {solutionLabel && (
                                    <span
                                        className="inline-block mt-1.5 max-w-full truncate"
                                        title={solutionLabel}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            lineHeight: 1.4,
                                            padding: '3px 10px',
                                            borderRadius: 999,
                                            backgroundColor: 'rgba(55, 65, 81, 0.14)',
                                            color: 'var(--dashboard-text-primary, #374151)',
                                            border: '1px solid rgba(55, 65, 81, 0.35)',
                                        }}
                                    >
                                        {solutionLabel}
                                    </span>
                                )}
                                <div className="flex justify-between items-center mt-1">
                                    {title === "Support Tickets" ? (
                                        <div>
                                            <p className=""
                                                style={{
                                                    color: 'var(--sidebar-text-primary)',
                                                    fontSize: 12
                                                }}>
                                                Ticket #{task.id}
                                            </p>
                                        </div>
                                    ) : <div>
                                        <p className=""
                                            style={{
                                                color: 'var(--sidebar-text-primary)',
                                                fontSize: 12
                                            }}>
                                            Date: {new Date(task.createdAt).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric"
                                            })}
                                        </p>
                                    </div>}

                                    <div className="relative mt-3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <span
                                            className={`flex items-center rounded-full px-3 py-1 cursor-pointer `}
                                            style={{
                                                fontWeight: 700, fontSize: 12,
                                                backgroundColor: priorityStyle.bg,
                                                color: priorityStyle.text
                                            }}
                                            onClick={() => {
                                                if (title === 'Support Tickets') return
                                                    
                                                const item = itemRef.current[index];
                                                if (item) {
                                                    const rect = item.getBoundingClientRect();
                                                    const windowHeight = window.innerHeight;
                                                    const dropdownHeight = 100; // adjust if needed
                                                    setFlipDropdown(rect.bottom + dropdownHeight > windowHeight);
                                                }
                                                setOpenDropdownIndex(openDropdownIndex === index ? null : index);
                                            }}
                                        >
                                            {statusKey?.charAt(0).toUpperCase() + statusKey?.slice(1)}
                                            {title !== 'Support Tickets' && <RiArrowDropDownLine size={16} />}
                                        </span>
                                        {openDropdownIndex === index && title === "Maintenance Request" && (
                                            <div 
                                            ref={dropdownRef}
                                            className={`absolute right-0 ${flipDropdown ? "bottom-6" : "top-6"} z-10 bg-white border rounded shadow-md w-40`}>
                                                {data3.map((priority) => (
                                                    <div
                                                        key={priority.priority}
                                                        className="px-3 py-1 text-sm cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handlePriorityChange(index, priority.priority)}
                                                    >
                                                        {priority.stage}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {openDropdownIndex === index && title === "Terminal Programming" && (
                                            <div 
                                            ref={dropdownRef}
                                            className={`absolute right-0 ${flipDropdown ? "bottom-6" : "top-6"} z-10 bg-white border rounded shadow-md w-40`}>
                                                {data4.map((priority) => (
                                                    <div
                                                        key={priority.priority}
                                                        className="px-3 py-1 text-sm cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handlePriorityChange(index, priority.priority)}
                                                    >
                                                        {priority.stage}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {openDropdownIndex === index && title === "Deployment" && (
                                            <div 
                                            ref={dropdownRef}
                                            className={`absolute right-0 ${flipDropdown ? "bottom-6" : "top-6"} z-10 bg-white border rounded shadow-md w-40`}>
                                                {data5.map((priority) => (
                                                    <div
                                                        key={priority.priority}
                                                        className="px-3 py-1 text-sm cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handlePriorityChange(index, priority.priority)}
                                                    >
                                                        {priority.stage}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {openDropdownIndex === index && title === "Follow Up" && (
                                            <div 
                                            ref={dropdownRef}
                                            className={`absolute right-0 ${flipDropdown ? "bottom-6" : "top-6"} z-10 bg-white border rounded shadow-md w-40`}>
                                                {data.map((priority) => (
                                                    <div
                                                        key={priority.priority}
                                                        className="px-3 py-1 text-sm cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handlePriorityChange(index, priority.priority)}
                                                    >
                                                        {priority.stage}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {openDropdownIndex === index && title === "Application" && (
                                            <div
                                            ref={dropdownRef}
                                             className={`absolute right-0 ${flipDropdown ? "bottom-6" : "top-6"} z-10 bg-white border rounded shadow-md w-40`}>
                                                {data2.map((priority) => (
                                                    <div
                                                        key={priority.priority}
                                                        className="px-3 py-1 text-sm cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handlePriorityChange(index, priority.priority)}
                                                    >
                                                        {priority.stage}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </CardTag>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default SupportList;
