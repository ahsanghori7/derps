import Heading from "../../Components/Heading";
import { useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from "@mui/material/styles";
import DashboardTable from "../../Components/DashboardTable";
import moment from "moment";

const HeaderWrapper2 = styled("div")({
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: 10,
    margin: 12,
    // paddingTop: 25
});

const TenantsDashboard = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const signinFlag = useSelector((state) => state.signinReducer.signin);

    const [loading, setLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [ticketList, setTicketList] = useState([]);
  const [users, setUsers] = useState([]);

    const fetchDashboardData = async (period = "monthly", startDate, endDate) => {
        setLoading(true);

        const payload = {
            period: period || "monthly",
            startDate: startDate ? moment(startDate).format("MM/DD/YYYY") : null,
            endDate: endDate ? moment(endDate).format("MM/DD/YYYY") : null,
        };

        payload.assignedTo = userData?.roleTitle !== "Admin" || userData?.roleTitle !== "Human Resource" ? userData?.id : null;


        try {
            const result = await postRequestWithBodyAndToken(
                `${baseURl}dashboard/new`,
                accessToken,
                payload
            );


            const data = result?.data || {};

            // Analytics cards → ticketSummary
            const summary = data.ticketSummary || {
                totalMerchants: 0,
                activeUsers: 0,
                inactiveUsers: 0,
            };
            setAnalyticsData([
                { title: "Total Merchant", value: summary.totalTickets },
                { title: "Active Users", value: summary.pendingTickets },
                { title: "Inactive Users", value: summary.completedTickets },
            ]);

            // Tickets (all tickets list not in response → use dummy if needed
            // Most assigned users
            setUsers(
                (data.mostAssignedUsers || []).map((u) => ({
                    username: u.username,
                    totalTickets: u.totalTickets || u.ticketCount || 0,
                    ticketCategory: u.categoryTitle || "N/A",
                }))
            );

            // In fetchDashboardData
            const trends = data.ticketTrends?.data || [];
            setTrendsData(
                trends.map((t) => ({
                    month: moment(t.timeUnit, "M").format("MMM"), // Convert number → "JAN"
                    Completed: Number(t.completed || 0),
                    Pending: Number(t.pending || 0),
                    Total: Number(t.total || 0),
                }))
            );


        } catch (error) {

            // Dummy fallbacks when API fails
            setAnalyticsData([
                { title: "Total Merchants", value: 0 },
                { title: "Active Users", value: 0 },
                { title: "Inactive Users", value: 0 },
            ]);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData("monthly"); // default
    }, []);

    const columns4 = [
        { id: "username", label: "USER NAME" },
        { id: "totalTickets", label: "TOTAL TICKETS" },
        { id: "ticketCategory", label: "TICKET CATEGORY" },
      ];

    // Transform filteredTickets → rows for table
    const ticketRows = ticketList.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category?.title || "-",
        priority: t.priority,
        status: t.status?.charAt(0).toUpperCase() + t.status?.slice(1), // capitalize
        agent: t.agent?.name || "-",
        assignee: t.assignee?.name || "-",
    }));

    return (
        <>
            <div
                className="min-h-screen"
                style={{
                    marginTop: -80,
                    padding: 10,
                    backgroundColor: "var(--dashboard-bg)",
                }}
            >
                <div className=" gap-3 mb-1 flex-wrap items-center">
                    <HeaderWrapper2>
                        <div className="ml-2">
                            <Heading
                                Fontweight={700}
                                color={"var(--sidebar-text-primary)"}
                                Heading={`Dashbaord Overview`}
                                Fontsize={30}
                            />
                        </div>
                    </HeaderWrapper2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {analyticsData.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white flex flex-col justify-center items-center h-28 rounded-xl w-full"
                        >
                            <Heading
                                Fontweight={600}
                                color={"#202224B2"}
                                Heading={item.title}
                                Fontsize={16}
                            />
                            <Heading
                                Fontweight={700}
                                color={"#202224"}
                                Heading={item.value || 0}
                                Fontsize={20}
                            />
                        </div>
                    ))}
                </div>
                {/* <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full mt-4">
                    <div className="flex-auto xl:flex-[0.3] w-full md:w-auto overflow-x-auto xl:min-w-[400px]">
                        <DashboardTable
                            title="Most Ticket Assigned Users"
                            columns={columns4}
                            rows={users}
                        />
                    </div>
                </div> */}
            </div>
        </>
    );
};

export default TenantsDashboard;