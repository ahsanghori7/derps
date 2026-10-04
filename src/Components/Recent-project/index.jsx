import { Avatar, Button } from "@mui/material";
import { ChevronDown } from "lucide-react";
import { Flag } from "lucide-react"


const projects = [
  {
    ticketNo: "889",
    title: "User Online/Offline Status Display Incorrectly",
    taskType: "Bug/Fix",
    createdBy: "Mujeeb Ahmed",
    assignee: "Inam",
    dueDate: "This week",
    priority: "Medium",
    status: "In-Progress",
  },
  {
    ticketNo: "888",
    title: "Chat Search Not Responsive",
    taskType: "Bug/Fix",
    createdBy: "Mujeeb Ahmed",
    assignee: "Inam",
    dueDate: "This week",
    priority: "High",
    status: "Completed",
  },
  {
    ticketNo: "887",
    title: "Groups and Chats Should Be in Separate Sections",
    taskType: "Bug/Fix",
    createdBy: "Mujeeb Ahmed",
    assignee: "Sarah",
    
    dueDate: "This week",
    priority: "Low",
    status: "Pending",
  },
  {
    ticketNo: "886",
    title: "Group name is showing in description placeholder message",
    taskType: "Bug/Fix",
    createdBy: "Mujeeb Ahmed",
    assignee: "Inam",
    dueDate: "This week",
    priority: "Medium",
    status: "On Hold",
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case "In-Progress":
      return "bg-blue-100 text-blue-700";
    case "Completed":
      return "bg-green-100 text-green-700";
    case "Pending":
      return "bg-orange-100 text-orange-700";
    case "On Hold":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "High":
      return "text-red-500";
    case "Medium":
      return "text-[#0C79F7]";
    case "Low":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
};

export function RecentProjectsTable() {
  return (
    <div className="w-[1144px] bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-gray-900 pl-3 pt-3">Recent Projects</h2>

        {/* Filter Dropdowns */}
        <div className="flex gap-4">
          <Button
          className="bg-[#6499FF]"
            variant="outlined"
            endIcon={<ChevronDown size={16} />}
            sx={{
              textTransform: "none",
              borderColor: "#d1d5db",
              color: "#374151",
              backgroundColor: "#2B4BF20F",
              marginTop: "12px",
              width: "153px",
              height: "36px",
              fontSize: "14px",
            }}
          >
            Select Status
          
          </Button>
          <Button
            variant="outlined"
            endIcon={<ChevronDown size={16} />}
            sx={{
              textTransform: "none",
              borderColor: "#d1d5db",
              color: "#374151",
              backgroundColor: "#2B4BF20F",
              marginTop: "12px",
              width: "166px",
              height: "36px",
              fontSize: "14px",
            }}
          >
            Select Employee
            
          </Button>
          <Button
            variant="outlined"
            endIcon={<ChevronDown size={16} />}
            sx={{
              textTransform: "none",
              borderColor: "#d1d5db",
              color: "#374151",
              backgroundColor: "#2B4BF20F",
              marginTop: "12px",
              marginRight: "12px",
              width: "153px",
              height: "36px",
              fontSize: "14px",
            }}
          >
            Select Project
            
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
       <table className="w-[1144px] border-collapse">

          <thead>
  <tr className="bg-[#0C79F7] text-white">
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      Ticket No
    </th>
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      TITLE
    </th>
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      TASK TYPE
    </th>
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      CREATED BY
    </th>
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      ASSIGNEE
    </th>
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      DUE DATE
    </th>
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      PRIORITY
    </th>
    <th className="px-6 py-2 text-left font-bold text-[12px]">
      STATUS
    </th>
  </tr>
</thead>

          <tbody>
            {projects.map((project) => (
              <tr
                key={project.ticketNo}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-[12px] font-medium text-[#202224]">
                  {project.ticketNo}
                </td>
                <td className="px-6 py-4 text-[12px] text-[#202224]">
                  {project.title}
                </td>
                <td className="px-6 py-4 text-[12px] text-[#202224]">
                  {project.taskType}
                </td>
                <td className="px-6 py-4 text-[12px] text-[#202224]">
                  {project.createdBy}
                </td>
                <td className="px-6 py-4 text-[12px]">
                  <div className="flex items-center gap-2">
                    {project.assigneeInitials ? (
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: "#14b8a6",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {project.assigneeInitials || project.assignee?.[0]}
                      </Avatar>
                    ) : null}
                    <span className="text-[#202224]">{project.assignee}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[12px] text-[#202224]">
                  {project.dueDate}
                </td>
                <td className="px-6 py-4 text-[12px]">
  <span
    className={`inline-flex items-center gap-1 font-semibold ${getPriorityColor(
      project.priority
    )}`}
  >
    {project.priority}
    <Flag className="w-3 h-3" />
  </span>
</td>

               <td className="px-6 py-4 text-[12px]">
  <span
    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(
      project.status
    )}`}
  >
    {project.status}
  </span>
</td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
