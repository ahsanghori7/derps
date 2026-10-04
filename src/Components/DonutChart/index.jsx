import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Box, Typography } from "@mui/material";
import Heading from "../Heading";

// Define default colors
const COLORS = [
  "#4AC411", // Retail
  "#6499FF", // Food
  "#FFB300", // Services
  "#00D5FF", // Tech
  "#7C4DFF", // Extra category
  "#2196F3", // Extra category
  "#FF8A65", // Extra category
];

const DonutChart = ({
  data,
  title = "Merchant Categories with Highest Ticket Volume",
}) => {
  // calculate total for center text
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Box className="bg-white rounded-xl p-4 overflow-hidden">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Heading
          Fontweight={600}
          color="#202224"
          Heading={title}
          Fontsize={18}
        />
      </Box>

      {/* Chart + Legend container */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap" // ✅ makes it responsive, legend drops below if too tight
        mt={2}
      >
        {/* Donut chart (left side) */}
        <Box
          sx={{
            flex: "1 1 55%", // ✅ flexible, min 55%
            minWidth: 250,   // ✅ prevents it from shrinking too small
            height: 300,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          {/* Center total number */}
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              overflow: "hidden",
            }}
          >
            <Typography
              variant="h5"
              fontWeight={700}
              noWrap // ✅ prevent overflow text
            >
              {total}
            </Typography>
          </Box>
        </Box>

        {/* Legend (right side) */}
        <Box
          display="flex"
          flexDirection="column"
          gap={2}
          sx={{
            flex: "1 1 35%", // ✅ flexible, min 35%
            minWidth: 180,   // ✅ legend won’t shrink below readable size
            overflow: "hidden",
          }}
        >
          {data.map((entry, index) => (
            <Box
              key={index}
              display="flex"
              alignItems="center"
              gap={1}
              sx={{ overflow: "hidden" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: COLORS[index % COLORS.length],
                  flexShrink: 0,
                }}
              />
              <Typography
                fontSize={14}
                fontWeight={500}
                noWrap // ✅ prevents text spilling outside
              >
                {entry.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default DonutChart;
