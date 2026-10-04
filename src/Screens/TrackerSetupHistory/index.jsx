import { useNavigate } from "react-router-dom";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import addIcon from "../../assets/addIcon.png";
import { useEffect, useState, useMemo } from "react";
import { deleteRequest, getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { toast } from "react-toastify";
import BottonCustom from "../../Components/ButtonCustom";
import AgentTable from "../../Components/AgentTable";
import EditSetup from "../../Components/EditSetup";
import AddSetup from "../../Components/AddSetup";
import DropdownMenu from "../../Components/dropdownMenu";
import { styled } from '@mui/material/styles';
import OneFieldModal from "../../Components/OneFieldModal";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10
});

const TrackerSetupHistory = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [taskEstimation, setTaskEstimation] = useState([])
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [task, setTask] = useState(null);
    const [isTaskTypeOpen, setIsTaskTypeOpen] = useState(false);
    const [isTaskLevelOpen, setIsTaskLevelOpen] = useState(false);
const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}task/estimations`, accessToken
        )
            .then(result => {
                const formatted = result?.data?.map(item => ({
                    ...item,
                    taskType: item.taskType?.type || "-",
                    taskLevel: item.taskLevel?.level || "-",
                    points: item.points ?? "-",
                    estimatedDays: item.estimatedDays ?? "-",
                    allowedLateDays: item.allowedLateDays ?? "-",
                    bonus: item.bonus ?? "-",
                    edit: "Edit", // Or a button/icon if AgentTable supports it
                }));
                setTaskEstimation(formatted);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData();
    }, []);

    const onClose = () => {
        setIsModalOpen(false)
        fetchData()
    }
    const onOpenAdd = () => {
        setIsAddModalOpen(true)
    }
    const onCloseAdd = () => {
        setIsAddModalOpen(false)
        fetchData()
    }

    const columns = [
        { id: 'taskType', label: 'Task Type', align: 'center' },
        { id: 'taskLevel', label: 'Task Level', align: 'center' },
        { id: 'points', label: 'Task Point', align: 'center' },
        { id: 'estimatedDays', label: 'Estimated Days', align: 'center' },
        { id: 'allowedLateDays', label: 'Days Late', align: 'center' },
        { id: 'bonus', label: 'Super Bonus', align: 'center' },
        { id: 'edit', label: 'Edit', align: 'center' },
    ];

    const onSubmit = (row) => {
        setTask(row)
        setIsModalOpen(true)
    }

    const handleButtonClick = () => {
        setIsAddModalOpen(true)
    }
    const handleOpenTaskTypeModal = () => {
        setIsTaskTypeOpen(true)
    };
    const handleCloseTaskTypeModal = () => {
        setIsTaskTypeOpen(false)
        fetchData()
    };

    const handleOpenTaskLevelModal = () => {
        setIsTaskLevelOpen(true)
    };
    const handleCloseTaskLevelModal = () => {
        setIsTaskLevelOpen(false)
        fetchData()
    };

    const handleTaskTypeCreate = async (title) => {
        try {
            const payload = {
                type: title,
            };

            const result = await postRequestWithBodyAndToken(`${baseURl}task-types`, accessToken, payload)
            toast.success(result.message);
            setIsTaskTypeOpen(false);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        }
    }

    const handleTaskLevelCreate = async (title) => {
        try {
            const payload = {
                level: title,
            };

            const result = await postRequestWithBodyAndToken(`${baseURl}task-levels`, accessToken, payload)
            toast.success(result.message);
            setIsTaskLevelOpen(false);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        }
    }

    const paginatedData = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return taskEstimation.slice(startIndex, startIndex + rowsPerPage);
    }, [taskEstimation, page, rowsPerPage]);

    const totalCount = taskEstimation.length;

    const handlePageChange = (newPage) => setPage(newPage);
    const handleRowsPerPageChange = (newRows) => {
        setRowsPerPage(newRows);
        setPage(1);
    };

    return (
        <>
            <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
                <HeaderWrapper>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Tracker Set-up'}
                        Fontsize={30}
                    // Tailwind CSS classes
                    />
                    <div className="flex gap-2 flex-wrap">
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Add Task Type'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={700}
                            onClick={handleOpenTaskTypeModal}
                            className="sm:flex-1 min-w-[120px]"
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Add Task Level'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={700}
                            onClick={handleOpenTaskLevelModal}
                            className="sm:flex-1 min-w-[120px]"
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Add Row'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={700}
                            onClick={handleButtonClick}
                            className="sm:flex-1 min-w-[120px]"
                        />
                    </div>
                </HeaderWrapper>
                {loading ? (
                    <div className="text-center w-full mx-auto">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : (
                    <div className="w-full p-4 min-h-screen " style={{  borderRadius: 14 }}>

                        {taskEstimation.length > 0 ? (
                            <AgentTable columns={columns} data={paginatedData}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                totalCount={totalCount}
                                onPageChange={handlePageChange}
                                onRowsPerPageChange={handleRowsPerPageChange} trackerSetup={true} onSubmit={(row) => onSubmit(row)} />
                        ) : (
                            <NoDataFound
                                title="No Data Found"
                                description="No tracker setup records are available right now."
                            />
                        )}
                    </div>
                )}
            </div>
            {isModalOpen && (
                <EditSetup isOpen={isModalOpen} onClose={onClose} task={task} />
            )}
            {isAddModalOpen && (
                <AddSetup isOpen={isAddModalOpen} onClose={onCloseAdd} />
            )}
            {isTaskTypeOpen && (
                <OneFieldModal
                    onClose={handleCloseTaskTypeModal}
                    isOpen={isTaskTypeOpen}
                    fieldTitle={'Task Type Title'}
                    fieldPlaceholder={'Enter Title'}
                    modalTitle={'Add Task Type'}
                    onSubmit={(value) => handleTaskTypeCreate(value)}
                />
            )}
            {isTaskLevelOpen && (
                <OneFieldModal
                    onClose={handleCloseTaskLevelModal}
                    isOpen={isTaskLevelOpen}
                    fieldTitle={'Task Level Title'}
                    fieldPlaceholder={'Enter Title'}
                    modalTitle={'Add Task Level'}
                    onSubmit={(value) => handleTaskLevelCreate(value)}
                />
            )}
        </>
    );
};

export default TrackerSetupHistory;
