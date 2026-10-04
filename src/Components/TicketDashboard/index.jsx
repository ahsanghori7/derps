import Heading from "../Heading";
import { useEffect, useState } from "react";
import DashboardTable from "../DashboardTable";
import TicketOverview from "../TicketOverview";
import TicketCategoryChart from "../TicketCategoryChart";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
// import DonutChart from "../DonutChart";
import moment from "moment";
import Loader from "../Loader";

const TicketDashboard = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const categoryScope = useSelector((state) => state.auth.categories);
  const userData = useSelector((state) => state.userData.userDetails);

  const [loading, setLoading] = useState(false);
  const [categoryList, setCategoryList] = useState([]);

  // API response states
  const [analyticsData, setAnalyticsData] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [ticketList, setTicketList] = useState([]);

  // fetch categories
  const fetchCategories = () => {
    getRequestWithOutBody(`${baseURl}category`, accessToken)
      .then((result) => {
        let filteredCategories =
          result?.data?.map((cat) => cat.title) || [];
        setCategoryList(filteredCategories);
      })
      .catch((error) => {
      });
  };

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
        totalTickets: 0,
        pendingTickets: 0,
        completedTickets: 0,
        currentMonthTickets: 0,
      };
      setAnalyticsData([
        { title: "Total Tickets", value: summary.totalTickets },
        { title: "Pending Tickets", value: summary.pendingTickets },
        { title: "Completed Tickets", value: summary.completedTickets },
        { title: "Current Month Tickets", value: summary.currentMonthTickets },
      ]);

      // Tickets (all tickets list not in response → use dummy if needed)
      setTickets(data.tickets || []);

      // Most assigned users
      setUsers(
        (data.mostAssignedUsers || []).map((u) => ({
          username: u.username,
          totalTickets: u.totalTickets || u.ticketCount || 0,
          ticketCategory: u.categoryTitle || "N/A",
        }))
      );

      // Tickets by category → TicketCategoryChart
      setCategoryData(
        (data.ticketsByCategory || []).map((c) => ({
          category: c.categoryTitle,
          Completed: Number(c.totalTicketCount || 0),
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
        { title: "Total Tickets", value: 0 },
        { title: "Pending Tickets", value: 0 },
        { title: "Completed Tickets", value: 0 },
      ]);
      setCategoryData([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = (status = "All Status") => {
    setLoading(true);
  
    let url = `${baseURl}ticket?paginate=true&page=1&limit=5&orderBy=createdAt&order=desc&assignedTo=${userData?.id}`;
  
    if (status && status !== "All Status") {
      url += `&status=${encodeURIComponent(status)}`;  // ✅ send filter
    }
  
    getRequestWithOutBody(url, accessToken)
      .then(result => {
        let filteredTickets = result?.data?.results;
  
        // if (userData?.roleTitle !== "Admin") {
        //   filteredTickets = filteredTickets?.filter(ticket =>
        //     ticket?.agent?.id === userData?.id ||
        //     ticket?.assignee?.id === userData?.id
        //   );
        // }
  
        setTicketList(filteredTickets);
        setLoading(false);
      })
      .catch(error => {
        setLoading(false);
      });
  };  

  useEffect(() => {
    fetchCategories();
    fetchDashboardData("monthly"); // default
    fetchData()
  }, []);

  // Define columns for your tickets table
  const ticketColumns = [
    { id: "id", label: "TICKET ID" },
    { id: "title", label: "TITLE" },
    { id: "category", label: "CATEGORY" },
    // { id: "priority", label: "PRIORITY" },
    { id: "status", label: "STATUS" },
    // { id: "agent", label: "AGENT" },
    { id: "assignee", label: "ASSIGNEE" },
    { id: "details", label: "DETAILS" },
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


  const columns3 = [
    { id: "id", label: "TICKET ID" },
    { id: "merchant", label: "MERCHANT NAME" },
    { id: "category", label: "CATEGORY" },
    { id: "assignedTo", label: "ASSIGNED TO" },
    { id: "status", label: "STATUS" },
    { id: "details", label: "DETAILS" },
  ];

  const columns4 = [
    { id: "username", label: "USER NAME" },
    { id: "totalTickets", label: "TOTAL TICKETS" },
    { id: "ticketCategory", label: "TICKET CATEGORY" },
  ];

  const filters3 = ["All Status", "Pending", "In Progress", "Complete"];

  return loading ? (
    <div className="text-center w-full mx-auto mt-10">
      <Loader message="Loading..." subMessage="Please wait" />
    </div>
  ) : (
    <div className="px-4 overflow-hidden">
      {/* Top Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsData.map((item, index) => (
          <div
            key={index}
            className="flex flex-col justify-center items-center h-28 rounded-xl w-full"
            style={{ backgroundColor: 'var(--dashboard-card-bg)' }}
          >
            <Heading
              Fontweight={600}
              color={'var(--dashboard-text-secondary)'}
              Heading={item.title}
              Fontsize={16}
            />
            <Heading
              Fontweight={700}
              color={'var(--dashboard-text-primary)'}
              Heading={item.value || 0}
              Fontsize={20}
            />
          </div>
        ))}
      </div>

      {/* Accounts & Transaction Volume */}
      <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full mt-4">
        <div className="flex-auto xl:flex-[0.6]  w-full md:w-auto">
          <TicketOverview data={trendsData} />
        </div>
        <div className="flex-auto xl:flex-[0.4]  w-full md:w-auto">
          <TicketCategoryChart data={categoryData} />
        </div>
      </div>

      {/* Applications & Overview */}
      <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full mt-4">
        {ticketRows.length > 0 && (
          <div className="flex-auto xl:flex-[0.7] w-full md:w-auto">
            <DashboardTable
              title="Internal Tickets"
              columns={ticketColumns}
              rows={ticketRows}
            // filters={["All Status", "Pending", "In Progress", "Complete"]}
            ticketlist={true}
            // onFilterChange={(status) => fetchData(status)}
          />
          </div>
        )}
        <div className="flex-auto xl:flex-[0.3] w-full md:w-auto overflow-x-auto xl:min-w-[400px]">
          <DashboardTable
            title="Most Ticket Assigned Users"
            columns={columns4}
            rows={users}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketDashboard;