import { useState } from "react"
import { Grid3X3, ChevronDown } from "lucide-react"

export const TrackingReport = ({
  stats,
  bgColor = "bg-[#F9DFFFB8]",
  showEmployeeSelect = true,
  showProjectSelect = true,
    report,
    iconImage,
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState("All Employees")
  const [selectedProject, setSelectedProject] = useState("All Projects")

  return (
    <div className={`${bgColor} rounded-lg pt-2`}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-4">
          <div >
  {iconImage ? (
    <img
      src={iconImage}
      alt="report icon"
      className="w-[40px] h-[40px] object-contain"
    />
  ) : (
    <Grid3X3 className="w-6 h-6 text-white" />
  )}
</div>

          <div>
            <h2 className="text-[20px] font-bold text-gray-900">
              {report}
            </h2>
            <p className="text-[#202224B2]">Dolphin POS System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            {/* Employee Select */}
            {showEmployeeSelect && (
              <button className="px-6 py-2 border-2 border-[#6499FF] rounded-lg text-gray-700 font-medium flex items-center gap-2">
                {selectedEmployee}
                <ChevronDown className="w-5 h-5" />
              </button>
            )}

            {/* Project Select */}
            {showProjectSelect && (
              <button className="px-6 py-2 border-2 border-[#6499FF] rounded-lg text-gray-700 font-medium flex items-center gap-2">
                {selectedProject}
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </div>

          <button className="px-8 py-2 bg-[#0C79F7] text-white rounded-lg font-medium">
            View Report
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="flex items-center bg-white py-8">
        {stats.map((stat, index) => (
          <div key={index} className="flex-1 relative text-center">
            <p className="text-[20px] font-bold text-gray-900 ">
              {stat.number}
            </p>
            <p className="text-[#202224B2] font-medium text-[18px]">
              {stat.label}
            </p>

            {index !== stats.length - 1 && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-px bg-gray-300" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
