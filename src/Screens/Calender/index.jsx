import { useNavigate, useLocation } from "react-router-dom";
import Heading from "../../Components/Heading";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Link2, Search, X } from "lucide-react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import addIcon from "../../assets/addIcon.png";
import { styled } from "@mui/material/styles";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Loader from "../../Components/Loader";
import moment from "moment";
import AddEvent from "../../Components/AddEvent";
import EditEvent from "../../Components/EditEvent";
import ConfigureBookingModal from "../../features/booking/components/ConfigureBookingModal";
import CalendarGrid from "../../Components/CalendarGrid";
import ViewEvent from "../../Components/ViewEvent";
import { usePageTitle } from "../../Hooks/usePageTitle";

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  // marginBottom: '20px',
  flexWrap: "wrap",
  gap: 10,
});

const Calender = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  
  // Update browser tab title
  usePageTitle("Calendar", location);
  const [viewMode, setViewMode] = useState("This Month");

  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isBookingConfigOpen, setBookingConfigOpen] = useState(false);
  //   const [viewMode, setViewMode] = useState("This Week"); // or 'month'
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [meetingList, setMeetingList] = useState([]);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(moment()); // Track the current month being viewed
  const [currentWeek, setCurrentWeek] = useState(moment());
  const [currentYear, setCurrentYear] = useState(moment());
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  // When navigated here from a booking/meeting notification, jump to the
  // relevant month and auto-open the meeting once it has loaded.
  const [pendingMeetingId, setPendingMeetingId] = useState(
    location.state?.selectedMeetingId || null,
  );

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
  };

  const statusOptions = [
    { id: "This Week", name: "This Week" },
    { id: "This Month", name: "This Month" },
    { id: "This Year", name: "This Year" },
  ];

  const handlePrevMonth = () => {

    if (viewMode === "This Week") {
      setCurrentWeek((prev) => prev.clone().subtract(1, "week"));
      return;
    }

    if (viewMode === "This Month") {
      setCurrentMonth((prev) => prev.clone().subtract(1, "month").startOf("month"));
      return;
    }

    if (viewMode === "This Year") {
      setCurrentYear((prev) => prev.clone().subtract(1, "year"));
      return;
    }

    setIsManualNavigation(true);
    setViewMode(null);

    setCurrentMonth((prev) => {
      const newMonth = prev.clone().subtract(1, "month").startOf("month");
      return newMonth;
    });
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth, viewMode, currentWeek, currentYear, searchKeyword]);


  useEffect(() => {
  }, [currentMonth, isManualNavigation]);


  const fetchData = () => {
    if (!accessToken || !userData?.id) return;

    setLoading(true);

    let start, end;

    // 🔹 If user is navigating months, ALWAYS fetch full month
    if (!viewMode) {
      start = currentMonth.clone().startOf("month");
      end = currentMonth.clone().endOf("month");
    } else if (viewMode === "This Week") {
      start = currentWeek.clone().startOf("week");
      end = currentWeek.clone().endOf("week");
    } else if (viewMode === "This Month") {
      start = currentMonth.clone().startOf("month");
      end = currentMonth.clone().endOf("month");
    } else if (viewMode === "This Year") {
      start = currentYear.clone().startOf("year");
      end = currentYear.clone().endOf("year");
    }

    if (!start || !end) {
      setLoading(false);
      return;
    }

    let url = `${baseURl}meeting/?startDate=${start.format(
      "YYYY-MM-DD",
    )}&endDate=${end.format("YYYY-MM-DD")}&userId=${userData?.id}`;

    if (searchKeyword) {
      url += `&keyword=${encodeURIComponent(searchKeyword)}`;
    }

    getRequestWithOutBody(url, accessToken)
      .then((result) => {
        setMeetingList(result?.data?.data || []);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  };

  const getFilteredMeetings = () => {
    let start, end;

    // 🔥 First load → start from TODAY
    if (!viewMode) {
      start = currentMonth.clone().startOf("month");
      end = currentMonth.clone().endOf("month");
    }

    // 🔥 This Week
    else if (viewMode === "This Week") {
      start = currentWeek.clone().startOf("week");
      end = currentWeek.clone().endOf("week");
    }

    // 🔥 This Month
    else if (viewMode === "This Month") {
      start = currentMonth.clone().startOf("month");
      end = currentMonth.clone().endOf("month");
    }

    // 🔥 This Year
    else if (viewMode === "This Year") {
      start = currentYear.clone().startOf("year");
      end = currentYear.clone().endOf("year");
    }

    // Generate all days in range
    const days = [];
    let currentDay = start.clone();
    while (currentDay.isSameOrBefore(end)) {
      days.push(currentDay.clone());
      currentDay.add(1, "day");
    }

    // Step 1: Merge meetings by date (tasks we’ll assign by endDate)
    const mergedByDate = {};
    meetingList.forEach((entry) => {
      const day = entry.date;
      if (!mergedByDate[day]) {
        mergedByDate[day] = { meetings: [], tasks: [] };
      }
      mergedByDate[day].meetings.push(...(entry.meetings || []));
      mergedByDate[day].tasks.push(...(entry.tasks || []));
    });

    // Step 2: Build calendar
    const tasksByDate = days.map((day) => {
      const dayString = day.format("YYYY-MM-DD");
      const merged = mergedByDate[dayString] || { meetings: [], tasks: [] };

      // Collect meetings for this date
      const sortedMeetings = [...merged.meetings].sort((a, b) =>
        moment(a.startTime, "HH:mm").isBefore(moment(b.startTime, "HH:mm"))
          ? -1
          : 1,
      );

      // Collect tasks that END on this date (ignore startDate)
      let endDateTasks = [];
      meetingList.forEach((entry) => {
        (entry.tasks || []).forEach((task) => {
          const taskEnd = moment(task.endDate).format("YYYY-MM-DD");
          if (taskEnd === dayString) {
            endDateTasks.push(task);
          }
        });
      });

      // Sort tasks by endDate
      endDateTasks = endDateTasks.sort((a, b) =>
        moment(a.endDate).isBefore(moment(b.endDate)) ? -1 : 1,
      );

      return {
        id: dayString,
        phase: day.format("dddd, MMM D"),
        tasks: endDateTasks,
        events: sortedMeetings,
      };
    });

    return tasksByDate;
  };

  useEffect(() => {
    const filtered = getFilteredMeetings();
    setFilteredTasks(filtered);
  }, [meetingList, viewMode, currentMonth, currentYear, isManualNavigation]);

  useEffect(() => {
    if (!pendingMeetingId) return;
    const eventDate = location.state?.itemData?.eventDate;
    if (eventDate && moment(eventDate, "YYYY-MM-DD", true).isValid()) {
      setIsManualNavigation(true);
      setViewMode(null);
      setCurrentMonth(moment(eventDate).startOf("month"));
    }
    // Only run once, when the calendar first mounts with a pending meeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingMeetingId || filteredTasks.length === 0) return;

    const match = filteredTasks
      .flatMap((day) => day.events || [])
      .find((event) => String(event.id) === String(pendingMeetingId));

    if (match) {
      setSelectedTask(match);
      if (match.organizer?.id === userData?.id) {
        setEditModalOpen(true);
      } else {
        setViewModalOpen(true);
      }
      setPendingMeetingId(null);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [filteredTasks, pendingMeetingId, userData?.id]);


  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    fetchData();
  };

  const handleOpenEditModal = () => {
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    fetchData();
  };

  // inside Calender component
  const getVisibleMonths = () => {
    if (!filteredTasks || filteredTasks.length === 0) return "";

    const months = filteredTasks.map((d) =>
      moment(d.id, "YYYY-MM-DD").format("MMMM YYYY"),
    );

    // Unique months only
    const uniqueMonths = [...new Set(months)];

    // If only one month, return it. If two (e.g. Sep & Oct), show "Sep - Oct"
    return uniqueMonths.length === 1
      ? uniqueMonths[0]
      : `${uniqueMonths[0]} - ${uniqueMonths[uniqueMonths.length - 1]}`;
  };

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim());
  };

  const handleCancelSearch = () => {
    setShowSearch(false);
    setSearchInput("");
    setSearchKeyword("");
  };

  const handleViewModeChange = (mode) => {
    setIsManualNavigation(false);
    setViewMode(mode);
    setCurrentMonth(moment());
    setCurrentWeek(moment());
    setCurrentYear(moment());
  };

  const [todayTick, setTodayTick] = useState(0);

  const handleToday = () => {
    setIsManualNavigation(true);
    setCurrentMonth(moment());
    setCurrentWeek(moment());
    setCurrentYear(moment());
    setTodayTick((tick) => tick + 1);
  };


  useEffect(() => {
  }, [currentMonth]);

  const isViewingCurrentPeriod =
    viewMode === "This Week"
      ? currentWeek.isSame(moment(), "week")
      : viewMode === "This Month"
        ? currentMonth.isSame(moment(), "month")
        : viewMode === "This Year"
          ? currentYear.isSame(moment(), "year")
          : false;

  return (
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
            Heading={"Calendar"}
            Fontsize={30}
          // Tailwind CSS classes
          />

          <div className="flex items-center gap-2 mt-1">
            {showSearch ? (
              <div
                className="mb-2 mx-2 flex items-center gap-1 rounded-full border pl-3 pr-1 py-1"
                style={{
                  borderColor: "var(--dashboard-box-border)",
                  backgroundColor: "var(--dashboard-tab-box)",
                }}
              >
                <Search size={15} style={{ color: "var(--dashboard-tab-text-inactive)" }} className="shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                    if (e.key === "Escape") handleCancelSearch();
                  }}
                  placeholder="Search events by title..."
                  maxLength={30}
                  className="bg-transparent outline-none border-none text-xs sm:text-sm w-36 sm:w-56"
                  style={{ color: "var(--sidebar-text-primary)" }}
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchInput.trim()}
                  className="shrink-0 rounded-full px-3 py-1 text-xs sm:text-sm font-semibold text-[#0C79F7] transition-colors hover:bg-[#0C79F7]/20 disabled:opacity-40 disabled:hover:bg-transparent"
                  style={{ backgroundColor: "rgba(0,89,245,0.1)" }}
                  title="Search"
                >
                  Search
                </button>
                <button
                  onClick={handleCancelSearch}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                  style={{ color: "var(--dashboard-tab-text-inactive)" }}
                  title="Cancel search"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="mb-2 mx-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: "var(--dashboard-tab-text-inactive)" }}
                title="Search events"
              >
                <Search size={18} />
              </button>
            )}
            <button
              onClick={() => setBookingConfigOpen(true)}
              className="mb-2 mx-2 flex items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition-colors hover:bg-[#0C79F7]/10 hover:border-[#0C79F7]/40"
              style={{
                height: 40,
                borderColor: "var(--dashboard-box-border)",
                color: "var(--dashboard-tab-text-inactive)",
              }}
              title="Configure your public booking page"
            >
              <Link2 size={16} />
              Configure Booking Page
            </button>
            <BottonWithIcon
              backgroundColor={"#0C79F7"}
              icon={addIcon}
              // width={145}
              title={"Create Event"}
              height={40}
              color={"var(--sidebar-text-selected)"}
              fontSize={16}
              fontWeight={500}
              borderRadius={10}
              className="shadow-sm hover:opacity-90 transition-opacity"
              onClick={handleOpenModal}
            />
          </div>
        </HeaderWrapper>
        <div className="w-full">
          <div
            className="w-full shadow-sm"
            style={{
              backgroundColor: "var(--dashboard-card-bg)",
              borderRadius: 14,
              border: "1px solid var(--sidebar-divider)",
            }}
          >
              <div className="px-3 py-3 sm:px-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Month/Week Navigation */}
                    <button
                      onClick={handlePrevMonth}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--dashboard-tab-text-inactive)" }}
                      title="Previous"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>

                    <button
                      onClick={() => {
                        if (viewMode === "This Week") {
                          setCurrentWeek((prev) => prev.clone().add(1, "week"));
                          return;
                        }
                        if (viewMode === "This Month") {
                          setCurrentMonth((prev) => prev.clone().add(1, "month").startOf("month"));
                          return;
                        }
                        if (viewMode === "This Year") {
                          setCurrentYear((prev) => prev.clone().add(1, "year"));
                          return;
                        }
                        setViewMode(null);
                        setCurrentMonth(currentMonth.clone().add(1, "month"));
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--dashboard-tab-text-inactive)" }}
                      title="Next"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>

                    <button
                      onClick={handleToday}
                      className="ml-1 rounded-full border border-[#0C79F7]/30 bg-[#0C79F7]/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#0C79F7] transition-colors hover:bg-[#0C79F7]/20 dark:border-[#4880FF]/40 dark:bg-[#4880FF]/15 dark:text-[#7DA2FF] dark:hover:bg-[#4880FF]/25"
                      title="Jump to today"
                    >
                      Today
                    </button>

                    <Heading
                      Fontweight={700}
                      className="ml-1 sm:ml-2"
                      color={"var(--dashboard-text-primary)"}
                      Heading={
                        viewMode === "This Week"
                          ? `${currentWeek.clone().startOf("week").format("MMM D")} - ${currentWeek.clone().endOf("week").format("MMM D, YYYY")}`
                          : viewMode === "This Year"
                            ? currentYear.format("YYYY")
                            : currentMonth.format("MMMM YYYY")
                      }
                      Fontsize={20}
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/10">

                    {statusOptions.map((option) => {
                      const isSelected = viewMode === option.id && isViewingCurrentPeriod;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleViewModeChange(option.id)}
                          className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all ${isSelected
                              ? "bg-[#0C79F7] text-white shadow-sm"
                              : "hover:bg-black/5 dark:hover:bg-white/10"
                            }`}
                          style={
                            isSelected
                              ? undefined
                              : { color: "var(--dashboard-tab-text-inactive)" }
                          }
                        >
                          {option.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div
              className="relative w-full mt-4 shadow-sm"
              style={{ borderRadius: 14, overflow: "hidden" }}
            >
              <CalendarGrid
                events={filteredTasks}
                currentMonth={currentMonth}
                currentWeek={currentWeek}
                currentYear={currentYear}
                todayTick={todayTick}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  if (task.organizer?.id === userData?.id) {
                    setEditModalOpen(true);
                  } else {
                    setViewModalOpen(true); // You need to handle this modal
                  }
                }}
                viewMode={viewMode}
              />
              {loading && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-[1px]"
                  style={{ backgroundColor: "var(--dashboard-bg)", opacity: 1 }}
                >
                  <Loader message="Loading..." subMessage="Please wait" />
                </div>
              )}
            </div>
          </div>
      </div>
      {isModalOpen && (
        <AddEvent onClose={handleCloseModal} isOpen={isModalOpen} />
      )}
      {isEditModalOpen && selectedTask && (
        <EditEvent
          onClose={handleCloseEditModal}
          isOpen={isEditModalOpen}
          task={selectedTask} // pass selected task to EditEvent
        />
      )}
      {isViewModalOpen && selectedTask && (
        <ViewEvent
          onClose={handleCloseViewModal}
          isOpen={isViewModalOpen}
          task={selectedTask}
        />
      )}
      {isBookingConfigOpen && (
        <ConfigureBookingModal
          isOpen={isBookingConfigOpen}
          onClose={() => setBookingConfigOpen(false)}
        />
      )}
    </>
  );
};

export default Calender;
