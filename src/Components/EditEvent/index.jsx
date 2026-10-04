"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { getRequestWithOutBody, getRequestWithOutBodyCached, putRequestWithBodyAndToken } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { createVideoRoom } from "../../Api/videoRoomApi"
import { useSelector } from "react-redux"
import EventFields from "../EventFields"
import moment from "moment"
import dayjs from "dayjs"

const splitMeetingParticipants = (participants = []) => ({
    internalParticipants: participants.filter((participant) => participant?.user !== null),
    externalEmailAddresses: participants
        .filter((participant) => participant?.user === null && typeof participant?.email === "string")
        .map((participant) => participant.email),
});

const EditEvent = ({
    isOpen,
    onClose,
    task
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);


    const [projectTitle, setProjectTitle] = useState("")
    const [meetingLink, setMeetingLink] = useState("")
    const [startDate, setStartDate] = useState(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [userList, setUserList] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [errors, setErrors] = useState({});
    const [generatingLink, setGeneratingLink] = useState(false);
    const [selectedGroupIds, setSelectedGroupIds] = useState([]);
    const [externalEmails, setExternalEmails] = useState([]);

    if (!isOpen) return null

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const fetchData2 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                const sortedUsers = activeUsers.sort((a, b) => a.name.localeCompare(b.name));
                setUserList(sortedUsers);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        if (task) {
            setProjectTitle(task.title || "");
            setMeetingLink(task.meetingLink || "");
            setDescription(task.agenda || "");

            const parsedDate = task.eventDate ? moment(task.eventDate, "YYYY-MM-DD") : null;
            setStartDate(parsedDate);

            const parsedStartTime = task.startTime ? dayjs(task.startTime, "HH:mm:ss") : null;
            const parsedEndTime = task.endTime ? dayjs(task.endTime, "HH:mm:ss") : null;
            setStartTime(parsedStartTime);
            setEndTime(parsedEndTime);

            const { internalParticipants, externalEmailAddresses } = splitMeetingParticipants(task.participants);
            setSelectedItems(internalParticipants);
            setExternalEmails(externalEmailAddresses);
            setSelectedGroupIds(task.chatGroupIds || []);
        }

        let cancelled = false;
        const fetchMeetingDetails = async () => {
            if (!task?.id || !accessToken) return;
            try {
                const res = await getRequestWithOutBody(`${baseURl}meeting/${task.id}`, accessToken);
                if (cancelled) return;
                const data = res?.data ?? res;
                if (Array.isArray(data?.participants)) {
                    const { internalParticipants, externalEmailAddresses } = splitMeetingParticipants(data.participants);
                    setSelectedItems(internalParticipants);
                    setExternalEmails(externalEmailAddresses);
                }
            } catch {
                // ignore, keep list/fallback values
            }
        };
        fetchMeetingDetails();

        return () => {
            cancelled = true;
        };
    }, [task, accessToken]);

    useEffect(() => {
        fetchData2()
    }, [])

    const handleTitleChange = (e) => {
        setProjectTitle(e.target.value)
        clearError("projectTitle");
    }
    const handleMeetingLinkChange = (e) => {
        setMeetingLink(e.target.value)
        clearError("meetingLink");
    }

    const handleSelectionChange = (items) => {
        setSelectedItems(items);
        clearError("selectedItems");
    };

    const handleGenerateMeetingLink = async () => {
        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }
        setGeneratingLink(true);
        try {
            const roomId = `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
            const { roomId: finalRoomId } = await createVideoRoom(accessToken, { roomId, status: "scheduled", isOpenCall: false });
            const baseUrl = "https://derps.gotmsolutions.com";
            const link = `${baseUrl}/join/?meeting=${encodeURIComponent(finalRoomId)}`;
            setMeetingLink(link);
        } catch (error) {
            toast.error("Failed to generate meeting link");
        } finally {
            setGeneratingLink(false);
        }
    };

    const formatAssignments = (assignments) => {
        return assignments.map(item => {
            if (item.user && item.id) {
                // Case 1: id and user both present
                return {
                    id: item.id,
                    user: item.user
                };
            } else if (item.user) {
                // Case 2: only user present
                return {
                    user: {
                        id: item.user.id
                    }
                };
            } else {
                // Case 3: no nested user, flatten it
                return {
                    user: {
                        id: item.id,
                        name: item.name,
                        email: item.email
                    }
                };
            }
        });
    };

    const handleSubmit = async () => {
        // Clear previous errors
        setErrors({});
        
        // Enhanced validation checks
        const fieldErrors = {};
        if (!projectTitle.trim()) fieldErrors.projectTitle = "Event Title is required.";
        if (!startDate) fieldErrors.startDate = "Date is required.";
        if (!startTime) fieldErrors.startTime = "Start Time is required.";
        if (!endTime) fieldErrors.endTime = "End Time is required.";

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        // Additional validation
        if (startTime && endTime && startTime.isAfter(endTime)) {
            setErrors({ endTime: "Start time must be before end time." });
            return;
        }

        if (!task || !task.id) {
            toast.error("Event information not available");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        setLoading(true);
        try {
            const formattedDate = moment(startDate, "MM/DD/YYYY").format("YYYY-MM-DD");
            const formattedStartTime = startTime?.format("HH:mm:ss");
            const formattedEndTime = endTime?.format("HH:mm:ss");

            const payload = {
                title: projectTitle,
                agenda: description,
                startTime: formattedStartTime,
                endTime: formattedEndTime,
                organizerId: userData?.id,
                eventDate: formattedDate,
                meetingLink: meetingLink,
                participants: formatAssignments(selectedItems),
                chatGroupIds: selectedGroupIds,
                email: externalEmails,
            };

            // Validate payload before sending
            if (!payload.title || !payload.organizerId) {
                toast.error("Invalid event data");
                return;
            }

            const result = await putRequestWithBodyAndToken(`${baseURl}meeting/${task.id}`, accessToken, payload);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);

            setProjectTitle("");
            setDescription("");
            setMeetingLink("");
            setStartDate(null);
            setStartTime(null);
            setEndTime(null);
            setSelectedItems([]);
            setSelectedGroupIds([]);
            setExternalEmails([]);
            onClose();
        } catch (error) {
            console.error('Event update error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid event data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to update this event");
                } else if (status === 404) {
                    toast.error("Event not found or may have been deleted");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    }
    return (
        <div
            className="fixed inset-0 flex items-center justify-center  z-504 bg-black bg-opacity-30"
            style={{ zIndex: 9999 }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[calc(100vh-80px)] overflow-y-auto relative"
                style={{ margin: "50px 10px 0 10px" }}
            >
                <button onClick={onClose} className="absolute text-[var(--sidebar-text-primary)] top-4 right-4 text-2xl">
                    ×
                </button>

                <h2 className="text-xl text-[var(--sidebar-text-primary)] font-semibold mb-4">Event Details</h2>

                <EventFields
                    accessToken={accessToken}
                    projectTitle={projectTitle}
                    onTitleChange={handleTitleChange}
                    startDate={startDate}
                    onStartDateChange={(date) => { setStartDate(date); clearError("startDate"); }}
                    startTime={startTime}
                    onStartTimeChange={(newValue) => {
                        setStartTime(newValue);
                        clearError("startTime");
                        if (newValue) {
                            setEndTime(newValue.clone().add(30, 'minute'));
                            clearError("endTime");
                        }
                    }}
                    endTime={endTime}
                    onEndTimeChange={(newValue) => { setEndTime(newValue); clearError("endTime"); }}
                    userList={userList}
                    selectedItems={selectedItems}
                    onSelectionChange={handleSelectionChange}
                    selectedGroupIds={selectedGroupIds}
                    onGroupChange={setSelectedGroupIds}
                    meetingLink={meetingLink}
                    onMeetingLinkChange={handleMeetingLinkChange}
                    onGenerateMeetingLink={handleGenerateMeetingLink}
                    generatingLink={generatingLink}
                    externalEmails={externalEmails}
                    onExternalEmailsChange={setExternalEmails}
                    description={description}
                    onDescriptionChange={(e) => { setDescription(e.target.value); clearError("description"); }}
                    errors={errors}
                />

                <div className="flex justify-end mt-4">
                    <button onClick={handleSubmit} disabled={loading} className={`px-6 py-2 text-white rounded-lg ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#0C79F7] hover:bg-blue-600'}`}>
                        {loading ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EditEvent
