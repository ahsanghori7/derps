import moment from "moment";
import Heading from "../Heading";

const ViewEvent = ({ isOpen, onClose, task }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center  z-504 bg-black bg-opacity-30" style={{ zIndex: 9999 }}>
            <div className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-lg relative max-h-[80vh] overflow-y-auto scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <button onClick={onClose} className="absolute text-[var(--sidebar-text-primary)] top-4 right-4 text-2xl">
                    ×
                </button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={task.title}
                    Fontsize={20}
                />
                <Heading
                    Fontweight={500}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Agenda: ${task.agenda.length > 30 ? task.agenda.slice(0, 40) + '...' : task.agenda}`}
                    Fontsize={14}
                />
                <Heading
                    Fontweight={500}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Date: ${moment(task.eventDate).format('YYYY-MM-DD')}`}
                    Fontsize={14}
                />
                <Heading
                    Fontweight={500}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Time: ${moment(task.startTime, "HH:mm:ss").format("hh:mm A")} - ${moment(task.endTime, "HH:mm:ss").format("hh:mm A")}`}
                    Fontsize={14}
                />
                <Heading
                    Fontweight={500}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Organizer: ${task.organizer?.name}`}
                    Fontsize={14}
                />

                {task.meetingLink && (
                    <Heading
                        Fontweight={500}
                        color={'var(--sidebar-text-primary)'}
                        Heading={
                            <>
                                Meeting Link:{" "}
                                <a href={task.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[#0C79F7] underline break-words">
                                    {task.meetingLink}
                                </a>
                            </>
                        }
                        Fontsize={14}
                    />
                )}

                {/* Display participant names */}
                {task.participants?.length > 0 && (
                    <Heading
                        Fontweight={500}
                        color={'var(--sidebar-text-primary)'}
                        Heading={`Participants: ${task.participants.map(p => p.user?.name).join(', ')}`}
                        Fontsize={14}
                    />
                )}

                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className={`px-6 py-2 text-white bg-[var(--sidebar-selected-bg)] rounded-lg`}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewEvent;
