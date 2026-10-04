import { useNavigate, useLocation } from "react-router-dom";
import Heading from "../../Components/Heading";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getRequestWithOutBody} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import SupportList from "../../Components/SupportList";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { setSupportTicketDetailSidebarRoute } from "../../Utils/supportTicketDetailSidebarRoute";

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10
});

const MerchantSupport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    
    // Update browser tab title
    usePageTitle("Board View", location);

    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [projectList, setProjectList] = useState([]);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);
    const [ticketList, setTicketList] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);

    const fetchData2 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}ticket?category=support`, accessToken
        )
            .then(result => {
                const reversedData = [...(result?.data?.results || [])]; // clone and reverse
                setTicketList(reversedData);
                setFilteredTickets(reversedData);
                setLoading(false);
            })
            .catch(error => {
                setLoading(false)
            })
    }

    const fetchData = () => {
        let api = `${baseURl}application-ticket`
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                setProjectList(result?.data?.results?.slice())
                setFilteredProjects(result?.data?.results?.slice()); // Set filtered initially
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const applicationClick = (task) => {
        let api = `${baseURl}application/${task?.application?.id}`
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                navigate('/home/editApplication', { state: { itemData: result?.data, returnTo: location.pathname } })
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData()
        fetchData2()
    }, [])

    const openEditModal = (task) => {
        setTaskToEdit(task);
        setIsEditModalVisible(true);
    };

    const handleOpenModal = () => {
        setModalOpen(true)
    };

    const statusTitles = {
        application: "Application",
        maintenanceRequest: "Maintenance Request",
        terminalProgramming: "Terminal Programming",
        deployment: "Deployment",
        followUp: "Follow Up"
    };

    const headerColors = {
        application: "#3B82F6",
        maintenanceRequest: "#17A2B8",
        terminalProgramming: "#8B5CF6",
        deployment: "#FFA500",
        followUp: "#32CD32"
    };

    const bgColors = {
        application: "rgba(30, 144, 255, 0.05)",
        maintenanceRequest: "rgba(23, 162, 184, 0.05)",
        terminalProgramming: "rgba(139, 92, 246, 0.05)",
        deployment: "rgba(255, 165, 0, 0.05)",
        followUp: "rgba(50, 205, 50, 0.05)"
    };

    const priorityStyles = {
        new: {
            bg: "rgba(179, 48, 0, 0.2)",
            text: "#B33000",
        },
        pending: {
            bg: "rgba(67, 121, 238, 0.2)",
            text: "#1E90FF",
        },
        approved: {
            bg: "rgba(76, 175, 80, 0.2)",
            text: "#4CAF50",
        },
        complete: {
            bg: "rgba(76, 175, 80, 0.2)",
            text: "#4CAF50",
        },
        submitted: {
            bg: "rgba(23, 162, 184, 0.2)",
            text: "#17A2B8",
        },
        signed: {
            bg: "rgba(126, 87, 194, 0.2)",
            text: "#7E57C2",
        },
        'in-progress': {
            bg: "rgba(255, 179, 0, 0.2)",
            text: "#FFB300",
        },
        uw: {
            bg: "rgba(255, 179, 0, 0.2)",
            text: "#FFB300",
        },
        completed: {
            bg: "rgba(40, 167, 69, 0.2)",
            text: "#28a745",
        },
        default: {
            bg: "#f3f4f6", // Tailwind bg-gray-100
            text: "#6b7280", // Tailwind text-gray-700
        },
    };
    const statusOrder = ["application", "maintenanceRequest", "terminalProgramming", "deployment", "followUp"];

    const statusToCategoryMap = {
        new: "application",
        submitted: "maintenanceRequest",
        signed: "terminalProgramming",
        uw: "deployment",
        approved: "followUp"
    };

    const statusToNavStatus = {
        submitted: "maintainance",
        signed: "terminal",
        uw: "deployment",
        approved: "followup",
    };

    const getApplicationTicketNewTabUrl = (task) => {
        const navStatus = statusToNavStatus[task?.status?.toLowerCase()];
        if (!navStatus || !task?.id) return null;
        const params = new URLSearchParams({
            id: String(task.id),
            status: navStatus,
            from: 'merchantSupport',
        });
        return `/home/supportTicketDetail?${params.toString()}`;
    };

    const getSupportTicketNewTabUrl = (ticket) => {
        if (!ticket?.id) return null;
        return `/home/singleTicket?id=${ticket.id}`;
    };

    const openApplicationTicket = (task) => {
        if (task.status === "new") {
            applicationClick(task);
        } else if (task.status === "submitted") {
            setSupportTicketDetailSidebarRoute('merchantSupport');
            navigate('/home/supportTicketDetail', { state: { itemData: task, status: 'maintainance', fromRoute: 'merchantSupport' } });
        } else if (task.status === "signed") {
            setSupportTicketDetailSidebarRoute('merchantSupport');
            navigate('/home/supportTicketDetail', { state: { itemData: task, status: 'terminal', fromRoute: 'merchantSupport' } });
        } else if (task.status === "uw") {
            setSupportTicketDetailSidebarRoute('merchantSupport');
            navigate('/home/supportTicketDetail', { state: { itemData: task, status: 'deployment', fromRoute: 'merchantSupport' } });
        } else if (task.status === "approved") {
            setSupportTicketDetailSidebarRoute('merchantSupport');
            navigate('/home/supportTicketDetail', { state: { itemData: task, status: 'followup', fromRoute: 'merchantSupport' } });
        }
    };

    const tasksByStatus = projectList?.reduce((acc, task) => {
        const category = statusToCategoryMap[task.status?.toLowerCase()] || "application";
        if (!acc[category]) acc[category] = [];
        acc[category].push(task);
        return acc;
    }, {});

    const handleSearchClick = () => {
        const search = searchText.trim().toLowerCase();

        const filteredTix = ticketList.filter((ticket) => {
            if (!search) return true;

            const title = String(ticket?.title ?? '').toLowerCase();
            const idStr = String(ticket?.id ?? '').toLowerCase();
            const ticketNoStr = String(ticket?.ticketNo ?? ticket?.ticketNumber ?? '').toLowerCase();

            return (
                (title && title.includes(search)) ||
                (idStr && idStr.includes(search)) ||
                (ticketNoStr && ticketNoStr.includes(search))
            );
        });
        setFilteredTickets(filteredTix);

        const filteredProjs = projectList.filter(project =>
            project?.application?.businessName?.toLowerCase().includes(search)
        );
        setFilteredProjects(filteredProjs);
    };


    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSearchClick();
        }
    };

    useEffect(() => {
        handleSearchClick();
    }, [searchText])

    const handleInputChange = (e) => {
        const text = e.target.value;
        setSearchText(text);
    }
    return (
        <>
            <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
                <HeaderWrapper>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Board View'}
                        Fontsize={30}
                    // Tailwind CSS classes
                    />
                </HeaderWrapper>
                {
                    loading ? (
                        <div className="text-center w-full mx-auto">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (filteredTickets?.length || 0) === 0 && (filteredProjects?.length || 0) === 0 ? (
                        <NoDataFound title="No Data Found" description="No support data found." />
                    ) : (
                        <div className="w-full">
                            <div className="w-full mt-2" style={{ borderRadius: 14 }}>
                                <div style={{ minWidth: 280 }}>
                                    {/* <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>
                                        Search
                                    </label> */}
                                    <input
                                        type="text"
                                        placeholder="Search by title and ticket number"
                                        className="mt-1 p-2 w-full"
                                        style={{
                                            border: '1px solid var(--dashboard-box-border)',
                                            borderRadius: 8,
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                            height: 40,
                                            color: 'var(--dashboard-text-primary)'
                                        }}
                                        value={searchText}
                                        onKeyDown={handleKeyDown}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="overflow-x-auto mt-3">
                                    <div className="flex pb-2 gap-4 w-max" >
                                        {/* New column for support tickets */}
                                        <SupportList
                                            key="supportTickets"
                                            title="Support Tickets"
                                            tasks={filteredTickets}
                                            priorityStyles={priorityStyles}
                                            headerColor="#F48FB1"
                                            backgroundColor="rgba(244, 143, 177, 0.05)"
                                            onAddTaskClick={handleOpenModal}
                                            onTaskClick={(ticket) => {
                                                navigate('/home/singleTicket', { state: { rowData: ticket } });
                                            }}
                                            getNewTabUrl={getSupportTicketNewTabUrl}
                                            isEditModalOpen={openEditModal}
                                            onSuccess={fetchData2}
                                            loading={loading}
                                        />
                                        {statusOrder.map((statusKey) => {
                                            const allTasks = filteredProjects || []; // use filtered list
                                            const tasksByStatus = allTasks.reduce((acc, task) => {
                                                const category = statusToCategoryMap[task.status?.toLowerCase()] || "application";
                                                if (!acc[category]) acc[category] = [];
                                                acc[category].push(task);
                                                return acc;
                                            }, {});
                                            const tasks = tasksByStatus?.[statusKey] || [];
                                            // if (tasks.length === 0) return null;

                                            return (
                                                <SupportList
                                                    key={statusKey}
                                                    title={statusTitles[statusKey]}
                                                    tasks={tasks}
                                                    priorityStyles={priorityStyles}
                                                    headerColor={headerColors[statusKey]}
                                                    backgroundColor={bgColors[statusKey]}
                                                    onAddTaskClick={handleOpenModal}
                                                    onTaskClick={openApplicationTicket}
                                                    getNewTabUrl={getApplicationTicketNewTabUrl}
                                                    isEditModalOpen={openEditModal}
                                                    onSuccess={fetchData}
                                                    loading={loading}
                                                />
                                            );
                                        })}

                                    </div>
                                </div>
                            </div>

                        </div>
                    )
                }
            </div >
        </>
    );
};

export default MerchantSupport;
