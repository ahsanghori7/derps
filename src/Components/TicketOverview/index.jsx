import React, { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import Heading from "../Heading";
import { Select, MenuItem, Box } from "@mui/material";

const TicketOverview = ({ data = [] }) => {
    const [filter, setFilter] = useState("Monthly");
  
    return (
      <Box className="rounded-xl p-4" style={{ backgroundColor: 'var(--dashboard-card-bg)' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading
            Fontweight={700}
            color={'var(--dashboard-text-primary)'}
            Heading="Ticket Overview"
            Fontsize={18}
          />
        </Box>
  
        {/* Custom Legend */}
        <Box display="flex" gap={3} mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#1B59F8" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: 'var(--dashboard-text-secondary)' }}>
              Completed
            </span>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#0000001A" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: 'var(--dashboard-text-secondary)' }}>
              Pending
            </span>
          </Box>
        </Box>
  
        {/* Chart */}
        <Box sx={{ width: '100%', height: 300, overflow: 'hidden' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={30} barGap={10} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#000000B2' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#000000B2' }} 
              />
              <Tooltip 
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
                contentStyle={{
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#2C3138' : '#FFFFFF',
                  border: '1px solid ' + (document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.08)' : '#E5E7EB'),
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#000000',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                wrapperStyle={{ zIndex: 9999 }}
              />
              <Bar dataKey="Completed" stackId="a" radius={[0, 0, 20, 20]} fill="#0C79F7" />
              <Bar dataKey="Pending" stackId="a" radius={[20, 20, 0, 0]} fill={document.documentElement.classList.contains('dark') ? '#6B7280' : '#0000001A'} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    );
  };
  

export default TicketOverview;
