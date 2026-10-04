import * as React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';
import Heading from '../Heading';
import { SVG } from '../../assets/svg';
import moment from 'moment';
import { Tooltip } from '@mui/material'; // or use any tooltip library
import { useNavigate } from 'react-router-dom';
import { setTaskDetailSidebarRoute } from '../../Utils/taskDetailSidebarRoute';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination';
import subtaskInTable from "../../assets/subtaskInTable.png";

const capitalizeFirst = (text) => {
    if (typeof text !== 'string') return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const isNotCompletedStatus = (status) => {
    const normalized = String(status ?? '').trim().toLowerCase();
    return normalized === 'not-completed';
};

const formatStatusLabel = (status) => {
    if (!status || typeof status !== 'string') return '-';
    const normalized = status.trim().toLowerCase();
    if (normalized === 'not-completed') return 'Not Completed';
    return capitalizeFirst(status);
};

const AssigneeCell = ({ assignees }) => {
    if (!assignees || assignees?.length === 0) return null;

    const firstName = assignees[0]?.user?.name?.split(' ')[0]; // Get first word of the first name
    const remainingCount = assignees.length - 1;

    const displayText = remainingCount > 0 ? `${firstName} +${remainingCount}` : firstName;

    return (
        <Tooltip title={assignees?.map((assignee) => assignee?.user?.name).join(', ')}>
            <span style={{ cursor: 'pointer' }}>{capitalizeFirst(displayText)}</span>
        </Tooltip>
    );
};
const AssigneeCell2 = ({ assignees }) => {
    if (!assignees) return null;

    const firstName = assignees?.user?.name?.split(' ')[0]; // Get first word of the first name
    const remainingCount = assignees.length - 1;

    const displayText = remainingCount > 0 ? `${firstName} +${remainingCount}` : firstName;

    return (
        <Tooltip title={assignees?.user?.name}>
            <span style={{ cursor: 'pointer' }}>{capitalizeFirst(displayText)}</span>
        </Tooltip>
    );
};

const getStatusColor = (status) => ({
    color:
        status === 'Pending'
            ? '#FFA500'
            : status === 'In Progress'
                ? '#007bff'
                : status === 'Ready for QA' || status === 'Ready for Approval'
                    ? '#6f42c1'
                    : status === 'Failed QA'
                        ? '#dc3545'
                        : isNotCompletedStatus(status)
                            ? '#C2410C'
                            : status === 'Completed' || status === 'Deployment Completed'
                            ? '#28a745'
                            : status === 'On Hold'
                                ? '#ffc107'
                                : status === 'UI Completed'
                                    ? '#f527d3'
                                    : status === 'API Completed'
                                        ? '#3d2112'
                                        : status === 'Cancelled'
                                            ? '#6c757d'
                                            : status === 'Ready For Deployment'
                                                ? '#0d9488'
                                                : status === 'QA In Progress'
                                                    ? '#0891b2'
                                                    : 'var(--dashboard-text-primary)',
    backgroundColor:
        status === 'Pending'
            ? 'rgba(255, 165, 0, 0.1)'
            : status === 'In Progress'
                ? 'rgba(0, 123, 255, 0.1)'
                : status === 'Ready for QA' || status === 'Ready for Approval'
                    ? 'rgba(111, 66, 193, 0.1)'
                    : status === 'Failed QA'
                        ? 'rgba(220, 53, 69, 0.1)'
                        : isNotCompletedStatus(status)
                            ? 'rgba(194, 65, 12, 0.2)'
                            : status === 'Completed' || status === 'Deployment Completed'
                            ? 'rgba(40, 167, 69, 0.1)'
                            : status === 'On Hold'
                                ? 'rgba(255, 193, 7, 0.1)'
                                : status === 'UI Completed'
                                    ? 'rgba(245, 39, 211, 0.1)'
                                    : status === 'API Completed'
                                        ? 'rgba(61, 33, 18, 0.1)'
                                        : status === 'Cancelled'
                                            ? 'rgba(108, 117, 125, 0.1)'
                                            : status === 'Ready For Deployment'
                                                ? 'rgba(13, 148, 136, 0.1)'
                                                : status === 'QA In Progress'
                                                    ? 'rgba(8, 145, 178, 0.1)'
                                                    : '#eee',
});

const getValue = (row, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], row);
};

const buildTaskDetailUrl = (task, projectName) => {
    const taskProjectName = task?.project?.name || projectName;
    const urlProjectName = taskProjectName?.replace(/\s+/g, '-').toLowerCase();
    return urlProjectName
        ? `/home/taskDetail/${urlProjectName}/${task.id}`
        : `/home/taskDetail/${task.id}`;
};

const openTaskInNewTab = (task, projectName, myTask) => {
    const taskProjectName = task?.project?.name || projectName;
    const url = buildTaskDetailUrl(task, projectName);
    const fromRoute = myTask ? 'myTask' : 'projectTracking';

    setTaskDetailSidebarRoute(fromRoute);
    sessionStorage.setItem(
        'newTabTaskData',
        JSON.stringify({
            itemData: task,
            projectName: taskProjectName,
            fromRoute,
        })
    );
    window.open(url, '_blank');
};

const isModifierClick = (e) =>
    Boolean(e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey || e?.button === 1);

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    maxHeight: '100vh',
    overflow: 'auto',
    borderRadius: '14px',
    // backgroundColor: 'var(--sidebar-divider)',
    // scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '& thead': {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: theme.palette.background.paper,
    },
}));

const CustomTableHeader = styled(TableHead)(() => ({
    position: 'sticky',
    top: 0,
    zIndex: 1,
    
    '& .MuiTableRow-root': {
        backgroundColor: 'var(--sidebar-selected-bg)',
        
    },
    '& .MuiTableCell-root': {
        borderBottom: 'none',
        fontSize: 12,
        padding: '7px 3px',
        textAlign: 'center',
        
    },
}));

const CustomTableRow = styled(TableRow)(() => ({
    '& td': {
        backgroundColor: 'var(--table-cell-bg)',
        color: 'var(--table-cell-text)',
    },
    '&:nth-of-type(odd) td': {
        backgroundColor: 'var(--table-cell-alt-bg)',
    },
    '&:hover td': {
        backgroundColor: 'var(--table-cell-hover)',
    },
    boxShadow: '0 0 0 1px var(--dashboard-bg)',
    cursor: 'pointer',
}));

const CustomTableCell = styled(TableCell)(({ isFirstColumn }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: 'var(--sidebar-selected-bg)',
        color: 'var(--sidebar-text-selected)',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        border: 'none',
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 12,
        fontWeight: 600,
        // height: 30,
        textAlign: 'center',
        borderRight: 'none',
        ...(isFirstColumn && { whiteSpace: 'nowrap' }),
        borderBottom: 'none',
        '&:first-of-type': {
            // borderTopLeftRadius: '10px',
            // borderBottomLeftRadius: '10px',
        },
        '&:last-of-type': {
            // borderTopRightRadius: '8px',
            // borderBottomRightRadius: '8px',
        },
        color: 'var(--table-cell-text)',
        // padding: '8px 0px',
    },
}));

function Row({ row, selectedIds, handleCheckboxChange, visibleOptionsRowId, projectName, setVisibleOptionsRowId, handleRowClick, columns, taskType, myTask, taskDetail }) {
    const [open, setOpen] = React.useState(false);
    const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });
    const iconRef = React.useRef(null);
    const [showContextMenu, setShowContextMenu] = React.useState(false);
    const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });

    const formatDateMDY = (value) => {
        if (!value) return '-';
        const m = moment(value);
        if (!m.isValid()) return '-';
        return m.format('MM/DD/YYYY');
    };

    const formatDueDate = (isoString) => {

        const now = moment(); // Current date and time using moment
        const today = moment().startOf('day'); // Start of today (removes time component)

        // Parse the input isoString into a moment object
        const dueUTC = moment(isoString);

        // Convert to local time, but keep only the date part
        const dueLocal = moment(dueUTC).startOf('day'); // Start of the due date (removes time)

        // Calculate the difference in days
        const diffInDays = dueLocal.diff(today, 'days');

        // Handle date comparisons
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Tomorrow';
        if (diffInDays === -1) return 'Yesterday';
        if (diffInDays > 1 && diffInDays <= 7) return 'This Week';
        if (diffInDays > 7) return 'Next Week';
        if (diffInDays < -1 && diffInDays >= -7) return 'Last Week';
        if (diffInDays < -7) return 'Past Due';

        // Return the due date in MM/DD/YYYY format
        return dueLocal.format('MM/DD/YYYY');
    };

    // Close context menu when clicking outside or scrolling
    React.useEffect(() => {
        if (!showContextMenu) return;

        const handleClickOutside = (event) => {
            if (event.target.closest('.context-menu')) {
                return;
            }
            setShowContextMenu(false);
        };

        const handleScroll = () => setShowContextMenu(false);

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [showContextMenu]);



    const handleToggleDropdown = (event) => {
        event.stopPropagation();
        const rect = iconRef.current.getBoundingClientRect();
        setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
        });
        setOpen(!open);
    };

    return (
        <>
            <CustomTableRow
                onClick={(event) => {
                    if (event.target.type === 'checkbox' || event.target.closest('a')) {
                        return;
                    }
                    if (isModifierClick(event)) {
                        openTaskInNewTab(row, projectName, myTask);
                        return;
                    }
                    handleRowClick(row);
                }}
                onContextMenu={(event) => {
                    if (taskDetail) return;
                    event.preventDefault();
                    setContextMenuPosition({ x: event.clientX, y: event.clientY });
                    setShowContextMenu(true);
                }}
            >

                {columns.map((col) =>
                    col.id === 'checkbox' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(row)}
                                onChange={(event) => handleCheckboxChange(event, row)}
                            />
                        </CustomTableCell>
                    ) : col.id === 'status' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                                <div style={{
                                    ...getStatusColor(row[col.id]),
                                    fontWeight: 600,
                                    borderRadius: '10px',
                                    fontSize: 11,
                                    textTransform: 'uppercase',
                                    display: 'inline-block',
                                    textAlign: 'center',
                                    minWidth: '90px',
                                    padding: '2px 0px',
                                }}
                                >{formatStatusLabel(row[col.id])}</div>
                            </div>
                        </CustomTableCell>
                    ) : col.id === 'priority' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <div className='flex items-center justify-center gap-2'>
                                <Heading
                                    Fontweight={700}
                                    color={row[col.id] === 'high' ? '#F24E1E' : row[col.id] === 'medium' ? '#2B4BF2' : row[col.id] === 'low' ? '#939393' : '#F60933'}
                                    Heading={row[col.id].charAt(0).toUpperCase() + row[col.id].slice(1)}
                                    Fontsize={12}
                                    txtAlign="center"
                                />
                                <SVG.PriorityFlag style={{ color: row[col.id] === 'high' ? '#F24E1E' : row[col.id] === 'medium' ? '#2B4BF2' : row[col.id] === 'low' ? '#939393' : '#F60933' }} />
                            </div>
                        </CustomTableCell>
                    ) : col.id === 'taskTypeId' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <span>
                                {capitalizeFirst(
                                    taskType?.find((typeObj) => typeObj.id === row.taskTypeId)?.type || '-'
                                )}
                            </span>
                        </CustomTableCell>

                    ) : col.id === 'startDate' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <span>{formatDateMDY(row.startDate)}</span>
                        </CustomTableCell>
                    ) : col.id === 'endDate' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <span>{formatDueDate(row.endDate)}</span>
                        </CustomTableCell>
                    ) : col.id === 'creator' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <span>{capitalizeFirst(row?.creator?.name)}</span>
                        </CustomTableCell>
                    ) : col.id === 'project' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <span>{capitalizeFirst(row?.project?.name)}</span>
                        </CustomTableCell>
                    ) : col.id === 'assignee' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <AssigneeCell assignees={row?.assignments} />
                        </CustomTableCell>
                    ) : col.id === 'assignees' ? (
                        <CustomTableCell key={col.id} align={col.align}>
                            <AssigneeCell2 assignees={row?.assignee} />
                        </CustomTableCell>
                    ) : col.id === 'title' ? (
                        <CustomTableCell
                            key={col.id}
                            align="left"
                            style={{ textAlign: taskDetail ? 'center' : 'left', width: myTask ? '300px' : '250px', padding: myTask && '10px 80px' }}
                        >
                            {
                                (() => {
                                    const taskUrl = buildTaskDetailUrl(row, projectName);
                                    return (
                                        <a
                                            href={taskUrl}
                                            onClick={(e) => {
                                                if (isModifierClick(e)) {
                                                    e.preventDefault();
                                                    e.stopPropagation?.();
                                                    openTaskInNewTab(row, projectName, myTask);
                                                    return;
                                                }
                                                e.preventDefault();
                                                handleRowClick(row);
                                            }}
                                            style={{ color: 'var(--sidebar-text-primary)', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            {capitalizeFirst(row?.title)}
                                        </a>
                                    );
                                })()
                            }
                            {!myTask && row.isSubtask && row.parentId && (
                                <div style={{ display: 'flex', alignItems: 'center', marginTop: 2, gap: 4 }}>
                                    <img
                                        src={subtaskInTable}
                                        alt="subtask"
                                        style={{ width: 14, height: 14 }}
                                    />
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#888' }}>
                                        Subtask
                                    </span>
                                </div>
                            )}
                        </CustomTableCell>
                    ) : (
                        <CustomTableCell key={col.id} align={col.align}>
                            {capitalizeFirst(getValue(row, col.id))}
                        </CustomTableCell>
                    )
                )}
            </CustomTableRow>
            
            {/* Simple Context Menu */}
            {showContextMenu && (
                <div
                    className="context-menu fixed z-50 w-40 rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                    style={{
                        left: contextMenuPosition.x,
                        top: contextMenuPosition.y,
                        backgroundColor: 'var(--dashboard-card-bg)',
                        color: 'var(--dashboard-text-primary)',
                        border: '1px solid var(--dashboard-box-border)',
                    }}
                >
                    <div className="px-1 py-1">
                        <button
                            onClick={() => {
                                openTaskInNewTab(row, projectName, myTask);
                                setShowContextMenu(false);
                            }}
                            className="hover:bg-[var(--table-cell-hover)] group flex w-full items-center rounded-md px-2 py-2 text-sm"
                        >
                            Open in new tab
                        </button>
                    </div>
                </div>
            )}
            
            {open &&
                ReactDOM.createPortal(
                    <Box
                        sx={{
                            position: 'absolute',
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            backgroundColor: 'var(--dashboard-card-bg)',
                            border: '1px solid var(--dashboard-box-border)',
                            borderRadius: '4px',
                            zIndex: 2000,
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            padding: '8px 0',
                            minWidth: '150px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {['Pending', 'In Progress', 'Ready for QA', 'Ready for Approval', 'Failed QA', 'Completed', 'On Hold', 'UI Completed', 'API Completed', 'Not Completed', 'Ready For Deployment', 'QA In Progress', 'Deployment Completed'].map((displayStatus) => (
                            <div
                                key={displayStatus}
                                onClick={() => {
                                    handleStatusChange(row.id, displayStatus);
                                    setOpen(false);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: 'var(--dashboard-text-primary)',
                                    ':hover': {
                                        backgroundColor: 'var(--table-cell-hover)',
                                    }
                                }}
                            >
                                {displayStatus}
                            </div>
                        ))}
                    </Box>,
                    document.body
                )
            }
        </>
    );
}

const FooterWrapper = styled(Box)(({ theme }) => ({
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--dashboard-card-bg)',
    borderTop: '1px solid var(--dashboard-box-border)',
    padding: '4px 6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '0 0 14px 14px', // Rounded corners only at the bottom
}));

export default function TaskTable({ tasks, setSelectedTaskList, columns, projectName, page, setPage, rowsPerPage, setRowsPerPage, totalTasks, myTask, taskType, taskDetail, onRowClick }) {
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = React.useState([]);
    const [visibleOptionsRowId, setVisibleOptionsRowId] = React.useState(null);

    const handleRowClick = (task) => {
        if (typeof onRowClick === 'function') {
            onRowClick(task);
            return;
        }
        const taskProjectName = task?.project?.name || projectName;
        const taskDetailUrl = buildTaskDetailUrl(task, projectName);
        const fromRoute = myTask ? 'myTask' : 'projectTracking';
        setTaskDetailSidebarRoute(fromRoute);
        navigate(taskDetailUrl, { state: { itemData: task, projectName: taskProjectName, fromRoute } });
    };
    const handleCheckboxChange = (event, id) => {
        if (event.target.checked) {
            setSelectedIds((prev) => [...prev, id]);
            setSelectedTaskList((prev) => [...prev, id]);
        } else {
            setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
            setSelectedTaskList((prev) => prev.filter((selectedId) => selectedId !== id));
        }
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedIds(tasks.map((task) => task.id));
            setSelectedTaskList(tasks.map((task) => task.id));
        } else {
            setSelectedIds([]);
            setSelectedTaskList([]);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(1); // Reset to page 1
    };

    const allSelected = selectedIds?.length === tasks?.length;

    return (
        <>
            <StyledTableContainer component={Paper}>
                <Table aria-label="collapsible table" stickyHeader>
                    <CustomTableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <CustomTableCell key={column.id} align={column.align}>
                                    {column.id === 'checkbox' ? (
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={handleSelectAll}
                                        />
                                    ) : (
                                        column.label
                                    )}
                                </CustomTableCell>
                            ))}
                        </TableRow>
                    </CustomTableHeader>
                    <TableBody>
                        {[...tasks].map((task) => (  // ✅ reverse tasks without mutating original array
                            <Row
                                key={task.id}
                                columns={columns}
                                row={task}
                                selectedIds={selectedIds}
                                handleCheckboxChange={handleCheckboxChange}
                                visibleOptionsRowId={visibleOptionsRowId}
                                setVisibleOptionsRowId={setVisibleOptionsRowId}
                                handleRowClick={handleRowClick}
                                taskType={taskType}
                                myTask={myTask}
                                taskDetail={taskDetail}
                                projectName={projectName}
                            />
                        ))}
                    </TableBody>
                </Table>
                {!taskDetail && (
                    <FooterWrapper>
                        <Select
                            value={rowsPerPage}
                            onChange={handleChangeRowsPerPage}
                            displayEmpty
                            style={{
                                borderRadius: 10,
                                fontSize: 12,
                                color: 'var(--dashboard-text-primary)',
                                backgroundColor: 'var(--dashboard-card-bg)',
                            }}
                        >
                            <MenuItem value={5}>5 per page</MenuItem>
                            <MenuItem value={10}>10 per page</MenuItem>
                            <MenuItem value={25}>25 per page</MenuItem>
                            <MenuItem value={50}>50 per page</MenuItem>
                        </Select>
                        <Pagination
                            count={Math.ceil(totalTasks / rowsPerPage)}
                            page={page}
                            onChange={handleChangePage}
                            variant="outlined"
                            size="small"
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    color: 'var(--dashboard-text-primary)',
                                    borderColor: 'var(--dashboard-box-border)',
                                },
                                '& .Mui-selected': {
                                    backgroundColor: 'var(--chrome-primary)',
                                    color: '#FFFFFF',
                                    '&:hover': {
                                        backgroundColor: 'var(--chrome-primary-hover)',
                                        color: '#FFFFFF',
                                    },
                                },
                            }}
                        />
                    </FooterWrapper>
                )}
            </StyledTableContainer>
        </>
    );
}
