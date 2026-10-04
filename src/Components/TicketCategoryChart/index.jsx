import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Box } from "@mui/material";
import Heading from "../Heading";

const TicketCategoryChart = ({ data, title = "Ticket Category" }) => {
  const memoizedData = React.useMemo(() => data, [data]);

  return (
    <Box className="rounded-xl p-4 [&_*]:outline-none" style={{ backgroundColor: 'var(--dashboard-card-bg)' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Heading
          Fontweight={700}
          color={'var(--dashboard-text-primary)'}
          Heading={title}
          Fontsize={18}
        />
      </Box>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={335}>
        <BarChart
          data={memoizedData}
          layout="vertical"
          barSize={38}
          margin={{ top: 20, right: 0, left: 40, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 14, fill: 'var(--dashboard-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} />
          <Bar dataKey="Completed" stackId="a" fill="#1ED88E" radius={[4, 0, 0, 4]} isAnimationActive={false}>
            <LabelList dataKey="Completed" position="right" fill={'var(--dashboard-text-secondary)'} fontSize={14} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default TicketCategoryChart;
