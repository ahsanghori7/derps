import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import Heading from "../Heading";

const ApplicationsOverview = ({ title = "Applications Overview", filters }) => {
  const [filter, setFilter] = useState(filters?.[0] || "This Month");

  const handleChange = (event) => {
    setFilter(event.target.value);
  };

  // Sample data
  const data = [
    { name: "Completed Applications", value: 38, color: "#00C49F" },
    { name: "New Applications", value: 7, color: "#FF4DA6" },
    { name: "Pending Applications", value: 15, color: "#3C8DFF" },
    { name: "Rejected Applications", value: 12, color: "#FFA726" },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card sx={{ borderRadius: "12px" }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          <Select
            value={filter}
            onChange={handleChange}
            size="small"
            sx={{
              minWidth: 130,
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              "& fieldset": { border: "1px solid #6499FF" },
            }}
          >
            {filters.map((f) => (
              <MenuItem key={f} value={f}>
                {f}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Chart + Legend */}
        <Box display="flex" alignItems="center" overflow="hidden" className="w-full">
          {/* Donut Chart */}
          <Box sx={{ width: "50%", height: 200, overflow: "hidden" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <Box
              sx={{
                position: "relative",
                top: "-125px",
                textAlign: "center",
              }}
            >
              <Heading
                Fontweight={500}
                color="#202224CC"
                Heading="Total Applications"
                Fontsize={16}
                className="text-center break-words"
              />
              <Heading
                Fontweight={700}
                color="#202224"
                Heading={total}
                Fontsize={26}
              />
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ width: "50%", pl: 3 }}>
            {data.map((d, i) => (
              <Box key={i} display="flex" alignItems="center" mb={1}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: d.color,
                    mr: 1.5,
                  }}
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {d.name}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {d.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ApplicationsOverview;
